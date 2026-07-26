import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validateRegisterInput, validateLoginInput } from '../middleware/authValidation.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

export const authRouter = Router();

// Public Auth Endpoints
authRouter.post('/register', authLimiter, validateRegisterInput, AuthController.register as any);
authRouter.post('/login', authLimiter, validateLoginInput, AuthController.login as any);
authRouter.post('/refresh', AuthController.refresh as any);
authRouter.post('/logout', AuthController.logout as any);

// Password Management & Email Verification Foundation
authRouter.post('/forgot-password', authLimiter, AuthController.forgotPassword as any);
authRouter.post('/reset-password', authLimiter, AuthController.resetPassword as any);
authRouter.post('/verify-email', AuthController.verifyEmail as any);

// Protected Auth Endpoints
authRouter.get('/me', authenticateUser as any, AuthController.getMe as any);
authRouter.post('/change-password', authenticateUser as any, AuthController.changePassword as any);
