import { PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';

export type NowPlayingState = {
  title: string;
  artist: string;
  isPlaying: boolean;
  progress: number; // 0..1
  position: string; // "1:23"
  duration: string; // "3:45"
  // Numeric fields used by the Android MediaSession (seek bar + skip buttons).
  // iOS ignores these — its ContentState is driven by the formatted strings above.
  positionSec?: number; // seconds
  durationSec?: number; // seconds
  artworkUrl?: string;
  canNext?: boolean;
  canPrev?: boolean;
};

// Control events emitted by the native MediaSession (Android lock-screen /
// notification / Bluetooth & headset buttons). iOS never emits these.
export type MediaActionEvent = {
  action: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek';
  value?: number; // seconds — only set for `seek`
};

type NativeLiveActivity = {
  isSupported(): boolean;
  startActivity(state: NowPlayingState): Promise<{ id: string } | null>;
  updateActivity(id: string, state: NowPlayingState): Promise<boolean>;
  endActivity(id: string): Promise<boolean>;
  addListener(event: 'onMediaAction', listener: (e: MediaActionEvent) => void): EventSubscription;
};

// Resolves to the native module on a real iOS build (ActivityKit Live Activity /
// Dynamic Island) OR a real Android build (a self-owned MediaSession that posts
// the full MediaStyle lock-screen notification with prev/play-pause/next + seek).
// Returns `null` on web and in Expo Go, so every call below safely no-ops there.
const Native = requireOptionalNativeModule<NativeLiveActivity>('WavelengthLiveActivity');

export function isLiveActivitySupported(): boolean {
  try {
    return !!Native && Native.isSupported();
  } catch {
    return false;
  }
}

/**
 * On Android 13+ the media notification needs the runtime POST_NOTIFICATIONS
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

/**
 * Subscribe to lock-screen / notification / hardware media-button events.
 * The returned subscription must be `.remove()`d on teardown. No-ops (returns a
 * dummy subscription) on platforms without the native module.
 */
export function addMediaActionListener(
  listener: (e: MediaActionEvent) => void
): EventSubscription {
  if (!Native?.addListener) return { remove() {} } as EventSubscription;
  try {
    return Native.addListener('onMediaAction', listener);
  } catch {
    return { remove() {} } as EventSubscription;
  }
}

let activityId: string | null = null;
let lastUpdate = 0;

/**
 * Reconcile the Now Playing surface with the current player state.
 * Pass `null` to end it. `force` bypasses the progress-update throttle
 * (use it on track change and play/pause; iOS rate-limits frequent updates).
 */
export async function syncNowPlaying(
  state: NowPlayingState | null,
  opts: { force?: boolean } = {}
): Promise<void> {
  if (!Native) return; // unsupported platform → no-op
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
    // Never let the Now Playing surface disrupt playback.
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
