import { createTask, getTask, listTasks, softDeleteTask, updateTask } from '../db/database.js'
import { HttpError, success } from '../utils/apiResponse.js'

export function list(req, res) { return success(res, listTasks(req.user.id, req.query)) }
export function get(req, res) { const task = getTask(req.user.id, Number(req.params.id)); if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.'); return success(res, { task }) }
export function create(req, res) { return success(res, { task: createTask(req.user.id, req.body) }, 201) }
export function update(req, res) { const task = updateTask(req.user.id, Number(req.params.id), req.body); if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.'); return success(res, { task }) }
export function remove(req, res) { if (!softDeleteTask(req.user.id, Number(req.params.id))) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.'); return res.status(204).end() }
