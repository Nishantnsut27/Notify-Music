# Soundrift

> Drift Into Your Next Favorite.

[![Live App](https://img.shields.io/badge/Live-soundrift.tech-black?style=flat-square)](https://www.soundrift.tech)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

Soundrift is a full-stack music streaming and discovery platform designed around a fast listening experience, personalized libraries, curated discovery, and music that remains available when the internet does not.

## Features

### Music discovery
- Search and discover music across the Soundrift catalogue.
- Explore trending music, curated sections, genres, and new releases.
- Browse album, genre, and playlist pages through shareable URLs.
- Get related and recommended tracks.

### Music player
- Persistent browser-based audio player.
- Queue management, seeking, volume control, shuffle, and repeat.
- Media Session support for system and browser media controls.
- Keyboard playback shortcuts.
- Real-time audio visualization.

### Personal library
- Favorites and custom playlists.
- Recently played and listening history.
- Search history.
- Synced user profile and avatar.
- Protected personal library for authenticated users.

### Offline music
- Save supported tracks directly to the device for offline playback.
- Dedicated Offline Music library for downloaded tracks.
- View local storage usage and manage saved music.
- Continue using the player and saved music when the connection is unavailable.

### Authentication
- Email and password authentication.
- Email OTP verification and password reset flows.
- JWT-based access and refresh token authentication.
- Google sign-in.
- Secure authenticated library access.

### AI-powered curation
Soundrift uses a backend curation pipeline to create and persist discovery sections instead of generating them on every page request.

Current sections include:
- Trending Now
- Editor's Picks
- Fresh Releases
- K-Pop
- Worldwide

Curated content is stored in MongoDB and refreshed through the backend.

### Progressive Web App
Soundrift is installable as a Progressive Web App and provides a responsive experience across desktop and mobile devices, including dedicated offline states and local offline music storage.

## Architecture

Soundrift uses a React and Vite frontend with a TypeScript and Express backend. The backend provides authentication, user library services, music discovery, provider abstraction, and AI-assisted curation.

The music provider layer currently uses JioSaavn as the primary source and Jamendo as a fallback. Provider responses are normalized before being consumed by the frontend.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| State | Zustand |
| UI | Lucide React, Sonner, custom CSS |
| PWA | vite-plugin-pwa, service worker |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt, Google OAuth |
| Music providers | JioSaavn, Jamendo |
| AI curation | Groq |
| Email | Brevo |
| Media uploads | Multer, Cloudinary |
| Security | Helmet, CORS, rate limiting, Zod |
| Deployment | Vercel, Render |

## Deployment

The production application is split across:
- Frontend on Vercel
- Backend on Render
- Database on MongoDB / MongoDB Atlas
- Media storage on Cloudinary
- Transactional email through Brevo

The live application is available at [soundrift.tech](https://www.soundrift.tech).

## License

Soundrift is distributed under the MIT License. See [LICENSE](LICENSE) for details.
