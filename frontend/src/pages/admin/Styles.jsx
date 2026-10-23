import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';

const EMPTY = { name: '', promptTemplate: '', sort: 0 };

export default function Styles() {
  const [styles, setStyles] = useState([]);
  const [editing, setEditing] = useState(null); // {id?} or null
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  const load = () => api('/admin/styles').then((d) => setStyles(d.styles)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const openNew = () => { setForm(EMPTY); setFile(null); setEditing({}); setError(''); };
  const openEdit = (s) => { setForm({ name: s.name, promptTemplate: s.promptTemplate, sort: s.sort }); setFile(null); setEditing(s); setError(''); };

  const save = async (e) => {
    e.preventDefault(); setError('');
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('promptTemplate', form.promptTemplate);
    fd.append('sort', String(form.sort || 0));
    if (file) fd.append('preview', file);
    try {
      if (editing.id) await api(`/admin/styles/${editing.id}`, { method: 'PATCH', formData: fd });
      else await api('/admin/styles', { method: 'POST', formData: fd });
      setEditing(null); load(); flash('Style saved');
    } catch (err) { setError(err.message); }
  };

  const toggle = async (s) => {
    const fd = new FormData(); fd.append('active', String(!s.active));
    await api(`/admin/styles/${s.id}`, { method: 'PATCH', formData: fd }); load();
  };
  const remove = async (s) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try { await api(`/admin/styles/${s.id}`, { method: 'DELETE' }); load(); flash('Style deleted'); }
    catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ margin: 0 }}>Styles &amp; Prompts</h1>
        <button className="btn btn--sm btn--gold" onClick={openNew}>+ New style</button>
      </div>
      {error && !editing && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Preview</th><th>Name</th><th>Prompt template</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {styles.map((s) => (
              <tr key={s.id}>
                <td>{s.previewUrl ? <img className="thumb" src={s.previewUrl} alt={s.name} /> : <div className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--gold-bright)', fontFamily: 'var(--serif)' }}>{s.name.charAt(0)}</div>}</td>
                <td>{s.name}</td>
                <td style={{ maxWidth: 380, color: 'rgba(20,17,16,.6)', fontSize: 13 }}>{s.promptTemplate.slice(0, 110)}{s.promptTemplate.length > 110 ? '…' : ''}</td>
                <td>{s.active ? <span className="chip chip--ok">Active</span> : <span className="chip chip--wait">Hidden</span>}</td>
                <td className="admin-actions">
                  <button className="mini-btn" onClick={() => openEdit(s)}>Edit</button>
                  <button className="mini-btn" onClick={() => toggle(s)}>{s.active ? 'Hide' : 'Show'}</button>
                  <button className="mini-btn mini-btn--danger" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit style' : 'New style'}</h2>
            <form onSubmit={save}>
              <div className="field">
                <label>Style name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Kundan Bridal" />
              </div>
              <div className="field">
                <label>Prompt template — use {'{type}'} where the jewellery type goes</label>
                <textarea className="prompt-area" value={form.promptTemplate} onChange={(e) => setForm({ ...form, promptTemplate: e.target.value })} required placeholder="Professional jewellery catalog photograph of the {type} in the uploaded image, …" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Sort order</label>
                  <input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
                </div>
                <div className="field">
                  <label>Preview image (optional)</label>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal__actions">
                <button type="button" className="btn btn--sm btn--ghost-ink" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn btn--sm btn--gold">Save style</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
