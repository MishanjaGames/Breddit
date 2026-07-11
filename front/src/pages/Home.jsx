import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';
import PostRowCompact from '../components/PostRowCompact';
import RecentPosts from '../components/RecentPosts';
import PopularCommunities from '../components/PopularCommunities';
import { useAuth } from '../context/AuthContext';

const SORTS = { best: 'Найкращі', hot: 'Гарячі', new: 'Нові', top: 'Топ', rising: 'Зростаючі' };

export default function Home() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sort = params.get('sort') || 'best';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('feedView') || 'card');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get('/posts', { params: { sort } })
      .then(({ data }) => { if (!cancelled) setPosts(data.posts || data || []); })
      .catch(() => { if (!cancelled) setError('Не вдалося завантажити стрічку'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort]);

  const setSort = (key) => {
    navigate(`/?sort=${key}`);
    setSortOpen(false);
  };

  const setView2 = (v) => {
    setView(v);
    localStorage.setItem('feedView', v);
  };

  return (
    <div className="home-layout">
      <div className="feed">
        <div className="feed-controls">
          <div className="sort-dropdown">
            <button className="sort-trigger" onClick={() => setSortOpen((o) => !o)}>
              {SORTS[sort]} ˅
            </button>
            {sortOpen && (
              <div className="sort-menu">
                <span className="sort-menu-label">Sort by</span>
                {Object.entries(SORTS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`sort-menu-item ${sort === key ? 'active' : ''}`}
                    onClick={() => setSort(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`}
              onClick={() => setView2('card')}
              title="Картки"
            >▤</button>
            <button
              className={`view-toggle-btn ${view === 'compact' ? 'active' : ''}`}
              onClick={() => setView2('compact')}
              title="Компактний вигляд"
            >☰</button>
          </div>
        </div>

        {loading && <p className="feed-status">Завантаження…</p>}
        {error && <p className="feed-status error">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="feed-status">Тут поки що порожньо.</p>
        )}

        <div className={view === 'compact' ? 'post-list post-list-compact' : 'post-list'}>
          {posts.map((post) => (
            view === 'compact'
              ? <PostRowCompact key={post._id} post={post} />
              : <PostCard key={post._id} post={post} />
          ))}
        </div>
      </div>

      <aside className="home-side">
        {user && <RecentPosts />}
        <PopularCommunities />
      </aside>
    </div>
  );
}