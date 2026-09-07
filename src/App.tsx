import { useState } from 'react'
import './App.css'
import type { Registro } from './types/registro'
import { useRegistros } from './hooks/useRegistros'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { RegistroForm } from './components/RegistroForm'
import { Historial } from './components/Historial'

function App() {
  const {
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

  // Estado local del formulario
  const [fecha, setFecha] = useState('')
  const [horas, setHoras] = useState('')
  const [actividad, setActividad] = useState('')
  const [registroEditando, setRegistroEditando] = useState<number | null>(null)

  const limpiarFormulario = () => {
    setFecha('')
    setHoras('')
    setActividad('')
    setRegistroEditando(null)
  }

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

  const editarRegistro = (registro: Registro) => {
    setFecha(registro.fecha)
    setHoras(String(registro.horas))
    setActividad(registro.actividad)
    setRegistroEditando(registro.id)
  }

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
      <Header />

      <Dashboard
        totalHours={totalHours}
        horasRealizadas={horasRealizadas}
        horasRestantes={horasRestantes}
        progreso={progreso}
        diasRegistrados={diasRegistrados}
        promedioHoras={promedioHoras}
        ultimaFecha={ultimaFecha}
      />

      <RegistroForm
        fecha={fecha}
        horas={horas}
        actividad={actividad}
        registroEditando={registroEditando}
        onFechaChange={setFecha}
        onHorasChange={setHoras}
        onActividadChange={setActividad}
        onGuardar={guardarRegistro}
        onCancelar={limpiarFormulario}
      />

      <Historial
        registros={registrosOrdenados}
        onEditar={editarRegistro}
        onEliminar={confirmarEliminar}
      />
    </main>
  )
}

export default App