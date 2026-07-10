import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function CreateSubreddit() {
  // backend Category model only has { name, description }
  const [form, setForm] = useState({ name: '', description: '' });
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // backend: POST /api/categories { name, description } -> category object directly
      const { data } = await api.post('/categories', form);
      success('Спільнота успішно створена!');
      navigate(`/r/${encodeURIComponent(data.name)}`);
    } catch (err) {
      error(err.response?.data?.message || 'Помилка створення');
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
        <textarea
          className="form-control mb-3"
          placeholder="Опис"
          rows={3}
          disabled={loading}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
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