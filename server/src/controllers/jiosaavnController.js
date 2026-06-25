// JioSaavn proxy — unofficial reverse-engineered internal API.
// Returns full-length Bollywood / Hindi song streams.
//
// Legal note: this violates JioSaavn's ToS. Use for personal / demo projects.
//
// Stream URLs are DES-CBC encrypted (key '38346591', zero IV).
// Node.js 18+ with OpenSSL 3 puts DES in the "legacy" provider — if decryption
// fails you will see empty JioSaavn rows. Fix by adding this to your Render
// environment variables:  NODE_OPTIONS=--openssl-legacy-provider

import { createDecipheriv } from 'node:crypto';

const BASE = 'https://www.jiosaavn.com/api.php';
const TIMEOUT_MS = 10000;

const cache = new Map();
const TTL_MS = 10 * 60 * 1000;
const getCached = (k) => {
  const h = cache.get(k);
  return h && Date.now() - h.at < TTL_MS ? h.data : null;
};
const setCached = (k, data) => cache.set(k, { at: Date.now(), data });

// Decrypt a JioSaavn encrypted_media_url. JioSaavn uses DES-ECB (key '38346591',
// no IV) — NOT DES-CBC. On OpenSSL 3 (Node 18+) DES lives in the legacy provider,
// so the start script sets NODE_OPTIONS=--openssl-legacy-provider.
function decryptUrl(enc) {
  if (!enc) return null;
  try {
    const dec = createDecipheriv('des-ecb', Buffer.from('38346591'), null);
    dec.setAutoPadding(true);
    const out = Buffer.concat([dec.update(Buffer.from(enc, 'base64')), dec.final()]);
    return out.toString('utf8').replace('http://', 'https://').replace('.mp4', '.mp3');
  } catch {
    // DES unavailable (OpenSSL 3 legacy provider disabled). Set NODE_OPTIONS above.
    return null;
  }
}

function artwork(raw) {
  const img = String(raw?.image || raw?.more_info?.image || '');
  return img
    .replace('150x150.jpg', '500x500.jpg')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('-150x150.jpg', '-500x500.jpg');
}

function htmlDecode(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function mapTrack(raw) {
  if (!raw || !raw.id) return null;
  const info = raw.more_info || {};
  const enc = info.encrypted_media_url || raw.encrypted_media_url || '';
  const streamUrl = decryptUrl(enc);
  if (!streamUrl) return null;

  return {
    id: `jiosaavn:${raw.id}`,
    title: htmlDecode(raw.title || raw.song || 'Untitled'),
    artist: htmlDecode(info.singers || info.music || raw.subtitle || 'Unknown artist'),
    artwork: artwork(raw),
    duration: parseInt(info.duration, 10) || 0,
    source: 'jiosaavn',
    previewOnly: false,
    streamUrl,
  };
}

function mapList(arr) {
  return (Array.isArray(arr) ? arr : []).map(mapTrack).filter(Boolean);
}

async function saavnGet(call, extra = {}) {
  const params = new URLSearchParams({
    __call: call,
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ...extra,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://www.jiosaavn.com/',
      },
    });
    if (!res.ok) throw new Error(`JioSaavn upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/catalog/jiosaavn/trending?limit=25&p=1
// Powers the "Bollywood Hits" row. NOTE: content.getTrending returns song
// objects WITHOUT encrypted_media_url (no playable stream), so we source the
// row from search.getResults for current Hindi hits instead — those results
// include the encrypted stream URL and decrypt cleanly.
export async function jiosaavnTrending(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const p = parseInt(req.query.p, 10) || 1;
  const key = `trending:${limit}:${p}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await saavnGet('search.getResults', { q: 'bollywood', p: String(p), n: String(limit) });
  const results = json?.results || json?.songs?.results || [];
  const payload = { tracks: mapList(results) };
  setCached(key, payload);
  res.json(payload);
}

// GET /api/catalog/jiosaavn/search?q=...&limit=25&p=1
export async function jiosaavnSearch(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ tracks: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const p = parseInt(req.query.p, 10) || 1;
  const key = `search:${q}:${limit}:${p}`;

  const cached = getCached(key);
  if (cached) return res.json(cached);

  const json = await saavnGet('search.getResults', { q, p: String(p), n: String(limit) });

  // Response shape: { results: [...] } or { songs: { results: [...] } }
  const results = json?.results || json?.songs?.results || [];
  const payload = { tracks: mapList(results) };
  setCached(key, payload);
  res.json(payload);
}
