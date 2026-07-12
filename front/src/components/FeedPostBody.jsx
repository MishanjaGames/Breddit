import { useState } from 'react';
import MarkdownText from '../utils/markdown.jsx';
import MediaCarousel from './MediaCarousel';
import MediaLightbox from './MediaLightbox';
import { mediaUrl } from '../utils/media';
import { groupContentBlocks, formatFileSize, fileExtLabel } from '../utils/contentBlocks';

const TEXT_CLAMP_CHARS = 300;

// Renders a post's content for feed cards (PostCard / PostRowCompact / profile lists):
//   - a single short text block renders in full
//   - a long text block clamps with a gradient fade + "More..." link to the post page
//   - any media (carousel) or file block, when combined with other blocks, also triggers
//     the clamp + "More..." treatment rather than showing everything inline
//   - a lone media/file block (no text) still renders fully, since there's nothing to truncate
export default function FeedPostBody({ content, postUrl }) {
  const [lightbox, setLightbox] = useState(null);

  if (!Array.isArray(content) || content.length === 0) return null;
  const groups = groupContentBlocks(content).filter((g) => !(g.kind === 'text' && !g.items[0].text?.trim()));
  if (groups.length === 0) return null;

  const firstGroup = groups[0];
  const isSingleShortText = groups.length === 1
    && firstGroup.kind === 'text'
    && (firstGroup.items[0].text || '').length <= TEXT_CLAMP_CHARS;

  const isSingleMedia = groups.length === 1 && firstGroup.kind === 'media';

  if (isSingleShortText) {
    return <MarkdownText className="post-desc" text={firstGroup.items[0].text} />;
  }

  if (isSingleMedia) {
    return (
      <>
        <MediaCarousel
          items={firstGroup.items}
          onOpenLightbox={(items, index) => setLightbox({ items, index })}
        />
        {lightbox && (
          <MediaLightbox items={lightbox.items} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </>
    );
  }

  // everything else (long text, multiple blocks, or a lone file block) gets the clamp treatment:
  // show the first group fully-rendered up to a fixed height, fade it out, and link "More..." to the post
  return (
    <div className="feed-body-clamped">
      <div className="feed-body-clamped-inner">
        {firstGroup.kind === 'text' && <MarkdownText className="post-desc" text={firstGroup.items[0].text} />}
        {firstGroup.kind === 'media' && (
          <MediaCarousel items={firstGroup.items} onOpenLightbox={(items, index) => setLightbox({ items, index })} />
        )}
        {firstGroup.kind === 'file' && (
          <div className="post-file-block">
            <span className="content-block-file-icon">{fileExtLabel(firstGroup.items[0].originalName)}</span>
            <div className="content-block-file-meta">
              <span className="content-block-file-name">{firstGroup.items[0].originalName || 'файл'}</span>
              <span className="post-meta-text">Файл · {formatFileSize(firstGroup.items[0].size)}</span>
            </div>
          </div>
        )}
      </div>
      <a href={postUrl} className="feed-body-more">More...</a>
      {lightbox && (
        <MediaLightbox items={lightbox.items} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
