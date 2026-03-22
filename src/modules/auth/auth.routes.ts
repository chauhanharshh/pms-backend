import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const authController = new AuthController();

// Public routes
router.get('/branding', authController.getBranding.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));
// HIDDEN - Next patch update
// router.post('/google', authController.googleLogin.bind(authController));
// router.post('/google-register', authController.googleRegister.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
