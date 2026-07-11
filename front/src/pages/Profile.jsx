import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

const TABS = ['Огляд', 'Пости', 'Коментарі', 'Збережене'];

export default function Profile() {
  const { nickname } = useParams();
  const { user } = useAuth();
  const isOwn = user?.nickname === nickname;
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('Огляд');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/users/${encodeURIComponent(nickname)}`)
      .then(({ data }) => { if (!cancelled) setProfile(data.user || data); })
      .catch(() => { if (!cancelled) setProfile({ nickname }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    api.get(`/users/${encodeURIComponent(nickname)}/activity`)
      .then(({ data }) => { if (!cancelled) setItems(data.items || data || []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [nickname]);

  if (loading) return <p className="feed-status">Завантаження…</p>;

  return (
    <div className="profile-page">
      <div className="profile-main">
        <header className="profile-header">
          <span className="avatar-dot large">{nickname?.[0]?.toUpperCase()}</span>
          <div>
            <h1>{profile?.displayName || nickname}</h1>
            <span className="post-meta-text">u/{nickname}</span>
          </div>
        </header>

        <div className="profile-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`feed-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="profile-content-note">
          <span className="side-icon">👁</span> Показано весь контент
        </div>

        <div className="post-list">
          {items.length === 0 && <p className="feed-status">Тут поки що нічого немає.</p>}
          {items.map((item) => (
            <article key={item._id} className="post-card comment-item">
              <header className="post-card-head">
                <span className="post-sub-link">r/{item.category?.name || 'невідомо'}</span>
                <span className="post-dot">·</span>
                <span className="post-meta-text">{timeAgo(item.createdAt)}</span>
              </header>
              <p className="post-desc">{item.text || item.title}</p>
            </article>
          ))}
        </div>
      </div>

      <aside className="profile-side">
        <div className="side-card profile-card">
          <div className="profile-card-avatar">
            <span className="avatar-dot large">{nickname?.[0]?.toUpperCase()}</span>
          </div>
          <h3>{profile?.displayName || nickname}</h3>
          <span className="post-meta-text">u/{nickname}</span>

          {!isOwn && (
            <div className="profile-card-actions">
              <button className="btn btn-outline btn-sm btn-block">Читати</button>
              <button className="btn btn-primary btn-sm btn-block">Написати</button>
            </div>
          )}

          <div className="profile-stats">
            <div>
              <strong>{profile?.karma ?? 0}</strong>
              <span>Карма</span>
            </div>
            <div>
              <strong>{profile?.contributions ?? items.length}</strong>
              <span>Внесків</span>
            </div>
          </div>

          <div className="profile-stats">
            <div>
              <strong>{profile?.ageYears ?? '—'}</strong>
              <span>Вік акаунта</span>
            </div>
          </div>

          {isOwn && (
            <div className="side-section" style={{ marginTop: 12 }}>
              <h4 className="side-empty">Налаштування</h4>
              <div className="side-section-body">
                <span className="side-link static">Профіль — редагувати</span>
                <span className="side-link static">Оформлення профілю</span>
                <span className="side-link static">Аватар — редагувати</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}