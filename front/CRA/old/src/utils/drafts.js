// Drafts are a client-only feature — the backend has no draft endpoint, so we
// persist them to localStorage per-browser. Media attachments aren't saved
// (Files can't be serialized), only title/description/target community.
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

// Saves (creates or updates) a draft. Returns the saved draft (with id).
export function saveDraft({ id, community, title, description }) {
  const drafts = readAll();
  const now = new Date().toISOString();

  if (id) {
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], community, title, description, updatedAt: now };
      writeAll(drafts);
      return drafts[idx];
    }
  }

  const draft = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    community,
    title,
    description,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([draft, ...drafts]);
  return draft;
}

export function deleteDraft(id) {
  writeAll(readAll().filter((d) => d.id !== id));
}