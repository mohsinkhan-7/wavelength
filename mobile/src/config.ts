import { Platform } from 'react-native';

// App-wide configuration.
//
// API_BASE must be a URL the running platform can reach:
//   • Android emulator:        http://10.0.2.2:4000   (the host's localhost)
//   • iOS simulator / web:     http://localhost:4000
//   • Physical device (Expo):  http://<YOUR-COMPUTER-LAN-IP>:4000  (e.g. http://192.168.1.20:4000)
//
// On a physical device, change the value below to your computer's LAN IP
// (find it with `ipconfig` on Windows / `ifconfig` on mac/linux).
export const API_BASE = Platform.select({
  android: 'http://localhost:4000', // emulator via `adb reverse tcp:4000 tcp:4000` (network-independent)
  ios: 'http://192.168.31.23:4000', // physical iPhone on same Wi-Fi (host LAN IP)
  default: 'http://localhost:4000', // web
}) as string;

// Audius requires an app name on every request (used for analytics/rate limits).
export const AUDIUS_APP_NAME = 'Wavelength';
