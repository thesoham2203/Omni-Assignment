# Client Request Desk

Client Request Desk is a small full-stack application for local businesses to receive customer requests, review them, and convert approved requests into work items.

The app is workspace-aware: each signed-in user belongs to one workspace, and every request, work item, and activity record is scoped to that workspace.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
npm install
```

### Environment

```bash
cp .env.example server/.env
```

The defaults in `.env.example` work for local development. Do not commit `server/.env`.

### Docker

With Docker Engine and Docker Compose installed:

```bash
docker compose up --build
```

The application is available at http://localhost:3001. SQLite data is persisted in `server/data`. Stop the stack with `docker compose down`; remove the local database separately when a fresh seed is needed.

### Seed the Database

```bash
npm run seed
```

The seed creates two workspaces, one user in each workspace, and sample customer requests.

| Workspace | Email | Password |
| --- | --- | --- |
| Acme Corp | `alice@acme.com` | `acme1234` |
| Globe Ltd | `bob@globeltd.com` | `globe1234` |

### Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Vite proxies `/api` calls to the backend.

### Tests

```bash
npm test
npm run test:server
npm run test:client
```

### Production Build

```bash
npm run build
npm start
```

The production server serves the built frontend from `client/dist`.

## Architecture

```text
client-request-desk/
|-- client/   React 18 + TypeScript + Vite + Tailwind CSS
|-- server/   Node.js + Express + TypeScript + SQLite
|-- package.json
|-- .env.example
|-- README.md
```

### Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite with `better-sqlite3` |
| Auth | Mock email/password login with `express-session` and bcrypt |
| Validation | Zod on the API boundary |
| Testing | Vitest, Supertest, React Testing Library |
| Repository | npm workspaces with `client` and `server` packages |

### Data Model

- `workspaces`: tenant boundary.
- `users`: authenticated users, each tied to a workspace.
- `requests`: customer requests with `NEW`, `QUALIFIED`, or `CLOSED` status.
- `work_items`: one work item per converted request.
- `activity_log`: append-only timeline for creates, updates, status changes, and conversions.

The schema is defined in `server/src/db/migrate.ts`. Seed data is defined in `server/src/db/seed.ts`.

## Assignment Requirement Coverage

### Workspace-Aware API

- Seeds two workspaces, one user per workspace, and sample requests.
- Provides mock session authentication through `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`.
- Supports listing, creating, viewing, and updating customer requests.
- Supports request statuses `NEW`, `QUALIFIED`, and `CLOSED`.
- Converts a `QUALIFIED` request into a work item.
- Prevents cross-workspace reads and writes by deriving `workspaceId` from the authenticated session, never from request input.
- Uses Zod validation and returns useful HTTP errors such as `400`, `401`, `404`, `409`, and `422`.

### Human-Confirmed Action

The frontend conversion modal shows:

- customer name
- requested service
- scheduled date

The backend conversion endpoint:

- rejects non-`QUALIFIED` requests with `422`
- rejects requests without `scheduled_date` with `422`
- prevents duplicate conversion with a unique `work_items.request_id` constraint and an idempotent `200` response for retries
- writes an activity entry recording the conversion

### Frontend

The React app includes:

- login screen
- protected routes
- request list with status filtering
- request detail page with activity timeline
- create and edit request forms
- work item list
- confirmed conversion flow
- loading, empty, validation, and API error states
- responsive layout for desktop and mobile widths

### Tests

Backend tests cover the highest-risk assignment requirements:

- workspace isolation
- duplicate conversion prevention
- conversion validation
- status transition validation
- request validation errors

Frontend tests cover the conversion confirmation interaction, including required confirmation details, disabled state when a scheduled date is missing, success flow, and API error display.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Log in with seeded credentials |
| `POST` | `/api/auth/logout` | Destroy the current session |
| `GET` | `/api/auth/me` | Return current user and workspace |
| `GET` | `/api/requests?status=NEW` | List workspace-scoped requests with optional status filter |
| `POST` | `/api/requests` | Create a customer request |
| `GET` | `/api/requests/:id` | View request details, activity timeline, and work item state |
| `PATCH` | `/api/requests/:id` | Update request fields or status |
| `POST` | `/api/requests/:id/convert` | Convert a qualified request into a work item |
| `GET` | `/api/work-items` | List workspace-scoped work items |

## Key Decisions

### Workspace Isolation

The API never trusts a workspace ID from the client. After login, the session identifies the user and workspace. Route handlers always query using `WHERE workspace_id = ?` with the session workspace ID.

If a user manually changes a request ID in the URL to another workspace's request, the query returns no record and the API responds with `404`.

### Conversion Idempotency

`work_items.request_id` is unique. Conversion checks for an existing work item and inserts inside one SQLite transaction, so retries and concurrent submissions return the same work item instead of creating duplicates. The first call returns `201`; later calls return `200` with `alreadyExisted: true`.

### Status Rules

Allowed transitions:

- `NEW` to `QUALIFIED`
- `NEW` to `CLOSED`
- `QUALIFIED` to `CLOSED`

`CLOSED` is terminal. Conversion creates a work item but leaves the request status as `QUALIFIED`, so the original request remains an approved source record.

### Mock Auth

The assignment allowed simple login or documented mock auth. This implementation uses real password hashing and server-side sessions, while keeping the seed credentials simple for review.

## Assumptions and Trade-offs

- One seeded user per workspace is enough to demonstrate workspace isolation.
- SQLite is used instead of PostgreSQL to keep setup fast and reproducible.
- Raw SQL is used instead of an ORM because the schema is small and the isolation rules are easy to audit.
- Request lists are not paginated because the assignment scope is a small local-business workflow.
- `scheduled_date` is stored as `YYYY-MM-DD` text in SQLite.
- Activity details are stored as readable text rather than structured JSON because the UI only needs a timeline summary.

## What I Would Improve With More Time

- Add pagination and full-text search for larger request lists.
- Add role-based access control for admins and staff.
- Add rate limiting and stronger session cookie settings for production.
- Add CSRF protection for session-backed mutations.
- Add structured audit log metadata.
- Add PostgreSQL-backed deployment and a shared production session store.
- Add optimistic UI updates and toast notifications for smoother interactions.
- Add the optional simulated assistant panel that suggests next actions without mutating data.

## AI Tools Used

AI assistance was used for scaffolding, implementation support, and review of requirement coverage. The output was checked against the assignment requirements, verified with automated tests, and adjusted where the generated plan overclaimed optional work.

## Follow-Up Discussion Notes

Be ready to demonstrate:

1. Log in as Alice and show Acme requests.
2. Filter requests by status.
3. Open a request detail page and show the activity timeline.
4. Create or edit a request.
5. Convert a `QUALIFIED` request with the confirmation modal.
6. Submit conversion twice and show the idempotent `200` duplicate-prevention behavior.
7. Explain that workspace isolation is enforced by session-derived `workspaceId` plus workspace-scoped SQL queries.

One production security improvement: add CSRF protection and a shared session store, because this app uses session cookies for authenticated mutations. Schema changes are applied through ordered migrations, and `npm run typecheck` plus the CI workflow verify the workspaces before deployment.
