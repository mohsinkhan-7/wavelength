import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMe, updateMe, likeTrack, unlikeTrack,
  addToHistory, getHistory, getStats,
  getFollowedArtists, followArtist, unfollowArtist,
} from '../controllers/meController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

router.get('/', wrap(getMe));
router.patch('/', wrap(updateMe));
router.post('/likes', wrap(likeTrack));
router.delete('/likes/:trackId', wrap(unlikeTrack));

router.post('/history', wrap(addToHistory));
router.get('/history', wrap(getHistory));
router.get('/stats', wrap(getStats));

router.get('/followed-artists', wrap(getFollowedArtists));
router.post('/followed-artists', wrap(followArtist));
router.delete('/followed-artists/:artistId', wrap(unfollowArtist));

export default router;
