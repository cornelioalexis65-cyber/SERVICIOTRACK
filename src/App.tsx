import { useState } from 'react'
import './App.css'

type Registro = {
  id: number
  fecha: string
  horas: number
  actividad: string
}

function App() {
  const totalHours = 500

  const [registros, setRegistros] = useState<Registro[]>([])

  const [fecha, setFecha] = useState('')
  const [horas, setHoras] = useState('')
  const [actividad, setActividad] = useState('')

  const [registroEditando, setRegistroEditando] = useState<number | null>(null)

  const horasRealizadas = registros.reduce(
    (total, registro) => total + registro.horas,
    0
  )

  const horasRestantes = Math.max(totalHours - horasRealizadas, 0)

  const progreso = Math.min(
    (horasRealizadas / totalHours) * 100,
    100
  )

  const guardarRegistro = () => {
    if (!fecha || !horas || !actividad) {
      alert('Completa todos los campos')
      return
    }

    if (Number(horas) <= 0) {
      alert('Las horas deben ser mayores a 0')
      return
    }

    if (registroEditando !== null) {
      setRegistros(
        registros.map((registro) =>
          registro.id === registroEditando
            ? {
                ...registro,
                fecha,
                horas: Number(horas),
                actividad,
              }
            : registro
        )
      )

      setRegistroEditando(null)
    } else {
      const nuevoRegistro: Registro = {
        id: Date.now(),
        fecha,
        horas: Number(horas),
        actividad,
      }

      setRegistros([...registros, nuevoRegistro])
    }

    limpiarFormulario()
  }

  const editarRegistro = (registro: Registro) => {
    setFecha(registro.fecha)
    setHoras(String(registro.horas))
    setActividad(registro.actividad)

    setRegistroEditando(registro.id)
  }

  const eliminarRegistro = (id: number) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar este registro?'
    )

    if (!confirmar) {
      return
    }

    setRegistros(
      registros.filter((registro) => registro.id !== id)
    )

    if (registroEditando === id) {
      limpiarFormulario()
    }
  }

  const limpiarFormulario = () => {
    setFecha('')
    setHoras('')
    setActividad('')
    setRegistroEditando(null)
  }

  return (
    <main className="app">

      <header className="header">
        <h1>ServicioTrack</h1>
        <p>Control de Servicio Social</p>
      </header>

      {/* RESUMEN */}
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

      {/* PROGRESO */}
      <section className="progress-section">

        <div className="progress-info">
          <span>Progreso</span>
          <span>{progreso.toFixed(1)}%</span>
        </div>

        <div className="progress-bar">
          <div
            className="progress"
            style={{ width: `${progreso}%` }}
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

          <label>
            Fecha

            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          <label>
            Horas

            <input
              type="number"
              min="1"
              max="24"
              placeholder="Ej. 5"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
            />
          </label>

          <label>
            Actividad realizada

            <textarea
              placeholder="Describe la actividad realizada..."
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
            />
          </label>

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

          <p>Aún no hay registros.</p>

        ) : (

          registros.map((registro) => (

            <div className="record" key={registro.id}>

              <div className="record-info">

                <strong>{registro.fecha}</strong>

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
                  onClick={() => editarRegistro(registro)}
                >
                  Editar
                </button>

                <button
                  className="delete-button"
                  onClick={() => eliminarRegistro(registro.id)}
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