import { Router } from 'express';
import {
  getPositions,
  getPositionDetail,
  createPosition,
  updatePosition,
  deletePosition
} from '../controllers/position.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listPositionsSchema,
  positionIdParamSchema,
  createPositionSchema,
  updatePositionSchema
} from '../validations/position.validation';

const router = Router();

router.use(authenticateToken);

// List positions
router.get('/', validate(listPositionsSchema), getPositions);

// Create position
router.post('/', validate(createPositionSchema), createPosition);

// Get position detail
router.get('/:id', validate(positionIdParamSchema), getPositionDetail);

// Update position
router.put('/:id', validate(updatePositionSchema), updatePosition);

// Delete position
router.delete('/:id', validate(positionIdParamSchema), deletePosition);

export default router;
