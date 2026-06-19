import { Platform } from 'react-native';

// App-wide configuration.
//
// PRODUCTION: set EXPO_PUBLIC_API_URL to your deployed backend HTTPS URL
// (e.g. https://wavelength-api.onrender.com). It's read at build time and
// takes precedence over the dev fallbacks below. Configure it per build in
// mobile/eas.json (env) or a local mobile/.env file.
//
// DEV fallbacks (used only when EXPO_PUBLIC_API_URL is unset) — must be a URL
// the running platform can reach:
//   • Android emulator / USB device:  http://localhost:4000  (run `adb reverse tcp:4000 tcp:4000`)
//   • iOS simulator:                  http://localhost:4000
//   • Physical device on Wi-Fi:       http://<YOUR-COMPUTER-LAN-IP>:4000  (run `ipconfig`)
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL;

const DEV_API_URL = Platform.select({
  android: 'http://localhost:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000', // web
}) as string;

export const API_BASE = PROD_API_URL || DEV_API_URL;

// Audius requires an app name on every request (used for analytics/rate limits).
export const AUDIUS_APP_NAME = 'Wavelength';
