import api from './client';

// backend has no GET-category-by-name endpoint, only /search (substring match on name).
// Since the query equals the full name, the exact category is always included if it exists.
export async function resolveCategoryByName(name) {
  const { data } = await api.get('/search', { params: { q: name, categoryLimit: 50 } });
  return (data.categories || []).find((c) => c.name === name) || null;
}