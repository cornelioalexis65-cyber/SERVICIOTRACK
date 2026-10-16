import type { Request, Response } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { documentosTable } from '../db/schema.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Carpeta de archivos antiguos (antes se guardaban en disco). Solo lectura.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')

const MIME_TYPES_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                       // .doc
  'application/pdf',                                                          // .pdf
]

/**
 * Columnas que se devuelven al cliente: todas menos el contenido del archivo,
 * que solo viaja en la descarga.
 */
const columnasPublicas = {
  id: documentosTable.id,
  tipo: documentosTable.tipo,
  periodo: documentosTable.periodo,
  estado: documentosTable.estado,
  fechaLimite: documentosTable.fechaLimite,
  fechaEntrega: documentosTable.fechaEntrega,
  nombreArchivo: documentosTable.nombreArchivo,
  mimeType: documentosTable.mimeType,
  tamano: documentosTable.tamano,
  notas: documentosTable.notas,
  creadoEn: documentosTable.creadoEn,
  actualizadoEn: documentosTable.actualizadoEn,
}

type DocumentoPublico = { [K in keyof typeof columnasPublicas]: (typeof columnasPublicas)[K]['_']['data'] | null }

/** El frontend usa `tamaño`; se envían los dos nombres por compatibilidad. */
function paraCliente(doc: DocumentoPublico) {
  return { ...doc, tamaño: doc.tamano }
}

function validarMimeType(mime: string): boolean {
  return MIME_TYPES_PERMITIDOS.includes(mime)
}

function validarTipoDocumento(tipo: string): boolean {
  const tiposValidos = ['carta_presentacion', 'carta_aceptacion', 'evaluacion_bimestral', 'reporte_bimestral', 'otro']
  return tiposValidos.includes(tipo)
}

