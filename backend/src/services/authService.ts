import crypto from 'crypto';
import { User, IUser, IRefreshSession } from '../models/user.model.js';
import { hashPassword, comparePassword } from '../utils/password.utils.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  tokenHashesMatch,
  getTokenExpiry,
} from '../utils/token.utils.js';
import { AppError } from '../utils/AppError.js';
import { EmailService } from './emailService.js';
import { VerifiedGoogleIdentity } from './googleOAuthService.js';

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
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

export interface AuthSession {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
  persistent: boolean;
}

export interface RefreshResult {
  user: SanitizedUser;
  accessToken: string;
  /** Absent when a just-rotated token is replayed inside the grace window; the cookie already holds the newer token. */
  refreshToken?: string;
  persistent: boolean;
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

const OTP_MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const MAX_REFRESH_SESSIONS = 10;
// Parallel tabs share one refresh cookie; the loser of a rotation race replays the old token moments later.
const REFRESH_ROTATION_GRACE_MS = 60 * 1000;

const OTP_KINDS = {
  verification: {
    hash: 'verificationOtpHash',
    expiresAt: 'verificationOtpExpiresAt',
    attempts: 'verificationAttempts',
    missing: 'No verification code was requested. Please request a new one.',
    expired: 'Verification code has expired. Please request a new one.',
    invalid: 'Invalid verification code.',
  },
  reset: {
    hash: 'resetOtpHash',
    expiresAt: 'resetOtpExpiresAt',
    attempts: 'resetAttempts',
    missing: 'No reset code was requested. Please request a new one.',
    expired: 'Reset code has expired. Please request a new one.',
    invalid: 'Invalid reset code.',
  },
} as const;

type OtpKind = keyof typeof OTP_KINDS;

const isWithinResendCooldown = (expiresAt?: Date): boolean => {
  if (!expiresAt) return false;
  const sentAt = expiresAt.getTime() - OTP_EXPIRY_MS;
  return Date.now() - sentAt < OTP_RESEND_COOLDOWN_MS;
};

const normalizeEmail = (email: string): string => email.toLowerCase().trim();

export class AuthService {
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

  static async sendVerificationOtp(data: { fullName: string; email: string; password: string }): Promise<void> {
    const normalizedEmail = normalizeEmail(data.email);

    const existingUser = await User.findOne({ email: normalizedEmail }).select('+verificationOtpExpiresAt');
    if (existingUser && existingUser.isEmailVerified) {
      throw new AppError('An account with this email address is already registered.', 400);
    }
    if (existingUser && isWithinResendCooldown(existingUser.verificationOtpExpiresAt)) {
      throw new AppError('Please wait a few seconds before requesting another code.', 429);
    }

    const otp = generateOtp();
    const otpHash = await hashPassword(otp);

    await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          fullName: data.fullName.trim(),
          email: normalizedEmail,
          password: await hashPassword(data.password),
          verificationOtpHash: otpHash,
          verificationOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
          verificationAttempts: 0,
          isEmailVerified: false,
          refreshSessions: [],
        },
        $setOnInsert: {
          role: 'user',
          accountStatus: 'active',
        },
        $unset: { refreshTokenHash: 1 },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    await EmailService.sendVerificationOtp(normalizedEmail, otp);
  }

  static async resendVerificationOtp(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('+verificationOtpExpiresAt');
    if (!user) {
      throw new AppError('No registration in progress for this email.', 400);
    }
    if (user.isEmailVerified) {
      throw new AppError('This email is already verified.', 400);
    }
    if (isWithinResendCooldown(user.verificationOtpExpiresAt)) {
      throw new AppError('Please wait a few seconds before requesting another code.', 429);
    }

    await this.issueVerificationOtp(user);
  }

