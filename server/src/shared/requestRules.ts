import { z } from 'zod';
import { REQUEST_STATUSES } from '../../../shared/requestRules';

export { REQUEST_STATUSES, VALID_TRANSITIONS, isValidStatus } from '../../../shared/requestRules';
export type { RequestStatus } from '../../../shared/requestRules';

export const statusSchema = z.enum(REQUEST_STATUSES);
