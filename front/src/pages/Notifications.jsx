import { useEffect, useState } from 'react';
import api from '../api/client';
import timeAgo from '../utils/timeAgo';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Сповіщення</h1>
        {items.length > 0 && (
          <div className="notifications-actions">
            <button className="link-btn" onClick={markAllRead}>Позначити все як прочитане</button>
            <button className="icon-btn" title="Архів">🗄</button>
            <button className="icon-btn" title="Налаштування">⚙</button>
          </div>
        )}
      </div>

      {loading && <p className="feed-status">Завантаження…</p>}
      {!loading && items.length === 0 && (
        <div className="notifications-empty">
          <span className="notifications-empty-icon">🔔</span>
          <p className="feed-status">Немає нових сповіщень.</p>
        </div>
      )}

      <div className="notification-list">
        {items.map((n) => (
          <button
            key={n.id}
            className={`notification-item ${n.isRead ? '' : 'unread'}`}
            onClick={() => markOneRead(n)}
          >
            {!n.isRead && <span className="notification-unread-dot" aria-hidden="true" />}
            <span className="sub-icon">{(n.fromUser?.nickname || '?')[0]?.toUpperCase()}</span>
            <div className="notification-body">
              {n.fromUser && <p className="notification-title">u/{n.fromUser.nickname}</p>}
              <p className="notification-text">{n.message}</p>
              <span className="post-meta-text">{timeAgo(n.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}