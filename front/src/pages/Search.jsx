import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState({ posts: [], categories: [] });

  useEffect(() => {
    if (!q) return;
    api.get('/search', { params: { q } }).then(({ data }) => setResults({
      posts: data.posts || [],
      categories: data.categories || [],
    }));
  }, [q]);

  return (
    <div className="col-md-8 mx-auto mt-3">
      <h5>Результати пошуку: "{q}"</h5>

      {results.categories?.length > 0 && (
        <div className="mb-3">
          <h6>Спільноти</h6>
          {results.categories.map((s) => (
            <Link key={s._id} to={`/r/${s._id}`} className="d-block">r/{s.name}</Link>
          ))}
        </div>
      )}

      {results.posts?.length > 0 && (
        <div>
          <h6>Пости</h6>
          {results.posts.map((p) => <PostCard key={p._id} post={p} />)}
        </div>
      )}

      {!results.posts?.length && !results.categories?.length && (
        <p className="text-secondary">Нічого не знайдено.</p>
      )}
    </div>
  );
}
