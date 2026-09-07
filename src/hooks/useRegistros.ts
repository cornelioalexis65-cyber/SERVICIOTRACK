import { useEffect, useState, useCallback } from 'react'
import type { Registro } from '../types/registro'
import {
  checkBackendHealth,
  fetchRegistrosApi,
  createRegistroApi,
  updateRegistroApi,
  deleteRegistroApi,
} from '../services/api'

const STORAGE_KEY = 'serviciotrack-registros'
export const TOTAL_HOURS = 500

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(true)
  const [backendConectado, setBackendConectado] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  // 1. Cargar datos locales de inmediato (Offline-First)
  useEffect(() => {
    const guardados = localStorage.getItem(STORAGE_KEY)
    if (guardados) {
      try {
        const parseados: Registro[] = JSON.parse(guardados)
        setRegistros(parseados)
      } catch (e) {
        console.error('Error al leer localStorage:', e)
      }
    }
    setCargando(false)
  }, [])

  // 2. Comprobar backend y sincronizar
  const sincronizarConBackend = useCallback(async () => {
    setSincronizando(true)
    const isOnline = await checkBackendHealth()
    setBackendConectado(isOnline)

    if (isOnline) {
      try {
        const registrosRemotos = await fetchRegistrosApi()
        setRegistros(registrosRemotos)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registrosRemotos))
      } catch (error) {
        console.warn('No se pudieron obtener registros del backend:', error)
      }
    }
    setSincronizando(false)
  }, [])

  useEffect(() => {
    sincronizarConBackend()
  }, [sincronizarConBackend])

  // 3. Persistir en localStorage ante cualquier cambio de estado
  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
    }
  }, [registros, cargando])

  // --- Métricas Derivadas ---
  const horasRealizadas = registros.reduce((total, r) => total + r.horas, 0)
  const horasRestantes = Math.max(TOTAL_HOURS - horasRealizadas, 0)
  const progreso = Math.min((horasRealizadas / TOTAL_HOURS) * 100, 100)
  const diasRegistrados = registros.length
  const promedioHoras = diasRegistrados > 0 ? horasRealizadas / diasRegistrados : 0

  const registrosOrdenados = [...registros].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  )

  const ultimaFecha =
    registrosOrdenados.length > 0 ? registrosOrdenados[0].fecha : 'Sin registros'

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

    if (horasPrevias + horas > TOTAL_HOURS) {
      return {
        valido: false,
        error: `No puedes superar el límite de ${TOTAL_HOURS} horas de servicio social.`,
      }
    }

    return { valido: true }
  }

  // --- Operaciones CRUD (Híbridas con sincronización) ---
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

    // Modo local / offline
    const nuevoLocal: Registro = {
      id: Date.now(),
      fecha: datos.fecha,
      horas: Number(datos.horas),
      actividad: datos.actividad.trim(),
    }
    setRegistros((prev) => [nuevoLocal, ...prev])
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

    // Modo local / offline
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
    return { exito: true }
  }

  const eliminarRegistro = async (id: number): Promise<void> => {
    if (backendConectado) {
      try {
        await deleteRegistroApi(id)
      } catch (err) {
        console.warn('Error al eliminar en backend, eliminando localmente:', err)
      }
    }

    setRegistros((prev) => prev.filter((reg) => reg.id !== id))
  }

  return {
    registros,
    registrosOrdenados,
    cargando,
    backendConectado,
    sincronizando,
    totalHours: TOTAL_HOURS,
    horasRealizadas,
    horasRestantes,
    progreso,
    diasRegistrados,
    promedioHoras,
    ultimaFecha,
    agregarRegistro,
    actualizarRegistro,
    eliminarRegistro,
    sincronizarConBackend,
  }
}
