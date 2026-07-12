import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';

const TYPE_META = {
  reply: { icon: '💬', label: 'Відповідь' },
  comment_on_post: { icon: '💬', label: 'Коментар до посту' },
  upvote_post: { icon: '⬆', label: 'Карма поста' },
  upvote_comment: { icon: '⬆', label: 'Карма коментаря' },
  saved_post_activity: { icon: '🔖', label: 'Збережена тема' },
  mention: { icon: '@', label: 'Згадка' },
  follow: { icon: '👤', label: 'Новий підписник' },
  new_post: { icon: '📰', label: 'Новий пост' },
};

function notificationLink(n) {
  if (n.type === 'follow' && n.fromUser) return `/user/${n.fromUser.nickname}`;
  if (n.post?.categoryName) return `/r/${encodeURIComponent(n.post.categoryName)}/p/${encodeURIComponent(n.post.title)}`;
  if (n.category) return `/r/${encodeURIComponent(n.category.name)}`;
  return null;
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    api.get('/notifications')
      .then(({ data }) => { if (!cancelled) setItems(data.notifications || data || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await api.post('/notifications/read-all'); } catch { /* ignore */ }
  };

  const markOneRead = async (n) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try { await api.patch(`/notifications/${n.id}/read`); } catch { /* ignore */ }
  };

  const visible = filter === 'unread' ? items.filter((n) => !n.isRead) : items;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Сповіщення</h1>
        {items.length > 0 && (
          <div className="notifications-actions">
            <div className="notifications-filter-tabs">
              <button className={`feed-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Усі</button>
              <button className={`feed-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>Непрочитані</button>
            </div>
            <button className="link-btn" onClick={markAllRead}>Позначити все як прочитане</button>
          </div>
        )}
      </div>

      {loading && <p className="feed-status">Завантаження…</p>}
      {!loading && visible.length === 0 && (
        <div className="notifications-empty">
          <span className="notifications-empty-icon">🔔</span>
          <p className="feed-status">{filter === 'unread' ? 'Немає непрочитаних сповіщень.' : 'Немає нових сповіщень.'}</p>
        </div>
      )}

      <div className="notification-list">
        {visible.map((n) => {
          const meta = TYPE_META[n.type] || { icon: '🔔', label: 'Сповіщення' };
          const link = notificationLink(n);
          const content = (
            <>
              {!n.isRead && <span className="notification-unread-dot" aria-hidden="true" />}
              <span className="notification-type-icon" title={meta.label}>{meta.icon}</span>
              <div className="notification-body">
                {n.fromUser && <p className="notification-title">u/{n.fromUser.nickname}</p>}
                <p className="notification-text">{n.message}</p>
                {n.post?.title && <p className="notification-context">«{n.post.title}»</p>}
                {!n.post?.title && n.category?.name && <p className="notification-context">r/{n.category.name}</p>}
                <span className="post-meta-text">{timeAgo(n.createdAt)}</span>
              </div>
            </>
          );

          return link ? (
            <Link
              key={n.id}
              to={link}
              className={`notification-item ${n.isRead ? '' : 'unread'}`}
              onClick={() => markOneRead(n)}
            >
              {content}
            </Link>
          ) : (
            <button
              key={n.id}
              className={`notification-item ${n.isRead ? '' : 'unread'}`}
              onClick={() => markOneRead(n)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}