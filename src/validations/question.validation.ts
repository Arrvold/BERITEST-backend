import { z } from 'zod';

export const createQuestionSchema = z.object({
  body: z.object({
    question_desc: z.string().min(1, 'Question description is required'),
    question_content_json: z.any().optional(),
    question_content_html: z.string().optional(),
    img_path: z.string().optional(),
    difficulty_flag: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    position_ids: z.array(z.number().int().positive()).optional(),
    answers: z.array(z.object({
      answer_desc: z.string().min(1, 'Answer description is required'),
      answer_content_json: z.any().optional(),
      answer_content_html: z.string().optional(),
      is_correct: z.boolean().default(false),
    })).min(2, 'At least 2 answer options are required').optional(),
  })
});

export const updateQuestionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
  }),
  body: z.object({
    question_desc: z.string().min(1).optional(),
    question_content_json: z.any().optional(),
    question_content_html: z.string().optional(),
    img_path: z.string().optional(),
    difficulty_flag: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    position_ids: z.array(z.number().int().positive()).optional(),
  })
});

export const questionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
  })
});

export const listQuestionsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    difficulty_flag: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    id_position: z.string().regex(/^\d+$/).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
});

export const createAnswerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
  }),
  body: z.object({
    answer_desc: z.string().min(1, 'Answer description is required'),
    answer_content_json: z.any().optional(),
    answer_content_html: z.string().optional(),
    is_correct: z.boolean().default(false),
  })
});

export const updateAnswerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
    answerId: z.string().regex(/^\d+$/, 'Invalid answer ID format'),
  }),
  body: z.object({
    answer_desc: z.string().min(1).optional(),
    answer_content_json: z.any().optional(),
    answer_content_html: z.string().optional(),
    is_correct: z.boolean().optional(),
  })
});

export const answerIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
    answerId: z.string().regex(/^\d+$/, 'Invalid answer ID format'),
  })
});

export const mapPositionsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid question ID format'),
  }),
  body: z.object({
    position_ids: z.array(z.number().int().positive()).nonempty('At least one position ID is required'),
  })
});
