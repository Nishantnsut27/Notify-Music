# Notify Music Player - Backend API Documentation & Production Guide

A secure, scalable Express + TypeScript backend providing JWT authentication (Access & Refresh tokens), MongoDB Atlas database persistence, and Cloudinary media management for Notify Music Player.

---

## 🚀 Environment Variables

Create `.env` in the `backend/` root directory:

```env
PORT=5000
NODE_ENV=production

# MongoDB Atlas Configuration
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.ebf1wte.mongodb.net/notify_music_player?retryWrites=true&w=majority"
MONGODB_DB_NAME="notify_music_player"

# JWT Authentication Configuration
JWT_SECRET="notify_music_player_super_secret_jwt_key_2026_prod"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="notify_music_player_refresh_secret_key_2026_prod"
REFRESH_TOKEN_EXPIRES_IN="7d"
COOKIE_SECRET="notify_music_player_cookie_secret_2026"

# Cloudinary Avatar Storage Configuration
CLOUDINARY_CLOUD_NAME="akjtj9a8"
CLOUDINARY_API_KEY="246473713748162"
CLOUDINARY_API_SECRET="KyDsVGeClNjzd4I3QI9ticzHvHU"

# External Music Provider APIs
JIOSAAVN_API_URL="https://saavn.sumit.co"
JAMENDO_API_URL="https://api.jamendo.com/v3.0"
JAMENDO_CLIENT_ID="2fa42d8a"

# CORS Allowed Origins
ALLOWED_ORIGINS="http://localhost:5173,https://notify-music-player.vercel.app"
```

---

## 🔐 Dual Token Authentication Flow

1. **User Registration / Login (`POST /api/auth/register`, `POST /api/auth/login`)**:
   - Generates a short-lived **Access Token** (15m expiration) and long-lived **Refresh Token** (7d expiration).
   - Issues `auth_token` and `refresh_token` HTTP-only, secure, `SameSite=Lax` cookies.
   - Hashes and stores the refresh token in MongoDB Atlas (`refreshTokenHash`).

2. **Automatic Token Renewal (`POST /api/auth/refresh`)**:
   - When the 15m access token expires, `apiClient.ts` automatically sends a `POST /api/auth/refresh` request with the HTTP-only refresh token cookie.
   - The server verifies the refresh token, rotates the refresh token in DB, and issues new cookies seamlessly without disrupting active listening.

3. **Revocation & Logout (`POST /api/auth/logout`)**:
   - Clears `auth_token` and `refresh_token` cookies and unsets `refreshTokenHash` in MongoDB.

---

## 📡 API Reference

### 1. Authentication Endpoints (`/api/auth/*`)
- `POST /api/auth/register` - Create new user account.
- `POST /api/auth/login` - Authenticate user & issue cookies.
- `POST /api/auth/refresh` - Rotate access and refresh tokens.
- `POST /api/auth/logout` - Clear cookies & revoke refresh session.
- `GET /api/auth/me` - [Protected] Fetch current authenticated user profile.
- `POST /api/auth/change-password` - [Protected] Update current password.
- `POST /api/auth/forgot-password` - Request password reset token.
- `POST /api/auth/reset-password` - Reset password using reset token.
- `POST /api/auth/verify-email` - Verify email token.

### 2. User & Cloud Management (`/api/user/*`)
- `GET /api/user/profile` - Get user account statistics.
- `PUT /api/user/profile` - Update full name or avatar.
- `POST /api/user/avatar` - Upload/replace avatar via Cloudinary (multipart `FormData` with field `avatar`). Automatically deletes previous Cloudinary asset.
- `DELETE /api/user/account` - Cascade delete user account and cloud data.

### 3. User Favorites & Playlists (`/api/user/*`)
- `GET /api/user/favorites` - Get saved favorite songs.
- `POST /api/user/favorites` - Add track to favorites.
- `DELETE /api/user/favorites/:trackId` - Remove track from favorites.
- `GET /api/user/playlists` - Get user playlists.
- `POST /api/user/playlists` - Create new playlist.
- `PUT /api/user/playlists/:id` - Rename or update playlist.
- `DELETE /api/user/playlists/:id` - Delete playlist.
- `POST /api/user/playlists/:id/tracks` - Add track to playlist.
- `DELETE /api/user/playlists/:id/tracks/:trackId` - Remove track from playlist.

### 4. Recently Played & Listening History (`/api/user/*`)
- `GET /api/user/recently-played` - Fetch recent playback queue.
- `POST /api/user/recently-played` - Record recently played track.
- `GET /api/user/history` - Fetch full listening history.
- `POST /api/user/history` - Record play timestamp & duration.

---

## 🛠️ Deployment Instructions

### Render Backend Deployment
1. Create a **Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Build Command: `npm --prefix backend install && npm --prefix backend run build`
4. Start Command: `node backend/dist/index.js`
5. Configure Environment Variables in Render Dashboard.

### Vercel Frontend Deployment
1. Connect your repository to [Vercel](https://vercel.com).
2. Set Build Command: `npm run build`
3. Output Directory: `dist`
