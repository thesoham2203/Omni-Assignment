import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/index';
import { User } from '../types/index';
import { AuthUser } from '../types/index';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

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
