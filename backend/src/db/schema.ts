import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const registrosTable = sqliteTable('registros', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(),
  horas: real('horas').notNull(),
  actividad: text('actividad').notNull(),
  creadoEn: text('creado_en').default(sql`CURRENT_TIMESTAMP`),
})

export type RegistroDB = typeof registrosTable.$inferSelect
export type NuevoRegistroDB = typeof registrosTable.$inferInsert
