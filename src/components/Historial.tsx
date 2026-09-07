import type { Registro } from '../types/registro'

interface HistorialProps {
  registros: Registro[]
  onEditar: (registro: Registro) => void
  onEliminar: (id: number) => void
}

export function Historial({
  registros,
  onEditar,
  onEliminar,
}: HistorialProps) {
  return (
    <section className="history">
      <h2>Historial</h2>

      {registros.length === 0 ? (
        <p>Aún no hay registros.</p>
      ) : (
        registros.map((registro) => (
          <div className="record" key={registro.id}>
            <div className="record-info">
              <strong>{registro.fecha}</strong>
              <span>{registro.actividad}</span>
              <small>{registro.horas} horas</small>
            </div>

            <div className="record-actions">
              <button
                className="edit-button"
                onClick={() => onEditar(registro)}
              >
                Editar
              </button>

              <button
                className="delete-button"
                onClick={() => onEliminar(registro.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  )
}
