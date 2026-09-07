import { useEffect, useState } from 'react'
import type { Registro } from '../types/registro'

const STORAGE_KEY = 'serviciotrack-registros'
export const TOTAL_HOURS = 500

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(true)

  // Cargar registros almacenados
  useEffect(() => {
    const registrosGuardados = localStorage.getItem(STORAGE_KEY)

    if (registrosGuardados) {
      try {
        const registrosParseados: Registro[] = JSON.parse(registrosGuardados)
        setRegistros(registrosParseados)
      } catch (error) {
        console.error('Error al cargar los registros desde localStorage:', error)
      }
    }

    setCargando(false)
  }, [])

  // Guardar registros en localStorage cuando cambian
  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
    }
  }, [registros, cargando])

  // --- Métricas y Cálculos Derivados ---
  const horasRealizadas = registros.reduce((total, reg) => total + reg.horas, 0)
  const horasRestantes = Math.max(TOTAL_HOURS - horasRealizadas, 0)
  const progreso = Math.min((horasRealizadas / TOTAL_HOURS) * 100, 100)
  const diasRegistrados = registros.length
  const promedioHoras = diasRegistrados > 0 ? horasRealizadas / diasRegistrados : 0

  // Ordenar registros por fecha (del más reciente al más antiguo)
  const registrosOrdenados = [...registros].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  )

  const ultimaFecha =
    registrosOrdenados.length > 0 ? registrosOrdenados[0].fecha : 'Sin registros'

  // --- Operaciones CRUD ---

  // Validaciones comunes
  const validarRegistro = (
    datos: Omit<Registro, 'id'>,
    idEditando: number | null = null
  ): { valido: boolean; error?: string } => {
    const { fecha, horas, actividad } = datos

    if (!fecha || !horas || !actividad.trim()) {
      return { valido: false, error: 'Completa todos los campos.' }
    }

    if (horas <= 0) {
      return { valido: false, error: 'Las horas deben ser mayores a 0.' }
    }

    if (horas > 24) {
      return { valido: false, error: 'Las horas no pueden superar las 24 horas en un solo registro.' }
    }

    // Validación de fecha no futura (formato YYYY-MM-DD local)
    const hoyStr = new Date().toLocaleDateString('en-CA') // Retorna formato YYYY-MM-DD
    if (fecha > hoyStr) {
      return { valido: false, error: 'No se pueden registrar actividades con fechas futuras.' }
    }

    // Validación de tope de 500 horas
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

  // Agregar nuevo registro
  const agregarRegistro = (datos: Omit<Registro, 'id'>): { exito: boolean; error?: string } => {
    const validacion = validarRegistro(datos)
    if (!validacion.valido) {
      return { exito: false, error: validacion.error }
    }

    const nuevoRegistro: Registro = {
      id: Date.now(),
      fecha: datos.fecha,
      horas: Number(datos.horas),
      actividad: datos.actividad.trim(),
    }

    setRegistros((prev) => [...prev, nuevoRegistro])
    return { exito: true }
  }

  // Actualizar registro existente
  const actualizarRegistro = (
    id: number,
    datos: Omit<Registro, 'id'>
  ): { exito: boolean; error?: string } => {
    const validacion = validarRegistro(datos, id)
    if (!validacion.valido) {
      return { exito: false, error: validacion.error }
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

  // Eliminar registro
  const eliminarRegistro = (id: number) => {
    setRegistros((prev) => prev.filter((reg) => reg.id !== id))
  }

  return {
    registros,
    registrosOrdenados,
    cargando,
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
  }
}
