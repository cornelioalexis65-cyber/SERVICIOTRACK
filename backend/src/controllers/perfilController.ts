import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { perfilTable } from '../db/schema.js'

export async function getPerfil(_req: Request, res: Response): Promise<void> {
  try {
    const [perfil] = await db.select().from(perfilTable).where(eq(perfilTable.id, 1))

    if (!perfil) {
      res.json({
        nombre: 'Alexis',
        matricula: '',
        carrera: '',
        institucion: '',
        fechaInicio: '',
        fechaLimite: '',
        horasObjetivo: 500,
      })
      return
    }

    res.json(perfil)
  } catch (error) {
    console.error('Error al obtener perfil:', error)
    res.status(500).json({ error: 'Error al consultar perfil del estudiante.' })
  }
}

export async function updatePerfil(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, matricula, carrera, institucion, fechaInicio, fechaLimite, horasObjetivo } = req.body

    const [perfilActualizado] = await db
      .insert(perfilTable)
      .values({
        id: 1,
        nombre: nombre || 'Estudiante',
        matricula: matricula || '',
        carrera: carrera || '',
        institucion: institucion || '',
        fechaInicio: fechaInicio || '',
        fechaLimite: fechaLimite || '',
        horasObjetivo: Number(horasObjetivo) || 500,
      })
      .onConflictDoUpdate({
        target: perfilTable.id,
        set: {
          nombre: nombre || 'Estudiante',
          matricula: matricula || '',
          carrera: carrera || '',
          institucion: institucion || '',
          fechaInicio: fechaInicio || '',
          fechaLimite: fechaLimite || '',
          horasObjetivo: Number(horasObjetivo) || 500,
        },
      })
      .returning()

    res.json(perfilActualizado)
  } catch (error) {
    console.error('Error al actualizar perfil:', error)
    res.status(500).json({ error: 'Error al guardar perfil del estudiante.' })
  }
}
