// Minimal, dependency-free Markdown renderer covering the common subset:
// **bold**, *italic*, ~~strike~~, `code`, ```code blocks```, # headers,
// > quotes, - / 1. lists, [text](url), and paragraph/line breaks.
// Not a full CommonMark implementation — intentionally small and safe (no raw HTML passthrough).

import { useEffect, useRef } from 'react';
import api from '../api/client';

const ID_RE = /^[0-9a-fA-F]{24}$/;
const nicknameCache = new Map(); // id -> nickname (module-level, persists across renders)

function resolveUserLinks(node) {
  if (!node) return;
  const links = node.querySelectorAll('a[href*="/user/"]');
  const idsToFetch = new Set();

  const applyKnown = (a) => {
    const m = a.getAttribute('href').match(/\/user\/([^/?#]+)/);
    const id = m?.[1];
    if (id && nicknameCache.has(id)) {
      const nick = nicknameCache.get(id);
      a.textContent = `u/${nick}`;
      a.setAttribute('href', `/u/${nick}`);
      return true;
    }
    return false;
  };

  links.forEach((a) => {
    const m = a.getAttribute('href').match(/\/user\/([^/?#]+)/);
    const id = m?.[1];
    if (id && ID_RE.test(id) && !applyKnown(a)) idsToFetch.add(id);
  });

  if (idsToFetch.size === 0) return;
  api.get('/users/resolve', { params: { ids: [...idsToFetch].join(',') } })
    .then(({ data }) => {
      (data.users || []).forEach((u) => nicknameCache.set(u.id, u.nickname));
      links.forEach(applyKnown);
    })
    .catch(() => {});
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

export function renderMarkdown(src) {
  if (!src) return '';
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let listBuffer = null; // { type: 'ul'|'ol', items: [] }
  let quoteBuffer = null;

  const flushList = () => {
    if (listBuffer) {
      html.push(`<${listBuffer.type}>${listBuffer.items.map((it) => `<li>${inline(it)}</li>`).join('')}</${listBuffer.type}>`);
      listBuffer = null;
    }
  };
  const flushQuote = () => {
    if (quoteBuffer) {
      html.push(`<blockquote>${quoteBuffer.map(inline).join('<br/>')}</blockquote>`);
      quoteBuffer = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      flushList(); flushQuote();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList(); flushQuote();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      flushList();
      quoteBuffer = quoteBuffer || [];
      quoteBuffer.push(line.replace(/^\s*>\s?/, ''));
      i += 1;
      continue;
    }
    flushQuote();

    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const type = ulMatch ? 'ul' : 'ol';
      const text = ulMatch ? ulMatch[1] : olMatch[1];
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push(text);
      i += 1;
      continue;
    }
    flushList();

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph: collect until blank line / block start
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${para.map(inline).join('<br/>')}</p>`);
  }
  flushList();
  flushQuote();

  return html.join('\n');
}

export default function MarkdownText({ text, className }) {
  const ref = useRef(null);
  useEffect(() => { resolveUserLinks(ref.current); }, [text]);
  if (!text) return null;
  return (
    <div
      ref={ref}
      className={`markdown-body ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}
