import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    if (user) {
      api.get('/categories/mine/subscribed').then(({ data }) => setCommunities(data)).catch(() => setCommunities([]));
    } else {
      api.get('/categories').then(({ data }) => setCommunities((data || []).slice(0, 5))).catch(() => setCommunities([]));
    }
  }, [user]);

  return (
    <div className="side-nav pe-2">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>🏠 Головна</NavLink>
      <NavLink to="/?tab=popular">🔥 Популярне</NavLink>
      <NavLink to="/?tab=all">🌐 Все</NavLink>
      <div className="eyebrow">{user ? 'Твої спільноти' : 'Популярні спільноти'}</div>
      {communities.map((c) => (
        <NavLink key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="d-flex align-items-center gap-2">
          <span className="sub-icon" style={{ width: 20, height: 20, fontSize: 10 }}>{c.name[0]?.toUpperCase()}</span>
          r/{c.name}
        </NavLink>
      ))}
      <NavLink to="/r/new">＋ Створити спільноту</NavLink>
    </div>
  );
}
