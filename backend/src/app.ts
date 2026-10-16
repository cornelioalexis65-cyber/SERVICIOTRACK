import express from 'express'
import cors from 'cors'
import { registrosRouter } from './routes/registrosRoutes.js'
import { perfilRouter } from './routes/perfilRoutes.js'
import { documentosRouter } from './routes/documentosRoutes.js'
import { opcionesCors, requerirToken, manejarErrores } from './security.js'

export const app = express()

// Middlewares globales
app.disable('x-powered-by')
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

// Todo lo demás exige el token (si está configurado)
app.use('/api', requerirToken)

// Permite al frontend comprobar que su token es válido
app.get('/api/sesion', (_req, res) => {
  res.json({ autenticado: true })
})

// Rutas de la API
app.use('/api/registros', registrosRouter)
app.use('/api/perfil', perfilRouter)
app.use('/api/documentos', documentosRouter)

app.use(manejarErrores)
