# Client Request Desk

Client Request Desk is a small full-stack application for local businesses to receive customer requests, review them, and convert approved requests into work items.

The app is workspace-aware: each signed-in user belongs to one workspace, and every request, work item, and activity record is scoped to that workspace.

## Reviewer Guide

| Rubric area | Where to look |
| --- | --- |
| Functional correctness and API design | `server/src/routes/requests.ts`, [API reference](docs/api.md) |
| Workspace isolation and safe actions | `server/src/middleware/auth.ts`, `server/tests/isolation.test.ts`, `server/tests/conversion.test.ts` |
| Code structure and maintainability | `server/src/db/migrate.ts`, `shared/requestRules.ts`, `client/src/shared/requestRules.ts` |
| Frontend usability and error handling | `client/src/pages/RequestListPage.tsx`, `client/src/pages/RequestDetailPage.tsx`, `client/src/components/AssistantPanel.tsx` |
| Test quality | `server/tests/`, `client/src/tests/` |
| Setup and communication | this README, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` |

## Status Lifecycle

```text
NEW -- qualify --> QUALIFIED -- create work item --> CLOSED (converted)
 |                    |
 +-- reject -----------+--> CLOSED (rejected)
```

Conversion is a confirmed, idempotent mutation. A repeated request returns the existing work item and does not append another conversion activity. The mutation tests deliberately exercise duplicate and concurrent conversion calls; removing the transaction or unique constraint makes those tests fail.

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

`CLOSED` is terminal. Conversion creates a work item and closes the request, while the original activity timeline remains available as the approved source record.

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
- Add richer assistant explanations and optional role-aware recommendations without allowing unconfirmed mutations.

# Client Request Desk

A workspace-aware full-stack application for local businesses to review customer requests and convert approved requests into scheduled work items.

## Architecture

- **Web:** React 18, TypeScript, Vite, Tailwind CSS, and React Router.
- **API:** Node.js, Express, TypeScript, Zod validation, and session authentication.
- **Database:** SQLite with `better-sqlite3`, raw SQL, versioned migrations, and seeded demo data.
- **Repository:** npm workspaces containing `client` and `server` packages.

The API derives `workspaceId` from the authenticated session. Every request, work item, and activity query is workspace-scoped. Composite database foreign keys provide a second tenant-isolation boundary. Request status rules are shared between the client and server through `shared/requestRules.ts`.

Conversion is a confirmed and idempotent transaction: a qualified request with a scheduled date becomes `CLOSED`, creates one work item, and records the acting user and timestamp. Repeated or concurrent submissions return the existing work item without creating duplicates.

```text
NEW -- qualify --> QUALIFIED -- create work item --> CLOSED (converted)
 |                    |
 +-- reject -----------+--> CLOSED (rejected)
```

The optional assistant panel is rule-based and never mutates data without confirmation.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

```bash
npm install
cp .env.example server/.env
npm run seed
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3001`.

Demo accounts:

| Workspace | Email | Password |
| --- | --- | --- |
| Acme Corp | `alice@acme.com` | `acme1234` |
| Globe Ltd | `bob@globeltd.com` | `globe1234` |

### Docker

```bash
docker compose up --build
```

The container runs at `http://localhost:3001` and persists SQLite data in a Docker volume. Replace `SESSION_SECRET` in `docker-compose.yml` before any real deployment.

### Verification

```bash
npm test
npm run typecheck
npm run build
```

The repository also includes `.github/workflows/ci.yml` and a standalone [API reference](docs/api.md).

## Key Decisions, Assumptions, and Trade-offs

- **SQLite over PostgreSQL:** keeps the assignment easy to install and review locally. Transactions plus a unique `work_items.request_id` constraint protect conversion retries and races.
- **Session auth over JWTs:** credentials stay server-side and logout invalidates the session. The in-memory session store is suitable for the assignment but should become a shared store in production.
- **Raw SQL over an ORM:** workspace filters and tenant boundaries remain visible during review.
- **Three statuses:** `CLOSED` is terminal; conversion closes the request while preserving its activity history.
- **Small local-business scope:** lists are intentionally unpaginated and use simple filtering.

