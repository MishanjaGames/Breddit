import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import PostCard from '../components/PostCard';

export default function Subreddit() {
  const { name } = useParams();
  const [category, setCategory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    setCategory(null);
    setNotFound(false);
    resolveCategoryByName(name).then((cat) => cat ? setCategory(cat) : setNotFound(true));
  }, [name]);

  useEffect(() => {
    if (!category) return;
    // backend: GET /api/posts/category/:categoryId -> array directly
    api.get(`/posts/category/${category._id}`).then(({ data }) => setPosts(data));
  }, [category]);

  if (notFound) return <p className="mt-4 text-center text-secondary">Спільноту не знайдено.</p>;
  if (!category) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-8 mx-auto mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">r/{category.name}</h4>
          <p className="text-secondary mb-0 small">{category.description}</p>
        </div>
        {/* backend has no subscribe endpoint, so that action was removed */}
        <Link className="btn btn-sm btn-success" to={`/r/${encodeURIComponent(category.name)}/submit`}>+ Пост</Link>
      </div>
      {posts.map((p) => <PostCard key={p._id} post={{ ...p, category }} />)}
      {posts.length === 0 && <p className="text-secondary">Постів немає.</p>}
    </div>
  );
}
