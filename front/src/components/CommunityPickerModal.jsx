import { useEffect, useState } from 'react';
import api from '../api/client';
import { mediaUrl } from '../utils/media';

export default function CommunityPickerModal({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [subscribed, setSubscribed] = useState([]);
  const [results, setResults] = useState(null); // null = show subscribed list, array = show search results
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/categories/mine/subscribed')
      .then(({ data }) => { if (!cancelled) setSubscribed(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      api.get('/search', { params: { q: query.trim(), limit: 1 } })
        .then(({ data }) => { if (!cancelled) setResults(data.categories || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250); // debounce
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const list = results !== null ? results : subscribed;

  const renderIcon = (cat) => (
    cat.icon
      ? <img className="sub-icon" src={mediaUrl(cat.icon) || cat.icon} alt="" />
      : <span className="sub-icon">{cat.name?.[0]?.toUpperCase()}</span>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card community-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>
        <h1>Оберіть спільноту</h1>
        <input
          type="text"
          className="community-picker-search"
          placeholder="Пошук спільнот"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="community-picker-list">
          {(loading && results === null) && <p className="feed-status">Завантаження…</p>}
          {searching && <p className="feed-status">Пошук…</p>}
          {!loading && !searching && list.length === 0 && (
            <p className="feed-status">
              {results !== null ? 'Нічого не знайдено.' : 'Ви ще не приєднались до жодної спільноти.'}
            </p>
          )}
          {!searching && list.map((cat) => (
            <button
              type="button"
              key={cat._id}
              className="community-picker-row"
              onClick={() => onSelect(cat)}
            >
              {renderIcon(cat)}
              <span>r/{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
