import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Community() {
  const { name } = useParams();
  const { user } = useAuth();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then((cat) => {
      if (cancelled) return;
      setCategory(cat);
      setJoined(!!cat?.isSubscribed);
      if (cat) {
        api.get('/posts', { params: { category: cat._id } })
          .then(({ data }) => { if (!cancelled) setPosts(data.posts || data || []); })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name]);

  const toggleJoin = async () => {
    if (!user || !category) return;
    const next = !joined;
    setJoined(next);
    try {
      if (next) await api.post(`/categories/${category._id}/subscribe`);
      else await api.delete(`/categories/${category._id}/subscribe`);
    } catch {
      setJoined(!next);
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!category) return <p className="feed-status">Спільноту r/{name} не знайдено.</p>;

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-banner" />
        <div className="community-header-row">
          <span className="sub-icon large">{category.name[0]?.toUpperCase()}</span>
          <h1>r/{category.name}</h1>
          {user && (
            <button
              className={`btn btn-sm join-btn ${joined ? 'btn-outline' : 'btn-primary'}`}
              onClick={toggleJoin}
            >
              {joined ? 'Приєднано' : 'Приєднатись'}
            </button>
          )}
        </div>
        {category.description && <p className="community-desc">{category.description}</p>}
      </header>

      <div className="community-body">
        <div className="post-list">
          {posts.length === 0 && <p className="feed-status">У цій спільноті ще немає постів.</p>}
          {posts.map((post) => <PostCard key={post._id} post={post} />)}
        </div>
        <aside className="community-side">
          <div className="side-card">
            <h3>Про спільноту</h3>
            <p>{category.description || 'Опис відсутній.'}</p>
            {user && (
              <Link className="btn btn-primary btn-block" to={`/r/${encodeURIComponent(category.name)}/submit`}>
                Створити пост
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}