interface RegistroFormProps {
  fecha: string
  horas: string
  actividad: string
  registroEditando: number | null
  horasRestantes?: number
  onFechaChange: (value: string) => void
  onHorasChange: (value: string) => void
  onActividadChange: (value: string) => void
  onGuardar: () => void
  onCancelar: () => void
}

const PLANTILLAS_ACTIVIDAD = [
  'Soporte técnico y mantenimiento preventivo',
  'Instalación y configuración de software',
  'Digitalización y catalogación de archivos',
  'Atención a usuarios y soporte presencial',
  'Mantenimiento de redes y conectividad',
  'Elaboración de manuales y documentación',
]

export function RegistroForm({
  fecha,
  horas,
  actividad,
  registroEditando,
  horasRestantes,
  onFechaChange,
  onHorasChange,
  onActividadChange,
  onGuardar,
  onCancelar,
}: RegistroFormProps) {
  const esEdicion = registroEditando !== null
  const hoyStr = new Date().toLocaleDateString('en-CA')

  const seleccionarHoy = () => {
    onFechaChange(hoyStr)
  }

  const numHoras = Number(horas)
  const excedeRestantes =
    horasRestantes !== undefined &&
    numHoras > 0 &&
    !esEdicion &&
    numHoras > horasRestantes

  return (
    <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {esEdicion ? 'Editar Registro de Actividad' : 'Registrar Horas de Servicio'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {esEdicion
              ? 'Modifica los campos necesarios y guarda los cambios.'
              : 'Ingresa los detalles de tu actividad para acumular horas oficiales.'}
          </p>
        </div>

        {esEdicion && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Modo Edición
          </span>
        )}
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FECHA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Fecha de Actividad <span className="text-indigo-400">*</span>
              </label>
              <button
                type="button"
                onClick={seleccionarHoy}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Poner fecha de hoy
              </button>
            </div>
            <input
              type="date"
              max={hoyStr}
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* HORAS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Número de Horas <span className="text-indigo-400">*</span>
              </label>
              {horasRestantes !== undefined && (
                <span className="text-[11px] text-slate-400">
                  Pendientes:{' '}
                  <strong className="text-emerald-400 font-semibold">{horasRestantes} hrs</strong>
                </span>
              )}
            </div>
            <input
              type="number"
              min="1"
              max="24"
              placeholder="Ej. 4"
              value={horas}
              onChange={(e) => onHorasChange(e.target.value)}
              className={`w-full rounded-xl bg-slate-950/70 border px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors ${
                excedeRestantes
                  ? 'border-amber-500/60 focus:ring-amber-500/40'
                  : 'border-slate-700/80 focus:ring-indigo-500/40 focus:border-indigo-500'
              }`}
            />
            {excedeRestantes && (
              <span className="text-[11px] text-amber-400 block mt-1">
                ⚠️ El número de horas supera las {horasRestantes} horas restantes para tu meta.
              </span>
            )}
          </div>
        </div>

        {/* ACTIVIDAD */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Descripción de la Actividad <span className="text-indigo-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ej. Soporte y mantenimiento a servidores del laboratorio de cómputo..."
            value={actividad}
            onChange={(e) => onActividadChange(e.target.value)}
            className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors resize-none"
          />

          {/* Plantillas / Sugerencias rápidas */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Sugerencias rápidas:</span>
            {PLANTILLAS_ACTIVIDAD.map((plantilla) => (
              <button
                key={plantilla}
                type="button"
                onClick={() => onActividadChange(plantilla)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer text-left"
              >
                + {plantilla}
              </button>
            ))}
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onGuardar}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            {esEdicion ? 'Guardar Cambios' : '+ Agregar Registro'}
          </button>

          {esEdicion && (
            <button
              onClick={onCancelar}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
