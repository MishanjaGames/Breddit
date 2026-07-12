// groups an ordered post.content block list into runs: consecutive blocks of the SAME media type
// (image or video, not mixed) become one carousel run, everything else (text, file) stays its own run
export function groupContentBlocks(content) {
  const groups = [];
  content.forEach((block) => {
    const isMedia = block.type === 'image' || block.type === 'video';
    const last = groups[groups.length - 1];
    if (isMedia && last?.kind === 'media' && last.mediaType === block.type) {
      last.items.push(block);
    } else if (isMedia) {
      groups.push({ kind: 'media', mediaType: block.type, items: [block] });
    } else {
      groups.push({ kind: block.type, items: [block] });
    }
  });
  return groups;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function fileExtLabel(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || '');
  return m ? m[1].toUpperCase() : 'ФАЙЛ';
}

// adapts an old-shape post (title + description + flat media[]) into an ordered content[] array,
// so FeedPostBody/PostContent can render legacy posts through the same code path as new ones.
// Order: description text first, then media items (their original relative order is preserved).
export function legacyPostToContent(post) {
  const blocks = [];
  if (post.description?.trim()) {
    blocks.push({ type: 'text', text: post.description });
  }
  (post.media || []).forEach((m) => {
    blocks.push({
      type: m.type === 'video' ? 'video' : (m.type === 'audio' ? 'file' : 'image'),
      url: m.url,
      mimeType: m.mimeType,
      size: m.size,
      originalName: m.originalName,
    });
  });
  return blocks;
}
