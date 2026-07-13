import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { TOPICS, MAX_TAGS, tagDisplay } from '../utils/topics';
import { useConfirm } from '../context/ConfirmContext';

export default function EditCommunityModal({ category, initialTarget, onClose, onSaved }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState(initialTarget === 'description' ? 'name' : (initialTarget || 'name'));
  const [name, setName] = useState(category.name || '');
  const [description, setDescription] = useState(category.description || '');
  const [icon, setIcon] = useState(category.icon || '');
  const [banner, setBanner] = useState(category.banner || '');
  const [status, setStatus] = useState(category.status || 'public');
  const [tags, setTags] = useState(category.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(null); // null | 'tab' | 'all'
  const [error, setError] = useState('');
  const [savedTab, setSavedTab] = useState(null);
  const [avatarStatus, setAvatarStatus] = useState('');
  const [bannerStatus, setBannerStatus] = useState('');
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // baseline snapshots per tab, so each tab can show its own "unsaved" dot
  const initial = useRef({
    name: category.name || '', description: category.description || '',
    status: category.status || 'public', tags: JSON.stringify(category.tags || []),
  });

  const nameDirty = name !== initial.current.name || description !== initial.current.description;
  const statusDirty = status !== initial.current.status;
  const tagsDirty = JSON.stringify(tags) !== initial.current.tags;
  const anyDirty = nameDirty || statusDirty || tagsDirty;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyDirty]);

  const requestClose = async () => {
    if (anyDirty) {
      const ok = await confirm.confirm('У вас є незбережені зміни спільноти. Закрити без збереження?');
      if (!ok) return;
    }
    onClose();
  };

  const readAsDataUrl = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const sendPatch = async (patch) => {
    const { data } = await api.put(`/categories/${category._id}`, patch);
    onSaved?.(data);
    return data;
  };

  // autosave: image is sent to the server as soon as it's picked, no separate "save" step
  const autoSaveAvatar = async (file) => {
    if (!file) return;
    setAvatarStatus('Завантаження…');
    try {
      const dataUrl = await readAsDataUrl(file);
      setIcon(dataUrl);
      await sendPatch({ icon: dataUrl });
      setAvatarStatus('Збережено ✓');
      setTimeout(() => setAvatarStatus(''), 1500);
    } catch {
      setAvatarStatus('');
      setError('Не вдалося зберегти зображення');
    }
  };

  const autoSaveBanner = async (file) => {
    if (!file) return;
    setBannerStatus('Завантаження…');
    try {
      const dataUrl = await readAsDataUrl(file);
      setBanner(dataUrl);
      await sendPatch({ banner: dataUrl });
      setBannerStatus('Збережено ✓');
      setTimeout(() => setBannerStatus(''), 1500);
    } catch {
      setBannerStatus('');
      setError('Не вдалося зберегти банер');
    }
  };

  const removeAvatar = async () => {
    setIcon('');
    try { await sendPatch({ icon: '' }); } catch { setError('Не вдалося прибрати зображення'); }
  };

  const removeBanner = async () => {
    setBanner('');
    try { await sendPatch({ banner: '' }); } catch { setError('Не вдалося прибрати банер'); }
  };

  // save only the fields belonging to the currently open tab (avatar/banner already autosaved)
  const saveTab = async () => {
    setBusy('tab');
    setError('');
    setSavedTab(null);
    try {
      if (tab === 'name') await sendPatch({ name, description });
      if (tab === 'status') await sendPatch({ status });
      if (tab === 'tags') await sendPatch({ tags });
      initial.current = { name, description, status, tags: JSON.stringify(tags) };
      setSavedTab(tab);
      setTimeout(() => setSavedTab((t) => (t === tab ? null : t)), 1500);
    } catch {
      setError('Не вдалося зберегти зміни');
    } finally {
      setBusy(null);
    }
  };

  // save every field across all tabs at once, then close
  const saveAll = async (e) => {
    e.preventDefault();
    setBusy('all');
    setError('');
    try {
      await sendPatch({ name, description, icon, banner, status, tags, rules: category.rules || [] });
      onClose();
    } catch {
      setError('Не вдалося зберегти зміни');
    } finally {
      setBusy(null);
    }
  };

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
  };

  // native HTML5 drag-and-drop reorder of tag chips
  const onDragStart = (i) => (e) => {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    setDragOverIndex(i);
  };
  const onDrop = (i) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    setDragOverIndex(null);
    dragIndex.current = null;
    if (from === null || from === i) return;
    setTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
  };

  const TABS = [
    { key: 'name', label: 'Назва та опис', dirty: nameDirty },
    { key: 'avatar', label: 'Зображення' },
    { key: 'banner', label: 'Банер' },
    { key: 'status', label: 'Статус', dirty: statusDirty },
    { key: 'tags', label: 'Теги', dirty: tagsDirty },
  ];

  return (
    <div className="modal-overlay" onClick={requestClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={requestClose} aria-label="Закрити">✕</button>
        <form className="edit-community-card" onSubmit={saveAll}>
          <h1>Керувати спільнотою</h1>
          {error && <p className="auth-error">{error}</p>}

          <div className="edit-community-tabs">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`edit-community-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.dirty && <span className="unsaved-dot" title="Незбережені зміни" />}
              </button>
            ))}
          </div>

          {tab === 'name' && (
            <div className="edit-community-panel">
              <label>
                Назва спільноти
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={21} required />
              </label>
              <label>
                Опис
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500} />
              </label>
            </div>
          )}

          {tab === 'avatar' && (
            <div className="edit-community-panel edit-community-panel-center">
              <div className="edit-avatar-preview">
                {icon ? <img src={icon} alt="" /> : <span className="sub-icon large">{name[0]?.toUpperCase() || '?'}</span>}
              </div>
              <label className="btn btn-outline btn-sm file-btn">
                Завантажити зображення
                <input type="file" accept="image/*" hidden onChange={(e) => autoSaveAvatar(e.target.files?.[0])} />
              </label>
              {icon && (
                <button type="button" className="link-btn" onClick={removeAvatar}>Прибрати зображення</button>
              )}
              <p className="autosave-status">{avatarStatus}</p>
            </div>
          )}

          {tab === 'banner' && (
            <div className="edit-community-panel edit-community-panel-center">
              <div className="edit-banner-preview" style={banner ? { backgroundImage: `url(${banner})` } : undefined} />
              <label className="btn btn-outline btn-sm file-btn">
                Завантажити банер
                <input type="file" accept="image/*" hidden onChange={(e) => autoSaveBanner(e.target.files?.[0])} />
              </label>
              {banner && (
                <button type="button" className="link-btn" onClick={removeBanner}>Прибрати банер</button>
              )}
              <p className="autosave-status">{bannerStatus}</p>
            </div>
          )}

          {tab === 'status' && (
            <div className="edit-community-panel">
              <label>
                Статус спільноти
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="public">Публічна</option>
                  <option value="restricted">Обмежена</option>
                  <option value="private">Приватна</option>
                </select>
              </label>
            </div>
          )}

          {tab === 'tags' && (
            <div className="edit-community-panel">
              <p className="post-meta-text">Оберіть до {MAX_TAGS} тем (той самий список, що й при створенні спільноти).</p>
              <div className="topic-grid">
                {TOPICS.map(([icon, label, key]) => {
                  const active = tags.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`topic-chip ${active ? 'active' : ''}`}
                      onClick={() => (active ? setTags(tags.filter((x) => x !== key)) : (tags.length < MAX_TAGS && addTag(key)))}
                      disabled={!active && tags.length >= MAX_TAGS}
                    >
                      <span>{icon}</span> {label}
                    </button>
                  );
                })}
              </div>

              <label>
                Додати власний тег
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tags.length < MAX_TAGS) addTag(tagInput);
                        setTagInput('');
                      }
                    }}
                    placeholder="news, gaming, ..."
                    disabled={tags.length >= MAX_TAGS}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { if (tags.length < MAX_TAGS) addTag(tagInput); setTagInput(''); }}
                    disabled={tags.length >= MAX_TAGS}
                  >
                    Додати
                  </button>
                </div>
              </label>

              <p className="post-meta-text">Обрано {tags.length}/{MAX_TAGS}. Перетягуйте теги нижче, щоб змінити порядок.</p>

              <div className="tag-chip-list">
                {tags.map((t, i) => (
                  <span
                    key={t}
                    className={`tag-chip draggable ${dragIndex.current === i ? 'dragging' : ''} ${dragOverIndex === i ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={onDragStart(i)}
                    onDragOver={onDragOver(i)}
                    onDrop={onDrop(i)}
                    onDragEnd={() => { dragIndex.current = null; setDragOverIndex(null); }}
                    title="Перетягніть, щоб змінити порядок"
                  >
                    ⠿ {tagDisplay(t)}
                    <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Прибрати тег ${t}`}>✕</button>
                  </span>
                ))}
                {tags.length === 0 && <span className="post-meta-text">Тегів ще немає</span>}
              </div>
              <p className="post-meta-text">Спільноти з тегом <strong>news</strong> потраплять у стрічку «Новини».</p>
            </div>
          )}

          {tab !== 'avatar' && tab !== 'banner' && (
            <div className="edit-community-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={saveTab}
                disabled={busy !== null}
              >
                {busy === 'tab' ? 'Збереження…' : savedTab === tab ? 'Збережено ✓' : 'Зберегти цю вкладку'}
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy !== null}>
                {busy === 'all' ? 'Збереження…' : 'Зберегти все'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}