import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import api from '../api/client';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const [q, setQ] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    let cancelled = false;
    const check = () => {
      api.get('/notifications/unread-count')
        .then(({ data }) => { if (!cancelled) setHasUnread((data.count ?? data.unread ?? 0) > 0); })
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Меню">☰</button>
        <Link className="navbar-brand" to="/">
          <span className="brand-icon">r</span>
          <span className="brand-word">reddit</span>
        </Link>
      </div>
      <form className="navbar-search" onSubmit={submitSearch}>
        <span className="search-icon">⌕</span>
        <input
          type="search"
          placeholder="Шукати в Breddit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="ask-pill">✦ Запитати</span>
      </form>
      <div className="navbar-actions">
        {user ? (
          <>
            <Link className="btn btn-outline btn-sm create-btn" to="/r/new">＋ Створити</Link>
            <Link className="icon-btn notif-btn" to="/notifications" title="Сповіщення">
              🔔
              {hasUnread && <span className="notif-badge"><span className="notif-badge-dot" /></span>}
            </Link>
            <Link className="avatar-link" to={`/user/${user.nickname}`}>
              <span className="avatar-dot">{user.nickname?.[0]?.toUpperCase()}</span>
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Вийти</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={openLogin}>Увійти</button>
            <button className="btn btn-primary btn-sm" onClick={openRegister}>Зареєструватися</button>
          </>
        )}
      </div>
    </nav>
  );
}