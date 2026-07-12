import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { resolveCategoryByName } from '../api/resolve';
import { useToast } from '../context/ToastContext';
import ContentBlockEditor from '../components/ContentBlockEditor';
import CommunityPickerModal from '../components/CommunityPickerModal';
import DraftsModal from '../components/DraftsModal';
import { mediaUrl } from '../utils/media';
import { getDraft, saveDraft, deleteDraft } from '../utils/drafts';

let blockIdCounter = 0;
const nextId = () => `blk-${Date.now()}-${blockIdCounter++}`;

export default function SubmitPost() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const navigate = useNavigate();
  const toast = useToast();

  const [category, setCategory] = useState(null); // { _id, name, icon, rules } | null
  const [categoryLoading, setCategoryLoading] = useState(!!name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([{ id: nextId(), type: 'text', text: '' }]);
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);

  // resolve the community from the URL (if present)
  useEffect(() => {
    if (!name) { setCategoryLoading(false); return; }
    let cancelled = false;
    setCategoryLoading(true);
    resolveCategoryByName(name)
      .then((cat) => { if (!cancelled) setCategory(cat); })
      .finally(() => { if (!cancelled) setCategoryLoading(false); });
    return () => { cancelled = true; };
  }, [name]);

  // load draft content (title/description text only — files can't be persisted to localStorage)
  useEffect(() => {
    if (!draftId) return;
    const draft = getDraft(draftId);
    if (draft) {
      setTitle(draft.title || '');
      setBlocks([{ id: nextId(), type: 'text', text: draft.description || '' }]);
      if (draft.community && !name) {
        resolveCategoryByName(draft.community).then((cat) => { if (cat) setCategory(cat); });
      }
    }
  }, [draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // if we're on the community-less /submit route and no draft supplied one, open the picker right away
  useEffect(() => {
    if (!name && !categoryLoading && !category) {
      setPickerOpen(true);
    }
  }, [name, categoryLoading, category]);

  const handleCommunitySelected = (cat) => {
    setCategory(cat);
    setPickerOpen(false);
    // move the URL to /r/:name/submit so refresh/back behave sanely, keeping any draft param
    const suffix = currentDraftId ? `?draft=${currentDraftId}` : '';
    navigate(`/r/${encodeURIComponent(cat.name)}/submit${suffix}`, { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !category) return;
    setBusy(true);
    try {
      const contentSpec = blocks.map((b) => (
        b.type === 'text' ? { type: 'text', text: b.text } : { type: b.type }
      ));
      const orderedFiles = blocks.filter((b) => b.type !== 'text' && b.file).map((b) => b.file);

      const form = new FormData();
      form.append('title', title);
      form.append('category', category._id);
      form.append('contentSpec', JSON.stringify(contentSpec));
      orderedFiles.forEach((f) => form.append('media', f));

      await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (currentDraftId) deleteDraft(currentDraftId);
      toast.success('Пост опубліковано');
      navigate(`/r/${encodeURIComponent(category.name)}`);
    } catch {
      toast.error('Не вдалося опублікувати пост');
    } finally {
      setBusy(false);
    }
  };

  const saveAsDraft = () => {
    const firstText = blocks.find((b) => b.type === 'text')?.text || '';
    if (!title.trim() && !firstText.trim()) return;
    setSavingDraft(true);
    try {
      const draft = saveDraft({ id: currentDraftId, community: category?.name || '', title, description: firstText });
      setCurrentDraftId(draft.id);
      toast.success('Чернетку збережено');
    } finally {
      setSavingDraft(false);
    }
  };

  const rules = category?.rules || [];

  return (
    <div className="submit-post-page">
      <div className="submit-post-main">
        <div className="submit-post-head-row">
          <h1>Створити пост</h1>
          <button type="button" className="link-btn" onClick={() => setDraftsOpen(true)}>Drafts</button>
        </div>

        <button type="button" className="community-select-pill" onClick={() => setPickerOpen(true)}>
          {category ? (
            <>
              {category.icon ? (
                <img className="sub-icon" src={mediaUrl(category.icon) || category.icon} alt="" />
              ) : (
                <span className="sub-icon">{category.name[0]?.toUpperCase()}</span>
              )}
              <span>r/{category.name}</span>
            </>
          ) : (
            <span>{categoryLoading ? 'Завантаження…' : 'Оберіть спільноту'}</span>
          )}
          <span className="community-select-caret">⌄</span>
        </button>

        <form onSubmit={submit} className="submit-post-form">
          <div className="submit-post-title-row">
            <input
              type="text"
              className="submit-post-title-input"
              placeholder="Заголовок*"
              value={title}
              maxLength={300}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <span className="post-meta-text">{title.length}/300</span>
          </div>

          <ContentBlockEditor blocks={blocks} onChange={setBlocks} />

          <div className="submit-post-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={saveAsDraft}
              disabled={savingDraft}
            >
              {savingDraft ? 'Збереження…' : 'Save Draft'}
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy || !category}>
              {busy ? 'Публікація…' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {(rules.length > 0) && (
        <aside className="submit-post-side">
          <div className="side-card">
            <h3>R/{category.name.toUpperCase()} RULES</h3>
            <ol className="rules-list">
              {rules.map((r, i) => (
                <li key={i}>{r.title || r}</li>
              ))}
            </ol>
          </div>
        </aside>
      )}

      {pickerOpen && (
        <CommunityPickerModal
          onSelect={handleCommunitySelected}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {draftsOpen && <DraftsModal onClose={() => setDraftsOpen(false)} />}
    </div>
  );
}
