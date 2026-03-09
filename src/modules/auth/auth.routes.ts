import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
