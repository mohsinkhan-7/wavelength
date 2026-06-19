import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
} from '../controllers/playlistController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

router.get('/', wrap(listPlaylists));
router.post('/', wrap(createPlaylist));
router.get('/:id', wrap(getPlaylist));
router.patch('/:id', wrap(updatePlaylist));
router.delete('/:id', wrap(deletePlaylist));
router.post('/:id/tracks', wrap(addTrack));
router.delete('/:id/tracks/:trackId', wrap(removeTrack));

export default router;
