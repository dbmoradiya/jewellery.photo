import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';

export default function AppNav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="nav">
      <Link to="/" className="nav__brand">Jewellery<span>.photo</span></Link>
      <div className="nav__links">
        {user && <span className="credits-pill"><b>{user.credits}</b> credits</span>}
        <Link to="/studio">Studio</Link>
        <Link to="/photos">My photos</Link>
        {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
        <Link to="/account">Account</Link>
        <button className="navlink" onClick={() => { logout(); nav('/'); }}>Sign out</button>
      </div>
    </nav>
  );
}
