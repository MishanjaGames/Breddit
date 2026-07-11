import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';

function CommunityRow({ c, isOwner, onLeave }) {
  return (
    <div className="manage-community-row">
      {c.icon ? (
        <img className="sub-icon" src={c.icon} alt="" />
      ) : (
        <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
      )}
      <div className="manage-community-info">
        <Link to={`/r/${encodeURIComponent(c.name)}`} className="post-sub-link">r/{c.name}</Link>
        <span className="widget-sub">{(c.subscriberCount ?? 0).toLocaleString('en-US')} members</span>
      </div>
      <div className="manage-community-actions">
        {isOwner && <span className="owner-badge" title="Ви власник">👑</span>}
        <Link className="btn btn-outline btn-sm" to={`/r/${encodeURIComponent(c.name)}`}>Відкрити</Link>
        {!isOwner && (
          <button className="btn btn-ghost btn-sm" onClick={() => onLeave(c)}>Покинути</button>
        )}
      </div>
    </div>
  );
}

export default function ManageCommunities() {
  const { user } = useAuth();
  const toast = useToast();
  const { openModal: openCreateCommunity } = useCreateCommunityModal();
  const [owned, setOwned] = useState([]);
  const [subscribed, setSubscribed] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (!user) return <p className="feed-status">Увійдіть, щоб керувати спільнотами.</p>;
  if (loading) return <p className="feed-status">Завантаження…</p>;

  return (
    <div className="manage-communities-page">
      <div className="manage-communities-header">
        <h1>Керування спільнотами</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreateCommunity}>+ Створити спільноту</button>
      </div>

      <section className="manage-communities-section">
        <h2>Ваші спільноти</h2>
        {owned.length === 0 && <p className="feed-status">Ви ще не створили жодної спільноти.</p>}
        <div className="manage-community-list">
          {owned.map((c) => <CommunityRow key={c._id} c={c} isOwner onLeave={handleLeave} />)}
        </div>
      </section>

      <section className="manage-communities-section">
        <h2>Приєднані спільноти</h2>
        {subscribed.length === 0 && <p className="feed-status">Ви ще не приєдналися до жодної спільноти.</p>}
        <div className="manage-community-list">
          {subscribed.map((c) => <CommunityRow key={c._id} c={c} onLeave={handleLeave} />)}
        </div>
      </section>
    </div>
  );
}
