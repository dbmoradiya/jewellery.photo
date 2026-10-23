import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [amounts, setAmounts] = useState({});

  const load = () => api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const patch = async (id, body, msg) => {
    setError('');
    try { await api(`/admin/users/${id}`, { method: 'PATCH', body }); load(); flash(msg); }
    catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Users</h1>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Member</th><th>Phone</th><th>Role</th><th>Credits</th><th>Photos</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div>{u.name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(20,17,16,.5)' }}>{u.email}</div>
                </td>
                <td>{u.phone || '—'}</td>
                <td>{u.role === 'ADMIN' ? <span className="chip chip--demo">Admin</span> : 'Member'}</td>
                <td><b>{u.credits}</b></td>
                <td>{u._count?.generations ?? 0}</td>
                <td>{u.disabled ? <span className="chip chip--fail">Disabled</span> : <span className="chip chip--ok">Active</span>}</td>
                <td className="admin-actions">
                  <input
                    className="mini-input" type="number" min="1" placeholder="+5"
                    value={amounts[u.id] || ''}
                    onChange={(e) => setAmounts({ ...amounts, [u.id]: e.target.value })}
                  />
                  <button className="mini-btn" onClick={() => patch(u.id, { addCredits: parseInt(amounts[u.id]) || 0 }, 'Credits added')}>Add credits</button>
                  {u.role !== 'ADMIN' && <button className="mini-btn" onClick={() => patch(u.id, { role: 'ADMIN' }, 'Made admin')}>Make admin</button>}
                  {u.id !== me?.id && (
                    <button className="mini-btn mini-btn--danger" onClick={() => patch(u.id, { disabled: !u.disabled }, u.disabled ? 'Account enabled' : 'Account disabled')}>
                      {u.disabled ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
