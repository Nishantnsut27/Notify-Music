import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { setAuthCookies, clearAuthCookies } from '../utils/token.utils.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  /**
   * Handle user registration
   */
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.registerUser(req.body);

      // Set HTTP-only cookies for Access and Refresh tokens
      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        user,
        token: accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user login
   */
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.loginUser(req.body);

      // Set HTTP-only cookies for Access and Refresh tokens
      setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        user,
        token: accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh expired access token using valid refresh token
   */
  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: 'Refresh token is required.',
        });
        return;
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = await AuthService.refreshToken(refreshToken);

      setAuthCookies(res, newAccessToken, newRefreshToken);

      res.status(200).json({
        success: true,
        token: newAccessToken,
        user,
      });
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  /**
   * Handle user logout
   */
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user) {
      await AuthService.revokeRefreshToken(req.user._id.toString()).catch(() => {});
    }
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  /**
   * Handle current user profile fetch
   */
  public static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthenticated request.',
        });
        return;
      }

      const userProfile = await AuthService.getUserProfile(req.user._id.toString());

      res.status(200).json({
        success: true,
        user: userProfile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Password Change
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required.',
        });
        return;
      }

      await AuthService.changePassword(req.user!._id.toString(), currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Forgot Password Token Request
   */
  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email address is required.',
        });
        return;
      }

      const { resetToken } = await AuthService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: 'Password reset link / token generated.',
        resetToken, // Exposed for client demonstration/email delivery
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Reset Password Execution
   */
  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Reset token and new password are required.',
        });
        return;
      }

      await AuthService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Email Verification
   */
  public static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required.',
        });
        return;
      }

      const user = await AuthService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email address verified successfully.',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
