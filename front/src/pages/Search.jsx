import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState({ posts: [], subreddits: [], users: [] });

  useEffect(() => {
    if (!q) return;
    api.get('/search', { params: { q } }).then(({ data }) => setResults(data));
  }, [q]);

  return (
    <div className="col-md-8 mx-auto mt-3">
      <h5>Результати пошуку: "{q}"</h5>

      {results.subreddits?.length > 0 && (
        <div className="mb-3">
          <h6>Спільноти</h6>
          {results.subreddits.map((s) => (
            <Link key={s.id} to={`/r/${s.name}`} className="d-block">r/{s.name}</Link>
          ))}
        </div>
      )}

      {results.users?.length > 0 && (
        <div className="mb-3">
          <h6>Користувачі</h6>
          {results.users.map((u) => (
            <Link key={u.id} to={`/u/${u.username}`} className="d-block">u/{u.username}</Link>
          ))}
        </div>
      )}

      {results.posts?.length > 0 && (
        <div>
          <h6>Пости</h6>
          {results.posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {!results.posts?.length && !results.subreddits?.length && !results.users?.length && (
        <p className="text-secondary">Нічого не знайдено.</p>
      )}
    </div>
  );
}
