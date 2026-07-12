import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PostMenu({ onSave, saved, onHide }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="post-menu" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Опції">⋯</button>
      {open && (
        <div className="post-menu-dropdown">
          {user ? (
            <>
              <button className="post-menu-item"><span>🔔</span> Стежити за постом</button>
              <button className="post-menu-item"><span>🚫</span> Менше таких постів</button>
              <button className="post-menu-item" onClick={() => { onSave?.(); setOpen(false); }}>
                <span>🔖</span> {saved ? 'Прибрати зі збереженого' : 'Зберегти'}
              </button>
              <button className="post-menu-item" onClick={() => { onHide?.(); setOpen(false); }}>
                <span>🙈</span> Приховати
              </button>
              <button className="post-menu-item"><span>⚑</span> Поскаржитись</button>
            </>
          ) : (
            <button className="post-menu-item"><span>⚑</span> Поскаржитись</button>
          )}
        </div>
      )}
    </div>
  );
}