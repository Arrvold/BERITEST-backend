import { Router } from 'express';
import {
  getTestSessions,
  getTestSessionSummary,
  createTestSession,
  getTestSessionDetail,
  updateTestSession,
  deleteTestSession,
  assignQuestionGroups,
  assignParticipants
} from '../controllers/test-session.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTestSessionSchema,
  updateTestSessionSchema,
  testSessionIdParamSchema,
  listTestSessionsSchema,
  assignGroupsSchema,
  assignParticipantsSchema
} from '../validations/test-session.validation';

const router = Router();

// All test session routes should be protected by the authentication middleware
router.use(authenticateToken);

// List Test Sessions
router.get('/', validate(listTestSessionsSchema), getTestSessions);

// Create Test Session
router.post('/', validate(createTestSessionSchema), createTestSession);

// Test Session Summary
router.get('/summary', getTestSessionSummary);

// Test Session Detail
router.get('/:id', validate(testSessionIdParamSchema), getTestSessionDetail);

// Update Test Session
router.put('/:id', validate(updateTestSessionSchema), updateTestSession);

// Cancel/Delete Test Session
router.delete('/:id', validate(testSessionIdParamSchema), deleteTestSession);

// Assign Question Groups to Session
router.post('/:id/assign-groups', validate(assignGroupsSchema), assignQuestionGroups);

// Assign Participants to Session
router.post('/:id/assign-participants', validate(assignParticipantsSchema), assignParticipants);

export default router;
