// backend serves uploads statically at {API_ORIGIN}/uploads/<path>
// media.url in Post/Comment docs is stored as "media/xxx.jpg", avatar as "avatars/xxx.jpg"
import { API_ORIGIN } from '../config/env';

export { API_ORIGIN };

export function mediaUrl(relPath) {
  if (!relPath) return null;
  if (/^https?:\/\//i.test(relPath)) return relPath;
  return `${API_ORIGIN}/uploads/${relPath}`;
}
