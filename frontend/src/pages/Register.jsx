import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { GoogleButton } from '../google.jsx';
import authImg from '../assets/auth.jpg';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form);
      nav('/studio');
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="auth__visual">
        <img src={authImg} alt="Gold rings on a hand" />
        <div className="auth__visual-quote">"Your first photos are free."</div>
      </div>
      <div className="auth__panel">
        <Link to="/" className="nav__brand" style={{ color: 'var(--ink)' }}>Jewellery<span>.photo</span></Link>
        <h1>Create account.</h1>
        <p className="auth__sub">Start with free credits — no card needed.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Your name</label>
            <input value={form.name} onChange={set('name')} autoComplete="name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <GoogleButton onCredential={async (cred) => { await loginWithGoogle(cred); nav('/studio'); }} onError={setError} />
        <div className="auth__switch">Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
