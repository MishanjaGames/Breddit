import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useToast } from '../context/ToastContext';
import MediaPicker from '../components/MediaPicker';
import { getDraft, saveDraft, deleteDraft } from '../utils/drafts';

export default function SubmitPost() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);

  useEffect(() => {
    if (!draftId) return;
    const draft = getDraft(draftId);
    if (draft) {
      setTitle(draft.title || '');
      setDescription(draft.description || '');
    }
  }, [draftId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const category = await resolveCategoryByName(name);
      if (!category) throw new Error('no category');

      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('category', category._id);
      files.forEach((f) => form.append('media', f));

      await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (currentDraftId) deleteDraft(currentDraftId);
      toast.success('Пост опубліковано');
      navigate(`/r/${encodeURIComponent(name)}`);
    } catch {
      toast.error('Не вдалося опублікувати пост');
    } finally {
      setBusy(false);
    }
  };

  const saveAsDraft = () => {
    if (!title.trim() && !description.trim()) return;
    setSavingDraft(true);
    try {
      const draft = saveDraft({ id: currentDraftId, community: name, title, description });
      setCurrentDraftId(draft.id);
      toast.success('Чернетку збережено');
    } finally {
      setSavingDraft(false);
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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <MediaPicker files={files} onChange={setFiles} />
        <div className="submit-post-actions">
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={saveAsDraft}
            disabled={savingDraft || (!title.trim() && !description.trim())}
          >
            {savingDraft ? 'Збереження…' : 'Зберегти чернетку'}
          </button>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Публікація…' : 'Опублікувати'}
          </button>
        </div>
      </form>
    </div>
  );
}