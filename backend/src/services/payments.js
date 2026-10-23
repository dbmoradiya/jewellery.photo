// Payment provider boundary. No gateway is active in this build: credit top-ups are
// granted by an admin. A gateway (e.g. Razorpay) activates only when the owner sets
// its credentials; until then every payment attempt fails closed and nothing charges.
export function paymentsStatus() {
  const configured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return { enabled: configured, provider: configured ? 'razorpay' : 'none' };
}

export async function createTopUpOrder() {
  const { enabled } = paymentsStatus();
  if (!enabled) {
    const err = new Error('Online payments are not configured on this deployment. Ask the admin to top up your credits.');
    err.status = 501;
    throw err;
  }
  const err = new Error('Payment provider integration is not implemented yet');
  err.status = 501;
  throw err;
}
