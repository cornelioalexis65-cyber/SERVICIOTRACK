import { useState, useMemo } from 'react'
import type { Registro } from '../types/registro'

interface HistorialProps {
  registros: Registro[]
  onEditar: (registro: Registro) => void
  onEliminar: (id: number) => void
  onExportarCSV?: () => void
}

export function Historial({
  registros,
  onEditar,
  onEliminar,
  onExportarCSV,
}: HistorialProps) {
  const [busqueda, setBusqueda] = useState('')
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('todos')
  const [mostrarTodos, setMostrarTodos] = useState(false)

  // Obtener lista única de meses disponibles ordenados descendentemente
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>()
    registros.forEach((r) => {
      if (r.fecha && r.fecha.length >= 7) {
        meses.add(r.fecha.substring(0, 7))
      }
    })
    return Array.from(meses).sort((a, b) => b.localeCompare(a))
  }, [registros])

  // Filtrado reactivo por término y mes
  const registrosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      const coincideTexto =
        !query ||
        r.actividad.toLowerCase().includes(query) ||
        r.fecha.toLowerCase().includes(query)

      const coincideMes =
        mesSeleccionado === 'todos' || r.fecha.startsWith(mesSeleccionado)

      return coincideTexto && coincideMes
    })
  }, [registros, busqueda, mesSeleccionado])

  const horasFiltradas = useMemo(() => {
    return registrosFiltrados.reduce((acc, r) => acc + r.horas, 0)
  }, [registrosFiltrados])

  // Paginación visual suave
  const hayFiltrosActivos = busqueda.trim().length > 0 || mesSeleccionado !== 'todos'
  const registrosVisibles =
    mostrarTodos || hayFiltrosActivos
      ? registrosFiltrados
      : registrosFiltrados.slice(0, 5)

  const hayMas = !hayFiltrosActivos && registrosFiltrados.length > 5

  return (
    <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-5">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Historial de Actividades
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico con búsqueda rápida y exportación a Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportarCSV && registros.length > 0 && (
            <button
              type="button"
              onClick={onExportarCSV}
              title="Descargar historial en formato CSV compatible con Excel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      {registros.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por actividad o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Mes */}
          {mesesDisponibles.length > 1 && (
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="rounded-xl bg-slate-950/70 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Indicador de Filtros Activos */}
      {hayFiltrosActivos && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Mostrando <strong className="text-white">{registrosFiltrados.length}</strong> de{' '}
            {registros.length} registros ({horasFiltradas} horas sumadas)
          </span>
          <button
            type="button"
            onClick={() => {
              setBusqueda('')
              setMesSeleccionado('todos')
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Listado de Registros */}
      {registros.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
            📋
          </div>
          <h3 className="text-sm font-semibold text-slate-300">
            Aún no hay actividades registradas
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Utiliza el formulario superior para registrar tus horas y comenzar a monitorear tu progreso.
          </p>
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl bg-slate-950/30 border border-slate-800 text-xs text-slate-400">
          No se encontraron registros que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {registrosVisibles.map((registro) => (
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

          {hayMas && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setMostrarTodos(!mostrarTodos)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
              >
                <span>{mostrarTodos ? 'Ver menos' : `Ver todos (${registrosFiltrados.length})`}</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    mostrarTodos ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
