import { Router } from 'express';
import { deezerSearch, deezerChart, deezerArtist } from '../controllers/deezerController.js';
import { jamendoTracks, jamendoArtist } from '../controllers/jamendoController.js';
import { getLyrics, getArtworkColor } from '../controllers/extrasController.js';
import { archiveBollywood, archiveSearch } from '../controllers/archiveController.js';
import { jiosaavnTrending, jiosaavnSearch } from '../controllers/jiosaavnController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public catalog proxy — no auth (public catalog metadata + previews).
router.get('/deezer/search', wrap(deezerSearch));
router.get('/deezer/chart', wrap(deezerChart));
router.get('/deezer/artist/:id', wrap(deezerArtist));

// Jamendo — Creative-Commons full tracks (legal to stream + download).
router.get('/jamendo/tracks', wrap(jamendoTracks));
router.get('/jamendo/artist/:id', wrap(jamendoArtist));

// Internet Archive — public-domain Hindi / Bollywood audio (full tracks, legal).
router.get('/archive/bollywood', wrap(archiveBollywood));
router.get('/archive/search', wrap(archiveSearch));

// JioSaavn — unofficial proxy for full-length Bollywood streams (grey area).
router.get('/jiosaavn/trending', wrap(jiosaavnTrending));
router.get('/jiosaavn/search', wrap(jiosaavnSearch));

// Extras — lyrics (LRCLIB) + dominant artwork colour.
router.get('/lyrics', wrap(getLyrics));
router.get('/color', wrap(getArtworkColor));

export default router;
