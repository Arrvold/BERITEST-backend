import { Router } from 'express';
import {
  getQuestions,
  getQuestionSummary,
  getQuestionDetail,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  mapPositions
} from '../controllers/question.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listQuestionsSchema,
  questionIdParamSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createAnswerSchema,
  updateAnswerSchema,
  answerIdParamSchema,
  mapPositionsSchema
} from '../validations/question.validation';

const router = Router();

router.use(authenticateToken);

// Summary (must be before /:id to avoid conflict)
router.get('/summary', getQuestionSummary);

// List questions
router.get('/', validate(listQuestionsSchema), getQuestions);

// Create question (with optional inline answers and positions)
router.post('/', validate(createQuestionSchema), createQuestion);

// Question detail
router.get('/:id', validate(questionIdParamSchema), getQuestionDetail);

// Update question
router.put('/:id', validate(updateQuestionSchema), updateQuestion);

// Delete question
router.delete('/:id', validate(questionIdParamSchema), deleteQuestion);

// Map positions to a question (replaces existing)
router.post('/:id/map-positions', validate(mapPositionsSchema), mapPositions);

// Answer sub-routes
router.post('/:id/answers', validate(createAnswerSchema), createAnswer);
router.put('/:id/answers/:answerId', validate(updateAnswerSchema), updateAnswer);
router.delete('/:id/answers/:answerId', validate(answerIdParamSchema), deleteAnswer);

export default router;
