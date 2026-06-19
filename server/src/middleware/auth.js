import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}
