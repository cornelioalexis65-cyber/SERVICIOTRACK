import { app } from './app.js'
import { initDB } from './db/index.js'
import { MODO_LOCAL, AUTENTICACION_CONFIGURADA, ORIGENES_PERMITIDOS } from './security.js'

// Servidor para desarrollo local. En Vercel se usa api/index.js en su lugar.
const PORT = Number(process.env.PORT) || 3001
// Sin contraseña, el servidor solo es accesible desde este mismo equipo
const HOST = process.env.HOST || (MODO_LOCAL ? '127.0.0.1' : '0.0.0.0')

async function startServer() {
  await initDB()

  app.listen(PORT, HOST, () => {
    console.log(`🚀 ServicioTrack Backend corriendo en http://${HOST}:${PORT}`)
    if (MODO_LOCAL) {
      console.warn('⚠️  Sin APP_PASSWORD_HASH ni SESSION_SECRET: modo local sin contraseña (solo accesible desde este equipo)')
      if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
        console.warn(`⚠️  HOST=${HOST} en modo local: cualquiera en la red puede leer y modificar los datos`)
      }
    } else if (AUTENTICACION_CONFIGURADA) {
      console.log('🔒 Inicio de sesión con contraseña activado')
    } else {
      console.error('❌ Configuración incompleta: hacen falta APP_PASSWORD_HASH y SESSION_SECRET (mínimo 32 caracteres). La API responderá 503.')
    }
    console.log(`🌐 Orígenes CORS permitidos: ${ORIGENES_PERMITIDOS.join(', ')}`)
  })
}

startServer()
