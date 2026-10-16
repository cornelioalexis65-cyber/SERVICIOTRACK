import { useEffect, useState, useCallback, useRef } from 'react'
import type { Registro, PerfilEstudiante } from '../types/registro'
import {
  checkBackendHealth,
  fetchRegistrosApi,
  createRegistroApi,
  updateRegistroApi,
  deleteRegistroApi,
  fetchPerfilApi,
  updatePerfilApi,
  reemplazarRegistrosApi,
  esErrorPermanente,
} from '../services/api'
import { conBloqueo, despuesDeBloqueo } from '../utils/bloqueo'

const STORAGE_KEY = 'serviciotrack-registros'
const PROFILE_KEY = 'serviciotrack-perfil'
const PENDING_KEY = 'serviciotrack-pending'

/**
 * Operaciones realizadas en modo offline que se aplicarán al backend
 * en la siguiente sincronización exitosa (en orden FIFO).
 */
type OperacionPendiente =
  | { tipo: 'crear'; localId: number; datos: Omit<Registro, 'id'> }
  | { tipo: 'actualizar'; localId: number; datos: Omit<Registro, 'id'> }
  | { tipo: 'eliminar'; localId: number }
  // Restaurar respaldo sin conexión: sustituye todo lo anterior de la cola
  | { tipo: 'reemplazar'; localId: 0; registros: Omit<Registro, 'id'>[] }

function leerCola(): OperacionPendiente[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as OperacionPendiente[]) : []
  } catch {
    return []
  }
}

function guardarCola(cola: OperacionPendiente[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(cola))
  } catch (e) {
    console.error('Error al guardar la cola de pendientes:', e)
  }
}

