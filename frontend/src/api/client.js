const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'daymark-token'

async function rawRequest(path, options = {}, authenticated = true) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (authenticated) { const token = await ensureSession(); if (token) headers.Authorization = `Bearer ${token}` }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) { const message = body?.error?.message || body?.error || 'Something went wrong.'; const error = new Error(message); error.status = response.status; throw error }
  return body?.success === true ? body.data : body
}

async function ensureSession() {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) return stored
  const guestId = crypto.randomUUID()
  const response = await rawRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ email: `guest-${guestId}@daymark.local`, name: 'Daymark user', password: `${guestId}-Daymark!` }) }, false)
  localStorage.setItem(TOKEN_KEY, response.token)
  return response.token
}

export const signup = async (account) => { const data = await rawRequest('/auth/signup', { method: 'POST', body: JSON.stringify(account) }, false); localStorage.setItem(TOKEN_KEY, data.token); return data }
export const login = async (account) => { const data = await rawRequest('/auth/login', { method: 'POST', body: JSON.stringify(account) }, false); localStorage.setItem(TOKEN_KEY, data.token); return data }
export const logout = () => localStorage.removeItem(TOKEN_KEY)
export const getTasks = (query = '') => rawRequest(`/tasks${query}`)
export const createTask = (task) => rawRequest('/tasks', { method: 'POST', body: JSON.stringify(task) })
export const updateTask = (id, task) => rawRequest(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })
export const setTaskStatus = (id, status) => rawRequest(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const removeTask = (id) => rawRequest(`/tasks/${id}`, { method: 'DELETE' })
export const parseTask = (text) => rawRequest('/ai/parse-task', { method: 'POST', body: JSON.stringify({ text }) })
export const prioritize = (task) => rawRequest('/ai/prioritize', { method: 'POST', body: JSON.stringify(task) })
export const breakdown = (task) => rawRequest('/ai/breakdown', { method: 'POST', body: JSON.stringify(task) })
export const dailySummary = () => rawRequest('/ai/daily-summary')
export const smartSearch = (query) => rawRequest(`/ai/search?q=${encodeURIComponent(query)}`)
