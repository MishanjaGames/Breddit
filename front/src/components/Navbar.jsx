import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <nav className="navbar">
      <Link className="navbar-brand" to="/">
        <span className="brand-icon">r</span>
        <span className="brand-word">reddit</span>
      </Link>
      <form className="navbar-search" onSubmit={submitSearch}>
        <span className="search-icon">⌕</span>
        <input
          type="search"
          placeholder="Шукати в Breddit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="navbar-actions">
        {user ? (
          <>
            <Link className="icon-btn" to="/notifications" title="Сповіщення">🔔</Link>
            <Link className="icon-btn" to="/saved" title="Збережене">🔖</Link>
            <Link className="btn btn-outline btn-sm" to="/r/new">+ Створити</Link>
            <Link className="avatar-link" to={`/u/${user.nickname}`}>
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