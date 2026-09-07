interface RegistroFormProps {
  fecha: string
  horas: string
  actividad: string
  registroEditando: number | null
  onFechaChange: (value: string) => void
  onHorasChange: (value: string) => void
  onActividadChange: (value: string) => void
  onGuardar: () => void
  onCancelar: () => void
}

export function RegistroForm({
  fecha,
  horas,
  actividad,
  registroEditando,
  onFechaChange,
  onHorasChange,
  onActividadChange,
  onGuardar,
  onCancelar,
}: RegistroFormProps) {
  const esEdicion = registroEditando !== null

  return (
    <section className="register">
      <h2>{esEdicion ? 'Editar registro' : 'Registrar horas'}</h2>

      <div className="form">
        {/* FECHA */}
        <label>
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => onFechaChange(e.target.value)}
          />
        </label>

        {/* HORAS */}
        <label>
          Horas
          <input
            type="number"
            min="1"
            max="24"
            placeholder="Ej. 5"
            value={horas}
            onChange={(e) => onHorasChange(e.target.value)}
          />
        </label>

        {/* ACTIVIDAD */}
        <label>
          Actividad realizada
          <textarea
            placeholder="Describe la actividad realizada..."
            value={actividad}
            onChange={(e) => onActividadChange(e.target.value)}
          />
        </label>

        {/* BOTONES */}
        <div className="form-buttons">
          <button onClick={onGuardar}>
            {esEdicion ? 'Guardar cambios' : '+ Registrar horas'}
          </button>

          {esEdicion && (
            <button className="cancel-button" onClick={onCancelar}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
