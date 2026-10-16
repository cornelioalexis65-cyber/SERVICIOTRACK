import { createHmac, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import type { Request, Response, NextFunction } from 'express'
import type { CorsOptions } from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { and, eq, gt, lt, count } from 'drizzle-orm'
import { db } from './db/index.js'
import { intentosLoginTable } from './db/schema.js'

dotenv.config()

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

/**
 * Hash de la contraseña de acceso, con el formato `scrypt:<sal>:<hash>` en
 * hexadecimal. Se genera con `npm run hash-password`. La contraseña en texto
 * plano nunca se guarda en ningún sitio.
 */
const PASSWORD_HASH = process.env.APP_PASSWORD_HASH?.trim() || ''

/** Secreto con el que se firman las sesiones. Cambiarlo cierra todas las sesiones. */
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || ''

const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const VENTANA_INTENTOS_MS = 15 * 60 * 1000 // 15 minutos
const MAX_INTENTOS_FALLIDOS = 10

/** En Vercel siempre se exige autenticación. */
export const EN_VERCEL = !!process.env.VERCEL

/**
 * Modo local: sin contraseña configurada, el servidor no pide sesión y solo
 * escucha en 127.0.0.1 (ver server.ts). En Vercel nunca hay modo local.
 */
export const MODO_LOCAL = !EN_VERCEL && !PASSWORD_HASH && !SESSION_SECRET

export const AUTENTICACION_CONFIGURADA = !!PASSWORD_HASH && SESSION_SECRET.length >= 32

// ===== CORS =====

const ORIGENES_POR_DEFECTO = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

/** Orígenes permitidos (CORS_ORIGINS separados por comas). */
export const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .concat(ORIGENES_POR_DEFECTO)

export const opcionesCors: CorsOptions = {
  origin(origen, callback) {
    // Sin cabecera Origin: curl o la misma página. La sesión protege igual.
    callback(null, !origen || ORIGENES_PERMITIDOS.includes(origen))
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  maxAge: 600,
}

// ===== CONTRASEÑA =====

async function verificarPassword(password: string): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = PASSWORD_HASH.split(':')
  if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false
  const esperado = Buffer.from(hashHex, 'hex')
  const calculado = await scryptAsync(password, Buffer.from(salHex, 'hex'), esperado.length)
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

// ===== SESIONES =====
// Token firmado sin estado: <payload base64url>.<firma HMAC-SHA256>.
// No es la contraseña ni un secreto del servidor: solo prueba que quien lo
// envía inició sesión, y caduca a los 30 días.

function firmar(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

function crearSesion(): { token: string; expiraEn: string } {
  const exp = Date.now() + DURACION_SESION_MS
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return { token: `${payload}.${firmar(payload)}`, expiraEn: new Date(exp).toISOString() }
}

function sesionValida(token: string): boolean {
  const [payload, firma] = token.split('.')
  if (!payload || !firma) return false
  const esperada = Buffer.from(firmar(payload))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

// ===== RUTAS Y MIDDLEWARES =====

function ipDe(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'desconocida'
}

/**
 * POST /api/login  { password }
 * Devuelve una sesión firmada. Limita los intentos fallidos por IP.
 */
export async function login(req: Request, res: Response): Promise<void> {
  if (MODO_LOCAL) {
    res.json({ token: 'local', expiraEn: null, modoLocal: true })
    return
  }
  if (!AUTENTICACION_CONFIGURADA) {
    res.status(503).json({ error: 'El servidor no tiene configurada la contraseña de acceso.' })
    return
  }

  const ip = ipDe(req)
  const desde = Date.now() - VENTANA_INTENTOS_MS
  const [{ total }] = await db
    .select({ total: count() })
    .from(intentosLoginTable)
    .where(and(eq(intentosLoginTable.ip, ip), gt(intentosLoginTable.fecha, desde)))

  if (total >= MAX_INTENTOS_FALLIDOS) {
    res.status(429).json({ error: 'Demasiados intentos fallidos. Espera 15 minutos.' })
    return
  }

  const { password } = req.body ?? {}
  if (typeof password !== 'string' || !password || !(await verificarPassword(password))) {
    await db.insert(intentosLoginTable).values({ ip, fecha: Date.now() })
    // Limpieza de intentos viejos
    await db.delete(intentosLoginTable).where(lt(intentosLoginTable.fecha, desde))
    res.status(401).json({ error: 'Contraseña incorrecta.' })
    return
  }

  await db.delete(intentosLoginTable).where(eq(intentosLoginTable.ip, ip))
  res.json(crearSesion())
}

/**
 * Exige una sesión válida en todas las rutas donde se monte.
 */
export function requerirSesion(req: Request, res: Response, next: NextFunction): void {
  if (MODO_LOCAL) {
    next()
    return
  }
  if (!AUTENTICACION_CONFIGURADA) {
    res.status(503).json({ error: 'El servidor no tiene configurada la contraseña de acceso.' })
    return
  }

  const cabecera = req.headers.authorization || ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : ''

  if (!token || !sesionValida(token)) {
    res.status(401).json({ error: 'Sesión inválida o caducada. Vuelve a iniciar sesión.' })
    return
  }
  next()
}

/**
 * Manejador final de errores: responde siempre en JSON.
 */
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el tamaño máximo de 4 MB.'
      : `Error al recibir el archivo: ${err.message}`
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: mensaje })
    return
  }

  if (err instanceof SyntaxError || (err as { type?: string })?.type === 'entity.too.large') {
    res.status(400).json({ error: 'Cuerpo de la petición inválido o demasiado grande.' })
    return
  }

  if (err instanceof Error && err.message.startsWith('Tipo de archivo no permitido')) {
    res.status(400).json({ error: err.message })
    return
  }

  console.error('Error no controlado:', err)
  res.status(500).json({ error: 'Error interno del servidor.' })
}
