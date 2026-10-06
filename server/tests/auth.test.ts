import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createInMemoryDb, setDb } from '../src/db/index';
import { runMigrations } from '../src/db/migrate';
import { resetLoginRateLimit } from '../src/routes/auth';

describe('Authentication', () => {
  let app: express.Express;

  beforeAll(async () => {
    const db = createInMemoryDb();
    runMigrations(db);
    setDb(db);
    db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run('ws-auth', 'Auth Workspace');
    const passwordHash = await bcrypt.hash('correct-password', 10);
    db.prepare(
      'INSERT INTO users (id, workspace_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)'
    ).run('user-auth', 'ws-auth', 'auth@test.com', passwordHash, 'Auth User');

    const { default: authRoutes } = await import('../src/routes/auth');
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    resetLoginRateLimit();
  });

  it('blocks the sixth failed login attempt and returns Retry-After', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'auth@test.com', password: 'wrong-password' })
        .expect(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth@test.com', password: 'correct-password' })
      .expect(429);

    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});