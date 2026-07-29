import { Router, type RequestHandler } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validateRegisterInput, validateLoginInput } from '../middleware/authValidation.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authLimiter, otpLimiter, forgotPasswordLimiter } from '../middleware/rateLimit.middleware.js';

export const authRouter = Router();

authRouter.post('/send-otp', authLimiter, validateRegisterInput as RequestHandler, AuthController.sendOtp as RequestHandler);
authRouter.post('/resend-otp', otpLimiter, AuthController.resendOtp as RequestHandler);
authRouter.post('/verify-otp', otpLimiter, AuthController.verifyOtp as RequestHandler);

authRouter.post('/register', authLimiter, AuthController.register as RequestHandler);
authRouter.post('/login', authLimiter, validateLoginInput, AuthController.login as RequestHandler);
authRouter.post('/refresh', AuthController.refresh as RequestHandler);
authRouter.post('/logout', AuthController.logout as RequestHandler);

authRouter.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword as RequestHandler);
authRouter.post('/verify-reset-otp', otpLimiter, AuthController.verifyResetOtp as RequestHandler);
authRouter.post('/resend-reset-otp', otpLimiter, AuthController.resendResetOtp as RequestHandler);
authRouter.post('/reset-password', forgotPasswordLimiter, AuthController.resetPassword as RequestHandler);

authRouter.post('/verify-email', AuthController.verifyEmail as RequestHandler);

authRouter.get('/me', authenticateUser as RequestHandler, AuthController.getMe as RequestHandler);
authRouter.post('/change-password', authenticateUser as RequestHandler, AuthController.changePassword as RequestHandler);
