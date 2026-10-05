import { useState } from 'react'
import type { DocumentoServicio, TipoDocumento, EstadoDocumento, NuevoDocumentoData } from '../types/documento'
import { TIPO_DOCUMENTO_LABELS, TIPO_DOCUMENTO_ICONOS, getEstadoCalculado, formatearTamaño, esBimestral } from '../types/documento'

interface DocumentosPanelProps {
  documentos: DocumentoServicio[]
  cargando: boolean
  backendConectado: boolean
  sincronizando: boolean
  pendientes: number
  onSubirDocumento: (datos: NuevoDocumentoData) => Promise<{ exito: boolean; error?: string }>
  onActualizarDocumento: (id: number, datos: Partial<NuevoDocumentoData>) => Promise<{ exito: boolean; error?: string }>
  onEliminarDocumento: (id: number) => Promise<void>
  onCambiarEstado: (id: number, estado: EstadoDocumento) => Promise<{ exito: boolean; error?: string }>
  onDescargarDocumento: (id: number) => Promise<void>
  onSincronizar: () => void
  onNotificar: (mensaje: string, tipo: 'exito' | 'error' | 'info' | 'advertencia') => void
}

export function DocumentosPanel({
  documentos,
  cargando,
  backendConectado,
  sincronizando,
  pendientes,
  onSubirDocumento,
  onActualizarDocumento,
  onEliminarDocumento,
  onCambiarEstado,
  onDescargarDocumento,
  onSincronizar,
  onNotificar,
}: DocumentosPanelProps) {
  const [pestanaActiva, setPestanaActiva] = useState<'lista' | 'subir'>('lista')
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | 'todos'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumento | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  // Formulario de subida
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumento>('evaluacion_bimestral')
  const [periodo, setPeriodo] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [notas, setNotas] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const hoyStr = new Date().toISOString().split('T')[0]

  // Documentos filtrados
  const documentosFiltrados = documentos.filter(doc => {
    const coincideTipo = filtroTipo === 'todos' || doc.tipo === filtroTipo
    const estadoReal = getEstadoCalculado(doc)
    const coincideEstado = filtroEstado === 'todos' || estadoReal === filtroEstado
    const coincideBusqueda = !busqueda ||
      doc.nombreArchivo.toLowerCase().includes(busqueda.toLowerCase()) ||
      TIPO_DOCUMENTO_LABELS[doc.tipo].toLowerCase().includes(busqueda.toLowerCase()) ||
      (doc.periodo?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)
    return coincideTipo && coincideEstado && coincideBusqueda
  })

  const handleSubir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) {
      onNotificar('Selecciona un archivo', 'advertencia')
      return
    }
    if (!fechaLimite) {
      onNotificar('Indica una fecha límite', 'advertencia')
      return
    }
    if (esBimestral(tipoSeleccionado) && !periodo) {
      onNotificar('El periodo es obligatorio para evaluaciones y reportes bimestrales', 'advertencia')
      return
    }

    setSubiendo(true)
    try {
      const resultado = await onSubirDocumento({
        tipo: tipoSeleccionado,
        periodo: periodo || undefined,
        fechaLimite,
        archivo,
        notas: notas || undefined,
      })
      if (resultado.exito) {
        onNotificar('Documento subido correctamente', 'exito')
        setPestanaActiva('lista')
        setArchivo(null)
        setPeriodo('')
        setFechaLimite('')
        setNotas('')
        setTipoSeleccionado('evaluacion_bimestral')
      } else {
        onNotificar(resultado.error || 'Error al subir', 'error')
      }
    } finally {
      setSubiendo(false)
    }
  }

  const handleCambiarEstado = async (id: number, nuevoEstado: EstadoDocumento) => {
    const resultado = await onCambiarEstado(id, nuevoEstado)
    if (resultado.exito) {
      onNotificar(`Estado cambiado a ${nuevoEstado}`, 'exito')
    } else {
      onNotificar(resultado.error || 'Error al cambiar estado', 'error')
    }
  }

  const handleDescargar = async (id: number) => {
    try {
      await onDescargarDocumento(id)
      onNotificar('Descarga iniciada', 'exito')
    } catch (err: any) {
      onNotificar(err.message || 'Error al descargar', 'error')
    }
  }

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar este documento permanentemente?')) return
    await onEliminarDocumento(id)
    onNotificar('Documento eliminado', 'info')
  }

  const handleReemplazarArchivo = async (id: number, nuevoArchivo: File) => {
    const resultado = await onActualizarDocumento(id, { archivo: nuevoArchivo })
    if (resultado.exito) {
      onNotificar('Archivo reemplazado', 'exito')
    } else {
      onNotificar(resultado.error || 'Error al reemplazar', 'error')
    }
  }

  const getEstadoBadge = (estado: EstadoDocumento) => {
    switch (estado) {
      case 'entregado':
        return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: '✅ Entregado' }
      case 'vencido':
        return { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', label: '🔴 Vencido' }
      default:
        return { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: '🟡 Pendiente' }
    }
  }

  if (cargando) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Cargando documentos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header con pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Documentos del Servicio</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sube, organiza y descarga tus documentos Word/PDF. {pendientes > 0 && <span className="text-amber-400"> ({pendientes} pendientes de sincronizar)</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSincronizar}
            disabled={sincronizando || !backendConectado}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{sincronizando ? '⟳' : '☁'}</span>
            <span className="hidden sm:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setPestanaActiva('subir')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <span>📤</span>
            <span className="hidden sm:inline">Subir Documento</span>
          </button>
        </div>
      </div>

      {/* Pestaña: Subir Documento */}
      {pestanaActiva === 'subir' && (
        <form onSubmit={handleSubir} className="rounded-xl bg-slate-950/50 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">Nuevo Documento</h4>
            <button
              type="button"
              onClick={() => setPestanaActiva('lista')}
              className="p-1 text-slate-400 hover:text-white"
            >✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Documento *</label>
              <select
                value={tipoSeleccionado}
                onChange={e => setTipoSeleccionado(e.target.value as TipoDocumento)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {TIPO_DOCUMENTO_ICONOS[value as TipoDocumento]} {label}
                  </option>
                ))}
              </select>
            </div>

            {esBimestral(tipoSeleccionado) && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Periodo *</label>
                <input
                  type="text"
                  placeholder="Ej. 2026-01, 2026-03"
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  pattern="\\d{4}-\\d{2}"
                  title="Formato: YYYY-MM"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Archivo (Word .docx/.doc o PDF) *</label>
              <input
                type="file"
                accept=".doc,.docx,.pdf"
                onChange={e => setArchivo(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                required
              />
              {archivo && (
                <p className="text-xs text-slate-400 mt-1">
                  {archivo.name} • {formatearTamaño(archivo.size)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fecha Límite *</label>
              <input
                type="date"
                min={hoyStr}
                value={fechaLimite}
                onChange={e => setFechaLimite(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notas</label>
              <textarea
                rows={2}
                placeholder="Observaciones opcionales..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPestanaActiva('lista')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              {subiendo ? 'Subiendo...' : 'Subir Documento'}
            </button>
          </div>
        </form>
      )}

      {/* Pestaña: Lista de Documentos */}
      {pestanaActiva === 'lista' && (
        <>
          {/* Filtros y búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nombre, tipo o periodo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white text-xs"
                >✕</button>
              )}
            </div>

            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value as TipoDocumento | 'todos')}
              className="rounded-xl bg-slate-950/70 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[160px]"
            >
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {TIPO_DOCUMENTO_ICONOS[value as TipoDocumento]} {label}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as EstadoDocumento | 'todos')}
              className="rounded-xl bg-slate-950/70 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[140px]"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">🟡 Pendiente</option>
              <option value="entregado">✅ Entregado</option>
              <option value="vencido">🔴 Vencido</option>
            </select>
          </div>

          {/* Indicador de filtros activos */}
          {(filtroTipo !== 'todos' || filtroEstado !== 'todos' || busqueda) && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Mostrando <strong className="text-white">{documentosFiltrados.length}</strong> de {documentos.length} documentos
              </span>
              <button
                type="button"
                onClick={() => { setFiltroTipo('todos'); setFiltroEstado('todos'); setBusqueda('') }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Lista vacía */}
          {documentos.length === 0 && (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 text-2xl">📄</div>
              <h3 className="text-sm font-semibold text-slate-300">No hay documentos aún</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Usa el botón "Subir Documento" para agregar tus cartas, evaluaciones y reportes.
              </p>
            </div>
          )}

          {documentos.length > 0 && documentosFiltrados.length === 0 && (
            <div className="text-center py-8 px-4 rounded-xl bg-slate-950/30 border border-slate-800 text-xs text-slate-400">
              No se encontraron documentos que coincidan con la búsqueda.
            </div>
          )}

          {/* Tabla de documentos */}
          {documentosFiltrados.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="p-3">Documento</th>
                    <th className="p-3 hidden md:table-cell">Periodo</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 hidden sm:table-cell">Límite</th>
                    <th className="p-3 text-right">Tamaño</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {documentosFiltrados.map(doc => {
                    const estadoReal = getEstadoCalculado(doc)
                    const badge = getEstadoBadge(estadoReal)
                    const icono = TIPO_DOCUMENTO_ICONOS[doc.tipo]
                    const label = TIPO_DOCUMENTO_LABELS[doc.tipo]
                    return (
                      <tr key={doc.id} className="hover:bg-slate-950/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-slate-800 border border-slate-700">
                              {icono}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-white truncate max-w-xs">{doc.nombreArchivo}</p>
                              <p className="text-[10px] text-slate-500">{label}{doc.periodo ? ` • ${doc.periodo}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell text-xs text-slate-400 font-mono">
                          {doc.periodo || '—'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3 hidden sm:table-cell text-xs text-slate-400 font-mono">
                          {doc.fechaLimite}
                        </td>
                        <td className="p-3 text-right text-xs text-slate-400 font-mono">
                          {formatearTamaño(doc.tamaño)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDescargar(doc.id)}
                              title="Descargar"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >⬇</button>
                            {doc.estado !== 'entregado' && (
                              <button
                                onClick={() => handleCambiarEstado(doc.id, 'entregado')}
                                title="Marcar como entregado"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-colors cursor-pointer"
                              >✓</button>
                            )}
                            <input
                              type="file"
                              accept=".doc,.docx,.pdf"
                              onChange={e => e.target.files?.[0] && handleReemplazarArchivo(doc.id, e.target.files[0])}
                              className="hidden"
                              id={`replace-${doc.id}`}
                            />
                            <label
                              htmlFor={`replace-${doc.id}`}
                              title="Reemplazar archivo"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >🔄</label>
                            <button
                              onClick={() => handleEliminar(doc.id)}
                              title="Eliminar"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                            >🗑</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumen por tipo */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800">
            {Object.entries(TIPO_DOCUMENTO_LABELS).map(([tipo, label]) => {
              const docsTipo = documentos.filter(d => d.tipo === tipo)
              const pendientesTipo = docsTipo.filter(d => getEstadoCalculado(d) === 'pendiente').length
              const entregadosTipo = docsTipo.filter(d => getEstadoCalculado(d) === 'entregado').length
              const vencidosTipo = docsTipo.filter(d => getEstadoCalculado(d) === 'vencido').length

              return (
                <div key={tipo} className="rounded-xl bg-slate-950/50 border border-slate-800 p-3 text-center">
                  <div className="text-lg mb-1">{TIPO_DOCUMENTO_ICONOS[tipo as TipoDocumento]}</div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <div className="flex items-center justify-center gap-2 mt-1 text-[10px]">
                    <span className="text-emerald-400">✅ {entregadosTipo}</span>
                    <span className="text-amber-400">🟡 {pendientesTipo}</span>
                    <span className="text-rose-400">🔴 {vencidosTipo}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}