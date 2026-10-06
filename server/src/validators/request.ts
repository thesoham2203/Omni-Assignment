import { z } from 'zod';

export const createRequestSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  service: z.string().min(1, 'Service is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
});

export const updateRequestSchema = z.object({
  customer_name: z.string().min(1).max(255).optional(),
  service: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  status: z.enum(['NEW', 'QUALIFIED', 'CLOSED']).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
