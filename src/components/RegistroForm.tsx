interface RegistroFormProps {
  fecha: string
  horas: string
  actividad: string
  registroEditando: number | null
  onFechaChange: (value: string) => void
  onHorasChange: (value: string) => void
  onActividadChange: (value: string) => void
  onGuardar: () => void
  onCancelar: () => void
}

export function RegistroForm({
  fecha,
  horas,
  actividad,
  registroEditando,
  onFechaChange,
  onHorasChange,
  onActividadChange,
  onGuardar,
  onCancelar,
}: RegistroFormProps) {
  const esEdicion = registroEditando !== null
  const hoyStr = new Date().toLocaleDateString('en-CA')

  return (
    <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            {esEdicion ? 'Editar Registro de Actividad' : 'Registrar Horas de Servicio'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {esEdicion
              ? 'Modifica los campos necesarios y guarda los cambios.'
              : 'Ingresa los detalles de tu actividad para acumular horas.'}
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Fecha de Actividad <span className="text-indigo-400">*</span>
            </label>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Número de Horas <span className="text-indigo-400">*</span>
              <span className="text-[11px] lowercase text-slate-500 ml-1">(1 a 24 hrs)</span>
            </label>
            <input
              type="number"
              min="1"
              max="24"
              placeholder="Ej. 4"
              value={horas}
              onChange={(e) => onHorasChange(e.target.value)}
              className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* ACTIVIDAD */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Descripción de la Actividad <span className="text-indigo-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ej. Soporte y mantenimiento a servidores del laboratorio..."
            value={actividad}
            onChange={(e) => onActividadChange(e.target.value)}
            className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors resize-none"
          />
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
