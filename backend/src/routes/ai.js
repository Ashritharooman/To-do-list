import { Router } from 'express'
import * as controller from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'
import { aiRateLimit } from '../middleware/aiRateLimit.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { querySchema, taskInputSchema, textSchema } from '../schemas/aiSchemas.js'

const router = Router()
router.use(requireAuth, aiRateLimit)
router.post('/parse-task', validate(textSchema), asyncHandler(controller.parseTask))
router.post('/prioritize', validate(taskInputSchema), asyncHandler(controller.prioritize))
router.post('/breakdown', validate(taskInputSchema), asyncHandler(controller.breakdown))
router.get('/daily-summary', asyncHandler(controller.dailySummary))
router.get('/search', validate(querySchema, 'query'), asyncHandler(controller.search))
export default router
