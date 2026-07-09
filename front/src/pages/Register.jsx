import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const { success, error } = useToast();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.email, form.username, form.password);
      success('Успішно зареєстровані!');
      navigate('/');
    } catch (err) {
      error(err.response?.data?.message || err.response?.data?.error || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-md-5 col-lg-4 mx-auto mt-5">
      <h3 className="mb-3">Реєстрація</h3>
      <form onSubmit={submit}>
        <input 
          className="form-control mb-2" 
          type="email" 
          placeholder="Email" 
          required
          disabled={loading}
          value={form.email} 
          onChange={(e) => setForm({ ...form, email: e.target.value })} 
        />
        <input 
          className="form-control mb-2" 
          placeholder="Username" 
          required
          disabled={loading}
          value={form.username} 
          onChange={(e) => setForm({ ...form, username: e.target.value })} 
        />
        <input 
          className="form-control mb-3" 
          type="password" 
          placeholder="Пароль" 
          required 
          minLength={8}
          disabled={loading}
          value={form.password} 
          onChange={(e) => setForm({ ...form, password: e.target.value })} 
        />
        <button 
          className="btn btn-primary w-100" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Завантаження...' : 'Зареєструватись'}
        </button>
      </form>
      <p className="mt-3 small">Вже маєте акаунт? <Link to="/login">Увійти</Link></p>
    </div>
  );
}
