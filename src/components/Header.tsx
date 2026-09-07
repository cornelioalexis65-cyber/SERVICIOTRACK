import type { PerfilEstudiante } from '../types/registro'

interface HeaderProps {
  perfil: PerfilEstudiante
  backendConectado?: boolean
  sincronizando?: boolean
  onReconectar?: () => void
  onAbrirPerfil: () => void
  onAbrirReporte: () => void
}

export function Header({
  perfil,
  backendConectado = false,
  sincronizando = false,
  onReconectar,
  onAbrirPerfil,
  onAbrirReporte,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800/80 pb-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-2xl">
          ST
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ServicioTrack
            </h1>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              v1.0
            </span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            {perfil.nombre ? `Prestador: ${perfil.nombre}` : 'Control y Gestión de Servicio Social'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
        {/* Botón de Perfil */}
        <button
          type="button"
          onClick={onAbrirPerfil}
          title="Editar información del estudiante"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          👤 Perfil
        </button>

        {/* Botón de Generar Reporte */}
        <button
          type="button"
          onClick={onAbrirReporte}
          title="Generar e imprimir reporte en PDF"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
        >
          📄 Reporte PDF
        </button>

        {/* Indicador de Estado del Servidor */}
        <button
          type="button"
          onClick={onReconectar}
          title={backendConectado ? 'Servidor conectado. Clic para sincronizar.' : 'Modo local offline. Clic para reintentar conexión.'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
            backendConectado
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              sincronizando
                ? 'bg-blue-400 animate-spin'
                : backendConectado
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          {sincronizando
            ? 'Sincronizando...'
            : backendConectado
            ? 'API Conectada'
            : 'Modo Offline'}
        </button>
      </div>
    </header>
  )
}
