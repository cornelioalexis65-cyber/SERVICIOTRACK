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

    // Crear ventana nueva limpia con CSS autocontenido (sin Tailwind)
    const ventana = window.open('', '_blank', 'width=900,height=700')
    if (!ventana) {
      alert('Por favor permite ventanas emergentes para imprimir el reporte.')
      return
    }

    const registrosHtml = registrosFiltrados.length === 0
      ? `<tr><td colspan="3" style="text-align:center;padding:16px;color:#6b7280;">Sin registros en el periodo seleccionado.</td></tr>`
      : registrosFiltrados
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map(r => `
            <tr>
              <td style="padding:7px 10px;font-family:monospace;color:#4b5563;border-bottom:1px solid #e5e7eb;">${r.fecha}</td>
              <td style="padding:7px 10px;color:#1f2937;border-bottom:1px solid #e5e7eb;">${r.actividad}</td>
              <td style="padding:7px 10px;text-align:right;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${r.horas} hrs</td>
            </tr>
          `).join('')

    const labelFiltro = tipoFiltro === 'todos'
      ? 'Todo el historial'
      : tipoFiltro === 'mes'
      ? 'Mes actual'
      : `Del ${fechaDesde || '—'} al ${fechaHasta || '—'}`

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Reporte de Servicio Social — ${perfil.nombre || 'Estudiante'}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm 16mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; background: white; color: #0f172a; margin: 0; padding: 0; font-size: 11px; line-height: 1.5; }

          /* Encabezado */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0 0 3px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; }
          .header p { margin: 0; font-size: 9.5px; font-weight: 600; color: #475569; }
          .header-meta { text-align: right; font-size: 9.5px; color: #64748b; }
          .header-meta b { color: #0f172a; }

          /* Ficha del estudiante */
          .ficha { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
          .ficha-campo span { display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.06em; margin-bottom: 2px; }
          .ficha-campo strong { font-size: 10.5px; color: #0f172a; }
          .ficha-campo.wide { grid-column: span 2; }

          /* Resumen del periodo */
          .resumen { display: flex; justify-content: space-between; align-items: center; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 7px; padding: 9px 14px; margin-bottom: 14px; }
          .resumen span { font-size: 10.5px; font-weight: 600; color: #312e81; }
          .resumen strong { font-size: 13px; font-weight: 900; color: #4338ca; }

          /* Etiqueta de periodo */
          .periodo-label { font-size: 9px; color: #64748b; margin-bottom: 8px; }

          /* Tabla */
          table { width: 100%; border-collapse: collapse; }
          thead tr { background: #f1f5f9; }
          th { padding: 7px 10px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.06em; border-bottom: 1.5px solid #cbd5e1; text-align: left; }
          th:last-child { text-align: right; }
          tbody tr { page-break-inside: avoid; }
          tbody tr:last-child td { border-bottom: 1px solid #cbd5e1; }

          /* Firmas */
          .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; text-align: center; }
          .firma-linea { border-top: 1.5px solid #0f172a; padding-top: 6px; font-weight: 700; font-size: 10.5px; color: #0f172a; }
          .firma-label { font-size: 9px; color: #64748b; margin-top: 3px; }

          /* Pie de página */
          .pie { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <!-- Encabezado Institucional -->
        <div class="header">
          <div>
            <h1>ServicioTrack</h1>
            <p>Reporte de Actividades y Control de Horas de Servicio Social</p>
          </div>
          <div class="header-meta">
            <div>Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}</div>
            <div><b>Folio: ST-${Date.now().toString().slice(-6)}</b></div>
          </div>
        </div>

        <!-- Ficha del Estudiante -->
        <div class="ficha">
          <div class="ficha-campo">
            <span>Estudiante</span>
            <strong>${perfil.nombre || 'No especificado'}</strong>
          </div>
          <div class="ficha-campo">
            <span>Matrícula</span>
            <strong>${perfil.matricula || 'N/A'}</strong>
          </div>
          <div class="ficha-campo">
            <span>Carrera</span>
            <strong>${perfil.carrera || 'N/A'}</strong>
          </div>
          <div class="ficha-campo wide">
            <span>Institución</span>
            <strong>${perfil.institucion || 'N/A'}</strong>
          </div>
          <div class="ficha-campo">
            <span>Progreso Global</span>
            <strong style="color:#4f46e5;">${horasTotalesGeneral} / ${totalHours} hrs (${porcentajeTotal.toFixed(1)}%)</strong>
          </div>
        </div>

        <!-- Resumen del Periodo -->
        <div class="resumen">
          <span>Horas acreditadas en este reporte:</span>
          <strong>+${horasPeriodo} horas (${registrosFiltrados.length} actividades)</strong>
        </div>

        <!-- Etiqueta de periodo -->
        <div class="periodo-label">Periodo: ${labelFiltro}</div>

        <!-- Tabla de Actividades -->
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Actividad Realizada</th>
              <th style="text-align:right;">Horas</th>
            </tr>
          </thead>
          <tbody>
            ${registrosHtml}
          </tbody>
        </table>

        <!-- Firmas de Autorización -->
        <div class="firmas">
          <div>
            <div class="firma-linea">${perfil.nombre || 'Firma del Prestador'}</div>
            <div class="firma-label">Firma del Alumno</div>
          </div>
          <div>
            <div class="firma-linea">Responsable de Servicio Social</div>
            <div class="firma-label">Sello y Firma Institucional</div>
          </div>
        </div>

        <!-- Pie de página -->
        <div class="pie">
          <span>Generado con ServicioTrack — github.io/SERVICIOTRACK</span>
          <span>Impreso el ${new Date().toLocaleString('es-MX')}</span>
        </div>
      </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print() }, 500)
  }

  return (
    /* Overlay: scrollable desde arriba en móvil */
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6">
      <div className="min-h-full flex items-start sm:items-center justify-center">
        <div className="w-full max-w-3xl my-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden">

          {/* ─── CABECERA DEL MODAL (sticky en móvil) ─── */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 pt-5 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Generador de Reporte Oficial</h3>
              <button
                onClick={onCerrar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selector de tipo de filtro — siempre visible */}
            <div className="flex flex-col gap-3">
              {/* Botones de filtro apilados en columna en móvil, fila en desktop */}
              <div className="grid grid-cols-3 sm:flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold gap-1 sm:gap-0">
                {(['todos', 'mes', 'rango'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoFiltro(tipo)}
                    className={`px-2 py-2 sm:px-3 rounded-lg transition-colors cursor-pointer text-center leading-tight ${
                      tipoFiltro === tipo ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tipo === 'todos' ? 'Todo' : tipo === 'mes' ? 'Este Mes' : 'Fechas'}
                  </button>
                ))}
              </div>

              {/* Inputs de rango de fechas */}
              {tipoFiltro === 'rango' && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="text-slate-400">Del</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                  />
                  <label className="text-slate-400">al</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                  />
                </div>
              )}

              {/* Botón imprimir */}
              <button
                onClick={handleImprimir}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95"
              >
                🖨️ Imprimir / Guardar PDF
              </button>
            </div>
          </div>

          {/* ─── VISTA PREVIA DEL REPORTE ─── */}
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div ref={contenidoRef} className="bg-white text-slate-900 p-5 sm:p-8 rounded-xl shadow-inner space-y-5 text-xs sm:text-sm min-w-[300px]">

              {/* Encabezado Institucional */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">ServicioTrack</h2>
                  <p className="text-xs font-semibold text-slate-600">Reporte de Actividades y Control de Horas de Servicio Social</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <p>Fecha de emisión: {new Date().toLocaleDateString('es-MX')}</p>
                  <p className="font-bold text-slate-800">Folio: ST-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>

              {/* Ficha del Estudiante */}
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
                      [...registrosFiltrados]
                        .sort((a, b) => a.fecha.localeCompare(b.fecha))
                        .map((r) => (
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
              <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
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
          </div>

          {/* Botón cerrar inferior */}
          <div className="px-5 pb-5 flex justify-end border-t border-slate-800 pt-4">
            <button
              onClick={onCerrar}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
