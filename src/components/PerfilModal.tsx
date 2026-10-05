import { useState, useRef } from 'react'
import type { PerfilEstudiante, Registro } from '../types/registro'
import type { DocumentoServicio } from '../types/documento'
import { exportarCSV, exportarJSON, parsearBackupJSON } from '../utils/exportUtils'
import { DocumentosPanel } from './DocumentosPanel'

interface PerfilModalProps {
  perfil: PerfilEstudiante
  registros: Registro[]
  documentos: DocumentoServicio[]
  abierto: boolean
  onCerrar: () => void
  onGuardar: (nuevoPerfil: PerfilEstudiante) => void
  onRestaurarBackup: (nuevosRegistros: Registro[], nuevoPerfil?: PerfilEstudiante) => void
  onNotificar?: (mensaje: string, tipo: 'exito' | 'error' | 'info' | 'advertencia') => void
  // Documentos
  documentosCargando?: boolean
  documentosBackendConectado?: boolean
  documentosSincronizando?: boolean
  documentosPendientes?: number
  onSubirDocumento?: (datos: any) => Promise<{ exito: boolean; error?: string }>
  onActualizarDocumento?: (id: number, datos: any) => Promise<{ exito: boolean; error?: string }>
  onEliminarDocumento?: (id: number) => Promise<void>
  onCambiarEstadoDocumento?: (id: number, estado: any) => Promise<{ exito: boolean; error?: string }>
  onDescargarDocumento?: (id: number) => Promise<void>
  onSincronizarDocumentos?: () => void
}

export function PerfilModal({
  perfil,
  registros,
  documentos,
  abierto,
  onCerrar,
  onGuardar,
  onRestaurarBackup,
  onNotificar,
  // Documentos
  documentosCargando = false,
  documentosBackendConectado = false,
  documentosSincronizando = false,
  documentosPendientes = 0,
  onSubirDocumento,
  onActualizarDocumento,
  onEliminarDocumento,
  onCambiarEstadoDocumento,
  onDescargarDocumento,
  onSincronizarDocumentos,
}: PerfilModalProps) {
  const [pestanaActiva, setPestanaActiva] = useState<'perfil' | 'respaldo' | 'documentos'>('perfil')
  const [formData, setFormData] = useState<PerfilEstudiante>(perfil)
  const [prevPerfil, setPrevPerfil] = useState(perfil)

  // Ajuste de estado durante el render si cambia la prop perfil (patrón oficial de React)
  if (perfil !== prevPerfil) {
    setPrevPerfil(perfil)
    setFormData(perfil)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!abierto) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar(formData)
    onNotificar?.('Perfil actualizado correctamente', 'exito')
    onCerrar()
  }

  const handleExportarCSV = () => {
    exportarCSV(registros, perfil)
    onNotificar?.('Reporte CSV descargado con éxito', 'exito')
  }

  const handleExportarJSON = () => {
    exportarJSON(registros, perfil)
    onNotificar?.('Copia de seguridad JSON descargada', 'exito')
  }

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      const contenido = evento.target?.result as string
      const resultado = parsearBackupJSON(contenido)

      if (!resultado.valido || !resultado.datos) {
        onNotificar?.(resultado.error || 'Archivo inválido', 'error')
        return
      }

      const totalNuevos = resultado.datos.registros.length
      onRestaurarBackup(resultado.datos.registros, resultado.datos.perfil)
      onNotificar?.(
        `Se restauraron ${totalNuevos} actividades y la configuración del perfil`,
        'exito'
      )
      onCerrar()
    }

    reader.onerror = () => {
      onNotificar?.('Error al leer el archivo seleccionado', 'error')
    }

    reader.readAsText(file)
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo si se desea
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Cabecera y Selector de Pestañas */}
        <div className="space-y-4 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Configuración y Respaldo
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestiona tus datos institucionales y copias de seguridad de horas.
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setPestanaActiva('perfil')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                pestanaActiva === 'perfil'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Datos del Estudiante
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('documentos')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                pestanaActiva === 'documentos'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Documentos
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('respaldo')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                pestanaActiva === 'respaldo'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💾 Copia de Seguridad
            </button>
          </div>
        </div>

        {pestanaActiva === 'perfil' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alexis Cornelio"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Matrícula / ID
                </label>
                <input
                  type="text"
                  placeholder="Ej. 2026-ST-001"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Programa de Servicio Social
                </label>
                <input
                  type="text"
                  placeholder="Ej. Soporte Técnico e Infraestructura"
                  value={formData.programa || ''}
                  onChange={(e) => setFormData({ ...formData, programa: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Supervisor / Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ing. Juan Pérez López"
                  value={formData.supervisor || ''}
                  onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Carrera
                </label>
                <input
                  type="text"
                  value={formData.carrera}
                  onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institución / Escuela
                </label>
                <input
                  type="text"
                  value={formData.institucion}
                  onChange={(e) => setFormData({ ...formData, institucion: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fecha Límite
                </label>
                <input
                  type="date"
                  value={formData.fechaLimite}
                  onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Horas Meta
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.horasObjetivo}
                  onChange={(e) =>
                    setFormData({ ...formData, horasObjetivo: Number(e.target.value) })
                  }
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Guardar Perfil
              </button>
            </div>
          </form>
        ) : pestanaActiva === 'documentos' ? (
          <DocumentosPanel
            documentos={documentos}
            cargando={documentosCargando}
            backendConectado={documentosBackendConectado}
            sincronizando={documentosSincronizando}
            pendientes={documentosPendientes}
            onSubirDocumento={onSubirDocumento!}
            onActualizarDocumento={onActualizarDocumento!}
            onEliminarDocumento={onEliminarDocumento!}
            onCambiarEstado={onCambiarEstadoDocumento!}
            onDescargarDocumento={onDescargarDocumento!}
            onSincronizar={onSincronizarDocumentos!}
            onNotificar={onNotificar!}
          />
        ) : (
          /* Pestaña de Respaldo y Exportación */
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resumen de Datos Actuales
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block">Registros</span>
                  <strong className="text-white text-sm">{registros.length} actividades</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Horas Acumuladas</span>
                  <strong className="text-emerald-400 text-sm">
                    {registros.reduce((acc, r) => acc + r.horas, 0)} hrs
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Meta Oficial</span>
                  <strong className="text-indigo-400 text-sm">{formData.horasObjetivo || 500} hrs</strong>
                </div>
              </div>
            </div>

            {/* Opciones de Exportación */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Exportar Datos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportarCSV}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20 shrink-0">
                    📊
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Exportar a Excel (CSV)
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      Compatible con Excel y Google Sheets con acumulados.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportarJSON}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg border border-indigo-500/20 shrink-0">
                    💾
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                      Copia Completa (JSON)
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      Respaldo total de perfil y horas para migrar o guardar.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Opción de Restauración */}
            <div className="pt-2 space-y-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Restaurar Respaldo
              </h4>
              <p className="text-xs text-slate-400">
                Sube un archivo <code className="text-indigo-300">.json</code> generado previamente por
                ServicioTrack para recuperar tus actividades en este dispositivo.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleSeleccionarArchivo}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-md"
              >
                <span>📂</span>
                <span>Seleccionar Archivo de Respaldo (.json)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