  private static async issueVerificationOtp(user: IUser): Promise<void> {
    const otp = generateOtp();

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationOtpHash: await hashPassword(otp),
          verificationOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
          verificationAttempts: 0,
        },
      }
    );

    await EmailService.sendVerificationOtp(user.email, otp);
  }

  private static async clearOtp(userId: IUser['_id'], kind: OtpKind): Promise<void> {
    const fields = OTP_KINDS[kind];
    await User.updateOne(
      { _id: userId },
      { $unset: { [fields.hash]: 1, [fields.expiresAt]: 1 }, $set: { [fields.attempts]: 0 } }
    );
  }

  /** Counts the attempt atomically before comparing, so parallel guesses cannot exceed OTP_MAX_ATTEMPTS. */
  private static async consumeOtpAttempt(kind: OtpKind, email: string, otp: string): Promise<IUser> {
    const fields = OTP_KINDS[kind];
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOneAndUpdate(
      {
        email: normalizedEmail,
        [fields.hash]: { $exists: true },
        [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
      },
      { $inc: { [fields.attempts]: 1 } },
      { new: true }
    ).select(`+${fields.hash} +${fields.expiresAt}`);

    if (!user) {
      const pending = await User.findOne({ email: normalizedEmail }).select(`+${fields.hash}`);
      if (pending?.get(fields.hash)) {
        await this.clearOtp(pending._id, kind);
        throw new AppError('Too many incorrect attempts. Please request a new code.', 429);
      }
      throw new AppError(fields.missing, 400);
    }

    const expiresAt = user.get(fields.expiresAt) as Date | undefined;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      await this.clearOtp(user._id, kind);
      throw new AppError(fields.expired, 400);
    }

    const isValid = await comparePassword(otp, user.get(fields.hash) as string);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - ((user.get(fields.attempts) as number) || 0);
      throw new AppError(
        remaining > 0
          ? `${fields.invalid} ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many incorrect attempts. Please request a new code.',
        400
      );
    }

    return user;
  }

  static async verifyEmailOtp(email: string, otp: string): Promise<void> {
    const user = await this.consumeOtpAttempt('verification', email, otp);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true, verificationAttempts: 0 },
        $unset: { verificationOtpHash: 1, verificationOtpExpiresAt: 1 },
      }
    );
  }

  private static async startSession(user: IUser, persistent: boolean): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const accessToken = generateAccessToken(user._id.toString(), user.role, sessionId);
    const refreshToken = generateRefreshToken(user._id.toString(), user.role);
    const session: IRefreshSession = {
      sessionId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getTokenExpiry(refreshToken),
      persistent,
    };
    const lastLoginAt = new Date();

    await User.updateOne(
      { _id: user._id },
      {
        $set: { lastLoginAt },
        $unset: { refreshTokenHash: 1 },
        $push: {
          refreshSessions: {
            $each: [session],
            $sort: { expiresAt: -1 },
            $slice: MAX_REFRESH_SESSIONS,
          },
        },
      }
    );

    user.lastLoginAt = lastLoginAt;
    return { user: this.sanitizeUser(user), accessToken, refreshToken, persistent };
  }

  public static async registerUser(data: RegisterDTO): Promise<AuthSession> {
    const normalizedEmail = normalizeEmail(data.email);

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) {
      throw new AppError('Please complete email verification first.', 400);
    }
    if (!user.isEmailVerified) {
      throw new AppError('Email is not verified. Please verify your email first.', 400);
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (user.accountStatus !== 'active') {
      throw new AppError('Your account is currently suspended or inactive.', 403);
    }

    return this.startSession(user, true);
  }

  public static async loginUser(data: LoginDTO): Promise<AuthSession> {
    const normalizedEmail = normalizeEmail(data.email);

    const user = await User.findOne({ email: normalizedEmail }).select('+password +verificationOtpExpiresAt');

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

    if (!user.isEmailVerified) {
      if (!isWithinResendCooldown(user.verificationOtpExpiresAt)) {
        await this.issueVerificationOtp(user);
      }
      throw new AppError(
        'Please verify your email to continue. We sent a 6-digit code to your inbox.',
        403,
        'EMAIL_NOT_VERIFIED'
      );
    }

    return this.startSession(user, data.rememberMe !== false);
  }

  public static async authenticateWithGoogle(identity: VerifiedGoogleIdentity): Promise<AuthSession> {
    const user = await this.findOrCreateGoogleUser(identity);

    if (user.accountStatus !== 'active') {
      throw new AppError('Your account is currently suspended or inactive.', 403);
    }

    return this.startSession(user, true);
  }

  private static async findOrCreateGoogleUser(identity: VerifiedGoogleIdentity): Promise<IUser> {
    const existingByIdentity = await User.findOne({ authProviders: { $elemMatch: { provider: 'google', providerId: identity.sub } } });
    if (existingByIdentity) {
      return existingByIdentity;
    }

    const existingByEmail = await User.findOne({ email: identity.email }).select('+password');
    if (existingByEmail) {
      if (!identity.emailVerified) {
        throw new AppError('We could not verify this email with Google. Please log in with your existing Soundrift password instead.', 409);
      }

      if (!existingByEmail.isEmailVerified) {
        // Nobody proved ownership of this address before, so the password may belong to someone who squatted it.
        existingByEmail.password = undefined;
        existingByEmail.verificationOtpHash = undefined;
        existingByEmail.verificationOtpExpiresAt = undefined;
        existingByEmail.verificationAttempts = 0;
      }

      existingByEmail.authProviders = [
        ...(existingByEmail.authProviders || []),
        { provider: 'google', providerId: identity.sub },
      ];
      existingByEmail.isEmailVerified = true;
      if (!existingByEmail.avatarUrl && identity.picture) {
        existingByEmail.avatarUrl = identity.picture;
      }
      await existingByEmail.save();
      return existingByEmail;
    }

    const fullName = (identity.fullName || '').trim();
    const created = await User.create({
      fullName: fullName.length >= 2 ? fullName.slice(0, 100) : 'Google User',
      email: identity.email,
      password: undefined,
      authProviders: [{ provider: 'google', providerId: identity.sub }],
      avatarUrl: identity.picture || '',
      isEmailVerified: identity.emailVerified,
      accountStatus: 'active',
      role: 'user',
    });
    return created;
  }

  public static async refreshToken(token: string): Promise<RefreshResult> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await User.findById(payload.userId).select('+refreshSessions +refreshTokenHash');
    if (!user) {
      throw new AppError('User session not found.', 401);
    }
    if (user.accountStatus !== 'active') {
      throw new AppError('Your account is currently suspended or inactive.', 403);
    }

    const presentedHash = hashToken(token);
    const now = Date.now();
    const sessions = (user.refreshSessions || []).filter((session) => session.expiresAt.getTime() > now);

    const current = sessions.find((session) => tokenHashesMatch(session.tokenHash, presentedHash));
    if (current) {
      const accessToken = generateAccessToken(user._id.toString(), user.role, current.sessionId);
      const refreshToken = generateRefreshToken(user._id.toString(), user.role);

      const rotation = await User.updateOne(
        { _id: user._id, 'refreshSessions.tokenHash': current.tokenHash },
        {
          $set: {
            'refreshSessions.$.tokenHash': hashToken(refreshToken),
            'refreshSessions.$.previousTokenHash': current.tokenHash,
            'refreshSessions.$.rotatedAt': new Date(),
            'refreshSessions.$.expiresAt': getTokenExpiry(refreshToken),
          },
        }
      );

      if (rotation.modifiedCount === 0) {
        return { user: this.sanitizeUser(user), accessToken, persistent: current.persistent };
      }
      return { user: this.sanitizeUser(user), accessToken, refreshToken, persistent: current.persistent };
    }

    const justRotated = sessions.find((session) =>
      session.previousTokenHash
      && session.rotatedAt
      && now - session.rotatedAt.getTime() < REFRESH_ROTATION_GRACE_MS
      && tokenHashesMatch(session.previousTokenHash, presentedHash)
    );
    if (justRotated) {
      return {
        user: this.sanitizeUser(user),
        accessToken: generateAccessToken(user._id.toString(), user.role, justRotated.sessionId),
        persistent: justRotated.persistent,
      };
    }

    if (user.refreshTokenHash && await comparePassword(token, user.refreshTokenHash)) {
      return this.startSession(user, true);
    }

    throw new AppError('Revoked or reused refresh token.', 401);
  }

  public static async revokeSession(token: string): Promise<void> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return;
    }
    const presentedHash = hashToken(token);
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { refreshSessions: { tokenHash: presentedHash } }, $unset: { refreshTokenHash: 1 } }
    );
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { refreshSessions: { previousTokenHash: presentedHash } } }
    );
  }

  private static async isPersistentSession(userId: IUser['_id'], refreshToken?: string): Promise<boolean> {
    if (!refreshToken) return true;
    const user = await User.findById(userId).select('+refreshSessions');
    const presentedHash = hashToken(refreshToken);
    const session = user?.refreshSessions?.find((entry) => tokenHashesMatch(entry.tokenHash, presentedHash));
    return session?.persistent ?? true;
  }

  public static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken?: string
  ): Promise<AuthSession> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (!user.password) {
      throw new AppError('This account signs in with Google and has no password yet. Use "Forgot password" to set one.', 400);
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const isSameAsCurrent = await comparePassword(newPassword, user.password);
    if (isSameAsCurrent) {
      throw new AppError('New password must be different from your current password.', 400);
    }

    const persistent = await this.isPersistentSession(user._id, currentRefreshToken);

    // One write: a new password must never coexist with the sessions it was meant to end.
    const result = await User.updateOne(
      { _id: user._id, password: user.password },
      {
        $set: { password: await hashPassword(newPassword), refreshSessions: [] },
        $unset: { refreshTokenHash: 1 },
      }
    );
    if (result.modifiedCount === 0) {
      throw new AppError('Your password was changed by another request. Please try again.', 409);
    }

    return this.startSession(user, persistent);
  }

  static async sendResetOtp(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('+resetOtpExpiresAt');
    if (!user || isWithinResendCooldown(user.resetOtpExpiresAt)) {
      return;
    }

    const otp = generateOtp();

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetOtpHash: await hashPassword(otp),
          resetOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
          resetAttempts: 0,
        },
      }
    );

    await EmailService.sendPasswordResetOtp(normalizedEmail, otp);
  }

  static async resendResetOtp(email: string): Promise<void> {
    await this.sendResetOtp(email);
  }

  static async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const user = await this.consumeOtpAttempt('reset', email, otp);

    const resetToken = crypto.randomBytes(32).toString('hex');

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetAttempts: 0,
          passwordResetToken: hashToken(resetToken),
          passwordResetExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
        },
        $unset: { resetOtpHash: 1, resetOtpExpiresAt: 1 },
      }
    );

    return { resetToken };
  }

  public static async resetPassword(email: string, newPassword: string, resetToken: string): Promise<void> {
    if (!resetToken) {
      throw new AppError('Reset authorization token is required.', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    const result = await User.updateOne(
      {
        email: normalizeEmail(email),
        passwordResetToken: hashToken(resetToken),
        passwordResetExpires: { $gt: new Date() },
      },
      {
        // Completing the emailed OTP proves ownership of the address.
        $set: { password: passwordHash, isEmailVerified: true, refreshSessions: [] },
        $unset: { passwordResetToken: 1, passwordResetExpires: 1, refreshTokenHash: 1 },
      }
    );

    if (result.modifiedCount === 0) {
      throw new AppError('Invalid or expired reset authorization token.', 400);
    }
  }

  public static async getUserProfile(userId: string): Promise<SanitizedUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404);
    }
    return this.sanitizeUser(user);
  }
}
