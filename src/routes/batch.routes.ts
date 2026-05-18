import { Router } from 'express';
import {
  getBatches,
  createBatch,
  getBatchSummary,
  getBatchDetail,
  updateBatch,
  deleteBatch,
  assignUsersToBatch
} from '../controllers/batch.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createBatchSchema,
  updateBatchSchema,
  batchIdParamSchema,
  listBatchesSchema,
  assignUsersBatchSchema
} from '../validations/batch.validation';

const router = Router();

// All batch routes should be protected by the authentication middleware
router.use(authenticateToken);

// List Batches
router.get('/', validate(listBatchesSchema), getBatches);

// Create Batch
router.post('/', validate(createBatchSchema), createBatch);

// Batch Summary
router.get('/summary', getBatchSummary);

// Batch Detail
router.get('/:id', validate(batchIdParamSchema), getBatchDetail);

// Update Batch
router.put('/:id', validate(updateBatchSchema), updateBatch);

// Delete Batch (Soft Delete)
router.delete('/:id', validate(batchIdParamSchema), deleteBatch);

// Assign Users to Batch
router.post('/:id/assign-users', validate(assignUsersBatchSchema), assignUsersToBatch);

export default router;
