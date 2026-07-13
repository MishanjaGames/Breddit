import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordField from '../components/PasswordField';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      toast.success('Вхід виконано');
      navigate('/');
    } catch {
      setError('Невірний email або пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Увійти</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Пароль
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Вхід…' : 'Увійти'}
        </button>
        <div className="auth-divider">або</div>
        <GoogleAuthButton label="Увійти через Google" />
        <p className="auth-switch">Немає акаунта? <Link to="/register">Зареєструватися</Link></p>
      </form>
    </div>
  );
}
