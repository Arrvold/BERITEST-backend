import { Router } from 'express';
import { login, logout } from '../controllers/auth.controller';

const router = Router();

// Login route
router.post('/login', login);

// Logout route
router.post('/logout', logout);

export default router;
