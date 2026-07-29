import { Schema, model, Document, Types } from 'mongoose';

export interface ISongSubDoc {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  artist_id?: string;
  album_name?: string;
  album_id?: string;
  image?: string;
  audio?: string;
  provider?: 'jiosaavn' | 'jamendo';
}

export interface IPlaylistDoc extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  isPublic: boolean;
  coverImage?: string;
  tracks: ISongSubDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export const songSubSchema = new Schema<ISongSubDoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    duration: { type: Number, default: 0 },
    artist_name: { type: String, default: 'Unknown Artist' },
    artist_id: { type: String, default: '' },
    album_name: { type: String, default: '' },
    album_id: { type: String, default: '' },
    image: { type: String, default: '' },
    audio: { type: String, default: '' },
    provider: { type: String, enum: ['jiosaavn', 'jamendo'], default: 'jamendo' },
  },
  { _id: false }
);

const playlistSchema = new Schema<IPlaylistDoc>(
  {
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true,
      minlength: [1, 'Playlist name cannot be empty'],
      maxlength: [100, 'Playlist name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Playlist owner reference is required'],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    coverImage: {
      type: String,
      default: '',
    },
    tracks: [songSubSchema],
  },
  {
    timestamps: true,
  }
);

// Database Indexes
playlistSchema.index({ owner: 1 });
playlistSchema.index({ owner: 1, name: 1 });
playlistSchema.index({ isPublic: 1 });

export const PlaylistModel = model<IPlaylistDoc>('Playlist', playlistSchema);
