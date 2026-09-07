import express from 'express'
import cors from 'cors'

export const app = express()

// Middlewares globales
app.use(cors())
app.use(express.json())

// Ruta de comprobación de salud del servidor (Health Check)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'ServicioTrack API',
    timestamp: new Date().toISOString(),
  })
})
