import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import VoteButtons from '../components/VoteButtons';
import CommentTree from '../components/CommentTree';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function insertReply(comments, parentId, reply) {
  return comments.map((c) => {
    if (c.id === parentId) return { ...c, replies: [...(c.replies || []), reply] };
    if (c.replies?.length) return { ...c, replies: insertReply(c.replies, parentId, reply) };
    return c;
  });
}

export default function PostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [sort, setSort] = useState('best');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/posts/${id}`).then(({ data }) => setPost({ ...data.post, myVote: data.myVote }));
  }, [id]);

  useEffect(() => {
    api.get(`/posts/${id}/comments`, { params: { sort } }).then(({ data }) => setComments(data.comments));
  }, [id, sort]);

  const handleVote = async (value) => {
    const { data } = await api.post(`/posts/${id}/vote`, { value });
    return data;
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content: text, parentId: null });
      setComments([data.comment, ...comments]);
      setText('');
      success('Коментар успішно додано!');
    } catch (err) {
      error('Помилка при додаванні коментаря');
    } finally {
      setSubmitting(false);
    }
  };

  const onReplyAdded = (parentId, reply) => setComments(insertReply(comments, parentId, reply));

  if (!post) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-8 mx-auto mt-3">
      <div className="card mb-3">
        <div className="card-body d-flex gap-3">
          <VoteButtons score={post.score} myVote={post.myVote} onVote={handleVote} />
          <div>
            <div className="small text-secondary">
              <Link to={`/r/${post.subreddit?.name}`}>r/{post.subreddit?.name}</Link> · u/{post.author?.username}
            </div>
            <h5>{post.title}</h5>
            {post.content && <p>{post.content}</p>}
            {post.url && <a href={post.url} target="_blank" rel="noreferrer">{post.url}</a>}
            {post.mediaUrl && <img src={post.mediaUrl} alt="" className="img-fluid rounded mt-2" />}
          </div>
        </div>
      </div>

      {user && (
        <form onSubmit={submitComment} className="mb-3">
          <textarea 
            className="form-control mb-2" 
            rows={3} 
            placeholder="Написати коментар..."
            disabled={submitting}
            value={text} 
            onChange={(e) => setText(e.target.value)} 
          />
          <button 
            className="btn btn-primary btn-sm" 
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Завантаження...' : 'Коментувати'}
          </button>
        </form>
      )}

      <select className="form-select form-select-sm w-auto mb-3" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="best">Best</option>
        <option value="new">New</option>
        <option value="top">Top</option>
      </select>

      <CommentTree comments={comments} postId={id} onReplyAdded={onReplyAdded} />
    </div>
  );
}
