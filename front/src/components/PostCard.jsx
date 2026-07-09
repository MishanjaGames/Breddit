import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import api from '../api/client';

export default function PostCard({ post }) {
  const handleVote = async (value) => {
    // backend: POST /api/votes { targetType: 'Post', targetId, value }
    await api.post('/votes', { targetType: 'Post', targetId: post._id, value });
  };

  return (
    <div className="card mb-2 shadow-sm">
      <div className="card-body d-flex gap-3 py-2">
        <VoteButtons score={post.karma} onVote={handleVote} />
        <div className="flex-grow-1">
          <div className="small text-secondary">
            {post.category && (
              <Link to={`/r/${post.category._id}`} className="fw-semibold text-decoration-none">
                r/{post.category.name}
              </Link>
            )}
            {' · '}u/{post.author?.nickname}
          </div>
          <Link to={`/post/${post._id}`} className="h6 text-decoration-none text-body d-block mt-1">
            {post.title}
          </Link>
          <p className="small text-secondary mb-0">{post.description}</p>
        </div>
      </div>
    </div>
  );
}