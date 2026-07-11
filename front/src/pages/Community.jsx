import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import PostRowCompact from '../components/PostRowCompact';
import PostListControls from '../components/PostListControls';
import EditCommunityModal from '../components/EditCommunityModal';

const PRIVACY_LABEL = { public: 'Public', restricted: 'Restricted', private: 'Private' };
const PRIVACY_ICON = { public: '🌐', restricted: '👁', private: '🔒' };

function formatCreatedDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function Community() {
  const { name } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [sort, setSort] = useState('best');
  const [view, setView] = useState(() => localStorage.getItem('feedView') || 'card');
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // 'avatar' | 'banner' | 'name' | 'status' | null
  const [rulesOpen, setRulesOpen] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then((cat) => {
      if (cancelled) return;
      setCategory(cat);
      setJoined(!!cat?.isSubscribed);
      if (cat) {
        api.get('/posts', { params: { category: cat._id, sort } })
          .then(({ data }) => {
            if (cancelled) return;
            const list = data.posts || data || [];
            // backend's category filter is unreliable, so filter client-side too
            const filtered = list.filter((p) => (p.category?._id || p.category) === cat._id);
            setPosts(filtered);
          })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, sort]);

  const setView2 = (v) => {
    setView(v);
    localStorage.setItem('feedView', v);
  };

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

  const openEdit = (target) => {
    setEditTarget(target);
    setEditOpen(true);
  };

  const handleSaved = (patch) => {
    setCategory((prev) => ({ ...prev, ...patch }));
    toast.success('Спільноту оновлено');
  };

  const toggleRule = (i) => setRulesOpen((o) => ({ ...o, [i]: !o[i] }));

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!category) return <p className="feed-status">Спільноту r/{name} не знайдено.</p>;

  const rules = category.rules || [];
  const isOwner = user && category.owner && (category.owner === user._id || category.owner?._id === user._id);
  const isMod = isOwner || (user && (category.moderators || []).some((m) => (m._id || m) === user._id));
  const privacy = category.type || 'public';
  const createdLabel = formatCreatedDate(category.createdAt);

  return (
    <div className="community-page">
      <header className="community-header">
        <div
          className="community-banner"
          style={category.banner ? { backgroundImage: `url(${category.banner})` } : undefined}
        >
          {isOwner && (
            <button
              className="community-edit-fab banner-edit-fab"
              onClick={() => openEdit('banner')}
              title="Змінити банер"
              aria-label="Змінити банер"
            >✎</button>
          )}
        </div>
        <div className="community-header-row">
          <div className="community-avatar-wrap">
            {category.icon ? (
              <img className="sub-icon large" src={category.icon} alt="" />
            ) : (
              <span className="sub-icon large">{category.name[0]?.toUpperCase()}</span>
            )}
            {isOwner && (
              <button
                className="community-edit-fab avatar-edit-fab"
                onClick={() => openEdit('avatar')}
                title="Змінити зображення спільноти"
                aria-label="Змінити зображення спільноти"
              >✎</button>
            )}
          </div>
          <div className="community-title-block">
            <h1>
              r/{category.name}
              {isOwner && (
                <button className="community-edit-inline" onClick={() => openEdit('name')} title="Редагувати назву та опис">✎</button>
              )}
            </h1>
            {category.status && <span className="community-status-tag">{category.status}</span>}
          </div>

          <div className="community-header-actions">
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
                🛠 Mod Tools
              </Link>
            )}
          </div>
        </div>
        {(category.description || isOwner) && (
          <p className="community-desc">
            {category.description || 'Опис відсутній.'}
            {isOwner && (
              <button className="community-edit-inline" onClick={() => openEdit('description')} title="Редагувати опис">✎</button>
            )}
          </p>
        )}
      </header>

      <div className="community-body">
        <div className="feed-content">
          {category.highlights?.length > 0 && (
            <div className="community-highlights">
              {category.highlights.map((h, i) => (
                <Link key={i} to={h.link || '#'} className="highlight-card">
                  <span className="highlight-card-tag">{h.tag || 'Announcement'}</span>
                  <span className="highlight-card-title">{h.title}</span>
                  <span className="highlight-card-meta">
                    {h.votes != null && `${h.votes} votes`}
                    {h.votes != null && h.comments != null && ' · '}
                    {h.comments != null && `${h.comments} comments`}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <PostListControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView2} />
          <div className={view === 'compact' ? 'post-list post-list-compact' : 'post-list'}>
            {posts.length === 0 && <p className="feed-status">У цій спільноті ще немає постів.</p>}
            {posts.map((post) => (
              view === 'compact'
                ? <PostRowCompact key={post._id} post={post} />
                : <PostCard key={post._id} post={post} />
            ))}
          </div>
        </div>
        <aside className="community-side">
          <div className="side-card community-about-card">
            <div className="side-card-head-row">
              <h3>{category.name}</h3>
              {isOwner && (
                <button className="community-edit-inline" onClick={() => openEdit('name')} title="Редагувати">✎</button>
              )}
            </div>
            <p>{category.description || 'Опис відсутній.'}</p>

            <div className="community-meta-list">
              {createdLabel && (
                <span className="community-meta-row">
                  <span className="side-icon">🗓</span> Created {createdLabel}
                </span>
              )}
              <span className="community-meta-row">
                <span className="side-icon">{PRIVACY_ICON[privacy]}</span> {PRIVACY_LABEL[privacy]}
              </span>
            </div>

            {isOwner && (
              <div className="community-owner-actions">
                <button className="btn btn-outline btn-sm btn-block">📘 Mod Guide</button>
                <button className="btn btn-outline btn-sm btn-block">📖 Community Guide</button>
              </div>
            )}

            <div className="profile-stats">
              <div>
                <strong>{category.subscriberCount ?? 0}</strong>
                <span>Visitors</span>
              </div>
              <div>
                <strong>{category.contributionCount ?? 0}</strong>
                <span>Contributions</span>
              </div>
            </div>
            {user && (
              <Link className="btn btn-primary btn-block" to={`/r/${encodeURIComponent(category.name)}/submit`}>
                Create Post
              </Link>
            )}
          </div>

          {rules.length > 0 && (
            <div className="side-card">
              <div className="side-card-head-row">
                <h3>r/{category.name} RULES</h3>
                {isMod && <button className="icon-btn" title="Редагувати правила">✎</button>}
              </div>
              <ol className="rules-list rules-list-collapsible">
                {rules.map((r, i) => (
                  <li key={i}>
                    <button className="rule-toggle" onClick={() => toggleRule(i)}>
                      <span>{i + 1}&nbsp;&nbsp;{r}</span>
                      <span className={`chevron ${rulesOpen[i] ? 'open' : ''}`}>˅</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="side-card">
            <h3>MODERATORS</h3>
            <button className="side-link static full-width">✉ Message Mods</button>
            {isMod && <button className="side-link static full-width">➕ Invite Mod</button>}
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
            <button className="widget-more">View all moderators</button>
          </div>

          {isOwner && (
            <div className="side-card">
              <div className="side-card-head-row">
                <h3>COMMUNITY SETTINGS</h3>
              </div>
              <div className="community-settings-row">
                <span>Community Appearance</span>
                <button className="icon-btn" onClick={() => openEdit('avatar')} title="Редагувати вигляд">✎</button>
              </div>
              <button className="btn btn-primary btn-sm btn-block">Edit Widgets</button>
            </div>
          )}

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

      {editOpen && (
        <EditCommunityModal
          category={category}
          initialTarget={editTarget}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}