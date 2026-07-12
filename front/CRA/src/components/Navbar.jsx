import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';
import UserMenu from './UserMenu';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const { openModal: openCreateCommunity } = useCreateCommunityModal();
  const { socket } = useSocket();
  const [q, setQ] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    let cancelled = false;
    const check = () => {
      api.get('/notifications/unread-count')
        .then(({ data }) => { if (!cancelled) setHasUnread((data.unreadCount ?? 0) > 0); })
        .catch(() => {});
    };
    check(); // initial load only — after this, live updates come over the socket, no more polling
    return () => { cancelled = true; };
  }, [user]);

  // real-time: server pushes 'notification:new' whenever something happens for this user
  // (reply, mention, upvote, follow, saved-post activity) instead of us polling every 30s
  useEffect(() => {
    if (!socket || !user) return;
    const onNewNotification = () => setHasUnread(true);
    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, [socket, user]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn ham-btn-side" onClick={onToggleSidebar} aria-label="Меню">☰</button>
        <Link className="navbar-brand" to="/">
          <span className="brand-icon">Br</span>
          <span className="brand-word">Breddit</span>
        </Link>
      </div>
      <form className="navbar-search" onSubmit={submitSearch}>
        <span className="search-icon">⌕</span>
        <input
          type="search"
          placeholder="Шукати в Breddit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="navbar-actions">
        {user ? (
          <>
            <button className="btn btn-outline btn-sm create-btn" onClick={openCreateCommunity} title="Створити спільноту">
              ＋<span className="create-btn-label"> Створити</span>
            </button>
            <Link className="icon-btn notif-btn" to="/notifications" title="Сповіщення">
              🔔
              {hasUnread && <span className="notif-badge"><span className="notif-badge-dot" /></span>}
            </Link>
            <UserMenu />
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={openLogin}>Увійти</button>
            <button className="btn btn-primary btn-sm" onClick={openRegister}>Зареєструватися</button>
          </>
        )}
      </div>
    </nav>
  );
}