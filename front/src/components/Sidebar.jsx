import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [open, setOpen] = useState({ communities: true, resources: true });

  useEffect(() => {
    if (user) {
      api.get('/categories/mine/subscribed').then(({ data }) => setCommunities(data)).catch(() => setCommunities([]));
    } else {
      api.get('/categories').then(({ data }) => setCommunities((data || []).slice(0, 6))).catch(() => setCommunities([]));
    }
  }, [user]);

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <aside className="side-nav">
      <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
        <span className="side-icon">🏠</span> Головна
      </NavLink>
      <NavLink to="/?tab=popular" className="side-link">
        <span className="side-icon">🔥</span> Популярне
      </NavLink>
      <NavLink to="/?tab=all" className="side-link">
        <span className="side-icon">🌐</span> Все
      </NavLink>
      <NavLink to="/r/new" className="side-link">
        <span className="side-icon">＋</span> Створити спільноту
      </NavLink>

      <div className="side-section">
        <button className="side-section-header" onClick={() => toggle('communities')}>
          <span>{user ? 'СПІЛЬНОТИ' : 'ПОПУЛЯРНІ СПІЛЬНОТИ'}</span>
          <span className={`chevron ${open.communities ? 'open' : ''}`}>˅</span>
        </button>
        {open.communities && (
          <div className="side-section-body">
            {communities.map((c) => (
              <NavLink key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="side-link">
                <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
                r/{c.name}
              </NavLink>
            ))}
            {communities.length === 0 && <p className="side-empty">Немає спільнот</p>}
          </div>
        )}
      </div>

      <div className="side-section">
        <button className="side-section-header" onClick={() => toggle('resources')}>
          <span>РЕСУРСИ</span>
          <span className={`chevron ${open.resources ? 'open' : ''}`}>˅</span>
        </button>
        {open.resources && (
          <div className="side-section-body">
            <span className="side-link static">Про Breddit</span>
            <span className="side-link static">Реклама</span>
            <span className="side-link static">Правила</span>
            <span className="side-link static">Політика конфіденційності</span>
          </div>
        )}
      </div>
    </aside>
  );
}