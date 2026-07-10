import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function CreateSubreddit() {
  const [form, setForm] = useState({ name: '', description: '', icon: '', banner: '' });
  const [rules, setRules] = useState([]);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addRule = () => setRules([...rules, { title: '', body: '' }]);
  const updateRule = (i, field, value) => {
    const next = [...rules];
    next[i] = { ...next[i], [field]: value };
    setRules(next);
  };
  const removeRule = (i) => setRules(rules.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        rules: rules.filter((r) => r.title.trim()),
      };
      const { data } = await api.post('/categories', payload);
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
          className="form-control mb-2"
          placeholder="Опис"
          rows={3}
          disabled={loading}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          className="form-control mb-2"
          placeholder="URL іконки (необов'язково)"
          disabled={loading}
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
        />
        <input
          className="form-control mb-3"
          placeholder="URL банера (необов'язково)"
          disabled={loading}
          value={form.banner}
          onChange={(e) => setForm({ ...form, banner: e.target.value })}
        />

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label mb-0 fw-semibold">Правила спільноти</label>
            <button type="button" className="btn btn-sm btn-outline-primary btn-round" onClick={addRule} disabled={loading}>
              + Правило
            </button>
          </div>
          {rules.map((r, i) => (
            <div key={i} className="card mb-2">
              <div className="card-body py-2 px-2">
                <div className="d-flex gap-2 mb-1">
                  <input
                    className="form-control form-control-sm"
                    placeholder={`Правило ${i + 1}: назва`}
                    value={r.title}
                    onChange={(e) => updateRule(i, 'title', e.target.value)}
                    disabled={loading}
                  />
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRule(i)} disabled={loading}>
                    ✕
                  </button>
                </div>
                <textarea
                  className="form-control form-control-sm"
                  placeholder="Опис правила (необов'язково)"
                  rows={2}
                  value={r.body}
                  onChange={(e) => updateRule(i, 'body', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary w-100 btn-round"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Завантаження...' : 'Створити'}
        </button>
      </form>
    </div>
  );
}
