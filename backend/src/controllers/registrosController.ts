import type { Request, Response } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db, client } from '../db/index.js'
import { registrosTable, perfilTable } from '../db/schema.js'

const TOTAL_HOURS_FALLBACK = 500
const EXPRESION_FECHA = /^\d{4}-\d{2}-\d{2}$/
const MAX_REGISTROS_REEMPLAZO = 5000

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

type DatosRegistro = { fecha: string; horas: number; actividad: string }

/**
 * Valida los campos de un registro. Devuelve los datos normalizados o el
 * mensaje de error.
 */
function validarDatosRegistro(cuerpo: unknown): { datos?: DatosRegistro; error?: string } {
  const { fecha, horas, actividad } = (cuerpo ?? {}) as Record<string, unknown>

  if (!fecha || horas === undefined || !actividad || typeof actividad !== 'string' || !actividad.trim()) {
    return { error: 'Todos los campos (fecha, horas, actividad) son obligatorios.' }
  }

  if (!fechaValida(fecha)) {
    return { error: 'La fecha debe ser válida y estar en formato YYYY-MM-DD.' }
  }

  const numHoras = Number(horas)
  if (isNaN(numHoras) || numHoras <= 0) {
    return { error: 'El número de horas debe ser un número mayor a 0.' }
  }

  if (numHoras > 24) {
    return { error: 'No se pueden registrar más de 24 horas en una sola actividad.' }
  }

  const hoy = new Date().toLocaleDateString('en-CA')
  if (fecha > hoy) {
    return { error: 'No se pueden registrar actividades con fechas futuras.' }
  }

  return { datos: { fecha, horas: numHoras, actividad: actividad.trim() } }
}

function idClienteValido(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null
  const texto = String(valor).trim()
  return texto && texto.length <= 64 ? texto : null
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
 * Crear un nuevo registro con validaciones de seguridad en el backend.
 * Si llega `idCliente` y ya existe un registro con ese id, se devuelve el
 * existente (200) en vez de crear un duplicado.
 */
export async function createRegistro(req: Request, res: Response): Promise<void> {
  try {
    const idCliente = idClienteValido(req.body?.idCliente)

    if (idCliente) {
      const [existente] = await db
        .select()
        .from(registrosTable)
        .where(eq(registrosTable.idCliente, idCliente))
      if (existente) {
        res.status(200).json(existente)
        return
      }
    }

    const { datos, error } = validarDatosRegistro(req.body)
    if (!datos) {
      res.status(400).json({ error })
      return
    }

    // Validar tope acumulado contra las horas objetivo del perfil
    const limiteHoras = await obtenerLimiteHoras()
    const todos = await db.select().from(registrosTable)
    const horasAcumuladas = todos.reduce((total, r) => total + r.horas, 0)

    if (horasAcumuladas + datos.horas > limiteHoras) {
      res.status(400).json({
        error: `No puedes superar el límite total de ${limiteHoras} horas de servicio social. (Llevas ${horasAcumuladas} hrs)`,
      })
      return
    }

    const [nuevoRegistro] = await db
      .insert(registrosTable)
      .values({ ...datos, idCliente })
      .returning()

    res.status(201).json(nuevoRegistro)
  } catch (error) {
    console.error('Error al crear registro:', error)
    res.status(500).json({ error: 'Error interno del servidor al guardar el registro.' })
  }
}

/**
 * Reemplazar TODOS los registros por los recibidos (restaurar un respaldo).
 * Se hace en una sola transacción: o se aplican todos o ninguno.
 */
export async function reemplazarRegistros(req: Request, res: Response): Promise<void> {
  try {
    const lista = req.body?.registros
    if (!Array.isArray(lista)) {
      res.status(400).json({ error: 'Se esperaba una lista de registros.' })
      return
    }
    if (lista.length > MAX_REGISTROS_REEMPLAZO) {
      res.status(400).json({ error: `El respaldo tiene demasiados registros (máximo ${MAX_REGISTROS_REEMPLAZO}).` })
      return
    }

    const validos: DatosRegistro[] = []
    for (let i = 0; i < lista.length; i++) {
      const { datos, error } = validarDatosRegistro(lista[i])
      if (!datos) {
        res.status(400).json({ error: `Registro ${i + 1} del respaldo: ${error}` })
        return
      }
      validos.push(datos)
    }

    const limiteHoras = await obtenerLimiteHoras()
    const total = validos.reduce((suma, r) => suma + r.horas, 0)
    if (total > limiteHoras) {
      res.status(400).json({
        error: `El respaldo suma ${total} horas y supera tu meta de ${limiteHoras} horas. Ajusta las horas objetivo del perfil antes de restaurarlo.`,
      })
      return
    }

    await client.batch(
      [
        'DELETE FROM registros',
        ...validos.map((r) => ({
          sql: 'INSERT INTO registros (fecha, horas, actividad) VALUES (?, ?, ?)',
          args: [r.fecha, r.horas, r.actividad],
        })),
      ],
      'write'
    )

    const registros = await db
      .select()
      .from(registrosTable)
      .orderBy(desc(registrosTable.fecha), desc(registrosTable.id))

    res.json(registros)
  } catch (error) {
    console.error('Error al reemplazar registros:', error)
    res.status(500).json({ error: 'Error interno del servidor al restaurar los registros.' })
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

    const { datos, error } = validarDatosRegistro(req.body)
    if (!datos) {
      res.status(400).json({ error })
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

    if (horasAcumuladasSinActual + datos.horas > limiteHoras) {
      res.status(400).json({
        error: `No puedes superar el límite de ${limiteHoras} horas de servicio social.`,
      })
      return
    }

    const [registroActualizado] = await db
      .update(registrosTable)
      .set(datos)
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
