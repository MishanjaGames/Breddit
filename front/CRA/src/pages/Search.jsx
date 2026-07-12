import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    setLoading(true);
    api.get('/search', { params: { q } })
      .then(({ data }) => {
        if (cancelled) return;
        setCategories(data.categories || []);
        setPosts(data.posts || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className="search-page">
      <h1>Результати пошуку: «{q}»</h1>
      {loading && <p className="feed-status">Пошук…</p>}

      {!loading && (
        <>
          <section>
            <h2>Спільноти</h2>
            {categories.length === 0 && <p className="feed-status">Нічого не знайдено.</p>}
            <div className="search-results">
              {categories.map((c) => (
                <Link key={c._id} to={`/r/${encodeURIComponent(c.name)}`} className="side-link">
                  <span className="sub-icon">{c.name[0]?.toUpperCase()}</span> r/{c.name}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2>Пости</h2>
            {posts.length === 0 && <p className="feed-status">Нічого не знайдено.</p>}
            <div className="search-results">
              {posts.map((p) => (
                <Link
                  key={p._id}
                  to={`/r/${encodeURIComponent(p.category?.name)}/p/${encodeURIComponent(p.title)}`}
                  className="post-title"
                >
                  {p.title}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}