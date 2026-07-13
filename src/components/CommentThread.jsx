import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import AuthorBadge, { getAuthorRole } from './AuthorBadge';
import MediaGallery from './MediaGallery';
import MediaPicker from './MediaPicker';
import MarkdownEditor from './MarkdownEditor';
import MarkdownText from '../utils/markdown.jsx';

export default function CommentThread({ comment, postAuthorId, onReplyAdded, onDeleted, isModerator, depth = 0, targetCommentId }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [score, setScore] = useState(comment.karma ?? 0);
  const [myVote, setMyVote] = useState(comment.myVote || null);
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const replies = comment.replies || [];

  const authorName = comment.author?.nickname || comment.author?.username;
  const authorId = comment.author?._id || comment.author;
  const role = getAuthorRole(authorId, { postAuthorId });
  const isOwnComment = !!user && authorId === user._id;
  const canDelete = !comment.isDeleted && (isOwnComment || isModerator);

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
    setPosting(true);
    try {
      const form = new FormData();
      form.append('text', replyText);
      form.append('post', comment.post);
      form.append('parentComment', comment._id);
      replyFiles.forEach((f) => form.append('media', f));

      const { data } = await api.post('/comments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onReplyAdded?.(data);
      setReplyText('');
      setReplyFiles([]);
      setReplying(false);
    } catch { /* ignore */ } finally {
      setPosting(false);
    }
  };

  const deleteComment = async () => {
    const ok = await confirm.confirm('Видалити цей коментар?');
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/comments/${comment._id}`);
      onDeleted?.(comment._id);
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`comment-node depth-${Math.min(depth, 6)} ${targetCommentId === comment._id ? 'comment-target' : ''}`}
      id={`comment-${comment._id}`}
    >
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
            <Link to={`/u/${authorName}`} className="comment-author">u/{authorName}</Link>
          )}
          <AuthorBadge role={role} />
          <span className="post-dot">·</span>
          <span className="post-meta-text">{timeAgo(comment.createdAt)}</span>
        </div>

        {!collapsed && (
          <>
            <MarkdownText
              className={`comment-text ${comment.isDeleted ? 'comment-text-deleted' : ''}`}
              text={comment.text}
            />
            {!comment.isDeleted && <MediaGallery media={comment.media} />}
            {!comment.isDeleted && (
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
                {canDelete && (
                  <button className="comment-action-btn comment-action-danger" onClick={deleteComment} disabled={deleting}>
                    🗑 {deleting ? 'Видалення…' : 'Видалити'}
                  </button>
                )}
              </div>
            )}

            {replying && (
              <form className="comment-form comment-reply-form" onSubmit={submitReply}>
                <MarkdownEditor
                  autoFocus
                  minRows={3}
                  placeholder={`Відповісти ${authorName ? `u/${authorName}` : ''}`}
                  value={replyText}
                  onChange={setReplyText}
                />
                <MediaPicker files={replyFiles} onChange={setReplyFiles} />
                <div className="comment-reply-form-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setReplying(false)}>
                    Скасувати
                  </button>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!replyText.trim() || posting}>
                    {posting ? '…' : 'Відповісти'}
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
              onReplyAdded={onReplyAdded}
              onDeleted={onDeleted}
              isModerator={isModerator}
              depth={depth + 1}
              targetCommentId={targetCommentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}