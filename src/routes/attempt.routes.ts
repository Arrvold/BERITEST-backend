import { Router } from 'express';
import {
  getAttempts,
  getAttemptDetail,
  startAttempt,
  submitAttempt,
  timeoutAttempt,
  saveAnswer,
  updateTimeSpent,
  getMyAttempts
} from '../controllers/attempt.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listAttemptsSchema,
  attemptIdParamSchema,
  startAttemptSchema,
  submitAttemptSchema,
  saveAnswerSchema,
  updateTimeSpentSchema
} from '../validations/attempt.validation';

const router = Router();

router.use(authenticateToken);

// My attempts (user's own) - must be before /:id
router.get('/my', getMyAttempts);

// List all attempts (admin)
router.get('/', validate(listAttemptsSchema), getAttempts);

// Start a new attempt
router.post('/start', validate(startAttemptSchema), startAttempt);

// Attempt detail
router.get('/:id', validate(attemptIdParamSchema), getAttemptDetail);

// Submit attempt
router.post('/:id/submit', validate(submitAttemptSchema), submitAttempt);

// Timeout attempt (can be triggered server-side or from client)
router.post('/:id/timeout', validate(attemptIdParamSchema), timeoutAttempt);

// Save answer for a specific question in the attempt
router.post('/:id/questions/:questionId/answer', validate(saveAnswerSchema), saveAnswer);

// Update time spent on a question
router.patch('/:id/questions/:questionId/time', validate(updateTimeSpentSchema), updateTimeSpent);

export default router;
