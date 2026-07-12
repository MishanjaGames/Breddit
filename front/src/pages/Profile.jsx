import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { mediaUrl } from '../utils/media';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SideLegal from '../components/SideLegal';
import EditProfileModal from '../components/EditProfileModal';

const TABS = ['Пости', 'Про акаунт'];

function formatAge(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 30) return `${days} дн.`;
  if (days < 365) return `${Math.floor(days / 30)} міс.`;
  return `${Math.floor(days / 365)} р.`;
}

export default function Profile() {
  const { nickname } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const isOwn = user?.nickname === nickname;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [tab, setTab] = useState('Пости');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/users/${encodeURIComponent(nickname)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data.user);
        setFollowing(!!data.user?.isFollowing);
      })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [nickname]);

  useEffect(() => {
    let cancelled = false;
    setPostsLoading(true);
    api.get(`/posts/author/${encodeURIComponent(nickname)}`, { params: { limit: 100, sort: 'new' } })
      .then(({ data }) => {
        if (cancelled) return;
        setPosts(Array.isArray(data) ? data : (data.posts || []));
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setPostsLoading(false); });
    return () => { cancelled = true; };
  }, [nickname]);

  const toggleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.post(`/users/${encodeURIComponent(nickname)}/follow`);
      else await api.delete(`/users/${encodeURIComponent(nickname)}/follow`);
    } catch {
      setFollowing(!next);
      toast.error('Не вдалося оновити підписку');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleProfileSaved = (patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    toast.success('Профіль оновлено');
    // nickname change moves the profile URL, since the route is keyed on it
    if (patch.nickname && patch.nickname !== nickname) {
      navigate(`/user/${encodeURIComponent(patch.nickname)}`, { replace: true });
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!profile) return <p className="feed-status">Користувача не знайдено.</p>;

  const avatarSrc = mediaUrl(profile.avatar);
  const bannerSrc = mediaUrl(profile.banner);
  const totalKarma = (profile.postKarma ?? 0) + (profile.commentKarma ?? 0);
  const accountAge = profile.createdAt ? formatAge(profile.createdAt) : null;

  return (
    <div className="profile-page">
      <div className="profile-main">
        <div
          className="profile-banner"
          style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
        />
        <header className="profile-header">
          {avatarSrc ? (
            <img className="avatar-dot large" src={avatarSrc} alt="" />
          ) : (
            <span className="avatar-dot large">{nickname?.[0]?.toUpperCase()}</span>
          )}
          <div>
            <h1>{nickname}</h1>
            <span className="post-meta-text">u/{nickname}</span>
            {profile.status && <p className="profile-status-line">{profile.status}</p>}
          </div>
          {isOwn && (
            <button className="btn btn-outline btn-sm profile-edit-btn" onClick={() => setEditOpen(true)}>
              ✎ Редагувати профіль
            </button>
          )}
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

        {tab === 'Пости' && (
          <div className="post-list">
            {postsLoading && <p className="feed-status">Завантаження…</p>}
            {!postsLoading && posts.length === 0 && <p className="feed-status">Тут поки що нічого немає.</p>}
            {posts.map((item) => (
              <article key={item._id} className="post-card comment-item">
                <header className="post-card-head">
                  <span className="post-sub-link">r/{item.category?.name || 'невідомо'}</span>
                  <span className="post-dot">·</span>
                  <span className="post-meta-text">{timeAgo(item.createdAt)}</span>
                </header>
                <p className="post-desc">{item.title}</p>
              </article>
            ))}
          </div>
        )}

        {tab === 'Про акаунт' && (
          <div className="profile-content-note" style={{ display: 'block' }}>
            <p>{profile.bio || 'Опис відсутній.'}</p>
          </div>
        )}
      </div>

      <aside className="profile-side">
        <div className="side-card profile-card">
          <div className="profile-card-avatar">
            {avatarSrc ? (
              <img className="avatar-dot large" src={avatarSrc} alt="" />
            ) : (
              <span className="avatar-dot large">{nickname?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <h3>{nickname}</h3>
          <span className="post-meta-text">u/{nickname}</span>
          {profile.status && <p className="profile-status-line profile-status-line-centered">{profile.status}</p>}

          {isOwn && (
            <div className="profile-card-actions">
              <button className="btn btn-outline btn-sm btn-block" onClick={() => setEditOpen(true)}>
                ✎ Редагувати профіль
              </button>
            </div>
          )}

          {!isOwn && user && (
            <div className="profile-card-actions">
              <button
                className={`btn btn-sm btn-block ${following ? 'btn-outline' : 'btn-primary'}`}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {following ? 'Ви підписані' : 'Підписатись'}
              </button>
            </div>
          )}

          <div className="profile-stats">
            <div>
              <strong>{totalKarma}</strong>
              <span>Карма</span>
            </div>
            <div>
              <strong>{profile.postCount ?? 0}</strong>
              <span>Пости</span>
            </div>
            <div>
              <strong>{profile.commentCount ?? 0}</strong>
              <span>Коментарі</span>
            </div>
          </div>

          <div className="profile-stats">
            <div>
              <strong>{profile.followerCount ?? 0}</strong>
              <span>Підписники</span>
            </div>
            <div>
              <strong>{profile.followingCount ?? 0}</strong>
              <span>Підписки</span>
            </div>
            {accountAge && (
              <div>
                <strong>{accountAge}</strong>
                <span>Вік акаунта</span>
              </div>
            )}
          </div>
        </div>
        <SideLegal />
      </aside>

      {editOpen && (
        <EditProfileModal
          profile={{ ...profile, nickname }}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}