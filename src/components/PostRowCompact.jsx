import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import PostMenu from './PostMenu';
import AuthorBadge, { getAuthorRole } from './AuthorBadge';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { mediaUrl } from '../utils/media';
import { useAuth } from '../context/AuthContext';
import { useCardNavigate } from '../utils/cardNavigate';
import { useState } from 'react';

export default function PostRowCompact({ post }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(!!post.isSaved);
  const [hidden, setHidden] = useState(false);
  const subName = post.category?.name;
  const authorName = post.author?.nickname || post.author?.username;
  const authorRole = getAuthorRole(post.author?._id || post.author, {
    postAuthorId: post.author?._id || post.author,
  });
  const isPinned = post.pinned || post.isPinned;
  // thumbnail: first image/video block from the new content array, falling back to the legacy media[]
  const firstMedia = post.content?.find((b) => b.type === 'image' || b.type === 'video') || post.media?.[0];
  const thumb = firstMedia?.type === 'video' ? null : mediaUrl(firstMedia?.url);
  const postUrl = `/r/${encodeURIComponent(subName)}/p/${encodeURIComponent(post.title)}`;
  const handleRowClick = useCardNavigate(postUrl);

  const handleVote = async (value) => {
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  const toggleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/posts/${post._id}/save`);
      else await api.delete(`/posts/${post._id}/save`);
    } catch {
      setSaved(!next);
    }
  };

  if (hidden) return null;

  return (
    <article
      className={`post-row-compact post-card-clickable ${isPinned ? 'post-card-pinned' : ''}`}
      onClick={handleRowClick}
    >
      <VoteButtons vertical score={post.karma} myVote={post.myVote} onVote={handleVote} />
      {thumb ? (
        <img className="compact-thumb" src={thumb} alt="" />
      ) : (
        <div className="compact-thumb compact-thumb-placeholder">{subName?.[0]?.toUpperCase() || '?'}</div>
      )}
      <div className="compact-body">
        <div className="compact-meta">
          {subName && <Link to={`/r/${encodeURIComponent(subName)}`} className="post-sub-link">r/{subName}</Link>}
          {authorName && (
            <span className="post-author-hide-group">
              <span className="post-dot">·</span>
              <Link to={`/u/${authorName}`} className="post-author-link">u/{authorName}</Link>
              <AuthorBadge role={authorRole} />
            </span>
          )}
          <span className="post-dot">·</span>
          <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
          {isPinned && <span className="pinned-tag">📌</span>}
        </div>
        <Link to={postUrl} className="compact-title">
          {post.title}
        </Link>
        <div className="compact-actions">
          <Link to={postUrl} className="post-action-btn">
            💬 {post.commentCount ?? 0}
          </Link>
          <Link to={`${postUrl}/repost`} className="post-action-btn">↗ Поширити</Link>
          <PostMenu saved={saved} onSave={toggleSave} onHide={() => setHidden(true)} />
        </div>
      </div>
    </article>
  );
}
