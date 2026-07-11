import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserMenu({ modOn, onToggleMod }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar-link user-menu-trigger" onClick={() => setOpen((o) => !o)} aria-label="Меню користувача">
        <span className="avatar-dot">{user.nickname?.[0]?.toUpperCase()}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <Link to={`/user/${user.nickname}`} className="user-menu-item user-menu-item-primary" onClick={() => setOpen(false)}>
            <span className="avatar-dot small">{user.nickname?.[0]?.toUpperCase()}</span>
            <span>View Profile<br /><span className="user-menu-sub">u/{user.nickname}</span></span>
          </Link>

          <Link to={`/user/${user.nickname}`} className="user-menu-item user-menu-item-primary" onClick={() => setOpen(false)}>
            <span className="user-menu-icon">🧥</span> View Profile
          </Link>

          <button className="user-menu-item" onClick={() => setOpen(false)}>
            <span className="user-menu-icon">📝</span> Drafts
          </button>

          <button className="user-menu-item" onClick={() => setOpen(true)}>
            <span className="user-menu-icon">◐</span>
            <span className="user-menu-toggle-label">Display Mode</span>
          </button>

          <button className="user-menu-item" onClick={() => setOpen(false)}>
            <span className="user-menu-icon">⚙</span> Settings
          </button>

          <div className="user-menu-divider" />

          <button className="user-menu-item" onClick={() => { setOpen(false); logout(); }}>
            <span className="user-menu-icon">⎋</span> Log Out
          </button>
        </div>
      )}
    </div>
  );
}