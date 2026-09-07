import { useEffect, useState } from 'react'
import './App.css'
import type { Registro } from './types/registro'

function App() {
  const totalHours = 500

  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(true)

  // Cargar registros guardados
  useEffect(() => {
    const registrosGuardados = localStorage.getItem(
      'serviciotrack-registros'
    )

    if (registrosGuardados) {
      try {
        const registrosParseados: Registro[] =
          JSON.parse(registrosGuardados)

        setRegistros(registrosParseados)
      } catch (error) {
        console.error(
          'Error al cargar los registros:',
          error
        )
      }
    }

    setCargando(false)
  }, [])

  // Guardar registros
  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(
        'serviciotrack-registros',
        JSON.stringify(registros)
      )
    }
  }, [registros, cargando])

  // Formulario
  const [fecha, setFecha] = useState('')
  const [horas, setHoras] = useState('')
  const [actividad, setActividad] = useState('')

  // Registro que estamos editando
  const [registroEditando, setRegistroEditando] =
    useState<number | null>(null)

  // Cálculos
  const horasRealizadas = registros.reduce(
    (total, registro) => total + registro.horas,
    0
  )

  const horasRestantes = Math.max(
    totalHours - horasRealizadas,
    0
  )

  const progreso = Math.min(
    (horasRealizadas / totalHours) * 100,
    100
  )

  const diasRegistrados = registros.length

  const promedioHoras =
    diasRegistrados > 0
      ? horasRealizadas / diasRegistrados
      : 0

  // Ordenar registros por fecha
  const registrosOrdenados = [...registros].sort(
    (a, b) => b.fecha.localeCompare(a.fecha)
  )

  // Obtener la fecha más reciente
  const ultimaFecha =
    registrosOrdenados.length > 0
      ? registrosOrdenados[0].fecha
      : 'Sin registros'

  // Guardar o editar registro
  const guardarRegistro = () => {
    if (!fecha || !horas || !actividad) {
      alert('Completa todos los campos')
      return
    }

    if (Number(horas) <= 0) {
      alert('Las horas deben ser mayores a 0')
      return
    }

    if (Number(horas) > 24) {
      alert('Las horas no pueden ser mayores a 24')
      return
    }

    const horasActuales = registroEditando !== null
      ? horasRealizadas -
        (registros.find(
          (registro) => registro.id === registroEditando
        )?.horas ?? 0)
      : horasRealizadas

    if (horasActuales + Number(horas) > totalHours) {
      alert(`No puedes superar las ${totalHours} horas de servicio social`)
      return
   }

    if (registroEditando !== null) {
      // Editar registro existente
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
      // Crear nuevo registro
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

  // Editar registro
  const editarRegistro = (registro: Registro) => {
    setFecha(registro.fecha)
    setHoras(String(registro.horas))
    setActividad(registro.actividad)

    setRegistroEditando(registro.id)
  }

  // Eliminar registro
  const eliminarRegistro = (id: number) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar este registro?'
    )

    if (!confirmar) {
      return
    }

    setRegistros(
      registros.filter(
        (registro) => registro.id !== id
      )
    )

    if (registroEditando === id) {
      limpiarFormulario()
    }
  }

  // Limpiar formulario
  const limpiarFormulario = () => {
    setFecha('')
    setHoras('')
    setActividad('')
    setRegistroEditando(null)
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
                    eliminarRegistro(registro.id)
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