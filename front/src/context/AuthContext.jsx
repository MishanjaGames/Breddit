import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);