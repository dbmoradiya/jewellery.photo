import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Types() {
  const [types, setTypes] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => api('/admin/types').then((d) => setTypes(d.types)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const add = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/admin/types', { method: 'POST', body: { name } }); setName(''); load(); flash('Type added'); }
    catch (err) { setError(err.message); }
  };
  const toggle = async (t) => { await api(`/admin/types/${t.id}`, { method: 'PATCH', body: { active: !t.active } }); load(); };
  const remove = async (t) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try { await api(`/admin/types/${t.id}`, { method: 'DELETE' }); load(); flash('Type deleted'); }
    catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Jewellery Types</h1>
      <form className="admin-toolbar" onSubmit={add}>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          <input className="mini-input" style={{ width: 260, padding: '11px 14px' }} placeholder="New type name, e.g. Nose Pin" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="btn btn--sm">Add type</button>
        </div>
      </form>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td style={{ color: 'rgba(20,17,16,.45)' }}>{t.slug}</td>
                <td>{t.active ? <span className="chip chip--ok">Active</span> : <span className="chip chip--wait">Hidden</span>}</td>
                <td className="admin-actions">
                  <button className="mini-btn" onClick={() => toggle(t)}>{t.active ? 'Hide' : 'Show'}</button>
                  <button className="mini-btn mini-btn--danger" onClick={() => remove(t)}>Delete</button>
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
