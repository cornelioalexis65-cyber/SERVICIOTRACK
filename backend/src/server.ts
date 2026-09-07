import { app } from './app.js'
import { initDB } from './db/index.js'

const PORT = process.env.PORT || 3001

async function startServer() {
  await initDB()

  app.listen(PORT, () => {
    console.log(`🚀 ServicioTrack Backend corriendo en http://localhost:${PORT}`)
  })
}

startServer()
