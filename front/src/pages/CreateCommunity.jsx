import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post('/categories', { name, description });
      toast.success('Спільноту створено');
      navigate(`/r/${encodeURIComponent(data.category?.name || name)}`);
    } catch {
      toast.error('Не вдалося створити спільноту');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Створити спільноту</h1>
        <label>
          Назва
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Опис
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Створення…' : 'Створити'}
        </button>
      </form>
    </div>
  );
}