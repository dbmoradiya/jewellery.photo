// Integration boundary tests with a mocked Google identity verifier and a mocked
// Razorpay order endpoint. No real external calls, no real money. Run:
//   NODE_ENV=test node --test test/integrations.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'fake-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'fake-webhook-secret';

const { setGoogleVerifierForTests } = await import('../src/services/googleAuth.js');
const { setRazorpayOrderFnForTests, setRazorpayFetchFnForTests } = await import('../src/services/razorpay.js');
const { app } = await import('../src/index.js');

const srv = app.listen(0);
await new Promise((r) => srv.once('listening', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const J = { 'Content-Type': 'application/json' };
const uniq = Date.now();

test.after(() => srv.close());

async function api(path, { method = 'GET', body, token, raw } = {}) {
  const resp = await fetch(base + path, {
    method,
    headers: { ...(raw ? {} : J), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: resp.status, data: await resp.json().catch(() => null) };
}

test('google sign-in: verifier boundary and new-account creation', async () => {
  setGoogleVerifierForTests(async (cred) => {
    if (cred === 'good-new') return { sub: `g-new-${uniq}`, email: `g${uniq}@gmail.com`, email_verified: true, name: 'G' };
    throw new Error('bad token');
  });
  const forged = await api('/api/auth/google', { method: 'POST', body: { credential: 'forged' } });
  assert.equal(forged.status, 401);
  const ok = await api('/api/auth/google', { method: 'POST', body: { credential: 'good-new' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.credits, 2);
});

test('google account-linking policy: no silent merge into password accounts', async () => {
  const email = `link${uniq}@test.com`;
  const reg2 = await api('/api/auth/register', { method: 'POST', body: { email, password: 'test1234', name: 'L' } });
  setGoogleVerifierForTests(async () => ({ sub: `g-link-${uniq}`, email, email_verified: true }));
  // Silent merge must be refused:
  const attempt = await api('/api/auth/google', { method: 'POST', body: { credential: 'any' } });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.data.code, 'LINK_REQUIRED');
  // Explicit link after password login works:
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: 'test1234' } });
  const link = await api('/api/auth/google/link', { method: 'POST', body: { credential: 'any' }, token: login.data.token });
  assert.equal(link.status, 200);
  // Google sign-in now resolves the same account:
  const again = await api('/api/auth/google', { method: 'POST', body: { credential: 'any' } });
  assert.equal(again.status, 200);
  assert.equal(again.data.user.email, email);
  // Linking a Google account whose email differs is refused:
  setGoogleVerifierForTests(async () => ({ sub: `g-other-${uniq}`, email: 'other@x.com', email_verified: true }));
  const mismatch = await api('/api/auth/google/link', { method: 'POST', body: { credential: 'any' }, token: login.data.token });
  assert.equal(mismatch.status, 400);
});

test('payments: topup order, signature check, idempotent settlement, webhook', async () => {
  const email = `pay${uniq}@test.com`;
  const reg = await api('/api/auth/register', { method: 'POST', body: { email, password: 'test1234', name: 'P' } });
  const token = reg.data.token;
  setRazorpayOrderFnForTests(async ({ amount, currency }) => {
    assert.equal(currency, 'INR');
    return { id: `order_${uniq}`, amount, currency, status: 'created' };
  });
  const topup = await api('/api/payments/topup', { method: 'POST', body: { credits: 3 }, token });
  assert.equal(topup.status, 201);
  assert.equal(topup.data.amountInr, 300);
  const orderId = topup.data.orderId;
  const sig = crypto.createHmac('sha256', 'fake-secret').update(`${orderId}|pay_1`).digest('hex');
  const bad = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: 'deadbeef' }, token });
  assert.equal(bad.status, 400);
  // Gateway-truth checks before settlement:
  setRazorpayFetchFnForTests(async () => ({ id: 'pay_1', order_id: orderId, amount: 29900, currency: 'INR', status: 'captured' }));
  const wrongAmt = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token });
  assert.equal(wrongAmt.status, 400);
  assert.match(wrongAmt.data.error, /amount/);
  setRazorpayFetchFnForTests(async () => ({ id: 'pay_1', order_id: orderId, amount: 30000, currency: 'USD', status: 'captured' }));
  const wrongCur = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token });
  assert.equal(wrongCur.status, 400);
  assert.match(wrongCur.data.error, /currency/);
  setRazorpayFetchFnForTests(async () => ({ id: 'pay_1', order_id: orderId, amount: 30000, currency: 'INR', status: 'authorized' }));
  const notCaptured = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token });
  assert.equal(notCaptured.status, 400);
  assert.match(notCaptured.data.error, /captured/);
  // Order ownership: another member cannot confirm this order.
  const other = await api('/api/auth/register', { method: 'POST', body: { email: `oth${uniq}@test.com`, password: 'test1234', name: 'O' } });
  const notMine = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token: other.data.token });
  assert.equal(notMine.status, 404);
  // Happy path with a captured, matching payment:
  setRazorpayFetchFnForTests(async () => ({ id: 'pay_1', order_id: orderId, amount: 30000, currency: 'INR', status: 'captured' }));
  const v1 = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token });
  assert.equal(v1.status, 200);
  assert.equal(v1.data.credited, true);
  const v2 = await api('/api/payments/verify', { method: 'POST', body: { orderId, paymentId: 'pay_1', signature: sig }, token });
  assert.equal(v2.data.credited, false); // replay does not double-credit
  let me = await api('/api/auth/me', { token });
  assert.equal(me.data.user.credits, 2 + 3);

  // Webhook path: create a second order, settle via signed webhook, replay it.
  setRazorpayOrderFnForTests(async () => ({ id: `order_${uniq}_b`, amount: 10000, currency: 'INR', status: 'created' }));
  const t2 = await api('/api/payments/topup', { method: 'POST', body: { credits: 1 }, token });
  const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_2', order_id: t2.data.orderId, amount: 10000, currency: 'INR' } } } });
  const wsig = crypto.createHmac('sha256', 'fake-webhook-secret').update(raw).digest('hex');
  const w1 = await api('/api/payments/webhook', { method: 'POST', raw, token: null });
  assert.equal(w1.status, 400); // unsigned webhook rejected
  const rawBad = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_2', order_id: t2.data.orderId, amount: 99900, currency: 'INR' } } } });
  const wsigBad = crypto.createHmac('sha256', 'fake-webhook-secret').update(rawBad).digest('hex');
  const wBad = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': wsigBad }, body: rawBad });
  assert.equal(wBad.status, 200); // acknowledged
  let meAfterBad = await api('/api/auth/me', { token });
  assert.equal(meAfterBad.data.user.credits, 2 + 3); // mismatched amount not credited
  const w2 = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': wsig }, body: raw });
  assert.equal(w2.status, 200);
  const w3 = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': wsig }, body: raw });
  assert.equal(w3.status, 200); // replay safe
  me = await api('/api/auth/me', { token });
  assert.equal(me.data.user.credits, 2 + 3 + 1);

  // Ledger invariant: every change recorded, sum == balance.
  const ledger = await api('/api/auth/ledger', { token });
  const sum = ledger.data.transactions.reduce((a, t) => a + t.delta, 0);
  assert.equal(sum, me.data.user.credits);
  assert.ok(ledger.data.transactions.some((t) => t.reason === 'TOPUP_PURCHASE'));
});

test('payments boundary without keys fails closed', async () => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  const s = await api('/api/payments/status');
  assert.deepEqual(s.data, { enabled: false, provider: 'none' });
  const reg = await api('/api/auth/register', { method: 'POST', body: { email: `np${uniq}@test.com`, password: 'test1234', name: 'N' } });
  const t = await api('/api/payments/topup', { method: 'POST', body: { credits: 1 }, token: reg.data.token });
  assert.equal(t.status, 501);
});
