import { useState } from 'react';
import { mediaUrl } from '../utils/media';

// Renders a run of consecutive image/video blocks as a single carousel (one visible at a time,
// arrows to step through, dot progress indicator). Clicking the visible slide opens the lightbox.
export default function MediaCarousel({ items, onOpenLightbox }) {
  const [index, setIndex] = useState(0);
  if (!items || items.length === 0) return null;

  const go = (delta) => {
    setIndex((i) => (i + delta + items.length) % items.length);
  };

  const current = items[index];
  const src = mediaUrl(current.url) || current.url;

  return (
    <div className="media-carousel">
      <div className="media-carousel-viewport" onClick={() => onOpenLightbox(items, index)}>
        {current.type === 'video' ? (
          <video src={src} controls onClick={(e) => e.stopPropagation()} />
        ) : (
          <img src={src} alt="" loading="lazy" />
        )}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            className="media-carousel-arrow media-carousel-arrow-prev"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="Попередній"
          >
            ‹
          </button>
          <button
            type="button"
            className="media-carousel-arrow media-carousel-arrow-next"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="Наступний"
          >
            ›
          </button>
          <div className="media-carousel-dots">
            {items.map((_, i) => (
              <span key={i} className={`media-carousel-dot ${i === index ? 'active' : ''}`} />
            ))}
          </div>
          <span className="media-carousel-counter">{index + 1}/{items.length}</span>
        </>
      )}
    </div>
  );
}
