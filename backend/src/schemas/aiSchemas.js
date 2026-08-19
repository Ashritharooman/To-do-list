import { z } from 'zod'
export const textSchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict()
export const querySchema = z.object({ q: z.string().trim().min(1).max(2000) }).strict()
export const taskInputSchema = z.object({ title: z.string().trim().min(1).max(240), description: z.string().max(5000).optional(), dueDate: z.string().nullable().optional(), priority: z.enum(['low', 'medium', 'high']).optional(), tags: z.array(z.string()).optional() }).passthrough()
export const parseOutputSchema = z.object({ title: z.string().trim().min(1).max(240), description: z.string().max(5000).default(''), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null), priority: z.enum(['low', 'medium', 'high']).default('medium'), tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]) })
export const priorityOutputSchema = z.object({ priority: z.enum(['low', 'medium', 'high']), reason: z.string().max(500).default('') })
export const breakdownOutputSchema = z.object({ subtasks: z.array(z.string().trim().min(1).max(240)).min(3).max(5) })
export const summaryOutputSchema = z.object({ summary: z.string().trim().min(1).max(1000) })
export const searchOutputSchema = z.object({ search: z.string().nullable().default(null), status: z.enum(['pending', 'in-progress', 'completed']).nullable().default(null), priority: z.enum(['low', 'medium', 'high']).nullable().default(null), due: z.enum(['overdue', 'today', 'this-week']).nullable().default(null), tag: z.string().nullable().default(null) })
