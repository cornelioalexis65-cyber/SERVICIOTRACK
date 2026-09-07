import express from 'express'
import cors from 'cors'
import { registrosRouter } from './routes/registrosRoutes.js'
import { perfilRouter } from './routes/perfilRoutes.js'

export const app = express()

// Middlewares globales
app.use(cors())
app.use(express.json())

// Rutas de la API
app.use('/api/registros', registrosRouter)
app.use('/api/perfil', perfilRouter)

// Ruta de comprobación de salud del servidor (Health Check)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'ServicioTrack API',
    timestamp: new Date().toISOString(),
  })
})
