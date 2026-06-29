import { create } from 'zustand';
import type { RepeatMode, Track } from '@/types';

let seekFn: ((seconds: number) => void) | null = null;
export function registerSeek(fn: (seconds: number) => void) {
  seekFn = fn;
}

// Radio fetcher: registered by the root layout, called when the queue is nearly
// exhausted so the app can append similar tracks without stopping playback.
let radioFetchFn: ((track: Track) => Promise<Track[]>) | null = null;
export function registerRadioFetcher(fn: (track: Track) => Promise<Track[]>) {
  radioFetchFn = fn;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
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
  sleepTimerEndsAt: number | null; // wall-clock ms
  radioMode: boolean;

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
  setSleepTimer: (minutes: number | null) => void;
  appendToQueue: (tracks: Track[]) => void;
  setRadioMode: (on: boolean) => void;

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
  sleepTimerEndsAt: null,
  radioMode: false,

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
    const { index, queue, repeat, radioMode } = get();
    if (index < queue.length - 1) {
      const newIndex = index + 1;
      set({ index: newIndex, position: 0, isPlaying: true });
      // Prefetch more tracks when 2 away from the end.
      if (radioMode && newIndex >= queue.length - 2 && radioFetchFn) {
        const current = queue[newIndex];
        radioFetchFn(current)
          .then((tracks) => get().appendToQueue(tracks))
          .catch(() => {});
      }
    } else if (repeat === 'all') {
      set({ index: 0, position: 0, isPlaying: true });
    } else if (radioMode && radioFetchFn) {
      // Queue exhausted in radio mode — fetch then advance.
      const current = queue[index];
      radioFetchFn(current)
        .then((tracks) => {
          if (tracks.length) {
            get().appendToQueue(tracks);
            set({ index: index + 1, position: 0, isPlaying: true });
          } else {
            set({ isPlaying: false });
          }
        })
        .catch(() => set({ isPlaying: false }));
    } else {
      set({ isPlaying: false });
    }
  },

  prev: () => {
    const { index, position } = get();
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

  setSleepTimer: (minutes) => {
    set({ sleepTimerEndsAt: minutes === null ? null : Date.now() + minutes * 60 * 1000 });
  },

  appendToQueue: (tracks) => {
    const { queue } = get();
    const existingIds = new Set(queue.map((t) => t.id));
    const fresh = tracks.filter((t) => !existingIds.has(t.id));
    if (fresh.length) set({ queue: [...queue, ...fresh] });
  },

  setRadioMode: (on) => set({ radioMode: on }),

  onFinish: () => {
    if (get().repeat === 'one') {
      seekFn?.(0);
      set({ position: 0, isPlaying: true });
    } else {
      get().next();
    }
  },

  setStatus: (position, duration) => {
    const { sleepTimerEndsAt } = get();
    if (sleepTimerEndsAt !== null && Date.now() >= sleepTimerEndsAt) {
      set({ isPlaying: false, sleepTimerEndsAt: null, position, duration });
      return;
    }
    set({ position, duration });
  },
}));
