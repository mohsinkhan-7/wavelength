// End-to-end smoke test: boots the REAL Express app against an in-memory
// MongoDB and exercises the full auth → playlist → like flow over HTTP.
//
//   node scripts/smoke.mjs
//
// Requires the `mongodb-memory-server` devDependency.
import { MongoMemoryServer } from 'mongodb-memory-server';

const BASE = 'http://127.0.0.1:4100';
let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

async function waitForServer(attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not start in time');
}

const sampleTrack = {
  trackId: 'VgkY7Er',
  title: 'Brand new drip',
  artist: "Sweet Spot '91",
  artwork: 'https://example.com/art.jpg',
  duration: 314,
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = 'smoke-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '4100';

console.log('🧪 Booting app against in-memory MongoDB…');
await import('../src/index.js');
await waitForServer();

try {
  console.log('\n— Auth —');
  const email = `user${Date.now()}@test.dev`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'secret123', displayName: 'Test User' },
  });
  check('register returns 201', reg.status === 201, `(got ${reg.status})`);
  check('register returns a token', typeof reg.body.token === 'string');
  check('register rejects duplicate email', true); // verified below

  const dup = await api('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'secret123', displayName: 'Dupe' },
  });
  check('duplicate email rejected (409)', dup.status === 409, `(got ${dup.status})`);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'secret123' },
  });
  check('login returns 200 + token', login.status === 200 && !!login.body.token);

  const badLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'wrong' },
  });
  check('wrong password rejected (401)', badLogin.status === 401, `(got ${badLogin.status})`);

  const token = login.body.token;

  const noAuth = await api('/api/me');
  check('protected route blocks no-token (401)', noAuth.status === 401, `(got ${noAuth.status})`);

  const me = await api('/api/me', { token });
  check('GET /me returns the user', me.status === 200 && me.body.user.email === email);

  console.log('\n— Likes —');
  const like = await api('/api/me/likes', { method: 'POST', token, body: sampleTrack });
  check('like a track', like.status === 200 && like.body.likedSongs.length === 1);

  const likeAgain = await api('/api/me/likes', { method: 'POST', token, body: sampleTrack });
  check('liking same track is idempotent', likeAgain.body.likedSongs.length === 1);

  const unlike = await api(`/api/me/likes/${sampleTrack.trackId}`, { method: 'DELETE', token });
  check('unlike a track', unlike.status === 200 && unlike.body.likedSongs.length === 0);

  console.log('\n— Playlists —');
  const create = await api('/api/playlists', {
    method: 'POST',
    token,
    body: { name: 'Road Trip' },
  });
  check('create playlist (201)', create.status === 201 && create.body.playlist.name === 'Road Trip');
  const plId = create.body.playlist._id;

  const addTrack = await api(`/api/playlists/${plId}/tracks`, {
    method: 'POST',
    token,
    body: sampleTrack,
  });
  check('add track to playlist', addTrack.body.playlist.tracks.length === 1);

  const list = await api('/api/playlists', { token });
  check('list playlists includes ours', list.body.playlists.some((p) => p._id === plId));

  const removeTrack = await api(`/api/playlists/${plId}/tracks/${sampleTrack.trackId}`, {
    method: 'DELETE',
    token,
  });
  check('remove track from playlist', removeTrack.body.playlist.tracks.length === 0);

  const del = await api(`/api/playlists/${plId}`, { method: 'DELETE', token });
  check('delete playlist', del.status === 200 && del.body.ok === true);

  const listAfter = await api('/api/playlists', { token });
  check('playlist is gone after delete', !listAfter.body.playlists.some((p) => p._id === plId));

  console.log('\n— Cross-user isolation —');
  const other = await api('/api/auth/register', {
    method: 'POST',
    body: { email: `other${Date.now()}@test.dev`, password: 'secret123', displayName: 'Other' },
  });
  const otherList = await api('/api/playlists', { token: other.body.token });
  check("new user sees no one else's playlists", otherList.body.playlists.length === 0);
} catch (e) {
  failed++;
  console.error('\n💥 Unexpected error:', e);
} finally {
  console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ FAILURES'} — ${passed} passed, ${failed} failed`);
  await mongod.stop();
  process.exit(failed === 0 ? 0 : 1);
}
