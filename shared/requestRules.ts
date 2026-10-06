export const REQUEST_STATUSES = ['NEW', 'QUALIFIED', 'CLOSED'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['QUALIFIED', 'CLOSED'],
  QUALIFIED: ['CLOSED'],
  CLOSED: [],
};

export function isValidStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && REQUEST_STATUSES.includes(value as RequestStatus);
}