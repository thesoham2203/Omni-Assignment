// Shared types for the server

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  workspace_id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export type RequestStatus = 'NEW' | 'QUALIFIED' | 'CLOSED';

export interface Request {
  id: string;
  workspace_id: string;
  customer_name: string;
  service: string;
  description: string | null;
  scheduled_date: string | null;
  status: RequestStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItem {
  id: string;
  request_id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  request_id: string;
  workspace_id: string;
  action: string;
  details: string | null;
  performed_by: string;
  performed_at: string;
}

// Augment express Request with user
export interface AuthUser {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
