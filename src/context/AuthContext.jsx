import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// backend returns { id, ... } but several pages compare against user._id —
// normalize once here so both keys are always present and in sync.
const normalizeUser = (u) => (u ? { ...u, _id: u._id || u.id, id: u.id || u._id } : u);

export function AuthProvider({ children }) {
  const [user, setUserRaw] = useState(null);
  const setUser = (value) => setUserRaw((prev) => {
    const next = typeof value === 'function' ? value(prev) : value;
    return normalizeUser(next);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    // backend: GET /api/auth/me -> { success, user }
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    // backend: POST /api/auth/login -> { success, token: "Bearer <jwt>", user }
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token.replace('Bearer ', ''));
    setUser(data.user);
  };

  const register = async (email, username, password) => {
    // backend: POST /api/auth/register { email, username, password } -> { success, token, user }
    const { data } = await api.post('/auth/register', { email, username, password });
    localStorage.setItem('token', data.token.replace('Bearer ', ''));
    setUser(data.user);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('token');
    setUser(null);
  };

  // backend: POST /api/auth/forgot-password { email } -> { success, message }
  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  };

  // backend: POST /api/auth/reset-password { token, password } -> { success, message }
  const resetPassword = async (token, password) => {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  };

  // backend: PUT /api/auth/change-password { currentPassword, newPassword } (auth) -> { success, message }
  const changePassword = async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
    return data;
  };

  // backend: POST /api/auth/verify-email { token } -> { success, message }
  const verifyEmail = async (token) => {
    const { data } = await api.post('/auth/verify-email', { token });
    setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
    return data;
  };

  // backend: POST /api/auth/resend-verification (auth) -> { success, message }
  const resendVerification = async () => {
    const { data } = await api.post('/auth/resend-verification');
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);