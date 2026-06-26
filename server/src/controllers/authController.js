import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { sendPasswordResetOtp } from '../lib/email.js';

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

export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always respond OK so we don't reveal whether an email is registered.
  if (!user) return res.json({ message: 'If that email is registered, a code has been sent.' });

  const otp = String(crypto.randomInt(100000, 999999));
  user.passwordResetOtp     = await bcrypt.hash(otp, 10);
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  await sendPasswordResetOtp(user.email, otp);
  res.json({ message: 'If that email is registered, a code has been sent.' });
}

export async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, code, and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  if (user.passwordResetExpires < new Date()) {
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }

  const match = await bcrypt.compare(otp, user.passwordResetOtp);
  if (!match) return res.status(400).json({ error: 'Incorrect code' });

  await user.setPassword(newPassword);
  user.passwordResetOtp     = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: 'Password updated. You can now log in.' });
}
