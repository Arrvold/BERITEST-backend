import { z } from 'zod';

export const createPositionSchema = z.object({
  body: z.object({
    position_name: z.string().min(1, 'Position name is required').max(100),
  })
});

export const updatePositionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid position ID format'),
  }),
  body: z.object({
    position_name: z.string().min(1).max(100).optional(),
  })
});

export const positionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid position ID format'),
  })
});

export const listPositionsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});
