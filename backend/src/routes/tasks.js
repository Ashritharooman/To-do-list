import { Router } from 'express'
import { createTask, deleteTask, getTask, listTasks, updateTask } from '../db/database.js'

const router = Router()
const priorities = ['low', 'medium', 'high']
const statuses = ['pending', 'in-progress', 'completed']
function validateTask(input, partial = false) {
  if (!partial && (!input.title || typeof input.title !== 'string' || !input.title.trim())) return 'A title is required.'
  if (input.priority && !priorities.includes(input.priority)) return 'Priority must be low, medium, or high.'
  if (input.status && !statuses.includes(input.status)) return 'Status must be pending or completed.'
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return 'Due date must use YYYY-MM-DD.'
  if (input.tags && (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== 'string'))) return 'Tags must be an array of strings.'
  if (input.subtasks && (!Array.isArray(input.subtasks) || input.subtasks.some((subtask) => !subtask || typeof subtask.title !== 'string' || typeof subtask.completed !== 'boolean'))) return 'Subtasks must contain a title and completed state.'
  if (input.sortOrder !== undefined && !Number.isInteger(input.sortOrder)) return 'Sort order must be an integer.'
  return null
}
const normalize = (input, partial = false) => {
  const task = {
    title: input.title?.trim(),
    description: input.description?.trim(),
    dueDate: input.dueDate,
    priority: input.priority,
    status: input.status,
    tags: input.tags
    ,subtasks: input.subtasks
    ,sortOrder: input.sortOrder
  }
  if (partial) return Object.fromEntries(Object.entries(task).filter(([, value]) => value !== undefined))
  return { title: task.title, description: task.description || '', dueDate: task.dueDate || null, priority: task.priority || 'medium', status: task.status || 'pending', tags: task.tags || [] }
}

router.get('/', (req, res) => res.json({ tasks: listTasks(req.query) }))
router.get('/:id', (req, res) => { const task = getTask(Number(req.params.id)); if (!task) return res.status(404).json({ error: 'Task not found.' }); res.json({ task }) })
router.post('/', (req, res) => { const error = validateTask(req.body); if (error) return res.status(400).json({ error }); res.status(201).json({ task: createTask(normalize(req.body)) }) })
router.patch('/:id', (req, res) => { const error = validateTask(req.body, true); if (error) return res.status(400).json({ error }); const task = updateTask(Number(req.params.id), normalize(req.body, true)); if (!task) return res.status(404).json({ error: 'Task not found.' }); res.json({ task }) })
router.patch('/:id/status', (req, res) => { if (!statuses.includes(req.body.status)) return res.status(400).json({ error: 'Status must be pending, in-progress, or completed.' }); const task = updateTask(Number(req.params.id), { status: req.body.status }); if (!task) return res.status(404).json({ error: 'Task not found.' }); res.json({ task }) })
router.delete('/:id', (req, res) => { if (!deleteTask(Number(req.params.id))) return res.status(404).json({ error: 'Task not found.' }); res.status(204).end() })
export default router
