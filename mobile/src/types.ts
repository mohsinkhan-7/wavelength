export type TrackSource = 'audius' | 'deezer' | 'jamendo' | 'jiosaavn' | 'archive';

// A normalized track used throughout the app. `streamUrl` is the Audius stream
// endpoint (full track) or the Deezer 30s preview MP3; `localUri` is set when
// downloaded for offline. `id` is globally unique across sources — Audius ids
// are bare ("123"), Deezer ids are prefixed ("deezer:916424").
export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string; // image url
  duration: number; // seconds
  source: TrackSource; // which catalog this came from
  artistId?: string; // source-native artist id, for opening the artist page
  previewOnly?: boolean; // true for Deezer (30s preview) — blocks downloads
  streamUrl?: string; // Audius stream endpoint, or Deezer preview MP3
  localUri?: string; // local file uri when downloaded for offline
};

export type Playlist = {
  _id: string;
  name: string;
  description: string;
  tracks: Track[];
  updatedAt?: string;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  likedSongs: Track[];
};

export type RepeatMode = 'off' | 'all' | 'one';
