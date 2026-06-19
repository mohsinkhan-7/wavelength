import { API_BASE } from '@/config';
import { parseLrc, type LrcLine } from '@/lib/lrc';
import type { Track } from '@/types';

export type Lyrics = { plain: string | null; synced: LrcLine[] | null };

// Lyrics via the backend LRCLIB proxy. Returns empty if none found / offline.
export async function getLyrics(track: Track): Promise<Lyrics> {
  try {
    const p = new URLSearchParams({ artist: track.artist, title: track.title });
    if (track.duration) p.set('duration', String(Math.round(track.duration)));
    const res = await fetch(`${API_BASE}/api/catalog/lyrics?${p.toString()}`);
    const data = await res.json();
    return {
      plain: data.plainLyrics ?? null,
      synced: data.syncedLyrics ? parseLrc(data.syncedLyrics) : null,
    };
  } catch {
    return { plain: null, synced: null };
  }
}

// Dominant artwork colour for per-track accent theming. Null → caller uses brand.
export async function getAccentColor(artworkUrl?: string): Promise<string | null> {
  if (!artworkUrl) return null;
  try {
    const res = await fetch(`${API_BASE}/api/catalog/color?url=${encodeURIComponent(artworkUrl)}`);
    const data = await res.json();
    return typeof data.color === 'string' ? data.color : null;
  } catch {
    return null;
  }
}
