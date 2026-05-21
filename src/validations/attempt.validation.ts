import { z } from 'zod';

export const startAttemptSchema = z.object({
  body: z.object({
    id_session: z.number().int().positive('Session ID is required'),
    id_question_group: z.number().int().positive('Question group ID is required'),
  })
});

export const submitAttemptSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid attempt ID format'),
  })
});

export const attemptIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid attempt ID format'),
  })
});

export const listAttemptsSchema = z.object({
  query: z.object({
    id_session: z.string().regex(/^\d+$/).optional(),
    id_user: z.string().uuid().optional(),
    status: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});

export const saveAnswerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid attempt ID format'),
    questionId: z.string().regex(/^\d+$/, 'Invalid attempt question ID format'),
  }),
  body: z.object({
    id_answer_option: z.number().int().positive('Answer option ID is required'),
    time_spent_seconds: z.number().int().min(0).optional(),
  })
});

export const updateTimeSpentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid attempt ID format'),
    questionId: z.string().regex(/^\d+$/, 'Invalid attempt question ID format'),
  }),
  body: z.object({
    time_spent_seconds: z.number().int().min(0, 'Time spent must be non-negative'),
  })
});
