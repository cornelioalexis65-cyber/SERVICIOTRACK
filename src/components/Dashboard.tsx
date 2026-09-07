interface DashboardProps {
  totalHours: number
  horasRealizadas: number
  horasRestantes: number
  progreso: number
  diasRegistrados: number
  promedioHoras: number
  ultimaFecha: string
}

export function Dashboard({
  totalHours,
  horasRealizadas,
  horasRestantes,
  progreso,
  diasRegistrados,
  promedioHoras,
  ultimaFecha,
}: DashboardProps) {
  return (
    <>
      {/* RESUMEN PRINCIPAL */}
      <section className="summary">
        <div className="card">
          <span>Horas realizadas</span>
          <strong>{horasRealizadas}</strong>
          <small>de {totalHours} horas</small>
        </div>

        <div className="card">
          <span>Horas restantes</span>
          <strong>{horasRestantes}</strong>
          <small>horas</small>
        </div>
      </section>

      {/* RESUMEN ADICIONAL */}
      <section className="extra-summary">
        <div className="extra-card">
          <span>Días registrados</span>
          <strong>{diasRegistrados}</strong>
        </div>

        <div className="extra-card">
          <span>Promedio de horas</span>
          <strong>{promedioHoras.toFixed(1)} h</strong>
        </div>

        <div className="extra-card">
          <span>Último registro</span>
          <strong>{ultimaFecha}</strong>
        </div>
      </section>

      {/* PROGRESO */}
      <section className="progress-section">
        <div className="progress-info">
          <span>Progreso</span>
          <span>{progreso.toFixed(1)}%</span>
        </div>

        <div className="progress-bar">
          <div
            className="progress"
            style={{
              width: `${progreso}%`,
            }}
          />
        </div>
      </section>
    </>
  )
}
