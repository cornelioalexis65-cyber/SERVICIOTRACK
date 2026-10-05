import { Router } from 'express'
import multer from 'multer'
import {
  getDocumentos,
  createDocumento,
  downloadDocumento,
  updateDocumento,
  deleteDocumento,
  cambiarEstadoDocumento,
} from '../controllers/documentosController.js'

// Configurar multer para almacenamiento temporal en memoria
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB máx
  },
  fileFilter: (_req, file, cb) => {
    const permitidos = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf',
    ]
    if (permitidos.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo .doc, .docx y .pdf'))
    }
  },
})

export const documentosRouter = Router()

// GET /api/documentos - Lista todos los documentos
documentosRouter.get('/', getDocumentos)

// POST /api/documentos - Subir nuevo documento
documentosRouter.post('/', upload.single('archivo'), createDocumento)

// GET /api/documentos/:id/descargar - Descargar archivo
documentosRouter.get('/:id/descargar', downloadDocumento)

// PUT /api/documentos/:id - Actualizar documento (metadatos + opcional archivo)
documentosRouter.put('/:id', upload.single('archivo'), updateDocumento)

// PATCH /api/documentos/:id/estado - Cambiar solo el estado
documentosRouter.patch('/:id/estado', cambiarEstadoDocumento)

// DELETE /api/documentos/:id - Eliminar documento
documentosRouter.delete('/:id', deleteDocumento)