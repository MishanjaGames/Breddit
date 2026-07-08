import { useState } from 'react';
import VoteButtons from './VoteButtons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function Comment({ comment, postId, onReplyAdded }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');

  const handleVote = async (value) => {
    const { data } = await api.post(`/comments/${comment.id}/vote`, { value });
    return data;
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await api.post(`/posts/${postId}/comments`, { content: text, parentId: comment.id });
    onReplyAdded(comment.id, data.comment);
    setText('');
    setReplying(false);
  };

  return (
    <div className="border-start ps-3 mb-2">
      <div className="d-flex gap-2">
        <VoteButtons score={comment.score} myVote={comment.myVote} onVote={handleVote} vertical={false} />
        <div className="flex-grow-1">
          <div className="small text-secondary">u/{comment.author?.username}</div>
          <div>{comment.content}</div>
          {user && (
            <button className="btn btn-link btn-sm p-0" onClick={() => setReplying(!replying)}>
              Відповісти
            </button>
          )}
          {replying && (
            <form onSubmit={submitReply} className="mt-1">
              <textarea className="form-control form-control-sm" rows={2} value={text}
                onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-sm btn-primary mt-1" type="submit">Надіслати</button>
            </form>
          )}
          {comment.replies?.map((r) => (
            <Comment key={r.id} comment={r} postId={postId} onReplyAdded={onReplyAdded} />
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
        <Comment key={c.id} comment={c} postId={postId} onReplyAdded={onReplyAdded} />
      ))}
    </div>
  );
}
