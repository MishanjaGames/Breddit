import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';

export default function RecentPosts() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    try {
      setPosts(JSON.parse(localStorage.getItem('recentPosts') || '[]'));
    } catch {
      setPosts([]);
    }
  }, []);

  const clear = () => {
    localStorage.removeItem('recentPosts');
    setPosts([]);
  };

  if (posts.length === 0) return null;

  return (
    <div className="side-card right-widget">
      <div className="widget-header-row">
        <h3>НЕЩОДАВНІ ПОСТИ</h3>
        <button className="widget-clear" onClick={clear}>Очистити</button>
      </div>
      <div className="widget-list">
        {posts.map((p) => (
          <Link
            key={p._id}
            to={`/r/${encodeURIComponent(p.subName)}/p/${encodeURIComponent(p.title)}`}
            className="widget-row"
          >
            <span className="sub-icon">{p.subName?.[0]?.toUpperCase() || '?'}</span>
            <div className="widget-row-text">
              <span className="widget-title clamp-2">{p.title}</span>
              <span className="widget-sub">r/{p.subName} · {timeAgo(p.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}