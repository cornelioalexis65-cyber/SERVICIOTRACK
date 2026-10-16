import { app } from './app.js'
import { initDB } from './db/index.js'
import { API_TOKEN, ORIGENES_PERMITIDOS } from './security.js'

const PORT = Number(process.env.PORT) || 3001
// Sin token, el servidor solo es accesible desde este mismo equipo
const HOST = process.env.HOST || (API_TOKEN ? '0.0.0.0' : '127.0.0.1')

async function startServer() {
  await initDB()

  app.listen(PORT, HOST, () => {
    console.log(`🚀 ServicioTrack Backend corriendo en http://${HOST}:${PORT}`)
    if (API_TOKEN) {
      console.log('🔒 Autenticación por token activada')
    } else {
      console.warn('⚠️  API_TOKEN no definido: modo local sin token (solo accesible desde este equipo)')
      if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
        console.warn(`⚠️  HOST=${HOST} sin API_TOKEN: cualquiera en la red puede leer y modificar los datos`)
      }
    }
    console.log(`🌐 Orígenes CORS permitidos: ${ORIGENES_PERMITIDOS.join(', ')}`)
  })
}

startServer()
