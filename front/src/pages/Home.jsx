import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';
import PostRowCompact from '../components/PostRowCompact';
import PostListControls from '../components/PostListControls';
import RecentPosts from '../components/RecentPosts';
import PopularCommunities from '../components/PopularCommunities';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sort = params.get('sort') || 'hot';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('feedView') || 'card');

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
  };

  const setView2 = (v) => {
    setView(v);
    localStorage.setItem('feedView', v);
  };

  return (
    <div className="home-layout">
      <div className="feed">
        <PostListControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView2} />

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