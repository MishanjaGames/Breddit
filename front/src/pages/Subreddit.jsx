import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Subreddit() {
  const { name } = useParams();
  const { user } = useAuth();
  const { error } = useToast();
  const [category, setCategory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState([]);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    setCategory(null);
    setNotFound(false);
    resolveCategoryByName(name).then((cat) => cat ? setCategory(cat) : setNotFound(true));
  }, [name]);

  useEffect(() => {
    if (!category) return;
    api.get(`/posts/category/${category._id}`).then(({ data }) => setPosts(data));
  }, [category]);

  const toggleSubscribe = async () => {
    if (!user) return;
    setSubBusy(true);
    const wasSubscribed = category.isSubscribed;
    try {
      if (wasSubscribed) {
        const { data } = await api.delete(`/categories/${category._id}/subscribe`);
        setCategory({ ...category, isSubscribed: false, subscriberCount: data.subscriberCount });
      } else {
        const { data } = await api.post(`/categories/${category._id}/subscribe`);
        setCategory({ ...category, isSubscribed: true, subscriberCount: data.subscriberCount });
      }
    } catch (err) {
      error(err.response?.data?.message || 'Помилка');
    } finally {
      setSubBusy(false);
    }
  };

  if (notFound) return <p className="mt-4 text-center text-secondary">Спільноту не знайдено.</p>;
  if (!category) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="container-fluid mt-3">
      {category.banner && (
        <div style={{ height: 80, background: `#0079d3 url(${category.banner}) center/cover`, borderRadius: 4, maxWidth: 1200, margin: '0 auto' }} />
      )}
      <div className="row" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="col-md-8 mx-auto mx-md-0 mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="sub-icon" style={{ width: 40, height: 40, fontSize: 18 }}>{category.name[0]?.toUpperCase()}</span>
              <div>
                <h4 className="mb-0">r/{category.name}</h4>
                <p className="text-secondary mb-0 small">{category.subscriberCount ?? 0} учасників</p>
              </div>
            </div>
            <div className="d-flex gap-2">
              {user && (
                <button
                  className={`btn btn-sm btn-round ${category.isSubscribed ? 'btn-outline-primary' : 'btn-primary'}`}
                  onClick={toggleSubscribe}
                  disabled={subBusy}
                >
                  {category.isSubscribed ? 'Приєднано ✓' : 'Приєднатись'}
                </button>
              )}
              <Link className="btn btn-sm btn-primary btn-round" to={`/r/${encodeURIComponent(category.name)}/submit`}>+ Пост</Link>
            </div>
          </div>
          {posts.map((p) => <PostCard key={p._id} post={{ ...p, category }} />)}
          {posts.length === 0 && <p className="text-secondary">Постів немає.</p>}
        </div>
        <div className="col-md-4 d-none d-md-block mt-3">
          <div className="widget-card mb-3">
            <div className="widget-card-header">Про спільноту r/{category.name}</div>
            <div className="widget-card-body">
              <p className="mb-2">{category.description || 'Опис відсутній.'}</p>
              <div className="d-flex justify-content-between text-secondary" style={{ fontSize: 12 }}>
                <span>{category.subscriberCount ?? 0} учасників</span>
              </div>
            </div>
          </div>
          {category.rules?.length > 0 && (
            <div className="widget-card">
              <div className="widget-card-header">Правила спільноти</div>
              <div className="widget-card-body p-0">
                {category.rules.map((r, i) => (
                  <div key={i} className="widget-list-item px-3">
                    <span className="fw-bold">{i + 1}.</span>
                    <div>
                      <div className="fw-semibold">{r.title}</div>
                      {r.body && <div className="text-secondary" style={{ fontSize: 12 }}>{r.body}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
