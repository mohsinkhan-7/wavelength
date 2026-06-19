# Shipping Wavelength to the App Store & Google Play

This walks from "runs locally" to "installable from the stores."

## 0. Prerequisites (accounts)
| Need | Cost | For |
|------|------|-----|
| [Expo account](https://expo.dev/signup) | free | EAS builds |
| [Apple Developer Program](https://developer.apple.com/programs/) | $99/yr | App Store |
| [Google Play Developer](https://play.google.com/console/signup) | $25 once | Play Store |

Install the CLI: `npm i -g eas-cli` then `eas login`.

## 1. Host the backend (required before store release)
A published app **cannot** reach `http://localhost:4000`. Deploy the `server/`
somewhere public and point the app at it:

1. Set up a persistent database — see [`server/ATLAS.md`](server/ATLAS.md).
2. Deploy `server/` to a host (e.g. [Render](https://render.com),
   [Railway](https://railway.app), or [Fly.io](https://fly.io)):
   - **Render (easiest):** a [`render.yaml`](render.yaml) blueprint is included —
     New → Blueprint → pick this repo, then set `MONGO_URI` (and optional
     `JAMENDO_CLIENT_ID`) in the dashboard. `JWT_SECRET` is auto-generated.
   - **Any Docker host:** a [`server/Dockerfile`](server/Dockerfile) is included.
   - Manual: start command `npm start`; env vars `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
3. You'll get a URL like `https://wavelength-api.onrender.com`.
4. Point the app at it for production via **`EXPO_PUBLIC_API_URL`** set to that
   HTTPS URL (in [`mobile/eas.json`](mobile/eas.json) per-profile `env`, or a local
   `mobile/.env`). [`mobile/src/config.ts`](mobile/src/config.ts) reads it and falls
   back to the localhost dev values when unset.

## 2. Link the project to EAS
From `mobile/`:
```bash
eas init            # creates/links an EAS project, writes extra.eas.projectId into app.json
```

## 3. Build
Profiles live in [`mobile/eas.json`](mobile/eas.json).

```bash
# Quick installable test builds:
eas build -p android --profile preview     # → an .apk you can sideload
eas build -p ios     --profile preview     # → for TestFlight / internal

# Store-ready release builds:
eas build -p android --profile production   # → .aab for Play Console
eas build -p ios     --profile production   # → for App Store Connect
```
The first iOS build will offer to generate signing credentials for you — say yes.

## 4. Submit to the stores
```bash
eas submit -p android --latest    # uploads the .aab to Google Play
eas submit -p ios     --latest    # uploads to App Store Connect
```
Then finish the listing (screenshots, description, privacy details) in each
store's console and submit for review.

## 5. (Optional) Over-the-air updates
For JS-only changes you can skip a rebuild:
```bash
eas update --branch production -m "Fix playlist sorting"
```

---

### Identifiers (already set in `app.json`)
- iOS bundle id / Android package: `com.trufe.wavelength`
- App name: **Wavelength**

Change these before publishing if you want a different identity.
