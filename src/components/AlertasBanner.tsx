interface AlertasBannerProps {
  horasRealizadas: number
  horasRestantes: number
  totalHours: number
  diasRestantesLimite: number | null
  ritmoRecomendado: number | null
}

export function AlertasBanner({
  horasRealizadas,
  horasRestantes,
  totalHours,
  diasRestantesLimite,
  ritmoRecomendado,
}: AlertasBannerProps) {
  const completado = horasRealizadas >= totalHours

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
            {diasRestantesLimite !== null && diasRestantesLimite > 0 ? (
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
              'Configura tus fechas de inicio y límite en tu perfil para calcular tu ritmo.'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
