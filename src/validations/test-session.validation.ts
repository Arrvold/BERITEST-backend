import { z } from 'zod';

export const createTestSessionSchema = z.object({
  body: z.object({
    session_name: z.string().min(3, 'Session name must be at least 3 characters'),
    description: z.string().optional(),
    id_course: z.number().int().positive().optional(),
    start_time: z.string().datetime('Invalid start time format (must be ISO 8601)'),
    end_time: z.string().datetime('Invalid end time format (must be ISO 8601)'),
    duration_minutes: z.number().int().positive(),
    passing_score: z.number().min(0).max(100).optional(),
    random_question: z.boolean().optional(),
    random_answer: z.boolean().optional(),
    is_seb_required: z.boolean().optional(),
    status: z.enum(['Active', 'Upcoming', 'Completed', 'Cancelled']).optional(),
    question_group_ids: z.array(z.number().int().positive()).optional(),
    participant_user_ids: z.array(z.string().uuid('Invalid user ID format')).optional(),
  })
});

export const updateTestSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid session ID format'),
  }),
  body: z.object({
    session_name: z.string().min(3).optional(),
    description: z.string().optional(),
    id_course: z.number().int().positive().optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    duration_minutes: z.number().int().positive().optional(),
    passing_score: z.number().min(0).max(100).optional(),
    random_question: z.boolean().optional(),
    random_answer: z.boolean().optional(),
    is_seb_required: z.boolean().optional(),
    status: z.enum(['Active', 'Upcoming', 'Completed', 'Cancelled']).optional(),
  })
});

export const testSessionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid session ID format'),
  })
});

export const listTestSessionsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(['Active', 'Upcoming', 'Completed', 'Cancelled']).optional(),
    id_course: z.string().regex(/^\d+$/).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});

export const assignGroupsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid session ID format'),
  }),
  body: z.object({
    question_group_ids: z.array(z.number().int().positive()).nonempty('At least one group ID is required'),
  })
});

export const assignParticipantsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid session ID format'),
  }),
  body: z.object({
    participant_user_ids: z.array(z.string().uuid('Invalid user ID format')).nonempty('At least one user ID is required'),
  })
});
