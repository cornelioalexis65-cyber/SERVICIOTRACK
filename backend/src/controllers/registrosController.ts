import type { Request, Response } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { registrosTable, perfilTable } from '../db/schema.js'

const TOTAL_HOURS_FALLBACK = 500
const EXPRESION_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Verifica que la fecha tenga formato YYYY-MM-DD y sea una fecha real
 * (rechaza mes 13, día 32, etc.)
 */
function fechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string' || !EXPRESION_FECHA.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const candidato = new Date(anio, mes - 1, dia)
  return (
    candidato.getFullYear() === anio &&
    candidato.getMonth() === mes - 1 &&
    candidato.getDate() === dia
  )
}

/**
 * Lee las horas objetivo del perfil del estudiante.
 * Si el perfil no existe o el valor es inválido, usa el respaldo de 500h.
 */
async function obtenerLimiteHoras(): Promise<number> {
  try {
    const [perfil] = await db.select().from(perfilTable).where(eq(perfilTable.id, 1))
    const valor = Number(perfil?.horasObjetivo)
    return Number.isFinite(valor) && valor > 0 ? valor : TOTAL_HOURS_FALLBACK
  } catch {
    return TOTAL_HOURS_FALLBACK
  }
}

/**
 * Obtener todos los registros ordenados por fecha descendente
 */
export async function getRegistros(_req: Request, res: Response): Promise<void> {
  try {
    const registros = await db
      .select()
      .from(registrosTable)
      .orderBy(desc(registrosTable.fecha), desc(registrosTable.id))

    res.json(registros)
  } catch (error) {
    console.error('Error al obtener registros:', error)
    res.status(500).json({ error: 'Error interno del servidor al consultar registros.' })
  }
}

/**
 * Crear un nuevo registro con validaciones de seguridad en el backend
 */
export async function createRegistro(req: Request, res: Response): Promise<void> {
  try {
    const { fecha, horas, actividad } = req.body

    // 1. Campos obligatorios
    if (!fecha || horas === undefined || !actividad || typeof actividad !== 'string' || !actividad.trim()) {
      res.status(400).json({ error: 'Todos los campos (fecha, horas, actividad) son obligatorios.' })
      return
    }

    if (!fechaValida(fecha)) {
      res.status(400).json({ error: 'La fecha debe ser válida y estar en formato YYYY-MM-DD.' })
      return
    }

    const numHoras = Number(horas)

    // 2. Rango de horas
    if (isNaN(numHoras) || numHoras <= 0) {
      res.status(400).json({ error: 'El número de horas debe ser un número mayor a 0.' })
      return
    }

    if (numHoras > 24) {
      res.status(400).json({ error: 'No se pueden registrar más de 24 horas en una sola actividad.' })
      return
    }

    // 3. Validación de fecha no futura
    const hoy = new Date().toLocaleDateString('en-CA')
    if (fecha > hoy) {
      res.status(400).json({ error: 'No se pueden registrar actividades con fechas futuras.' })
      return
    }

    // 4. Validar tope acumulado contra las horas objetivo del perfil
    const limiteHoras = await obtenerLimiteHoras()
    const todos = await db.select().from(registrosTable)
    const horasAcumuladas = todos.reduce((total, r) => total + r.horas, 0)

    if (horasAcumuladas + numHoras > limiteHoras) {
      res.status(400).json({
        error: `No puedes superar el límite total de ${limiteHoras} horas de servicio social. (Llevas ${horasAcumuladas} hrs)`,
      })
      return
    }

    // Inserción en Base de Datos
    const [nuevoRegistro] = await db
      .insert(registrosTable)
      .values({
        fecha,
        horas: numHoras,
        actividad: actividad.trim(),
      })
      .returning()

    res.status(201).json(nuevoRegistro)
  } catch (error) {
    console.error('Error al crear registro:', error)
    res.status(500).json({ error: 'Error interno del servidor al guardar el registro.' })
  }
}

/**
 * Actualizar un registro existente
 */
export async function updateRegistro(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID de registro no es válido.' })
      return
    }

    const { fecha, horas, actividad } = req.body

    if (!fecha || horas === undefined || !actividad || typeof actividad !== 'string' || !actividad.trim()) {
      res.status(400).json({ error: 'Todos los campos son obligatorios.' })
      return
    }

    if (!fechaValida(fecha)) {
      res.status(400).json({ error: 'La fecha debe ser válida y estar en formato YYYY-MM-DD.' })
      return
    }

    const numHoras = Number(horas)
    if (isNaN(numHoras) || numHoras <= 0) {
      res.status(400).json({ error: 'El número de horas debe ser mayor a 0.' })
      return
    }

    if (numHoras > 24) {
      res.status(400).json({ error: 'No se pueden registrar más de 24 horas por actividad.' })
      return
    }

    const hoy = new Date().toLocaleDateString('en-CA')
    if (fecha > hoy) {
      res.status(400).json({ error: 'No se pueden registrar actividades con fechas futuras.' })
      return
    }

    // Verificar si el registro existe
    const [existente] = await db
      .select()
      .from(registrosTable)
      .where(eq(registrosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'El registro a editar no existe.' })
      return
    }

    // Validar tope contra las horas objetivo del perfil,
    // descontando las horas anteriores del registro
    const limiteHoras = await obtenerLimiteHoras()
    const todos = await db.select().from(registrosTable)
    const horasAcumuladasSinActual = todos
      .filter((r) => r.id !== id)
      .reduce((total, r) => total + r.horas, 0)

    if (horasAcumuladasSinActual + numHoras > limiteHoras) {
      res.status(400).json({
        error: `No puedes superar el límite de ${limiteHoras} horas de servicio social.`,
      })
      return
    }

    // Actualización en Base de Datos
    const [registroActualizado] = await db
      .update(registrosTable)
      .set({
        fecha,
        horas: numHoras,
        actividad: actividad.trim(),
      })
      .where(eq(registrosTable.id, id))
      .returning()

    res.json(registroActualizado)
  } catch (error) {
    console.error('Error al actualizar registro:', error)
    res.status(500).json({ error: 'Error interno del servidor al actualizar el registro.' })
  }
}

/**
 * Eliminar un registro
 */
export async function deleteRegistro(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID de registro no es válido.' })
      return
    }

    const [existente] = await db
      .select()
      .from(registrosTable)
      .where(eq(registrosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'El registro no fue encontrado.' })
      return
    }

    await db.delete(registrosTable).where(eq(registrosTable.id, id))

    res.json({ mensaje: 'Registro eliminado con éxito.', id })
  } catch (error) {
    console.error('Error al eliminar registro:', error)
    res.status(500).json({ error: 'Error interno del servidor al eliminar el registro.' })
  }
}
