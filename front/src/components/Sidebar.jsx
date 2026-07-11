import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';

export default function Sidebar({ collapsed, onToggleSidebar }) {
  const { user } = useAuth();
  const { openModal: openCreateCommunity } = useCreateCommunityModal();
  const [communities, setCommunities] = useState([]);
  const [modCommunities, setModCommunities] = useState([]);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [recent, setRecent] = useState([]);
  const [open, setOpen] = useState({ moderation: true, custom: true, recent: true, communities: true, resources: true });

  useEffect(() => {
    if (user) {
      api.get('/categories/mine/subscribed').then(({ data }) => setCommunities(data)).catch(() => setCommunities([]));
      api.get('/categories/mine/moderated').then(({ data }) => setModCommunities(data)).catch(() => setModCommunities([]));
      api.get('/feeds/mine').then(({ data }) => setCustomFeeds(data)).catch(() => setCustomFeeds([]));
    } else {
      api.get('/categories').then(({ data }) => setCommunities((data || []).slice(0, 6))).catch(() => setCommunities([]));
    }
    try {
      setRecent(JSON.parse(localStorage.getItem('recentCommunities') || '[]'));
    } catch {
      setRecent([]);
    }
  }, [user]);

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  if (collapsed) {
    return (
      <aside className="side-nav side-nav-collapsed">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Розгорнути меню">☰</button>
      </aside>
    );
  }

  return (
    <aside className="side-nav">
      <div className="side-nav-top">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Згорнути меню">☰</button>
      </div>
      <div className="side-nav-scroll">
        <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span className="side-icon">🏠</span> Головна
        </NavLink>
        <NavLink to="/?tab=popular" className="side-link">
          <span className="side-icon">🔥</span> Популярне
        </NavLink>
        <NavLink to="/?tab=news" className="side-link">
          <span className="side-icon">📰</span> Новини
        </NavLink>
        <NavLink to="/explore" className="side-link">
          <span className="side-icon">🧭</span> Огляд
        </NavLink>
        <button type="button" className="side-link full-width" onClick={openCreateCommunity}>
          <span className="side-icon">＋</span> Створити спільноту
        </button>

        {modCommunities.length > 0 && (
          <div className="side-section">
            <button className="side-section-header" onClick={() => toggle('moderation')}>
              <span>МОДЕРАЦІЯ</span>
              <span className={`chevron ${open.moderation ? 'open' : ''}`}>˅</span>
            </button>
            {open.moderation && (
              <div className="side-section-body">
                <NavLink to="/mod/queue" className="side-link">
                  <span className="side-icon">📋</span> Черга модерації
                </NavLink>
                <NavLink to="/mod/mail" className="side-link">
                  <span className="side-icon">✉</span> Пошта модераторів
                </NavLink>
                <NavLink to="/mod" className="side-link">
                  <span className="side-icon">🛠</span> r/Mod
                </NavLink>
                <NavLink to="/mod/manage" className="side-link">
                  <span className="side-icon">⚙</span> Керувати
                </NavLink>
                {modCommunities.map((c) => (
                  <NavLink key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="side-link">
                    <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
                    r/{c.name}
                    <span className="star-icon">☆</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="side-section">
          <button className="side-section-header" onClick={() => toggle('custom')}>
            <span>СПЕЦІАЛЬНІ СТРІЧКИ</span>
            <span className={`chevron ${open.custom ? 'open' : ''}`}>˅</span>
          </button>
          {open.custom && (
            <div className="side-section-body">
              <NavLink to="/feeds/new" className="side-link">
                <span className="side-icon">＋</span> Створити стрічку
              </NavLink>
              {customFeeds.map((f) => (
                <NavLink key={f._id} to={`/feed/${encodeURIComponent(f.name)}`} className="side-link">
                  <span className="sub-icon feed-icon">{f.name[0]?.toUpperCase()}</span>
                  {f.name}
                  <span className="star-icon">☆</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

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
                  r/{c.name}
                  {user && <span className="star-icon">☆</span>}
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
              <span className="side-link static">Платформа розробника</span>
              <span className="side-link static">Breddit Pro <em className="beta-tag">BETA</em></span>
              <span className="side-link static">Довідка</span>
              <span className="side-link static">Блог</span>
              <span className="side-link static">Кар'єра</span>
              <span className="side-link static">Преса</span>
            </div>
          )}
        </div>

        <div className="side-legal">
          <span>Правила Breddit</span>
          <span>Політика конфіденційності</span>
          <span>Угода користувача</span>
          <span>Доступність</span>
          <p>Breddit, Inc. © 2026. Усі права захищено.</p>
        </div>
      </div>
    </aside>
  );
}