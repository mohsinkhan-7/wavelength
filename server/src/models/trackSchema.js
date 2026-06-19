import mongoose from 'mongoose';

// Denormalized snapshot of an Audius track so clients can render
// liked songs / playlists without re-fetching the catalog.
export const trackSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true }, // unique id incl. source prefix (e.g. "deezer:916424")
    title: { type: String, required: true },
    artist: { type: String, default: 'Unknown artist' },
    artwork: { type: String, default: '' }, // image url
    duration: { type: Number, default: 0 }, // seconds
    source: { type: String, enum: ['audius', 'deezer', 'jamendo'], default: 'audius' },
    previewOnly: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
