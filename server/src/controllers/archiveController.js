// Internet Archive proxy — public-domain Hindi / Bollywood audio.
// No API key required. Archive.org search returns item identifiers; we then
// fetch each item's file manifest in parallel to extract direct MP3 URLs.
// Results are cached for 30 minutes so the N+1 cost is paid only once.

const ARCHIVE_BASE = 'https://archive.org';
const TIMEOUT_MS = 12000;

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;
const getCached = (k) => {
  const h = cache.get(k);
  return h && Date.now() - h.at < TTL_MS ? h.data : null;
};
const setCached = (k, data) => cache.set(k, { at: Date.now(), data });

async function archiveGet(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Wavelength/1.0 (+catalog proxy)' },
    });
    if (!res.ok) throw new Error(`Archive upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Fetch file manifest for one Archive.org item and extract MP3 tracks.
async function itemTracks(identifier) {
  try {
    const meta = await archiveGet(`${ARCHIVE_BASE}/metadata/${identifier}`);
    const itemMeta = meta.metadata || {};
    const files = (meta.files || []).filter(
      (f) =>
        f.name &&
        (f.format === 'VBR MP3' || f.format === 'MP3' || f.name.toLowerCase().endsWith('.mp3')) &&
        // skip derivative/spectrogram files
        !f.name.includes('_spectrogram') &&
        !f.name.includes('_waveform') &&
        !f.name.startsWith('.')
    );
    if (!files.length) return [];

    const artwork = `${ARCHIVE_BASE}/services/img/${identifier}`;

    return files.map((f) => {
      const rawTitle =
        f.title ||
        f.name.replace(/\.mp3$/i, '').replace(/[_-]/g, ' ').replace(/^\d+\s*/, '').trim();
      const rawArtist =
        f.creator ||
        (Array.isArray(itemMeta.creator) ? itemMeta.creator[0] : itemMeta.creator) ||
        (Array.isArray(itemMeta.artist) ? itemMeta.artist[0] : itemMeta.artist) ||
        'Unknown artist';

      return {
        id: `archive:${identifier}:${f.name}`,
        title: Array.isArray(rawTitle) ? rawTitle[0] : String(rawTitle),
        artist: Array.isArray(rawArtist) ? rawArtist[0] : String(rawArtist),
        artwork,
        duration: f.length ? parseFloat(f.length) : 0,
        source: 'archive',
        previewOnly: false,
        streamUrl: `${ARCHIVE_BASE}/download/${identifier}/${encodeURIComponent(f.name)}`,
      };
    });
  } catch {
    return [];
  }
}

async function searchAndExpand(query, limit, start) {
  const searchUrl =
    `${ARCHIVE_BASE}/advancedsearch.php` +
    `?q=${encodeURIComponent(query)}` +
    `&fl[]=identifier,title,creator` +
    `&sort[]=downloads+desc` +
    `&rows=${Math.min(limit, 20)}` +
    `&start=${start}` +
    `&output=json`;

  const data = await archiveGet(searchUrl);
  const docs = data?.response?.docs || [];
  if (!docs.length) return [];

  // Fetch file manifests for all returned items in parallel.
  const nested = await Promise.all(docs.map((d) => itemTracks(d.identifier)));
  return nested.flat().slice(0, limit);
}

// GET /api/catalog/archive/bollywood?limit=25&offset=0
export async function archiveBollywood(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const offset = parseInt(req.query.offset, 10) || 0;
  const key = `bollywood:${limit}:${offset}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const tracks = await searchAndExpand(
    'subject:(bollywood OR "hindi film songs" OR "hindi songs") AND mediatype:audio',
    limit,
    offset
  );
  const payload = { tracks };
  setCached(key, payload);
  res.json(payload);
}

// GET /api/catalog/archive/search?q=...&limit=25&offset=0
export async function archiveSearch(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ tracks: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const offset = parseInt(req.query.offset, 10) || 0;
  const key = `search:${q}:${limit}:${offset}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const tracks = await searchAndExpand(
    `${q} AND mediatype:audio`,
    limit,
    offset
  );
  const payload = { tracks };
  setCached(key, payload);
  res.json(payload);
}
