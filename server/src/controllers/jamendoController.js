// Server-side Jamendo proxy. Jamendo is Creative-Commons licensed music — full
// tracks, legal to stream AND download. Requires a free client_id (env
// JAMENDO_CLIENT_ID from https://devportal.jamendo.com). Without it, endpoints
// return an empty list so the app simply hides the Jamendo rows.

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';
const TIMEOUT_MS = 8000;
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || '';

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;
const getCached = (k) => {
  const h = cache.get(k);
  return h && Date.now() - h.at < TTL_MS ? h.data : null;
};
const setCached = (k, data) => cache.set(k, { at: Date.now(), data });

async function jamendoFetch(path, params) {
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    format: 'json',
    imagesize: '300',
    audioformat: 'mp31',
    ...params,
  }).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${JAMENDO_BASE}${path}?${query}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Jamendo upstream ${res.status}`);
    const json = await res.json();
    // Jamendo wraps errors in headers.status === 'failed'.
    if (json?.headers?.status === 'failed') {
      throw new Error(json.headers.error_message || 'Jamendo error');
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// Map a raw Jamendo track to our Track shape (full track, downloadable).
function mapJamendoTrack(raw) {
  if (!raw || !raw.audio) return null;
  return {
    id: `jamendo:${raw.id}`,
    title: raw.name || 'Untitled',
    artist: raw.artist_name || 'Unknown artist',
    artwork: raw.image || raw.album_image || '',
    duration: typeof raw.duration === 'number' ? raw.duration : 0,
    source: 'jamendo',
    previewOnly: false,
    artistId: raw.artist_id != null ? String(raw.artist_id) : undefined,
    streamUrl: raw.audio, // full-length MP3
  };
}

const mapList = (results) => (Array.isArray(results) ? results : []).map(mapJamendoTrack).filter(Boolean);

function empty(res) {
  return res.json({ tracks: [], note: 'JAMENDO_CLIENT_ID not configured' });
}

// /tracks?order=&tags=&search=&limit=&offset=
export async function jamendoTracks(req, res) {
  if (!CLIENT_ID) return empty(res);
  const order = (req.query.order || 'popularity_month').toString();
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const params = { order, limit: String(limit), offset: String(offset) };
  if (req.query.tags) params.fuzzytags = req.query.tags.toString();
  if (req.query.search) params.search = req.query.search.toString();
  const key = `tracks:${order}:${params.fuzzytags || ''}:${params.search || ''}:${limit}:${offset}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await jamendoFetch('/tracks/', params);
  const payload = { tracks: mapList(json?.results) };
  setCached(key, payload);
  res.json(payload);
}

// /artist/:id — an artist's tracks + name/image.
export async function jamendoArtist(req, res) {
  if (!CLIENT_ID) return empty(res);
  const id = (req.params.id || '').toString().replace(/[^0-9]/g, '');
  if (!id) return res.json({ tracks: [], name: '', avatar: '' });
  const key = `artist:${id}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await jamendoFetch('/artists/tracks/', { id, limit: '50' });
  const artist = json?.results?.[0];
  const payload = {
    tracks: mapList(artist?.tracks),
    name: artist?.name || '',
    avatar: artist?.image || '',
  };
  setCached(key, payload);
  res.json(payload);
}
