import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import VoteButtons from '../components/VoteButtons';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

export default function Post() {
  const { name, title } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then(async (cat) => {
      if (!cat || cancelled) return;
      const { data } = await api.get('/posts', { params: { category: cat._id } });
      const list = data.posts || data || [];
      const found = list.find((p) => p.title === decodeURIComponent(title));
      if (!cancelled) setPost(found || null);
      if (found) {
        api.get(`/posts/${found._id}/comments`)
          .then(({ data }) => { if (!cancelled) setComments(data.comments || data || []); })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, title]);

  const handleVote = async (value) => {
    if (!post) return;
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim() || !post) return;
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text });
      setComments((prev) => [data.comment || data, ...prev]);
      setText('');
    } catch { /* ignore */ }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!post) return <p className="feed-status">Пост не знайдено.</p>;

  return (
    <div className="post-page">
      <article className="post-card post-card-full">
        <header className="post-card-head">
          <span className="sub-icon">{name?.[0]?.toUpperCase()}</span>
          <Link to={`/r/${encodeURIComponent(name)}`} className="post-sub-link">r/{name}</Link>
          <span className="post-dot">·</span>
          <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
        </header>
        <h1 className="post-title-full">{post.title}</h1>
        {post.description && <p className="post-desc">{post.description}</p>}
        <footer className="post-card-foot">
          <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
          <span className="post-action-btn">💬 {comments.length}</span>
          <button className="post-action-btn">↗ Поширити</button>
        </footer>
      </article>

      {user && (
        <form className="comment-form" onSubmit={submitComment}>
          <textarea
            placeholder="Що ви думаєте?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!text.trim()}>
            Коментувати
          </button>
        </form>
      )}

      <div className="comment-list">
        {comments.length === 0 && <p className="feed-status">Коментарів ще немає.</p>}
        {comments.map((c) => (
          <div key={c._id} className="comment">
            <div className="comment-head">
              <span className="comment-author">u/{c.author?.nickname || 'anon'}</span>
              <span className="post-dot">·</span>
              <span className="post-meta-text">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="comment-text">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}