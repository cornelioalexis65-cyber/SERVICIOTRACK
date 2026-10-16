import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { registrosRouter } from './routes/registrosRoutes.js'
import { perfilRouter } from './routes/perfilRoutes.js'
import { documentosRouter } from './routes/documentosRoutes.js'
import { initDB } from './db/index.js'
import { opcionesCors, requerirSesion, manejarErrores, login, MODO_LOCAL } from './security.js'

export const app = express()

// Middlewares globales
app.disable('x-powered-by')
// Detrás del proxy de Vercel, la IP real del cliente viene en X-Forwarded-For
app.set('trust proxy', true)
app.use(cors(opcionesCors))
app.use(express.json({ limit: '100kb' }))

// Ruta de comprobación de salud del servidor (Health Check), pública
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'ServicioTrack API',
    timestamp: new Date().toISOString(),
  })
})

// Asegurar las tablas antes de cualquier consulta (en Vercel no hay arranque previo)
app.use('/api', (_req: Request, _res: Response, next: NextFunction) => {
  initDB().then(() => next(), next)
})

// Inicio de sesión con contraseña (público, con límite de intentos)
app.post('/api/login', (req, res, next) => {
  login(req, res).catch(next)
})

// Todo lo demás exige una sesión válida
app.use('/api', requerirSesion)

// Permite al frontend comprobar que su sesión sigue siendo válida
app.get('/api/sesion', (_req, res) => {
  res.json({ autenticado: true, modoLocal: MODO_LOCAL })
})

// Rutas de la API
app.use('/api/registros', registrosRouter)
app.use('/api/perfil', perfilRouter)
app.use('/api/documentos', documentosRouter)

app.use(manejarErrores)
