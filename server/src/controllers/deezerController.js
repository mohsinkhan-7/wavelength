// Server-side Deezer proxy. Deezer's public API sends no Access-Control-Allow-Origin
// header (browser fetch is blocked) and throttles per-IP, so we fetch it here,
// map to our Track shape, and add a short cache. No auth: public catalog.
//
// Note: Deezer silently rate-limits datacenter IPs (may return total>0 with an
// empty data[]). From a normal residential/server IP it returns full results.

const DEEZER_BASE = 'https://api.deezer.com';
const TIMEOUT_MS = 8000;

const cache = new Map(); // key -> { at, data }
const TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { at: Date.now(), data });
}

async function deezerFetch(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DEEZER_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Wavelength/1.0 (+server proxy)' },
    });
    if (!res.ok) throw new Error(`Deezer upstream ${res.status}`);
    const json = await res.json();
    // Deezer returns HTTP 200 with an { error } body for quota/oauth issues.
    if (json && json.error) throw new Error(json.error.message || 'Deezer error');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// Map a raw Deezer track to our Track shape. Skips tracks without a preview.
function mapDeezerTrack(raw) {
  if (!raw || !raw.preview) return null;
  const album = raw.album || {};
  return {
    id: `deezer:${raw.id}`,
    title: raw.title || 'Untitled',
    artist: (raw.artist && raw.artist.name) || 'Unknown artist',
    artwork: album.cover_big || album.cover_medium || '',
    duration: typeof raw.duration === 'number' ? raw.duration : 0, // seconds
    source: 'deezer',
    artistId: raw.artist && raw.artist.id != null ? String(raw.artist.id) : undefined,
    previewOnly: true,
    streamUrl: raw.preview, // 30s signed MP3
  };
}

function mapList(data) {
  return (Array.isArray(data) ? data : []).map(mapDeezerTrack).filter(Boolean);
}

export async function deezerSearch(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ tracks: [], total: 0 });
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const index = parseInt(req.query.index, 10) || 0;
  const key = `search:${q}:${limit}:${index}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await deezerFetch(`/search?q=${encodeURIComponent(q)}&limit=${limit}&index=${index}`);
  const payload = { tracks: mapList(json && json.data), total: (json && json.total) || 0 };
  setCached(key, payload);
  res.json(payload);
}

export async function deezerChart(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const index = parseInt(req.query.index, 10) || 0;
  const key = `chart:${limit}:${index}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await deezerFetch(`/chart/0/tracks?limit=${limit}&index=${index}`);
  const payload = { tracks: mapList(json && json.data), total: (json && json.total) || 0 };
  setCached(key, payload);
  res.json(payload);
}

// An artist's top tracks (previews). :id is the bare Deezer artist id.
export async function deezerArtist(req, res) {
  const id = (req.params.id || '').toString().replace(/[^0-9]/g, '');
  if (!id) return res.json({ tracks: [], name: '', avatar: '' });
  const key = `artist:${id}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const [top, info] = await Promise.all([
    deezerFetch(`/artist/${id}/top?limit=50`),
    deezerFetch(`/artist/${id}`).catch(() => null),
  ]);
  const payload = {
    tracks: mapList(top && top.data),
    name: (info && info.name) || '',
    avatar: (info && (info.picture_big || info.picture_medium)) || '',
  };
  setCached(key, payload);
  res.json(payload);
}
