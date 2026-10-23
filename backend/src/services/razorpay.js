import crypto from 'node:crypto';

// Razorpay gateway boundary. Inactive until the owner sets RAZORPAY_KEY_ID /
// RAZORPAY_KEY_SECRET (and RAZORPAY_WEBHOOK_SECRET for webhooks). Every path fails
// closed when unconfigured; no call can charge anything without real keys.

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function pricePerCreditInr() {
  return Math.max(1, parseInt(process.env.PRICE_PER_CREDIT_INR || '100', 10));
}

// Overridable only in tests so the gateway HTTP call can be mocked.
let createOrderHttp = null;
export function setRazorpayOrderFnForTests(fn) {
  if (process.env.NODE_ENV !== 'test') throw new Error('test override only');
  createOrderHttp = fn;
}

export async function razorpayCreateOrder({ amountInr, receipt }) {
  if (!razorpayConfigured()) {
    const err = new Error('Online payments are not configured on this deployment. Ask the admin to top up your credits.');
    err.status = 501;
    throw err;
  }
  const body = { amount: amountInr * 100, currency: 'INR', receipt };
  if (createOrderHttp) return createOrderHttp(body);
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = new Error(`Payment gateway rejected the order (${resp.status})`);
    err.status = 502;
    throw err;
  }
  return resp.json(); // { id, amount, currency, status, ... }
}

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!razorpayConfigured()) return false;
  const expected = hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = hmac(secret, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
