import { Playlist } from '../models/Playlist.js';

export async function listPlaylists(req, res) {
  const playlists = await Playlist.find({ owner: req.user._id }).sort({ updatedAt: -1 });
  res.json({ playlists });
}

export async function createPlaylist(req, res) {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Playlist name required' });

  const playlist = await Playlist.create({
    owner: req.user._id,
    name,
    description: description || '',
    tracks: [],
  });
  res.status(201).json({ playlist });
}

export async function getPlaylist(req, res) {
  const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json({ playlist });
}

export async function updatePlaylist(req, res) {
  const { name, description } = req.body || {};
  const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  if (name !== undefined) playlist.name = name;
  if (description !== undefined) playlist.description = description;
  await playlist.save();
  res.json({ playlist });
}

export async function deletePlaylist(req, res) {
  const result = await Playlist.deleteOne({ _id: req.params.id, owner: req.user._id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Playlist not found' });
  res.json({ ok: true });
}

export async function addTrack(req, res) {
  const track = req.body || {};
  if (!track.trackId || !track.title) return res.status(400).json({ error: 'trackId and title required' });

  const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const already = playlist.tracks.some((t) => t.trackId === track.trackId);
  if (!already) {
    playlist.tracks.push({
      trackId: track.trackId,
      title: track.title,
      artist: track.artist || 'Unknown artist',
      artwork: track.artwork || '',
      duration: track.duration || 0,
      source: ['audius', 'deezer', 'jamendo'].includes(track.source) ? track.source : 'audius',
      previewOnly: !!track.previewOnly,
    });
    await playlist.save();
  }
  res.json({ playlist });
}

export async function removeTrack(req, res) {
  const { id, trackId } = req.params;
  const playlist = await Playlist.findOne({ _id: id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  playlist.tracks = playlist.tracks.filter((t) => t.trackId !== trackId);
  await playlist.save();
  res.json({ playlist });
}
