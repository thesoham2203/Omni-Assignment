import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types/index';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionUser = (req.session as { user?: AuthUser }).user;
  if (!sessionUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.user = sessionUser;
  next();
}
