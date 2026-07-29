import crypto from 'crypto';
import { User, IUser } from '../models/user.model.js';
import { hashPassword, comparePassword } from '../utils/password.utils.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.utils.js';
import { AppError } from '../utils/AppError.js';

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SanitizedUser {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  avatarPublicId?: string;
  role: 'user' | 'admin';
  accountStatus: 'active' | 'suspended' | 'pending';
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class AuthService {
  /**
   * Helper to format sanitized user response (omitting sensitive fields like password & token hashes)
   */
  public static sanitizeUser(user: IUser): SanitizedUser {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatarUrl || (typeof user.avatar === 'string' ? user.avatar : user.avatar?.url) || '',
      avatarPublicId: user.avatarPublicId || (typeof user.avatar === 'object' ? user.avatar?.public_id : ''),
      role: user.role,
      accountStatus: user.accountStatus,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register new user account
   */
  public static async registerUser(data: RegisterDTO): Promise<{ user: SanitizedUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('An account with this email address is already registered.', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const newUser = new User({
      fullName: data.fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      accountStatus: 'active',
      isEmailVerified: false,
    });

    const accessToken = generateAccessToken(newUser._id.toString(), newUser.role);
    const refreshToken = generateRefreshToken(newUser._id.toString(), newUser.role);

    newUser.refreshTokenHash = await hashPassword(refreshToken);
    await newUser.save();

    console.log(`👤 [Auth] User registered: ${newUser.email} (${newUser._id})`);

    return {
      user: this.sanitizeUser(newUser),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  public static async loginUser(data: LoginDTO): Promise<{ user: SanitizedUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+password +refreshTokenHash');

    if (!user || !user.password) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (user.accountStatus !== 'active') {
      throw new AppError('Your account is currently suspended or inactive.', 403);
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), user.role);

    user.refreshTokenHash = await hashPassword(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    console.log(`🔑 [Auth] User logged in: ${user.email} (${user._id})`);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate and refresh access token using valid refresh token
   */
  public static async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; user: SanitizedUser }> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await User.findById(payload.userId).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      throw new AppError('User session not found.', 401);
    }

    const isMatch = await comparePassword(token, user.refreshTokenHash);
    if (!isMatch) {
      throw new AppError('Revoked or reused refresh token.', 401);
    }

    const newAccessToken = generateAccessToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.role);

    user.refreshTokenHash = await hashPassword(newRefreshToken);
    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Invalidate user refresh token on logout
   */
  public static async revokeRefreshToken(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
  }

  /**
   * Change user password
   */
  public static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user || !user.password) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    console.log(`🔒 [Auth] Password changed for user: ${user._id}`);
  }

  /**
   * Generate password reset token
   */
  public static async requestPasswordReset(email: string): Promise<{ resetToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Prevent user enumeration by returning pseudo-success token
      return { resetToken: crypto.randomBytes(32).toString('hex') };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    await user.save();

    console.log(`📧 [Auth] Generated password reset token for: ${user.email}`);

    return { resetToken };
  }

  /**
   * Reset password with reset token
   */
  public static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired.', 400);
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ [Auth] Password successfully reset for: ${user.email}`);
  }

  /**
   * Generate Email Verification token
   */
  public static async sendVerificationToken(userId: string): Promise<{ verificationToken: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return { verificationToken };
  }

  /**
   * Verify email token
   */
  public static async verifyEmail(token: string): Promise<SanitizedUser> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Email verification token is invalid or has expired.', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log(`✉️ [Auth] Email verified for user: ${user.email}`);
    return this.sanitizeUser(user);
  }

  /**
   * Get user profile
   */
  public static async getUserProfile(userId: string): Promise<SanitizedUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404);
    }
    return this.sanitizeUser(user);
  }
}
