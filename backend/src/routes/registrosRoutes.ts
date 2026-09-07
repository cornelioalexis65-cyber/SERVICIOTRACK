import { Router } from 'express'
import {
  getRegistros,
  createRegistro,
  updateRegistro,
  deleteRegistro,
} from '../controllers/registrosController.js'

export const registrosRouter = Router()

registrosRouter.get('/', getRegistros)
registrosRouter.post('/', createRegistro)
registrosRouter.put('/:id', updateRegistro)
registrosRouter.delete('/:id', deleteRegistro)
