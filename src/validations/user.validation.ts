import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    nama_user: z.string().min(3, 'Nama user is required'),
    email: z.string().email('Invalid email'),
    id_role: z.number().int().positive().optional(),
    position_ids: z.array(z.number().int().positive()).optional(),
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    nama_user: z.string().min(3).optional(),
    email: z.string().email().optional(),
    id_role: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});
