import { create } from 'zustand';
import type { Track } from '@/types';

// Drives the global "track actions" bottom sheet.
type UIState = {
  actionTrack: Track | null;
  openTrackActions: (track: Track) => void;
  closeTrackActions: () => void;
};

export const useUI = create<UIState>((set) => ({
  actionTrack: null,
  openTrackActions: (track) => set({ actionTrack: track }),
  closeTrackActions: () => set({ actionTrack: null }),
}));
