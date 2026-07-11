import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function PopularCommunities() {
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/categories').then(({ data }) => {
      if (!cancelled) setCommunities((data || []).slice(0, 5));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (communities.length === 0) return null;

  return (
    <div className="side-card right-widget">
      <h3>ПОПУЛЯРНІ СПІЛЬНОТИ</h3>
      <div className="widget-list">
        {communities.map((c) => (
          <Link key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="widget-row">
            <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
            <div className="widget-row-text">
              <span className="widget-title">r/{c.name}</span>
              <span className="widget-sub">{(c.subscriberCount ?? 0).toLocaleString('uk-UA')} учасників</span>
            </div>
          </Link>
        ))}
      </div>
      <button className="widget-more">Переглянути більше</button>
    </div>
  );
}