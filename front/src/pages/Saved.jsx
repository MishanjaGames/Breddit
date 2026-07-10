import { useEffect, useState } from 'react';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/mine/saved')
      .then(({ data }) => setPosts(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="col-md-6 mx-auto mt-3">
      <h5 className="mb-3">Збережене</h5>
      {loading && <p className="text-secondary">Завантаження...</p>}
      {!loading && posts.length === 0 && <p className="text-secondary">Немає збережених постів.</p>}
      {posts.map((p) => <PostCard key={p._id} post={p} />)}
    </div>
  );
}
