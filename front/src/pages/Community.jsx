import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Community() {
  const { name } = useParams();
  const { user } = useAuth();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [sort, setSort] = useState('best');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then((cat) => {
      if (cancelled) return;
      setCategory(cat);
      setJoined(!!cat?.isSubscribed);
      if (cat) {
        api.get('/posts', { params: { category: cat._id, sort } })
          .then(({ data }) => { if (!cancelled) setPosts(data.posts || data || []); })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, sort]);

  const toggleJoin = async () => {
    if (!user || !category) return;
    const next = !joined;
    setJoined(next);
    try {
      if (next) await api.post(`/categories/${category._id}/subscribe`);
      else await api.delete(`/categories/${category._id}/subscribe`);
    } catch {
      setJoined(!next);
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!category) return <p className="feed-status">Спільноту r/{name} не знайдено.</p>;

  const rules = category.rules || [];
  const isOwner = user && category.owner && (category.owner === user._id || category.owner?._id === user._id);
  const isMod = isOwner || (user && (category.moderators || []).some((m) => (m._id || m) === user._id));

  const sortLabels = { best: 'Найкращі', hot: 'Гарячі', new: 'Нові', top: 'Топ', rising: 'Зростаючі' };

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-banner" />
        <div className="community-header-row">
          <span className="sub-icon large">{category.name[0]?.toUpperCase()}</span>
          <h1>r/{category.name}</h1>
          {isOwner && <span className="owner-badge" title="Ви власник спільноти">👑 Власник</span>}
          {user && !isMod && (
            <button
              className={`btn btn-sm join-btn ${joined ? 'btn-outline' : 'btn-primary'}`}
              onClick={toggleJoin}
            >
              {joined ? 'Приєднано' : 'Приєднатись'}
            </button>
          )}
          {user && (
            <Link className="btn btn-primary btn-sm" to={`/r/${encodeURIComponent(category.name)}/submit`}>
              + Створити пост
            </Link>
          )}
          {isMod && (
            <Link className="btn btn-outline btn-sm" to={`/r/${encodeURIComponent(category.name)}/mod`}>
              🛠 Інструменти модератора
            </Link>
          )}
        </div>
        {category.description && <p className="community-desc">{category.description}</p>}
      </header>

      <div className="community-body">
        <div className="feed-content">
          <div className="feed-controls">
            <div className="sort-dropdown">
              <button className="sort-trigger" onClick={() => setSortOpen((o) => !o)}>
                {sortLabels[sort]} ˅
              </button>
              {sortOpen && (
                <div className="sort-menu">
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <button
                      key={key}
                      className={`sort-menu-item ${sort === key ? 'active' : ''}`}
                      onClick={() => { setSort(key); setSortOpen(false); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="post-list">
            {posts.length === 0 && <p className="feed-status">У цій спільноті ще немає постів.</p>}
            {posts.map((post) => <PostCard key={post._id} post={post} />)}
          </div>
        </div>
        <aside className="community-side">
          <div className="side-card">
            <h3>r/{category.name}</h3>
            <p>{category.description || 'Опис відсутній.'}</p>
            <div className="profile-stats">
              <div>
                <strong>{category.subscriberCount ?? '—'}</strong>
                <span>Відвідувачів на тижні</span>
              </div>
              <div>
                <strong>{category.contributionCount ?? '—'}</strong>
                <span>Внесків на тижні</span>
              </div>
            </div>
            {user && (
              <Link className="btn btn-primary btn-block" to={`/r/${encodeURIComponent(category.name)}/submit`}>
                Створити пост
              </Link>
            )}
          </div>

          {rules.length > 0 && (
            <div className="side-card">
              <h3>Правила спільноти</h3>
              <ol className="rules-list">
                {rules.map((r, i) => <li key={i}>{r}</li>)}
              </ol>
            </div>
          )}

          <div className="side-card">
            <h3>Модератори</h3>
            <button className="side-link static full-width">✉ Написати модераторам</button>
            {category.moderators?.length > 0 && (
              <div className="mod-list">
                {category.moderators.map((m) => (
                  <Link key={m._id || m} to={`/user/${m.nickname || m}`} className="mod-row">
                    <span className="avatar-dot small">{(m.nickname || m)?.[0]?.toUpperCase()}</span>
                    u/{m.nickname || m}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {isMod && (
            <div className="side-card mod-panel">
              <h3>Панель модератора</h3>
              <Link className="side-link" to={`/r/${encodeURIComponent(category.name)}/mod/queue`}>
                <span className="side-icon">📋</span> Черга модерації
              </Link>
              <Link className="side-link" to={`/r/${encodeURIComponent(category.name)}/mod/mail`}>
                <span className="side-icon">✉</span> Пошта модераторів
              </Link>
              <Link className="side-link" to={`/r/${encodeURIComponent(category.name)}/mod/settings`}>
                <span className="side-icon">⚙</span> Керувати спільнотою
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}