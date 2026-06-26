import { Router } from 'express';
import { User } from '../models/User.js';
import { Playlist } from '../models/Playlist.js';

const router = Router();

router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const minus7  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const minus30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, newUsers7, newUsers30, totalPlaylists] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: minus7  } }),
      User.countDocuments({ createdAt: { $gte: minus30 } }),
      Playlist.countDocuments(),
    ]);

    res.json({
      users: {
        total:       totalUsers,
        last7Days:   newUsers7,
        last30Days:  newUsers30,
      },
      playlists: {
        total: totalPlaylists,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find({}, 'displayName email createdAt likedSongs').sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({
      id:          u._id,
      displayName: u.displayName,
      email:       u.email,
      likedSongs:  u.likedSongs.length,
      joinedAt:    u.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
