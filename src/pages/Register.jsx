import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordField from '../components/PasswordField';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }
    setBusy(true);
    try {
      await register(email, username, password);
      toast.success('Акаунт створено');
      navigate('/');
    } catch {
      setError('Не вдалося створити акаунт');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Зареєструватися</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Ім'я користувача
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_'))} required />
        </label>
        <label>
          Пароль
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Повторіть пароль
          <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Створення…' : 'Зареєструватися'}
        </button>
        <div className="auth-divider">або</div>
        <GoogleAuthButton label="Зареєструватися через Google" />
        <p className="auth-switch">Вже є акаунт? <Link to="/login">Увійти</Link></p>
      </form>
    </div>
  );
}
