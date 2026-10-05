import type { DocumentoServicio } from '../types/documento'
import { getEstadoCalculado } from '../types/documento'

interface AlertasBannerProps {
  horasRealizadas: number
  horasRestantes: number
  totalHours: number
  diasRestantesLimite: number | null
  ritmoRecomendado: number | null
  documentos?: DocumentoServicio[]
}

export function AlertasBanner({
  horasRealizadas,
  horasRestantes,
  totalHours,
  diasRestantesLimite,
  ritmoRecomendado,
  documentos = [],
}: AlertasBannerProps) {
  const completado = horasRealizadas >= totalHours

  // Documentos próximos a vencer (15 días)
  const proximosVencimientos = documentos
    .filter(d => getEstadoCalculado(d) === 'pendiente') // Usar estado calculado en lugar de d.estado
    .filter(d => {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const limite = new Date(d.fechaLimite + 'T00:00:00')
      const diffDias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias >= 0 && diffDias <= 15
    })
    .sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())

  const vencidos = documentos.filter(d => getEstadoCalculado(d) === 'vencido')

  if (completado) {
    return (
      <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-4 sm:p-5 flex items-center gap-4 text-emerald-200">
        <div className="text-3xl">🎉</div>
        <div>
          <h3 className="font-bold text-base text-emerald-300">¡Felicidades! Has completado tus {totalHours} horas</h3>
          <p className="text-xs text-emerald-400/80 mt-0.5">
            Has cubierto el 100% de tu servicio social. Puedes generar y descargar tu reporte oficial para entrega.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-lg">
          💡
        </span>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            {horasRestantes === totalHours
              ? `Comienza tu registro para alcanzar las ${totalHours} horas requeridas.`
              : `Te faltan ${horasRestantes} horas para completar tu servicio social.`}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {diasRestantesLimite === null ? (
              'Configura tus fechas de inicio y límite en tu perfil para calcular tu ritmo.'
            ) : diasRestantesLimite > 0 ? (
              <>
                Quedan <strong className="text-indigo-300">{diasRestantesLimite} días</strong> para tu fecha límite.{' '}
                {ritmoRecomendado ? (
                  <span>
                    Ritmo sugerido: <strong className="text-emerald-400">{ritmoRecomendado} hrs/día</strong>.
                  </span>
                ) : null}
              </>
            ) : diasRestantesLimite === 0 ? (
              <span className="text-amber-400">⚠️ Hoy es la fecha límite configurada.</span>
            ) : (
              <span className="text-rose-400">
                🚨 Tu fecha límite venció hace {Math.abs(diasRestantesLimite)}{' '}
                {Math.abs(diasRestantesLimite) === 1 ? 'día' : 'días'}. Revisa tu plan de horas.
              </span>
            )}
          </p>

          {/* Alertas de documentos */}
          {(proximosVencimientos.length > 0 || vencidos.length > 0) && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 space-y-1.5">
              {proximosVencimientos.map(doc => (
                <p key={doc.id} className="text-xs text-amber-400 flex items-center gap-1">
                  <span>📄</span>
                  <span>
                    <strong>{TIPO_DOCUMENTO_LABELS[doc.tipo]}</strong>{doc.periodo ? ` (${doc.periodo})` : ''} vence en{' '}
                    {(() => {
                      const hoy = new Date()
                      hoy.setHours(0, 0, 0, 0)
                      const limite = new Date(doc.fechaLimite + 'T00:00:00')
                      const diff = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                      return diff === 0 ? 'hoy' : `${diff} día${diff === 1 ? '' : 's'}`
                    })()}
                  </span>
                </p>
              ))}
              {vencidos.map(doc => (
                <p key={doc.id} className="text-xs text-rose-400 flex items-center gap-1">
                  <span>🚨</span>
                  <span>
                    <strong>{TIPO_DOCUMENTO_LABELS[doc.tipo]}</strong>{doc.periodo ? ` (${doc.periodo})` : ''} vencido
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Importar labels aquí para evitar dependencia circular
const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  carta_presentacion: 'Carta de Presentación',
  carta_aceptacion: 'Carta de Aceptación',
  evaluacion_bimestral: 'Evaluación Bimestral',
  reporte_bimestral: 'Reporte Bimestral',
  otro: 'Otro',
}
