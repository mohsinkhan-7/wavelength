import { API_BASE } from '@/config';
import type { Track } from '@/types';

async function get(path: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Archive proxy failed (${res.status})`);
  return (data.tracks as Track[]) ?? [];
}

export const getArchiveBollywood = (limit = 25, offset = 0): Promise<Track[]> =>
  get(`/api/catalog/archive/bollywood?limit=${limit}&offset=${offset}`);

export const searchArchive = (query: string, limit = 25, offset = 0): Promise<Track[]> =>
  query.trim()
    ? get(`/api/catalog/archive/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
    : Promise.resolve([]);
