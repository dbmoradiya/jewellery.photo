import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import authImg from '../assets/auth.jpg';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const user = await login(email, password);
      nav(loc.state?.from || (user.role === 'ADMIN' ? '/admin' : '/studio'));
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="auth__visual">
        <img src={authImg} alt="Gold rings on a hand" />
        <div className="auth__visual-quote">"Every piece deserves its portrait."</div>
      </div>
      <div className="auth__panel">
        <Link to="/" className="nav__brand" style={{ color: 'var(--ink)' }}>Jewellery<span>.photo</span></Link>
        <h1>Sign in.</h1>
        <p className="auth__sub">Welcome back to the studio.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="auth__switch">New to Jewellery.photo? <Link to="/register">Create an account</Link></div>
      </div>
    </div>
  );
}