function validarFecha(fecha: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaObj = new Date(anio, mes - 1, dia)
  return fechaObj.getFullYear() === anio && fechaObj.getMonth() === mes - 1 && fechaObj.getDate() === dia
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del servidor, no en UTC. */
function hoyLocal(): string {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * GET /api/documentos
 * Lista todos los documentos con metadatos (sin archivos)
 */
export async function getDocumentos(_req: Request, res: Response): Promise<void> {
  try {
    const documentos = await db
      .select(columnasPublicas)
      .from(documentosTable)
      .orderBy(desc(documentosTable.creadoEn))

    res.json(documentos.map(paraCliente))
  } catch (error) {
    console.error('Error al obtener documentos:', error)
    res.status(500).json({ error: 'Error interno al consultar documentos.' })
  }
}

/**
 * POST /api/documentos
 * Sube un nuevo documento con archivo
 */
export async function createDocumento(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file
    const { tipo, periodo, fechaLimite, notas } = req.body

    // Alta idempotente: si este documento ya se subió (reintento o dos
    // sincronizaciones a la vez), devolver el existente
    const idCliente = typeof req.body.idCliente === 'string' && req.body.idCliente.trim().length <= 64
      ? req.body.idCliente.trim() || null
      : null
    if (idCliente) {
      const [existente] = await db
        .select(columnasPublicas)
        .from(documentosTable)
        .where(eq(documentosTable.idCliente, idCliente))
      if (existente) {
        res.status(200).json(paraCliente(existente))
        return
      }
    }

    if (!file) {
      res.status(400).json({ error: 'No se recibió ningún archivo.' })
      return
    }

    if (!tipo || !validarTipoDocumento(tipo)) {
      res.status(400).json({ error: 'Tipo de documento inválido.' })
      return
    }

    if (!validarMimeType(file.mimetype)) {
      res.status(400).json({ error: 'Tipo de archivo no permitido. Use .doc, .docx o .pdf' })
      return
    }

    if (!fechaLimite || !validarFecha(fechaLimite)) {
      res.status(400).json({ error: 'Fecha límite inválida (formato YYYY-MM-DD).' })
      return
    }

    // Validar periodo si es bimestral
    if ((tipo === 'evaluacion_bimestral' || tipo === 'reporte_bimestral') && !periodo) {
      res.status(400).json({ error: 'El periodo es obligatorio para evaluaciones y reportes bimestrales.' })
      return
    }

    const [nuevoDocumento] = await db
      .insert(documentosTable)
      .values({
        tipo,
        periodo: periodo || null,
        estado: 'pendiente',
        fechaLimite,
        nombreArchivo: file.originalname,
        mimeType: file.mimetype,
        tamano: file.size,
        rutaArchivo: '',
        contenido: file.buffer,
        notas: notas || '',
        idCliente,
      })
      .returning(columnasPublicas)

    res.status(201).json(paraCliente(nuevoDocumento))
  } catch (error) {
    console.error('Error al crear documento:', error)
    res.status(500).json({ error: 'Error interno al guardar el documento.' })
  }
}

/**
 * GET /api/documentos/:id/descargar
 * Descarga el archivo
 */
export async function downloadDocumento(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' })
      return
    }

    const [documento] = await db
      .select()
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!documento) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    let contenido: Buffer | null = documento.contenido ? Buffer.from(documento.contenido) : null

    // Archivos antiguos guardados en disco
    if (!contenido && documento.rutaArchivo) {
      const rutaCompleta = path.join(UPLOAD_DIR, path.basename(documento.rutaArchivo))
      if (fs.existsSync(rutaCompleta)) {
        contenido = fs.readFileSync(rutaCompleta)
      }
    }

    if (!contenido) {
      res.status(404).json({ error: 'Archivo no encontrado en el servidor.' })
      return
    }

    // filename* admite acentos y espacios (RFC 6266)
    const nombreAscii = documento.nombreArchivo.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(documento.nombreArchivo)}`
    )
    res.setHeader('Content-Type', documento.mimeType)
    res.setHeader('Content-Length', contenido.length)
    res.end(contenido)
  } catch (error) {
    console.error('Error al descargar documento:', error)
    res.status(500).json({ error: 'Error interno al descargar el documento.' })
  }
}

/**
 * PUT /api/documentos/:id
 * Actualiza metadatos y opcionalmente reemplaza el archivo
 */
export async function updateDocumento(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' })
      return
    }

    const [existente] = await db
      .select(columnasPublicas)
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    const { tipo, periodo, fechaLimite, estado, fechaEntrega, notas } = req.body
    const file = req.file

    // Validaciones
    if (tipo && !validarTipoDocumento(tipo)) {
      res.status(400).json({ error: 'Tipo de documento inválido.' })
      return
    }

    if (fechaLimite && !validarFecha(fechaLimite)) {
      res.status(400).json({ error: 'Fecha límite inválida (formato YYYY-MM-DD).' })
      return
    }

    if (estado && !['pendiente', 'entregado', 'vencido'].includes(estado)) {
      res.status(400).json({ error: 'Estado inválido.' })
      return
    }

    if (file && !validarMimeType(file.mimetype)) {
      res.status(400).json({ error: 'Tipo de archivo no permitido. Use .doc, .docx o .pdf' })
      return
    }

    // Determinar estado automático si no se proporciona
    let estadoFinal = estado || existente.estado
    if (!estado && fechaLimite) {
      estadoFinal = fechaLimite < hoyLocal() ? 'vencido' : 'pendiente'
    }

    // Si se marca como entregado y no tenía fecha, poner hoy
    let fechaEntregaFinal = fechaEntrega || existente.fechaEntrega
    if (estadoFinal === 'entregado' && !existente.fechaEntrega && !fechaEntrega) {
      fechaEntregaFinal = hoyLocal()
    }

    const [actualizado] = await db
      .update(documentosTable)
      .set({
        tipo: tipo || existente.tipo,
        periodo: periodo !== undefined ? (periodo || null) : existente.periodo,
        estado: estadoFinal,
        fechaLimite: fechaLimite || existente.fechaLimite,
        fechaEntrega: fechaEntregaFinal,
        ...(file
          ? {
              nombreArchivo: file.originalname,
              mimeType: file.mimetype,
              tamano: file.size,
              rutaArchivo: '',
              contenido: file.buffer,
            }
          : {}),
        notas: notas !== undefined ? (notas || '') : existente.notas,
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(documentosTable.id, id))
      .returning(columnasPublicas)

    res.json(paraCliente(actualizado))
  } catch (error) {
    console.error('Error al actualizar documento:', error)
    res.status(500).json({ error: 'Error interno al actualizar el documento.' })
  }
}

/**
 * DELETE /api/documentos/:id
 * Elimina el documento (y su archivo antiguo en disco, si lo tenía)
 */
export async function deleteDocumento(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' })
      return
    }

    const [existente] = await db
      .select({ id: documentosTable.id, rutaArchivo: documentosTable.rutaArchivo })
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    await db.delete(documentosTable).where(eq(documentosTable.id, id))

    if (existente.rutaArchivo) {
      const rutaArchivo = path.join(UPLOAD_DIR, path.basename(existente.rutaArchivo))
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo)
      }
    }

    res.json({ mensaje: 'Documento eliminado correctamente.', id })
  } catch (error) {
    console.error('Error al eliminar documento:', error)
    res.status(500).json({ error: 'Error interno al eliminar el documento.' })
  }
}

/**
 * PATCH /api/documentos/:id/estado
 * Cambia solo el estado (para marcar como entregado/pendiente)
 */
export async function cambiarEstadoDocumento(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' })
      return
    }

    const { estado } = req.body
    if (!estado || !['pendiente', 'entregado', 'vencido'].includes(estado)) {
      res.status(400).json({ error: 'Estado inválido.' })
      return
    }

    const [existente] = await db
      .select(columnasPublicas)
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    let fechaEntrega = existente.fechaEntrega
    if (estado === 'entregado' && !existente.fechaEntrega) {
      fechaEntrega = hoyLocal()
    }

    const [actualizado] = await db
      .update(documentosTable)
      .set({
        estado,
        fechaEntrega,
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(documentosTable.id, id))
      .returning(columnasPublicas)

    res.json(paraCliente(actualizado))
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    res.status(500).json({ error: 'Error interno al cambiar el estado.' })
  }
}
