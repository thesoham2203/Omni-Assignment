import { z } from 'zod';
import { statusSchema } from '../shared/requestRules';

const nonBlankText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const isoDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date must be YYYY-MM-DD format')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }, 'scheduled_date must be a valid calendar date');

export const createRequestSchema = z.object({
  customer_name: nonBlankText('Customer name', 255),
  service: nonBlankText('Service', 255),
  description: z.string().max(2000).optional().nullable(),
  scheduled_date: isoDate.optional().nullable(),
}).strict();

export const updateRequestSchema = z.object({
  customer_name: nonBlankText('Customer name', 255).optional(),
  service: nonBlankText('Service', 255).optional(),
  description: z.string().max(2000).optional().nullable(),
  scheduled_date: isoDate.optional().nullable(),
  status: statusSchema.optional(),
}).strict();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
