import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { verifyEmail } = useAuth();
  const ran = useRef(false);
  const [status, setStatus] = useState('pending'); // pending | success | error

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [params, verifyEmail]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        {status === 'pending' && <h1>Підтверджуємо email…</h1>}
        {status === 'success' && (
          <>
            <h1>Email підтверджено ✅</h1>
            <p>Дякуємо! Ваша адреса підтверджена.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Не вдалося підтвердити</h1>
            <p>Посилання недійсне або застаріле. Запросіть нове в налаштуваннях акаунта.</p>
          </>
        )}
        <Link to="/" className="btn btn-primary btn-block">На головну</Link>
      </div>
    </div>
  );
}