import type { RequestStatus } from '../../../shared/requestRules';

export { REQUEST_STATUSES, VALID_TRANSITIONS } from '../../../shared/requestRules';
export type { RequestStatus } from '../../../shared/requestRules';

export function nextActionForRequest(status: RequestStatus, hasDate: boolean, converted: boolean) {
  if (status === 'NEW') {
    return {
      title: 'Qualify request',
      reason: 'This request is new. Review the details and qualify it when it is ready for scheduling.',
      action: 'qualify' as const,
    };
  }

  if (status === 'QUALIFIED' && converted) {
    return {
      title: 'Review work item',
      reason: 'A work item already exists for this qualified request.',
      action: null,
    };
  }

  if (status === 'QUALIFIED' && hasDate) {
    return {
      title: 'Create work item',
      reason: 'The request is qualified and has a scheduled date, so it is ready for confirmed conversion.',
      action: 'convert' as const,
    };
  }

  if (status === 'QUALIFIED') {
    return {
      title: 'Add scheduled date',
      reason: 'A scheduled date is required before this request can be converted into a work item.',
      action: 'edit' as const,
    };
  }

  return {
    title: 'No next action',
    reason: 'Closed requests are terminal in this workflow.',
    action: null,
  };
}
