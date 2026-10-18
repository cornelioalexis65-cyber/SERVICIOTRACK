/**
 * Instalación de la app (PWA).
 *
 * El navegador avisa con el evento `beforeinstallprompt` cuando permite
 * instalar desde un botón propio. Puede llegar antes de que React monte el
 * aviso, así que se escucha desde que se importa este módulo (en main.tsx).
 *
 * Solo Chrome, Edge y Samsung Internet lo envían. En iPhone (Safari),
 * Firefox, el navegador de Xiaomi o los navegadores internos de WhatsApp,
 * Instagram o Facebook, ninguna página puede instalarse sola: ahí se muestra
 * una guía.
 */

export interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let eventoGuardado: EventoInstalacion | null = null
let instaladaAhora = false
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // lo mostramos nosotros con el botón "Instalar app"
    eventoGuardado = e as EventoInstalacion
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    instaladaAhora = true
    eventoGuardado = null
    avisar()
  })
}

export function suscribirseInstalacion(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function puedeInstalarDirecto(): boolean {
  return eventoGuardado !== null
}

export function estaInstalada(): boolean {
  if (instaladaAhora) return true
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

/** Abre la ventana de instalación del navegador. */
export async function instalarDirecto(): Promise<'aceptada' | 'rechazada' | 'no-disponible'> {
  if (!eventoGuardado) return 'no-disponible'
  const evento = eventoGuardado
  await evento.prompt()
  const { outcome } = await evento.userChoice
  // El evento solo sirve una vez
  eventoGuardado = null
  avisar()
  return outcome === 'accepted' ? 'aceptada' : 'rechazada'
}

export type Plataforma = 'ios' | 'android' | 'otro'

export function detectarPlataforma(): Plataforma {
  if (typeof navigator === 'undefined') return 'otro'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'otro'
}

/**
 * Navegadores en los que no se puede instalar: los internos de otras apps
 * (WhatsApp, Instagram, Facebook, TikTok…) y algunos de fabricantes.
 */
export function detectarNavegadorLimitado(): 'interno' | 'sin-soporte' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|; wv\)/i.test(ua)) return 'interno'
  if (/MiuiBrowser|XiaoMi|Firefox|FxiOS|OPR\/|Opera Mini|UCBrowser|DuckDuckGo/i.test(ua)) return 'sin-soporte'
  return null
}

/**
 * Enlace que abre esta misma página en Google Chrome en Android, también
 * desde los navegadores internos de otras apps.
 */
export function enlaceAbrirEnChrome(): string {
  const { host, pathname, search } = window.location
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`
}
