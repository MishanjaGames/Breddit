import { useRef, useState } from 'react';
import MarkdownEditor from './MarkdownEditor';
import { mediaUrl } from '../utils/media';

const FILE_TYPE_LABELS = {
  image: 'Зображення',
  video: 'Відео',
  file: 'Файл',
};

const ACCEPT_BY_TYPE = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/webm',
  file: '*', // будь-який тип файлу
};

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

let blockIdCounter = 0;
const nextId = () => `blk-${Date.now()}-${blockIdCounter++}`;

// One row: the media drop-zone before a file is picked, OR the preview/file-row once one is.
function MediaBlock({ block, onFile, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list) => {
    const file = list?.[0];
    if (file) onFile(file);
  };

  if (!block.file && !block.existingUrl) {
    // empty state: drag & drop / upload zone (matches the "Add media" reference design)
    return (
      <div className="content-block content-block-empty">
        <div
          className={`media-dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <span>Drag and Drop or upload {block.type === 'file' ? 'file' : 'media'}</span>
          <span className="media-dropzone-icon">⬆</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT_BY_TYPE[block.type]}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <button type="button" className="content-block-remove-outline" onClick={onRemove}>
          Прибрати блок
        </button>
      </div>
    );
  }

  const previewUrl = block.file ? URL.createObjectURL(block.file) : mediaUrl(block.existingUrl);
  const name = block.file?.name || block.originalName || 'файл';

  const replaceInput = (
    <input
      ref={inputRef}
      type="file"
      hidden
      accept={ACCEPT_BY_TYPE[block.type]}
      onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
    />
  );

  if (block.type === 'image') {
    return (
      <div className="content-block content-block-media">
        <img src={previewUrl} alt="" onClick={() => inputRef.current?.click()} />
        {replaceInput}
        <button type="button" className="content-block-remove-dot" onClick={onRemove} aria-label="Видалити">✕</button>
      </div>
    );
  }

  if (block.type === 'video') {
    return (
      <div className="content-block content-block-media">
        <video src={previewUrl} controls />
        {replaceInput}
        <button type="button" className="content-block-remove-dot" onClick={onRemove} aria-label="Видалити">✕</button>
      </div>
    );
  }

  // file block: filename + type label + red X
  return (
    <div className="content-block content-block-file">
      <span className="content-block-file-icon">{extLabel(name)}</span>
      <div className="content-block-file-meta">
        <span className="content-block-file-name">{name}</span>
        <span className="post-meta-text">{FILE_TYPE_LABELS.file} · {formatSize(block.file?.size ?? block.size)}</span>
      </div>
      {replaceInput}
      <button type="button" className="content-block-remove-dot" onClick={onRemove} aria-label="Видалити">✕</button>
    </div>
  );
}

export default function ContentBlockEditor({ blocks, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const addBlock = (type) => {
    setMenuOpen(false);
    const block = type === 'text'
      ? { id: nextId(), type: 'text', text: '' }
      : { id: nextId(), type, file: null };
    onChange([...blocks, block]);
  };

  const updateBlock = (id, patch) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="content-block-editor">
      {blocks.map((block) => (
        <div key={block.id} className="content-block-wrap">
          {block.type === 'text' ? (
            <div className="content-block content-block-text">
              <MarkdownEditor
                value={block.text}
                onChange={(text) => updateBlock(block.id, { text })}
                minRows={4}
                placeholder="Підтримується Markdown…"
              />
              <button
                type="button"
                className="content-block-remove-outline"
                onClick={() => removeBlock(block.id)}
              >
                Прибрати блок
              </button>
            </div>
          ) : (
            <MediaBlock
              block={block}
              onFile={(file) => updateBlock(block.id, { file, existingUrl: undefined, mimeType: undefined, size: undefined, originalName: undefined })}
              onRemove={() => removeBlock(block.id)}
            />
          )}
        </div>
      ))}

      <div className="content-block-add-row">
        <div className="content-block-add-combo">
          <button type="button" className="content-block-add-btn" onClick={() => addBlock('text')}>
            + Додати текст
          </button>
          <button
            type="button"
            className="content-block-add-caret"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Додати медіа"
          >
            ⌄
          </button>
          {menuOpen && (
            <div className="content-block-add-menu">
              <button type="button" onClick={() => addBlock('image')}>🖼 Зображення</button>
              <button type="button" onClick={() => addBlock('video')}>🎬 Відео</button>
              <button type="button" onClick={() => addBlock('file')}>📄 Файл</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}