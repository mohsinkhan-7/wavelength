// Extra catalog helpers: lyrics (LRCLIB) + dominant artwork colour (sharp).
// Both are public, cached, and degrade gracefully.
import sharp from 'sharp';

const TIMEOUT_MS = 8000;
const cache = new Map();
const TTL_MS = 30 * 60 * 1000;
const getCached = (k) => {
  const h = cache.get(k);
  return h && Date.now() - h.at < TTL_MS ? h.data : null;
};
const setCached = (k, data) => cache.set(k, { at: Date.now(), data });

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Lyrics (LRCLIB) ----
// https://lrclib.net/api/get?artist_name=&track_name=&duration=
export async function getLyrics(req, res) {
  const artist = (req.query.artist || '').toString().trim();
  const title = (req.query.title || '').toString().trim();
  const duration = parseInt(req.query.duration, 10) || 0;
  if (!artist || !title) return res.json({ plainLyrics: null, syncedLyrics: null });

  const key = `lyrics:${artist}:${title}:${duration}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (duration) params.set('duration', String(duration));

  let payload = { plainLyrics: null, syncedLyrics: null };
  try {
    let r = await fetchWithTimeout(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Wavelength/1.0 (https://trufe.com)' },
    });
    // Fall back to fuzzy search if exact get misses.
    if (r.status === 404) {
      const sp = new URLSearchParams({ artist_name: artist, track_name: title });
      const sr = await fetchWithTimeout(`https://lrclib.net/api/search?${sp.toString()}`, {
        headers: { 'User-Agent': 'Wavelength/1.0 (https://trufe.com)' },
      });
      if (sr.ok) {
        const arr = await sr.json();
        const hit = Array.isArray(arr) ? arr.find((x) => x.syncedLyrics || x.plainLyrics) : null;
        if (hit) payload = { plainLyrics: hit.plainLyrics ?? null, syncedLyrics: hit.syncedLyrics ?? null };
      }
    } else if (r.ok) {
      const j = await r.json();
      payload = { plainLyrics: j.plainLyrics ?? null, syncedLyrics: j.syncedLyrics ?? null };
    }
  } catch {
    /* network/timeout → empty payload */
  }
  setCached(key, payload);
  res.json(payload);
}

// ---- Dominant artwork colour ----
export async function getArtworkColor(req, res) {
  const url = (req.query.url || '').toString();
  if (!/^https?:\/\//.test(url)) return res.json({ color: null });

  const key = `color:${url}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  let payload = { color: null };
  try {
    const r = await fetchWithTimeout(url);
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      // Average the image down to a single representative pixel.
      const { data } = await sharp(buf).resize(1, 1, { fit: 'cover' }).removeAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      const [rr, gg, bb] = data;
      payload = { color: rgbToHex(rr, gg, bb) };
    }
  } catch {
    /* decode/network failure → null (client falls back to brand) */
  }
  setCached(key, payload);
  res.json(payload);
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