## Human-Led Work

The implementation was reviewed and directed by the submitter. Important decisions and work included:

- interpreting the assignment and defining workspace-isolation and status-transition rules;
- implementing and reviewing authentication, CRUD, migration, seed, conversion, and activity-log behavior;
- choosing idempotent conversion semantics and testing duplicate/concurrent submissions;
- building the responsive request, work-item, confirmation, form, and assistant workflows;
- writing and running isolation, validation, authentication, conversion, and frontend interaction tests;
- adding Docker/CI support, checking the production build, and correcting issues found during verification.

## AI Assistance and Review Process

In accordance with the assignment requirements, AI tools (**Anthropic Claude** and **Google Gemini**) were used as interactive pair-programming assistants throughout this project. They served to accelerate scaffolding and explore edge cases, not as an unchecked code generator.

### Where AI Was Leveraged
- **Boilerplate & Scaffolding:** Accelerating initial setup including Express router scaffolding, TypeScript types, and Zod validator schemas.
- **Edge-Case Brainstorming:** Identifying boundary conditions for status transitions, invalid calendar dates (e.g., February 30th), and input validation edge cases.
- **Test Ideation:** Proposing initial Supertest request flows and React Testing Library assertion skeletons.
- **Documentation Structuring:** Formatting tables and drafting initial sections for `docs/api.md` and the README.

### Critical Engineering Interventions & Corrections
All architectural and security decisions were human-directed. During development, several AI-generated proposals were challenged and corrected:

1. **Race Condition & Concurrency Handling:**
   - *Initial AI suggestion:* A simple application-level check (`SELECT * FROM work_items WHERE request_id = ?`) before inserting.
   - *Human intervention:* Identified that concurrent API calls would bypass this check before the transaction commits. Enforced a database-level `UNIQUE (request_id)` constraint on `work_items` within an atomic transaction, paired with a concurrent test simulating simultaneous conversion requests to verify that retries safely return HTTP 200 `{ alreadyExisted: true }`.
2. **Strict Workspace Isolation & Parameter Pollution:**
   - *Initial AI suggestion:* Silently overwriting `req.body.workspace_id` with `req.user.workspaceId`.
   - *Human intervention:* Recognized that accepting unrecognized tenant parameters is an API vulnerability. Configured Zod schemas to reject client-supplied `workspace_id` with a `400 Bad Request`, and backed the tenant boundary with database-level composite foreign keys `FOREIGN KEY (request_id, workspace_id)`.
3. **Conversion Lifecycle Semantics:**
   - *Initial AI suggestion:* Leaving converted requests in the `QUALIFIED` state indefinitely.
   - *Human intervention:* Corrected the lifecycle so converting transitions the request to `CLOSED` (converted), making it terminal while preserving the complete historical timeline in `activity_log`.
4. **Guarding the Assistant Panel:**
   - *Initial AI suggestion:* Allowing the assistant panel to trigger status updates via one-click optimistic mutations.
   - *Human intervention:* Strictly enforced the assignment constraint that the assistant must remain a passive, rule-based advisory tool that *never* modifies data directly. It only routes the user to human-confirmed modals or forms.

### Verification & Review Methodology
Every line of code and test was audited using the following protocol:
- **Diff-by-Diff Code Review:** Every change was inspected for unwanted dependencies, subtle logic shifts, or hallucinated APIs.
- **Mutation Verification:** Deliberately broke critical logic (e.g., removing the `workspace_id` clause in queries or removing the unique constraint) to confirm that `server/tests/isolation.test.ts` and `server/tests/conversion.test.ts` fail immediately.
- **End-to-End Automated Checks:** Enforced clean runs of `npm run typecheck`, `npm test` (30 unit & integration tests), `npm run build`, and fresh-database seed verification.
- **Container Smoke Testing:** Verified the multi-stage Docker build and compose stack independently to confirm zero runtime dependency on external AI services or development tools.
