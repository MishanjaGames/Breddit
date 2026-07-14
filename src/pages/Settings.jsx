import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordField from '../components/PasswordField';

export default function Settings() {
  const { user, changePassword, resendVerification } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  if (!user) {
    return <p className="feed-status">Увійдіть, щоб переглянути налаштування.</p>;
  }

  const isOAuthOnly = user.emailVerified === undefined ? false : false; // password presence isn't in user payload; form still guards via server error

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Нові паролі не співпадають');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Пароль змінено');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Не вдалося змінити пароль');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success('Лист підтвердження надіслано');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не вдалося надіслати лист');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>Налаштування акаунта</h1>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Email</h2>
          <p>{user.email}</p>
          {user.emailVerified ? (
            <p style={{ color: 'var(--success, #2e7d32)' }}>✅ Підтверджено</p>
          ) : (
            <>
              <p style={{ color: 'var(--warning, #b26a00)' }}>⚠️ Не підтверджено</p>
              <button className="btn btn-secondary" type="button" onClick={handleResend} disabled={resending}>
                {resending ? '…' : 'Надіслати лист підтвердження знову'}
              </button>
            </>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Змінити пароль</h2>
          {error && <p className="auth-error">{error}</p>}
          <form onSubmit={submitPassword}>
            <label>
              Поточний пароль
              <PasswordField value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </label>
            <label>
              Новий пароль
              <PasswordField value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
            </label>
            <label>
              Повторіть новий пароль
              <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </label>
            <br/>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? '…' : 'Зберегти пароль'}
            </button>
          </form>
          <p className="auth-switch" style={{ marginTop: 8 }}>
            Увійшли через Google і не маєте пароля? Скористайтесь формою «Забули пароль» на сторінці входу, щоб встановити його.
          </p>
        </section>
      </div>
    </div>
  );
}