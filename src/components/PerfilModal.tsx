import { useState } from 'react'
import type { PerfilEstudiante } from '../types/registro'

interface PerfilModalProps {
  perfil: PerfilEstudiante
  abierto: boolean
  onCerrar: () => void
  onGuardar: (nuevoPerfil: PerfilEstudiante) => void
}

export function PerfilModal({
  perfil,
  abierto,
  onCerrar,
  onGuardar,
}: PerfilModalProps) {
  const [formData, setFormData] = useState<PerfilEstudiante>(perfil)

  if (!abierto) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar(formData)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Perfil del Estudiante</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personaliza tus datos institucionales para reportes y alertas.
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Matrícula / ID
              </label>
              <input
                type="text"
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                onChange={(e) => setFormData({ ...formData, horasObjetivo: Number(e.target.value) })}
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
      </div>
    </div>
  )
}
