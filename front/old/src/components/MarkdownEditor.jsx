import { useRef, useState } from 'react';
import MarkdownText from '../utils/markdown.jsx';

const WRAP = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
};

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minRows = 4,
  autoFocus,
}) {
  const [mode, setMode] = useState('write');
  const taRef = useRef(null);

  const applyWrap = (before, after) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || '';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const applyLinePrefix = (prefix) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const insertLink = () => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const label = value.slice(start, end) || 'текст';
    const snippet = `[${label}](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const urlPos = start + label.length + 3;
      ta.setSelectionRange(urlPos, urlPos + 8);
    });
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <div className="md-tabs">
          <button type="button" className={`md-tab ${mode === 'write' ? 'active' : ''}`} onClick={() => setMode('write')}>Написати</button>
          <button type="button" className={`md-tab ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>Перегляд</button>
        </div>
        {mode === 'write' && (
          <div className="md-actions">
            <button type="button" title="Жирний" onClick={() => applyWrap(...WRAP.bold)}><b>B</b></button>
            <button type="button" title="Курсив" onClick={() => applyWrap(...WRAP.italic)}><i>I</i></button>
            <button type="button" title="Закреслений" onClick={() => applyWrap(...WRAP.strike)}><s>S</s></button>
            <button type="button" title="Код" onClick={() => applyWrap(...WRAP.code)}>{'</>'}</button>
            <button type="button" title="Посилання" onClick={insertLink}>🔗</button>
            <button type="button" title="Список" onClick={() => applyLinePrefix('- ')}>•</button>
            <button type="button" title="Цитата" onClick={() => applyLinePrefix('> ')}>❝</button>
          </div>
        )}
      </div>

      {mode === 'write' ? (
        <textarea
          ref={taRef}
          className="md-textarea"
          rows={minRows}
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="md-preview" style={{ minHeight: `${minRows * 1.5}em` }}>
          {value.trim() ? <MarkdownText text={value} /> : <span className="feed-status">Нічого прев’ю…</span>}
        </div>
      )}
    </div>
  );
}
