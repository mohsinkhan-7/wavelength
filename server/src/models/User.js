import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { trackSchema } from './trackSchema.js';

const historyEntrySchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, default: 'Unknown artist' },
    artwork: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    source: { type: String, default: 'audius' },
    playedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const followedArtistSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true },
    name: { type: String, default: 'Artist' },
    source: { type: String, default: 'audius' },
    followedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    likedSongs: { type: [trackSchema], default: [] },
    history: { type: [historyEntrySchema], default: [] },
    followedArtists: { type: [followedArtistSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Strip sensitive fields when serializing to JSON
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    likedSongs: this.likedSongs,
  };
};

export const User = mongoose.model('User', userSchema);
