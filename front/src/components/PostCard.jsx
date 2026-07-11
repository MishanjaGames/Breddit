import { useState } from 'react';
import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import PostMenu from './PostMenu';
import AuthorBadge, { getAuthorRole } from './AuthorBadge';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(!!post.isSaved);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [joined, setJoined] = useState(!!post.category?.isSubscribed);

  const handleVote = async (value) => {
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  const toggleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/posts/${post._id}/save`);
      else await api.delete(`/posts/${post._id}/save`);
    } catch {
      setSaved(!next);
    } finally {
      setSaving(false);
    }
  };

  if (hidden) return null;

  const subName = post.category?.name;
  const authorName = post.author?.nickname || post.author?.username;
  const authorRole = getAuthorRole(post.author?._id || post.author, {
    postAuthorId: post.author?._id || post.author,
    moderators: post.category?.moderators,
  });
  const isPinned = post.pinned || post.isPinned;

  return (
    <article className={`post-card ${isPinned ? 'post-card-pinned' : ''}`}>
      <header className="post-card-head">
        <span className="sub-icon">{subName?.[0]?.toUpperCase() || '?'}</span>
        {subName && <Link to={`/r/${encodeURIComponent(subName)}`} className="post-sub-link">r/{subName}</Link>}
        {authorName && (
          <>
            <span className="post-dot">·</span>
            <Link to={`/user/${authorName}`} className="post-author-link">u/{authorName}</Link>
            <AuthorBadge role={authorRole} />
          </>
        )}
        <span className="post-dot">·</span>
        <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
        {isPinned && <span className="pinned-tag">📌 Закріплено</span>}
        {user && (
          <button
            className={`btn btn-sm join-btn ${joined ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => setJoined(!joined)}
          >
            {joined ? 'Приєднано' : 'Приєднатись'}
          </button>
        )}
        <PostMenu saved={saved} onSave={toggleSave} onHide={() => setHidden(true)} />
      </header>

      <Link to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`} className="post-title">
        {post.title}
      </Link>

      {post.description && <p className="post-desc">{post.description}</p>}

      <footer className="post-card-foot">
        <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
        <Link to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`} className="post-action-btn">
          💬 {post.commentCount ?? 0}
        </Link>
        <button className="post-action-btn">↗ Поширити</button>
        {user && (
          <button className="post-action-btn" onClick={toggleSave} disabled={saving}>
            {saved ? '🔖 Збережено' : '🔖 Зберегти'}
          </button>
        )}
      </footer>
    </article>
  );
}