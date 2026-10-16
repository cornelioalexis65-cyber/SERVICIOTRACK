import type { Registro, PerfilEstudiante } from '../types/registro'
import type { DocumentoServicio, NuevoDocumentoData, ActualizarDocumentoData } from '../types/documento'

/**
 * URL del backend, fijada al compilar (variable VITE_API_URL; en GitHub
 * Actions viene de la variable del repositorio). No es un secreto.
 */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')
const SESION_KEY = 'serviciotrack-sesion'

// Claves de la versión anterior (URL y token escritos a mano): ya no se usan
try {
  localStorage.removeItem('serviciotrack-api-url')
  localStorage.removeItem('serviciotrack-api-token')
} catch {
  // localStorage no disponible
}

// ===== SESIÓN =====

/**
 * Sesión que entrega el servidor al iniciar sesión con la contraseña. No es
 * la contraseña: es una prueba firmada que caduca a los 30 días.
 */
function leerSesion(): string {
  try {
    const raw = localStorage.getItem(SESION_KEY)
    if (!raw) return ''
    const { token, expiraEn } = JSON.parse(raw) as { token: string; expiraEn: string | null }
    if (expiraEn && new Date(expiraEn).getTime() <= Date.now()) {
      localStorage.removeItem(SESION_KEY)
      return ''
    }
    return token || ''
  } catch {
    return ''
  }
}

export function cerrarSesion(): void {
  try {
    localStorage.removeItem(SESION_KEY)
  } catch {
    // localStorage no disponible
  }
}

/**
 * Inicia sesión con la contraseña y guarda la sesión en este dispositivo.
 */
export async function iniciarSesionApi(password: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(apiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo iniciar sesión.', res.status)
  }
  localStorage.setItem(SESION_KEY, JSON.stringify({ token: data.token, expiraEn: data.expiraEn }))
}

export type EstadoServidor = 'conectado' | 'sin-sesion' | 'sin-conexion'

/**
 * Comprueba si hay servidor y si la sesión guardada sigue siendo válida.
 * Una sesión rechazada (401) se borra.
 */
