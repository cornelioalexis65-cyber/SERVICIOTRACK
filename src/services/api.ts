import type { Registro, PerfilEstudiante } from '../types/registro'
import type { DocumentoServicio, NuevoDocumentoData, ActualizarDocumentoData } from '../types/documento'

const API_URL_POR_DEFECTO = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const URL_KEY = 'serviciotrack-api-url'
const TOKEN_KEY = 'serviciotrack-api-token'

// ===== CONFIGURACIÓN DEL SERVIDOR =====

/**
 * La URL del servidor y el token se configuran desde la app (pestaña de
 * respaldo) y se guardan solo en este dispositivo. Así la versión publicada
 * en GitHub Pages puede conectarse a un backend real sin recompilar y el
 * token nunca queda dentro del código publicado.
 */
export function getConfigServidor(): { url: string; token: string } {
  try {
    return {
      url: localStorage.getItem(URL_KEY) || API_URL_POR_DEFECTO,
      token: localStorage.getItem(TOKEN_KEY) || '',
    }
  } catch {
    return { url: API_URL_POR_DEFECTO, token: '' }
  }
}

export function guardarConfigServidor(url: string, token: string): void {
  const urlLimpia = url.trim().replace(/\/+$/, '')
  if (urlLimpia && urlLimpia !== API_URL_POR_DEFECTO) {
    localStorage.setItem(URL_KEY, urlLimpia)
  } else {
    localStorage.removeItem(URL_KEY)
  }
  if (token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim())
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function apiUrl(ruta: string): string {
  return `${getConfigServidor().url}${ruta}`
}

function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  const { token } = getConfigServidor()
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
    return new ApiError('Token del servidor inválido o ausente.', 401)
  }
  return new ApiError(data.error || mensajePorDefecto, res.status)
}

// ===== SALUD / SESIÓN =====

/**
 * Comprueba que el servidor responde y que acepta el token configurado.
 * Si el token es incorrecto se considera desconectado: las operaciones se
 * guardan en la cola local en vez de fallar.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/sesion'), {
      method: 'GET',
      headers: cabeceras(),
      signal: AbortSignal.timeout(2500),
    })
    return res.ok
  } catch {
    return false
  }
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

export async function createRegistroApi(
  datos: Omit<Registro, 'id'>
): Promise<Registro> {
  const res = await fetch(apiUrl('/registros'), {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw await errorDeRespuesta(res, 'Error al guardar el registro en el servidor.')
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
  datos: NuevoDocumentoData
): Promise<DocumentoServicio> {
  const formData = new FormData()
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
