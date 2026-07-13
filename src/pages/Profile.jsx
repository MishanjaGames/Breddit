import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { mediaUrl } from '../utils/media';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SideLegal from '../components/SideLegal';
import EditProfileModal from '../components/EditProfileModal';
import PostCard from '../components/PostCard';
import ProfileCommentCard from '../components/ProfileCommentCard';

const TABS = ['Пости', 'Коментарі'];
const PAGE_SIZE = 20;

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function Profile() {
  const { nickname } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const isOwn = user?.nickname === nickname;
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('Пости');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('posts'); // 'posts' | 'about' — only used below 900px

  // posts tab state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  // comments tab state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);

  const postsSentinelRef = useRef(null);
  const commentsSentinelRef = useRef(null);

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
    setPosts([]);
    setPostsPage(1);
    api.get(`/posts/author/${encodeURIComponent(nickname)}`, { params: { limit: PAGE_SIZE, page: 1, sort: 'new' } })
      .then(({ data }) => {
        if (cancelled) return;
        setPosts(Array.isArray(data) ? data : (data.posts || []));
        setPostsTotalPages(data.totalPages || 1);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setPostsLoading(false); });
    return () => { cancelled = true; };
  }, [nickname]);

  useEffect(() => {
    let cancelled = false;
    setCommentsLoading(true);
    setComments([]);
    setCommentsPage(1);
    api.get(`/comments/author/${encodeURIComponent(nickname)}`, { params: { limit: PAGE_SIZE, page: 1 } })
      .then(({ data }) => {
        if (cancelled) return;
        setComments(data.comments || []);
        setCommentsTotalPages(data.totalPages || 1);
      })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });
    return () => { cancelled = true; };
  }, [nickname]);

  const loadMorePosts = useCallback(() => {
    if (postsLoadingMore || postsPage >= postsTotalPages) return;
    const nextPage = postsPage + 1;
    setPostsLoadingMore(true);
    api.get(`/posts/author/${encodeURIComponent(nickname)}`, { params: { limit: PAGE_SIZE, page: nextPage, sort: 'new' } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.posts || []);
        setPosts((prev) => [...prev, ...list]);
        setPostsPage(nextPage);
        setPostsTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setPostsLoadingMore(false));
  }, [nickname, postsPage, postsTotalPages, postsLoadingMore]);

  const loadMoreComments = useCallback(() => {
    if (commentsLoadingMore || commentsPage >= commentsTotalPages) return;
    const nextPage = commentsPage + 1;
    setCommentsLoadingMore(true);
    api.get(`/comments/author/${encodeURIComponent(nickname)}`, { params: { limit: PAGE_SIZE, page: nextPage } })
      .then(({ data }) => {
        setComments((prev) => [...prev, ...(data.comments || [])]);
        setCommentsPage(nextPage);
        setCommentsTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setCommentsLoadingMore(false));
  }, [nickname, commentsPage, commentsTotalPages, commentsLoadingMore]);

  useEffect(() => {
    const el = postsSentinelRef.current;
    if (!el || tab !== 'Пости') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMorePosts();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMorePosts, tab]);

  useEffect(() => {
    const el = commentsSentinelRef.current;
    if (!el || tab !== 'Коментарі') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreComments();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMoreComments, tab]);

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
      navigate(`/u/${encodeURIComponent(patch.nickname)}`, { replace: true });
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!profile) return <p className="feed-status">Користувача не знайдено.</p>;

  const avatarSrc = mediaUrl(profile.avatar);
  const bannerSrc = mediaUrl(profile.banner);
  const totalKarma = (profile.postKarma ?? 0) + (profile.commentKarma ?? 0);
  const registrationDate = profile.createdAt ? formatDate(profile.createdAt) : null;
  const profileUpdatedRecently = profile.updatedAt && profile.createdAt && profile.updatedAt !== profile.createdAt;

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

        <div className={mobileTab === 'about' ? 'community-mobile-hidden' : ''}>
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

        <hr/>

        {tab === 'Пости' && (
          <div className="post-list">
            {postsLoading && <p className="feed-status">Завантаження…</p>}
            {!postsLoading && posts.length === 0 && <p className="feed-status">Тут поки що нічого немає.</p>}
            {posts.map((item) => (
              <PostCard key={item._id} post={item} />
            ))}
            <div ref={postsSentinelRef} />
            {postsLoadingMore && <p className="feed-status">Завантаження…</p>}
          </div>
        )}

        {tab === 'Коментарі' && (
          <div className="post-list">
            {commentsLoading && <p className="feed-status">Завантаження…</p>}
            {!commentsLoading && comments.length === 0 && <p className="feed-status">Тут поки що нічого немає.</p>}
            {comments.map((item) => (
              <ProfileCommentCard key={item._id} comment={item} />
            ))}
            <div ref={commentsSentinelRef} />
            {commentsLoadingMore && <p className="feed-status">Завантаження…</p>}
          </div>
        )}
        </div>
      </div>

      <aside className={`profile-side ${mobileTab === 'about' ? 'community-mobile-visible' : ''}`}>
        <div className="side-card profile-card profile-card-v2">
          <div
            className="profile-card-banner"
            style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
          />

          <div className="profile-card-body profile-card-body-noavatar">
            <h3>{nickname}</h3>
            {profile.status && <p className="profile-status-line profile-status-line-centered">{profile.status}</p>}

            <div className="profile-card-actions profile-card-actions-row">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href).catch(() => {});
                  toast.success('Посилання скопійовано');
                }}
              >
                ⇗ Поділитись
              </button>
              {isOwn && (
                <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
                  ✎ Редагувати
                </button>
              )}
              {!isOwn && user && (
                <button
                  className={`btn btn-sm ${following ? 'btn-outline' : 'btn-primary'}`}
                  onClick={toggleFollow}
                  disabled={followBusy}
                >
                  {following ? 'Ви підписані' : 'Підписатись'}
                </button>
              )}
            </div>

            <p className="profile-follower-line">{profile.followerCount ?? 0} підписників</p>

            {profile.bio && (
              <div className="profile-bio-block">
                <strong>About me</strong>
                <p className="community-desc" style={{ padding: 0, margin: 0 }}>{profile.bio}</p>
              </div>
            )}

            <div className="profile-stats-grid">
              <div className="profile-stats-cell">
                <strong>{totalKarma}</strong>
                <span>Карма</span>
              </div>
              <div className="profile-stats-cell">
                <strong>{(profile.postCount ?? 0) + (profile.commentCount ?? 0)}</strong>
                <span>Внесок</span>
              </div>
              {registrationDate && (
                <div className="profile-stats-cell">
                  <strong>{registrationDate}</strong>
                  <span>Дата реєстрації</span>
                </div>
              )}
              <div className="profile-stats-cell">
                <strong>{profile.followingCount ?? 0}</strong>
                <span>Підписки &gt;</span>
              </div>
            </div>

            {profileUpdatedRecently && (
              <p className="edited-label" style={{ marginTop: 4 }}>
                Профіль оновлено {timeAgo(profile.updatedAt)}
              </p>
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
