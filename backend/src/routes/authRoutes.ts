import { Router, type RequestHandler } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validateRegisterInput, validateLoginInput } from '../middleware/authValidation.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

export const authRouter = Router();

// Public Auth Endpoints
authRouter.post('/register', authLimiter, validateRegisterInput, AuthController.register as RequestHandler);
authRouter.post('/login', authLimiter, validateLoginInput, AuthController.login as RequestHandler);
authRouter.post('/refresh', AuthController.refresh as RequestHandler);
authRouter.post('/logout', AuthController.logout as RequestHandler);

// Password Management & Email Verification Foundation
authRouter.post('/forgot-password', authLimiter, AuthController.forgotPassword as RequestHandler);
authRouter.post('/reset-password', authLimiter, AuthController.resetPassword as RequestHandler);
authRouter.post('/verify-email', AuthController.verifyEmail as RequestHandler);

// Protected Auth Endpoints
authRouter.get('/me', authenticateUser as RequestHandler, AuthController.getMe as RequestHandler);
authRouter.post('/change-password', authenticateUser as RequestHandler, AuthController.changePassword as RequestHandler);
