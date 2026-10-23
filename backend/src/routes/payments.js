import { Router } from 'express';
import { authRequired } from '../auth.js';
import { prisma } from '../db.js';
import {
  razorpayConfigured, pricePerCreditInr, razorpayCreateOrder, verifyPaymentSignature,
} from '../services/razorpay.js';
import { settleOrderPaid } from '../services/topups.js';

const r = Router();

export function paymentsStatus() {
  return { enabled: razorpayConfigured(), provider: razorpayConfigured() ? 'razorpay' : 'none' };
}

r.get('/status', (_req, res) => res.json(paymentsStatus()));

// Start a top-up: creates a gateway order and records it locally as CREATED.
r.post('/topup', authRequired, async (req, res, next) => {
  try {
    if (!razorpayConfigured())
      return res.status(501).json({ error: 'Online payments are not configured on this deployment. Ask the admin to top up your credits.' });
    const credits = Math.max(1, Math.min(1000, parseInt(req.body?.credits, 10) || 0));
    const amountInr = credits * pricePerCreditInr();
    const local = await prisma.paymentOrder.create({
      data: { userId: req.user.id, orderId: `local_${Date.now()}_${req.user.id}`, amountInr, credits },
    });
    const gw = await razorpayCreateOrder({ amountInr, receipt: local.id });
    const order = await prisma.paymentOrder.update({ where: { id: local.id }, data: { orderId: gw.id } });
    res.status(201).json({
      orderId: order.orderId,
      amountInr,
      credits,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) { next(e); }
});

// Checkout completion callback: verify the gateway signature, then settle idempotently.
r.post('/verify', authRequired, async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body || {};
    if (!orderId || !paymentId || !signature)
      return res.status(400).json({ error: 'Missing payment confirmation details' });
    if (!verifyPaymentSignature({ orderId, paymentId, signature }))
      return res.status(400).json({ error: 'Payment signature could not be verified' });
    const result = await settleOrderPaid({ orderId, paymentId });
    res.json({ ok: true, credited: result.credited, credits: result.order.credits });
  } catch (e) { next(e); }
});

export default r;

// Webhook router: mounted separately in index.js with a raw body so the gateway
// signature can be verified against the exact payload Razorpay signed.
export const webhookRouter = Router();
webhookRouter.post('/', async (req, res) => {
  const { verifyWebhookSignature } = await import('../services/razorpay.js');
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : '';
  if (!verifyWebhookSignature(raw, req.get('x-razorpay-signature')))
    return res.status(400).json({ error: 'Webhook signature could not be verified' });
  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Invalid webhook payload' }); }
  if (event?.event === 'payment.captured') {
    const p = event?.payload?.payment?.entity || {};
    if (p.order_id) await settleOrderPaid({ orderId: p.order_id, paymentId: p.id });
  }
  res.json({ ok: true });
});
