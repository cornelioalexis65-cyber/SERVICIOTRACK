import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import dotenv from 'dotenv'
import * as schema from './schema.js'

dotenv.config()

const url = process.env.TURSO_DATABASE_URL || 'file:serviciotrack.db'
const authToken = process.env.TURSO_AUTH_TOKEN

export const client = createClient({
  url,
  authToken,
})

export const db = drizzle(client, { schema })

/**
 * Inicializa la base de datos asegurando la creación de tablas
 */
export async function initDB() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        horas REAL NOT NULL,
        actividad TEXT NOT NULL,
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.execute(`
      CREATE TABLE IF NOT EXISTS perfil_estudiante (
        id INTEGER PRIMARY KEY DEFAULT 1,
        nombre TEXT NOT NULL DEFAULT 'Estudiante',
        matricula TEXT NOT NULL DEFAULT '',
        carrera TEXT NOT NULL DEFAULT '',
        institucion TEXT NOT NULL DEFAULT '',
        fecha_inicio TEXT NOT NULL DEFAULT '',
        fecha_limite TEXT NOT NULL DEFAULT '',
        horas_objetivo REAL NOT NULL DEFAULT 500
      );
    `)

    // Insertar registro de perfil inicial si no existe
    await client.execute(`
      INSERT OR IGNORE INTO perfil_estudiante (id, nombre, matricula, carrera, institucion, fecha_inicio, fecha_limite, horas_objetivo)
      VALUES (1, 'Alexis', '2026-ST', 'Ingeniería en Sistemas', 'Institución Educativa', '2026-09-01', '2027-03-01', 500);
    `)

    console.log('✅ Base de datos inicializada correctamente')
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error)
  }
}
