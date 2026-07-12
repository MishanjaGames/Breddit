import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';
import { useCardNavigate } from '../utils/cardNavigate';

export default function ProfileCommentCard({ comment }) {
  const categoryName = comment.post?.category?.name;
  const postTitle = comment.post?.title;
  const postUrl = categoryName && postTitle
    ? `/r/${encodeURIComponent(categoryName)}/p/${encodeURIComponent(postTitle)}`
    : null;
  const handleClick = useCardNavigate(postUrl || '#');

  return (
    <article className="post-card post-card-clickable comment-item" onClick={postUrl ? handleClick : undefined}>
      <header className="post-card-head">
        <span className="post-meta-text">
          Коментар до <Link to={postUrl || '#'} className="post-sub-link">{postTitle || 'видалений пост'}</Link>
        </span>
        {categoryName && (
          <>
            <span className="post-dot">·</span>
            <Link to={`/r/${encodeURIComponent(categoryName)}`} className="post-sub-link">r/{categoryName}</Link>
          </>
        )}
        <span className="post-dot">·</span>
        <span className="post-meta-text">{timeAgo(comment.createdAt)}</span>
        {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
          <>
            <span className="post-dot">·</span>
            <span className="edited-label">ред. {timeAgo(comment.updatedAt)}</span>
          </>
        )}
      </header>
      {(comment.text || '').length > 300 ? (
        <div className="feed-body-clamped comment-body-clamped">
          <div className="feed-body-clamped-inner">
            <p className="post-desc">{comment.text}</p>
          </div>
          {postUrl && <Link to={postUrl} className="feed-body-more">More...</Link>}
        </div>
      ) : (
        <p className="post-desc">{comment.text}</p>
      )}
    </article>
  );
}
