import { useEffect, useState, useCallback, useRef } from 'react'
import type { DocumentoServicio, TipoDocumento, EstadoDocumento, NuevoDocumentoData, ActualizarDocumentoData } from '../types/documento'
import {
  checkBackendHealth,
  fetchDocumentosApi,
  createDocumentoApi,
  updateDocumentoApi,
  deleteDocumentoApi,
  downloadDocumentoApi,
  cambiarEstadoDocumentoApi,
  esErrorPermanente,
} from '../services/api'
import { getEstadoCalculado, esBimestral } from '../types/documento'
import {
  guardarArchivoIDB,
  obtenerArchivoIDB,
  obtenerRegistroArchivoIDB,
  moverArchivoIDB,
  eliminarArchivoIDB,
  limpiarArchivosHuerfanos,
} from '../utils/idb'

const STORAGE_KEY = 'serviciotrack-documentos'
const PENDING_KEY = 'serviciotrack-documentos-pending'

type MetadatosNuevoDocumento = Omit<NuevoDocumentoData, 'archivo'>
type MetadatosActualizarDocumento = Omit<ActualizarDocumentoData, 'archivo'>

/**
 * La cola vive en localStorage, que solo admite JSON: un `File` se
 * convertiría en `{}`. Por eso aquí solo van los metadatos y el archivo se
 * lee de IndexedDB (guardado con el id del documento) al sincronizar.
 */
type OperacionPendienteDoc =
  | { tipo: 'crear'; localId: number; datos: MetadatosNuevoDocumento }
  | { tipo: 'actualizar'; localId: number; datos: MetadatosActualizarDocumento; conArchivo?: boolean }
  | { tipo: 'eliminar'; localId: number }
  | { tipo: 'cambiarEstado'; localId: number; estado: EstadoDocumento }

/** Error al preparar una operación que no se arregla reintentando. */
class OperacionInvalida extends Error {}

function leerColaDocs(): OperacionPendienteDoc[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as OperacionPendienteDoc[]) : []
  } catch {
    return []
  }
}

function guardarColaDocs(cola: OperacionPendienteDoc[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(cola))
  } catch (e) {
    console.error('Error al guardar cola de documentos:', e)
  }
}

function guardarDocumentosLocal(documentos: DocumentoServicio[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documentos))
  } catch (e) {
    console.error('Error al guardar documentos en localStorage:', e)
  }
}

