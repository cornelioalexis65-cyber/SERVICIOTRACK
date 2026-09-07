import { Router } from 'express'
import { getPerfil, updatePerfil } from '../controllers/perfilController.js'

export const perfilRouter = Router()

perfilRouter.get('/', getPerfil)
perfilRouter.put('/', updatePerfil)
