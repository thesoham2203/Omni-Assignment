import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { createInMemoryDb, setDb } from '../src/db/index';
import { runMigrations } from '../src/db/migrate';

describe('Workspace Isolation', () => {
  let app: express.Express;

  beforeAll(async () => {
    const db = createInMemoryDb();
    runMigrations(db);
    // Inject in-memory DB before importing routes (they call getDb() at runtime)
    setDb(db);

    // Create two workspaces
    db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run('ws-test1', 'Test Workspace 1');
    db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run('ws-test2', 'Test Workspace 2');

    const hash1 = await bcrypt.hash('pass1234', 10);
    const hash2 = await bcrypt.hash('pass5678', 10);

    db.prepare('INSERT INTO users (id, workspace_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)').run(
      'user-t1', 'ws-test1', 'user1@test.com', hash1, 'User One'
    );
    db.prepare('INSERT INTO users (id, workspace_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)').run(
      'user-t2', 'ws-test2', 'user2@test.com', hash2, 'User Two'
    );

    // Create a request for workspace 1
    db.prepare(`
      INSERT INTO requests (id, workspace_id, customer_name, service, status, created_by)
      VALUES (?, ?, ?, ?, 'NEW', ?)
    `).run('req-ws1', 'ws-test1', 'Customer WS1', 'Service WS1', 'user-t1');

    const { default: authRoutes } = await import('../src/routes/auth');
    const { default: requestRoutes } = await import('../src/routes/requests');

    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use('/api/auth', authRoutes);
    app.use('/api/requests', requestRoutes);
  });

  it('user2 cannot see requests from workspace1', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@test.com', password: 'pass5678' });
    expect(loginRes.status).toBe(200);

    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/requests/req-ws1')
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
  });

  it('user2 cannot see workspace1 requests in list', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@test.com', password: 'pass5678' });
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/requests')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const requests = res.body as Array<{ workspace_id: string }>;
    expect(requests.every((r) => r.workspace_id === 'ws-test2')).toBe(true);
  });

  it('user1 can see their own request', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.com', password: 'pass1234' });
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/requests/req-ws1')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect((res.body as { id: string }).id).toBe('req-ws1');
  });

  it('user2 cannot update requests belonging to workspace1', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@test.com', password: 'pass5678' });
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .patch('/api/requests/req-ws1')
      .set('Cookie', cookie)
      .send({ customer_name: 'Hacked Name' });

    expect(res.status).toBe(404);
  });
});
