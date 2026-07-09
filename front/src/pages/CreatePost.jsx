import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function CreatePost() {
  const { id } = useParams();
  const [type, setType] = useState('TEXT');
  const [form, setForm] = useState({ title: '', content: '', url: '', mediaUrl: '' });
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.get(`/categories/${id}`);

      const description = type === 'LINK'
        ? form.url
        : type === 'MEDIA'
          ? form.mediaUrl
          : form.content;

      const { data } = await api.post('/posts', {
        title: form.title,
        description,
        category: id,
      });

      success('Пост успішно опублікований!');
      navigate(`/post/${data._id}`);
    } catch (err) {
      error(err.response?.data?.message || err.response?.data?.error || 'Помилка створення поста');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-md-6 mx-auto mt-4">
      <h4 className="mb-3">Новий пост у r/{id}</h4>
      <form onSubmit={submit}>
        <input 
          className="form-control mb-2" 
          placeholder="Заголовок" 
          required
          disabled={loading}
          value={form.title} 
          onChange={(e) => setForm({ ...form, title: e.target.value })} 
        />
        <select 
          className="form-select mb-2" 
          value={type} 
          disabled={loading}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="TEXT">Текст</option>
          <option value="LINK">Посилання</option>
          <option value="MEDIA">Медіа</option>
        </select>
        {type === 'TEXT' && (
          <textarea 
            className="form-control mb-3" 
            rows={5} 
            placeholder="Текст поста"
            disabled={loading}
            value={form.content} 
            onChange={(e) => setForm({ ...form, content: e.target.value })} 
          />
        )}
        {type === 'LINK' && (
          <input 
            className="form-control mb-3" 
            placeholder="https://..."
            disabled={loading}
            value={form.url} 
            onChange={(e) => setForm({ ...form, url: e.target.value })} 
          />
        )}
        {type === 'MEDIA' && (
          <input 
            className="form-control mb-3" 
            placeholder="Посилання на зображення/відео"
            disabled={loading}
            value={form.mediaUrl} 
            onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} 
          />
        )}
        <button 
          className="btn btn-primary w-100" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Завантаження...' : 'Опублікувати'}
        </button>
      </form>
    </div>
  );
}
