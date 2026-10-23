import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../AppNav.jsx';
import { api } from '../api.js';

function Chip({ g }) {
  if (g.status === 'COMPLETED') return <span className="chip chip--ok">Ready</span>;
  if (g.status === 'FAILED') return <span className="chip chip--fail">Failed</span>;
  return <span className="chip chip--wait">{g.status.toLowerCase()}</span>;
}

export default function Photos() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/generations').then((d) => setItems(d.generations)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="shell">
      <AppNav />
      <div className="page">
        <div className="page__head">
          <div className="eyebrow eyebrow--ink">Your Collection</div>
          <h1>My photos.</h1>
        </div>
        {loading && <div className="spinner" />}
        {error && <div className="form-error">{error}</div>}
        {!loading && !items.length && (
          <div className="empty-state">
            <h2>No photographs yet.</h2>
            <p>Create your first styled photo in the studio.</p>
            <Link className="btn btn--gold" style={{ marginTop: 20 }} to="/studio">Open the studio</Link>
          </div>
        )}
        <div className="photo-grid">
          {items.map((g) => (
            <div className="photo-card" key={g.id}>
              <div className="photo-card__img">
                {g.outputUrl ? <img src={g.outputUrl} alt={`${g.style?.name} ${g.type?.name}`} /> : <img src={g.inputUrl} alt="Uploaded piece" style={{ opacity: .5 }} />}
              </div>
              <div className="photo-card__body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span className="photo-card__title">{g.style?.name}</span>
                  <Chip g={g} />
                </div>
                <div className="photo-card__meta">
                  {g.type?.name} · {new Date(g.createdAt).toLocaleString()} {g.demo && g.status === 'COMPLETED' ? '· demo' : ''}
                </div>
                {g.status === 'COMPLETED' && (
                  <a className="btn btn--sm btn--ghost-ink" href={g.outputUrl} download={`jewellery-${g.id}.jpg`}>Download</a>
                )}
                {g.status === 'FAILED' && <div className="form-error" style={{ margin: 0 }}>{g.error}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
