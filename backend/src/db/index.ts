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
 * necesarias tanto en SQLite local como en libSQL/Turso.
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
    console.log('✅ Base de datos inicializada correctamente')
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error)
  }
}
