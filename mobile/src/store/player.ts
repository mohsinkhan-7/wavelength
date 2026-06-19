import { create } from 'zustand';
import type { RepeatMode, Track } from '@/types';

// The audio engine (AudioController) registers an imperative seek here so the
// UI can scrub without the store needing a direct reference to the player.
let seekFn: ((seconds: number) => void) | null = null;
export function registerSeek(fn: (seconds: number) => void) {
  seekFn = fn;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    // Math.random is fine here (cosmetic ordering, not in a workflow script).
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PlayerState = {
  queue: Track[];
  originalQueue: Track[];
  index: number;
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  shuffle: boolean;
  repeat: RepeatMode;

  current: () => Track | null;

  playQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setShuffle: (on: boolean) => void;
  cycleRepeat: () => void;

  // Called by the audio engine:
  onFinish: () => void;
  setStatus: (position: number, duration: number) => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  index: 0,
  isPlaying: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',

  current: () => {
    const { queue, index } = get();
    return queue[index] ?? null;
  },

  playQueue: (tracks, startIndex = 0) => {
    if (!tracks.length) return;
    const { shuffle } = get();
    if (shuffle) {
      const start = tracks[startIndex];
      const rest = shuffleArray(tracks.filter((_, i) => i !== startIndex));
      set({ originalQueue: tracks, queue: [start, ...rest], index: 0, isPlaying: true, position: 0 });
    } else {
      set({ originalQueue: tracks, queue: tracks, index: startIndex, isPlaying: true, position: 0 });
    }
  },

  playTrack: (track) => get().playQueue([track], 0),

  toggle: () => set({ isPlaying: !get().isPlaying }),
  setPlaying: (playing) => set({ isPlaying: playing }),

  next: () => {
    const { index, queue, repeat } = get();
    if (index < queue.length - 1) {
      set({ index: index + 1, position: 0, isPlaying: true });
    } else if (repeat === 'all') {
      set({ index: 0, position: 0, isPlaying: true });
    } else {
      set({ isPlaying: false });
    }
  },

  prev: () => {
    const { index, position } = get();
    // Restart current track if we're more than 3s in, otherwise go back.
    if (position > 3 || index === 0) {
      seekFn?.(0);
      set({ position: 0 });
    } else {
      set({ index: index - 1, position: 0, isPlaying: true });
    }
  },

  seek: (seconds) => {
    seekFn?.(seconds);
    set({ position: seconds });
  },

  setShuffle: (on) => {
    const { queue, index, originalQueue } = get();
    const current = queue[index];
    if (on) {
      const base = originalQueue.length ? originalQueue : queue;
      const rest = shuffleArray(base.filter((t) => t.id !== current?.id));
      set({ shuffle: true, originalQueue: base, queue: current ? [current, ...rest] : rest, index: 0 });
    } else {
      const restored = originalQueue.length ? originalQueue : queue;
      const newIndex = Math.max(0, restored.findIndex((t) => t.id === current?.id));
      set({ shuffle: false, queue: restored, index: newIndex });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(get().repeat) + 1) % order.length];
    set({ repeat: next });
  },

  onFinish: () => {
    if (get().repeat === 'one') {
      seekFn?.(0);
      set({ position: 0, isPlaying: true });
    } else {
      get().next();
    }
  },

  setStatus: (position, duration) => set({ position, duration }),
}));
