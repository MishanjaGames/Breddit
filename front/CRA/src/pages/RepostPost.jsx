import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useToast } from '../context/ToastContext';
import AuthorBadge, { getAuthorRole } from '../components/AuthorBadge';
import MediaGallery from '../components/MediaGallery';
import PostContent from '../components/PostContent';
import CommunityPickerModal from '../components/CommunityPickerModal';
import MarkdownText from '../utils/markdown.jsx';
import timeAgo from '../utils/timeAgo';
import { mediaUrl } from '../utils/media';

export default function RepostPost() {
  const { name, title } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetCategory, setTargetCategory] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveCategoryByName(name).then(async (cat) => {
      if (!cat || cancelled) return;
      const { data } = await api.get(`/posts/category/${cat._id}`, { params: { limit: 300 } });
      const list = Array.isArray(data) ? data : (data.posts || []);
      const filtered = list.filter((p) => (p.category?._id || p.category) === cat._id);
      const found = filtered.find((p) => p.title === decodeURIComponent(title));
      if (!cancelled) setPost(found || null);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, title]);

  const submitRepost = async () => {
    if (!post || !targetCategory) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('title', post.title);
      form.append('category', targetCategory._id);
      form.append('repostOf', post._id);

      const { data } = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Пост репостнуто');
      navigate(`/r/${encodeURIComponent(targetCategory.name)}/p/${encodeURIComponent(data.title)}`);
    } catch {
      toast.error('Не вдалося репостнути');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="feed-status">Завантаження…</p>;
  if (!post) return <p className="feed-status">Пост не знайдено.</p>;

  const authorName = post.author?.nickname || post.author?.username;
  const authorRole = getAuthorRole(post.author?._id || post.author, {
    postAuthorId: post.author?._id || post.author,
  });

  return (
    <div className="post-detail-layout">
      <div className="post-page">
        <Link to={`/r/${encodeURIComponent(name)}/p/${encodeURIComponent(title)}`} className="back-link">← Назад до поста</Link>

        <div className="repost-target-row">
          <span className="post-meta-text">Репостити в:</span>
          <button type="button" className="community-select-pill" onClick={() => setPickerOpen(true)}>
            {targetCategory ? (
              <>
                {targetCategory.icon ? (
                  <img className="sub-icon" src={mediaUrl(targetCategory.icon) || targetCategory.icon} alt="" />
                ) : (
                  <span className="sub-icon">{targetCategory.name[0]?.toUpperCase()}</span>
                )}
                <span>r/{targetCategory.name}</span>
              </>
            ) : (
              <span>Оберіть спільноту</span>
            )}
            <span className="community-select-caret">⌄</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm repost-submit-btn"
            onClick={submitRepost}
            disabled={!targetCategory || busy}
          >
            {busy ? 'Публікація…' : 'Repost'}
          </button>
        </div>

        <article className="post-card post-card-full post-card-repost-preview">
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
          </header>

          <h1 className="post-title-full">{post.title}</h1>

          {post.content?.length > 0 ? (
            <PostContent content={post.content} />
          ) : (
            <>
              <MediaGallery media={post.media} />
              {post.description && <MarkdownText className="post-desc" text={post.description} />}
            </>
          )}
        </article>
      </div>

      {pickerOpen && (
        <CommunityPickerModal
          onSelect={(cat) => { setTargetCategory(cat); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
