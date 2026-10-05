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
} from '../services/api'
import { getEstadoCalculado, esBimestral } from '../types/documento'
import { guardarArchivoIDB, obtenerArchivoIDB, eliminarArchivoIDB, limpiarArchivosHuerfanos } from '../utils/idb'

const STORAGE_KEY = 'serviciotrack-documentos'
const PENDING_KEY = 'serviciotrack-documentos-pending'

type OperacionPendienteDoc =
  | { tipo: 'crear'; localId: number; datos: NuevoDocumentoData }
  | { tipo: 'actualizar'; localId: number; datos: ActualizarDocumentoData }
  | { tipo: 'eliminar'; localId: number }
  | { tipo: 'cambiarEstado'; localId: number; estado: EstadoDocumento }

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

export function useDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [backendConectado, setBackendConectado] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [pendientes, setPendientes] = useState(0)

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
   * Aplica la cola de operaciones pendientes contra el backend.
   */
  const aplicarOperacionesPendientes = async (): Promise<Map<number, number>> => {
    const mapeo = new Map<number, number>()
    let cola = leerColaDocs()
    if (cola.length === 0) return mapeo

    for (const op of cola) {
      try {
        if (op.tipo === 'crear') {
          const creado = await createDocumentoApi(op.datos)
          mapeo.set(op.localId, creado.id)
        } else if (op.tipo === 'actualizar') {
          const idRemoto = mapeo.get(op.localId) ?? op.localId
          await updateDocumentoApi(idRemoto, op.datos)
          mapeo.set(op.localId, idRemoto)
        } else if (op.tipo === 'eliminar') {
          const idRemoto = mapeo.get(op.localId) ?? op.localId
          await deleteDocumentoApi(idRemoto)
        } else if (op.tipo === 'cambiarEstado') {
          const idRemoto = mapeo.get(op.localId) ?? op.localId
          await cambiarEstadoDocumentoApi(idRemoto, op.estado)
          mapeo.set(op.localId, idRemoto)
        }
        cola = cola.slice(1)
        guardarColaDocs(cola)
        setPendientes(cola.length)
      } catch (err) {
        console.warn(`Operación pendiente no aplicada (${op.tipo}); se reintenta:`, err)
        break
      }
    }

    return mapeo
  }

  // 2. Sincronizar con backend
  const sincronizarConBackend = useCallback(async () => {
    setSincronizando(true)
    const isOnline = await checkBackendHealth()
    setBackendConectado(isOnline)

    if (isOnline) {
      try {
        // 1) Empujar operaciones pendientes
        const mapeo = await aplicarOperacionesPendientes()

        // 2) Obtener estado del servidor
        const documentosRemotos = await fetchDocumentosApi()

        // 3) Merge: servidor + locales sin aplicar
        const idsRemotos = new Set(documentosRemotos.map(d => d.id))
        const localesSinAplicar = documentosRef.current.filter(
          d => !mapeo.has(d.id) && !idsRemotos.has(d.id)
        )
        const combinados = [...documentosRemotos, ...localesSinAplicar]

        // Recalcular estados
        const conEstados = combinados.map(d => ({
          ...d,
          estado: getEstadoCalculado(d),
        }))

        setDocumentos(conEstados)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conEstados))

        // Limpiar archivos huérfanos en IndexedDB
        const idsValidos = conEstados.map(d => d.id)
        await limpiarArchivosHuerfanos(idsValidos)

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documentos))
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

    // Guardar archivo en IndexedDB (offline)
    const idLocal = Date.now()
    const archivoBase64 = await fileToBase64(datos.archivo)

    const nuevoLocal: DocumentoServicio = {
      id: idLocal,
      tipo: datos.tipo,
      periodo: datos.periodo,
      estado: 'pendiente',
      fechaLimite: datos.fechaLimite,
      nombreArchivo: datos.archivo.name,
      mimeType: datos.archivo.type,
      tamaño: datos.archivo.size,
      archivoBase64,
      notas: datos.notas,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    }

    // Guardar blob en IndexedDB
    await guardarArchivoIDB(datos.archivo, datos.archivo.name, datos.archivo.type)

    setDocumentos(prev => [nuevoLocal, ...prev])

    if (backendConectado) {
      try {
        const creado = await createDocumentoApi(datos)
        // Reemplazar local por remoto
        setDocumentos(prev => prev.map(d => d.id === idLocal ? creado : d))
        // Eliminar blob local (ya está en servidor)
        await eliminarArchivoIDB(idLocal)
        return { exito: true, id: creado.id }
      } catch {
        // Encolar para sincronizar después
        encolarOperacion({ tipo: 'crear', localId: idLocal, datos })
        return { exito: true, id: idLocal } // Éxito local, pendiente de sync
      }
    } else {
      encolarOperacion({ tipo: 'crear', localId: idLocal, datos })
      return { exito: true, id: idLocal }
    }
  }

  const actualizarDocumento = async (
    id: number,
    datos: ActualizarDocumentoData
  ): Promise<{ exito: boolean; error?: string }> => {
    if (backendConectado) {
      try {
        const actualizado = await updateDocumentoApi(id, datos)
        setDocumentos(prev => prev.map(d => d.id === id ? { ...actualizado, estado: getEstadoCalculado(actualizado) } : d))
        return { exito: true }
      } catch (err: any) {
        return { exito: false, error: err.message || 'Error al actualizar en el servidor.' }
      }
    }

    // Offline: actualizar local y encolar
    // Si hay archivo nuevo, guardarlo primero en IndexedDB
    let archivoBase64: string | undefined
    if (datos.archivo) {
      await guardarArchivoIDB(datos.archivo, datos.archivo.name, datos.archivo.type)
      archivoBase64 = await fileToBase64(datos.archivo)
    }

    setDocumentos(prev => prev.map(d => {
      if (d.id === id) {
        const actualizado = { ...d, ...datos, actualizadoEn: new Date().toISOString() }
        if (archivoBase64) {
          actualizado.archivoBase64 = archivoBase64
        }
        return { ...actualizado, estado: getEstadoCalculado(actualizado) }
      }
      return d
    }))

    encolarOperacion({ tipo: 'actualizar', localId: id, datos })
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
    // Primero intentar desde IndexedDB (offline)
    const blobLocal = await obtenerArchivoIDB(id)
    if (blobLocal) {
      triggerDownload(blobLocal, documentos.find(d => d.id === id)?.nombreArchivo || `documento_${id}`)
      return
    }

    // Si no está en IndexedDB y hay backend, descargar
    if (backendConectado) {
      try {
        const blob = await downloadDocumentoApi(id)
        // Guardar en IndexedDB para próxima vez
        const doc = documentos.find(d => d.id === id)
        if (doc) {
          await guardarArchivoIDB(blob, doc.nombreArchivo, doc.mimeType)
        }
        triggerDownload(blob, doc?.nombreArchivo || `documento_${id}`)
        return
      } catch (err) {
        console.error('Error al descargar:', err)
      }
    }

    // Fallback: si tiene base64 en localStorage
    const doc = documentos.find(d => d.id === id)
    if (doc?.archivoBase64) {
      const blob = base64ToBlob(doc.archivoBase64, doc.mimeType)
      triggerDownload(blob, doc.nombreArchivo)
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

  return {
    documentos,
    cargando,
    backendConectado,
    sincronizando,
    pendientes,
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
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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