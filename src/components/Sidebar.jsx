import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';
import SideLegal from './SideLegal';
import { isFavorite, toggleFavorite } from '../utils/favorites';

export default function Sidebar({ collapsed, onToggleSidebar, mobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const { openModal: openCreateCommunity } = useCreateCommunityModal();
  const [communities, setCommunities] = useState([]);
  const [recent, setRecent] = useState([]);
  const [open, setOpen] = useState({ recent: true, communities: true, resources: true });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onChange = () => forceUpdate((n) => n + 1);
    window.addEventListener('favorites-changed', onChange);
    return () => window.removeEventListener('favorites-changed', onChange);
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/categories/mine/subscribed').then(({ data }) => setCommunities(data)).catch(() => setCommunities([]));
    } else {
      api.get('/categories').then(({ data }) => setCommunities((data || []).slice(0, 6))).catch(() => setCommunities([]));
    }

    let storedRecent = [];
    try {
      storedRecent = JSON.parse(localStorage.getItem('recentCommunities') || '[]');
    } catch {
      storedRecent = [];
    }
    if (storedRecent.length === 0) {
      setRecent([]);
      return;
    }
    // Validate against the live backend list — communities can be deleted (e.g. DB reset)
    // while the name lingers in localStorage, which would otherwise show dead links forever.
    api.get('/categories').then(({ data }) => {
      const liveNames = new Set((data || []).map((c) => c.name));
      const stillValid = storedRecent.filter((n) => liveNames.has(n));
      setRecent(stillValid);
      if (stillValid.length !== storedRecent.length) {
        localStorage.setItem('recentCommunities', JSON.stringify(stillValid));
      }
    }).catch(() => {
      // If validation fails (offline, etc.), fall back to showing what we have rather than hiding it.
      setRecent(storedRecent);
    });
  }, [user]);

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  if (collapsed && !mobileOpen) {
    return (
      <aside className="side-nav side-nav-collapsed">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Розгорнути меню">☰</button>
      </aside>
    );
  }

  return (
    <aside className={`side-nav ${mobileOpen ? 'side-nav-mobile-open' : ''}`}>
      <div className="side-nav-top">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Згорнути меню">☰</button>
      </div>
      <div className="side-nav-scroll" onClick={(e) => { if (mobileOpen && e.target.closest('a,button.side-link')) onCloseMobile?.(); }}>
        <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span className="side-icon">🏠</span> Головна
        </NavLink>
        <NavLink to="/popular" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span className="side-icon">🔥</span> Популярне
        </NavLink>
        <NavLink to="/news" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span className="side-icon">📰</span> Новини
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span className="side-icon">🧭</span> Огляд
        </NavLink>
        {user && (
          <NavLink to="/drafts" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <span className="side-icon">📝</span> Чернетки
          </NavLink>
        )}
        <button type="button" className="side-link full-width" onClick={openCreateCommunity}>
          <span className="side-icon">＋</span> Створити спільноту
        </button>

        {recent.length > 0 && (
          <div className="side-section">
            <button className="side-section-header" onClick={() => toggle('recent')}>
              <span>НЕЩОДАВНІ</span>
              <span className={`chevron ${open.recent ? 'open' : ''}`}>˅</span>
            </button>
            {open.recent && (
              <div className="side-section-body">
                {recent.map((r) => (
                  <NavLink key={r} to={`/r/${encodeURIComponent(r)}`} className="side-link">
                    <span className="sub-icon">{r[0]?.toUpperCase()}</span> r/{r}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="side-section">
          <button className="side-section-header" onClick={() => toggle('communities')}>
            <span>{user ? 'СПІЛЬНОТИ' : 'ПОПУЛЯРНІ СПІЛЬНОТИ'}</span>
            <span className={`chevron ${open.communities ? 'open' : ''}`}>˅</span>
          </button>
          {open.communities && (
            <div className="side-section-body">
              {user && (
                <NavLink to="/communities/manage" className="side-link">
                  <span className="side-icon">⚙</span> Керувати спільнотами
                </NavLink>
              )}
              {communities.map((c) => (
                <NavLink key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="side-link">
                  <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
                  r/{(c.name.length>20)?c.name.slice(0,20)+'...':c.name}
                  {user && (
                    <button
                      type="button"
                      className={`star-icon ${isFavorite(c._id) ? 'star-active' : ''}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(c._id); }}
                      title={isFavorite(c._id) ? 'Прибрати з обраного' : 'Додати в обране'}
                    >
                      {isFavorite(c._id) ? '★' : '☆'}
                    </button>
                  )}
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
          {/* {open.resources && (
            <div className="side-section-body">
              <span className="side-link static">Про Breddit</span>
              <span className="side-link static">Реклама</span>
              <span className="side-link static">Платформа розробника</span>
              <span className="side-link static">Breddit Pro <em className="beta-tag">BETA</em></span>
              <span className="side-link static">Довідка</span>
              <span className="side-link static">Блог</span>
              <span className="side-link static">Кар'єра</span>
              <span className="side-link static">Преса</span>
            </div>
          )} */}
          {open.resources && (
            <div className="side-section-body">
              <span className="side-link static">Про Breddit</span>
              <span className="side-link static">Правила Breddit</span>
              <span className="side-link static">Політика конфіденційності</span>
              <span className="side-link static">Угода користувача</span>
              <span className="side-link static">Доступність <em className="beta-tag">BETA</em></span>
            </div>
          )}
        </div>

        <SideLegal />
      </div>
    </aside>
  );
}