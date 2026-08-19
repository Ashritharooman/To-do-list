const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Something went wrong.') }
  return response.status === 204 ? null : response.json()
}
export const getTasks = (query = '') => request(`/tasks${query}`)
export const createTask = (task) => request('/tasks', { method: 'POST', body: JSON.stringify(task) })
export const updateTask = (id, task) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })
export const setTaskStatus = (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const removeTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' })
export const parseTask = (text) => request('/ai/parse-task', { method: 'POST', body: JSON.stringify({ text }) })
export const prioritize = (task) => request('/ai/prioritize', { method: 'POST', body: JSON.stringify(task) })
export const breakdown = (task) => request('/ai/breakdown', { method: 'POST', body: JSON.stringify(task) })
export const dailySummary = () => request('/ai/daily-summary')
export const smartSearch = (query) => request(`/ai/search?q=${encodeURIComponent(query)}`)
