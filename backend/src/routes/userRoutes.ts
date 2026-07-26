import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { uploadAvatarMiddleware } from '../middleware/upload.middleware.js';

export const userRouter = Router();

// Protect all user feature routes
userRouter.use(authenticateUser as any);

// Profile & Avatar Management (Cloudinary)
userRouter.get('/profile', UserController.getProfile as any);
userRouter.put('/profile', UserController.updateProfile as any);
userRouter.post('/avatar', uploadAvatarMiddleware as any, UserController.uploadAvatar as any);
userRouter.delete('/account', UserController.deleteAccount as any);

// Favorites
userRouter.get('/favorites', UserController.getFavorites as any);
userRouter.post('/favorites', UserController.addFavorite as any);
userRouter.delete('/favorites/:trackId', UserController.removeFavorite as any);

// Playlists
userRouter.get('/playlists', UserController.getPlaylists as any);
userRouter.post('/playlists', UserController.createPlaylist as any);
userRouter.put('/playlists/:id', UserController.updatePlaylist as any);
userRouter.delete('/playlists/:id', UserController.deletePlaylist as any);

// Playlist Tracks
userRouter.post('/playlists/:id/tracks', UserController.addTrackToPlaylist as any);
userRouter.delete('/playlists/:id/tracks/:trackId', UserController.removeTrackFromPlaylist as any);
userRouter.put('/playlists/:id/tracks/reorder', UserController.reorderPlaylistTracks as any);

// Recently Played & Listening History
userRouter.get('/recently-played', UserController.getRecentlyPlayed as any);
userRouter.post('/recently-played', UserController.addRecentlyPlayed as any);
userRouter.get('/history', UserController.getListeningHistory as any);
userRouter.post('/history', UserController.recordListeningHistory as any);
