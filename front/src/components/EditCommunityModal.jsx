import { useEffect, useState } from 'react';
import api from '../api/client';

const FIELDS = {
  name: (s) => ({ name: s.name, description: s.description }),
  avatar: (s) => ({ icon: s.icon }),
  banner: (s) => ({ banner: s.banner }),
  status: (s) => ({ status: s.status }),
  tags: (s) => ({ tags: s.tags }),
};

export default function EditCommunityModal({ category, initialTarget, onClose, onSaved }) {
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

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const readAsDataUrl = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const state = { name, description, icon, banner, status, tags };

  const sendPatch = async (patch) => {
    const { data } = await api.put(`/categories/${category._id}`, patch);
    onSaved?.(data);
    return data;
  };

  // save only the fields belonging to the currently open tab
  const saveTab = async () => {
    setBusy('tab');
    setError('');
    setSavedTab(null);
    try {
      await sendPatch(FIELDS[tab](state));
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

  const TABS = [
    { key: 'name', label: 'Назва та опис' },
    { key: 'avatar', label: 'Зображення' },
    { key: 'banner', label: 'Банер' },
    { key: 'status', label: 'Статус' },
    { key: 'tags', label: 'Теги' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>
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
                <input type="file" accept="image/*" hidden onChange={(e) => readAsDataUrl(e.target.files?.[0], setIcon)} />
              </label>
              {icon && (
                <button type="button" className="link-btn" onClick={() => setIcon('')}>Прибрати зображення</button>
              )}
            </div>
          )}

          {tab === 'banner' && (
            <div className="edit-community-panel edit-community-panel-center">
              <div className="edit-banner-preview" style={banner ? { backgroundImage: `url(${banner})` } : undefined} />
              <label className="btn btn-outline btn-sm file-btn">
                Завантажити банер
                <input type="file" accept="image/*" hidden onChange={(e) => readAsDataUrl(e.target.files?.[0], setBanner)} />
              </label>
              {banner && (
                <button type="button" className="link-btn" onClick={() => setBanner('')}>Прибрати банер</button>
              )}
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
              <label>
                Додати тег (напр. news)
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = tagInput.trim().toLowerCase();
                        if (t && !tags.includes(t)) setTags([...tags, t]);
                        setTagInput('');
                      }
                    }}
                    placeholder="news, gaming, ..."
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const t = tagInput.trim().toLowerCase();
                      if (t && !tags.includes(t)) setTags([...tags, t]);
                      setTagInput('');
                    }}
                  >
                    Додати
                  </button>
                </div>
              </label>
              <div className="tag-chip-list">
                {tags.map((t) => (
                  <span key={t} className="tag-chip">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Прибрати тег ${t}`}>✕</button>
                  </span>
                ))}
                {tags.length === 0 && <span className="post-meta-text">Тегів ще немає</span>}
              </div>
              <p className="post-meta-text">Спільноти з тегом <strong>news</strong> потраплять у стрічку «Новини».</p>
            </div>
          )}

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
        </form>
      </div>
    </div>
  );
}
