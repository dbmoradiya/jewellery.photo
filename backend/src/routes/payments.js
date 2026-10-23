import { Router } from 'express';
import { authRequired } from '../auth.js';
import { prisma } from '../db.js';
import {
  razorpayConfigured, pricePerCreditInr, razorpayCreateOrder, verifyPaymentSignature,
  razorpayFetchPayment,
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

// Shared gateway-truth check: the payment must exist at the gateway, be captured,
// belong to this order, and match the recorded amount and currency exactly.
async function assertPaymentMatchesOrder({ payment, order }) {
  if (!payment) return 'Payment could not be confirmed with the gateway';
  if (payment.status !== 'captured') return `Payment is not captured (status: ${payment.status || 'unknown'})`;
  if (payment.order_id !== order.orderId) return 'Payment does not belong to this order';
  if (payment.amount !== order.amountInr * 100) return 'Paid amount does not match the order';
  if (String(payment.currency).toUpperCase() !== 'INR') return 'Paid currency does not match the order';
  return null;
}

// Checkout completion callback: signature, ownership, then gateway-truth checks,
// then idempotent settlement.
r.post('/verify', authRequired, async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body || {};
    if (!orderId || !paymentId || !signature)
      return res.status(400).json({ error: 'Missing payment confirmation details' });
    if (!verifyPaymentSignature({ orderId, paymentId, signature }))
      return res.status(400).json({ error: 'Payment signature could not be verified' });
    const order = await prisma.paymentOrder.findUnique({ where: { orderId: String(orderId) } });
    if (!order || order.userId !== req.user.id)
      return res.status(404).json({ error: 'Unknown payment order' });
    const mismatch = await assertPaymentMatchesOrder({ payment: await razorpayFetchPayment(String(paymentId)), order });
    if (mismatch) return res.status(400).json({ error: mismatch });
    const result = await settleOrderPaid({ orderId: order.orderId, paymentId: String(paymentId) });
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
    if (p.order_id) {
      const order = await prisma.paymentOrder.findUnique({ where: { orderId: String(p.order_id) } });
      // The webhook event itself asserts capture; still verify amount/currency/binding
      // against the local order before crediting. Unknown orders are acknowledged
      // without settlement so the gateway stops retrying.
      if (order) {
        const mismatch = p.amount === order.amountInr * 100 && String(p.currency).toUpperCase() === 'INR'
          ? null
          : 'Webhook payment does not match the order';
        if (!mismatch) await settleOrderPaid({ orderId: order.orderId, paymentId: p.id });
      }
    }
  }
  res.json({ ok: true });
});
