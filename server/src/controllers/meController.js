// Current-user endpoints: profile, liked songs, history, follows, stats

export async function getMe(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

export async function updateMe(req, res) {
  const { displayName, currentPassword, newPassword } = req.body || {};

  if (displayName !== undefined) {
    if (!displayName.trim()) return res.status(400).json({ error: 'Display name cannot be empty' });
    req.user.displayName = displayName.trim();
  }

  if (newPassword !== undefined) {
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const ok = await req.user.verifyPassword(currentPassword || '');
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    await req.user.setPassword(newPassword);
  }

  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
}

export async function likeTrack(req, res) {
  const track = req.body || {};
  if (!track.trackId || !track.title) return res.status(400).json({ error: 'trackId and title required' });

  const already = req.user.likedSongs.some((t) => t.trackId === track.trackId);
  if (!already) {
    req.user.likedSongs.unshift({
      trackId: track.trackId,
      title: track.title,
      artist: track.artist || 'Unknown artist',
      artwork: track.artwork || '',
      duration: track.duration || 0,
      source: ['audius', 'deezer', 'jamendo'].includes(track.source) ? track.source : 'audius',
      previewOnly: !!track.previewOnly,
    });
    await req.user.save();
  }
  res.json({ likedSongs: req.user.likedSongs });
}

export async function unlikeTrack(req, res) {
  const { trackId } = req.params;
  req.user.likedSongs = req.user.likedSongs.filter((t) => t.trackId !== trackId);
  await req.user.save();
  res.json({ likedSongs: req.user.likedSongs });
}

// ── History ──────────────────────────────────────────────────────────────────

export async function addToHistory(req, res) {
  const track = req.body || {};
  if (!track.trackId || !track.title) return res.status(400).json({ error: 'trackId and title required' });

  req.user.history.unshift({
    trackId: track.trackId,
    title: track.title,
    artist: track.artist || 'Unknown artist',
    artwork: track.artwork || '',
    duration: track.duration || 0,
    source: track.source || 'audius',
    playedAt: new Date(),
  });

  // Cap at 200 most-recent entries.
  if (req.user.history.length > 200) req.user.history = req.user.history.slice(0, 200);

  await req.user.save();
  res.json({ ok: true });
}

export async function getHistory(req, res) {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  res.json({ history: req.user.history.slice(0, limit) });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(req, res) {
  const history = req.user.history;

  const totalPlays = history.length;
  const totalMinutes = Math.round(history.reduce((s, h) => s + (h.duration || 0), 0) / 60);

  // Top artists by play count
  const artistCounts = {};
  for (const h of history) {
    const key = h.artist || 'Unknown artist';
    artistCounts[key] = (artistCounts[key] || 0) + 1;
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Plays by source (proxy for genre catalog)
  const sourceCounts = {};
  for (const h of history) {
    const key = h.source || 'audius';
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  }
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  // Plays per day for the last 7 days
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(now - i * 86400000).toISOString().slice(0, 10)
  ).reverse();

  const dailyCounts = Object.fromEntries(days.map((d) => [d, 0]));
  for (const h of history) {
    const d = new Date(h.playedAt).toISOString().slice(0, 10);
    if (d in dailyCounts) dailyCounts[d]++;
  }
  const dailyActivity = days.map((d) => ({ date: d, count: dailyCounts[d] }));

  res.json({ totalPlays, totalMinutes, topArtists, topSources, dailyActivity });
}

// ── Artist follows ────────────────────────────────────────────────────────────

export async function getFollowedArtists(req, res) {
  res.json({ followedArtists: req.user.followedArtists });
}

export async function followArtist(req, res) {
  const { artistId, name, source } = req.body || {};
  if (!artistId) return res.status(400).json({ error: 'artistId required' });

  const already = req.user.followedArtists.some((a) => a.artistId === artistId);
  if (!already) {
    req.user.followedArtists.push({ artistId, name: name || 'Artist', source: source || 'audius' });
    await req.user.save();
  }
  res.json({ followedArtists: req.user.followedArtists });
}

export async function unfollowArtist(req, res) {
  const { artistId } = req.params;
  req.user.followedArtists = req.user.followedArtists.filter((a) => a.artistId !== artistId);
  await req.user.save();
  res.json({ followedArtists: req.user.followedArtists });
}
