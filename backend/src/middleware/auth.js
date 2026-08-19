import jwt from 'jsonwebtoken'
import { findUserById } from '../db/database.js'
import { HttpError } from '../utils/apiResponse.js'

const secret = process.env.JWT_SECRET || 'development-only-change-me'
export function signToken(user) { return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }) }
export function requireAuth(req, _res, next) {
  const header = req.get('authorization')
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'AUTH_REQUIRED', 'A Bearer token is required.'))
  try {
    const payload = jwt.verify(header.slice(7), secret)
    const user = findUserById(Number(payload.sub))
    if (!user) throw new Error('User not found')
    req.user = user
    next()
  } catch { next(new HttpError(401, 'INVALID_TOKEN', 'Your session is invalid or expired.')) }
}
