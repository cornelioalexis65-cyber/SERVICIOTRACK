import { useEffect, useState, useCallback } from 'react'
import type { Registro, PerfilEstudiante } from '../types/registro'
import {
  checkBackendHealth,
  fetchRegistrosApi,
  createRegistroApi,
  updateRegistroApi,
  deleteRegistroApi,
  fetchPerfilApi,
  updatePerfilApi,
} from '../services/api'

const STORAGE_KEY = 'serviciotrack-registros'
const PROFILE_KEY = 'serviciotrack-perfil'

const PERFIL_DEFAULT: PerfilEstudiante = {
  nombre: '',
  matricula: '',
  carrera: 'Ingeniería en Sistemas Computacionales',
  institucion: 'TecNM Campus Escárcega',
  fechaInicio: '2026-09-01',
  fechaLimite: '',
  horasObjetivo: 500,
}

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [perfil, setPerfil] = useState<PerfilEstudiante>(PERFIL_DEFAULT)
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
        console.error('Error al leer localStorage de registros:', e)
      }
    }

    const perfilGuardado = localStorage.getItem(PROFILE_KEY)
    if (perfilGuardado) {
      try {
        const parseadoPerfil: PerfilEstudiante = JSON.parse(perfilGuardado)
        setPerfil(parseadoPerfil)
      } catch (e) {
        console.error('Error al leer localStorage de perfil:', e)
      }
    }

    setCargando(false)
  }, [])

  // 2. Comprobar backend y sincronizar registros y perfil
  const sincronizarConBackend = useCallback(async () => {
    setSincronizando(true)
    const isOnline = await checkBackendHealth()
    setBackendConectado(isOnline)

    if (isOnline) {
      try {
        const [registrosRemotos, perfilRemoto] = await Promise.all([
          fetchRegistrosApi(),
          fetchPerfilApi().catch(() => null),
        ])

        setRegistros(registrosRemotos)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registrosRemotos))

        if (perfilRemoto) {
          setPerfil(perfilRemoto)
          localStorage.setItem(PROFILE_KEY, JSON.stringify(perfilRemoto))
        }
      } catch (error) {
        console.warn('Error al sincronizar con el backend:', error)
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

  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(perfil))
    }
  }, [perfil, cargando])

  // --- Métricas Derivadas ---
  const totalHours = perfil.horasObjetivo || 500
  const horasRealizadas = registros.reduce((total, r) => total + r.horas, 0)
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
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    diasRestantesLimite = Math.max(diffDias, 0)

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

  const actualizarPerfil = async (nuevoPerfil: PerfilEstudiante): Promise<void> => {
    setPerfil(nuevoPerfil)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nuevoPerfil))

    if (backendConectado) {
      try {
        await updatePerfilApi(nuevoPerfil)
      } catch (err) {
        console.warn('Error al actualizar perfil en backend:', err)
      }
    }
  }

  return {
    registros,
    registrosOrdenados,
    perfil,
    cargando,
    backendConectado,
    sincronizando,
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
    sincronizarConBackend,
  }
}
