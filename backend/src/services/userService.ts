import { User } from '../models/user.model.js';
import { PlaylistModel } from '../models/playlist.model.js';
import { Favorite } from '../models/favorite.model.js';
import { RecentlyPlayed } from '../models/recentlyPlayed.model.js';
import { ListeningHistory } from '../models/listeningHistory.model.js';
import { SearchHistory } from '../models/searchHistory.model.js';
import { CloudinaryService } from './cloudinaryService.js';

export class UserService {
  public static async getSearchHistory(userId: string, limit = 10) {
    return SearchHistory.find({ user: userId }).sort({ searchedAt: -1 }).limit(limit).lean();
  }

  public static async addSearchHistory(userId: string, query: string) {
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    if (!cleanQuery) return;
    await SearchHistory.findOneAndUpdate(
      { user: userId, normalizedQuery: cleanQuery.toLowerCase() },
      { user: userId, query: cleanQuery, normalizedQuery: cleanQuery.toLowerCase(), searchedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const stale = await SearchHistory.find({ user: userId }).sort({ searchedAt: -1 }).skip(10).select('_id').lean();
    if (stale.length) await SearchHistory.deleteMany({ _id: { $in: stale.map(item => item._id) } });
  }

  public static async removeSearchHistory(userId: string, query: string) {
    await SearchHistory.deleteOne({ user: userId, normalizedQuery: query.trim().toLowerCase() });
  }

  public static async clearSearchHistory(userId: string) {
    await SearchHistory.deleteMany({ user: userId });
  }
  // =========================================================================
  // Favorites Service
  // =========================================================================
  
  public static async getFavorites(userId: string) {
    const favorites = await Favorite.find({ user: userId }).sort({ addedAt: -1 }).lean();
    return favorites.map((f) => ({
      ...f.trackData,
      addedAt: f.addedAt,
    }));
  }

  public static async addFavorite(userId: string, trackData: any) {
    if (!trackData || !trackData.id) {
      const error = new Error('Invalid track data');
      (error as any).statusCode = 400;
      throw error;
    }

    const favorite = await Favorite.findOneAndUpdate(
      { user: userId, trackId: trackData.id },
      {
        user: userId,
        trackId: trackData.id,
        trackData: {
          id: trackData.id,
          name: trackData.name || 'Untitled Track',
          duration: trackData.duration || 0,
          artist_name: trackData.artist_name || 'Unknown Artist',
          artist_id: trackData.artist_id || '',
          album_name: trackData.album_name || '',
          album_id: trackData.album_id || '',
          image: trackData.image || '',
          audio: trackData.audio || '',
          provider: trackData.provider || 'jamendo',
        },
        addedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    return favorite.trackData;
  }

  public static async removeFavorite(userId: string, trackId: string) {
    await Favorite.deleteOne({ user: userId, trackId });
    return { trackId };
  }

  // =========================================================================
  // Playlist Management Service (Ownership Enforced)
  // =========================================================================

  public static async getUserPlaylists(userId: string) {
    const playlists = await PlaylistModel.find({ owner: userId }).sort({ updatedAt: -1 }).lean();
    return playlists.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description || '',
      owner: p.owner.toString(),
      isPublic: p.isPublic,
      coverImage: p.coverImage || '',
      tracks: p.tracks || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  public static async createPlaylist(userId: string, name: string, description = '', isPublic = false) {
    const playlist = await PlaylistModel.create({
      name: name.trim(),
      description: description.trim(),
      owner: userId,
      isPublic,
      tracks: [],
    });

    return {
      id: playlist._id.toString(),
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner.toString(),
      isPublic: playlist.isPublic,
      tracks: playlist.tracks,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }

  public static async updatePlaylist(userId: string, playlistId: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    const playlist = await PlaylistModel.findOne({ _id: playlistId, owner: userId });
    if (!playlist) {
      const error = new Error('Playlist not found or access denied');
      (error as any).statusCode = 404;
      throw error;
    }

    if (data.name !== undefined) playlist.name = data.name.trim();
    if (data.description !== undefined) playlist.description = data.description.trim();
    if (data.isPublic !== undefined) playlist.isPublic = data.isPublic;

    await playlist.save();

    return {
      id: playlist._id.toString(),
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner.toString(),
      isPublic: playlist.isPublic,
      tracks: playlist.tracks,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }

  public static async deletePlaylist(userId: string, playlistId: string) {
    const result = await PlaylistModel.deleteOne({ _id: playlistId, owner: userId });
    if (result.deletedCount === 0) {
      const error = new Error('Playlist not found or access denied');
      (error as any).statusCode = 404;
      throw error;
    }
    return { id: playlistId };
  }

  public static async addTrackToPlaylist(userId: string, playlistId: string, trackData: any) {
    const playlist = await PlaylistModel.findOne({ _id: playlistId, owner: userId });
    if (!playlist) {
      const error = new Error('Playlist not found or access denied');
      (error as any).statusCode = 404;
      throw error;
    }

    const newTrack = {
      id: trackData.id,
      name: trackData.name || 'Untitled Track',
      duration: trackData.duration || 0,
      artist_name: trackData.artist_name || 'Unknown Artist',
      artist_id: trackData.artist_id || '',
      album_name: trackData.album_name || '',
      album_id: trackData.album_id || '',
      image: trackData.image || '',
      audio: trackData.audio || '',
      provider: trackData.provider || 'jamendo',
    };

    // Avoid duplicate tracks in same playlist if preferred or append
    playlist.tracks.push(newTrack as any);
    await playlist.save();

    return {
      id: playlist._id.toString(),
      tracks: playlist.tracks,
    };
  }

  public static async removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string) {
    const playlist = await PlaylistModel.findOne({ _id: playlistId, owner: userId });
    if (!playlist) {
      const error = new Error('Playlist not found or access denied');
      (error as any).statusCode = 404;
      throw error;
    }

    playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId) as any;
    await playlist.save();

    return {
      id: playlist._id.toString(),
      tracks: playlist.tracks,
    };
  }

  public static async reorderPlaylistTracks(userId: string, playlistId: string, tracks: any[]) {
    const playlist = await PlaylistModel.findOne({ _id: playlistId, owner: userId });
    if (!playlist) {
      const error = new Error('Playlist not found or access denied');
      (error as any).statusCode = 404;
      throw error;
    }

    playlist.tracks = tracks as any;
    await playlist.save();

    return {
      id: playlist._id.toString(),
      tracks: playlist.tracks,
    };
  }

  // =========================================================================
  // Recently Played & Listening History
  // =========================================================================

  public static async addRecentlyPlayed(userId: string, trackData: any) {
    if (!trackData || !trackData.id) return;

    await RecentlyPlayed.findOneAndUpdate(
      { user: userId, trackId: trackData.id },
      {
        user: userId,
        trackId: trackData.id,
        trackData: {
          id: trackData.id,
          name: trackData.name || 'Untitled Track',
          duration: trackData.duration || 0,
          artist_name: trackData.artist_name || 'Unknown Artist',
          artist_id: trackData.artist_id || '',
          album_name: trackData.album_name || '',
          album_id: trackData.album_id || '',
          image: trackData.image || '',
          audio: trackData.audio || '',
          provider: trackData.provider || 'jamendo',
        },
        playedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  public static async getRecentlyPlayed(userId: string, limit = 20) {
    const items = await RecentlyPlayed.find({ user: userId })
      .sort({ playedAt: -1 })
      .limit(limit)
      .lean();

    return items.map((item) => ({
      ...item.trackData,
      playedAt: item.playedAt,
    }));
  }

  public static async recordListeningHistory(userId: string, trackData: any, playDurationSeconds = 0, completed = false) {
    if (!trackData || !trackData.id) return;

    await ListeningHistory.create({
      user: userId,
      trackId: trackData.id,
      trackData: {
        id: trackData.id,
        name: trackData.name || 'Untitled Track',
        duration: trackData.duration || 0,
        artist_name: trackData.artist_name || 'Unknown Artist',
        artist_id: trackData.artist_id || '',
        album_name: trackData.album_name || '',
        album_id: trackData.album_id || '',
        image: trackData.image || '',
        audio: trackData.audio || '',
        provider: trackData.provider || 'jamendo',
      },
      playDurationSeconds,
      completed,
      playedAt: new Date(),
    });
  }

  public static async getListeningHistory(userId: string, limit = 50) {
    const items = await ListeningHistory.find({ user: userId })
      .sort({ playedAt: -1 })
      .limit(limit)
      .lean();

    return items.map((item) => ({
      ...item.trackData,
      playDurationSeconds: item.playDurationSeconds,
      completed: item.completed,
      playedAt: item.playedAt,
    }));
  }

  // =========================================================================
  // Profile Management
  // =========================================================================

  public static async updateUserProfile(userId: string, data: { fullName?: string; avatar?: string }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (data.fullName !== undefined && data.fullName.trim()) {
      user.fullName = data.fullName.trim();
    }
    if (data.avatar !== undefined) {
      user.avatar = data.avatar;
    }

    await user.save();

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatarUrl || (typeof user.avatar === 'string' ? user.avatar : user.avatar?.url) || '',
      avatarPublicId: user.avatarPublicId,
      role: user.role,
      accountStatus: user.accountStatus,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Upload/replace user avatar using Cloudinary with automatic deletion of previous asset
   */
  public static async uploadAvatar(userId: string, fileBuffer: Buffer) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Delete existing Cloudinary image asset if present
    if (user.avatarPublicId) {
      await CloudinaryService.deleteAvatar(user.avatarPublicId);
    }

    // Upload new image buffer to Cloudinary
    const uploadResult = await CloudinaryService.uploadAvatarBuffer(fileBuffer);

    user.avatarUrl = uploadResult.url;
    user.avatarPublicId = uploadResult.public_id;
    await user.save();

    console.log(`🖼️ [Cloudinary] Avatar updated for user ${user.email}: ${uploadResult.url}`);

    return {
      url: uploadResult.url,
      public_id: uploadResult.public_id,
    };
  }

  /**
   * Delete user account and cascade delete user data from MongoDB Atlas
   */
  public static async deleteAccount(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User account not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Delete Cloudinary avatar if present
    if (user.avatarPublicId) {
      await CloudinaryService.deleteAvatar(user.avatarPublicId);
    }

    // Cascade delete user documents
    await Promise.all([
      PlaylistModel.deleteMany({ owner: userId }),
      Favorite.deleteMany({ user: userId }),
      RecentlyPlayed.deleteMany({ user: userId }),
      ListeningHistory.deleteMany({ user: userId }),
      User.deleteOne({ _id: userId }),
    ]);

    console.log(`🗑️ [Account] Deleted user account & associated data: ${user.email} (${userId})`);
    return { success: true };
  }
}
