import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    course_title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  })
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid course ID format'),
  }),
  body: z.object({
    course_title: z.string().min(3).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  })
});

export const courseIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid course ID format'),
  })
});

export const listCoursesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});
