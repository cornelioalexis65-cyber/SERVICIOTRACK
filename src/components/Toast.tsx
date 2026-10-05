export type TipoToast = 'exito' | 'error' | 'info' | 'advertencia'

export interface ToastMensaje {
  id: string
  tipo: TipoToast
  titulo: string
  mensaje?: string
  accion?: {
    label: string
    onClick: () => void
  }
}

interface ToastContainerProps {
  toasts: ToastMensaje[]
  onCerrar: (id: string) => void
}

export function ToastContainer({ toasts, onCerrar }: ToastContainerProps) {
  if (toasts.length === 0) return null

  const getEstilos = (tipo: TipoToast) => {
    switch (tipo) {
      case 'exito':
        return {
          icono: '✓',
          bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
          badge: 'bg-emerald-500/20 text-emerald-400',
        }
      case 'error':
        return {
          icono: '✕',
          bg: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
          badge: 'bg-rose-500/20 text-rose-400',
        }
      case 'advertencia':
        return {
          icono: '⚠️',
          bg: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
          badge: 'bg-amber-500/20 text-amber-400',
        }
      case 'info':
      default:
        return {
          icono: 'ℹ️',
          bg: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200',
          badge: 'bg-indigo-500/20 text-indigo-400',
        }
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const estilo = getEstilos(toast.tipo)
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${estilo.bg}`}
            role="alert"
          >
            <span
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${estilo.badge}`}
            >
              {estilo.icono}
            </span>
            <div className="flex-1 min-w-0 text-xs">
              <strong className="block font-semibold text-white tracking-wide">
                {toast.titulo}
              </strong>
              {toast.mensaje && (
                <p className="mt-0.5 opacity-90 leading-relaxed break-words">
                  {toast.mensaje}
                </p>
              )}
            </div>
            {toast.accion && (
              <button
                type="button"
                onClick={() => {
                  toast.accion!.onClick()
                  onCerrar(toast.id)
                }}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                {toast.accion.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCerrar(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
