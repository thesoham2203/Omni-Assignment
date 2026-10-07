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

## AI Assistance and Review

AI tools were used as development support, not as an unchecked implementation source. They helped with scaffolding ideas, edge-case discovery, test suggestions, documentation structure, and targeted code review. No external AI service is required at runtime.

The submitter owned the important engineering decisions: the workspace-isolation model, session-based authentication, status lifecycle, idempotent conversion behavior, SQLite/migration strategy, confirmation safeguards, Docker setup, and test scope. AI suggestions were reviewed against the assignment, existing code, and expected HTTP behavior; inaccurate or over-claimed suggestions were corrected or discarded.

Before submission, the submitter verified the work with backend and frontend tests, workspace-isolation and duplicate-conversion tests, typechecking, production builds, seed verification, Docker startup/health checks, repository hygiene checks, and a manual requirement-by-requirement review.

## Improvements With More Time

- Replace the in-memory session store with a shared production session store.
- Add CSRF protection, security headers, and stronger deployment secret handling.
- Add pagination/search and role-based access control.
- Add browser end-to-end tests and remove remaining React test `act()` warnings.
- Add structured audit metadata, request IDs, and observability.
