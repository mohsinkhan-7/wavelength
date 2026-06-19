import mongoose from 'mongoose';
import { trackSchema } from './trackSchema.js';

const playlistSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tracks: { type: [trackSchema], default: [] },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model('Playlist', playlistSchema);
