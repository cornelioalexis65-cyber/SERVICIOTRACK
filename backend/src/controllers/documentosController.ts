import type { Request, Response } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { documentosTable } from '../db/schema.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')

// Asegurar que existe el directorio de uploads
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const MIME_TYPES_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                       // .doc
  'application/pdf',                                                          // .pdf
]

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

/**
 * GET /api/documentos
 * Lista todos los documentos con metadatos (sin archivos)
 */
export async function getDocumentos(_req: Request, res: Response): Promise<void> {
  try {
    const documentos = await db
      .select()
      .from(documentosTable)
      .orderBy(desc(documentosTable.creadoEn))

    res.json(documentos)
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

    // Generar nombre único para el archivo en disco
    const timestamp = Date.now()
    const _ext = path.extname(file.originalname) || '.docx'
    const nombreArchivoDisco = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const rutaArchivo = path.join(UPLOAD_DIR, nombreArchivoDisco)

    // Mover archivo a directorio permanente
    fs.renameSync(file.path, rutaArchivo)

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
        rutaArchivo: nombreArchivoDisco, // solo nombre, no ruta completa
        notas: notas || '',
      })
      .returning()

    res.status(201).json(nuevoDocumento)
  } catch (error) {
    console.error('Error al crear documento:', error)
    // Si falla, limpiar archivo subido si existe
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ error: 'Error interno al guardar el documento.' })
  }
}

/**
 * GET /api/documentos/:id/descargar
 * Descarga el archivo físico
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

    const rutaCompleta = path.join(UPLOAD_DIR, documento.rutaArchivo)
    if (!fs.existsSync(rutaCompleta)) {
      res.status(404).json({ error: 'Archivo no encontrado en el servidor.' })
      return
    }

    // Headers para descarga correcta
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(documento.nombreArchivo)}"`)
    res.setHeader('Content-Type', documento.mimeType)
    res.setHeader('Content-Length', documento.tamano)

    const stream = fs.createReadStream(rutaCompleta)
    stream.pipe(res)
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
      .select()
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

    // Si se sube nuevo archivo, validar y reemplazar
    let nombreArchivoDisco = existente.rutaArchivo
    let nombreArchivoOriginal = existente.nombreArchivo
    let mimeType = existente.mimeType
    let tamano = existente.tamano

    if (file) {
      if (!validarMimeType(file.mimetype)) {
        res.status(400).json({ error: 'Tipo de archivo no permitido. Use .doc, .docx o .pdf' })
        return
      }

      // Eliminar archivo anterior
      const rutaAnterior = path.join(UPLOAD_DIR, existente.rutaArchivo)
      if (fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior)
      }

      // Guardar nuevo archivo
      const _ext = path.extname(file.originalname) || '.docx'
      nombreArchivoDisco = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const rutaNueva = path.join(UPLOAD_DIR, nombreArchivoDisco)
      fs.renameSync(file.path, rutaNueva)

      nombreArchivoOriginal = file.originalname
      mimeType = file.mimetype
      tamano = file.size
    }

    // Determinar estado automático si no se proporciona
    let estadoFinal = estado || existente.estado
    if (!estado && fechaLimite) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const limite = new Date(fechaLimite + 'T00:00:00')
      estadoFinal = limite < hoy ? 'vencido' : 'pendiente'
    }

    // Si se marca como entregado y no tenía fecha, poner hoy
    let fechaEntregaFinal = fechaEntrega || existente.fechaEntrega
    if (estadoFinal === 'entregado' && !existente.fechaEntrega && !fechaEntrega) {
      fechaEntregaFinal = new Date().toISOString().split('T')[0]
    }

    const [actualizado] = await db
      .update(documentosTable)
      .set({
        tipo: tipo || existente.tipo,
        periodo: periodo !== undefined ? (periodo || null) : existente.periodo,
        estado: estadoFinal,
        fechaLimite: fechaLimite || existente.fechaLimite,
        fechaEntrega: fechaEntregaFinal,
        nombreArchivo: nombreArchivoOriginal,
        mimeType,
        tamano,
        rutaArchivo: nombreArchivoDisco,
        notas: notas !== undefined ? (notas || '') : existente.notas,
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(documentosTable.id, id))
      .returning()

    res.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar documento:', error)
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ error: 'Error interno al actualizar el documento.' })
  }
}

/**
 * DELETE /api/documentos/:id
 * Elimina documento y su archivo físico
 */
export async function deleteDocumento(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' })
      return
    }

    const [existente] = await db
      .select()
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    // Eliminar archivo físico
    const rutaArchivo = path.join(UPLOAD_DIR, existente.rutaArchivo)
    if (fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo)
    }

    await db.delete(documentosTable).where(eq(documentosTable.id, id))

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
      .select()
      .from(documentosTable)
      .where(eq(documentosTable.id, id))

    if (!existente) {
      res.status(404).json({ error: 'Documento no encontrado.' })
      return
    }

    let fechaEntrega = existente.fechaEntrega
    if (estado === 'entregado' && !existente.fechaEntrega) {
      fechaEntrega = new Date().toISOString().split('T')[0]
    }

    const [actualizado] = await db
      .update(documentosTable)
      .set({
        estado,
        fechaEntrega,
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(documentosTable.id, id))
      .returning()

    res.json(actualizado)
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    res.status(500).json({ error: 'Error interno al cambiar el estado.' })
  }
}