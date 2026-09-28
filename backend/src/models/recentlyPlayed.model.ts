import { Schema, model, Document, Types } from 'mongoose';
import { ISongSubDoc, songSubSchema } from './playlist.model.js';
import { logger, serializeError } from '../utils/logger.js';

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
recentlyPlayedSchema.index({ user: 1, trackId: 1 }, { unique: true });

export const RecentlyPlayed = model<IRecentlyPlayed>('RecentlyPlayed', recentlyPlayedSchema);

/** Keeps the newest row per (user, trackId) and deletes the rest; returns how many were removed. */
async function removeDuplicateRecentlyPlayed(): Promise<number> {
  const groups = await RecentlyPlayed.aggregate<{ staleIds: Types.ObjectId[] }>([
    { $sort: { playedAt: -1, _id: -1 } },
    { $group: { _id: { user: '$user', trackId: '$trackId' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { staleIds: { $slice: ['$ids', 1, { $size: '$ids' }] } } },
  ]).allowDiskUse(true);

  const staleIds = groups.flatMap(group => group.staleIds);
  if (staleIds.length === 0) return 0;
  const { deletedCount } = await RecentlyPlayed.deleteMany({ _id: { $in: staleIds } });
  return deletedCount;
}

/**
 * The unique (user, trackId) index cannot be built while older concurrent upserts left duplicates,
 * and Mongoose's automatic index build fails silently. Clean up first, then build and report.
 */
export async function ensureRecentlyPlayedIndexes(): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const removed = await removeDuplicateRecentlyPlayed();
      await RecentlyPlayed.createIndexes();
      logger.info('RecentlyPlayed', 'Unique (user, trackId) index is in place', { duplicatesRemoved: removed });
      return;
    } catch (error) {
      // A concurrent upsert can recreate a duplicate between cleanup and the build; one more pass covers it.
      logger.error('RecentlyPlayed', 'Unique index build failed', { attempt, error: serializeError(error) });
    }
  }
}
