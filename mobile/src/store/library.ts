import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { create } from 'zustand';
import * as api from '@/api/backend';
import { getStreamUrl } from '@/api/audius';
import { deleteDownload, downloadTrackFile } from '@/lib/downloads';
import type { Playlist, Track, User } from '@/types';

const DOWNLOADS_KEY = 'wavelength.downloads';

// Offline downloads rely on the native filesystem; they're unavailable on web.
const DOWNLOADS_SUPPORTED = Platform.OS !== 'web';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

type LibraryState = {
  liked: Track[];
  playlists: Playlist[];
  downloads: Track[]; // each has localUri set
  downloadProgress: Record<string, number>; // trackId -> 0..1 while downloading

  hydrate: (user: User | null) => Promise<void>;
  clear: () => void;

  // Likes
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => Promise<void>;

  // Playlists
  refreshPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  removePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (id: string, track: Track) => Promise<void>;
  removeFromPlaylist: (id: string, trackId: string) => Promise<void>;

  // Downloads
  isDownloaded: (trackId: string) => boolean;
  download: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
};

export const useLibrary = create<LibraryState>((set, get) => ({
  liked: [],
  playlists: [],
  downloads: [],
  downloadProgress: {},

  hydrate: async (user) => {
    set({ liked: user?.likedSongs ?? [] });

    // Load offline downloads manifest from device storage.
    try {
      const json = await AsyncStorage.getItem(DOWNLOADS_KEY);
      set({ downloads: json ? (JSON.parse(json) as Track[]) : [] });
    } catch {
      set({ downloads: [] });
    }

    // Pull playlists from the backend (cloud sync).
    if (user) {
      try {
        const { playlists } = await api.listPlaylists();
        set({ playlists });
      } catch {
        /* offline — keep whatever we have */
      }
    }
  },

  clear: () => set({ liked: [], playlists: [], downloads: [], downloadProgress: {} }),

  isLiked: (trackId) => get().liked.some((t) => t.id === trackId),

  toggleLike: async (track) => {
    const liked = get().isLiked(track.id);
    // Optimistic update
    if (liked) {
      set({ liked: get().liked.filter((t) => t.id !== track.id) });
      try {
        await api.unlikeTrack(track.id);
      } catch {
        set({ liked: [track, ...get().liked] }); // rollback
      }
    } else {
      set({ liked: [track, ...get().liked] });
      try {
        await api.likeTrack(track);
      } catch {
        set({ liked: get().liked.filter((t) => t.id !== track.id) }); // rollback
      }
    }
  },

  refreshPlaylists: async () => {
    const { playlists } = await api.listPlaylists();
    set({ playlists });
  },

  createPlaylist: async (name, description = '') => {
    const { playlist } = await api.createPlaylist(name, description);
    set({ playlists: [playlist, ...get().playlists] });
    return playlist;
  },

  removePlaylist: async (id) => {
    await api.deletePlaylist(id);
    set({ playlists: get().playlists.filter((p) => p._id !== id) });
  },

  addToPlaylist: async (id, track) => {
    const { playlist } = await api.addTrackToPlaylist(id, track);
    set({ playlists: get().playlists.map((p) => (p._id === id ? playlist : p)) });
  },

  removeFromPlaylist: async (id, trackId) => {
    const { playlist } = await api.removeTrackFromPlaylist(id, trackId);
    set({ playlists: get().playlists.map((p) => (p._id === id ? playlist : p)) });
  },

  isDownloaded: (trackId) => get().downloads.some((t) => t.id === trackId),

  download: async (track) => {
    if (get().isDownloaded(track.id)) return;
    if (track.previewOnly) {
      notify(
        'Preview only',
        'This is a 30-second preview from Deezer and can’t be saved offline. Full tracks from Audius can be downloaded.'
      );
      return;
    }
    if (!DOWNLOADS_SUPPORTED) {
      notify('Offline downloads', 'Downloads are available in the Wavelength mobile app (iOS & Android).');
      return;
    }
    set({ downloadProgress: { ...get().downloadProgress, [track.id]: 0 } });
    try {
      const streamUrl = track.streamUrl || (await getStreamUrl(track.id));
      const localUri = await downloadTrackFile(track, streamUrl, (ratio) => {
        set({ downloadProgress: { ...get().downloadProgress, [track.id]: ratio } });
      });
      const downloaded: Track = { ...track, localUri };
      const next = [downloaded, ...get().downloads.filter((t) => t.id !== track.id)];
      set({ downloads: next });
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next));
    } catch (e: any) {
      notify('Download failed', e?.message || 'Could not download this track.');
    } finally {
      const { [track.id]: _drop, ...rest } = get().downloadProgress;
      set({ downloadProgress: rest });
    }
  },

  removeDownload: async (trackId) => {
    if (!DOWNLOADS_SUPPORTED) return;
    try {
      await deleteDownload(trackId);
    } catch {
      /* file may already be gone */
    }
    const next = get().downloads.filter((t) => t.id !== trackId);
    set({ downloads: next });
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next));
  },
}));

// Helper exported for the player: prefer a local file if the track is downloaded.
export function resolvePlaybackUri(track: Track): string | undefined {
  const dl = useLibrary.getState().downloads.find((t) => t.id === track.id);
  if (dl?.localUri) return dl.localUri;
  return track.localUri || track.streamUrl;
}
