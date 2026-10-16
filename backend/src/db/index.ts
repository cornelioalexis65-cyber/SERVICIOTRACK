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

/** Ejecuta un ALTER TABLE que puede fallar si la columna ya existe. */
async function agregarColumna(sql: string) {
  try {
    await client.execute(sql)
  } catch {
    // La columna ya existe
  }
}

async function crearTablas() {
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
      horas_objetivo REAL NOT NULL DEFAULT 500,
      programa TEXT NOT NULL DEFAULT '',
      supervisor TEXT NOT NULL DEFAULT ''
    );
  `)

  // Migraciones automáticas seguras para bases de datos existentes
  await agregarColumna(`ALTER TABLE perfil_estudiante ADD COLUMN programa TEXT NOT NULL DEFAULT '';`)
  await agregarColumna(`ALTER TABLE perfil_estudiante ADD COLUMN supervisor TEXT NOT NULL DEFAULT '';`)

  // Perfil inicial vacío si no existe (el estudiante lo completa desde la app)
  await client.execute(`
    INSERT OR IGNORE INTO perfil_estudiante (id, nombre, matricula, carrera, institucion, fecha_inicio, fecha_limite, horas_objetivo, programa, supervisor)
    VALUES (1, 'Estudiante', '', '', '', '', '', 500, '', '');
  `)

  // Tabla de documentos de servicio
  await client.execute(`
    CREATE TABLE IF NOT EXISTS documentos_servicio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      periodo TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      fecha_limite TEXT NOT NULL,
      fecha_entrega TEXT,
      nombre_archivo TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      tamano INTEGER NOT NULL,
      ruta_archivo TEXT NOT NULL,
      notas TEXT,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // El contenido del archivo se guarda en la base de datos: en Vercel no hay
  // disco permanente. `ruta_archivo` queda solo para archivos antiguos en disco.
  await agregarColumna(`ALTER TABLE documentos_servicio ADD COLUMN contenido BLOB;`)

  // Intentos fallidos de inicio de sesión (límite contra fuerza bruta)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS intentos_login (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      fecha INTEGER NOT NULL
    );
  `)
}

let inicializacion: Promise<void> | null = null

/**
 * Inicializa la base de datos asegurando la creación de tablas. Se ejecuta
 * una sola vez por proceso (en Vercel, una vez por instancia de la función).
 */
export function initDB(): Promise<void> {
  if (!inicializacion) {
    inicializacion = crearTablas()
      .then(() => console.log('✅ Base de datos inicializada correctamente'))
      .catch((error) => {
        inicializacion = null // reintentar en la siguiente petición
        console.error('❌ Error al inicializar la base de datos:', error)
        throw error
      })
  }
  return inicializacion
}
