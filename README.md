# Daymark

A full-stack to-do list with SQLite persistence, an AI command bar, Kanban/List views, persisted subtasks, and optional AI assistance.

## Requirements

- Node.js 18+
- npm
- An OpenAI API key is optional. The app remains usable without one.

## Setup

```bash
npm install
npm run install:all
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`.

On macOS/Linux, use `cp` instead of `copy` for the environment files.

## API

- `GET/POST /api/tasks`
- `GET/PATCH/DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `PATCH /api/tasks/:id` also accepts `status` (`pending`, `in-progress`, or `completed`), `subtasks`, and `sortOrder`
- `POST /api/ai/parse-task`
- `POST /api/ai/prioritize`
- `POST /api/ai/breakdown`
- `GET /api/ai/daily-summary`
- `GET /api/ai/search?q=...`

## Frontend features

- `Cmd/Ctrl+K` or `n` opens the AI command bar. `Enter` creates the structured task and `Esc` closes it.
- Inline command-bar chips suggest priority, due date, and tags; each can be accepted or dismissed.
- List and Kanban views are switchable. Tasks can be dragged between To do, In progress, and Done columns.
- Task cards can generate and persist 3–5 AI subtasks, with expandable checklists and progress bars.
- The daily briefing widget supports regeneration and displays a loading skeleton.
- Dark mode is persisted in `localStorage`; `/` focuses task search.
- Toasts cover creation, completion, deletion, AI failures, and persistence updates.

## Component tree

```text
App
├── Header
├── DailyBriefing
├── SmartCapture
├── WorkspaceToolbar
├── ListView / KanbanBoard
│   └── TaskCard
│       └── SubtaskChecklist
├── CommandBar
└── ToastContainer
```

## AI behavior

`backend/src/services/aiService.js` keeps all provider-specific code behind a small pluggable interface. Each prompt requests strict JSON. Smart capture parses title, description, date, priority, and tags; prioritization returns a level and reason; breakdown returns 3–5 subtasks; daily summary receives today's pending tasks; smart search converts natural language into safe task filters.

When `OPENAI_API_KEY` is absent or a provider request fails, smart capture uses local priority/tag parsing, daily summary uses a local count, and search falls back to keyword matching. Other AI actions report a recoverable unavailable state while CRUD continues to work.
