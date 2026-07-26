import { Schema, model, Document, Types } from 'mongoose';
import { ISongSubDoc, songSubSchema } from './playlist.model.js';

export interface IListeningHistory extends Document {
  user: Types.ObjectId;
  trackId: string;
  trackData: ISongSubDoc;
  playDurationSeconds: number;
  completed: boolean;
  playedAt: Date;
}

const listeningHistorySchema = new Schema<IListeningHistory>(
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
    playDurationSeconds: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
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

listeningHistorySchema.index({ user: 1, playedAt: -1 });

export const ListeningHistory = model<IListeningHistory>('ListeningHistory', listeningHistorySchema);
