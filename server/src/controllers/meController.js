// Current-user endpoints: profile + liked songs

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