const PERFIL_DEFAULT: PerfilEstudiante = {
  nombre: '',
  matricula: '',
  carrera: 'Ingeniería en Sistemas Computacionales',
  institucion: 'TecNM Campus Escárcega',
  fechaInicio: '2026-09-01',
  fechaLimite: '',
  horasObjetivo: 500,
  programa: '',
  supervisor: '',
}

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>(() => {
    try {
      const guardados = localStorage.getItem(STORAGE_KEY)
      return guardados ? JSON.parse(guardados) : []
    } catch (e) {
      console.error('Error al leer localStorage de registros:', e)
      return []
    }
  })

  const [perfil, setPerfil] = useState<PerfilEstudiante>(() => {
    try {
      const perfilGuardado = localStorage.getItem(PROFILE_KEY)
      if (perfilGuardado) {
        return {
          ...PERFIL_DEFAULT,
          ...JSON.parse(perfilGuardado),
        }
      }
    } catch (e) {
      console.error('Error al leer localStorage de perfil:', e)
    }
    return PERFIL_DEFAULT
  })

  const [cargando] = useState(false)
  const [backendConectado, setBackendConectado] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [pendientes, setPendientes] = useState(() => leerCola().length)
  const [avisosSync, setAvisosSync] = useState<string[]>([])
  const limpiarAvisosSync = useCallback(() => setAvisosSync([]), [])

  // Siempre el estado más reciente disponible dentro de callbacks
  // memoizados (evita cerrar sobre valores obsoletos y loops de sync).
  const registrosRef = useRef(registros)
  useEffect(() => {
    registrosRef.current = registros
  }, [registros])

  const encolarOperacion = (operacion: OperacionPendiente) => {
    const cola = leerCola()
    cola.push(operacion)
    guardarCola(cola)
    setPendientes(cola.length)
  }

  /**
   * Aplica la cola de operaciones pendientes contra el backend, en orden.
   * Cada operación procesada se elimina de la cola (persistida).
   * - Fallo temporal (red, 5xx, token): se detiene y las restantes se
   *   reintentan en la siguiente sincronización.
   * - Rechazo permanente (400 por superar la meta, 404…): se descarta la
   *   operación, se avisa al usuario y se sigue, para que la cola nunca se
   *   atasque.
   * Devuelve el mapeo localId -> idRemoto y los ids locales descartados.
   */
  const aplicarOperacionesPendientes = async (): Promise<{
    mapeo: Map<number, number>
    descartados: Set<number>
    avisos: string[]
  }> => {
    const mapeo = new Map<number, number>()
    const descartados = new Set<number>()
    const avisos: string[] = []
    let cola = leerCola()

    while (cola.length > 0) {
      const op = cola[0]
      const idRemoto = mapeo.get(op.localId) ?? op.localId

      try {
        if (descartados.has(op.localId)) {
          // El registro nunca llegó al servidor: sus operaciones posteriores sobran
        } else if (op.tipo === 'crear') {
          // El id local viaja como idCliente: si esta alta ya llegó antes, el
          // servidor devuelve la existente en vez de duplicarla
          const creado = await createRegistroApi(op.datos, op.localId)
          mapeo.set(op.localId, creado.id)
        } else if (op.tipo === 'actualizar') {
          await updateRegistroApi(idRemoto, op.datos)
          mapeo.set(op.localId, idRemoto)
        } else if (op.tipo === 'reemplazar') {
          await reemplazarRegistrosApi(op.registros)
        } else {
          await deleteRegistroApi(idRemoto)
        }
      } catch (err) {
        if (!esErrorPermanente(err)) {
          console.warn(
            `Operación pendiente no aplicada (${op.tipo}); se reintenta en la próxima sincronización:`,
            err
          )
          break
        }
        if (op.tipo === 'crear') descartados.add(op.localId)
        const quien = op.tipo === 'reemplazar'
          ? 'Restauración del respaldo'
          : op.tipo === 'eliminar' ? 'Registro' : `Registro del ${op.datos.fecha}`
        avisos.push(`${quien}: el servidor rechazó el cambio (${(err as Error).message}).`)
      }

      // Releer la cola por si se encolaron operaciones durante la sincronización
      cola = leerCola().slice(1)
      guardarCola(cola)
      setPendientes(cola.length)
    }

    return { mapeo, descartados, avisos }
  }

  // 2. Comprobar backend, aplicar pendientes y sincronizar registros y perfil.
  //    Nunca se ejecutan dos a la vez: recorrerían la misma cola y subirían
  //    los mismos registros dos veces.
  const sincronizarConBackend = useCallback(() => conBloqueo('serviciotrack-sync-registros', async () => {
    setSincronizando(true)
    const isOnline = await checkBackendHealth()
    setBackendConectado(isOnline)

    if (isOnline) {
      try {
        // 1) Perfil primero: sus horas objetivo son el límite que valida el servidor
        const perfilRemoto = await fetchPerfilApi().catch(() => null)
        if (perfilRemoto) {
          const guardadoActual = localStorage.getItem(PROFILE_KEY)
          const localActual: Partial<PerfilEstudiante> | null = guardadoActual ? JSON.parse(guardadoActual) : null
          const remotoSinConfigurar = !perfilRemoto.nombre || perfilRemoto.nombre === 'Estudiante'

          let perfilCombinado: PerfilEstudiante
          if (localActual?.nombre && remotoSinConfigurar) {
            // Servidor nuevo o sin configurar: el perfil de este dispositivo manda
            perfilCombinado = { ...PERFIL_DEFAULT, ...localActual }
            await updatePerfilApi(perfilCombinado).catch(() => null)
          } else {
            // Si el usuario ya personalizó su nombre/matrícula/programa en local, conservamos esos datos
            perfilCombinado = {
              ...PERFIL_DEFAULT,
              ...perfilRemoto,
              ...(localActual?.nombre ? { nombre: localActual.nombre } : {}),
              ...(localActual?.matricula ? { matricula: localActual.matricula } : {}),
              ...(localActual?.programa ? { programa: localActual.programa } : {}),
              ...(localActual?.supervisor ? { supervisor: localActual.supervisor } : {}),
            }
          }

          setPerfil(perfilCombinado)
          localStorage.setItem(PROFILE_KEY, JSON.stringify(perfilCombinado))
        }

        // 2) Empujar las operaciones realizadas en offline al servidor
        const resultado = await aplicarOperacionesPendientes()
        const { mapeo, descartados } = resultado
        const avisos = [...resultado.avisos]

        // 3) Obtener el estado actual del servidor
        let registrosRemotos = await fetchRegistrosApi()

        // 4) Primera conexión con un servidor vacío: subir los registros que
        //    hasta ahora solo existían en este dispositivo
        if (registrosRemotos.length === 0 && leerCola().length === 0) {
          const soloLocales = registrosRef.current
            .filter((r) => !mapeo.has(r.id) && !descartados.has(r.id))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
          if (soloLocales.length > 0) {
            for (const r of soloLocales) {
              encolarOperacion({
                tipo: 'crear',
                localId: r.id,
                datos: { fecha: r.fecha, horas: r.horas, actividad: r.actividad },
              })
            }
            const subida = await aplicarOperacionesPendientes()
            subida.mapeo.forEach((idRemoto, idLocal) => mapeo.set(idLocal, idRemoto))
            subida.descartados.forEach((id) => descartados.add(id))
            avisos.push(...subida.avisos)
            registrosRemotos = await fetchRegistrosApi()
          }
        }

        if (avisos.length > 0) {
          setAvisosSync((prev) => [...prev, ...avisos])
        }

        // 5) Merge: el servidor es la referencia. Solo se conservan aparte los
        //    registros locales que siguen en la cola esperando subirse (creados
        //    sin conexión). Cualquier otra copia local sobra: mostrarla sumaría
        //    horas que no existen en el servidor.
        const idsRemotos = new Set(registrosRemotos.map((r) => r.id))
        const pendientesDeSubir = new Set(
          leerCola().filter((op) => op.tipo === 'crear').map((op) => op.localId)
        )
        const localesSinAplicar = registrosRef.current.filter(
          (r) => pendientesDeSubir.has(r.id) && !idsRemotos.has(r.id)
        )
        const combinados = [...registrosRemotos, ...localesSinAplicar]

        setRegistros(combinados)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combinados))
      } catch (error) {
        console.warn('Error al sincronizar con el backend:', error)
      }
    }
    setSincronizando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useEffect(() => {
    sincronizarConBackend()
  }, [sincronizarConBackend])

  // 2.1 Re-sincronizar automáticamente al recuperar la conexión
  useEffect(() => {
    const alRecuperarConexion = () => {
      sincronizarConBackend()
    }
    window.addEventListener('online', alRecuperarConexion)
    return () => {
      window.removeEventListener('online', alRecuperarConexion)
    }
  }, [sincronizarConBackend])

  // 3. Persistir en localStorage ante cualquier cambio de estado
  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
    }
  }, [registros, cargando])

  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(perfil))
    }
  }, [perfil, cargando])

  // --- Métricas Derivadas ---
  const totalHours = perfil.horasObjetivo || 500
  // Redondeo a 2 decimales: sumar decimales da restos como 318.0000000000004
  const horasRealizadas = Math.round(registros.reduce((total, r) => total + r.horas, 0) * 100) / 100
  const horasRestantes = Math.max(totalHours - horasRealizadas, 0)
  const progreso = Math.min((horasRealizadas / totalHours) * 100, 100)
  const diasRegistrados = registros.length
  const promedioHoras = diasRegistrados > 0 ? horasRealizadas / diasRegistrados : 0

  const registrosOrdenados = [...registros].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  )

  const ultimaFecha =
    registrosOrdenados.length > 0 ? registrosOrdenados[0].fecha : 'Sin registros'

  // --- Cálculos de Fechas Límite y Ritmo ---
  let diasRestantesLimite: number | null = null
  let ritmoRecomendado: number | null = null

  if (perfil.fechaLimite) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const [y, m, d] = perfil.fechaLimite.split('-').map(Number)
    const fechaFin = new Date(y, m - 1, d)
    const diffMs = fechaFin.getTime() - hoy.getTime()
    // Negativo si la fecha límite ya pasó (vencida)
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    diasRestantesLimite = diffDias

    if (horasRestantes > 0 && diasRestantesLimite > 0) {
      ritmoRecomendado = Number((horasRestantes / diasRestantesLimite).toFixed(1))
    }
  }

  // --- Validaciones Frontend ---
  const validarRegistro = (
    datos: Omit<Registro, 'id'>,
    idEditando: number | null = null
  ): { valido: boolean; error?: string } => {
    const { fecha, horas, actividad } = datos

    if (!fecha || !horas || !actividad.trim()) {
      return { valido: false, error: 'Completa todos los campos obligatorios.' }
    }

    if (horas <= 0) {
      return { valido: false, error: 'Las horas deben ser mayores a 0.' }
    }

    if (horas > 24) {
      return { valido: false, error: 'Las horas no pueden superar las 24 horas por registro.' }
    }

    const hoyStr = new Date().toLocaleDateString('en-CA')
    if (fecha > hoyStr) {
      return { valido: false, error: 'No se pueden registrar fechas futuras.' }
    }

    const horasPrevias = idEditando !== null
      ? horasRealizadas - (registros.find((r) => r.id === idEditando)?.horas ?? 0)
      : horasRealizadas

    if (horasPrevias + horas > totalHours) {
      return {
        valido: false,
        error: `No puedes superar el límite de ${totalHours} horas de servicio social.`,
      }
    }

    return { valido: true }
  }

  // ID local seguro (único entre los registros actuales) para modo offline
  const generarIdLocal = () => {
    let id = Date.now()
    const existentes = new Set(registrosRef.current.map((r) => r.id))
    while (existentes.has(id)) id += 1
    return id
  }

  // --- Operaciones CRUD ---
  const agregarRegistro = async (
    datos: Omit<Registro, 'id'>
  ): Promise<{ exito: boolean; error?: string }> => {
    const validacion = validarRegistro(datos)
    if (!validacion.valido) {
      return { exito: false, error: validacion.error }
    }

    if (backendConectado) {
      try {
        const nuevo = await createRegistroApi(datos)
        setRegistros((prev) => [nuevo, ...prev])
        return { exito: true }
      } catch (err: any) {
        return { exito: false, error: err.message || 'Error al guardar en el servidor.' }
      }
    }

    // Modo offline: guardar local y encolar para el servidor
    const nuevoLocal: Registro = {
      id: generarIdLocal(),
      fecha: datos.fecha,
      horas: Number(datos.horas),
      actividad: datos.actividad.trim(),
    }
    setRegistros((prev) => [nuevoLocal, ...prev])
    encolarOperacion({
      tipo: 'crear',
      localId: nuevoLocal.id,
      datos: {
        fecha: nuevoLocal.fecha,
        horas: nuevoLocal.horas,
        actividad: nuevoLocal.actividad,
      },
    })
    return { exito: true }
  }

  const actualizarRegistro = async (
    id: number,
    datos: Omit<Registro, 'id'>
  ): Promise<{ exito: boolean; error?: string }> => {
    const validacion = validarRegistro(datos, id)
    if (!validacion.valido) {
      return { exito: false, error: validacion.error }
    }

    if (backendConectado) {
      try {
        const actualizado = await updateRegistroApi(id, datos)
        setRegistros((prev) =>
          prev.map((reg) => (reg.id === id ? actualizado : reg))
        )
        return { exito: true }
      } catch (err: any) {
        return { exito: false, error: err.message || 'Error al actualizar en el servidor.' }
      }
    }

    setRegistros((prev) =>
      prev.map((reg) =>
        reg.id === id
          ? {
              ...reg,
              fecha: datos.fecha,
              horas: Number(datos.horas),
              actividad: datos.actividad.trim(),
            }
          : reg
      )
    )
    encolarOperacion({
      tipo: 'actualizar',
      localId: id,
      datos: {
        fecha: datos.fecha,
        horas: Number(datos.horas),
        actividad: datos.actividad.trim(),
      },
    })
    return { exito: true }
  }

  const eliminarRegistro = async (id: number): Promise<void> => {
    if (backendConectado) {
      try {
        await deleteRegistroApi(id)
      } catch (err) {
        // El registro ya se marca como eliminado localmente; se encola
        // para que el servidor lo elimine en la próxima sincronización
        console.warn('Error al eliminar en backend; se encolará para sincronizar:', err)
        encolarOperacion({ tipo: 'eliminar', localId: id })
      }
    } else {
      encolarOperacion({ tipo: 'eliminar', localId: id })
    }

    setRegistros((prev) => prev.filter((reg) => reg.id !== id))
  }

  const actualizarPerfil = async (nuevoPerfil: PerfilEstudiante): Promise<void> => {
    setPerfil(nuevoPerfil)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nuevoPerfil))

    try {
      await updatePerfilApi(nuevoPerfil)
      setBackendConectado(true)
    } catch (err) {
      console.warn('Error al actualizar perfil en backend:', err)
    }
  }

  /**
   * Restaura un respaldo: REEMPLAZA todos los registros (en este dispositivo
   * y en la nube) por los del archivo. Antes los añadía, lo que duplicaba
   * horas si los registros ya existían.
   */
  const restaurarBackup = (
    nuevosRegistros: Registro[],
    nuevoPerfil?: PerfilEstudiante
  ): Promise<{ exito: boolean; error?: string }> =>
    // Espera a que termine cualquier sincronización para no mezclarse con ella
    despuesDeBloqueo('serviciotrack-sync-registros', async () => {
      const datos = nuevosRegistros.map(({ fecha, horas, actividad }) => ({ fecha, horas, actividad }))
      const conectado = await checkBackendHealth()
      setBackendConectado(conectado)

      if (conectado) {
        try {
          // El perfil primero: sus horas objetivo son el límite que valida el servidor
          if (nuevoPerfil) await updatePerfilApi(nuevoPerfil)
          const remotos = await reemplazarRegistrosApi(datos)
          // Lo anterior de la cola queda sustituido por el respaldo
          guardarCola([])
          setPendientes(0)
          setRegistros(remotos)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remotos))
          if (nuevoPerfil) {
            setPerfil(nuevoPerfil)
            localStorage.setItem(PROFILE_KEY, JSON.stringify(nuevoPerfil))
          }
          return { exito: true }
        } catch (err) {
          if (esErrorPermanente(err)) {
            return { exito: false, error: (err as Error).message }
          }
          // Fallo de red: seguir como si no hubiera conexión
        }
      }

      // Sin conexión: aplicar en local y dejar una sola operación pendiente
      // que sustituye a todo lo anterior de la cola
      setRegistros(nuevosRegistros)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevosRegistros))
      if (nuevoPerfil) {
        setPerfil(nuevoPerfil)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(nuevoPerfil))
      }
      guardarCola([{ tipo: 'reemplazar', localId: 0, registros: datos }])
      setPendientes(1)
      return { exito: true }
    })

  return {
    registros,
    registrosOrdenados,
    perfil,
    cargando,
    backendConectado,
    sincronizando,
    pendientes,
    avisosSync,
    limpiarAvisosSync,
    totalHours,
    horasRealizadas,
    horasRestantes,
    progreso,
    diasRegistrados,
    promedioHoras,
    ultimaFecha,
    diasRestantesLimite,
    ritmoRecomendado,
    agregarRegistro,
    actualizarRegistro,
    eliminarRegistro,
    actualizarPerfil,
    restaurarBackup,
    sincronizarConBackend,
  }
}
