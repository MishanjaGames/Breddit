import { useEffect, useRef, useState } from 'react';

const SORTS = { hot: 'Hot', new: 'New', top: 'Top', controversial: 'Controversial' };

export default function PostListControls({ sort, onSortChange, view, onViewChange }) {
  const [sortOpen, setSortOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [sortOpen]);

  return (
    <div className="feed-controls">
      {onSortChange ? (
        <div className="sort-dropdown" ref={ref}>
          <button className={`sort-trigger ${sortOpen ? 'open' : ''}`} onClick={() => setSortOpen((o) => !o)}>
            {SORTS[sort] || SORTS.hot} <span className="sort-trigger-caret">˅</span>
          </button>
          {sortOpen && (
            <div className="sort-menu">
              <span className="sort-menu-label">Sort by</span>
              {Object.entries(SORTS).map(([key, label]) => (
                <button
                  key={key}
                  className={`sort-menu-item ${sort === key ? 'active' : ''}`}
                  onClick={() => { onSortChange(key); setSortOpen(false); }}
                >
                  {label}
                  {sort === key && <span className="sort-menu-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <span className="sort-trigger sort-trigger-static">{SORTS[sort] || SORTS.hot}</span>
      )}

      {onViewChange && (
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`}
            onClick={() => onViewChange('card')}
            title="Card view"
            aria-label="Card view"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="2" y="12" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            className={`view-toggle-btn ${view === 'compact' ? 'active' : ''}`}
            onClick={() => onViewChange('compact')}
            title="Compact view"
            aria-label="Compact view"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="2.6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="8.7" width="16" height="2.6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="14.4" width="16" height="2.6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}