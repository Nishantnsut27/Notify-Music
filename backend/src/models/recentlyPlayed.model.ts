import { Schema, model, Document, Types } from 'mongoose';
import { ISongSubDoc, songSubSchema } from './playlist.model.js';

export interface IRecentlyPlayed extends Document {
  user: Types.ObjectId;
  trackId: string;
  trackData: ISongSubDoc;
  playedAt: Date;
}

const recentlyPlayedSchema = new Schema<IRecentlyPlayed>(
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
      required: [true, 'Track data is required'],
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

recentlyPlayedSchema.index({ user: 1, playedAt: -1 });

export const RecentlyPlayed = model<IRecentlyPlayed>('RecentlyPlayed', recentlyPlayedSchema);
