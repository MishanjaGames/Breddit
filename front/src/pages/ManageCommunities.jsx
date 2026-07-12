import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';
import { isFavorite, toggleFavorite } from '../utils/favorites';

function CommunityRow({ c, isOwner, onLeave, onToggleFav }) {
  const fav = isFavorite(c._id);
  return (
    <div className="manage-community-row">
      {c.icon ? (
        <img className="sub-icon" src={c.icon} alt="" />
      ) : (
        <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
      )}
      <div className="manage-community-info">
        <Link to={`/r/${encodeURIComponent(c.name)}`} className="post-sub-link">r/{c.name}</Link>
        <span className="widget-sub">{(c.subscriberCount ?? 0).toLocaleString('en-US')} учасників</span>
      </div>
      <div className="manage-community-actions">
        <button
          type="button"
          className={`star-icon ${fav ? 'star-active' : ''}`}
          onClick={() => onToggleFav(c._id)}
          title={fav ? 'Прибрати з обраного' : 'Додати в обране'}
        >
          {fav ? '★' : '☆'}
        </button>
        {isOwner && <span className="owner-badge" title="Ви власник">👑</span>}
        <Link className="btn btn-outline btn-sm" to={`/r/${encodeURIComponent(c.name)}`}>Відкрити</Link>
        {!isOwner && (
          <button className="btn btn-ghost btn-sm" onClick={() => onLeave(c)}>Покинути</button>
        )}
      </div>
    </div>
  );
}

const FILTERS = [
  { key: 'all', label: 'Усі спільноти' },
  { key: 'favorited', label: 'Обране' },
];

export default function ManageCommunities() {
  const { user } = useAuth();
  const toast = useToast();
  const { openModal: openCreateCommunity } = useCreateCommunityModal();
  const [owned, setOwned] = useState([]);
  const [subscribed, setSubscribed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [, setFavVersion] = useState(0);

  // backend has no "moderated" concept and no dedicated "owned" endpoint,
  // so we derive ownership from the subscribed list by comparing creator to the current user
  const load = () => {
    setLoading(true);
    api.get('/categories/mine/subscribed')
      .then(({ data }) => {
        const list = data || [];
        const ownedList = list.filter((c) => (c.creator === user?._id) || (c.creator?._id === user?._id));
        const notOwned = list.filter((c) => !((c.creator === user?._id) || (c.creator?._id === user?._id)));
        setOwned(ownedList);
        setSubscribed(notOwned);
      })
      .catch(() => { setOwned([]); setSubscribed([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const onChange = () => setFavVersion((v) => v + 1);
    window.addEventListener('favorites-changed', onChange);
    return () => window.removeEventListener('favorites-changed', onChange);
  }, []);

  const handleLeave = async (c) => {
    setSubscribed((prev) => prev.filter((x) => x._id !== c._id));
    try {
      await api.delete(`/categories/${c._id}/subscribe`);
      toast.success(`Ви покинули r/${c.name}`);
    } catch {
      toast.error('Не вдалося покинути спільноту');
      load();
    }
  };

  const handleToggleFav = (id) => {
    toggleFavorite(id);
    setFavVersion((v) => v + 1);
  };

  if (!user) return <p className="feed-status">Увійдіть, щоб керувати спільнотами.</p>;
  if (loading) return <p className="feed-status">Завантаження…</p>;

  const applyFilter = (list) => (filter === 'favorited' ? list.filter((c) => isFavorite(c._id)) : list);
  const visibleOwned = applyFilter(owned);
  const visibleSubscribed = applyFilter(subscribed);

  return (
    <div className="manage-communities-page">
      <div className="manage-communities-header">
        <h1>Керування спільнотами</h1>
        <div className="manage-communities-header-actions">
          <select
            className="manage-communities-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Фільтр спільнот"
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openCreateCommunity}>+ Створити спільноту</button>
        </div>
      </div>

      <section className="manage-communities-section">
        <h2>Ваші спільноти</h2>
        {visibleOwned.length === 0 && (
          <p className="feed-status">
            {filter === 'favorited' ? 'Немає обраних серед ваших спільнот.' : 'Ви ще не створили жодної спільноти.'}
          </p>
        )}
        <div className="manage-community-list">
          {visibleOwned.map((c) => (
            <CommunityRow key={c._id} c={c} isOwner onLeave={handleLeave} onToggleFav={handleToggleFav} />
          ))}
        </div>
      </section>

      <section className="manage-communities-section">
        <h2>Приєднані спільноти</h2>
        {visibleSubscribed.length === 0 && (
          <p className="feed-status">
            {filter === 'favorited' ? 'Немає обраних серед приєднаних спільнот.' : 'Ви ще не приєдналися до жодної спільноти.'}
          </p>
        )}
        <div className="manage-community-list">
          {visibleSubscribed.map((c) => (
            <CommunityRow key={c._id} c={c} onLeave={handleLeave} onToggleFav={handleToggleFav} />
          ))}
        </div>
      </section>
    </div>
  );
}