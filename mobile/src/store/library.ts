import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { create } from 'zustand';
import * as api from '@/api/backend';
import { getStreamUrl } from '@/api/audius';
import { deleteDownload, downloadTrackFile } from '@/lib/downloads';
import type { FollowedArtist, Playlist, Track, User } from '@/types';

const DOWNLOADS_KEY = 'wavelength.downloads';

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
  downloads: Track[];
  downloadProgress: Record<string, number>;
  history: Track[];
  followedArtists: FollowedArtist[];

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

  // History
  recordPlay: (track: Track) => void;
  loadHistory: () => Promise<void>;

  // Artist follows
  isFollowing: (artistId: string) => boolean;
  followArtist: (artist: FollowedArtist) => Promise<void>;
  unfollowArtist: (artistId: string) => Promise<void>;
  loadFollowedArtists: () => Promise<void>;
};

export const useLibrary = create<LibraryState>((set, get) => ({
  liked: [],
  playlists: [],
  downloads: [],
  downloadProgress: {},
  history: [],
  followedArtists: [],

  hydrate: async (user) => {
    set({ liked: user?.likedSongs ?? [] });

    try {
      const json = await AsyncStorage.getItem(DOWNLOADS_KEY);
      set({ downloads: json ? (JSON.parse(json) as Track[]) : [] });
    } catch {
      set({ downloads: [] });
    }

    if (user) {
      await Promise.allSettled([
        api.listPlaylists().then(({ playlists }) => set({ playlists })),
        api.getHistory(50).then(({ history }) => set({ history })),
        api.getFollowedArtists().then(({ followedArtists }) => set({ followedArtists })),
      ]);
    }
  },

  clear: () =>
    set({ liked: [], playlists: [], downloads: [], downloadProgress: {}, history: [], followedArtists: [] }),

  isLiked: (trackId) => get().liked.some((t) => t.id === trackId),

  toggleLike: async (track) => {
    const liked = get().isLiked(track.id);
    if (liked) {
      set({ liked: get().liked.filter((t) => t.id !== track.id) });
      try {
        await api.unlikeTrack(track.id);
      } catch {
        set({ liked: [track, ...get().liked] });
      }
    } else {
      set({ liked: [track, ...get().liked] });
      try {
        await api.likeTrack(track);
      } catch {
        set({ liked: get().liked.filter((t) => t.id !== track.id) });
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
        'This is a 30-second preview from Deezer and can't be saved offline. Full tracks from Audius can be downloaded.'
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
    const existing = get().downloads.find((t) => t.id === trackId);
    try {
      if (existing?.localUri) await deleteDownload(existing.localUri);
    } catch {
      /* file may already be gone */
    }
    const next = get().downloads.filter((t) => t.id !== trackId);
    set({ downloads: next });
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next));
  },

  // Fire-and-forget: update local history immediately, sync to server in background.
  recordPlay: (track) => {
    const prev = get().history;
    // Deduplicate: don't record same track twice in a row.
    if (prev[0]?.id === track.id) return;
    set({ history: [track, ...prev].slice(0, 100) });
    api.addToHistory(track).catch(() => {});
  },

  loadHistory: async () => {
    try {
      const { history } = await api.getHistory(50);
      set({ history });
    } catch {
      /* offline — keep local state */
    }
  },

  isFollowing: (artistId) => get().followedArtists.some((a) => a.artistId === artistId),

  followArtist: async (artist) => {
    if (get().isFollowing(artist.artistId)) return;
    set({ followedArtists: [...get().followedArtists, artist] });
    try {
      await api.followArtist(artist);
    } catch {
      set({ followedArtists: get().followedArtists.filter((a) => a.artistId !== artist.artistId) });
    }
  },

  unfollowArtist: async (artistId) => {
    const prev = get().followedArtists;
    set({ followedArtists: prev.filter((a) => a.artistId !== artistId) });
    try {
      await api.unfollowArtist(artistId);
    } catch {
      set({ followedArtists: prev });
    }
  },

  loadFollowedArtists: async () => {
    try {
      const { followedArtists } = await api.getFollowedArtists();
      set({ followedArtists });
    } catch {
      /* offline */
    }
  },
}));

export function resolvePlaybackUri(track: Track): string | undefined {
  const dl = useLibrary.getState().downloads.find((t) => t.id === track.id);
  if (dl?.localUri) return dl.localUri;
  return track.localUri || track.streamUrl;
}
