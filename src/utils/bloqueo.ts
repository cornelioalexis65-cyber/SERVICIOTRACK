const enCurso = new Map<string, Promise<unknown>>()

/**
 * Ejecuta `tarea` sin solaparse con otra del mismo nombre.
 * - En esta pestaña: si ya hay una en curso, se devuelve esa misma promesa
 *   (tocar "sincronizar" dos veces no lanza dos sincronizaciones).
 * - Entre pestañas o ventanas de la app: se usa la Web Locks API, que hace
 *   esperar a la segunda hasta que termine la primera.
 */
export function conBloqueo<T>(nombre: string, tarea: () => Promise<T>): Promise<T> {
  const actual = enCurso.get(nombre) as Promise<T> | undefined
  if (actual) return actual

  const ejecutar: Promise<T> =
    typeof navigator !== 'undefined' && navigator.locks?.request
      ? navigator.locks.request(nombre, () => tarea())
      : tarea()

  const promesa = ejecutar.finally(() => enCurso.delete(nombre))
  enCurso.set(nombre, promesa)
  return promesa
}

/**
 * Como `conBloqueo`, pero si ya hay una tarea en curso espera a que termine
 * y luego ejecuta esta (no la reemplaza). Para acciones del usuario que
 * siempre deben ejecutarse, como restaurar un respaldo.
 */
export async function despuesDeBloqueo<T>(nombre: string, tarea: () => Promise<T>): Promise<T> {
  while (enCurso.has(nombre)) {
    await enCurso.get(nombre)!.catch(() => undefined)
  }
  return conBloqueo(nombre, tarea)
}
