import { useRef } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg';
const MAX_FILES = 10;

// Lightweight file picker + preview strip. Parent owns the `files` (File[]) state
// and passes it in along with a setter; this keeps upload logic (FormData) in the caller.
export default function MediaPicker({ files, onChange, max = MAX_FILES }) {
  const inputRef = useRef(null);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (incoming.length === 0) return;
    const next = [...files, ...incoming].slice(0, max);
    onChange(next);
  };

  const removeAt = (i) => {
    onChange(files.filter((_, idx) => idx !== i));
  };

  return (
    <div className="media-picker">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn btn-outline btn-sm file-btn"
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= max}
      >
        📎 Додати медіа
      </button>

      {files.length > 0 && (
        <div className="media-picker-preview">
          {files.map((f, i) => {
            const url = URL.createObjectURL(f);
            const isVideo = f.type.startsWith('video/');
            const isAudio = f.type.startsWith('audio/');
            return (
              <div key={i} className="media-picker-item">
                {isVideo ? (
                  <video src={url} muted />
                ) : isAudio ? (
                  <span className="media-picker-audio">🎵 {f.name}</span>
                ) : (
                  <img src={url} alt="" />
                )}
                <button
                  type="button"
                  className="media-picker-remove"
                  onClick={() => removeAt(i)}
                  aria-label="Видалити"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
