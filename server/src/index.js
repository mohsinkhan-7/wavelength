import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import playlistRoutes from './routes/playlists.js';
import catalogRoutes from './routes/catalog.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ name: 'wavelength-api', status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/catalog', catalogRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🎵 Wavelength API on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Failed to connect to MongoDB:', e.message);
    process.exit(1);
  });
