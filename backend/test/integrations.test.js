// Boundary tests for the config-gated integrations. Run: NODE_ENV=test node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

const { setGoogleVerifierForTests } = await import('../src/services/googleAuth.js');
const { paymentsStatus, createTopUpOrder } = await import('../src/services/payments.js');

test('google verifier boundary: payload comes only from the verifier', async () => {
  setGoogleVerifierForTests(async (cred) => {
    if (cred === 'good') return { sub: 'g-123', email: 'Buyer@Gmail.com', email_verified: true, name: 'Buyer' };
    throw new Error('bad token');
  });
  const { verifyGoogleCredential, googleConfigured } = await import('../src/services/googleAuth.js');
  assert.equal(googleConfigured(), true);
  const ok = await verifyGoogleCredential('good');
  assert.equal(ok.sub, 'g-123');
  await assert.rejects(() => verifyGoogleCredential('forged'));
});

test('google unverified email payload is rejectable shape', async () => {
  setGoogleVerifierForTests(async () => ({ sub: 'g-9', email: 'x@x.com', email_verified: false }));
  const { verifyGoogleCredential } = await import('../src/services/googleAuth.js');
  const p = await verifyGoogleCredential('whatever');
  assert.notEqual(p.email_verified, true); // route rejects this
});

test('payments boundary: disabled without credentials, never charges', async () => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  assert.deepEqual(paymentsStatus(), { enabled: false, provider: 'none' });
  await assert.rejects(() => createTopUpOrder(), /not configured/);
});
