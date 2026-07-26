import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

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
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .max(100, 'Password is too long.'),
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
});

export const validateRegisterInput = (req: Request, res: Response, next: NextFunction): void => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error.issues[0]?.message || 'Invalid registration input.',
    });
    return;
  }

  req.body = result.data;
  next();
};

export const validateLoginInput = (req: Request, res: Response, next: NextFunction): void => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error.issues[0]?.message || 'Invalid login input.',
    });
    return;
  }

  req.body = result.data;
  next();
};
