import { Router } from 'express'
import { login, me, signup } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, signupSchema } from '../schemas/authSchemas.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.post('/signup', validate(signupSchema), asyncHandler(signup))
router.post('/login', validate(loginSchema), asyncHandler(login))
router.get('/me', requireAuth, asyncHandler(me))
export default router
