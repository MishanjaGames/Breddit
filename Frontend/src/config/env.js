// Set VITE_API_URL in .env to just the server origin, e.g. http://localhost:4000
// (no trailing slash, no /api). Everything below appends /api or other paths as needed.
const RAW = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const API_ORIGIN = RAW.replace(/\/+$/, '');
export const API_URL = `${API_ORIGIN}/api`;
