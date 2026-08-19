import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import tasksRouter from './routes/tasks.js'
import aiRouter from './routes/ai.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_, res) => res.json({ ok: true }))
app.use('/api/tasks', tasksRouter)
app.use('/api/ai', aiRouter)
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Unexpected server error.' }) })
export default app
