import { z } from 'zod'
const priority = z.enum(['low', 'medium', 'high'])
const status = z.enum(['pending', 'in-progress', 'completed'])
const subtask = z.object({ title: z.string().trim().min(1).max(240), completed: z.boolean() })
export const taskCreateSchema = z.object({ title: z.string().trim().min(1).max(240), description: z.string().trim().max(5000).default(''), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), priority: priority.default('medium'), status: status.default('pending'), tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]), subtasks: z.array(subtask).max(20).default([]), sortOrder: z.number().int().optional() }).strict()
export const taskUpdateSchema = taskCreateSchema.partial()
export const taskQuerySchema = z.object({ status: status.optional(), priority: priority.optional(), tag: z.string().trim().max(40).optional(), search: z.string().trim().max(200).optional(), due: z.enum(['overdue', 'today', 'this-week']).optional(), dueFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), dueTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0), sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'order']).default('order'), sortOrder: z.enum(['asc', 'desc']).default('asc') }).strict()
export const statusSchema = z.object({ status }).strict()
