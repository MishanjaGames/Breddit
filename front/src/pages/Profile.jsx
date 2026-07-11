import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { mediaUrl } from '../utils/media';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TABS = ['Пости', 'Про акаунт'];

export default function Profile() {
  const { nickname } = useParams();
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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

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
    // backend has no "posts by user" endpoint, so we page through /posts and filter client-side
    let cancelled = false;
    setPostsLoading(true);
    api.get('/posts', { params: { limit: 100, sort: 'new' } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data.posts || data || []).filter(
          (p) => (p.author?.nickname || p.author?.username) === nickname
        );
        setPosts(list);
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

  const uploadAvatar = async (file) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.put('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => ({ ...prev, avatar: data.avatar }));
      setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
      toast.success('Аватар оновлено');
    } catch {
      toast.error('Не вдалося завантажити аватар');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await api.delete('/users/me/avatar');
      setProfile((prev) => ({ ...prev, avatar: null }));
      setUser((prev) => (prev ? { ...prev, avatar: null } : prev));
      toast.success('Аватар видалено');
    } catch {
      toast.error('Не вдалося видалити аватар');
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!profile) return <p className="feed-status">Користувача не знайдено.</p>;

  const avatarSrc = mediaUrl(profile.avatar);
  const totalKarma = (profile.postKarma ?? 0) + (profile.commentKarma ?? 0);

  return (
    <div className="profile-page">
      <div className="profile-main">
        <header className="profile-header">
          {avatarSrc ? (
            <img className="avatar-dot large" src={avatarSrc} alt="" />
          ) : (
            <span className="avatar-dot large">{nickname?.[0]?.toUpperCase()}</span>
          )}
          <div>
            <h1>{nickname}</h1>
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

          {isOwn && (
            <div className="profile-card-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />
              <button
                className="btn btn-outline btn-sm btn-block"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
              >
                Змінити аватар
              </button>
              {profile.avatar && (
                <button className="btn btn-ghost btn-sm btn-block" onClick={removeAvatar} disabled={avatarBusy}>
                  Прибрати аватар
                </button>
              )}
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
          </div>
        </div>
      </aside>
    </div>
  );
}
