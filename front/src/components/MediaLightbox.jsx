import { useEffect, useState } from 'react';
import { mediaUrl } from '../utils/media';

// Fullscreen modal: X in top-right, centered content, prev/next arrows when there's more than one item.
export default function MediaLightbox({ items, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % items.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  if (!items || items.length === 0) return null;
  const current = items[index];
  const src = mediaUrl(current.url) || current.url;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Закрити">✕</button>

      {items.length > 1 && (
        <button
          type="button"
          className="lightbox-arrow lightbox-arrow-prev"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + items.length) % items.length); }}
          aria-label="Попередній"
        >
          ‹
        </button>
      )}

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {current.type === 'video' ? (
          <video src={src} controls autoPlay />
        ) : (
          <img src={src} alt="" />
        )}
      </div>

      {items.length > 1 && (
        <button
          type="button"
          className="lightbox-arrow lightbox-arrow-next"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % items.length); }}
          aria-label="Наступний"
        >
          ›
        </button>
      )}

      {items.length > 1 && (
        <div className="lightbox-counter">{index + 1}/{items.length}</div>
      )}
    </div>
  );
}
