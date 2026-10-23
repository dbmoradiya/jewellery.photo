import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Generations() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api('/admin/generations').then((d) => setItems(d.generations)).catch((e) => setError(e.message)); }, []);

  return (
    <div>
      <h1>Generations</h1>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Member</th><th>Type</th><th>Style</th><th>Provider</th><th>Status</th><th>Output</th></tr></thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(g.createdAt).toLocaleString()}</td>
                <td>{g.user}</td>
                <td>{g.type}</td>
                <td>{g.style}</td>
                <td>{g.demo ? <span className="chip chip--demo">demo</span> : g.provider}</td>
                <td>
                  {g.status === 'COMPLETED' && <span className="chip chip--ok">Ready</span>}
                  {g.status === 'FAILED' && <span className="chip chip--fail" title={g.error || ''}>Failed</span>}
                  {(g.status === 'PENDING' || g.status === 'PROCESSING') && <span className="chip chip--wait">{g.status.toLowerCase()}</span>}
                </td>
                <td>{g.outputUrl ? <a className="mini-btn" href={g.outputUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
