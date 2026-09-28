import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// bcrypt silently ignores bytes past 72, so longer passwords would only be partially checked.
const newPasswordField = z
  .string()
  .min(6, 'Password must be at least 6 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long (max 72 bytes).');

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .transform((val) => val.toLowerCase()),
  password: newPasswordField,
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});

const emailOnlySchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .transform((val) => val.toLowerCase()),
});

const otpSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .transform((val) => val.toLowerCase()),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be 6 digits.'),
});

const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .transform((val) => val.toLowerCase()),
  newPassword: newPasswordField,
  resetToken: z
    .string()
    .trim()
    .min(1, 'Reset authorization token is required.'),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required.'),
  newPassword: newPasswordField,
});

const makeValidator = (schema: z.ZodTypeAny, fallbackMessage: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error.issues[0]?.message || fallbackMessage,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

export const validateRegisterInput = makeValidator(registerSchema, 'Invalid registration input.');
export const validateLoginInput = makeValidator(loginSchema, 'Invalid login input.');
export const validateEmailInput = makeValidator(emailOnlySchema, 'A valid email address is required.');
export const validateOtpInput = makeValidator(otpSchema, 'A valid email and verification code are required.');
export const validateResetPasswordInput = makeValidator(resetPasswordSchema, 'Invalid password reset input.');
export const validateChangePasswordInput = makeValidator(changePasswordSchema, 'Invalid password change input.');
