import { OAuth2Client } from 'google-auth-library';

let client = null;
let testVerifier = null;

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

export async function verifyGoogleCredential(credential) {
  if (process.env.NODE_ENV === 'test' && testVerifier) return testVerifier(credential);
  if (!googleConfigured()) return null;
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
}

// Test hook: only active under NODE_ENV=test, never in a running deployment.
export function setGoogleVerifierForTests(fn) {
  if (process.env.NODE_ENV !== 'test') throw new Error('test override only');
  testVerifier = fn;
}
