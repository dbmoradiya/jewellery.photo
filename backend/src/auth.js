import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { prisma } from './db.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
}

export async function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.disabled) return res.status(401).json({ error: 'Account unavailable' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function adminRequired(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, credits: u.credits, createdAt: u.createdAt };
}
