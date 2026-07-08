import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function CreateSubreddit() {
  const [form, setForm] = useState({ name: '', title: '', description: '', isPrivate: false });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/subreddits', form);
      navigate(`/r/${data.subreddit.name}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка створення');
    }
  };

  return (
    <div className="col-md-6 mx-auto mt-4">
      <h4 className="mb-3">Нова спільнота</h4>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder="Назва (name)" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="form-control mb-2" placeholder="Заголовок (title)" required
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="form-control mb-2" placeholder="Опис" rows={3}
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="form-check mb-3">
          <input className="form-check-input" type="checkbox" id="isPrivate"
            checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} />
          <label className="form-check-label" htmlFor="isPrivate">Приватна спільнота</label>
        </div>
        <button className="btn btn-primary w-100" type="submit">Створити</button>
      </form>
    </div>
  );
}
