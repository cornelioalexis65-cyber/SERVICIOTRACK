import { useEffect, useState } from 'react'

/**
 * Hook oficial para detectar actualizaciones PWA con vite-plugin-pwa
 * Usa el módulo virtual 'virtual:pwa-register' que genera el plugin
 */
export function usePwaUpdate(
  onNeedRefresh: (reload: () => Promise<void>) => void
) {
  const [needRefresh, setNeedRefresh] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    // Import dinámico del módulo virtual que genera vite-plugin-pwa
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() {
            // Nueva versión disponible - notificar al usuario
            setNeedRefresh(() => {
              // Retornar función que hace skipWaiting y recarga
              return async () => {
                setNeedRefresh(null)
                await updateSW(true) // true = skipWaiting
                window.location.reload()
              }
            })
          },
          onOfflineReady() {
            // App lista para funcionar offline
            console.log('PWA: App ready to work offline')
          },
          onRegistered(swRegistration: ServiceWorkerRegistration | undefined) {
            console.log('PWA: Service Worker registered', swRegistration?.scope)
          },
          onRegisterError(error: Error) {
            console.error('PWA: Service Worker registration failed', error)
          },
        })

        // Exponer updateSW para uso manual si se necesita
        return updateSW
      })
      .catch((err) => {
        console.warn('PWA register module not available:', err)
      })
  }, [])

  // Efecto para llamar al callback cuando hay refresh disponible
  useEffect(() => {
    if (needRefresh) {
      onNeedRefresh(needRefresh)
    }
  }, [needRefresh, onNeedRefresh])

  return { needRefresh: !!needRefresh }
}