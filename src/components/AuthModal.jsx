import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import { useToast } from '../context/ToastContext';
import PasswordField from './PasswordField';
import GoogleAuthButton from './GoogleAuthButton';

export default function AuthModal() {
  const { mode, close, openLogin, openRegister } = useAuthModal();
  const { login, register } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, close]);

  if (!mode) return null;

  const isLogin = mode === 'login';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Вхід виконано');
      } else {
        await register(email, username, password);
        toast.success('Акаунт створено');
      }
      close();
    } catch {
      setError(isLogin ? 'Невірний email або пароль' : 'Не вдалося створити акаунт');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close} aria-label="Закрити">✕</button>
        <form className="auth-card auth-card-modal" onSubmit={submit}>
          <h1>{isLogin ? 'Увійти' : 'Зареєструватися'}</h1>
          {error && <p className="auth-error">{error}</p>}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          {!isLogin && (
            <label>
              Ім'я користувача
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_'))} required />
            </label>
          )}
          <label>
            Пароль
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {!isLogin && (
            <label>
              Повторіть пароль
              <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </label>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? '…' : isLogin ? 'Увійти' : 'Зареєструватися'}
          </button>
          {isLogin && (
            <p className="auth-switch">
              <a href="/forgot-password" onClick={close}>Забули пароль?</a>
            </p>
          )}
          <div className="auth-divider">або</div>
          <GoogleAuthButton label={isLogin ? 'Увійти через Google' : 'Зареєструватися через Google'} />
          <p className="auth-switch">
            {isLogin ? (
              <>Немає акаунта? <button type="button" className="link-btn" onClick={openRegister}>Зареєструватися</button></>
            ) : (
              <>Вже є акаунт? <button type="button" className="link-btn" onClick={openLogin}>Увійти</button></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
