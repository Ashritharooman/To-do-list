import { listTasks, todayPendingTasks } from '../db/database.js'
import * as ai from '../services/aiService.js'
import { success } from '../utils/apiResponse.js'

export async function parseTask(req, res) { const result = await ai.parseTask(req.body.text); return success(res, { task: result.value, fallback: result.fallback }) }
export async function prioritize(req, res) { const result = await ai.prioritizeTask(req.body); return success(res, { suggestion: result.value, fallback: result.fallback }) }
export async function breakdown(req, res) { const result = await ai.breakDownTask(req.body); return success(res, { subtasks: result.value.subtasks.map((title) => ({ title, completed: false })), fallback: result.fallback }) }
export async function dailySummary(req, res) { const tasks = todayPendingTasks(req.user.id); const result = await ai.summarizeTasks(tasks); return success(res, { summary: result.value.summary, tasks, fallback: result.fallback }) }
export async function search(req, res) { const result = await ai.searchTasks(req.query.q); const filters = Object.fromEntries(Object.entries(result.value).filter(([, value]) => value !== null && value !== undefined && value !== '')); return success(res, { filters, ...listTasks(req.user.id, filters), fallback: result.fallback }) }
