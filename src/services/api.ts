import type { Registro, PerfilEstudiante } from '../types/registro'

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
