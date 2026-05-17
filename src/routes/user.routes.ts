import { Router } from 'express';
import {
  getUsers,
  createUser,
  getUserSummary,
  getUserDetail,
  updateUser,
  deleteUser,
  getUserAttempts,
  importUsers,
  resetUserPassword
} from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadExcel } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersSchema
} from '../validations/user.validation';

const router = Router();

// All user routes should be protected by the authentication middleware
router.use(authenticateToken);

// List User
router.get('/', validate(listUsersSchema), getUsers);

// Create User
router.post('/', validate(createUserSchema), createUser);

// Import Users from Excel
router.post('/import', uploadExcel.single('file'), importUsers);

// User Summary
router.get('/summary', getUserSummary);

// User Detail
router.get('/:id', validate(userIdParamSchema), getUserDetail);

// Update User
router.put('/:id', validate(updateUserSchema), updateUser);

// Delete User
router.delete('/:id', validate(userIdParamSchema), deleteUser);

// Reset User Password
router.put('/:id/reset-password', validate(userIdParamSchema), resetUserPassword);

// Get User Attempts
router.get('/:id/attempts', validate(userIdParamSchema), getUserAttempts);

export default router;
