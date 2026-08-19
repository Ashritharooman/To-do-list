import OpenAI from 'openai'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

async function askJson(instructions, input) {
  if (!client) throw new Error('AI is not configured')
  const response = await client.chat.completions.create({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: instructions }, { role: 'user', content: input }] })
  return JSON.parse(response.choices[0].message.content)
}

export async function parseTask(text) {
  return askJson('Parse the task into JSON with title, description, dueDate (YYYY-MM-DD or null), priority (low/medium/high), and tags (array of strings). Resolve relative dates from today, which is 2026-08-19. Do not invent missing details.', text)
}
export async function prioritizeTask(task) {
  return askJson('Suggest JSON with priority (low/medium/high) and reason. Use high for deadlines, risks, or urgent cues; medium for ordinary work; low for optional tasks.', JSON.stringify(task))
}
export async function breakDownTask(task) {
  return askJson('Return JSON with subtasks: an array of 3 to 5 concise actionable task titles. Do not include explanations.', JSON.stringify(task))
}
export async function summarizeTasks(tasks) {
  return askJson('Return JSON with summary: a short, natural-language summary of the pending tasks. Mention the most urgent work first.', JSON.stringify(tasks))
}
export async function searchTasks(query) {
  return askJson('Interpret a task search into JSON fields: search, status (pending/completed/null), priority (low/medium/high/null), due (overdue/today/this-week/null), and tag (string/null).', query)
}

export function fallbackParse(text) {
  const lower = text.toLowerCase()
  const priority = lower.includes('high') || lower.includes('urgent') || lower.includes('asap') ? 'high' : lower.includes('low') || lower.includes('someday') ? 'low' : 'medium'
  const tags = [...new Set((lower.match(/#([a-z0-9-]+)/g) || []).map((tag) => tag.slice(1)))]
  const title = text.replace(/,?\s*(high|medium|low) priority/i, '').replace(/#([a-z0-9-]+)/g, '').trim()
  return { title: title || text, description: '', dueDate: null, priority, tags }
}
