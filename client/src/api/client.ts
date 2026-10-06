// Centralized API client - all requests go through here

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    const err = new Error((body as { error?: string }).error ?? 'Request failed') as Error & {
      status: number;
      body: unknown;
    };
    (err as { status: number }).status = res.status;
    (err as { body: unknown }).body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return fetch(`${BASE}${path}`, { credentials: 'include' }).then((r) =>
    handleResponse<T>(r)
  );
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((r) => handleResponse<T>(r));
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => handleResponse<T>(r));
}

export const api = { get, post, patch };
