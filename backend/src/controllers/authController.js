import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, findUserById } from '../db/database.js'
import { HttpError, success } from '../utils/apiResponse.js'
import { signToken } from '../middleware/auth.js'

const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name })
export function signup(req, res) {
  if (findUserByEmail(req.body.email)) throw new HttpError(409, 'EMAIL_EXISTS', 'An account with that email already exists.')
  const user = createUser({ email: req.body.email, name: req.body.name, passwordHash: bcrypt.hashSync(req.body.password, 12) })
  return success(res, { user: publicUser(user), token: signToken(user) }, 201)
}
export function login(req, res) {
  const user = findUserByEmail(req.body.email)
  if (!user || !user.password_hash || !bcrypt.compareSync(req.body.password, user.password_hash)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
  return success(res, { user: publicUser(user), token: signToken(user) })
}
export function me(req, res) { return success(res, { user: publicUser(findUserById(req.user.id)) }) }
