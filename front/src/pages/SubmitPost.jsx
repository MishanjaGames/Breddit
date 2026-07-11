import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useToast } from '../context/ToastContext';

export default function SubmitPost() {
  const { name } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const category = await resolveCategoryByName(name);
      if (!category) throw new Error('no category');
      await api.post('/posts', { title, description, category: category._id });
      toast.success('Пост опубліковано');
      navigate(`/r/${encodeURIComponent(name)}`);
    } catch {
      toast.error('Не вдалося опублікувати пост');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Створити пост у r/{name}</h1>
        <label>
          Заголовок
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Текст
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Публікація…' : 'Опублікувати'}
        </button>
      </form>
    </div>
  );
}