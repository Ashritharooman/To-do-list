import { Router } from 'express'
import * as controller from '../controllers/taskController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { taskCreateSchema, taskQuerySchema, taskUpdateSchema } from '../schemas/taskSchemas.js'

const router = Router()
router.use(requireAuth)
router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(controller.list))
router.get('/:id', asyncHandler(controller.get))
router.post('/', validate(taskCreateSchema), asyncHandler(controller.create))
router.patch('/:id', validate(taskUpdateSchema), asyncHandler(controller.update))
router.patch('/:id/status', validate(taskUpdateSchema.pick({ status: true })), asyncHandler(controller.update))
router.delete('/:id', asyncHandler(controller.remove))
export default router
