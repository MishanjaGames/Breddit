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
    <nav className="navbar navbar-expand px-3 sticky-top">
      <Link className="navbar-brand" to="/">
        <span className="sub-icon me-1" style={{ verticalAlign: 'middle' }}>b</span>
        breddit
      </Link>
      <form className="d-flex flex-grow-1 mx-3" style={{ maxWidth: 600 }} onSubmit={submitSearch}>
        <input
          className="form-control"
          type="search"
          placeholder="Пошук у Breddit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="d-flex align-items-center gap-2">
        <Link className="btn btn-primary btn-sm" to="/r/new">+ Створити</Link>
        {user ? (
          <>
            <Link className="btn btn-outline-light btn-sm" to="/notifications">🔔</Link>
            <Link className="text-decoration-none fw-semibold small" to={`/u/${user.nickname}`}>u/{user.nickname}</Link>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Вийти</button>
          </>
        ) : (
          <>
            <Link className="btn btn-outline-light btn-sm" to="/login">Увійти</Link>
            <Link className="btn btn-primary btn-sm" to="/register">Реєстрація</Link>
          </>
        )}
      </div>
    </nav>
  );
}