import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/index';
import { User } from '../types/index';
import { AuthUser } from '../types/index';
import { loginSchema } from '../validators/auth';

const router = Router();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function attemptKey(email: string, ip?: string): string {
  return `${email.toLowerCase()}|${ip ?? 'unknown'}`;
}

function currentAttempt(key: string) {
  const now = Date.now();
  const existing = attempts.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, fresh);
    return fresh;
  }
  return existing;
}

export function resetLoginRateLimit(): void {
  attempts.clear();
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    return;
  }

  const { email, password } = parseResult.data;

  const key = attemptKey(email, req.ip);
  const attempt = currentAttempt(key);
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user) {
    attempt.count += 1;
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    attempt.count += 1;
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  attempts.delete(key);

  const sessionUser: AuthUser = {
    id: user.id,
    workspaceId: user.workspace_id,
    email: user.email,
    name: user.name,
  };

  (req.session as { user?: AuthUser }).user = sessionUser;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    workspaceId: user.workspace_id,
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const sessionUser = (req.session as { user?: AuthUser }).user;
  if (!sessionUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const db = getDb();
  const workspace = db
    .prepare('SELECT id, name FROM workspaces WHERE id = ?')
    .get(sessionUser.workspaceId) as { id: string; name: string } | undefined;

  res.json({
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    workspaceId: sessionUser.workspaceId,
    workspaceName: workspace?.name ?? '',
  });
});

export default router;
