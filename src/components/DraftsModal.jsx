import { useEffect, useState } from 'react';
import { listDrafts, deleteDraft } from '../utils/drafts';
import { useToast } from '../context/ToastContext';
import DraftListBody from './DraftListBody';

export default function DraftsModal({ onClose }) {
  const toast = useToast();
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const remove = (id) => {
    deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    toast.success('Чернетку видалено');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>
        <h1>Чернетки</h1>
        <p className="drafts-hint">
          Чернетки зберігаються лише в цьому браузері та не синхронізуються між пристроями.
        </p>
        <DraftListBody drafts={drafts} onDelete={remove} onNavigate={onClose} />
      </div>
    </div>
  );
}
