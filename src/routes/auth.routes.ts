import { Router } from 'express';
import { register, login, logout } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validations/auth.validation';

const router = Router();

// Register route (useful for creating the first admin or general registration)
router.post('/register', validate(registerSchema), register);

// Login route
router.post('/login', validate(loginSchema), login);

// Logout route
router.post('/logout', logout);

export default router;
