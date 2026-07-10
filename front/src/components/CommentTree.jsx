import { useState } from 'react';
import VoteButtons from './VoteButtons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Comment({ comment, postId, onReplyAdded }) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (value) => {
    // backend: POST /api/votes { targetType: 'Comment', targetId, value }
    await api.post('/votes', { targetType: 'Comment', targetId: comment._id, value });
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      // backend: POST /api/comments { text, post, parentComment }
      const { data } = await api.post('/comments', { text, post: postId, parentComment: comment._id });
      onReplyAdded(comment._id, data);
      setText('');
      setReplying(false);
      success('Відповідь успішно додана!');
    } catch (err) {
      error('Помилка при додаванні відповіді');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-start ps-3 mb-2">
      <div className="d-flex gap-2">
        <VoteButtons score={comment.karma} myVote={comment.myVote} onVote={handleVote} vertical={false} />
        <div className="flex-grow-1">
          <div className="small text-secondary">u/{comment.author?.nickname}</div>
          <div>{comment.text}</div>
          {user && (
            <button
              className="btn btn-link btn-sm p-0"
              onClick={() => setReplying(!replying)}
            >
              Відповісти
            </button>
          )}
          {replying && (
            <form onSubmit={submitReply} className="mt-1">
              <textarea
                className="form-control form-control-sm"
                rows={2}
                disabled={submitting}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                className="btn btn-sm btn-primary mt-1"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Завантаження...' : 'Надіслати'}
              </button>
            </form>
          )}
          {comment.replies?.map((r) => (
            <Comment key={r._id} comment={r} postId={postId} onReplyAdded={onReplyAdded} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CommentTree({ comments, postId, onReplyAdded }) {
  return (
    <div>
      {comments.map((c) => (
        <Comment key={c._id} comment={c} postId={postId} onReplyAdded={onReplyAdded} />
      ))}
    </div>
  );
}