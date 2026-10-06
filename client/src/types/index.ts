export type RequestStatus = 'NEW' | 'QUALIFIED' | 'CLOSED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

export interface Request {
  id: string;
  workspace_id: string;
  customer_name: string;
  service: string;
  description: string | null;
  scheduled_date: string | null;
  status: RequestStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityEntry {
  id: string;
  request_id: string;
  workspace_id: string;
  action: string;
  details: string | null;
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
}

export interface WorkItem {
  id: string;
  request_id: string;
  workspace_id: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  // Joined from requests
  customer_name: string;
  service: string;
  description: string | null;
  scheduled_date: string | null;
  request_status: RequestStatus;
}

export interface RequestDetail extends Request {
  activity: ActivityEntry[];
  work_item: WorkItem | null;
}
