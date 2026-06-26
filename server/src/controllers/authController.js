import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res) {
  const { email, password, displayName } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!displayName) return res.status(400).json({ error: 'Display name required' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = new User({ email, displayName });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user._id.toString());
  res.status(201).json({ token, user: user.toSafeJSON() });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await user.verifyPassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user._id.toString());
  res.json({ token, user: user.toSafeJSON() });
}

