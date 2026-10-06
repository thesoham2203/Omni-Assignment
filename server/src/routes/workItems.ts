import { Router, Request, Response } from 'express';
import { getDb } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/work-items
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const workspaceId = req.user!.workspaceId;

  const workItems = db.prepare(`
    SELECT
      wi.*,
      r.customer_name,
      r.service,
      r.description,
      r.scheduled_date,
      r.status as request_status,
      u.name as created_by_name
    FROM work_items wi
    JOIN requests r ON wi.request_id = r.id
    JOIN users u ON wi.created_by = u.id
    WHERE wi.workspace_id = ?
    ORDER BY wi.created_at DESC
  `).all(workspaceId);

  res.json(workItems);
});

export default router;
