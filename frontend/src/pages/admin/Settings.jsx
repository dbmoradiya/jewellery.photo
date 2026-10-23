import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Settings() {
  const [cfg, setCfg] = useState(null);
  const [provider, setProvider] = useState('mock');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    api('/admin/settings').then((d) => {
      setCfg(d); setProvider(d.provider); setModel(d.model || '');
    }).catch((e) => setError(e.message));
  }, []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const body = { provider, model };
      if (apiKey) body.apiKey = apiKey;
      const d = await api('/admin/settings', { method: 'PUT', body });
      setCfg(d); setApiKey(''); flash('Settings saved');
    } catch (err) { setError(err.message); }
  };

  if (!cfg) return <div><h1>Settings</h1><div className="spinner" /></div>;

  return (
    <div>
      <h1>Settings</h1>
      <form className="panel" style={{ maxWidth: 640 }} onSubmit={save}>
        <h2>AI generation provider</h2>
        <p className="panel__hint">
          Demo mode produces a clearly labelled mock preview (no cost). Switch to a real provider
          once you have an API key — every generation then uses the live AI model.
        </p>
        {cfg.envOverride && <p className="chip chip--demo">Provider is pinned by server environment variable — changes here have no effect</p>}
        <div className="field" style={{ marginTop: 16 }}>
          <label>Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="mock">Demo (mock, labelled, free)</option>
            <option value="gemini">Google Gemini (image generation)</option>
          </select>
        </div>
        <div className="field">
          <label>Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gemini-2.0-flash-preview-image-generation" />
        </div>
        <div className="field">
          <label>API key {cfg.apiKeySet ? '— saved (stored on the server, never shown)' : '— not set'}</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.apiKeySet ? 'Enter a new key to replace' : 'Paste the provider key'} autoComplete="off" />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn--sm btn--gold">Save settings</button>
      </form>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
