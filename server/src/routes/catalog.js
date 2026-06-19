import { Router } from 'express';
import { deezerSearch, deezerChart, deezerArtist } from '../controllers/deezerController.js';
import { jamendoTracks, jamendoArtist } from '../controllers/jamendoController.js';
import { getLyrics, getArtworkColor } from '../controllers/extrasController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public catalog proxy — no auth (public catalog metadata + previews).
router.get('/deezer/search', wrap(deezerSearch));
router.get('/deezer/chart', wrap(deezerChart));
router.get('/deezer/artist/:id', wrap(deezerArtist));

// Jamendo — Creative-Commons full tracks (legal to stream + download).
router.get('/jamendo/tracks', wrap(jamendoTracks));
router.get('/jamendo/artist/:id', wrap(jamendoArtist));

// Extras — lyrics (LRCLIB) + dominant artwork colour.
router.get('/lyrics', wrap(getLyrics));
router.get('/color', wrap(getArtworkColor));

export default router;
