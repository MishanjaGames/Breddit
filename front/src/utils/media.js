// backend serves uploads statically at {API_ORIGIN}/uploads/<path>
// media.url in Post/Comment docs is stored as "media/xxx.jpg", avatar as "avatars/xxx.jpg"
const API_URL = process.env.REACT_APP_API_URL || '/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(relPath) {
  if (!relPath) return null;
  if (/^https?:\/\//i.test(relPath)) return relPath;
  return `${API_ORIGIN}/uploads/${relPath}`;
}
