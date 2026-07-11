import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import VoteButtons from '../components/VoteButtons';
import PostMenu from '../components/PostMenu';
import AuthorBadge, { getAuthorRole } from '../components/AuthorBadge';
import CommentThread from '../components/CommentThread';
import timeAgo from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

const COMMENT_SORTS = { best: 'Best', new: 'New', old: 'Old', top: 'Top' };

export default function Post() {
  const { name, title } = useParams();
  const { user } = useAuth();
  const [category, setCategory] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [commentSort, setCommentSort] = useState('best');
  const [commentSearch, setCommentSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then(async (cat) => {
      if (!cat || cancelled) return;
      setCategory(cat);
      const { data } = await api.get('/posts', { params: { category: cat._id } });
      const list = data.posts || data || [];
      const filtered = list.filter((p) => (p.category?._id || p.category) === cat._id);
      const found = filtered.find((p) => p.title === decodeURIComponent(title));
      if (!cancelled) {
        setPost(found || null);
        setSaved(!!found?.isSaved);
      }
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
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text });
      setComments((prev) => [data.comment || data, ...prev]);
      setText('');
    } catch { /* ignore */ }
  };

  const images = useMemo(() => {
    if (Array.isArray(post?.images) && post.images.length) return post.images;
    if (post?.thumbnail) return [post.thumbnail];
    return [];
  }, [post]);

  const sortedComments = useMemo(() => {
    let list = [...comments];
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
  }, [comments, commentSort, commentSearch]);

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!post) return <p className="feed-status">Пост не знайдено.</p>;

  const authorName = post.author?.nickname || post.author?.username;
  const authorRole = getAuthorRole(post.author?._id || post.author, {
    postAuthorId: post.author?._id || post.author,
    moderators: category?.moderators,
  });
  const externalLink = post.link || post.url;

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

          {images.length > 0 && (
            <div className="post-gallery">
              <img className="post-gallery-img" src={images[galleryIndex]} alt="" />
              {images.length > 1 && (
                <>
                  {galleryIndex > 0 && (
                    <button className="post-gallery-nav prev" onClick={() => setGalleryIndex((i) => i - 1)} aria-label="Попереднє зображення">‹</button>
                  )}
                  {galleryIndex < images.length - 1 && (
                    <button className="post-gallery-nav next" onClick={() => setGalleryIndex((i) => i + 1)} aria-label="Наступне зображення">›</button>
                  )}
                  <div className="post-gallery-dots">
                    {images.map((_, i) => (
                      <span key={i} className={`post-gallery-dot ${i === galleryIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {post.description && <p className="post-desc">{post.description}</p>}

          {externalLink && (
            <a className="post-external-link" href={externalLink} target="_blank" rel="noopener noreferrer">
              {post.linkLabel || 'Read more'}: {externalLink}
            </a>
          )}

          <footer className="post-card-foot">
            <VoteButtons score={post.karma} myVote={post.myVote} onVote={handleVote} />
            <span className="post-action-btn">💬 {comments.length}</span>
            <button className="post-action-btn">↗ Поширити</button>
          </footer>
        </article>

        {user && (
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              placeholder="Приєднатись до обговорення"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!text.trim()}>
              Коментувати
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
              moderators={category?.moderators}
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
              <span className="community-meta-row">
                <span className="side-icon">🌐</span> {category.type === 'private' ? 'Private' : category.type === 'restricted' ? 'Restricted' : 'Public'}
              </span>
            </div>

            <div className="profile-stats">
              <div>
                <strong>{category.subscriberCount ?? 0}</strong>
                <span>Members</span>
              </div>
              <div>
                <strong>{category.onlineCount ?? '—'}</strong>
                <span>Online</span>
              </div>
            </div>

            <Link className="btn btn-outline btn-block" to={`/r/${encodeURIComponent(category.name)}`}>
              Перейти до спільноти
            </Link>
          </div>

          {category.socialLinks && (category.socialLinks.website || category.socialLinks.discord || category.socialLinks.twitter) && (
            <div className="side-card">
              <h3>SOCIAL LINKS</h3>
              <div className="social-link-list">
                {category.socialLinks.website && (
                  <a className="btn btn-outline btn-sm btn-block" href={category.socialLinks.website} target="_blank" rel="noopener noreferrer">Website</a>
                )}
                {category.socialLinks.discord && (
                  <a className="btn btn-outline btn-sm btn-block" href={category.socialLinks.discord} target="_blank" rel="noopener noreferrer">Discord</a>
                )}
                {category.socialLinks.twitter && (
                  <a className="btn btn-outline btn-sm btn-block" href={category.socialLinks.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
                )}
              </div>
            </div>
          )}

          {category.moderators?.length > 0 && (
            <div className="side-card">
              <h3>MODERATORS</h3>
              <button className="side-link static full-width">✉ Message Mods</button>
              <div className="mod-list">
                {category.moderators.map((m) => (
                  <Link key={m._id || m} to={`/user/${m.nickname || m}`} className="mod-row">
                    <span className="avatar-dot small">{(m.nickname || m)?.[0]?.toUpperCase()}</span>
                    u/{m.nickname || m}
                  </Link>
                ))}
              </div>
              <button className="widget-more">View all moderators</button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}