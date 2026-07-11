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
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api.post('/notifications/read-all'); } catch { /* ignore */ }
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
        <p className="feed-status">Немає нових сповіщень.</p>
      )}

      <div className="notification-list">
        {items.map((n) => (
          <div key={n._id} className={`notification-item ${n.read ? '' : 'unread'}`}>
            <span className="sub-icon">{(n.from || 'r')[0]?.toUpperCase()}</span>
            <div className="notification-body">
              <p className="notification-title">{n.title || n.from}</p>
              <p className="notification-text">{n.text || n.message}</p>
              <span className="post-meta-text">{timeAgo(n.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}