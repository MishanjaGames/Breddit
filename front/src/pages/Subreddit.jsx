import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function Subreddit() {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // backend: GET /api/categories/:id -> category object directly
    api.get(`/categories/${id}`).then(({ data }) => setCategory(data));
  }, [id]);

  useEffect(() => {
    // backend: GET /api/posts/category/:categoryId -> array directly
    api.get(`/posts/category/${id}`).then(({ data }) => setPosts(data));
  }, [id]);

  if (!category) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-8 mx-auto mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">r/{category.name}</h4>
          <p className="text-secondary mb-0 small">{category.description}</p>
        </div>
        {/* backend has no subscribe endpoint, so that action was removed */}
        <Link className="btn btn-sm btn-success" to={`/r/${category._id}/submit`}>+ Пост</Link>
      </div>
      {posts.map((p) => <PostCard key={p._id} post={{ ...p, category }} />)}
      {posts.length === 0 && <p className="text-secondary">Постів немає.</p>}
    </div>
  );
}