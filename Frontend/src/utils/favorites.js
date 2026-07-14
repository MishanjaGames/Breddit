// Favorited communities are purely client-side (no backend model for this),
// stored the same way recentCommunities/feedView already are.
const KEY = 'favoriteCommunities';

export function getFavoriteIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function isFavorite(id) {
  return getFavoriteIds().includes(id);
}

export function toggleFavorite(id) {
  const current = getFavoriteIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('favorites-changed'));
  return next;
}