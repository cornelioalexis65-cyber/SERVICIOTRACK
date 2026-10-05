interface ConfirmModalProps {
  abierto: boolean
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  variante?: 'peligro' | 'indigo'
  onConfirmar: () => void
  onCancelar: () => void
}

export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'peligro',
  onConfirmar,
  onCancelar,
}: ConfirmModalProps) {
  if (!abierto) return null

  const esPeligro = variante === 'peligro'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              esPeligro
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}
          >
            {esPeligro ? '🗑️' : '⚠️'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">{titulo}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{mensaje}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-lg cursor-pointer ${
              esPeligro
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 active:scale-95'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 active:scale-95'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
