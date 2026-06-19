import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe, updateMe, likeTrack, unlikeTrack } from '../controllers/meController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

router.get('/', wrap(getMe));
router.patch('/', wrap(updateMe));
router.post('/likes', wrap(likeTrack));
router.delete('/likes/:trackId', wrap(unlikeTrack));

export default router;
