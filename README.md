# Client Request Desk

A production-style web application for local businesses to manage client requests. Team members receive customer requests, review them, and convert approved (QUALIFIED) requests into actionable work items.

## Architecture

```
client-request-desk/
├── client/          # React 18 + TypeScript + Vite + Tailwind CSS (SPA)
└── server/          # Node.js + Express + TypeScript + SQLite
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, TypeScript (tsx for dev) |
| Database | SQLite via better-sqlite3 (synchronous, no ORM) |
| Auth | express-session + bcrypt, SQLite session store |
| Validation | Zod (server-side) |
| Testing | Vitest + Supertest (backend), Vitest + RTL (frontend) |
| Monorepo | npm workspaces |

### Database Schema

- **workspaces** — multi-tenant isolation unit
- **users** — email/password auth, workspace-scoped
- **requests** — core entity with status lifecycle (NEW → QUALIFIED → CLOSED)
- **work_items** — created from QUALIFIED requests (1:1)
- **activity_log** — immutable audit trail for every mutation

## Key Decisions & Trade-offs

### Multi-tenant Workspace Isolation
Every SQL query is `WHERE workspace_id = ?` bound to `req.user.workspaceId` from the session — never from URL params or request body. This prevents any cross-workspace data leakage.

### Status Transitions
Only three valid transitions:
- `NEW → QUALIFIED`
- `NEW → CLOSED`
- `QUALIFIED → CLOSED`

`CLOSED` is terminal. All other transitions return `422 Unprocessable Entity`.

### Conversion Flow
`POST /requests/:id/convert` creates a work item but does **not** change the request's status (stays `QUALIFIED`). Validations:
- Request must be `QUALIFIED` → 422
- `scheduled_date` must be set → 422
- Cannot convert twice (UNIQUE constraint on `request_id`) → 409

### SQLite Synchronous Access
`better-sqlite3` is used synchronously — no async/await for DB operations. This simplifies the code considerably and is perfectly adequate for the expected load of a local-business tool.

### Session Auth vs JWT
Session cookies with SQLite backing store were chosen over JWTs because:
1. Simpler logout (destroy server-side session)
2. No token refresh complexity
3. Works well for a web app (not a mobile/API-first product)

## Assumptions

1. Single user per workspace in the seed (easily extensible)
2. No pagination on request lists (acceptable for small teams)
3. `scheduled_date` is stored as `TEXT` in `YYYY-MM-DD` format (SQLite has no native DATE type)
4. All times stored as ISO 8601 UTC strings

## What I'd Improve With More Time

1. **Pagination** — Add cursor-based pagination to the request list
2. **Real-time updates** — WebSocket or SSE for live activity feed
3. **Role-based access control** — Admin vs. team member roles
4. **Email notifications** — Notify customers on status changes
5. **File attachments** — Allow attaching photos/docs to requests
6. **Search & filters** — Full-text search across customer names and descriptions
7. **CI/CD pipeline** — GitHub Actions for test + build + deploy
8. **Docker** — Containerize for consistent deployment
9. **Rate limiting** — Protect login endpoint from brute force
10. **Optimistic updates** — Improve UX by updating UI before server confirms

## AI Tools Disclosure

This application was built with AI assistance (Google Gemini) for scaffolding, boilerplate generation, and code structure guidance. All business logic, architecture decisions, and security considerations were designed according to the assignment requirements.

---

## Demo Credentials

| Workspace | Email | Password |
|-----------|-------|----------|
| Acme Corp | alice@acme.com | acme1234 |
| Globe Ltd | bob@globeltd.com | globe1234 |

---

## Setup & Running

### Prerequisites
- Node.js 20+
- npm 9+

### Install Dependencies

```bash
npm install
```

### Environment Setup

```bash
cp .env.example server/.env
# Edit server/.env if needed (defaults work for development)
```

### Seed Database

```bash
npm run seed
```

### Development (both client + server)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Vite proxies `/api` requests to the backend automatically

### Run Tests

```bash
# All tests
npm test

# Backend tests only
npm run test:server

# Frontend tests only
npm run test:client
```

### Production Build

```bash
npm run build
npm start
```

The server serves the built frontend from `client/dist` in production.

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both client (Vite) and server (tsx watch) |
| `npm run build` | Build client (Vite) + server (tsc) |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:server` | Run backend tests (Vitest + Supertest) |
| `npm run test:client` | Run frontend tests (Vitest + RTL) |
| `npm run seed` | Seed the database with demo data |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user + workspace |
| GET | `/api/requests?status=` | List requests (workspace-scoped) |
| POST | `/api/requests` | Create new request |
| GET | `/api/requests/:id` | Request detail + activity timeline |
| PATCH | `/api/requests/:id` | Update request fields and/or status |
| POST | `/api/requests/:id/convert` | Convert QUALIFIED request → work item |
| GET | `/api/work-items` | List work items (workspace-scoped) |
