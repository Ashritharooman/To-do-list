# Daymark

A full-stack AI-assisted to-do list with React/Vite, Express, SQLite, JWT authentication, and optional OpenAI integration.

## Structure

```text
backend/src/
├── controllers/       Route-level request orchestration
├── db/                SQLite schema, migration, and models
├── middleware/        JWT auth, validation, logging, rate limits
├── routes/            auth, tasks, and AI REST routes
├── schemas/           Zod request/output schemas
├── services/          AI provider and business services
└── utils/             API response and async helpers
frontend/src/
├── api/client.js      JWT-aware API client
├── App.jsx            Task interface
└── styles/index.css   Responsive styling
```

## Setup

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run install:all
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env
npm run migrate --prefix backend
npm run dev
```

On macOS/Linux, use `cp` instead of `copy` for the environment files. Open `http://localhost:5173`; the API runs on `http://localhost:3001`.

The migration runs automatically when the backend starts. `npm run migrate --prefix backend` is a safe explicit migration command. Existing pre-authentication tasks are assigned to `LEGACY_USER_EMAIL` or `legacy@daymark.local`.

## Environment

`backend/.env`:

```env
PORT=3001
DATABASE_PATH=./data/todos.db
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
LEGACY_USER_EMAIL=legacy@daymark.local
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=10000
AI_RATE_LIMIT=20
AI_CACHE_TTL_MS=300000
CLIENT_ORIGIN=http://localhost:5173
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

Never commit `.env` files or real secrets. The frontend creates a per-browser guest account automatically when no token exists, preserving the existing no-login task workflow. Explicit signup/login endpoints are available for a future account UI.

## API response format

Successful responses:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Errors use HTTP status `400`, `401`, `404`, `409`, `429`, `503`, or `500` and this shape:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": {}
  }
}
```

## API routes

### Authentication

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| `POST` | `/api/auth/signup` | No | Create a user and return a JWT |
| `POST` | `/api/auth/login` | No | Authenticate and return a JWT |
| `GET` | `/api/auth/me` | Yes | Return the current user |

Send authenticated requests with `Authorization: Bearer <token>`.

### Tasks

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| `GET` | `/api/tasks` | Yes | Paginated and filtered task list |
| `GET` | `/api/tasks/:id` | Yes | Read one user-owned task |
| `POST` | `/api/tasks` | Yes | Create a task |
| `PATCH` | `/api/tasks/:id` | Yes | Update task fields |
| `PATCH` | `/api/tasks/:id/status` | Yes | Change status |
| `DELETE` | `/api/tasks/:id` | Yes | Soft delete a task |

`GET /api/tasks` supports `status`, `priority`, `tag`, `search`, `due`, `dueFrom`, `dueTo`, `limit`, `offset`, `sortBy`, and `sortOrder`. Task status is `pending`, `in-progress`, or `completed`. Existing title, description, due date, priority, tags, and subtasks fields remain supported.

### AI

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| `POST` | `/api/ai/parse-task` | Yes | Parse natural language into task fields |
| `POST` | `/api/ai/prioritize` | Yes | Suggest a priority |
| `POST` | `/api/ai/breakdown` | Yes | Generate 3–5 subtasks |
| `GET` | `/api/ai/daily-summary` | Yes | Summarize today’s pending tasks |
| `GET` | `/api/ai/search?q=...` | Yes | Convert natural language to filters |

AI endpoints are limited to 20 requests per user per hour by default. OpenAI calls timeout after 10 seconds, retry twice with exponential backoff, cache identical requests for five minutes, and validate JSON with Zod. Missing keys, timeouts, provider errors, and invalid output use safe local fallbacks.

### Health

- `GET /health`
- `GET /api/health`

Both report API and SQLite availability.

## Database changes

The migration creates:

- `users`: id, email, name, bcrypt password hash, timestamps
- `tasks`: user ownership, title, description, due date, priority, status, tags, subtasks, ordering, soft-delete timestamp, timestamps

Indexes cover user ownership, user/status, user/due date, user/priority, and active tasks. Existing legacy task tables are migrated and assigned to the configured legacy user.

## Testing

```bash
npm test --prefix backend
```

The integration suite uses an isolated temporary SQLite database and covers signup/login, authenticated task CRUD, pagination, soft deletion, and the AI parse fallback without requiring an OpenAI key.
