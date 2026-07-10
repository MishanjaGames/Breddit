import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import VoteButtons from '../components/VoteButtons';
import CommentTree from '../components/CommentTree';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// backend returns comments as a FLAT list (each has parentComment), not nested.
// Build the reply tree client-side.
function buildTree(flatComments) {
  const byId = {};
  flatComments.forEach((c) => { byId[c._id] = { ...c, replies: [] }; });
  const roots = [];
  flatComments.forEach((c) => {
    if (c.parentComment && byId[c.parentComment]) {
      byId[c.parentComment].replies.push(byId[c._id]);
    } else {
      roots.push(byId[c._id]);
    }
  });
  return roots;
}

function insertReply(comments, parentId, reply) {
  return comments.map((c) => {
    if (c._id === parentId) return { ...c, replies: [...(c.replies || []), { ...reply, replies: [] }] };
    if (c.replies?.length) return { ...c, replies: insertReply(c.replies, parentId, reply) };
    return c;
  });
}

export default function PostPage() {
  const { name, postName } = useParams();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setNotFound(false);
    (async () => {
      // backend has no get-post-by-title endpoint, so resolve category -> post list -> match title
      const category = await resolveCategoryByName(name);
      if (!category) { if (!cancelled) setNotFound(true); return; }
      const { data: posts } = await api.get(`/posts/category/${category._id}`);
      const found = posts.find((p) => p.title === postName);
      if (!found) { if (!cancelled) setNotFound(true); return; }
      // backend: GET /api/posts/:id -> full post object directly
      const { data: full } = await api.get(`/posts/${found._id}`);
      if (!cancelled) setPost({ ...full, category: full.category || category });
    })();
    return () => { cancelled = true; };
  }, [name, postName]);

  useEffect(() => {
    if (!post) return;
    // backend: GET /api/comments/post/:postId -> flat array
    api.get(`/comments/post/${post._id}`).then(({ data }) => setComments(buildTree(data)));
  }, [post]);

  const handleVote = async (value) => {
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      // backend: POST /api/comments { text, post, parentComment }
      const { data } = await api.post('/comments', { text, post: post._id, parentComment: null });
      setComments([{ ...data, replies: [] }, ...comments]);
      setText('');
      success('Коментар успішно додано!');
    } catch (err) {
      error('Помилка при додаванні коментаря');
    } finally {
      setSubmitting(false);
    }
  };

  const onReplyAdded = (parentId, reply) => setComments(insertReply(comments, parentId, reply));

  if (notFound) return <p className="mt-4 text-center text-secondary">Пост не знайдено.</p>;
  if (!post) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-8 mx-auto mt-3">
      <div className="card mb-3">
        <div className="card-body d-flex gap-3">
          <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
          <div className="flex-grow-1">
            <div className="small text-secondary">
              <Link to={`/r/${encodeURIComponent(post.category?.name)}`}>r/{post.category?.name}</Link> · u/{post.author?.nickname}
            </div>
            <h5 className="mb-0">{post.title}</h5>
            <p className="mt-2">{post.description}</p>
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

      <CommentTree comments={comments} postId={post._id} onReplyAdded={onReplyAdded} />
    </div>
  );
}
