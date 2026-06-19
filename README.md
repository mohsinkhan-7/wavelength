# Wavelength 🎵

A cross-platform music streaming app (iOS + Android) powered by the **Audius** open music API,
with offline downloads, playlists, liked songs, and cloud-synced user accounts.

## Stack

| Layer    | Tech |
|----------|------|
| Mobile   | React Native + Expo (TypeScript), expo-router, Zustand, expo-av, expo-file-system |
| Backend  | Node.js + Express, MongoDB (Mongoose), JWT auth |
| Catalog  | [Audius API](https://docs.audius.org/) — free, legal full-track streaming & downloads |

## Project layout

```
.
├── server/    # Express API: auth, playlists, likes (cloud sync)
└── mobile/    # Expo app: browse, search, player, downloads, library
```

## Features

- 🔐 Email/password accounts (JWT) with cloud sync across devices
- 🌍 Browse trending + search the worldwide Audius catalog
- ▶️ Full-track streaming with a persistent mini-player
- ❤️ Like songs (synced)
- 📂 Create & manage playlists (synced)
- ⬇️ Download tracks for offline listening
- 🎚️ Queue, shuffle, repeat
- 👤 Profile management (edit name, change password, account stats)
- 🎬 Now Playing in **iOS Dynamic Island / Live Activity** and the **Android 16 Live Update** cutout chip — see [`mobile/LIVE_ACTIVITY.md`](mobile/LIVE_ACTIVITY.md)

## Getting started

See [`server/README.md`](server/README.md) and [`mobile/README.md`](mobile/README.md).

Quick version:

```bash
# 1. Backend
cd server
cp .env.example .env        # set MONGO_URI + JWT_SECRET
npm install
npm run dev

# 2. Mobile (new terminal)
cd mobile
npm install
npm start                   # press i / a, or scan QR with Expo Go
```

No MongoDB installed? Either:
- **Quick demo:** `cd server && npm run dev:mem` (throwaway in-memory database), or
- **Persistent + free:** follow [`server/ATLAS.md`](server/ATLAS.md), then `npm run dev`.

## Deploying to the stores

See [`DEPLOYMENT.md`](DEPLOYMENT.md) — host the backend, then build & submit with
EAS to the App Store and Google Play. Branded icons/splash and `eas.json`
profiles are already set up.
