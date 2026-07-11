import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function Home() {
  const [params] = useSearchParams();
  const tab = params.get('tab') || 'best';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get('/posts', { params: { sort: tab } })
      .then(({ data }) => { if (!cancelled) setPosts(data.posts || data || []); })
      .catch(() => { if (!cancelled) setError('Не вдалося завантажити стрічку'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <div className="feed">
      <div className="feed-tabs">
        <a className={`feed-tab ${tab === 'best' ? 'active' : ''}`} href="/?tab=best">Найкращі</a>
        <a className={`feed-tab ${tab === 'popular' ? 'active' : ''}`} href="/?tab=popular">Популярне</a>
        <a className={`feed-tab ${tab === 'all' ? 'active' : ''}`} href="/?tab=all">Все</a>
      </div>

      {loading && <p className="feed-status">Завантаження…</p>}
      {error && <p className="feed-status error">{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="feed-status">Тут поки що порожньо.</p>
      )}

      <div className="post-list">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </div>
  );
}