import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import api from '../api/client';

export default function PostCard({ post }) {
  const handleVote = async (value) => {
    const { data } = await api.post(`/posts/${post.id}/vote`, { value });
    return data;
  };

  return (
    <div className="card mb-2 shadow-sm">
      <div className="card-body d-flex gap-3 py-2">
        <VoteButtons score={post.score} myVote={post.myVote} onVote={handleVote} />
        <div className="flex-grow-1">
          <div className="small text-secondary">
            {post.subreddit && (
              <Link to={`/r/${post.subreddit.name}`} className="fw-semibold text-decoration-none">
                r/{post.subreddit.name}
              </Link>
            )}
            {' · '}u/{post.author?.username}
          </div>
          <Link to={`/post/${post.id}`} className="h6 text-decoration-none text-body d-block mt-1">
            {post.title}
          </Link>
          {post.type === 'LINK' && post.url && (
            <a href={post.url} target="_blank" rel="noreferrer" className="small text-truncate d-block">
              {post.url}
            </a>
          )}
          <Link to={`/post/${post.id}`} className="small text-secondary text-decoration-none">
            💬 {post.commentCount ?? 0} комментарів
          </Link>
        </div>
      </div>
    </div>
  );
}
