import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const databasePath = process.env.DATABASE_PATH || './data/todos.db'
const resolvedPath = path.resolve(process.cwd(), databasePath)
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

export const db = new Database(resolvedPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`)

function createTasksTable() {
  db.exec(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
    tags TEXT NOT NULL DEFAULT '[]',
    subtasks TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
}

const taskTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get()
if (!taskTable) createTasksTable()
else if (!taskTable.sql.includes('user_id') || !taskTable.sql.includes('deleted_at')) {
  const now = new Date().toISOString()
  const legacyEmail = process.env.LEGACY_USER_EMAIL || 'legacy@daymark.local'
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(legacyEmail)
  const legacyUserId = existingUser?.id || db.prepare('INSERT INTO users (email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(legacyEmail, 'Legacy user', '', now, now).lastInsertRowid
  db.transaction(() => {
    db.exec('ALTER TABLE tasks RENAME TO tasks_legacy')
    createTasksTable()
    db.exec(`INSERT INTO tasks (id, user_id, title, description, due_date, priority, status, tags, created_at, updated_at)
      SELECT id, ${Number(legacyUserId)}, title, description, due_date, priority,
      CASE WHEN status = 'completed' THEN 'completed' ELSE 'pending' END,
      tags, created_at, updated_at FROM tasks_legacy`)
    db.exec('DROP TABLE tasks_legacy')
  })()
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(user_id, deleted_at);
`)

function parseJson(value, fallback) { try { return JSON.parse(value || '') } catch { return fallback } }
const hydrate = (row) => row ? { ...row, tags: parseJson(row.tags, []), subtasks: parseJson(row.subtasks, []) } : null

export function findUserByEmail(email) { return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) }
export function findUserById(id) { return db.prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?').get(id) }
export function createUser({ email, name, passwordHash }) {
  const now = new Date().toISOString()
  const result = db.prepare('INSERT INTO users (email, name, password_hash, created_at, updated_at) VALUES (@email, @name, @passwordHash, @now, @now)').run({ email: email.toLowerCase(), name, passwordHash, now })
  return findUserById(result.lastInsertRowid)
}

export function listTasks(userId, filters = {}) {
  const clauses = ['user_id = @userId', 'deleted_at IS NULL']
  const values = { userId }
  if (filters.status) { clauses.push('status = @status'); values.status = filters.status }
  if (filters.priority) { clauses.push('priority = @priority'); values.priority = filters.priority }
  if (filters.tag) { clauses.push('EXISTS (SELECT 1 FROM json_each(tasks.tags) WHERE value = @tag)'); values.tag = filters.tag }
  if (filters.search) { clauses.push('(title LIKE @search OR description LIKE @search OR tags LIKE @search)'); values.search = `%${filters.search}%` }
  if (filters.due === 'overdue') clauses.push("due_date < date('now') AND status != 'completed'")
  if (filters.due === 'today') clauses.push("due_date = date('now')")
  if (filters.due === 'this-week') clauses.push("due_date >= date('now') AND due_date <= date('now', '+7 day')")
  if (filters.dueFrom) { clauses.push('due_date >= @dueFrom'); values.dueFrom = filters.dueFrom }
  if (filters.dueTo) { clauses.push('due_date <= @dueTo'); values.dueTo = filters.dueTo }
  const allowedSort = { dueDate: 'due_date', priority: "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END", createdAt: 'created_at', order: 'sort_order' }
  const sort = allowedSort[filters.sortBy] || 'sort_order'
  const direction = filters.sortOrder === 'desc' ? 'DESC' : 'ASC'
  const where = clauses.join(' AND ')
  const total = db.prepare(`SELECT COUNT(*) AS count FROM tasks WHERE ${where}`).get(values).count
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
  const offset = Math.max(Number(filters.offset) || 0, 0)
  const rows = db.prepare(`SELECT * FROM tasks WHERE ${where} ORDER BY ${sort} ${direction}, created_at DESC LIMIT @limit OFFSET @offset`).all({ ...values, limit, offset }).map(hydrate)
  return { tasks: rows, pagination: { limit, offset, total, hasMore: offset + rows.length < total } }
}
export function getTask(userId, id) { return hydrate(db.prepare('SELECT * FROM tasks WHERE user_id = ? AND id = ? AND deleted_at IS NULL').get(userId, id)) }
export function createTask(userId, input) {
  const now = new Date().toISOString()
  const result = db.prepare(`INSERT INTO tasks (user_id, title, description, due_date, priority, status, tags, subtasks, sort_order, created_at, updated_at)
    VALUES (@userId, @title, @description, @dueDate, @priority, @status, @tags, @subtasks, @sortOrder, @now, @now)`).run({ userId, title: input.title, description: input.description || '', dueDate: input.dueDate || null, priority: input.priority || 'medium', status: input.status || 'pending', tags: JSON.stringify(input.tags || []), subtasks: JSON.stringify(input.subtasks || []), sortOrder: input.sortOrder || 0, now })
  return getTask(userId, result.lastInsertRowid)
}
export function updateTask(userId, id, input) {
  const current = getTask(userId, id)
  if (!current) return null
  const next = { ...current, dueDate: current.due_date, sortOrder: current.sort_order, ...input }
  db.prepare(`UPDATE tasks SET title=@title, description=@description, due_date=@dueDate, priority=@priority, status=@status,
    tags=@tags, subtasks=@subtasks, sort_order=@sortOrder, updated_at=@now WHERE user_id=@userId AND id=@id AND deleted_at IS NULL`).run({ userId, id, title: next.title, description: next.description || '', dueDate: next.dueDate || null, priority: next.priority, status: next.status, tags: JSON.stringify(next.tags || []), subtasks: JSON.stringify(next.subtasks || []), sortOrder: next.sortOrder || 0, now: new Date().toISOString() })
  return getTask(userId, id)
}
export function softDeleteTask(userId, id) { return db.prepare("UPDATE tasks SET deleted_at = @now, updated_at = @now WHERE user_id = @userId AND id = @id AND deleted_at IS NULL").run({ userId, id, now: new Date().toISOString() }).changes > 0 }
export function todayPendingTasks(userId) { return listTasks(userId, { status: 'pending', due: 'today', limit: 100 }).tasks }
