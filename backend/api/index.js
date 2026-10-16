// Punto de entrada en Vercel: toda la API Express como una sola función.
// `npm run build` (tsc) genera dist/ antes de empaquetar esta función.
import { app } from '../dist/app.js'

export default app
