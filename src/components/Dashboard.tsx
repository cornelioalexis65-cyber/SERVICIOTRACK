interface DashboardProps {
  totalHours: number
  horasRealizadas: number
  horasRestantes: number
  progreso: number
  diasRegistrados: number
  promedioHoras: number
  ultimaFecha: string
}

export function Dashboard({
  totalHours,
  horasRealizadas,
  horasRestantes,
  progreso,
  diasRegistrados,
  promedioHoras,
  ultimaFecha,
}: DashboardProps) {
  return (
    <section className="space-y-6">
      {/* TARJETAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Horas realizadas */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Horas Realizadas
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {progreso.toFixed(1)}% completado
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <strong className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              {horasRealizadas}
            </strong>
            <span className="text-slate-400 font-medium">/ {totalHours} hrs</span>
          </div>
        </div>

        {/* Horas restantes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Horas Restantes
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Objetivo
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <strong className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              {horasRestantes}
            </strong>
            <span className="text-slate-400 font-medium">horas pendientes</span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Días Registrados
          </span>
          <strong className="text-2xl font-bold text-white">
            {diasRegistrados} <span className="text-sm font-normal text-slate-400">días</span>
          </strong>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Promedio de Horas
          </span>
          <strong className="text-2xl font-bold text-white">
            {promedioHoras.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs/día</span>
          </strong>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Último Registro
          </span>
          <strong className="text-lg font-bold text-white truncate block">
            {ultimaFecha}
          </strong>
        </div>
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-300">Progreso Total</span>
          <span className="text-indigo-400 font-bold">{progreso.toFixed(1)}%</span>
        </div>

        <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium text-slate-500 pt-1">
          <span>0 hrs</span>
          <span>125 hrs (25%)</span>
          <span>250 hrs (50%)</span>
          <span>375 hrs (75%)</span>
          <span>500 hrs</span>
        </div>
      </div>
    </section>
  )
}
