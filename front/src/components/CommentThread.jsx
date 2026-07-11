import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';
import AuthorBadge, { getAuthorRole } from './AuthorBadge';

export default function CommentThread({ comment, postAuthorId, moderators, depth = 0 }) {
  const { user } = useAuth();
  const [score, setScore] = useState(comment.karma ?? 0);
  const [myVote, setMyVote] = useState(comment.myVote || null);
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState(comment.replies || []);

  const authorName = comment.author?.nickname || comment.author?.username;
  const authorId = comment.author?._id || comment.author;
  const role = getAuthorRole(authorId, { postAuthorId, moderators });

  const vote = async (value) => {
    const next = myVote === value ? null : value;
    const prevScore = score;
    const prevVote = myVote;
    const delta = (next || 0) - (prevVote || 0);
    setScore(prevScore + delta);
    setMyVote(next);
    try {
      await api.post('/votes', { targetType: 'Comment', targetId: comment._id, value });
    } catch {
      setScore(prevScore);
      setMyVote(prevVote);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const { data } = await api.post(`/comments/${comment._id}/replies`, { text: replyText });
      setReplies((prev) => [data.comment || data, ...prev]);
      setReplyText('');
      setReplying(false);
    } catch { /* ignore */ }
  };

  return (
    <div className={`comment-node depth-${Math.min(depth, 6)}`}>
      <div className="comment">
        <div className="comment-head">
          <button
            className="comment-collapse"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Розгорнути' : 'Згорнути'}
          >
            {collapsed ? '[+]' : '[–]'}
          </button>
          {authorName && (
            <Link to={`/user/${authorName}`} className="comment-author">u/{authorName}</Link>
          )}
          <AuthorBadge role={role} />
          <span className="post-dot">·</span>
          <span className="post-meta-text">{timeAgo(comment.createdAt)}</span>
        </div>

        {!collapsed && (
          <>
            <p className="comment-text">{comment.text}</p>
            <div className="comment-actions">
              <div className="vote-pill vote-pill-mini">
                <button className={`vote-btn up ${myVote === 1 ? 'active' : ''}`} onClick={() => vote(1)} aria-label="Upvote">▲</button>
                <span className="vote-score">{score}</span>
                <button className={`vote-btn down ${myVote === -1 ? 'active' : ''}`} onClick={() => vote(-1)} aria-label="Downvote">▼</button>
              </div>
              {user && (
                <button className="comment-action-btn" onClick={() => setReplying((r) => !r)}>
                  💬 Відповісти
                </button>
              )}
              <button className="comment-action-btn">↗ Поширити</button>
            </div>

            {replying && (
              <form className="comment-form comment-reply-form" onSubmit={submitReply}>
                <textarea
                  autoFocus
                  placeholder={`Відповісти ${authorName ? `u/${authorName}` : ''}`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="comment-reply-form-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setReplying(false)}>
                    Скасувати
                  </button>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!replyText.trim()}>
                    Відповісти
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {!collapsed && replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => (
            <CommentThread
              key={r._id}
              comment={r}
              postAuthorId={postAuthorId}
              moderators={moderators}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}