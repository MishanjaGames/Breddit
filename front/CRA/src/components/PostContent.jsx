import { useState } from 'react';
import MarkdownText from '../utils/markdown.jsx';
import MediaCarousel from './MediaCarousel';
import MediaLightbox from './MediaLightbox';
import { mediaUrl } from '../utils/media';
import { groupContentBlocks, formatFileSize, fileExtLabel } from '../utils/contentBlocks';

export default function PostContent({ content }) {
  const [lightbox, setLightbox] = useState(null); // { items, index } | null

  if (!Array.isArray(content) || content.length === 0) return null;
  const groups = groupContentBlocks(content);

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
              <span className="content-block-file-icon">{fileExtLabel(name)}</span>
              <div className="content-block-file-meta">
                <span className="content-block-file-name">{name}</span>
                <span className="post-meta-text">Файл · {formatFileSize(block.size)}</span>
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
