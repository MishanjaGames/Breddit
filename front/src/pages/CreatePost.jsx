import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function CreatePost() {
  const { name } = useParams();
  const [type, setType] = useState('TEXT');
  const [form, setForm] = useState({ title: '', content: '', url: '', mediaUrl: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data: sub } = await api.get(`/subreddits/${name}`);
      const body = { title: form.title, type };
      if (type === 'TEXT') body.content = form.content;
      if (type === 'LINK') body.url = form.url;
      if (type === 'MEDIA') body.mediaUrl = form.mediaUrl;
      const { data } = await api.post(`/subreddits/${sub.subreddit.id}/posts`, body);
      navigate(`/post/${data.post.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка створення поста');
    }
  };

  return (
    <div className="col-md-6 mx-auto mt-4">
      <h4 className="mb-3">Новий пост у r/{name}</h4>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder="Заголовок" required
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="form-select mb-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="TEXT">Текст</option>
          <option value="LINK">Посилання</option>
          <option value="MEDIA">Медіа</option>
        </select>
        {type === 'TEXT' && (
          <textarea className="form-control mb-3" rows={5} placeholder="Текст поста"
            value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        )}
        {type === 'LINK' && (
          <input className="form-control mb-3" placeholder="https://..."
            value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        )}
        {type === 'MEDIA' && (
          <input className="form-control mb-3" placeholder="Посилання на зображення/відео"
            value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} />
        )}
        <button className="btn btn-primary w-100" type="submit">Опублікувати</button>
      </form>
    </div>
  );
}
