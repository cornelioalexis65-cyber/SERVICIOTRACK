export function Header() {
  return (
    <header className="border-b border-slate-800/80 pb-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-2xl">
          ST
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ServicioTrack
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Control y Gestión de Servicio Social
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Meta: 500 Horas
        </span>
      </div>
    </header>
  )
}