export function useDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [backendConectado, setBackendConectado] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const [avisosSync, setAvisosSync] = useState<string[]>([])

  const documentosRef = useRef(documentos)
  useEffect(() => {
    documentosRef.current = documentos
  }, [documentos])

  const encolarOperacion = (operacion: OperacionPendienteDoc) => {
    const cola = leerColaDocs()
    cola.push(operacion)
    guardarColaDocs(cola)
    setPendientes(cola.length)
  }

  // 1. Cargar datos locales de inmediato (Offline-First)
  useEffect(() => {
    const guardados = localStorage.getItem(STORAGE_KEY)
    if (guardados) {
      try {
        const parseados: DocumentoServicio[] = JSON.parse(guardados)
        // Recalcular estados por si cambiaron fechas
        const conEstadosActualizados = parseados.map(d => ({
          ...d,
          estado: getEstadoCalculado(d),
        }))
        setDocumentos(conEstadosActualizados)
      } catch (e) {
        console.error('Error al leer localStorage de documentos:', e)
      }
    }

    setPendientes(leerColaDocs().length)
    setCargando(false)
  }, [])

  /**
   * Recupera el archivo de un documento para subirlo: primero de IndexedDB
   * y, para documentos creados con versiones anteriores, del base64 que se
   * guardaba en localStorage.
   */
  const obtenerArchivoParaSubir = async (ids: number[]): Promise<File | undefined> => {
    for (const id of ids) {
      const registro = await obtenerRegistroArchivoIDB(id)
      if (registro) {
        return new File([registro.blob], registro.nombreArchivo, { type: registro.mimeType })
      }
    }
    for (const id of ids) {
      const doc = documentosRef.current.find(d => d.id === id)
      if (doc?.archivoBase64) {
        return new File([base64ToBlob(doc.archivoBase64, doc.mimeType)], doc.nombreArchivo, { type: doc.mimeType })
      }
    }
    return undefined
  }

  /**
   * Aplica la cola de operaciones pendientes contra el backend, en orden.
   * - Fallo temporal (red, 5xx, token): se detiene y se reintenta después.
   * - Rechazo permanente (400, 404…): se descarta la operación, se avisa al
   *   usuario y se sigue con las demás, para que la cola nunca se atasque.
   */
  const aplicarOperacionesPendientes = async (): Promise<{
    mapeo: Map<number, number>
    descartados: Set<number>
    avisos: string[]
  }> => {
    const mapeo = new Map<number, number>()
    const descartados = new Set<number>()
    const avisos: string[] = []
    let cola = leerColaDocs()

    while (cola.length > 0) {
      const op = cola[0]
      const idRemoto = mapeo.get(op.localId) ?? op.localId

      try {
        if (descartados.has(op.localId)) {
          // El documento nunca llegó al servidor: sus operaciones posteriores sobran
        } else if (op.tipo === 'crear') {
          const archivo = await obtenerArchivoParaSubir([op.localId])
          if (!archivo) {
            throw new OperacionInvalida('el archivo ya no está guardado en este dispositivo')
          }
          const creado = await createDocumentoApi({ ...op.datos, archivo })
          mapeo.set(op.localId, creado.id)
          // Conservar la copia offline con el id definitivo
          await moverArchivoIDB(op.localId, creado.id)
        } else if (op.tipo === 'actualizar') {
          let archivo: File | undefined
          if (op.conArchivo) {
            archivo = await obtenerArchivoParaSubir([idRemoto, op.localId])
            if (!archivo) {
              throw new OperacionInvalida('el archivo nuevo ya no está guardado en este dispositivo')
            }
          }
          await updateDocumentoApi(idRemoto, { ...op.datos, archivo })
          mapeo.set(op.localId, idRemoto)
        } else if (op.tipo === 'eliminar') {
          await deleteDocumentoApi(idRemoto)
        } else if (op.tipo === 'cambiarEstado') {
          await cambiarEstadoDocumentoApi(idRemoto, op.estado)
          mapeo.set(op.localId, idRemoto)
        }
      } catch (err) {
        if (!(err instanceof OperacionInvalida) && !esErrorPermanente(err)) {
          console.warn(`Operación pendiente no aplicada (${op.tipo}); se reintenta:`, err)
          break
        }
        if (op.tipo === 'crear') descartados.add(op.localId)
        const motivo = err instanceof Error ? err.message : String(err)
        avisos.push(`Documento: no se pudo ${NOMBRE_OPERACION[op.tipo]} (${motivo}).`)
      }

      // Releer la cola por si se encolaron operaciones durante la sincronización
      cola = leerColaDocs().slice(1)
      guardarColaDocs(cola)
      setPendientes(cola.length)
    }

    return { mapeo, descartados, avisos }
  }

  // 2. Sincronizar con backend
  const sincronizarConBackend = useCallback(async () => {
    setSincronizando(true)
    const isOnline = await checkBackendHealth()
    setBackendConectado(isOnline)

    if (isOnline) {
      try {
        // 1) Empujar operaciones pendientes
        const { mapeo, descartados, avisos } = await aplicarOperacionesPendientes()
        if (avisos.length > 0) {
          setAvisosSync(prev => [...prev, ...avisos])
        }

        // 2) Obtener estado del servidor
        const documentosRemotos = await fetchDocumentosApi()

        // 3) Merge: servidor + locales que siguen pendientes de subir
        const idsRemotos = new Set(documentosRemotos.map(d => d.id))
        const localesSinAplicar = documentosRef.current.filter(
          d => !mapeo.has(d.id) && !idsRemotos.has(d.id) && !descartados.has(d.id)
        )
        const combinados = [...documentosRemotos, ...localesSinAplicar]

        // Recalcular estados
        const conEstados = combinados.map(d => ({
          ...d,
          estado: getEstadoCalculado(d),
        }))

        setDocumentos(conEstados)
        guardarDocumentosLocal(conEstados)

        // Limpiar archivos de documentos que ya no existen
        await limpiarArchivosHuerfanos(conEstados.map(d => d.id))
      } catch (error) {
        console.warn('Error al sincronizar documentos:', error)
      }
    }
    setSincronizando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sincronizarConBackend()
  }, [sincronizarConBackend])

  // Re-sincronizar al recuperar conexión
  useEffect(() => {
    const alRecuperarConexion = () => {
      sincronizarConBackend()
    }
    window.addEventListener('online', alRecuperarConexion)
    return () => window.removeEventListener('online', alRecuperarConexion)
  }, [sincronizarConBackend])

  // Persistir metadatos en localStorage
  useEffect(() => {
    if (!cargando) {
      guardarDocumentosLocal(documentos)
    }
  }, [documentos, cargando])

  // --- Operaciones CRUD ---

  const subirDocumento = async (
    datos: NuevoDocumentoData
  ): Promise<{ exito: boolean; error?: string; id?: number }> => {
    // Validaciones frontend
    if (!datos.archivo) {
      return { exito: false, error: 'No se seleccionó archivo.' }
    }

    const mimeValidos = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf',
    ]
    if (!mimeValidos.includes(datos.archivo.type)) {
      return { exito: false, error: 'Solo se permiten archivos .doc, .docx y .pdf' }
    }

    if (esBimestral(datos.tipo) && !datos.periodo) {
      return { exito: false, error: 'El periodo es obligatorio para evaluaciones y reportes bimestrales.' }
    }

    const hoyStr = new Date().toISOString().split('T')[0]
    if (datos.fechaLimite < hoyStr) {
      return { exito: false, error: 'La fecha límite no puede ser anterior a hoy.' }
    }

    const idLocal = generarIdLocal(documentosRef.current)

    const nuevoLocal: DocumentoServicio = {
      id: idLocal,
      tipo: datos.tipo,
      periodo: datos.periodo,
      estado: 'pendiente',
      fechaLimite: datos.fechaLimite,
      nombreArchivo: datos.archivo.name,
      mimeType: datos.archivo.type,
      tamaño: datos.archivo.size,
      notas: datos.notas,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    }

    // Guardar el archivo en IndexedDB con el id del documento (offline)
    await guardarArchivoIDB(idLocal, datos.archivo, datos.archivo.name, datos.archivo.type)

    setDocumentos(prev => [nuevoLocal, ...prev])

    const { archivo: _archivo, ...metadatos } = datos

    if (backendConectado) {
      try {
        const creado = await createDocumentoApi(datos)
        // Reemplazar local por remoto y conservar la copia offline con el id nuevo
        setDocumentos(prev => prev.map(d => d.id === idLocal ? { ...creado, estado: getEstadoCalculado(creado) } : d))
        await moverArchivoIDB(idLocal, creado.id)
        return { exito: true, id: creado.id }
      } catch (err) {
        if (esErrorPermanente(err)) {
          // El servidor rechazó el documento: deshacer el alta local
          setDocumentos(prev => prev.filter(d => d.id !== idLocal))
          await eliminarArchivoIDB(idLocal)
          return { exito: false, error: (err as Error).message }
        }
        // Fallo de red: encolar para sincronizar después
        encolarOperacion({ tipo: 'crear', localId: idLocal, datos: metadatos })
        return { exito: true, id: idLocal } // Éxito local, pendiente de sync
      }
    }

    encolarOperacion({ tipo: 'crear', localId: idLocal, datos: metadatos })
    return { exito: true, id: idLocal }
  }

  const actualizarDocumento = async (
    id: number,
    datos: ActualizarDocumentoData
  ): Promise<{ exito: boolean; error?: string }> => {
    if (backendConectado) {
      try {
        const actualizado = await updateDocumentoApi(id, datos)
        if (datos.archivo) {
          await guardarArchivoIDB(id, datos.archivo, datos.archivo.name, datos.archivo.type)
        }
        setDocumentos(prev => prev.map(d => d.id === id ? { ...actualizado, estado: getEstadoCalculado(actualizado) } : d))
        return { exito: true }
      } catch (err: any) {
        return { exito: false, error: err.message || 'Error al actualizar en el servidor.' }
      }
    }

    // Offline: guardar el archivo nuevo (si hay) en IndexedDB y encolar solo metadatos
    const { archivo, ...metadatos } = datos
    if (archivo) {
      await guardarArchivoIDB(id, archivo, archivo.name, archivo.type)
    }

    setDocumentos(prev => prev.map(d => {
      if (d.id === id) {
        const actualizado: DocumentoServicio = { ...d, ...metadatos, actualizadoEn: new Date().toISOString() }
        if (archivo) {
          actualizado.nombreArchivo = archivo.name
          actualizado.mimeType = archivo.type
          actualizado.tamaño = archivo.size
          delete actualizado.archivoBase64
        }
        return { ...actualizado, estado: getEstadoCalculado(actualizado) }
      }
      return d
    }))

    encolarOperacion({ tipo: 'actualizar', localId: id, datos: metadatos, conArchivo: !!archivo })
    return { exito: true }
  }

  const eliminarDocumento = async (id: number): Promise<void> => {
    if (backendConectado) {
      try {
        await deleteDocumentoApi(id)
      } catch {
        encolarOperacion({ tipo: 'eliminar', localId: id })
      }
    } else {
      encolarOperacion({ tipo: 'eliminar', localId: id })
    }

    // Eliminar blob de IndexedDB
    await eliminarArchivoIDB(id)
    setDocumentos(prev => prev.filter(d => d.id !== id))
  }

  const cambiarEstado = async (
    id: number,
    estado: EstadoDocumento
  ): Promise<{ exito: boolean; error?: string }> => {
    const fechaEntrega = estado === 'entregado' ? new Date().toISOString().split('T')[0] : undefined

    if (backendConectado) {
      try {
        const actualizado = await cambiarEstadoDocumentoApi(id, estado)
        setDocumentos(prev => prev.map(d => d.id === id ? { ...actualizado, estado: getEstadoCalculado(actualizado) } : d))
        return { exito: true }
      } catch (err: any) {
        return { exito: false, error: err.message || 'Error al cambiar estado.' }
      }
    }

    setDocumentos(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          estado,
          fechaEntrega: fechaEntrega || d.fechaEntrega,
          actualizadoEn: new Date().toISOString(),
        }
      }
      return d
    }))

    encolarOperacion({ tipo: 'cambiarEstado', localId: id, estado })
    return { exito: true }
  }

  const descargarDocumento = async (id: number): Promise<void> => {
    const doc = documentos.find(d => d.id === id)
    const nombre = doc?.nombreArchivo || `documento_${id}`

    // Primero intentar desde IndexedDB (offline)
    const blobLocal = await obtenerArchivoIDB(id)
    if (blobLocal) {
      triggerDownload(blobLocal, nombre)
      return
    }

    // Si no está en IndexedDB y hay backend, descargar
    if (backendConectado) {
      try {
        const blob = await downloadDocumentoApi(id)
        // Guardar en IndexedDB para la próxima vez
        if (doc) {
          await guardarArchivoIDB(id, blob, doc.nombreArchivo, doc.mimeType)
        }
        triggerDownload(blob, nombre)
        return
      } catch (err) {
        console.error('Error al descargar:', err)
      }
    }

    // Respaldo para documentos guardados con versiones anteriores (base64)
    if (doc?.archivoBase64) {
      triggerDownload(base64ToBlob(doc.archivoBase64, doc.mimeType), doc.nombreArchivo)
      return
    }

    throw new Error('Archivo no disponible offline. Conecte para descargar.')
  }

  const getDocumento = (id: number): DocumentoServicio | undefined => {
    return documentos.find(d => d.id === id)
  }

  const getDocumentosPorTipo = (tipo: TipoDocumento): DocumentoServicio[] => {
    return documentos.filter(d => d.tipo === tipo)
  }

  const getProximosVencimientos = (dias: number = 15): DocumentoServicio[] => {
    const limite = new Date()
    limite.setDate(limite.getDate() + dias)
    return documentos
      .filter(d => d.estado === 'pendiente' && new Date(d.fechaLimite) <= limite)
      .sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
  }

  const limpiarAvisosSync = useCallback(() => setAvisosSync([]), [])

  return {
    documentos,
    cargando,
    backendConectado,
    sincronizando,
    pendientes,
    avisosSync,
    limpiarAvisosSync,
    subirDocumento,
    actualizarDocumento,
    eliminarDocumento,
    cambiarEstado,
    descargarDocumento,
    getDocumento,
    getDocumentosPorTipo,
    getProximosVencimientos,
    sincronizarConBackend,
  }
}

// Utilidades
const NOMBRE_OPERACION: Record<OperacionPendienteDoc['tipo'], string> = {
  crear: 'subir',
  actualizar: 'actualizar',
  eliminar: 'eliminar',
  cambiarEstado: 'cambiar el estado',
}

// ID local único entre los documentos actuales (modo offline)
function generarIdLocal(existentes: DocumentoServicio[]): number {
  const ids = new Set(existentes.map(d => d.id))
  let id = Date.now()
  while (ids.has(id)) id += 1
  return id
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
