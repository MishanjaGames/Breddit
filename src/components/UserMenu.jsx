import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { mediaUrl } from '../utils/media';

export default function UserMenu({ modOn, onToggleMod }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const avatarSrc = mediaUrl(user.avatar);

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar-link user-menu-trigger" onClick={() => setOpen((o) => !o)} aria-label="Меню користувача">
        {avatarSrc ? (
          <img className="avatar-dot" src={avatarSrc} alt="" />
        ) : (
          <span className="avatar-dot">{user.nickname?.[0]?.toUpperCase()}</span>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <Link to={`/u/${user.nickname}`} className="user-menu-item user-menu-item-primary" onClick={() => setOpen(false)}>
            {avatarSrc ? (
              <img className="avatar-dot small" src={avatarSrc} alt="" />
            ) : (
              <span className="avatar-dot small">{user.nickname?.[0]?.toUpperCase()}</span>
            )}
            <span>View Profile<br /><span className="user-menu-sub">u/{user.nickname}</span></span>
          </Link>

          <Link to="/drafts" className="user-menu-item" onClick={() => setOpen(false)}>
            <span className="user-menu-icon">📝</span> Drafts
          </Link>

          <button className="user-menu-item" onClick={toggleTheme}>
            <span className="user-menu-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          <button className="user-menu-item" onClick={() => { setOpen(false); logout(); }}>
            <span className="user-menu-icon">⎋</span> Log Out
          </button>
        </div>
      )}
    </div>
  );
}