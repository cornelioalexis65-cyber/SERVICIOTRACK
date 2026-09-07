import { useState, useMemo, useRef } from 'react'
import type { Registro, PerfilEstudiante } from '../types/registro'

interface ReporteModalProps {
  perfil: PerfilEstudiante
  registros: Registro[]
  totalHours: number
  abierto: boolean
  onCerrar: () => void
}

export function ReporteModal({
  perfil,
  registros,
  totalHours,
  abierto,
  onCerrar,
}: ReporteModalProps) {
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'mes' | 'rango'>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const registrosFiltrados = useMemo(() => {
    if (tipoFiltro === 'todos') {
      return registros
    }

    if (tipoFiltro === 'mes') {
      const hoy = new Date()
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
      return registros.filter((r) => r.fecha.startsWith(mesActual))
    }

    if (tipoFiltro === 'rango') {
      return registros.filter((r) => {
        const mayorQueInicio = !fechaDesde || r.fecha >= fechaDesde
        const menorQueFin = !fechaHasta || r.fecha <= fechaHasta
        return mayorQueInicio && menorQueFin
      })
    }

    return registros
  }, [registros, tipoFiltro, fechaDesde, fechaHasta])

  const horasPeriodo = registrosFiltrados.reduce((total, r) => total + r.horas, 0)
  const horasTotalesGeneral = registros.reduce((total, r) => total + r.horas, 0)
  const porcentajeTotal = Math.min((horasTotalesGeneral / totalHours) * 100, 100)

  const contenidoRef = useRef<HTMLDivElement>(null)

  if (!abierto) return null

  const handleImprimir = () => {
    const contenido = contenidoRef.current
    if (!contenido) return

    // Abrir ventana limpia solo con el reporte y fondo blanco
    const ventana = window.open('', '_blank', 'width=900,height=700')
    if (!ventana) {
      window.print()
      return
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Reporte ServicioTrack</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: system-ui, sans-serif; background: white; color: black; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 9px; color: #475569; }
          tr { page-break-inside: avoid; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .gap-3 { gap: 10px; }
          .gap-12 { gap: 40px; }
          h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .text-indigo-600 { color: #4f46e5; }
        </style>
      </head>
      <body>${contenido.innerHTML}</body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => {
      ventana.print()
      ventana.close()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
        
        {/* Controles de filtro (No imprimibles) */}
        <div className="print:hidden space-y-4 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Generador de Reporte Oficial</h3>
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTipoFiltro('todos')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  tipoFiltro === 'todos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todo el Historial
              </button>
              <button
                type="button"
                onClick={() => setTipoFiltro('mes')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  tipoFiltro === 'mes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setTipoFiltro('rango')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  tipoFiltro === 'rango' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Personalizado
              </button>
            </div>

            {tipoFiltro === 'rango' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-white"
                />
                <span className="text-slate-500">hasta</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-white"
                />
              </div>
            )}

            <button
              onClick={handleImprimir}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL REPORTE IMPRIMIBLE */}
        <div ref={contenidoRef} className="bg-white text-slate-900 p-6 sm:p-10 rounded-xl shadow-inner space-y-6 text-xs sm:text-sm">
          {/* Encabezado Institucional */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                ServicioTrack
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Reporte de Actividades y Control de Horas de Servicio Social
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>Fecha de emisión: {new Date().toLocaleDateString('es-MX')}</p>
              <p className="font-bold text-slate-800">Folio: ST-{Date.now().toString().slice(-6)}</p>
            </div>
          </div>

          {/* Ficha de Información del Estudiante */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Estudiante</span>
              <strong className="text-slate-900">{perfil.nombre || 'No especificado'}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Matrícula</span>
              <strong className="text-slate-900">{perfil.matricula || 'N/A'}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Carrera</span>
              <strong className="text-slate-900">{perfil.carrera || 'N/A'}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Institución</span>
              <strong className="text-slate-900">{perfil.institucion || 'N/A'}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Progreso Global</span>
              <strong className="text-indigo-600 font-bold">{horasTotalesGeneral} / {totalHours} hrs ({porcentajeTotal.toFixed(1)}%)</strong>
            </div>
          </div>

          {/* Resumen del Periodo */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-950 font-semibold text-xs">
            <span>Horas acreditadas en este reporte:</span>
            <strong className="text-sm font-bold text-indigo-700">+{horasPeriodo} horas ({registrosFiltrados.length} actividades)</strong>
          </div>

          {/* Tabla de Actividades */}
          <div className="overflow-hidden border border-slate-300 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[10px] font-bold">
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Actividad Realizada</th>
                  <th className="p-2.5 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500">
                      No hay registros en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">{r.fecha}</td>
                      <td className="p-2.5 text-slate-800">{r.actividad}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{r.horas} hrs</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Firmas de Autorización */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
            <div>
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-800">
                {perfil.nombre || 'Firma del Prestador'}
              </div>
              <p className="text-[10px] text-slate-500">Firma del Alumno</p>
            </div>
            <div>
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-800">
                Responsable de Servicio Social
              </div>
              <p className="text-[10px] text-slate-500">Sello y Firma Institucional</p>
            </div>
          </div>
        </div>

        {/* Pie de modal (No imprimible) */}
        <div className="print:hidden flex justify-end">
          <button
            onClick={onCerrar}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
