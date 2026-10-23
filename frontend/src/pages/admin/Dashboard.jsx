import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api('/admin/stats').then(setStats).catch(() => {}); }, []);
  const cards = [
    ['Members', stats?.users], ['Generations', stats?.generations],
    ['Completed', stats?.completed], ['Failed', stats?.failed],
    ['Jewellery types', stats?.types], ['Styles', stats?.styles],
  ];
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-row">
        {cards.map(([label, num]) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__num">{num ?? '—'}</div>
            <div className="stat-card__label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
