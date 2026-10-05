import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const registrosTable = sqliteTable('registros', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(),
  horas: real('horas').notNull(),
  actividad: text('actividad').notNull(),
  creadoEn: text('creado_en').default(sql`CURRENT_TIMESTAMP`),
})

export const perfilTable = sqliteTable('perfil_estudiante', {
  id: integer('id').primaryKey().default(1),
  nombre: text('nombre').notNull().default('Estudiante'),
  matricula: text('matricula').notNull().default(''),
  carrera: text('carrera').notNull().default(''),
  institucion: text('institucion').notNull().default(''),
  fechaInicio: text('fecha_inicio').notNull().default(''),
  fechaLimite: text('fecha_limite').notNull().default(''),
  horasObjetivo: real('horas_objetivo').notNull().default(500),
  programa: text('programa').notNull().default(''),
  supervisor: text('supervisor').notNull().default(''),
})

export const documentosTable = sqliteTable('documentos_servicio', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(),
  periodo: text('periodo'),
  estado: text('estado').notNull().default('pendiente'),
  fechaLimite: text('fecha_limite').notNull(),
  fechaEntrega: text('fecha_entrega'),
  nombreArchivo: text('nombre_archivo').notNull(),
  mimeType: text('mime_type').notNull(),
  tamano: integer('tamano').notNull(),
  rutaArchivo: text('ruta_archivo').notNull(),        // ruta física en servidor
  notas: text('notas'),
  creadoEn: text('creado_en').default(sql`CURRENT_TIMESTAMP`),
  actualizadoEn: text('actualizado_en').default(sql`CURRENT_TIMESTAMP`),
})

export type RegistroDB = typeof registrosTable.$inferSelect
export type NuevoRegistroDB = typeof registrosTable.$inferInsert
export type PerfilDB = typeof perfilTable.$inferSelect
export type DocumentoDB = typeof documentosTable.$inferSelect
export type NuevoDocumentoDB = typeof documentosTable.$inferInsert
