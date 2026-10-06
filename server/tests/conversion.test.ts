import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { createInMemoryDb, setDb } from '../src/db/index';
import { runMigrations } from '../src/db/migrate';

describe('Conversion Tests', () => {
  let app: express.Express;
  let cookie: string[];

  beforeAll(async () => {
    const db = createInMemoryDb();
    runMigrations(db);
    // Inject in-memory DB before importing routes
    setDb(db);

    db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run('ws-conv', 'Conv Workspace');
    const hash = await bcrypt.hash('test1234', 10);
    db.prepare('INSERT INTO users (id, workspace_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)').run(
      'user-conv', 'ws-conv', 'conv@test.com', hash, 'Conv User'
    );

    // QUALIFIED with scheduled_date
    db.prepare(`
      INSERT INTO requests (id, workspace_id, customer_name, service, scheduled_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'QUALIFIED', ?)
    `).run('req-qual', 'ws-conv', 'Customer', 'Service', '2024-05-01', 'user-conv');

    // QUALIFIED without scheduled_date
    db.prepare(`
      INSERT INTO requests (id, workspace_id, customer_name, service, status, created_by)
      VALUES (?, ?, ?, ?, 'QUALIFIED', ?)
    `).run('req-nodate', 'ws-conv', 'Customer2', 'Service2', 'user-conv');

    // NEW request (cannot convert)
    db.prepare(`
      INSERT INTO requests (id, workspace_id, customer_name, service, scheduled_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'NEW', ?)
    `).run('req-new', 'ws-conv', 'Customer3', 'Service3', '2024-05-10', 'user-conv');

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

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'conv@test.com', password: 'test1234' });

    cookie = loginRes.headers['set-cookie'] as string[];
  });

  it('converts a QUALIFIED request with scheduled_date successfully', async () => {
    const res = await request(app)
      .post('/api/requests/req-qual/convert')
      .set('Cookie', cookie);

    expect(res.status).toBe(201);
    expect((res.body as { request_id: string }).request_id).toBe('req-qual');
  });

  it('returns the existing work item when converting the same request again', async () => {
    const res = await request(app)
      .post('/api/requests/req-qual/convert')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect((res.body as { request_id: string; alreadyExisted: boolean }).request_id).toBe('req-qual');
    expect((res.body as { alreadyExisted: boolean }).alreadyExisted).toBe(true);
  });

  it('creates only one work item when conversion requests race', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Cookie', cookie)
      .send({
        customer_name: 'Race Customer',
        service: 'Race Service',
        scheduled_date: '2024-07-01',
      });
    const reqId = (createRes.body as { id: string }).id;

    await request(app)
      .patch(`/api/requests/${reqId}`)
      .set('Cookie', cookie)
      .send({ status: 'QUALIFIED' })
      .expect(200);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/api/requests/${reqId}/convert`).set('Cookie', cookie)
      )
    );

    expect(results.map((result) => result.status).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(new Set(results.map((result) => result.body.id)).size).toBe(1);
  });

  it('returns 422 when converting without scheduled_date', async () => {
    const res = await request(app)
      .post('/api/requests/req-nodate/convert')
      .set('Cookie', cookie);

    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toMatch(/scheduled_date/i);
  });

  it('rejects blank names and impossible calendar dates', async () => {
    const blankName = await request(app)
      .post('/api/requests')
      .set('Cookie', cookie)
      .send({ customer_name: '   ', service: 'Service' });
    expect(blankName.status).toBe(400);

    const invalidDate = await request(app)
      .post('/api/requests')
      .set('Cookie', cookie)
      .send({ customer_name: 'Customer', service: 'Service', scheduled_date: '2024-02-30' });
    expect(invalidDate.status).toBe(400);
  });

  it('returns 422 when converting a NEW request', async () => {
    const res = await request(app)
      .post('/api/requests/req-new/convert')
      .set('Cookie', cookie);

    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toMatch(/QUALIFIED/i);
  });

  it('closes the request after conversion', async () => {
    const res = await request(app)
      .get('/api/requests/req-qual')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('CLOSED');
  });

  it('returns 422 on invalid status transition (CLOSED → NEW)', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Cookie', cookie)
      .send({
        customer_name: 'Test Customer',
        service: 'Test Service',
        scheduled_date: '2024-06-01',
      });
    const reqId = (createRes.body as { id: string }).id;

    await request(app)
      .patch(`/api/requests/${reqId}`)
      .set('Cookie', cookie)
      .send({ status: 'CLOSED' });

    const res = await request(app)
      .patch(`/api/requests/${reqId}`)
      .set('Cookie', cookie)
      .send({ status: 'NEW' });

    expect(res.status).toBe(422);
  });

  it('returns 422 on invalid status transition (QUALIFIED → NEW)', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Cookie', cookie)
      .send({
        customer_name: 'Test Customer 2',
        service: 'Test Service 2',
      });
    const reqId = (createRes.body as { id: string }).id;

    await request(app)
      .patch(`/api/requests/${reqId}`)
      .set('Cookie', cookie)
      .send({ status: 'QUALIFIED' });

    const res = await request(app)
      .patch(`/api/requests/${reqId}`)
      .set('Cookie', cookie)
      .send({ status: 'NEW' });

    expect(res.status).toBe(422);
  });
});
