import { AUDIUS_APP_NAME } from '@/config';
import type { Track } from '@/types';

// Audius is decentralized: ask the registry for healthy "discovery provider"
// hosts, pick one, cache it for the session.
let cachedHost: string | null = null;

async function getHost(): Promise<string> {
  if (cachedHost) return cachedHost;
  try {
    const res = await fetch('https://api.audius.co');
    const json = await res.json();
    const hosts: string[] = json?.data ?? [];
    if (!hosts.length) throw new Error('No Audius hosts available');
    cachedHost = hosts[0];
    return cachedHost;
  } catch {
    cachedHost = 'https://discoveryprovider.audius.co';
    return cachedHost;
  }
}

function pickArtwork(artwork: any): string {
  if (!artwork) return '';
  return artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || '';
}

export async function getStreamUrl(trackId: string): Promise<string> {
  const host = await getHost();
  return `${host}/v1/tracks/${trackId}/stream?app_name=${AUDIUS_APP_NAME}`;
}

function mapTrack(raw: any, host: string): Track {
  return {
    id: String(raw.id),
    title: raw.title ?? 'Untitled',
    artist: raw.user?.name || raw.user?.handle || 'Unknown artist',
    artwork: pickArtwork(raw.artwork),
    duration: raw.duration ?? 0,
    source: 'audius',
    artistId: raw.user?.id != null ? String(raw.user.id) : undefined,
    streamUrl: `${host}/v1/tracks/${raw.id}/stream?app_name=${AUDIUS_APP_NAME}`,
  };
}

// Drop non-streamable tracks from list responses.
function mapList(json: any, host: string): Track[] {
  return (json?.data ?? [])
    .filter((t: any) => t?.is_streamable !== false)
    .map((t: any) => mapTrack(t, host));
}

async function apiGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const host = await getHost();
  const query = new URLSearchParams({ app_name: AUDIUS_APP_NAME, ...params }).toString();
  const res = await fetch(`${host}${path}?${query}`);
  if (!res.ok) throw new Error(`Audius request failed (${res.status})`);
  return { json: await res.json(), host };
}

export type TrendingTime = 'week' | 'month' | 'year' | 'allTime';

// Worldwide trending tracks — supports time range, genre filter, pagination.
export async function getTrending(
  opts: { genre?: string; time?: TrendingTime; limit?: number; offset?: number } = {}
): Promise<Track[]> {
  const params: Record<string, string> = {
    time: opts.time ?? 'week',
    limit: String(opts.limit ?? 25),
    offset: String(opts.offset ?? 0),
  };
  if (opts.genre) params.genre = opts.genre;
  const { json, host } = await apiGet('/v1/tracks/trending', params);
  return mapList(json, host);
}

// "Underground" chart of smaller / up-and-coming artists.
export async function getUndergroundTrending(limit = 25, offset = 0): Promise<Track[]> {
  const { json, host } = await apiGet('/v1/tracks/trending/underground', {
    limit: String(limit),
    offset: String(offset),
  });
  return mapList(json, host);
}

export async function searchTracks(query: string, limit = 25, offset = 0): Promise<Track[]> {
  if (!query.trim()) return [];
  const { json, host } = await apiGet('/v1/tracks/search', {
    query,
    only_downloadable: 'false',
    limit: String(limit),
    offset: String(offset),
  });
  return mapList(json, host);
}

// --- Playlists ---
export type AudiusPlaylist = {
  id: string;
  name: string;
  artwork: string;
  trackCount: number;
  user: string;
};

function mapPlaylist(raw: any): AudiusPlaylist {
  return {
    id: String(raw.id),
    name: raw.playlist_name ?? 'Untitled playlist',
    artwork: pickArtwork(raw.artwork),
    trackCount: raw.track_count ?? 0,
    user: raw.user?.name || raw.user?.handle || '',
  };
}

export async function getTrendingPlaylists(
  time: TrendingTime = 'week',
  limit = 20,
  offset = 0
): Promise<AudiusPlaylist[]> {
  const { json } = await apiGet('/v1/playlists/trending', {
    time,
    limit: String(limit),
    offset: String(offset),
  });
  return (json?.data ?? []).map(mapPlaylist);
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const { json, host } = await apiGet(`/v1/playlists/${playlistId}/tracks`);
  return mapList(json, host);
}

export async function getUserTracks(
  userId: string,
  sort: 'date' | 'plays' = 'plays',
  limit = 40,
  offset = 0
): Promise<Track[]> {
  const { json, host } = await apiGet(`/v1/users/${userId}/tracks`, {
    sort,
    limit: String(limit),
    offset: String(offset),
  });
  return mapList(json, host);
}

// Lightweight artist profile for the artist-page header.
export type AudiusUser = { id: string; name: string; handle: string; avatar: string };

export async function getUser(userId: string): Promise<AudiusUser | null> {
  try {
    const { json } = await apiGet(`/v1/users/${userId}`);
    const u = json?.data;
    if (!u) return null;
    return {
      id: String(u.id),
      name: u.name || u.handle || 'Artist',
      handle: u.handle || '',
      avatar: pickArtwork(u.profile_picture),
    };
  } catch {
    return null;
  }
}

export async function searchPlaylists(query: string, limit = 20): Promise<AudiusPlaylist[]> {
  if (!query.trim()) return [];
  const { json } = await apiGet('/v1/playlists/search', { query, limit: String(limit) });
  return (json?.data ?? []).map(mapPlaylist);
}

// Full genre list for the search/browse filter chips.
export const GENRES = [
  'All', 'Electronic', 'Hip-Hop/Rap', 'Pop', 'Rock', 'House', 'Techno',
  'Deep House', 'Trap', 'Dubstep', 'Drum & Bass', 'Ambient', 'Jazz',
  'R&B/Soul', 'Funk', 'Soundtrack', 'World', 'Classical', 'Latin',
  'Future Bass', 'Downtempo',
];

// Genre carousels rendered on Home (label → Audius genre string).
export const GENRE_ROWS: { label: string; genre: string }[] = [
  { label: 'Electronic', genre: 'Electronic' },
  { label: 'Hip-Hop / Rap', genre: 'Hip-Hop/Rap' },
  { label: 'House', genre: 'House' },
  { label: 'Techno', genre: 'Techno' },
  { label: 'Chill & Downtempo', genre: 'Downtempo' },
  { label: 'Ambient', genre: 'Ambient' },
  { label: 'R&B / Soul', genre: 'R&B/Soul' },
  { label: 'Jazz', genre: 'Jazz' },
  { label: 'Pop', genre: 'Pop' },
  { label: 'Rock', genre: 'Rock' },
];
