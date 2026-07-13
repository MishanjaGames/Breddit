// If sorting by "hot" returns an empty list, fall back to "new" so the page
// isn't empty just because nothing has scored yet (e.g. a fresh community).
export async function fetchWithHotFallback(fetchFn, sort) {
  const first = await fetchFn(sort);
  const list = Array.isArray(first.list) ? first.list : [];
  if (sort === 'hot' && list.length === 0) {
    const fallback = await fetchFn('new');
    return { ...fallback, usedFallback: true };
  }
  return { ...first, usedFallback: false };
}
