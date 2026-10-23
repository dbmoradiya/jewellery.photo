import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { signToken, authRequired, publicUser } from '../auth.js';

const r = Router();
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

r.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body || {};
  if (!email || !emailRe.test(String(email))) return res.status(400).json({ error: 'A valid email is required' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const user = await prisma.user.create({
    data: {
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(String(password), 10),
      name: String(name || '').slice(0, 120),
      phone: String(phone || '').slice(0, 32),
      credits: config.freeCredits,
    },
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    return res.status(401).json({ error: 'Incorrect email or password' });
  if (user.disabled) return res.status(403).json({ error: 'This account has been disabled' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

// Google sign-in is planned (matches the reference product). It activates only when the
// deployment sets GOOGLE_CLIENT_ID; until then it fails closed with a clear message.
r.post('/google', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(501).json({ error: 'Google sign-in is not configured on this deployment' });
  res.status(501).json({ error: 'Google sign-in is not implemented yet' });
});

export default r;
