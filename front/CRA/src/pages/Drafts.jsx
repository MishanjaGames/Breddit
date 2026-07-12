import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { listDrafts, deleteDraft } from '../utils/drafts';
import DraftListBody from '../components/DraftListBody';

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
      <DraftListBody drafts={drafts} onDelete={remove} />
    </div>
  );
}
