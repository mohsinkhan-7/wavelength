import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { usePlayer, registerSeek } from '@/store/player';
import { resolvePlaybackUri, useLibrary } from '@/store/library';
import { formatTime } from '@/lib/format';
import {
  syncNowPlaying,
  endNowPlaying,
  ensureNotificationPermission,
  addMediaActionListener,
} from '../../modules/live-activity';

let nowPlayingPermRequested = false;

// Build the Live Activity payload from the current player state.
function nowPlayingState() {
  const s = usePlayer.getState();
  const t = s.queue[s.index];
  if (!t) return null;
  return {
    title: t.title,
    artist: t.artist,
    isPlaying: s.isPlaying,
    progress: s.duration > 0 ? s.position / s.duration : 0,
    position: formatTime(s.position),
    duration: formatTime(s.duration),
    // Android MediaSession (seek bar + skip buttons); iOS ignores these.
    positionSec: s.position,
    durationSec: s.duration,
    artworkUrl: t.artwork || undefined,
    canNext: s.index < s.queue.length - 1 || s.repeat === 'all',
    canPrev: true,
  };
}

/**
 * Headless component mounted once at the app root. It owns the single expo-audio
 * player instance and keeps it in sync with the player store:
 *   - loads & plays the current track when it changes
 *   - plays/pauses on intent
 *   - reports progress back to the store
 *   - advances the queue when a track finishes
 */
export default function AudioController() {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const track = usePlayer((s) => s.queue[s.index] ?? null);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setStatus = usePlayer((s) => s.setStatus);
  const onFinish = usePlayer((s) => s.onFinish);

  const recordPlay = useLibrary((s) => s.recordPlay);
  const loadedTrackId = useRef<string | null>(null);
  // Whether this player is registered as the OS "now playing" controller.
  const lockScreenActive = useRef(false);

  // Configure audio mode for background + silent-mode playback once.
  // `doNotMix` is required for the iOS lock screen / Dynamic Island to bind
  // its media controls to this player.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
    registerSeek((seconds) => {
      player.seekTo(seconds).catch(() => {});
    });
    // Clear the Now Playing entry (lock screen / Dynamic Island) on teardown.
    return () => {
      try {
        player.clearLockScreenControls?.();
      } catch {
        /* noop */
      }
      endNowPlaying();
    };
  }, [player]);

  // Load & play whenever the current track changes.
  useEffect(() => {
    if (!track) return;
    if (loadedTrackId.current === track.id) return;

    const uri = resolvePlaybackUri(track);
    if (!uri) return;

    loadedTrackId.current = track.id;
    player.replace({ uri });
    player.play();
    recordPlay(track);

    // iOS: publish to the Now Playing info center — this populates the lock
    // screen AND the Dynamic Island media presentation. Register once, then
    // just update. On Android we deliberately DON'T activate expo-audio's
    // lock-screen controls: our own MediaSession (modules/live-activity) owns
    // the notification so it can expose real prev/next track buttons, which
    // expo-audio omits. Two surfaces would otherwise both appear.
    if (Platform.OS === 'ios') {
      const metadata = {
        title: track.title,
        artist: track.artist,
        artworkUrl: track.artwork || undefined,
      };
      try {
        if (!lockScreenActive.current) {
          player.setActiveForLockScreen?.(true, metadata, {
            showSeekForward: true,
            showSeekBackward: true,
          });
          lockScreenActive.current = true;
        } else {
          player.updateLockScreenMetadata?.(metadata);
        }
      } catch {
        /* lock screen unsupported on this platform — ignore */
      }
    }

    // Start / refresh the platform now-playing surface (iOS Dynamic Island /
    // Android media notification) for the new track. Request the Android
    // notification permission once, on first play, then sync.
    if (!nowPlayingPermRequested) {
      nowPlayingPermRequested = true;
      ensureNotificationPermission().finally(() => syncNowPlaying(nowPlayingState(), { force: true }));
    } else {
      syncNowPlaying(nowPlayingState(), { force: true });
    }
  }, [track, player]);

  // Reflect play/pause intent.
  useEffect(() => {
    if (!loadedTrackId.current) return;
    if (isPlaying) player.play();
    else player.pause();
    // Push play/pause to the Live Activity immediately.
    syncNowPlaying(nowPlayingState(), { force: true });
  }, [isPlaying, player]);

  // Report progress to the store + (throttled) to the Live Activity.
  useEffect(() => {
    setStatus(status.currentTime ?? 0, status.duration ?? 0);
    syncNowPlaying(nowPlayingState());
  }, [status.currentTime, status.duration, setStatus]);

  // Advance the queue when the track finishes.
  useEffect(() => {
    if (status.didJustFinish) onFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Drive the store from native media controls (Android lock screen /
  // notification / Bluetooth & headset buttons). No-ops on iOS/web.
  useEffect(() => {
    const sub = addMediaActionListener((e) => {
      const p = usePlayer.getState();
      switch (e.action) {
        case 'play':
          p.setPlaying(true);
          break;
        case 'pause':
          p.setPlaying(false);
          break;
        case 'toggle':
          p.toggle();
          break;
        case 'next':
          p.next();
          break;
        case 'prev':
          p.prev();
          break;
        case 'seek':
          if (typeof e.value === 'number') p.seek(e.value);
          break;
      }
    });
    return () => sub.remove();
  }, []);

  // Mirror an externally-forced pause back into the store (e.g. audio-focus
  // loss when another app starts playing, or a phone call). Only the pause
  // direction is mirrored — play/seek/skip are always store-driven — and the
  // end-of-track gap is skipped so it doesn't fight onFinish.
  useEffect(() => {
    if (!loadedTrackId.current) return;
    if (!status.isLoaded || status.isBuffering || status.didJustFinish) return;
    const s = usePlayer.getState();
    if (s.isPlaying && !status.playing) {
      if (status.duration > 0 && status.currentTime >= status.duration - 1) return;
      s.setPlaying(false);
    }
  }, [status.playing, status.isLoaded, status.isBuffering, status.didJustFinish, status.currentTime, status.duration]);

  return null;
}
