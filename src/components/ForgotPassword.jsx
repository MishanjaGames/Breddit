import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Не вдалося надіслати лист. Спробуйте пізніше.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Перевірте пошту</h1>
          <p>Якщо ця адреса зареєстрована, ми надіслали на неї посилання для скидання пароля.</p>
          <Link to="/login" className="btn btn-primary btn-block">Повернутися до входу</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Забули пароль?</h1>
        <p>Введіть email, і ми надішлемо посилання для скидання пароля.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? '…' : 'Надіслати посилання'}
        </button>
        <p className="auth-switch">
          Згадали пароль? <Link to="/login">Увійти</Link>
        </p>
      </form>
    </div>
  );
}