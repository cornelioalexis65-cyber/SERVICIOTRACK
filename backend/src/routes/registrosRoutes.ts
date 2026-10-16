import express, { Router } from 'express'
import {
  getRegistros,
  createRegistro,
  updateRegistro,
  deleteRegistro,
  reemplazarRegistros,
} from '../controllers/registrosController.js'

export const registrosRouter = Router()

registrosRouter.get('/', getRegistros)
registrosRouter.post('/', createRegistro)
// Restaurar respaldo: reemplaza todos los registros (cuerpo de hasta 1 MB)
registrosRouter.post('/reemplazar', express.json({ limit: '1mb' }), reemplazarRegistros)
registrosRouter.put('/:id', updateRegistro)
registrosRouter.delete('/:id', deleteRegistro)
