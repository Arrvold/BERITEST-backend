import { Router } from 'express';
import {
  getQuestionGroups,
  getQuestionGroupDetail,
  createQuestionGroup,
  updateQuestionGroup,
  deleteQuestionGroup,
  addQuestionsToGroup,
  removeQuestionFromGroup,
  randomizeGroup
} from '../controllers/question-group.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listQuestionGroupsSchema,
  questionGroupIdParamSchema,
  createQuestionGroupSchema,
  updateQuestionGroupSchema,
  addQuestionsToGroupSchema,
  removeQuestionFromGroupSchema,
  randomizeGroupSchema
} from '../validations/question-group.validation';

const router = Router();

router.use(authenticateToken);

// List groups
router.get('/', validate(listQuestionGroupsSchema), getQuestionGroups);

// Create group
router.post('/', validate(createQuestionGroupSchema), createQuestionGroup);

// Group detail
router.get('/:id', validate(questionGroupIdParamSchema), getQuestionGroupDetail);

// Update group
router.put('/:id', validate(updateQuestionGroupSchema), updateQuestionGroup);

// Delete group
router.delete('/:id', validate(questionGroupIdParamSchema), deleteQuestionGroup);

// Add questions to group
router.post('/:id/add-questions', validate(addQuestionsToGroupSchema), addQuestionsToGroup);

// Remove a specific question from group
router.delete('/:id/questions/:questionId', validate(removeQuestionFromGroupSchema), removeQuestionFromGroup);

// Randomize group from pool
router.post('/:id/randomize', validate(randomizeGroupSchema), randomizeGroup);

export default router;
