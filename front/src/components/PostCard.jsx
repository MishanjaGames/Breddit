import { useState } from 'react';
import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(!!post.isSaved);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="card mb-2">
      <div className="card-body d-flex gap-2 py-2 px-2">
        <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
        <div className="flex-grow-1 min-w-0">
          <div className="post-meta mb-1">
            {subName && (
              <>
                <span className="sub-icon me-1">{subName[0]?.toUpperCase()}</span>
                <Link to={`/r/${encodeURIComponent(subName)}`}>r/{subName}</Link>
              </>
            )}
            <span className="mx-1">·</span>
            Опубліковано u/{post.author?.nickname} {timeAgo(post.createdAt)}
          </div>
          <Link
            to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`}
            className="post-title text-decoration-none d-block"
          >
            {post.title}
          </Link>
          {post.description && (
            <p className="small text-secondary mb-1 mt-1" style={{
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {post.description}
            </p>
          )}
          <div className="d-flex gap-1 mt-1">
            <Link to={`/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`} className="post-action-btn text-decoration-none">
              💬 {post.commentCount ?? 0} коментарів
            </Link>
            <button className="post-action-btn">↗ Поділитись</button>
            {user && (
              <button className="post-action-btn" onClick={toggleSave} disabled={saving}>
                {saved ? '🔖 Збережено' : '🔖 Зберегти'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
