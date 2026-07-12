import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';
import PostRowCompact from '../components/PostRowCompact';
import PostListControls from '../components/PostListControls';
import RecentPosts from '../components/RecentPosts';
import PopularCommunities from '../components/PopularCommunities';
import SideLegal from '../components/SideLegal';
import { useAuth } from '../context/AuthContext';

// mode drives the base query sent to the backend + the empty-state copy.
// 'best'    -> / (feed=all, default sort unless overridden)
// 'popular' -> /popular (feed=popular)
// 'news'    -> /news (feed=all, sort forced to 'new')
const MODE_CONFIG = {
  best: { feed: 'all', defaultSort: 'hot', emptyText: 'Тут поки що порожньо.' },
  popular: { feed: 'popular', defaultSort: 'hot', emptyText: 'Поки немає популярних постів.' },
  news: { feed: 'all', defaultSort: 'new', emptyText: 'Свіжих постів поки немає.', lockSort: true },
};

export default function Home({ mode = 'best' }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = MODE_CONFIG[mode] || MODE_CONFIG.best;
  const sort = config.lockSort ? 'new' : (params.get('sort') || config.defaultSort);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('feedView') || 'card');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get('/posts', { params: { sort, feed: config.feed } })
      .then(({ data }) => { if (!cancelled) setPosts(data.posts || data || []); })
      .catch(() => { if (!cancelled) setError('Не вдалося завантажити стрічку'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort, config.feed]);

  const setSort = (key) => {
    const base = mode === 'best' ? '/' : `/${mode}`;
    navigate(`${base}?sort=${key}`);
  };

  const setView2 = (v) => {
    setView(v);
    localStorage.setItem('feedView', v);
  };

  return (
    <div className="home-layout">
      <div className="feed">
        <PostListControls
          sort={sort}
          onSortChange={config.lockSort ? undefined : setSort}
          view={view}
          onViewChange={setView2}
        />

        {loading && <p className="feed-status">Завантаження…</p>}
        {error && <p className="feed-status error">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="feed-status">{config.emptyText}</p>
        )}

        <div className={view === 'compact' ? 'post-list post-list-compact' : 'post-list post-list-grid'}>
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
        <SideLegal />
      </aside>
    </div>
  );
}