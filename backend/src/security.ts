import { timingSafeEqual, createHash } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import type { CorsOptions } from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Token compartido que el frontend envía en `Authorization: Bearer <token>`.
 * Si no está definido, el servidor solo escucha en 127.0.0.1 (modo local)
 * y no exige token: nadie fuera de este equipo puede alcanzarlo.
 */
export const API_TOKEN = process.env.API_TOKEN?.trim() || ''

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
    // Sin cabecera Origin: curl, apps nativas o la misma página. El token protege igual.
    if (!origen || ORIGENES_PERMITIDOS.includes(origen)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}

// Comparar hashes de igual longitud evita filtrar el token por tiempos de respuesta
function tokensIguales(recibido: string, esperado: string): boolean {
  const a = createHash('sha256').update(recibido).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}

/**
 * Exige el token en todas las rutas donde se monte.
 */
export function requerirToken(req: Request, res: Response, next: NextFunction): void {
  if (!API_TOKEN) {
    next()
    return
  }

  const cabecera = req.headers.authorization || ''
  const recibido = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : ''

  if (!recibido || !tokensIguales(recibido, API_TOKEN)) {
    res.status(401).json({ error: 'No autorizado: token inválido o ausente.' })
    return
  }
  next()
}

/**
 * Manejador final de errores: responde siempre en JSON (antes, un archivo
 * rechazado por multer devolvía una página HTML con código 500).
 */
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el tamaño máximo de 25 MB.'
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
