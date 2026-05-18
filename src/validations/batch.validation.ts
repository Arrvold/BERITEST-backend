import { z } from 'zod';

export const createBatchSchema = z.object({
  body: z.object({
    id_course: z.number().int().positive(),
    nama_batch: z.string().min(3, 'Batch name must be at least 3 characters'),
    start_date: z.string().datetime('Invalid start date format (must be ISO 8601)'),
    end_date: z.string().datetime('Invalid end date format (must be ISO 8601)'),
    is_active: z.boolean().optional(),
  })
});

export const updateBatchSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid batch ID format'),
  }),
  body: z.object({
    id_course: z.number().int().positive().optional(),
    nama_batch: z.string().min(3).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    is_active: z.boolean().optional(),
  })
});

export const batchIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid batch ID format'),
  })
});

export const listBatchesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    id_course: z.string().regex(/^\d+$/).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});

export const assignUsersBatchSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid batch ID format'),
  }),
  body: z.object({
    user_ids: z.array(z.string().uuid('Invalid user ID format')).nonempty('At least one user ID is required'),
  })
});
