import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { signToken, authRequired, publicUser } from '../auth.js';
import { googleConfigured, verifyGoogleCredential } from '../services/googleAuth.js';
import { paymentsStatus } from '../services/payments.js';

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
      transactions: { create: { delta: config.freeCredits, reason: 'SIGNUP_GRANT' } },
    },
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    return res.status(401).json({ error: 'Incorrect email or password' });
  if (user.disabled) return res.status(403).json({ error: 'This account has been disabled' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

// Public client config: tells the frontend which optional sign-in/payment paths are live.
r.get('/config', (_req, res) => {
  res.json({ googleEnabled: googleConfigured(), paymentsEnabled: paymentsStatus().enabled });
});

// Google sign-in. Fails closed unless GOOGLE_CLIENT_ID is set; when set, the ID token
// is verified server-side against Google's keys with the client id as audience.
r.post('/google', async (req, res) => {
  if (!googleConfigured())
    return res.status(501).json({ error: 'Google sign-in is not configured on this deployment' });
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });
  let payload;
  try {
    payload = await verifyGoogleCredential(String(credential));
  } catch {
    return res.status(401).json({ error: 'Google sign-in could not be verified' });
  }
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true)
    return res.status(401).json({ error: 'Google account email is not verified' });
  const email = String(payload.email).toLowerCase();
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email }] } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        googleId: payload.sub,
        name: String(payload.name || '').slice(0, 120),
        credits: config.freeCredits,
        transactions: { create: { delta: config.freeCredits, reason: 'SIGNUP_GRANT' } },
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
  }
  if (user.disabled) return res.status(403).json({ error: 'This account has been disabled' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Own credit ledger: every balance change is recorded and auditable.
r.get('/ledger', authRequired, async (req, res) => {
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50,
  });
  res.json({ transactions });
});

export default r;
