import type { Registro, PerfilEstudiante } from '../types/registro'
import type { DocumentoServicio, NuevoDocumentoData, ActualizarDocumentoData } from '../types/documento'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchRegistrosApi(): Promise<Registro[]> {
  const res = await fetch(`${API_BASE_URL}/registros`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Error al obtener registros del servidor.')
  }
  return res.json()
}

export async function createRegistroApi(
  datos: Omit<Registro, 'id'>
): Promise<Registro> {
  const res = await fetch(`${API_BASE_URL}/registros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(4000),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Error al guardar el registro en el servidor.')
  }
  return data
}

export async function updateRegistroApi(
  id: number,
  datos: Omit<Registro, 'id'>
): Promise<Registro> {
  const res = await fetch(`${API_BASE_URL}/registros/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(4000),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el registro en el servidor.')
  }
  return data
}

export async function deleteRegistroApi(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/registros/${id}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al eliminar el registro en el servidor.')
  }
}

export async function fetchPerfilApi(): Promise<PerfilEstudiante> {
  const res = await fetch(`${API_BASE_URL}/perfil`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) {
    throw new Error('Error al obtener perfil del servidor.')
  }
  return res.json()
}

export async function updatePerfilApi(perfil: PerfilEstudiante): Promise<PerfilEstudiante> {
  const res = await fetch(`${API_BASE_URL}/perfil`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(perfil),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    throw new Error('Error al guardar perfil en el servidor.')
  }
  return res.json()
}

// ===== DOCUMENTOS =====

export async function fetchDocumentosApi(): Promise<DocumentoServicio[]> {
  const res = await fetch(`${API_BASE_URL}/documentos`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Error al obtener documentos del servidor.')
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

  const res = await fetch(`${API_BASE_URL}/documentos`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(10000),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Error al subir el documento.')
  }
  return data
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

  const res = await fetch(`${API_BASE_URL}/documentos/${id}`, {
    method: 'PUT',
    body: formData,
    signal: AbortSignal.timeout(10000),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el documento.')
  }
  return data
}

export async function deleteDocumentoApi(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/documentos/${id}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al eliminar el documento.')
  }
}

export async function downloadDocumentoApi(id: number): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/documentos/${id}/descargar`, {
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Error al descargar el documento.')
  }
  return res.blob()
}

export async function cambiarEstadoDocumentoApi(
  id: number,
  estado: 'pendiente' | 'entregado' | 'vencido'
): Promise<DocumentoServicio> {
  const res = await fetch(`${API_BASE_URL}/documentos/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
    signal: AbortSignal.timeout(4000),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Error al cambiar el estado.')
  }
  return data
}
