import { useState } from 'react';
import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import PostMenu from './PostMenu';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(!!post.isSaved);
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(!!post.category?.isSubscribed);
  const [hidden, setHidden] = useState(false);

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

  const subName = post.category?.name;

  const trackRecent = () => {
    if (!post._id) return;
    try {
      const list = JSON.parse(localStorage.getItem('recentPosts') || '[]');
      const entry = { _id: post._id, title: post.title, subName, createdAt: post.createdAt };
      const next = [entry, ...list.filter((p) => p._id !== post._id)].slice(0, 8);
      localStorage.setItem('recentPosts', JSON.stringify(next));
    } catch { /* ignore */ }
    if (!subName) return;
    try {
      const list = JSON.parse(localStorage.getItem('recentCommunities') || '[]');
      const next = [subName, ...list.filter((n) => n !== subName)].slice(0, 5);
      localStorage.setItem('recentCommunities', JSON.stringify(next));
    } catch { /* ignore */ }
  };

  if (hidden) return null;

  return (
    <article className="post-card">
      <header className="post-card-head">
        <span className="sub-icon">{subName?.[0]?.toUpperCase() || '?'}</span>
        {subName && <Link to={`/r/${encodeURIComponent(subName)}`} onClick={trackRecent} className="post-sub-link">r/{subName}</Link>}
        <span className="post-dot">·</span>
        <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
        {user ? (
          <button
            className={`btn btn-sm join-btn ${joined ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => setJoined(!joined)}
          >
            {joined ? 'Приєднано' : 'Приєднатись'}
          </button>
        ) : (
          <button className="btn btn-sm btn-primary join-btn">Приєднатися</button>
        )}
        <PostMenu saved={saved} onSave={toggleSave} onHide={() => setHidden(true)} />
      </header>

      <Link to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`} onClick={trackRecent} className="post-title">
        {post.title}
      </Link>

      {post.description && <p className="post-desc">{post.description}</p>}

      <footer className="post-card-foot">
        <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
        <Link to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`} className="post-action-btn">
          💬 {post.commentCount ?? 0}
        </Link>
        <button className="post-action-btn">↗ Поширити</button>
      </footer>
    </article>
  );
}