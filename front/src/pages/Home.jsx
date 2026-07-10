import { useEffect, useState } from 'react';
import api from '../api/client';
import PostCard from '../components/PostCard';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'home', label: 'Головна', auth: true },
  { key: 'popular', label: 'Популярне' },
  { key: 'all', label: 'Все' },
];

export default function Home() {
  const { user } = useAuth();
  const [tab, setTab] = useState(user ? 'home' : 'popular');
  const [sort, setSort] = useState('hot');
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/posts', { params: { page: 1, limit: 20, feed: tab, sort } })
      .then(({ data }) => {
        setPosts(data.posts || []);
        setMessage(data.message || '');
      })
      .finally(() => setLoading(false));
  }, [tab, sort]);

  return (
    <div className="container-fluid mt-3">
      <div className="row" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="col-md-3 d-none d-md-block">
          <Sidebar />
        </div>
        <div className="col-md-7">
          <div className="d-flex justify-content-between mb-3">
            <div className="btn-group">
              {TABS.filter((t) => !t.auth || user).map((t) => (
                <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>
            <select className="form-select form-select-sm w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="top">Top</option>
              <option value="controversial">Controversial</option>
            </select>
          </div>
          {loading && <p className="text-secondary">Завантаження...</p>}
          {!loading && message && <div className="alert alert-info">{message}</div>}
          {posts.map((p) => <PostCard key={p._id} post={p} />)}
          {!loading && !message && posts.length === 0 && <p className="text-secondary">Постів немає.</p>}
        </div>
      </div>
    </div>
  );
}