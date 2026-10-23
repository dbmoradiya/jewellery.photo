import { useEffect, useRef, useState } from 'react';
import AppNav from '../AppNav.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Studio() {
  const { user, refresh } = useAuth();
  const [types, setTypes] = useState([]);
  const [styles, setStyles] = useState([]);
  const [provider, setProvider] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [typeId, setTypeId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(null); // active generation
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    Promise.all([api('/catalog/types'), api('/catalog/styles'), api('/generations/provider-status')])
      .then(([t, s, p]) => { setTypes(t.types); setStyles(s.styles); setProvider(p); })
      .catch((e) => setError(e.message));
    return () => clearInterval(pollRef.current);
  }, []);

  const pickFile = (f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setError('Only JPG, PNG or WebP photos are allowed'); return; }
    if (f.size > 15 * 1024 * 1024) { setError('Photo must be under 15MB'); return; }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const poll = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { generation } = await api(`/generations/${id}`);
        setCurrent(generation);
        if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
          clearInterval(pollRef.current);
          setBusy(false);
          refresh(); // credit balance changed on success
        }
      } catch { /* keep polling */ }
    }, 1500);
  };

  const generate = async () => {
    setError('');
    if (!file) return setError('Upload a photo of your piece first');
    if (!typeId) return setError('Choose a jewellery type');
    if (!styleId) return setError('Choose a style');
    setBusy(true); setCurrent(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('typeId', typeId);
      fd.append('styleId', styleId);
      const { generation } = await api('/generations', { method: 'POST', formData: fd });
      setCurrent(generation);
      poll(generation.id);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const reset = () => { setCurrent(null); setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className="shell">
      <AppNav />
      <div className="page">
        <div className="page__head">
          <div className="eyebrow eyebrow--ink">The Studio</div>
          <h1>Create a photograph.</h1>
        </div>
        {provider?.demo && (
          <div style={{ marginBottom: 22 }}>
            <span className="chip chip--demo">Demo mode — output is a styled mock preview until a paid AI provider is connected in Admin → Settings</span>
          </div>
        )}
        <div className="studio">
          <div>
            <div className="panel">
              <div className="step-label">Step 1 — Your piece</div>
              <div
                className={`dropzone ${preview ? 'dropzone--active' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              >
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                {preview ? (
                  <>
                    <img className="preview" src={preview} alt="Uploaded piece" />
                    <div className="dropzone__sub" style={{ marginTop: 12 }}>{file?.name} — click to replace</div>
                  </>
                ) : (
                  <>
                    <div className="dropzone__title">Drop your photo here</div>
                    <div className="dropzone__sub">or click to browse — JPG, PNG or WebP, up to 15MB</div>
                  </>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="step-label">Step 2 — Jewellery type</div>
              <div className="pill-row">
                {types.map((t) => (
                  <button key={t.id} className={`pill ${typeId === t.id ? 'pill--active' : ''}`} onClick={() => setTypeId(t.id)}>{t.name}</button>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="step-label">Step 3 — Style</div>
              <div className="pick-grid">
                {styles.map((s) => (
                  <button key={s.id} className={`pick-card ${styleId === s.id ? 'pick-card--active' : ''}`} onClick={() => setStyleId(s.id)}>
                    <div className="pick-card__img">
                      {s.previewUrl ? <img src={s.previewUrl} alt={s.name} /> : <span>{s.name.charAt(0)}</span>}
                    </div>
                    <div className="pick-card__name">{s.name}</div>
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="form-error" style={{ marginTop: 16 }}>{error}</div>}
            <div style={{ marginTop: 22, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn--gold" onClick={generate} disabled={busy}>
                {busy ? 'Creating…' : `Generate · 1 credit`}
              </button>
              <span className="hero__note" style={{ color: 'rgba(20,17,16,.5)' }}>{user?.credits ?? 0} credits remaining</span>
            </div>
          </div>
          <div>
            <div className="panel" style={{ position: 'sticky', top: 100 }}>
              <h2>Result</h2>
              <p className="panel__hint">Your styled photograph appears here.</p>
              {!current && !busy && (
                <div className="empty-state" style={{ padding: '50px 20px' }}>
                  <p>Nothing yet — upload a photo, pick a type and style, then generate.</p>
                </div>
              )}
              {busy && (!current || current.status === 'PENDING' || current.status === 'PROCESSING') && (
                <div className="processing">
                  <div className="spinner" />
                  <p>Styling your piece… this takes a few seconds.</p>
                </div>
              )}
              {current?.status === 'COMPLETED' && (
                <>
                  <div className="result-frame"><img src={current.outputUrl} alt="Styled result" /></div>
                  <div className="result-meta">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="chip chip--ok">Ready</span>
                      {current.demo && <span className="chip chip--demo">Demo preview</span>}
                      <span className="chip">{current.style?.name}</span>
                    </div>
                    <div className="admin-actions">
                      <a className="btn btn--sm" href={current.outputUrl} download={`jewellery-${current.id}.jpg`}>Download</a>
                      <button className="btn btn--sm btn--ghost-ink" onClick={reset}>New photo</button>
                    </div>
                  </div>
                </>
              )}
              {current?.status === 'FAILED' && (
                <>
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span className="chip chip--fail">Failed</span>
                    <p style={{ marginTop: 14 }}>{current.error || 'Generation failed. No credit was spent.'}</p>
                  </div>
                  <button className="btn btn--sm btn--ghost-ink" style={{ marginTop: 14 }} onClick={reset}>Try again</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
