import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

export default function Subreddit() {
  const { name } = useParams();
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState('hot');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    api.get(`/subreddits/${name}`).then(({ data }) => {
      setSub(data.subreddit);
      setSubscribed(data.isSubscribed);
    });
  }, [name]);

  useEffect(() => {
    if (!sub) return;
    api.get(`/subreddits/${sub.id}/posts`, { params: { sort } })
      .then(({ data }) => setPosts(data.posts));
  }, [sub, sort]);

  const toggleSubscribe = async () => {
    if (!user) return;
    if (subscribed) await api.delete(`/subreddits/${sub.id}/subscribe`);
    else await api.post(`/subreddits/${sub.id}/subscribe`);
    setSubscribed(!subscribed);
  };

  if (!sub) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-8 mx-auto mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">r/{sub.name}</h4>
          <p className="text-secondary mb-0 small">{sub.description}</p>
        </div>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${subscribed ? 'btn-outline-primary' : 'btn-primary'}`} onClick={toggleSubscribe}>
            {subscribed ? 'Відписатись' : 'Підписатись'}
          </button>
          <Link className="btn btn-sm btn-success" to={`/r/${sub.name}/submit`}>+ Пост</Link>
        </div>
      </div>
      <select className="form-select form-select-sm w-auto mb-3" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="hot">Hot</option>
        <option value="new">New</option>
        <option value="top">Top</option>
        <option value="controversial">Controversial</option>
      </select>
      {posts.map((p) => <PostCard key={p.id} post={{ ...p, subreddit: sub }} />)}
      {posts.length === 0 && <p className="text-secondary">Постів немає.</p>}
    </div>
  );
}
