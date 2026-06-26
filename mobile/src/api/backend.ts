import { API_BASE } from '@/config';
import type { Playlist, Track, TrackSource, User } from '@/types';

// The JWT is injected by the auth store after login/restore.
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

// Reduce a full Track to the snapshot the backend stores.
function snapshot(t: Track) {
  return {
    trackId: t.id,
    title: t.title,
    artist: t.artist,
    artwork: t.artwork,
    duration: t.duration,
    source: t.source,
    previewOnly: t.previewOnly ?? false,
  };
}

// Rebuild a Track from a stored snapshot (likedSongs / playlist.tracks). This
// restores `id` from `trackId` — without it, hydrated tracks have id===undefined
// and like/queue lookups silently fail. streamUrl is left undefined: Audius
// streams resolve on demand, Deezer previews are re-fetched when played.
export function fromSnapshot(s: any): Track {
  const source: TrackSource =
    s?.source === 'deezer' || s?.source === 'jamendo' ? s.source : 'audius';
  return {
    id: String(s?.trackId ?? s?.id ?? ''),
    title: s?.title ?? 'Untitled',
    artist: s?.artist ?? 'Unknown artist',
    artwork: s?.artwork ?? '',
    duration: s?.duration ?? 0,
    source,
    previewOnly: s?.previewOnly ?? source === 'deezer',
  };
}

function normUser(user: any): User {
  return { ...user, likedSongs: (user?.likedSongs ?? []).map(fromSnapshot) };
}

function normPlaylist(p: any): Playlist {
  return { ...p, tracks: (p?.tracks ?? []).map(fromSnapshot) };
}

// ---- Auth ----
export async function register(email: string, password: string, displayName: string) {
  const data = await request<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  return { token: data.token, user: normUser(data.user) };
}

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: data.token, user: normUser(data.user) };
}

export async function getMe() {
  const data = await request<{ user: User }>('/api/me');
  return { user: normUser(data.user) };
}

export async function updateProfile(payload: {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const data = await request<{ user: User }>('/api/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { user: normUser(data.user) };
}

export async function forgotPassword(email: string) {
  return request<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  return request<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

// ---- Likes ----
export async function likeTrack(track: Track) {
  const data = await request<{ likedSongs: any[] }>('/api/me/likes', {
    method: 'POST',
    body: JSON.stringify(snapshot(track)),
  });
  return { likedSongs: data.likedSongs.map(fromSnapshot) };
}

export async function unlikeTrack(trackId: string) {
  const data = await request<{ likedSongs: any[] }>(`/api/me/likes/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });
  return { likedSongs: data.likedSongs.map(fromSnapshot) };
}

// ---- Playlists ----
export async function listPlaylists() {
  const data = await request<{ playlists: any[] }>('/api/playlists');
  return { playlists: data.playlists.map(normPlaylist) };
}

export async function createPlaylist(name: string, description = '') {
  const data = await request<{ playlist: any }>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
  return { playlist: normPlaylist(data.playlist) };
}

export function deletePlaylist(id: string) {
  return request<{ ok: boolean }>(`/api/playlists/${id}`, { method: 'DELETE' });
}

export async function addTrackToPlaylist(id: string, track: Track) {
  const data = await request<{ playlist: any }>(`/api/playlists/${id}/tracks`, {
    method: 'POST',
    body: JSON.stringify(snapshot(track)),
  });
  return { playlist: normPlaylist(data.playlist) };
}

export async function removeTrackFromPlaylist(id: string, trackId: string) {
  const data = await request<{ playlist: any }>(
    `/api/playlists/${id}/tracks/${encodeURIComponent(trackId)}`,
    { method: 'DELETE' }
  );
  return { playlist: normPlaylist(data.playlist) };
}
