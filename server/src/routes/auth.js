import { Router } from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = Router();

// async wrapper so thrown errors reach the central error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/register', wrap(register));
router.post('/login', wrap(login));
router.post('/forgot-password', wrap(forgotPassword));
router.post('/reset-password', wrap(resetPassword));

export default router;
