import type { Registro, PerfilEstudiante } from '../types/registro'

export interface BackupArchivo {
  version: '1.0'
  app: 'ServicioTrack'
  exportadoEn: string
  perfil: PerfilEstudiante
  registros: Registro[]
}

/**
 * Genera un archivo CSV compatible al 100% con Excel en español
 * (usa BOM UTF-8 y codifica comillas adecuadamente).
 */
export function exportarCSV(registros: Registro[], perfil: PerfilEstudiante): void {
  const registrosCronologicos = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha))

  let acumulado = 0
  const filas = registrosCronologicos.map((r, index) => {
    acumulado += r.horas
    const fecha = `"${r.fecha.replace(/"/g, '""')}"`
    const actividad = `"${r.actividad.replace(/"/g, '""')}"`
    return `${index + 1},${fecha},${actividad},${r.horas},${acumulado}`
  })

  const encabezadoInfo = [
    `# REPORTE DE SERVICIO SOCIAL - SERVICIOTRACK`,
    `# Prestador: "${(perfil.nombre || 'Estudiante').replace(/"/g, '""')}"`,
    `# Matrícula: "${(perfil.matricula || 'N/A').replace(/"/g, '""')}"`,
    `# Institución: "${(perfil.institucion || 'N/A').replace(/"/g, '""')}"`,
    `# Meta: ${perfil.horasObjetivo || 500} horas`,
    `# Horas Acumuladas: ${acumulado} horas`,
    `# Fecha de Exportación: ${new Date().toLocaleDateString('es-MX')}`,
    '',
    'No,Fecha,Actividad Realizada,Horas,Horas Acumuladas',
  ]

  const csvContent = '\uFEFF' + [...encabezadoInfo, ...filas].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  const hoyStr = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `ServicioTrack_Reporte_${hoyStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta un respaldo íntegro en formato JSON con metadatos.
 */
export function exportarJSON(registros: Registro[], perfil: PerfilEstudiante): void {
  const datosBackup: BackupArchivo = {
    version: '1.0',
    app: 'ServicioTrack',
    exportadoEn: new Date().toISOString(),
    perfil,
    registros,
  }

  const jsonStr = JSON.stringify(datosBackup, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  const hoyStr = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `ServicioTrack_Backup_${hoyStr}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Valida y procesa un archivo de respaldo JSON importado.
 */
export function parsearBackupJSON(contenido: string): {
  valido: boolean
  error?: string
  datos?: { perfil?: PerfilEstudiante; registros: Registro[] }
} {
  try {
    const parsed = JSON.parse(contenido)

    // Formato estándar de ServicioTrack
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.registros)) {
        const registrosValidos: Registro[] = []
        for (const item of parsed.registros) {
          if (
            typeof item === 'object' &&
            item !== null &&
            typeof item.fecha === 'string' &&
            typeof item.horas === 'number' &&
            typeof item.actividad === 'string'
          ) {
            registrosValidos.push({
              id: typeof item.id === 'number' ? item.id : Date.now() + Math.floor(Math.random() * 1000),
              fecha: item.fecha,
              horas: item.horas,
              actividad: item.actividad,
              creadoEn: item.creadoEn,
            })
          }
        }

        return {
          valido: true,
          datos: {
            perfil: parsed.perfil && typeof parsed.perfil === 'object' ? parsed.perfil : undefined,
            registros: registrosValidos,
          },
        }
      }

      // Si el archivo importado es directamente un array de registros
      if (Array.isArray(parsed)) {
        const registrosValidos: Registro[] = []
        for (const item of parsed) {
          if (
            typeof item === 'object' &&
            item !== null &&
            typeof item.fecha === 'string' &&
            typeof item.horas === 'number' &&
            typeof item.actividad === 'string'
          ) {
            registrosValidos.push({
              id: typeof item.id === 'number' ? item.id : Date.now() + Math.floor(Math.random() * 1000),
              fecha: item.fecha,
              horas: item.horas,
              actividad: item.actividad,
            })
          }
        }

        return {
          valido: true,
          datos: { registros: registrosValidos },
        }
      }
    }

    return {
      valido: false,
      error: 'El archivo JSON no tiene un formato válido compatible con ServicioTrack.',
    }
  } catch (err: any) {
    return {
      valido: false,
      error: `Error al leer el archivo JSON: ${err.message || 'Contenido corrupto'}`,
    }
  }
}
