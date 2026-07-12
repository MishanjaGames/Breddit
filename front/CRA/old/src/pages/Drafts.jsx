import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { listDrafts, deleteDraft } from '../utils/drafts';

export default function Drafts() {
  const { user } = useAuth();
  const toast = useToast();
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  const remove = (id) => {
    deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    toast.success('Чернетку видалено');
  };

  if (!user) return <p className="feed-status">Увійдіть, щоб переглядати чернетки.</p>;

  return (
    <div className="drafts-page">
      <h1>Чернетки</h1>
      <p className="drafts-hint">
        Чернетки зберігаються лише в цьому браузері та не синхронізуються між пристроями.
      </p>

      {drafts.length === 0 && (
        <p className="feed-status">У вас ще немає чернеток. Почніть створювати пост і натисніть «Зберегти чернетку».</p>
      )}

      <div className="draft-list">
        {drafts.map((d) => (
          <div key={d.id} className="draft-card">
            <div className="draft-card-body">
              <span className="post-meta-text">
                {d.community ? `r/${d.community}` : 'Без спільноти'} · {timeAgo(d.updatedAt)}
              </span>
              <h3 className="draft-card-title">{d.title || 'Без заголовка'}</h3>
              {d.description && <p className="draft-card-desc">{d.description}</p>}
            </div>
            <div className="draft-card-actions">
              {d.community && (
                <Link className="btn btn-primary btn-sm" to={`/r/${encodeURIComponent(d.community)}/submit?draft=${d.id}`}>
                  Редагувати
                </Link>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => remove(d.id)}>Видалити</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}