import { z } from 'zod'
export const signupSchema = z.object({ email: z.string().trim().email().max(254), name: z.string().trim().min(1).max(80), password: z.string().min(8).max(128) }).strict()
export const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict()
