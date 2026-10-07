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

## Improvements With More Time

- Replace the in-memory session store with a shared production session store.
- Add CSRF protection, security headers, and stronger deployment secret handling.
- Add pagination/search and role-based access control.
- Add browser end-to-end tests and remove remaining React test `act()` warnings.
- Add structured audit metadata, request IDs, and observability.
