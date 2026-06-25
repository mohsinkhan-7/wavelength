import { API_BASE } from '@/config';
import type { Track } from '@/types';

async function get(path: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `JioSaavn proxy failed (${res.status})`);
  return (data.tracks as Track[]) ?? [];
}

export const getJioSaavnTrending = (limit = 25, page = 1): Promise<Track[]> =>
  get(`/api/catalog/jiosaavn/trending?limit=${limit}&p=${page}`);

export const searchJioSaavn = (query: string, limit = 25, page = 1): Promise<Track[]> =>
  query.trim()
    ? get(`/api/catalog/jiosaavn/search?q=${encodeURIComponent(query)}&limit=${limit}&p=${page}`)
    : Promise.resolve([]);
