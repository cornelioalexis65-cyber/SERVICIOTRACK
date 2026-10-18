import { useState, useSyncExternalStore } from 'react'
import {
  suscribirseInstalacion,
  puedeInstalarDirecto,
  estaInstalada,
  instalarDirecto,
  detectarPlataforma,
  detectarNavegadorLimitado,
  enlaceAbrirEnChrome,
} from '../utils/instalacion'

/**
 * Aviso con el botón "Instalar app".
 * - Si el navegador lo permite (Chrome, Edge, Samsung Internet), el botón
 *   abre directamente su ventana de instalación.
 * - Si no, el botón muestra una guía para ese caso (abrir en Chrome, menú del
 *   navegador o pasos de Safari en iPhone).
 */
export function InstalarAppBanner() {
  const directo = useSyncExternalStore(suscribirseInstalacion, puedeInstalarDirecto, () => false)
  const instalada = useSyncExternalStore(suscribirseInstalacion, estaInstalada, () => false)
  const [plataforma] = useState(detectarPlataforma)
  const [limitado] = useState(detectarNavegadorLimitado)
  const [mostrandoGuia, setMostrandoGuia] = useState(false)

  if (instalada) {
    return null
  }

  // En PC sin botón del navegador no hay nada útil que mostrar
  if (!directo && plataforma === 'otro') {
    return null
  }

  const instalarApp = async () => {
    if (directo) {
      const resultado = await instalarDirecto()
      if (resultado !== 'no-disponible') return
    }
    setMostrandoGuia((v) => !v)
  }

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shadow-md shrink-0">
            📱
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Instala ServicioTrack en tu celular</h3>
            <p className="text-xs text-indigo-200/80">
              Ábrela desde tu pantalla de inicio como una app normal, también sin internet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={instalarApp}
          id="btn-instalar-app"
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📲</span>
          <span>{mostrandoGuia ? 'Cerrar guía' : 'Instalar app'}</span>
        </button>
      </div>

      {mostrandoGuia && (
        <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs text-slate-300 space-y-2 bg-slate-950/40 p-3 rounded-xl">
          {plataforma === 'android' && limitado ? (
            <>
              <p className="font-semibold text-indigo-300">
                {limitado === 'interno'
                  ? 'Abriste el link dentro de otra app (WhatsApp, Instagram…), y desde ahí no se puede instalar.'
                  : 'Este navegador no permite instalar con un botón.'}
              </p>
              <a
                href={enlaceAbrirEnChrome()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white"
              >
                <span>🌐</span>
                <span>Abrir en Chrome</span>
              </a>
              <p className="text-slate-400">
                En Chrome vuelve a tocar <span className="text-white font-medium">"Instalar app"</span>. Si no tienes
                Chrome, abre el menú de tu navegador y busca{' '}
                <span className="text-white font-medium">"Agregar a pantalla principal"</span>.
              </p>
            </>
          ) : plataforma === 'android' ? (
            <>
              <p className="font-semibold text-indigo-300">Tu navegador no ofreció el botón de instalación. Hazlo desde el menú:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Toca el menú <span className="text-white font-medium">⋮</span> arriba a la derecha.</li>
                <li>
                  Elige <span className="text-white font-medium">"Instalar app"</span> o{' '}
                  <span className="text-white font-medium">"Agregar a pantalla principal"</span>.
                </li>
                <li>Confirma con <span className="text-white font-medium">"Instalar"</span>.</li>
              </ol>
              <p className="text-slate-500">
                Si antes rechazaste la instalación, Chrome puede tardar en volver a ofrecer el botón; el menú siempre funciona.
              </p>
            </>
          ) : limitado === 'interno' ? (
            <p className="font-semibold text-indigo-300">
              Abriste el link dentro de otra app. Toca <span className="text-white">⋯</span> o el icono de compartir y elige{' '}
              <span className="text-white">"Abrir en Safari"</span>; después sigue los pasos para instalar.
            </p>
          ) : (
            <>
              <p className="font-semibold text-indigo-300">En iPhone se instala desde Safari:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Toca el botón <span className="text-white font-medium">Compartir ⎋</span> en la barra de Safari.</li>
                <li>Desliza y elige <span className="text-white font-medium">"Agregar a inicio ➕"</span>.</li>
                <li>Toca <span className="text-white font-medium">"Agregar"</span> y listo.</li>
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  )
}
