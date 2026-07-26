import { Schema, model, Document, Types } from 'mongoose';
import { ISongSubDoc, songSubSchema } from './playlist.model.js';

export interface IFavorite extends Document {
  user: Types.ObjectId;
  trackId: string;
  trackData: ISongSubDoc;
  addedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    trackId: {
      type: String,
      required: [true, 'Track ID is required'],
    },
    trackData: {
      type: songSubSchema,
      required: [true, 'Track data sub-document is required'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Prevent duplicate favorites for the same user and track
favoriteSchema.index({ user: 1, trackId: 1 }, { unique: true });

export const Favorite = model<IFavorite>('Favorite', favoriteSchema);
