import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.emailOrUsername, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка входу');
    }
  };

  return (
    <div className="col-md-5 col-lg-4 mx-auto mt-5">
      <h3 className="mb-3">Увійти</h3>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder="Email або username" required
          value={form.emailOrUsername}
          onChange={(e) => setForm({ ...form, emailOrUsername: e.target.value })} />
        <input className="form-control mb-3" type="password" placeholder="Пароль" required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn btn-primary w-100" type="submit">Увійти</button>
      </form>
      <p className="mt-3 small">Немає акаунту? <Link to="/register">Зареєструватись</Link></p>
    </div>
  );
}