export async function verificarServidor(): Promise<EstadoServidor> {
  try {
    const res = await fetch(apiUrl('/sesion'), {
      method: 'GET',
      headers: cabeceras(),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return 'conectado'
    if (res.status === 401) {
      cerrarSesion()
      return 'sin-sesion'
    }
    return 'sin-conexion'
  } catch {
    return 'sin-conexion'
  }
}

function apiUrl(ruta: string): string {
  return `${API_URL}${ruta}`
}

function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  const token = leerSesion()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

// ===== ERRORES =====

/** Error devuelto por el servidor, con su código HTTP. */
export class ApiError extends Error {
  status: number

  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Un error es permanente cuando el servidor rechazó la operación por sus
 * datos (400, 404, 413…): reintentarla daría siempre el mismo resultado.
 * Los fallos de red, los 5xx y los problemas de token (401/403) son
 * temporales y la operación se vuelve a intentar.
 */
export function esErrorPermanente(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status >= 400 &&
    err.status < 500 &&
    ![401, 403, 408, 429].includes(err.status)
  )
}

async function errorDeRespuesta(res: Response, mensajePorDefecto: string): Promise<ApiError> {
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    cerrarSesion()
    return new ApiError('Tu sesión caducó. Vuelve a iniciar sesión.', 401)
  }
  return new ApiError(data.error || mensajePorDefecto, res.status)
}

// ===== SALUD =====

/**
 * El servidor cuenta como conectado solo si responde y acepta la sesión.
 * Sin sesión, las operaciones se guardan en la cola local en vez de fallar.
 */
export async function checkBackendHealth(): Promise<boolean> {
  return (await verificarServidor()) === 'conectado'
}

// ===== REGISTROS =====

export async function fetchRegistrosApi(): Promise<Registro[]> {
  const res = await fetch(apiUrl('/registros'), {
    headers: cabeceras(),
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al obtener registros del servidor.')
  }
  return res.json()
}

/**
 * @param idCliente id local del registro. Si se envía, el servidor no crea
 *   duplicados aunque la misma alta llegue dos veces.
 */
export async function createRegistroApi(
  datos: Omit<Registro, 'id'>,
  idCliente?: number
): Promise<Registro> {
  const res = await fetch(apiUrl('/registros'), {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(idCliente !== undefined ? { ...datos, idCliente: String(idCliente) } : datos),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al guardar el registro en el servidor.')
  }
  return res.json()
}

/**
 * Reemplaza TODOS los registros del servidor (restaurar un respaldo).
 */
export async function reemplazarRegistrosApi(
  registros: Omit<Registro, 'id'>[]
): Promise<Registro[]> {
  const res = await fetch(apiUrl('/registros/reemplazar'), {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      registros: registros.map(({ fecha, horas, actividad }) => ({ fecha, horas, actividad })),
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al restaurar los registros en el servidor.')
  }
  return res.json()
}

export async function updateRegistroApi(
  id: number,
  datos: Omit<Registro, 'id'>
): Promise<Registro> {
  const res = await fetch(apiUrl(`/registros/${id}`), {
    method: 'PUT',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al actualizar el registro en el servidor.')
  }
  return res.json()
}

export async function deleteRegistroApi(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/registros/${id}`), {
    method: 'DELETE',
    headers: cabeceras(),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al eliminar el registro en el servidor.')
  }
}

// ===== PERFIL =====

export async function fetchPerfilApi(): Promise<PerfilEstudiante> {
  const res = await fetch(apiUrl('/perfil'), {
    headers: cabeceras(),
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al obtener perfil del servidor.')
  }
  return res.json()
}

export async function updatePerfilApi(perfil: PerfilEstudiante): Promise<PerfilEstudiante> {
  const res = await fetch(apiUrl('/perfil'), {
    method: 'PUT',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(perfil),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al guardar perfil en el servidor.')
  }
  return res.json()
}

// ===== DOCUMENTOS =====

export async function fetchDocumentosApi(): Promise<DocumentoServicio[]> {
  const res = await fetch(apiUrl('/documentos'), {
    headers: cabeceras(),
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al obtener documentos del servidor.')
  }
  return res.json()
}

export async function createDocumentoApi(
  datos: NuevoDocumentoData,
  idCliente?: number
): Promise<DocumentoServicio> {
  const formData = new FormData()
  // Antes que el archivo, para que el servidor lo lea aunque falle la subida
  if (idCliente !== undefined) formData.append('idCliente', String(idCliente))
  formData.append('tipo', datos.tipo)
  if (datos.periodo) formData.append('periodo', datos.periodo)
  formData.append('fechaLimite', datos.fechaLimite)
  if (datos.notas) formData.append('notas', datos.notas)
  formData.append('archivo', datos.archivo)

  const res = await fetch(apiUrl('/documentos'), {
    method: 'POST',
    headers: cabeceras(),
    body: formData,
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al subir el documento.')
  }
  return res.json()
}

export async function updateDocumentoApi(
  id: number,
  datos: ActualizarDocumentoData
): Promise<DocumentoServicio> {
  const formData = new FormData()
  if (datos.tipo) formData.append('tipo', datos.tipo)
  if (datos.periodo !== undefined) formData.append('periodo', datos.periodo || '')
  if (datos.fechaLimite) formData.append('fechaLimite', datos.fechaLimite)
  if (datos.estado) formData.append('estado', datos.estado)
  if (datos.fechaEntrega) formData.append('fechaEntrega', datos.fechaEntrega)
  if (datos.notas !== undefined) formData.append('notas', datos.notas || '')
  if (datos.archivo) formData.append('archivo', datos.archivo)

  const res = await fetch(apiUrl(`/documentos/${id}`), {
    method: 'PUT',
    headers: cabeceras(),
    body: formData,
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al actualizar el documento.')
  }
  return res.json()
}

export async function deleteDocumentoApi(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/documentos/${id}`), {
    method: 'DELETE',
    headers: cabeceras(),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al eliminar el documento.')
  }
}

export async function downloadDocumentoApi(id: number): Promise<Blob> {
  const res = await fetch(apiUrl(`/documentos/${id}/descargar`), {
    headers: cabeceras(),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al descargar el documento.')
  }
  return res.blob()
}

export async function cambiarEstadoDocumentoApi(
  id: number,
  estado: 'pendiente' | 'entregado' | 'vencido'
): Promise<DocumentoServicio> {
  const res = await fetch(apiUrl(`/documentos/${id}/estado`), {
    method: 'PATCH',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ estado }),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al cambiar el estado.')
  }
  return res.json()
}
