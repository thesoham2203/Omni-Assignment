import { Router, Request, Response } from 'express';
import { getDb } from '../db/index';
import { authMiddleware } from '../middleware/auth';
import {
  createRequestSchema,
  updateRequestSchema,
} from '../validators/request';
import { Request as RequestRow, RequestStatus, ActivityLog, User } from '../types/index';

const router = Router();
router.use(authMiddleware);

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['QUALIFIED', 'CLOSED'],
  QUALIFIED: ['CLOSED'],
  CLOSED: [],
};

// GET /api/requests?status=
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const workspaceId = req.user!.workspaceId;
  const { status } = req.query as { status?: string };

  let query = `
    SELECT r.*, u.name as created_by_name
    FROM requests r
    JOIN users u ON r.created_by = u.id
    WHERE r.workspace_id = ?
  `;
  const params: (string | undefined)[] = [workspaceId];

  if (status && ['NEW', 'QUALIFIED', 'CLOSED'].includes(status)) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC';

  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

// POST /api/requests
router.post('/', (req: Request, res: Response) => {
  const parseResult = createRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    return;
  }

  const db = getDb();
  const workspaceId = req.user!.workspaceId;
  const userId = req.user!.id;
  const { customer_name, service, description, scheduled_date } = parseResult.data;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertRequest = db.transaction(() => {
    db.prepare(`
      INSERT INTO requests (id, workspace_id, customer_name, service, description, scheduled_date, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)
    `).run(id, workspaceId, customer_name, service, description ?? null, scheduled_date ?? null, userId, now, now);

    db.prepare(`
      INSERT INTO activity_log (id, request_id, workspace_id, action, details, performed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), id, workspaceId, 'CREATED', 'Request created', userId);
  });

  insertRequest();

  const newRequest = db
    .prepare('SELECT r.*, u.name as created_by_name FROM requests r JOIN users u ON r.created_by = u.id WHERE r.id = ? AND r.workspace_id = ?')
    .get(id, workspaceId);

  res.status(201).json(newRequest);
});

// GET /api/requests/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const workspaceId = req.user!.workspaceId;
  const { id } = req.params;

  const request = db
    .prepare('SELECT r.*, u.name as created_by_name FROM requests r JOIN users u ON r.created_by = u.id WHERE r.id = ? AND r.workspace_id = ?')
    .get(id, workspaceId) as RequestRow | undefined;

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const activity = db
    .prepare(`
      SELECT al.*, u.name as performed_by_name
      FROM activity_log al
      JOIN users u ON al.performed_by = u.id
      WHERE al.request_id = ? AND al.workspace_id = ?
      ORDER BY al.performed_at ASC
    `)
    .all(id, workspaceId) as (ActivityLog & { performed_by_name: string })[];

  const workItem = db
    .prepare('SELECT * FROM work_items WHERE request_id = ? AND workspace_id = ?')
    .get(id, workspaceId);

  res.json({ ...request, activity, work_item: workItem ?? null });
});

// PATCH /api/requests/:id
router.patch('/:id', (req: Request, res: Response) => {
  const parseResult = updateRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    return;
  }

  const db = getDb();
  const workspaceId = req.user!.workspaceId;
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = db
    .prepare('SELECT * FROM requests WHERE id = ? AND workspace_id = ?')
    .get(id, workspaceId) as RequestRow | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const { status, ...fields } = parseResult.data;

  // Validate status transition
  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(status)) {
      res.status(422).json({
        error: `Invalid status transition from ${existing.status} to ${status}`,
      });
      return;
    }
  }

  const updateFields: Record<string, string | null | undefined> = {
    customer_name: fields.customer_name ?? existing.customer_name,
    service: fields.service ?? existing.service,
    description: 'description' in fields ? fields.description : existing.description,
    scheduled_date: 'scheduled_date' in fields ? fields.scheduled_date : existing.scheduled_date,
    status: status ?? existing.status,
    updated_at: new Date().toISOString(),
  };

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE requests
      SET customer_name = ?, service = ?, description = ?, scheduled_date = ?, status = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(
      updateFields['customer_name'],
      updateFields['service'],
      updateFields['description'] ?? null,
      updateFields['scheduled_date'] ?? null,
      updateFields['status'],
      updateFields['updated_at'],
      id,
      workspaceId
    );

    const activityDetails: string[] = [];
    if (status && status !== existing.status) {
      activityDetails.push(`Status changed from ${existing.status} to ${status}`);
    }
    const fieldChanges = Object.keys(fields).filter(k => k !== 'status');
    if (fieldChanges.length > 0) {
      activityDetails.push(`Updated fields: ${fieldChanges.join(', ')}`);
    }

    if (activityDetails.length > 0) {
      db.prepare(`
        INSERT INTO activity_log (id, request_id, workspace_id, action, details, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        id,
        workspaceId,
        status && status !== existing.status ? 'STATUS_CHANGED' : 'UPDATED',
        activityDetails.join('; '),
        userId
      );
    }
  });

  updateTx();

  const updated = db
    .prepare('SELECT r.*, u.name as created_by_name FROM requests r JOIN users u ON r.created_by = u.id WHERE r.id = ? AND r.workspace_id = ?')
    .get(id, workspaceId);

  res.json(updated);
});

// POST /api/requests/:id/convert
router.post('/:id/convert', (req: Request, res: Response) => {
  const db = getDb();
  const workspaceId = req.user!.workspaceId;
  const userId = req.user!.id;
  const { id } = req.params;

  const request = db
    .prepare('SELECT * FROM requests WHERE id = ? AND workspace_id = ?')
    .get(id, workspaceId) as RequestRow | undefined;

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (request.status !== 'QUALIFIED') {
    res.status(422).json({ error: 'Only QUALIFIED requests can be converted to work items' });
    return;
  }

  if (!request.scheduled_date) {
    res.status(422).json({ error: 'scheduled_date is required to convert a request' });
    return;
  }

  // Check for existing work item
  const existing = db
    .prepare('SELECT id FROM work_items WHERE request_id = ? AND workspace_id = ?')
    .get(id, workspaceId);

  if (existing) {
    res.status(409).json({ error: 'This request has already been converted to a work item' });
    return;
  }

  const workItemId = crypto.randomUUID();

  const convertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO work_items (id, request_id, workspace_id, created_by)
      VALUES (?, ?, ?, ?)
    `).run(workItemId, id, workspaceId, userId);

    db.prepare(`
      INSERT INTO activity_log (id, request_id, workspace_id, action, details, performed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      id,
      workspaceId,
      'CONVERTED',
      'Request converted to work item',
      userId
    );

    // Note: request status stays QUALIFIED
  });

  convertTx();

  const workItem = db
    .prepare('SELECT * FROM work_items WHERE id = ?')
    .get(workItemId);

  res.status(201).json(workItem);
});

export default router;
