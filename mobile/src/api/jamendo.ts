import { API_BASE } from '@/config';
import type { Track } from '@/types';

// Jamendo (Creative-Commons full tracks) via our backend proxy.
// All tracks are full-length and downloadable. Returns [] if the backend has no
// JAMENDO_CLIENT_ID set, so the rows simply hide.
async function get(path: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Jamendo proxy failed (${res.status})`);
  return (data.tracks as Track[]) ?? [];
}

type JamendoQuery = { order?: string; tags?: string; search?: string; limit?: number; offset?: number };

export function getJamendoTracks(q: JamendoQuery = {}): Promise<Track[]> {
  const params = new URLSearchParams();
  if (q.order) params.set('order', q.order);
  if (q.tags) params.set('tags', q.tags);
  if (q.search) params.set('search', q.search);
  params.set('limit', String(q.limit ?? 25));
  params.set('offset', String(q.offset ?? 0));
  return get(`/api/catalog/jamendo/tracks?${params.toString()}`);
}

export const getJamendoLatest = (limit = 25, offset = 0) =>
  getJamendoTracks({ order: 'releasedate_desc', limit, offset });

export const getJamendoPopular = (limit = 25, offset = 0) =>
  getJamendoTracks({ order: 'popularity_month', limit, offset });

export const searchJamendo = (query: string, limit = 25, offset = 0) =>
  query.trim() ? getJamendoTracks({ search: query, limit, offset }) : Promise.resolve([]);

export async function getJamendoArtist(
  id: string
): Promise<{ tracks: Track[]; name: string; avatar: string }> {
  const res = await fetch(`${API_BASE}/api/catalog/jamendo/artist/${encodeURIComponent(id)}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Jamendo proxy failed (${res.status})`);
  return { tracks: data.tracks ?? [], name: data.name ?? '', avatar: data.avatar ?? '' };
}
