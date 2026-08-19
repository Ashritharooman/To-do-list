import { Router } from 'express'
import { listTasks, todayPendingTasks } from '../db/database.js'
import * as ai from '../services/aiService.js'

const router = Router()
const run = (handler) => async (req, res) => { try { res.json(await handler(req, res)) } catch (error) { res.status(503).json({ error: 'AI is unavailable right now.', fallback: true, detail: error.message }) } }
router.post('/parse-task', run(async (req) => { if (!req.body.text?.trim()) throw new Error('Text is required.'); try { return { task: await ai.parseTask(req.body.text) } } catch { return { task: ai.fallbackParse(req.body.text), fallback: true } } }))
router.post('/prioritize', run(async (req) => ({ suggestion: await ai.prioritizeTask(req.body) })))
router.post('/breakdown', run(async (req) => ({ subtasks: (await ai.breakDownTask(req.body)).subtasks })))
router.get('/daily-summary', run(async () => { const tasks = todayPendingTasks(); try { return { summary: (await ai.summarizeTasks(tasks)).summary, tasks } } catch { return { summary: tasks.length ? `You have ${tasks.length} pending task${tasks.length === 1 ? '' : 's'} due today.` : 'Nothing is due today. Enjoy the breathing room.', tasks, fallback: true } } }))
router.get('/search', run(async (req) => { const query = req.query.q?.trim(); if (!query) throw new Error('Query is required.'); try { const filters = await ai.searchTasks(query); return { filters, tasks: listTasks(filters) } } catch { return { filters: { search: query }, tasks: listTasks({ search: query }), fallback: true } } }))
export default router
