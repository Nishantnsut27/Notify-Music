import { Schema, model, Document } from 'mongoose';

export interface IAvatar {
  url: string;
  public_id: string;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  avatar?: string | IAvatar;
  avatarUrl?: string;
  avatarPublicId?: string;
  refreshTokenHash?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  role: 'user' | 'admin';
  accountStatus: 'active' | 'suspended' | 'pending';
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    avatarPublicId: {
      type: String,
      default: '',
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Database Indexes for Performance and Fast Lookup
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

export const User = model<IUser>('User', userSchema);
