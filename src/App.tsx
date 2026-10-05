import { useState } from 'react'
import type { Registro, PerfilEstudiante } from './types/registro'
// import type { DocumentoServicio } from './types/documento' // used via documentos prop
import { useRegistros } from './hooks/useRegistros'
import { useDocumentos } from './hooks/useDocumentos'
import { Header } from './components/Header'
import { InstalarAppBanner } from './components/InstalarAppBanner'
import { AlertasBanner } from './components/AlertasBanner'
import { Dashboard } from './components/Dashboard'
import { RegistroForm } from './components/RegistroForm'
import { Historial } from './components/Historial'
import { PerfilModal } from './components/PerfilModal'
import { ReporteModal } from './components/ReporteModal'
import { ToastContainer, type ToastMensaje, type TipoToast } from './components/Toast'
import { ConfirmModal } from './components/ConfirmModal'
import { exportarCSV } from './utils/exportUtils'

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
    pendientes,
    agregarRegistro,
    actualizarRegistro,
    eliminarRegistro,
    actualizarPerfil,
    restaurarBackup,
    sincronizarConBackend,
  } = useRegistros()

  const {
    documentos,
    cargando: documentosCargando,
    backendConectado: documentosBackendConectado,
    sincronizando: documentosSincronizando,
    pendientes: documentosPendientes,
    subirDocumento,
    actualizarDocumento,
    eliminarDocumento,
    cambiarEstado,
    descargarDocumento,
    sincronizarConBackend: sincronizarDocumentos,
  } = useDocumentos()

  // Sistema de Notificaciones Toasts
  const [toasts, setToasts] = useState<ToastMensaje[]>([])

  const agregarToast = (titulo: string, tipo: TipoToast = 'info', mensaje?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    setToasts((prev) => [...prev, { id, tipo, titulo, mensaje }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const cerrarToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Modal de Confirmación Moderno
  const [modalConfirm, setModalConfirm] = useState<{
    abierto: boolean
    titulo: string
    mensaje: string
    onConfirmar: () => void
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    onConfirmar: () => {},
  })

  // Modales
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false)
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false)
  const [folioReporte, setFolioReporte] = useState('')

  // Genera un folio único nuevo cada vez que se abre el reporte
  const abrirReporte = () => {
    setFolioReporte(`ST-${Date.now().toString().slice(-6)}`)
    setModalReporteAbierto(true)
  }

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
      agregarToast('Validación no superada', 'error', resultado.error)
      return
    }

    if (registroEditando !== null) {
      agregarToast('Registro actualizado con éxito', 'exito')
    } else {
      agregarToast(
        'Actividad registrada con éxito',
        'exito',
        `+${datos.horas} hrs sumadas al servicio social`
      )
    }

    limpiarFormulario()
  }

  const editarRegistro = (registro: Registro) => {
    setFecha(registro.fecha)
    setHoras(String(registro.horas))
    setActividad(registro.actividad)
    setRegistroEditando(registro.id)
    window.scrollTo({ top: 380, behavior: 'smooth' })
  }

  const confirmarEliminar = (id: number) => {
    setModalConfirm({
      abierto: true,
      titulo: '¿Eliminar actividad?',
      mensaje: 'Esta acción removerá permanentemente este registro de horas de tu historial.',
      onConfirmar: async () => {
        await eliminarRegistro(id)
        if (registroEditando === id) {
          limpiarFormulario()
        }
        setModalConfirm((prev) => ({ ...prev, abierto: false }))
        agregarToast('Registro eliminado correctamente', 'info')
      },
    })
  }

  const handleExportarCSV = () => {
    exportarCSV(registros, perfil)
    agregarToast('Reporte CSV generado', 'exito', 'Descargado en formato compatible con Excel')
  }

  const handleReconectar = async () => {
    await Promise.all([sincronizarConBackend(), sincronizarDocumentos()])
    agregarToast('Sincronización ejecutada', 'info')
  }

  const handleRestaurarBackup = async (
    nuevosRegistros: Registro[],
    nuevoPerfil?: PerfilEstudiante
  ) => {
    await restaurarBackup(nuevosRegistros, nuevoPerfil)
    limpiarFormulario()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
        <Header
          perfil={perfil}
          backendConectado={backendConectado}
          sincronizando={sincronizando}
          pendientes={pendientes}
          onReconectar={handleReconectar}
          onAbrirPerfil={() => setModalPerfilAbierto(true)}
          onAbrirReporte={abrirReporte}
        />

        <InstalarAppBanner />

        <AlertasBanner
          horasRealizadas={horasRealizadas}
          horasRestantes={horasRestantes}
          totalHours={totalHours}
          diasRestantesLimite={diasRestantesLimite}
          ritmoRecomendado={ritmoRecomendado}
          documentos={documentos}
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
          horasRestantes={horasRestantes}
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
          onExportarCSV={handleExportarCSV}
        />
      </div>

      {/* Modales */}
      <PerfilModal
        perfil={perfil}
        registros={registros}
        documentos={documentos}
        abierto={modalPerfilAbierto}
        onCerrar={() => setModalPerfilAbierto(false)}
        onGuardar={actualizarPerfil}
        onRestaurarBackup={handleRestaurarBackup}
        onNotificar={(mensaje, tipo) => agregarToast(mensaje, tipo)}
        // Documentos
        documentosCargando={documentosCargando}
        documentosBackendConectado={documentosBackendConectado}
        documentosSincronizando={documentosSincronizando}
        documentosPendientes={documentosPendientes}
        onSubirDocumento={subirDocumento}
        onActualizarDocumento={actualizarDocumento}
        onEliminarDocumento={eliminarDocumento}
        onCambiarEstadoDocumento={cambiarEstado}
        onDescargarDocumento={descargarDocumento}
        onSincronizarDocumentos={sincronizarDocumentos}
      />

      <ReporteModal
        perfil={perfil}
        registros={registros}
        totalHours={totalHours}
        folio={folioReporte}
        abierto={modalReporteAbierto}
        onCerrar={() => setModalReporteAbierto(false)}
      />

      <ConfirmModal
        abierto={modalConfirm.abierto}
        titulo={modalConfirm.titulo}
        mensaje={modalConfirm.mensaje}
        onConfirmar={modalConfirm.onConfirmar}
        onCancelar={() => setModalConfirm((prev) => ({ ...prev, abierto: false }))}
      />

      {/* Contenedor de Toasts Flotantes */}
      <ToastContainer toasts={toasts} onCerrar={cerrarToast} />

      {/* Botón flotante móvil para Reporte PDF */}
      {!modalReporteAbierto && !modalPerfilAbierto && (
        <button
          type="button"
          id="fab-reporte"
          onClick={abrirReporte}
          title="Generar Reporte PDF"
          className="fixed bottom-5 left-5 z-40 sm:hidden flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-2xl shadow-indigo-500/40 transition-all active:scale-95"
        >
          <span className="text-lg">📄</span>
          <span>Reporte PDF</span>
        </button>
      )}
    </div>
  )
}

export default App