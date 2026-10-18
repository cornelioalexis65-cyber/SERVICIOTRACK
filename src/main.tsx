import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Escuchar el permiso de instalación desde el principio (puede llegar antes que React)
import './utils/instalacion'
import './index.css'
import App from './App.tsx'

// Registrar Service Worker para funcionamiento 100% offline en móviles
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
