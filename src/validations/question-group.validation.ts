import { z } from 'zod';

export const createQuestionGroupSchema = z.object({
  body: z.object({
    group_name: z.string().min(1, 'Group name is required').max(150),
    description: z.string().max(500).optional(),
    question_ids: z.array(z.number().int().positive()).optional(),
  })
});

export const updateQuestionGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid group ID format'),
  }),
  body: z.object({
    group_name: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
  })
});

export const questionGroupIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid group ID format'),
  })
});

export const listQuestionGroupsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});

export const addQuestionsToGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid group ID format'),
  }),
  body: z.object({
    question_ids: z.array(z.number().int().positive()).nonempty('At least one question ID is required'),
  })
});

export const removeQuestionFromGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid group ID format'),
    questionId: z.string().regex(/^\d+$/, 'Invalid question ID format'),
  })
});

export const randomizeGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid group ID format'),
  }),
  body: z.object({
    total_questions: z.number().int().positive('Total questions must be a positive integer'),
    position_quotas: z.array(z.object({
      id_position: z.number().int().positive(),
      percentage: z.number().min(1).max(100),
    })).optional(),
  })
});
