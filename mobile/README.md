# Wavelength (mobile)

React Native + Expo app. iOS & Android from one codebase.

## Run it

```bash
npm install
# Point the app at your backend — edit src/config.ts (API_BASE):
#   Android emulator → http://10.0.2.2:4000
#   iOS simulator    → http://localhost:4000
#   Physical device  → http://<your-lan-ip>:4000
npm start
```

Then press `a` (Android emulator), `i` (iOS simulator), or scan the QR code
with **Expo Go** on your phone.

> Background audio, lock-screen controls, and downloads need a real build
> (or Expo Go on a device). They work in `expo start` for development.

## Project structure

```
app/                     # expo-router file-based routes
  _layout.tsx            # root: session guard + audio engine + actions sheet
  index.tsx              # entry redirect
  (auth)/                # login / register
  (tabs)/                # Home, Search, Library (+ persistent mini-player)
  player.tsx             # full-screen player (modal)
  playlist/[id].tsx      # playlist / liked / downloads detail
src/
  api/audius.ts          # worldwide catalog (trending, search, streams)
  api/backend.ts         # our API (auth, likes, playlists)
  store/                 # zustand: auth, player, library, ui
  components/            # AudioController, MiniPlayer, TrackRow, …
  lib/                   # downloads (offline), time formatting
  theme.ts, types.ts, config.ts
```

## Building for the stores

This uses [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android   # → .aab for Google Play
eas build -p ios       # → for App Store (needs an Apple Developer account)
eas submit -p android  # upload to Play Console
eas submit -p ios      # upload to App Store Connect
```

The bundle identifiers (`com.trufe.wavelength`) are set in `app.json`.
