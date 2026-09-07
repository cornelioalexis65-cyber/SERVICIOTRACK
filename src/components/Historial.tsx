import type { Registro } from '../types/registro'

interface HistorialProps {
  registros: Registro[]
  onEditar: (registro: Registro) => void
  onEliminar: (id: number) => void
}

export function Historial({
  registros,
  onEditar,
  onEliminar,
}: HistorialProps) {
  return (
    <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Historial de Actividades</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registros ordenados cronológicamente del más reciente al más antiguo.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {registros.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
            📋
          </div>
          <h3 className="text-sm font-semibold text-slate-300">Aún no hay actividades registradas</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Utiliza el formulario superior para registrar tus horas y comenzar a monitorear tu progreso.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((registro) => (
            <div
              key={registro.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {registro.fecha}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    +{registro.horas} {registro.horas === 1 ? 'hora' : 'horas'}
                  </span>
                </div>
                <p className="text-sm text-slate-200 font-medium break-words">
                  {registro.actividad}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => onEditar(registro)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Editar
                </button>
                <button
                  onClick={() => onEliminar(registro.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/20 transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
