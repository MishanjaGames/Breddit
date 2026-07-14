import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordField from '../components/PasswordField';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

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
      await resetPassword(token, password);
      toast.success('Пароль змінено. Тепер увійдіть з новим паролем.');
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Посилання недійсне або застаріле');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Недійсне посилання</h1>
          <p>Токен скидання пароля відсутній. Запросіть нове посилання.</p>
          <Link to="/forgot-password" className="btn btn-primary btn-block">Запросити знову</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Новий пароль</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Новий пароль
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Повторіть пароль
          <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? '…' : 'Зберегти новий пароль'}
        </button>
      </form>
    </div>
  );
}