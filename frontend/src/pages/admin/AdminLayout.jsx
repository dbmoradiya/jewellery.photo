import { NavLink, Outlet, Link } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin__side">
        <div>
          <div className="admin__brand">Jewellery<span>.photo</span></div>
          <div className="admin__tag">Admin Studio</div>
        </div>
        <nav className="admin__nav">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/styles">Styles &amp; Prompts</NavLink>
          <NavLink to="/admin/types">Jewellery Types</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/generations">Generations</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <Link to="/" className="mini-btn" style={{ color: 'rgba(247,242,233,.6)', borderColor: 'var(--line-dark)', display: 'inline-block' }}>← View site</Link>
        </div>
      </aside>
      <main className="admin__main"><Outlet /></main>
    </div>
  );
}
