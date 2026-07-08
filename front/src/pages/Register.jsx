import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.email, form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка реєстрації');
    }
  };

  return (
    <div className="col-md-5 col-lg-4 mx-auto mt-5">
      <h3 className="mb-3">Реєстрація</h3>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="form-control mb-2" placeholder="Username" required
          value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="form-control mb-3" type="password" placeholder="Пароль" required minLength={8}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn btn-primary w-100" type="submit">Зареєструватись</button>
      </form>
      <p className="mt-3 small">Вже маєте акаунт? <Link to="/login">Увійти</Link></p>
    </div>
  );
}
