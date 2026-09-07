import { useState } from 'react'
import './App.css'
import type { Registro } from './types/registro'
import { useRegistros } from './hooks/useRegistros'

function App() {
  const {
    registros,
    registrosOrdenados,
    totalHours,
    horasRealizadas,
    horasRestantes,
    progreso,
    diasRegistrados,
    promedioHoras,
    ultimaFecha,
    agregarRegistro,
    actualizarRegistro,
    eliminarRegistro,
  } = useRegistros()

  // Estado del Formulario
  const [fecha, setFecha] = useState('')
  const [horas, setHoras] = useState('')
  const [actividad, setActividad] = useState('')
  const [registroEditando, setRegistroEditando] = useState<number | null>(null)

  // Limpiar formulario
  const limpiarFormulario = () => {
    setFecha('')
    setHoras('')
    setActividad('')
    setRegistroEditando(null)
  }

  // Guardar o editar registro
  const guardarRegistro = () => {
    const datos = {
      fecha,
      horas: Number(horas),
      actividad,
    }

    const resultado =
      registroEditando !== null
        ? actualizarRegistro(registroEditando, datos)
        : agregarRegistro(datos)

    if (!resultado.exito) {
      alert(resultado.error)
      return
    }

    limpiarFormulario()
  }

  // Cargar registro para edición
  const editarRegistro = (registro: Registro) => {
    setFecha(registro.fecha)
    setHoras(String(registro.horas))
    setActividad(registro.actividad)
    setRegistroEditando(registro.id)
  }

  // Eliminar registro con confirmación
  const confirmarEliminar = (id: number) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar este registro?'
    )

    if (!confirmar) return

    eliminarRegistro(id)

    if (registroEditando === id) {
      limpiarFormulario()
    }
  }

  return (
    <main className="app">

      {/* ENCABEZADO */}
      <header className="header">
        <h1>ServicioTrack</h1>
        <p>Control de Servicio Social</p>
      </header>

      {/* RESUMEN PRINCIPAL */}
      <section className="summary">

        <div className="card">
          <span>Horas realizadas</span>

          <strong>
            {horasRealizadas}
          </strong>

          <small>
            de {totalHours} horas
          </small>
        </div>

        <div className="card">
          <span>Horas restantes</span>

          <strong>
            {horasRestantes}
          </strong>

          <small>
            horas
          </small>
        </div>

      </section>

      {/* RESUMEN ADICIONAL */}
      <section className="extra-summary">

        <div className="extra-card">
          <span>Días registrados</span>

          <strong>
            {diasRegistrados}
          </strong>
        </div>

        <div className="extra-card">
          <span>Promedio de horas</span>

          <strong>
            {promedioHoras.toFixed(1)} h
          </strong>
        </div>

        <div className="extra-card">
          <span>Último registro</span>

          <strong>
            {ultimaFecha}
          </strong>
        </div>

      </section>

      {/* PROGRESO */}
      <section className="progress-section">

        <div className="progress-info">
          <span>Progreso</span>

          <span>
            {progreso.toFixed(1)}%
          </span>
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

      {/* FORMULARIO */}
      <section className="register">

        <h2>
          {registroEditando !== null
            ? 'Editar registro'
            : 'Registrar horas'}
        </h2>

        <div className="form">

          {/* FECHA */}
          <label>
            Fecha

            <input
              type="date"
              value={fecha}
              onChange={(e) =>
                setFecha(e.target.value)
              }
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
              onChange={(e) =>
                setHoras(e.target.value)
              }
            />
          </label>

          {/* ACTIVIDAD */}
          <label>
            Actividad realizada

            <textarea
              placeholder="Describe la actividad realizada..."
              value={actividad}
              onChange={(e) =>
                setActividad(e.target.value)
              }
            />
          </label>

          {/* BOTONES */}
          <div className="form-buttons">

            <button onClick={guardarRegistro}>
              {registroEditando !== null
                ? 'Guardar cambios'
                : '+ Registrar horas'}
            </button>

            {registroEditando !== null && (
              <button
                className="cancel-button"
                onClick={limpiarFormulario}
              >
                Cancelar
              </button>
            )}

          </div>

        </div>

      </section>

      {/* HISTORIAL */}
      <section className="history">

        <h2>Historial</h2>

        {registros.length === 0 ? (

          <p>
            Aún no hay registros.
          </p>

        ) : (

          registrosOrdenados.map((registro) => (

            <div
              className="record"
              key={registro.id}
            >

              <div className="record-info">

                <strong>
                  {registro.fecha}
                </strong>

                <span>
                  {registro.actividad}
                </span>

                <small>
                  {registro.horas} horas
                </small>

              </div>

              <div className="record-actions">

                <button
                  className="edit-button"
                  onClick={() =>
                    editarRegistro(registro)
                  }
                >
                  Editar
                </button>

                <button
                  className="delete-button"
                  onClick={() =>
                    confirmarEliminar(registro.id)
                  }
                >
                  Eliminar
                </button>

              </div>

            </div>

          ))

        )}

      </section>

    </main>
  )
}

export default App