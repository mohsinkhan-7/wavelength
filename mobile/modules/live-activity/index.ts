import { PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type NowPlayingState = {
  title: string;
  artist: string;
  isPlaying: boolean;
  progress: number; // 0..1
  position: string; // "1:23"
  duration: string; // "3:45"
};

type NativeLiveActivity = {
  isSupported(): boolean;
  startActivity(state: NowPlayingState): Promise<{ id: string } | null>;
  updateActivity(id: string, state: NowPlayingState): Promise<boolean>;
  endActivity(id: string): Promise<boolean>;
};

// Resolves to the native module on a real iOS build (ActivityKit Live Activity /
// Dynamic Island) OR a real Android build (the Android 16 "Live Update" cutout
// chip — the standard MediaStyle lock-screen notification is owned by expo-audio).
// Returns `null` on web and in Expo Go, so every call below safely no-ops there.
// The module also reports isSupported() === false on Android < 16, keeping it a
// no-op there too.
const Native = requireOptionalNativeModule<NativeLiveActivity>('WavelengthLiveActivity');

export function isLiveActivitySupported(): boolean {
  try {
    return !!Native && Native.isSupported();
  } catch {
    return false;
  }
}

/**
 * On Android 13+ the Live Update chip needs the runtime POST_NOTIFICATIONS
 * permission. Call this once in a user-initiated playback context (e.g. on first
 * play) before syncNowPlaying. No-ops on iOS/web/older Android.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || (Platform.Version as number) < 33) return true;
  try {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

let activityId: string | null = null;
let lastUpdate = 0;

/**
 * Reconcile the Live Activity with the current player state.
 * Pass `null` to end it. `force` bypasses the progress-update throttle
 * (use it on track change and play/pause; iOS rate-limits frequent updates).
 */
export async function syncNowPlaying(
  state: NowPlayingState | null,
  opts: { force?: boolean } = {}
): Promise<void> {
  if (!Native) return; // off-iOS → no-op
  try {
    if (!state) {
      await endNowPlaying();
      return;
    }
    if (!activityId) {
      const res = await Native.startActivity(state);
      activityId = res?.id ?? null;
      lastUpdate = Date.now();
      return;
    }
    const now = Date.now();
    if (!opts.force && now - lastUpdate < 2000) return; // throttle progress ticks
    lastUpdate = now;
    await Native.updateActivity(activityId, state);
  } catch {
    // Never let the Live Activity disrupt playback.
  }
}

export async function endNowPlaying(): Promise<void> {
  if (!Native || !activityId) return;
  const id = activityId;
  activityId = null;
  try {
    await Native.endActivity(id);
  } catch {
    /* noop */
  }
}
