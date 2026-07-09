import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function CreateSubreddit() {
  const [form, setForm] = useState({ name: '', title: '', description: '', isPrivate: false });
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/subreddits', form);
      success('Спільнота успішно створена!');
      navigate(`/r/${data.subreddit.name}`);
    } catch (err) {
      error(err.response?.data?.error || 'Помилка створення');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-md-6 mx-auto mt-4">
      <h4 className="mb-3">Нова спільнота</h4>
      <form onSubmit={submit}>
        <input 
          className="form-control mb-2" 
          placeholder="Назва (name)" 
          required
          disabled={loading}
          value={form.name} 
          onChange={(e) => setForm({ ...form, name: e.target.value })} 
        />
        <input 
          className="form-control mb-2" 
          placeholder="Заголовок (title)" 
          required
          disabled={loading}
          value={form.title} 
          onChange={(e) => setForm({ ...form, title: e.target.value })} 
        />
        <textarea 
          className="form-control mb-2" 
          placeholder="Опис" 
          rows={3}
          disabled={loading}
          value={form.description} 
          onChange={(e) => setForm({ ...form, description: e.target.value })} 
        />
        <div className="form-check mb-3">
          <input 
            className="form-check-input" 
            type="checkbox" 
            id="isPrivate"
            disabled={loading}
            checked={form.isPrivate} 
            onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} 
          />
          <label className="form-check-label" htmlFor="isPrivate">Приватна спільнота</label>
        </div>
        <button 
          className="btn btn-primary w-100" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Завантаження...' : 'Створити'}
        </button>
      </form>
    </div>
  );
}
