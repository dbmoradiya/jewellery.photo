import AppNav from '../AppNav.jsx';
import { useAuth } from '../auth.jsx';

export default function Account() {
  const { user } = useAuth();
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
          <p className="panel__hint" style={{ marginTop: 18, marginBottom: 0 }}>
            Need more credits? Ask the studio admin to top up your account.
          </p>
        </div>
      </div>
    </div>
  );
}
