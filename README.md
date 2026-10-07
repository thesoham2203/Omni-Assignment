# Client Request Desk

A workspace-aware full-stack application for local businesses to review customer requests and convert approved requests into scheduled work items.

## Architecture

- **Web:** React 18, TypeScript, Vite, Tailwind CSS, and React Router.
- **API:** Node.js, Express, TypeScript, Zod validation, and session authentication.
- **Database:** SQLite with `better-sqlite3`, raw SQL, versioned migrations, and seeded demo data.
- **Repository:** npm workspaces containing `client` and `server` packages.

The API derives `workspaceId` from the authenticated session. Every request, work item, and activity query is workspace-scoped. Composite foreign keys provide a second tenant-isolation boundary. Request status rules are shared through `shared/requestRules.ts`.

Conversion is a confirmed, idempotent transaction: a qualified request with a scheduled date becomes `CLOSED`, creates one work item, and records the acting user and timestamp. Repeated or concurrent submissions return the existing work item without creating duplicates.

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

See the standalone [API reference](docs/api.md). CI runs the same verification commands through `.github/workflows/ci.yml`.

## Key Decisions and Trade-offs

- **SQLite over PostgreSQL:** keeps setup fast and reproducible. Transactions plus a unique `work_items.request_id` constraint protect conversion retries and races.
- **Session auth over JWTs:** credentials stay server-side and logout invalidates sessions. The in-memory session store is suitable for this assignment but should become shared infrastructure in production.
- **Raw SQL over an ORM:** workspace filters and tenant boundaries remain visible during review.
- **Three statuses:** `CLOSED` is terminal; conversion closes the request while preserving its activity history.
- **Small local-business scope:** lists are intentionally unpaginated and use simple status filtering.

## Requirement Coverage

- **Workspace API:** seeded workspaces/users, login, request CRUD, status transitions, validation, and workspace isolation.
- **Confirmed action:** conversion modal shows customer, service, and scheduled date; the API rejects invalid conversions, prevents duplicates, and records activity.
- **Frontend:** responsive request list, status filters, detail/timeline view, create/edit forms, work-item list, loading, empty, validation, and API error states.
- **Bonus:** rule-based assistant panel with human confirmation safeguards.
- **Tests:** isolation, duplicate/concurrent conversion, validation, authentication rate limiting, and frontend interactions.

## Human-Led Work

The submitter directed and reviewed the implementation. Important work included:

- interpreting the assignment and defining workspace-isolation and status-transition rules;
- implementing and reviewing authentication, CRUD, migrations, seed data, conversion, and activity logging;
- choosing idempotent conversion semantics and testing duplicate/concurrent submissions;
- building the responsive request, work-item, confirmation, form, and assistant workflows;
- writing and running isolation, validation, authentication, conversion, and frontend tests;
- adding Docker/CI support, checking production builds, and correcting issues found during verification.

## AI Assistance and Review

Anthropic Claude and Google Gemini were used as interactive pair-programming assistants for scaffolding ideas, edge-case discovery, test suggestions, documentation structure, and targeted code review. No external AI service is required at runtime.

The submitter owned the architecture and security decisions, including session-derived workspace isolation, strict input schemas, atomic idempotent conversion, the `CLOSED` lifecycle, confirmation safeguards, SQLite migrations, Docker setup, and test scope. AI suggestions were compared with the assignment, existing code, and expected HTTP behavior; inaccurate or over-claimed suggestions were corrected or discarded.

Verification included backend and frontend tests, workspace-isolation and duplicate-conversion tests, typechecking, production builds, fresh-database seed checks, Docker startup/health checks, repository hygiene checks, and a manual requirement-by-requirement review.

## Improvements With More Time

- Replace the in-memory session store with shared production infrastructure.
- Add CSRF protection, security headers, and stronger secret management.
- Add pagination/search, role-based access control, and structured audit metadata.
- Add browser end-to-end tests and remove remaining React test `act()` warnings.
- Add request IDs and production observability.
