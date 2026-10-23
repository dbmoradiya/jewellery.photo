import { useState } from 'react';
import AppNav from '../AppNav.jsx';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useAuthConfig } from '../google.jsx';

// Loads Razorpay checkout.js only when the backend reports payments enabled.
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment gateway'));
    document.head.appendChild(s);
  });
}

function TopUp({ onDone }) {
  const [credits, setCredits] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const buy = async () => {
    setError(''); setBusy(true);
    try {
      const order = await api('/payments/topup', { method: 'POST', body: { credits: Number(credits) } });
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountInr * 100,
        currency: 'INR',
        order_id: order.orderId,
        name: 'Jewellery.photo',
        description: `${order.credits} studio credits`,
        handler: async (resp) => {
          try {
            await api('/payments/verify', {
              method: 'POST',
              body: { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature },
            });
            onDone();
          } catch (e) { setError(e.message); }
        },
      });
      rzp.open();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ marginTop: 18 }}>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Credits to buy</label>
        <input type="number" min="1" max="1000" value={credits} onChange={(e) => setCredits(e.target.value)} />
      </div>
      {error && <div className="form-error">{error}</div>}
      <button className="btn" onClick={buy} disabled={busy}>{busy ? 'Starting checkout…' : 'Buy credits'}</button>
    </div>
  );
}

export default function Account() {
  const { user, refresh } = useAuth();
  const cfg = useAuthConfig();
  return (
    <div className="shell">
      <AppNav />
      <div className="page">
        <div className="page__head">
          <div className="eyebrow eyebrow--ink">Your Account</div>
          <h1>{user?.name || 'Account'}.</h1>
        </div>
        <div className="panel" style={{ maxWidth: 620 }}>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr><th>Email</th><td>{user?.email}</td></tr>
                <tr><th>Name</th><td>{user?.name || '—'}</td></tr>
                <tr><th>Phone</th><td>{user?.phone || '—'}</td></tr>
                <tr><th>Role</th><td>{user?.role === 'ADMIN' ? 'Administrator' : 'Member'}</td></tr>
                <tr><th>Credits</th><td><b>{user?.credits}</b> remaining</td></tr>
                <tr><th>Member since</th><td>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td></tr>
              </tbody>
            </table>
          </div>
          {cfg.paymentsEnabled ? (
            <TopUp onDone={refresh} />
          ) : (
            <p className="panel__hint" style={{ marginTop: 18, marginBottom: 0 }}>
              Need more credits? Ask the studio admin to top up your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
