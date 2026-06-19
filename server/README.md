# Wavelength API

Express + MongoDB backend providing accounts and cloud sync (liked songs + playlists).

## Setup

```bash
cp .env.example .env     # set MONGO_URI and a strong JWT_SECRET
npm install
npm run dev              # http://localhost:4000
```

You need MongoDB running. Either install locally, or use a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster and paste its
connection string into `MONGO_URI`.

## Test it (no MongoDB needed)

```bash
npm run smoke
```

Boots the real app against an in-memory MongoDB and runs an end-to-end check of
auth, likes, playlists, and cross-user isolation (18 assertions). Great for CI
or a quick sanity check without setting up a database.

## Endpoints

| Method | Path                              | Auth | Description                |
|--------|-----------------------------------|------|----------------------------|
| POST   | `/api/auth/register`              | —    | Create account → `{token, user}` |
| POST   | `/api/auth/login`                 | —    | Log in → `{token, user}`   |
| GET    | `/api/me`                         | ✓    | Current profile + liked songs |
| POST   | `/api/me/likes`                   | ✓    | Like a track (send track snapshot) |
| DELETE | `/api/me/likes/:trackId`          | ✓    | Unlike a track             |
| GET    | `/api/playlists`                  | ✓    | List my playlists          |
| POST   | `/api/playlists`                  | ✓    | Create playlist            |
| GET    | `/api/playlists/:id`              | ✓    | Get one playlist           |
| PATCH  | `/api/playlists/:id`              | ✓    | Rename / edit description  |
| DELETE | `/api/playlists/:id`              | ✓    | Delete playlist            |
| POST   | `/api/playlists/:id/tracks`       | ✓    | Add a track                |
| DELETE | `/api/playlists/:id/tracks/:trackId` | ✓ | Remove a track             |

Authenticated requests must send `Authorization: Bearer <token>`.

A **track snapshot** is the JSON shape stored in likes/playlists:

```json
{ "trackId": "abc123", "title": "Song", "artist": "Artist", "artwork": "https://…", "duration": 215 }
```
