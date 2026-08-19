import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test, { after, before } from 'node:test'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daymark-test-'))
process.env.DATABASE_PATH = path.join(tempDir, 'test.db')
process.env.JWT_SECRET = 'test-secret'
process.env.OPENAI_API_KEY = ''
const { default: app } = await import('../src/app.js')
const { db } = await import('../src/db/database.js')
let server
let baseUrl

before(async () => { server = app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api` })
after(() => { server.close(); db.close(); fs.rmSync(tempDir, { recursive: true, force: true }) })
async function request(path, options = {}) { const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); return { status: response.status, body: await response.json().catch(() => null) } }

test('signup and login return JWT credentials', async () => {
  const signup = await request('/auth/signup', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', name: 'Test User', password: 'password-123' }) })
  assert.equal(signup.status, 201); assert.equal(signup.body.success, true); assert.ok(signup.body.data.token)
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password-123' }) })
  assert.equal(login.status, 200); assert.ok(login.body.data.token)
})

test('authenticated task CRUD is scoped and soft deletes', async () => {
  const auth = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password-123' }) })
  const token = auth.body.data.token
  const headers = { Authorization: `Bearer ${token}` }
  const created = await request('/tasks', { method: 'POST', headers, body: JSON.stringify({ title: 'Private task', priority: 'high', tags: ['test'] }) })
  assert.equal(created.status, 201); assert.equal(created.body.data.task.title, 'Private task')
  const listed = await request('/tasks?limit=10', { headers })
  assert.equal(listed.body.data.tasks.length, 1); assert.equal(listed.body.data.pagination.total, 1)
  const removed = await request(`/tasks/${created.body.data.task.id}`, { method: 'DELETE', headers })
  assert.equal(removed.status, 204)
  const afterDelete = await request('/tasks', { headers })
  assert.equal(afterDelete.body.data.tasks.length, 0)
})

test('AI parse endpoint returns a validated fallback without OpenAI', async () => {
  const auth = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password-123' }) })
  const result = await request('/ai/parse-task', { method: 'POST', headers: { Authorization: `Bearer ${auth.body.data.token}` }, body: JSON.stringify({ text: 'Call the dentist, high priority #health' }) })
  assert.equal(result.status, 200); assert.equal(result.body.success, true); assert.equal(result.body.data.fallback, true); assert.equal(result.body.data.task.priority, 'high')
})
