import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
});

// attach access token to every request (backend expects: Authorization: Bearer <token>)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// auto-refresh access token on 401
// backend's /auth/refresh reads the OLD token from the Authorization header
// (no refresh cookie exists on the backend), so we just resend the current token.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        const newToken = data.token.replace('Bearer ', '');
        localStorage.setItem('token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;