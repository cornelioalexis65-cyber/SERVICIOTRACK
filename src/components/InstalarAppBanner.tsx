import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstalarAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [esInstalable, setEsInstalable] = useState(false)
  const [mostrandoGuiaIOS, setMostrandoGuiaIOS] = useState(false)

  // Inicialización directa y sin efectos secundarios (evita re-renders en cascada)
  const [yaInstalada] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - navigator.standalone es una propiedad específica de iOS
      Boolean(navigator.standalone)
    )
  })

  const [esIOS] = useState(() => {
    if (typeof window === 'undefined') return false
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent)
  })

  const [esAndroid] = useState(() => {
    if (typeof window === 'undefined') return false
    return /android/.test(window.navigator.userAgent.toLowerCase())
  })

  useEffect(() => {
    if (yaInstalada) return

    // Capturar evento de instalación para Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setEsInstalable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [yaInstalada])

  if (yaInstalada) {
    return null
  }

  const instalarApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setEsInstalable(false)
        setDeferredPrompt(null)
      }
    } else if (esIOS || esAndroid) {
      setMostrandoGuiaIOS(!mostrandoGuiaIOS)
    }
  }

  // Mostrar si es instalable (Android/escritorio con botón del navegador), en
  // iOS (instrucciones) o en Android sin botón del navegador (instrucciones del
  // menú: Samsung Internet, navegador de Xiaomi, o si se descartó el aviso)
  const guiaManual = !esInstalable && (esIOS || esAndroid)
  if (!esInstalable && !guiaManual) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shadow-md shrink-0">
            📱
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {esIOS ? 'Instalar ServicioTrack en tu iPhone / iPad' : 'Instala ServicioTrack en tu Celular'}
            </h3>
            <p className="text-xs text-indigo-200/80">
              {esIOS
                ? 'Accede sin internet desde tu pantalla de inicio como una app normal.'
                : 'Ábrela en cualquier momento 100% sin conexión a internet.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={instalarApp}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📲</span>
          <span>{guiaManual ? (mostrandoGuiaIOS ? 'Cerrar Guía' : '¿Cómo Instalar?') : 'Instalar App'}</span>
        </button>
      </div>

      {esIOS && mostrandoGuiaIOS && (
        <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs text-slate-300 space-y-1.5 bg-slate-950/40 p-3 rounded-xl">
          <p className="font-semibold text-indigo-300">Pasos para instalar en iOS (Safari):</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Toca el botón <span className="text-white font-medium">Compartir ⎋</span> en la barra inferior de Safari.</li>
            <li>Desliza hacia abajo y selecciona <span className="text-white font-medium">"Agregar al inicio ➕"</span>.</li>
            <li>Presiona <span className="text-white font-medium">"Agregar"</span> y ¡listo! La app abrirá sin internet.</li>
          </ol>
        </div>
      )}

      {esAndroid && guiaManual && mostrandoGuiaIOS && (
        <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs text-slate-300 space-y-1.5 bg-slate-950/40 p-3 rounded-xl">
          <p className="font-semibold text-indigo-300">Pasos para instalar en Android:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Abre esta página en <span className="text-white font-medium">Google Chrome</span> (funciona mejor que otros navegadores).</li>
            <li>Toca el menú <span className="text-white font-medium">⋮</span> arriba a la derecha.</li>
            <li>Elige <span className="text-white font-medium">"Instalar app"</span> o <span className="text-white font-medium">"Agregar a pantalla principal"</span>.</li>
            <li>Confirma con <span className="text-white font-medium">"Instalar"</span> y aparecerá el icono junto a tus apps.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
