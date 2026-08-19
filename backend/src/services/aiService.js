import OpenAI from 'openai'
import { breakdownOutputSchema, parseOutputSchema, priorityOutputSchema, searchOutputSchema, summaryOutputSchema } from '../schemas/aiSchemas.js'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const cache = new Map()
const cacheTtl = Number(process.env.AI_CACHE_TTL_MS || 300000)
const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 10000)

function cacheKey(kind, input) { return `${kind}:${JSON.stringify(input)}` }
function fallback(value) { return { value, fallback: true } }
async function requestJson(kind, instructions, input, schema, safeValue) {
  const key = cacheKey(kind, input)
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.value
  if (!client) return fallback(safeValue)
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await client.chat.completions.create({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: instructions }, { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) }] }, { signal: controller.signal })
      const parsed = schema.safeParse(JSON.parse(response.choices[0].message.content || '{}'))
      if (!parsed.success) throw new Error('AI returned invalid structured output')
      const result = { value: parsed.data, fallback: false }
      cache.set(key, { value: result, expires: Date.now() + cacheTtl })
      return result
    } catch (error) { lastError = error; if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt))) } finally { clearTimeout(timer) }
  }
  console.warn(`AI ${kind} failed after retries: ${lastError?.message || 'unknown error'}`)
  return fallback(safeValue)
}

export function fallbackParse(text) {
  const lower = text.toLowerCase()
  const priority = lower.includes('high') || lower.includes('urgent') || lower.includes('asap') ? 'high' : lower.includes('low') || lower.includes('someday') ? 'low' : 'medium'
  const tags = [...new Set((lower.match(/#([a-z0-9-]+)/g) || []).map((tag) => tag.slice(1)))]
  const title = text.replace(/,?\s*(high|medium|low) priority/i, '').replace(/#([a-z0-9-]+)/g, '').trim()
  return { title: title || text, description: '', dueDate: null, priority, tags }
}
export function parseTask(text) { return requestJson('parse', 'Parse into JSON with title, description, dueDate (YYYY-MM-DD or null), priority (low/medium/high), and tags. Resolve relative dates from today, 2026-08-19.', text, parseOutputSchema, fallbackParse(text)) }
export function prioritizeTask(task) { return requestJson('prioritize', 'Return JSON with priority and reason. Use high for urgent risks/deadlines, medium for ordinary work, low for optional work.', task, priorityOutputSchema, { priority: 'medium', reason: 'Defaulted because AI is unavailable.' }) }
export function breakDownTask(task) { return requestJson('breakdown', 'Return JSON with subtasks: exactly 3 to 5 concise actionable task titles.', task, breakdownOutputSchema, { subtasks: ['Define the first step', 'Complete the main work', 'Review the result'] }) }
export function summarizeTasks(tasks) { const safe = { summary: tasks.length ? `You have ${tasks.length} pending task${tasks.length === 1 ? '' : 's'} due today.` : 'Nothing is due today. Enjoy the breathing room.' }; return requestJson('summary', 'Return JSON with a short natural-language summary, mentioning urgent work first.', tasks, summaryOutputSchema, safe) }
export function searchTasks(query) { return requestJson('search', 'Return JSON filters: search, status, priority, due (overdue/today/this-week), and tag. Use null when absent.', query, searchOutputSchema, { search: query, status: null, priority: null, due: null, tag: null }) }
