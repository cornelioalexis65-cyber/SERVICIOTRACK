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

// El archivo se recibe en memoria y se guarda en la base de datos.
// 4 MB: Vercel rechaza peticiones de más de 4,5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
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