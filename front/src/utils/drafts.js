// Drafts are a client-only feature — the backend has no draft *document* endpoint, so we
// persist the draft's title/community/blocks to localStorage per-browser. Media files themselves
// can't be serialized, so on save we upload them via POST /posts/draft-media and store the
// returned server URLs in the block instead (see ContentBlockEditor's `existingUrl` support).
const KEY = 'postDrafts';

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(drafts) {
  localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function listDrafts() {
  return readAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getDraft(id) {
  return readAll().find((d) => d.id === id) || null;
}

// Saves (creates or updates) a draft. `blocks` must already be serializable
// (media blocks carry `existingUrl`/`mediaType`/etc, not raw File objects — see saveAsDraft in SubmitPost).
// Returns the saved draft (with id).
export function saveDraft({ id, community, title, blocks }) {
  const drafts = readAll();
  const now = new Date().toISOString();

  if (id) {
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], community, title, blocks, updatedAt: now };
      writeAll(drafts);
      return drafts[idx];
    }
  }

  const draft = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    community,
    title,
    blocks,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([draft, ...drafts]);
  return draft;
}

export function deleteDraft(id) {
  writeAll(readAll().filter((d) => d.id !== id));
}