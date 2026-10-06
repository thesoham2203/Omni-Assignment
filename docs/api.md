# API Reference

All endpoints are prefixed with `/api`. Request and work-item endpoints require the session cookie created by login. Workspace IDs are derived from the session and are never accepted from client input.

## Authentication

### `POST /api/auth/login`

Request:

```json
{"email":"alice@acme.com","password":"acme1234"}
```

Returns `200` with the authenticated user and sets an HTTP-only session cookie. Invalid input returns `400`, invalid credentials return `401`, and repeated failed attempts return `429` with `Retry-After`.

### `POST /api/auth/logout`

Destroys the current session and returns `200`.

### `GET /api/auth/me`

Returns the current user and workspace, or `401` when no session exists.

## Requests

### `GET /api/requests?status=NEW`

Lists requests in the authenticated user's workspace. The optional status filter accepts `NEW`, `QUALIFIED`, or `CLOSED`.

### `POST /api/requests`

Creates a request and its `CREATED` activity entry.

```json
{
  "customer_name":"Jane Smith",
  "service":"Pest Control",
  "description":"Ants in the kitchen",
  "scheduled_date":"2026-10-15"
}
```

Returns `201`. Invalid or unknown fields return `400`.

### `GET /api/requests/:id`

Returns request details, workspace-scoped activity timeline, and work-item state. A missing or foreign-workspace ID returns `404`.

### `PATCH /api/requests/:id`

Updates request fields and/or status. Valid transitions are `NEW -> QUALIFIED`, `NEW -> CLOSED`, and `QUALIFIED -> CLOSED`. Invalid transitions return `422`.

### `POST /api/requests/:id/convert`

Converts a `QUALIFIED` request with a scheduled date into one work item inside an atomic transaction. The request becomes `CLOSED`, and a `CONVERTED` activity records the user and timestamp.

The first call returns `201`. Repeated or concurrent calls return the existing work item with `200` and `alreadyExisted: true`; no duplicate activity or work item is created. Non-qualified or unscheduled requests return `422`.

## Work Items

### `GET /api/work-items`

Lists work items belonging to the authenticated user's workspace. Foreign-workspace records are never returned.

## Error shape

Validation and route errors return JSON with an `error` message. Validation errors also include Zod field details:

```json
{
  "error":"Validation failed",
  "details":{"fieldErrors":{"customer_name":["Customer name is required"]}}
}
```
