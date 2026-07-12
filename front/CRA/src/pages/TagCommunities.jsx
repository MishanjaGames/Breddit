import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { tagDisplay } from '../utils/topics';

export default function TagCommunities() {
  const { tag } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinedIds, setJoinedIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/categories', { params: { tag } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = data || [];
        setCommunities(list);
        setJoinedIds(new Set(list.filter((c) => c.isSubscribed).map((c) => c._id)));
      })
      .catch(() => { if (!cancelled) setCommunities([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tag]);

  const toggleJoin = async (c) => {
    if (!user) return;
    const wasJoined = joinedIds.has(c._id);
    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (wasJoined) next.delete(c._id); else next.add(c._id);
      return next;
    });
    try {
      if (wasJoined) await api.delete(`/categories/${c._id}/subscribe`);
      else await api.post(`/categories/${c._id}/subscribe`);
    } catch {
      toast.error('Не вдалося оновити підписку');
      setJoinedIds((prev) => {
        const next = new Set(prev);
        if (wasJoined) next.add(c._id); else next.delete(c._id);
        return next;
      });
    }
  };

  return (
    <div className="explore-page">
      <h1>Спільноти з тегом «{tagDisplay(tag)}»</h1>

      {loading && <p className="feed-status">Завантаження…</p>}
      {!loading && communities.length === 0 && <p className="feed-status">Спільнот з цим тегом ще немає.</p>}

      {!loading && (
        <div className="explore-grid">
          {communities.map((c) => (
            <div className="explore-card" key={c._id}>
              <div className="explore-card-head">
                {c.icon ? (
                  <img className="sub-icon" src={c.icon} alt="" />
                ) : (
                  <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
                )}
                <div className="explore-card-title">
                  <Link to={`/r/${encodeURIComponent(c.name)}`} className="post-sub-link">{c.name}</Link>
                  <span className="widget-sub">{(c.subscriberCount ?? 0).toLocaleString('en-US')} weekly visitors</span>
                </div>
                <button
                  className={`btn btn-sm join-btn ${joinedIds.has(c._id) ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => toggleJoin(c)}
                >
                  {joinedIds.has(c._id) ? 'Joined' : 'Join'}
                </button>
              </div>
              {c.description && <p className="explore-card-desc">{c.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}