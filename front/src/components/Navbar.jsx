import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
      <Link className="navbar-brand fw-bold" to="/">Breddit</Link>
      <form className="d-flex flex-grow-1 mx-3" onSubmit={submitSearch}>
        <input
          className="form-control"
          type="search"
          placeholder="Пошук..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="d-flex align-items-center gap-2">
        <Link className="btn btn-outline-light btn-sm" to="/r/new">Створити спільноту</Link>
        {user ? (
          <>
            {/* backend has no /nickname-based profile endpoint, so just show the nickname */}
            <Link className="btn btn-outline-light btn-sm" to="/notifications">🔔</Link>
            <Link className="text-light small text-decoration-none" to={`/u/${user.nickname}`}>{user.nickname}</Link>
            <button className="btn btn-light btn-sm" onClick={logout}>Вийти</button>
          </>
        ) : (
          <>
            <Link className="btn btn-outline-light btn-sm" to="/login">Увійти</Link>
            <Link className="btn btn-light btn-sm" to="/register">Реєстрація</Link>
          </>
        )}
      </div>
    </nav>
  );
}