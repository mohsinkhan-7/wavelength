import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import playlistRoutes from './routes/playlists.js';
import catalogRoutes from './routes/catalog.js';
import adminRoutes from './routes/admin.js';

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
app.use('/api/admin', adminRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;

// Start the HTTP server FIRST so the platform health check (GET /) passes
// immediately and the deploy goes live. The catalog endpoints (Deezer/Jamendo
// proxy) work without a database. Then connect to Mongo in the background —
// auth/playlist routes start working once it's connected. We deliberately do
// NOT exit on a DB failure, so a transient Atlas/network blip doesn't take the
// whole service down; the error is logged loudly for diagnosis.
app.listen(PORT, () => console.log(`🎵 Wavelength API listening on port ${PORT}`));

// Connect to Mongo with retry. If the first attempt fails (e.g. Atlas IP
// allowlist not yet active), keep retrying every 10s so the service self-heals
// once the DB becomes reachable — no redeploy needed. Auth/playlist routes
// start working the moment a connection succeeds.
async function connectWithRetry(attempt = 1) {
  try {
    await connectDB(process.env.MONGO_URI);
  } catch (e) {
    console.error(`⚠️  MongoDB connection failed (attempt ${attempt}): ${e.message}`);
    setTimeout(() => connectWithRetry(attempt + 1), 10000);
  }
}
connectWithRetry();
