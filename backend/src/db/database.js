import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const databasePath = process.env.DATABASE_PATH || './data/todos.db'
const resolvedPath = path.resolve(process.cwd(), databasePath)
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

const db = new Database(resolvedPath)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
    tags TEXT NOT NULL DEFAULT '[]',
    subtasks TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const existingSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get()?.sql || ''
if (existingSchema.includes("CHECK(priority IN ('low', 'medium', 'high'))") && existingSchema.includes("CHECK(status IN ('pending', 'completed'))")) {
  db.exec(`
    CREATE TABLE tasks_migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
      tags TEXT NOT NULL DEFAULT '[]',
      subtasks TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO tasks_migrated (id, title, description, due_date, priority, status, tags, created_at, updated_at)
      SELECT id, title, description, due_date, priority, status, tags, created_at, updated_at FROM tasks;
    DROP TABLE tasks;
    ALTER TABLE tasks_migrated RENAME TO tasks;
  `)
}

for (const statement of [
  "ALTER TABLE tasks ADD COLUMN subtasks TEXT NOT NULL DEFAULT '[]'",
  'ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'
]) {
  try { db.exec(statement) } catch (error) { if (!error.message.includes('duplicate column name')) throw error }
}

const hydrate = (row) => row ? { ...row, tags: JSON.parse(row.tags || '[]'), subtasks: JSON.parse(row.subtasks || '[]') } : null

export function listTasks(filters = {}) {
  const clauses = []
  const values = {}
  if (filters.status) { clauses.push('status = @status'); values.status = filters.status }
  if (filters.priority) { clauses.push('priority = @priority'); values.priority = filters.priority }
  if (filters.tag) { clauses.push('EXISTS (SELECT 1 FROM json_each(tasks.tags) WHERE value = @tag)'); values.tag = filters.tag }
  if (filters.search) { clauses.push('(title LIKE @search OR description LIKE @search OR tags LIKE @search)'); values.search = `%${filters.search}%` }
  if (filters.due === 'overdue') { clauses.push("due_date < date('now') AND status = 'pending'") }
  if (filters.due === 'today') { clauses.push("due_date = date('now')") }
  if (filters.due === 'this-week') { clauses.push("due_date >= date('now') AND due_date <= date('now', '+7 day')") }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return db.prepare(`SELECT * FROM tasks ${where} ORDER BY sort_order, status = 'completed', CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date IS NULL, due_date, created_at DESC`).all(values).map(hydrate)
}

export function getTask(id) { return hydrate(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)) }

export function createTask(input) {
  const now = new Date().toISOString()
  const result = db.prepare('INSERT INTO tasks (title, description, due_date, priority, status, tags, subtasks, sort_order, created_at, updated_at) VALUES (@title, @description, @dueDate, @priority, @status, @tags, @subtasks, @sortOrder, @createdAt, @updatedAt)').run({ ...input, tags: JSON.stringify(input.tags || []), subtasks: JSON.stringify(input.subtasks || []), sortOrder: input.sortOrder || 0, createdAt: now, updatedAt: now })
  return getTask(result.lastInsertRowid)
}

export function updateTask(id, input) {
  const current = getTask(id)
  if (!current) return null
  const next = { ...current, dueDate: current.due_date, sortOrder: current.sort_order, ...input, updatedAt: new Date().toISOString() }
  db.prepare('UPDATE tasks SET title=@title, description=@description, due_date=@dueDate, priority=@priority, status=@status, tags=@tags, subtasks=@subtasks, sort_order=@sortOrder, updated_at=@updatedAt WHERE id=@id').run({ id, title: next.title, description: next.description || '', dueDate: next.dueDate || null, priority: next.priority || 'medium', status: next.status || 'pending', tags: JSON.stringify(next.tags || []), subtasks: JSON.stringify(next.subtasks || []), sortOrder: next.sortOrder || 0, updatedAt: next.updatedAt })
  return getTask(id)
}

export function deleteTask(id) { return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0 }

export function todayPendingTasks() { return listTasks({ status: 'pending', due: 'today' }) }
