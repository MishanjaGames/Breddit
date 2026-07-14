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

  // load full draft content — text blocks and any previously-uploaded media blocks (existingUrl)
  useEffect(() => {
    if (!draftId) return;
    const draft = getDraft(draftId);
    if (draft) {
      setTitle(draft.title || '');
      const restored = (draft.blocks || []).map((b) => ({ ...b, id: b.id || nextId() }));
      setBlocks(restored.length > 0 ? restored : [{ id: nextId(), type: 'text', text: '' }]);
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
      const contentSpec = blocks.map((b) => {
        if (b.type === 'text') return { type: 'text', text: b.text };
        if (b.existingUrl) {
          // media already uploaded earlier (e.g. saved in a draft) — reference it directly, no file to (re)upload
          return { type: b.type, existingUrl: b.existingUrl, mimeType: b.mimeType, size: b.size, originalName: b.originalName };
        }
        return { type: b.type };
      });
      // only newly-picked files need uploading now; existingUrl blocks are already on the server
      const orderedFiles = blocks.filter((b) => b.type !== 'text' && b.file && !b.existingUrl).map((b) => b.file);

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

  const saveAsDraft = async () => {
    const firstText = blocks.find((b) => b.type === 'text')?.text || '';
    const hasMedia = blocks.some((b) => b.type !== 'text' && (b.file || b.existingUrl));
    if (!title.trim() && !firstText.trim() && !hasMedia) return;
    setSavingDraft(true);
    try {
      // upload any newly-picked files (blocks that don't already have a server URL) so the draft
      // can be fully serialized to localStorage and its media can be edited/removed later
      const toUpload = blocks.filter((b) => b.type !== 'text' && b.file && !b.existingUrl);
      let uploaded = [];
      if (toUpload.length > 0) {
        const form = new FormData();
        toUpload.forEach((b) => form.append('media', b.file));
        const { data } = await api.post('/posts/draft-media', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded = data.media || [];
      }

      let uploadIdx = 0;
      const serializableBlocks = blocks.map((b) => {
        if (b.type === 'text') return { id: b.id, type: 'text', text: b.text };
        if (b.existingUrl) {
          return { id: b.id, type: b.type, existingUrl: b.existingUrl, mimeType: b.mimeType, size: b.size, originalName: b.originalName };
        }
        if (b.file) {
          const info = uploaded[uploadIdx];
          uploadIdx += 1;
          if (!info) return null; // upload failed for this file — drop the empty block
          return { id: b.id, type: b.type, existingUrl: info.url, mimeType: info.mimeType, size: info.size, originalName: info.originalName || b.file.name };
        }
        return null; // empty media block (no file picked yet) — nothing to persist
      }).filter(Boolean);

      const draft = saveDraft({ id: currentDraftId, community: category?.name || '', title, blocks: serializableBlocks });
      setCurrentDraftId(draft.id);
      toast.success('Чернетку збережено');
    } catch {
      toast.error('Не вдалося зберегти чернетку');
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