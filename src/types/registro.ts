export interface Registro {
  id: number
  fecha: string
  horas: number
  actividad: string
  creadoEn?: string
}

export interface PerfilEstudiante {
  nombre: string
  matricula: string
  carrera: string
  institucion: string
  fechaInicio: string
  fechaLimite: string
  horasObjetivo: number
}
