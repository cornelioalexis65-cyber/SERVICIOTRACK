import { useState } from 'react'
import type { Registro } from './types/registro'
import { useRegistros } from './hooks/useRegistros'
import { Header } from './components/Header'
import { InstalarAppBanner } from './components/InstalarAppBanner'
import { AlertasBanner } from './components/AlertasBanner'
import { Dashboard } from './components/Dashboard'
import { RegistroForm } from './components/RegistroForm'
import { Historial } from './components/Historial'
import { PerfilModal } from './components/PerfilModal'
import { ReporteModal } from './components/ReporteModal'

function App() {
  const {
    registros,
    registrosOrdenados,
    perfil,
    totalHours,
    horasRealizadas,
    horasRestantes,
    progreso,
    diasRegistrados,
    promedioHoras,
    ultimaFecha,
    diasRestantesLimite,
    ritmoRecomendado,
    backendConectado,
    sincronizando,
    agregarRegistro,
    actualizarRegistro,
    eliminarRegistro,
    actualizarPerfil,
    sincronizarConBackend,
  } = useRegistros()

  // Modales
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false)
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false)

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

  const guardarRegistro = async () => {
    const datos = {
      fecha,
      horas: Number(horas),
      actividad,
    }

    const resultado =
      registroEditando !== null
        ? await actualizarRegistro(registroEditando, datos)
        : await agregarRegistro(datos)

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

  const confirmarEliminar = async (id: number) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar este registro?'
    )

    if (!confirmar) return

    await eliminarRegistro(id)

    if (registroEditando === id) {
      limpiarFormulario()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
        <Header
          perfil={perfil}
          backendConectado={backendConectado}
          sincronizando={sincronizando}
          onReconectar={sincronizarConBackend}
          onAbrirPerfil={() => setModalPerfilAbierto(true)}
          onAbrirReporte={() => setModalReporteAbierto(true)}
        />

        <InstalarAppBanner />

        <AlertasBanner
          horasRealizadas={horasRealizadas}
          horasRestantes={horasRestantes}
          totalHours={totalHours}
          diasRestantesLimite={diasRestantesLimite}
          ritmoRecomendado={ritmoRecomendado}
        />

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
      </div>

      {/* Modales */}
      <PerfilModal
        perfil={perfil}
        abierto={modalPerfilAbierto}
        onCerrar={() => setModalPerfilAbierto(false)}
        onGuardar={actualizarPerfil}
      />

      <ReporteModal
        perfil={perfil}
        registros={registros}
        totalHours={totalHours}
        abierto={modalReporteAbierto}
        onCerrar={() => setModalReporteAbierto(false)}
      />
    </div>
  )
}

export default App