import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import VoteButtons from '../components/VoteButtons';
import PostMenu from '../components/PostMenu';
import AuthorBadge, { getAuthorRole } from '../components/AuthorBadge';
import CommentThread from '../components/CommentThread';
import MediaGallery from '../components/MediaGallery';
import MediaPicker from '../components/MediaPicker';
import { buildCommentTree } from '../utils/commentTree';
import timeAgo from '../utils/timeAgo';
import MarkdownText from '../utils/markdown.jsx';
import MarkdownEditor from '../components/MarkdownEditor';
import { useAuth } from '../context/AuthContext';

const COMMENT_SORTS = { best: 'Best', new: 'New', old: 'Old', top: 'Top' };

export default function Post() {
  const { name, title } = useParams();
  const { user } = useAuth();
  const [category, setCategory] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [commentSort, setCommentSort] = useState('best');
  const [commentSearch, setCommentSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then(async (cat) => {
      if (!cat || cancelled) return;
      setCategory(cat);
      const { data } = await api.get(`/posts/category/${cat._id}`, { params: { limit: 300 } });
      const list = Array.isArray(data) ? data : (data.posts || []);
      const filtered = list.filter((p) => (p.category?._id || p.category) === cat._id);
      const found = filtered.find((p) => p.title === decodeURIComponent(title));
      if (!cancelled) {
        setPost(found || null);
        setSaved(!!found?.isSaved);
        if (found) {
          try {
            const prev = JSON.parse(localStorage.getItem('recentPosts') || '[]');
            const entry = { _id: found._id, title: found.title, subName: name, createdAt: found.createdAt };
            const next = [entry, ...prev.filter((p) => p._id !== found._id)].slice(0, 10);
            localStorage.setItem('recentPosts', JSON.stringify(next));
          } catch { /* ignore */ }
        }
      }
      if (found) {
        api.get(`/comments/post/${found._id}`)
          .then(({ data }) => { if (!cancelled) setComments(data || []); })
          .catch(() => {});
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, title]);

  const handleVote = async (value) => {
    if (!post) return;
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  const toggleSave = async () => {
    if (!user || !post) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/posts/${post._id}/save`);
      else await api.delete(`/posts/${post._id}/save`);
    } catch {
      setSaved(!next);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim() || !post) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append('text', text);
      form.append('post', post._id);
      files.forEach((f) => form.append('media', f));

      const { data } = await api.post('/comments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setComments((prev) => [data, ...prev]);
      setText('');
      setFiles([]);
    } catch { /* ignore */ } finally {
      setPosting(false);
    }
  };

  const addReply = (newComment) => {
    setComments((prev) => [newComment, ...prev]);
  };

  const images = useMemo(() => post?.media || [], [post]);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const sortedComments = useMemo(() => {
    let list = [...commentTree];
    if (commentSearch.trim()) {
      const q = commentSearch.trim().toLowerCase();
      list = list.filter((c) => (c.text || '').toLowerCase().includes(q));
    }
    if (commentSort === 'new') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (commentSort === 'old') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (commentSort === 'top' || commentSort === 'best') {
      list.sort((a, b) => (b.karma ?? 0) - (a.karma ?? 0));
    }
    return list;
  }, [commentTree, commentSort, commentSearch]);

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!post) return <p className="feed-status">Пост не знайдено.</p>;

  const authorName = post.author?.nickname || post.author?.username;
  const authorRole = getAuthorRole(post.author?._id || post.author, {
    postAuthorId: post.author?._id || post.author,
  });

  return (
    <div className="post-detail-layout">
      <div className="post-page">
        <Link to={`/r/${encodeURIComponent(name)}`} className="back-link">← Назад</Link>
        <article className="post-card post-card-full">
          <header className="post-card-head">
            <span className="sub-icon">{name?.[0]?.toUpperCase()}</span>
            <Link to={`/r/${encodeURIComponent(name)}`} className="post-sub-link">r/{name}</Link>
            {authorName && (
              <>
                <span className="post-dot">·</span>
                <Link to={`/user/${authorName}`} className="post-author-link">u/{authorName}</Link>
                <AuthorBadge role={authorRole} />
              </>
            )}
            <span className="post-dot">·</span>
            <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
            <div className="post-card-head-spacer" />
            <PostMenu saved={saved} onSave={toggleSave} onHide={() => {}} />
          </header>

          <h1 className="post-title-full">{post.title}</h1>

          <MediaGallery media={images} />

          {post.description && <MarkdownText className="post-desc" text={post.description} />}

          <footer className="post-card-foot">
            <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
            <span className="post-action-btn">💬 {comments.length}</span>
            <button className="post-action-btn">↗ Поширити</button>
          </footer>
        </article>

        {user && (
          <form className="comment-form" onSubmit={submitComment}>
            <MarkdownEditor
              placeholder="Приєднатись до обговорення"
              value={text}
              onChange={setText}
              minRows={3}
            />
            <MediaPicker files={files} onChange={setFiles} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!text.trim() || posting}>
              {posting ? 'Публікація…' : 'Коментувати'}
            </button>
          </form>
        )}

        <div className="comment-toolbar">
          <div className="sort-dropdown comment-sort-dropdown">
            <label className="comment-sort-label">
              Sort by:
              <select
                className="comment-sort-select"
                value={commentSort}
                onChange={(e) => setCommentSort(e.target.value)}
              >
                {Object.entries(COMMENT_SORTS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="comment-search">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              placeholder="Search Comments"
              value={commentSearch}
              onChange={(e) => setCommentSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="comment-list comment-list-threaded">
          {sortedComments.length === 0 && <p className="feed-status">Коментарів ще немає.</p>}
          {sortedComments.map((c) => (
            <CommentThread
              key={c._id}
              comment={c}
              postAuthorId={post.author?._id || post.author}
              onReplyAdded={addReply}
              depth={0}
            />
          ))}
        </div>
      </div>

      {category && (
        <aside className="community-side">
          <div className="side-card community-about-card">
            <h3>r/{category.name}</h3>
            <p>{category.description || 'Опис відсутній.'}</p>

            <div className="community-meta-list">
              {category.createdAt && (
                <span className="community-meta-row">
                  <span className="side-icon">🗓</span> Created {new Date(category.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <div className="profile-stats">
              <div>
                <strong>{category.subscriberCount ?? 0}</strong>
                <span>Members</span>
              </div>
            </div>

            <Link className="btn btn-outline btn-block" to={`/r/${encodeURIComponent(category.name)}`}>
              Перейти до спільноти
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}