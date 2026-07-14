import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error('Не вдалося увійти через Google');
      navigate('/login', { replace: true });
      return;
    }
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    localStorage.setItem('token', token);
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        toast.success('Вхід виконано');
        navigate('/', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Не вдалося увійти через Google');
        navigate('/login', { replace: true });
      });
  }, [params, navigate, setUser, toast]);

  return <p className="feed-status">Вхід через Google…</p>;
}
