import { API_BASE } from '@/config';
import type { Track } from '@/types';

// Deezer is reached via our backend proxy (avoids browser CORS + IP throttling).
// All Deezer tracks are 30-second previews (previewOnly: true).
type DeezerResponse = { tracks: Track[]; total?: number };

async function get(path: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Deezer proxy failed (${res.status})`);
  return (data as DeezerResponse).tracks ?? [];
}

// Mainstream "Top Charts" (30s previews).
export function getDeezerChart(limit = 20): Promise<Track[]> {
  return get(`/api/catalog/deezer/chart?limit=${limit}`);
}

// Mainstream search (30s previews).
export function searchDeezer(query: string, limit = 25): Promise<Track[]> {
  if (!query.trim()) return Promise.resolve([]);
  return get(`/api/catalog/deezer/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

// An artist's top tracks + profile (previews). `id` is the bare Deezer artist id.
export async function getDeezerArtist(
  id: string
): Promise<{ tracks: Track[]; name: string; avatar: string }> {
  const res = await fetch(`${API_BASE}/api/catalog/deezer/artist/${encodeURIComponent(id)}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Deezer proxy failed (${res.status})`);
  return { tracks: data.tracks ?? [], name: data.name ?? '', avatar: data.avatar ?? '' };
}

// Deezer preview URLs are signed with an expiring token. For a saved (liked /
// playlisted) Deezer track played later without a fresh streamUrl, re-fetch a
// current preview by matching the saved metadata.
export async function resolveDeezerPreview(track: Track): Promise<string | undefined> {
  if (track.streamUrl) return track.streamUrl;
  try {
    const results = await searchDeezer(`${track.artist} ${track.title}`, 5);
    const match = results.find((t) => t.id === track.id) || results[0];
    return match?.streamUrl;
  } catch {
    return undefined;
  }
}
