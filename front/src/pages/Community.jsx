import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import PostRowCompact from '../components/PostRowCompact';
import PostListControls from '../components/PostListControls';
import EditCommunityModal from '../components/EditCommunityModal';
import ModerationPanel from '../components/ModerationPanel';
import SideLegal from '../components/SideLegal';
import { mediaUrl } from '../utils/media';
import { tagDisplay } from '../utils/topics';

const PAGE_SIZE = 20;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [joined, setJoined] = useState(false);
  const [sort, setSort] = useState('hot');
  const [view, setView] = useState(() => localStorage.getItem('feedView') || 'card');
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // 'avatar' | 'banner' | 'name' | null
  const [rulesOpen, setRulesOpen] = useState({});
  const [modOpen, setModOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('posts'); // 'posts' | 'about' — only used below 900px
  const sentinelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setPage(1);
    resolveCategoryByName(name).then((cat) => {
      if (cancelled) return;
      setCategory(cat);
      setJoined(!!cat?.isSubscribed);
      if (cat) {
        try {
          const prev = JSON.parse(localStorage.getItem('recentCommunities') || '[]');
          const next = [cat.name, ...prev.filter((n) => n !== cat.name)].slice(0, 8);
          localStorage.setItem('recentCommunities', JSON.stringify(next));
        } catch { /* ignore */ }
        api.get(`/posts/category/${cat._id}`, { params: { sort, page: 1, limit: PAGE_SIZE } })
          .then(({ data }) => {
            if (cancelled) return;
            const list = Array.isArray(data) ? data : (data.posts || []);
            const filtered = list.filter((p) => (p.category?._id || p.category) === cat._id);
            setPosts(filtered);
            setTotalPages(data.totalPages || 1);
          })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, sort]);

  const loadMore = useCallback(() => {
    if (!category || loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get(`/posts/category/${category._id}`, { params: { sort, page: nextPage, limit: PAGE_SIZE } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.posts || []);
        const filtered = list.filter((p) => (p.category?._id || p.category) === category._id);
        setPosts((prev) => [...prev, ...filtered]);
        setPage(nextPage);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [category, sort, page, totalPages, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

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
      toast.error('Не вдалося оновити підписку');
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

  const addRule = async () => {
    const title = window.prompt('Назва правила (до 100 символів):');
    if (!title || !title.trim()) return;
    const body = window.prompt('Опис правила (необов\'язково):') || '';
    const nextRules = [...(category.rules || []), { title: title.trim(), body: body.trim() }];
    try {
      const { data } = await api.put(`/categories/${category._id}`, {
        name: category.name,
        description: category.description,
        icon: category.icon,
        banner: category.banner,
        status: category.status,
        rules: nextRules,
      });
      setCategory((prev) => ({ ...prev, rules: data.rules }));
      toast.success('Правило додано');
    } catch {
      toast.error('Не вдалося додати правило');
    }
  };

  const removeRule = async (index) => {
    const nextRules = (category.rules || []).filter((_, i) => i !== index);
    try {
      const { data } = await api.put(`/categories/${category._id}`, {
        name: category.name,
        description: category.description,
        icon: category.icon,
        banner: category.banner,
        status: category.status,
        rules: nextRules,
      });
      setCategory((prev) => ({ ...prev, rules: data.rules }));
      toast.success('Правило видалено');
    } catch {
      toast.error('Не вдалося видалити правило');
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!category) return <p className="feed-status">Спільноту r/{name} не знайдено.</p>;

  const rules = category.rules || [];
  const creatorId = category.creator?._id || category.creator;
  const isOwner = !!(user && creatorId && creatorId === user._id);
  const createdLabel = formatCreatedDate(category.createdAt);
  const updatedLabel = formatCreatedDate(category.updatedAt);

  return (
    <div className="community-page">
      <header className="community-header">
        <div
          className="community-banner"
          style={category.banner ? { backgroundImage: `url(${mediaUrl(category.banner) || category.banner})` } : undefined}
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
              <img className="sub-icon large" src={mediaUrl(category.icon) || category.icon} alt="" />
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
          </div>

          <div className="community-header-actions">
            {isOwner && <span className="owner-badge" title="Ви власник спільноти">👑 Власник</span>}
            {user && !isOwner && (
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
            {isOwner && (
              <button className="btn btn-outline btn-sm" onClick={() => setModOpen(true)}>
                🛠 Mod Tools
              </button>
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
        {category.tags?.length > 0 && (
          <div className="community-tag-list">
            {category.tags.map((t) => (
              <Link key={t} to={`/tags/${encodeURIComponent(t)}`} className="community-tag">{tagDisplay(t)}</Link>
            ))}
          </div>
        )}
      </header>

      <div className="community-mobile-tabs">
        <button
          type="button"
          className={`community-mobile-tab ${mobileTab === 'posts' ? 'active' : ''}`}
          onClick={() => setMobileTab('posts')}
        >
          Posts
        </button>
        <button
          type="button"
          className={`community-mobile-tab ${mobileTab === 'about' ? 'active' : ''}`}
          onClick={() => setMobileTab('about')}
        >
          About
        </button>
      </div>

      <div className="community-body">
        <div className={`feed-content ${mobileTab === 'about' ? 'community-mobile-hidden' : ''}`}>
          <PostListControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView2} />
          <div className={view === 'compact' ? 'post-list post-list-compact' : 'post-list'}>
            {posts.length === 0 && <p className="feed-status">У цій спільноті ще немає постів.</p>}
            {posts.map((post) => (
              view === 'compact'
                ? <PostRowCompact key={post._id} post={post} />
                : <PostCard key={post._id} post={post} />
            ))}
          </div>
          <div ref={sentinelRef} />
          {loadingMore && <p className="feed-status">Завантаження…</p>}
        </div>
        <aside className={`community-side ${mobileTab === 'about' ? 'community-mobile-visible' : ''}`}>
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
              {updatedLabel && updatedLabel !== createdLabel && (
                <span className="community-meta-row edited-label">
                  <span className="side-icon">✎</span> Оновлено {updatedLabel}
                </span>
              )}
            </div>

            <div className="profile-stats">
              <div>
                <strong>{category.subscriberCount ?? 0}</strong>
                <span>Members</span>
              </div>
            </div>
            {user && (
              <Link className="btn btn-primary btn-block" to={`/r/${encodeURIComponent(category.name)}/submit`}>
                Create Post
              </Link>
            )}
          </div>

          {(rules.length > 0 || isOwner) && (
            <div className="side-card">
              <div className="side-card-head-row">
                <h3>r/{category.name} RULES</h3>
                {isOwner && <button className="icon-btn" onClick={addRule} title="Додати правило">➕</button>}
              </div>
              {rules.length === 0 && <p className="side-empty">Правил ще немає.</p>}
              <ol className="rules-list rules-list-collapsible">
                {rules.map((r, i) => (
                  <li key={i}>
                    <div className="rule-row">
                      <button className="rule-toggle" onClick={() => toggleRule(i)}>
                        <span>{i + 1}&nbsp;&nbsp;{r.title || r}</span>
                        <span className={`chevron ${rulesOpen[i] ? 'open' : ''}`}>˅</span>
                      </button>
                      {isOwner && (
                        <button className="icon-btn rule-remove" onClick={() => removeRule(i)} title="Видалити правило">🗑</button>
                      )}
                    </div>
                    {rulesOpen[i] && r.body && <p className="rule-body">{r.body}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {category.creator && (
            <div className="side-card">
              <h3>MODERATORS</h3>
              <button
                className="side-link static full-width"
                onClick={() => toast.info('Повідомлення модераторам поки не підтримується')}
              >
                ✉ Message Mods
              </button>
              <div className="mod-list">
                <Link
                  to={`/user/${category.creator.nickname || category.creator}`}
                  className="mod-row"
                >
                  <span className="avatar-dot small">{(category.creator.nickname || '?')[0]?.toUpperCase()}</span>
                  u/{category.creator.nickname || category.creator}
                </Link>
              </div>
            </div>
          )}
          <SideLegal />
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

      {modOpen && (
        <ModerationPanel category={category} onClose={() => setModOpen(false)} />
      )}
    </div>
  );
}