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
    <header className="border-b border-slate-800/80 pb-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Logo + Título */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
            ST
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent truncate">
                ServicioTrack
              </h1>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">
              {perfil.nombre ? `Prestador: ${perfil.nombre}` : 'Control de Servicio Social'}
            </p>
          </div>
        </div>

        {/* Botones de acción - siempre visibles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Perfil */}
          <button
            type="button"
            onClick={onAbrirPerfil}
            title="Editar información del estudiante"
            id="btn-abrir-perfil"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors cursor-pointer active:scale-95"
          >
            <span className="text-base">👤</span>
            <span className="hidden sm:inline">Perfil</span>
          </button>

          {/* Reporte PDF */}
          <button
            type="button"
            onClick={onAbrirReporte}
            title="Generar e imprimir reporte en PDF"
            id="btn-abrir-reporte"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer active:scale-95"
          >
            <span className="text-base">📄</span>
            <span className="hidden sm:inline">Reporte PDF</span>
          </button>

          {/* Indicador de estado del servidor - solo icono en móvil */}
          <button
            type="button"
            onClick={onReconectar}
            title={backendConectado ? 'Servidor conectado. Clic para sincronizar.' : 'Modo offline. Clic para reintentar.'}
            id="btn-estado-servidor"
            className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer active:scale-95 ${
              backendConectado
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                sincronizando
                  ? 'bg-blue-400 animate-ping'
                  : backendConectado
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {sincronizando ? 'Sincronizando...' : backendConectado ? 'API Conectada' : 'Modo Offline'}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de acciones rápidas en móvil (etiquetas visibles) */}
      <div className="flex sm:hidden items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-800/60">
        <span className="text-xs text-slate-500 mr-auto">
          {sincronizando ? '⟳ Sincronizando...' : backendConectado ? '🟢 Online' : '🟡 Offline'}
        </span>
        <button
          type="button"
          onClick={onAbrirPerfil}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Editar Perfil
        </button>
        <span className="text-slate-700">|</span>
        <button
          type="button"
          onClick={onAbrirReporte}
          className="text-xs text-indigo-400 hover:text-indigo-200 font-semibold transition-colors"
        >
          Generar Reporte PDF
        </button>
      </div>
    </header>
  )
}
