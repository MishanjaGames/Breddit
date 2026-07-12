import { useState } from 'react';
import MarkdownText from '../utils/markdown.jsx';
import MediaCarousel from './MediaCarousel';
import MediaLightbox from './MediaLightbox';
import { mediaUrl } from '../utils/media';

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function extLabel(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || '');
  return m ? m[1].toUpperCase() : 'ФАЙЛ';
}

// groups the ordered block list into runs: consecutive image/video blocks become one carousel run,
// everything else (text, file) stays its own run
function groupBlocks(content) {
  const groups = [];
  content.forEach((block) => {
    const isMedia = block.type === 'image' || block.type === 'video';
    const last = groups[groups.length - 1];
    if (isMedia && last?.kind === 'media') {
      last.items.push(block);
    } else if (isMedia) {
      groups.push({ kind: 'media', items: [block] });
    } else {
      groups.push({ kind: block.type, items: [block] });
    }
  });
  return groups;
}

export default function PostContent({ content }) {
  const [lightbox, setLightbox] = useState(null); // { items, index } | null

  if (!Array.isArray(content) || content.length === 0) return null;
  const groups = groupBlocks(content);

  return (
    <div className="post-content-blocks">
      {groups.map((group, gi) => {
        if (group.kind === 'text') {
          const text = group.items[0].text;
          if (!text?.trim()) return null;
          return <MarkdownText key={gi} className="post-desc" text={text} />;
        }

        if (group.kind === 'media') {
          return (
            <MediaCarousel
              key={gi}
              items={group.items}
              onOpenLightbox={(items, index) => setLightbox({ items, index })}
            />
          );
        }

        if (group.kind === 'file') {
          const block = group.items[0];
          const src = mediaUrl(block.url) || block.url;
          const name = block.originalName || 'файл';
          return (
            <div key={gi} className="post-file-block">
              <span className="content-block-file-icon">{extLabel(name)}</span>
              <div className="content-block-file-meta">
                <span className="content-block-file-name">{name}</span>
                <span className="post-meta-text">Файл · {formatSize(block.size)}</span>
              </div>
              <a className="post-file-download" href={src} download={name} aria-label="Завантажити">⬇</a>
            </div>
          );
        }

        return null;
      })}

      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
