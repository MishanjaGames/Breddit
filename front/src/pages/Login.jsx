import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { success, error } = useToast();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.emailOrUsername, form.password);
      success('Успішно увійшли!');
      navigate('/');
    } catch (err) {
      error(err.response?.data?.error || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-md-5 col-lg-4 mx-auto mt-5">
      <h3 className="mb-3">Увійти</h3>
      <form onSubmit={submit}>
        <input 
          className="form-control mb-2" 
          placeholder="Email або username" 
          required
          disabled={loading}
          value={form.emailOrUsername}
          onChange={(e) => setForm({ ...form, emailOrUsername: e.target.value })} 
        />
        <input 
          className="form-control mb-3" 
          type="password" 
          placeholder="Пароль" 
          required
          disabled={loading}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} 
        />
        <button 
          className="btn btn-primary w-100" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Завантаження...' : 'Увійти'}
        </button>
      </form>
      <p className="mt-3 small">Немає акаунту? <Link to="/register">Зареєструватись</Link></p>
    </div>
  );
}
