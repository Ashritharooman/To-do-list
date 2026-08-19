import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import tasksRouter from './routes/tasks.js'
import aiRouter from './routes/ai.js'
import { db } from './db/database.js'
import { requestLogger } from './middleware/requestLogger.js'
import { failure } from './utils/apiResponse.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)
const health = (_, res) => { try { db.prepare('SELECT 1').get(); res.json({ success: true, data: { ok: true, database: 'ok' }, error: null }) } catch { res.status(503).json({ success: false, data: null, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable.' } }) } }
app.get('/health', health)
app.get('/api/health', health)
app.use('/api/auth', authRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/ai', aiRouter)
app.use((error, _req, res, _next) => { console.error(error); const status = error.status || 500; return failure(res, status, error.code || 'INTERNAL_ERROR', status === 500 ? 'Unexpected server error.' : error.message, error.details || null) })
export default app
