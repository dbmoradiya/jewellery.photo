import { Router } from 'express';
import { authRequired } from '../auth.js';
import { paymentsStatus, createTopUpOrder } from '../services/payments.js';

const r = Router();

r.get('/status', (_req, res) => res.json(paymentsStatus()));

r.post('/topup', authRequired, async (_req, res, next) => {
  try {
    res.status(201).json({ order: await createTopUpOrder() });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

export default r;
