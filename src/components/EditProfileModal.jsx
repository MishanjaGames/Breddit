import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { mediaUrl } from '../utils/media';

export default function EditProfileModal({ profile, onClose, onSaved }) {
  const [tab, setTab] = useState('info');
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [status, setStatus] = useState(profile.status || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(mediaUrl(profile.avatar));
  const [bannerPreview, setBannerPreview] = useState(mediaUrl(profile.banner));
  const [busy, setBusy] = useState(null); // null | 'tab' | 'all'
  const [error, setError] = useState('');
  const [savedTab, setSavedTab] = useState(null);
  const [avatarStatus, setAvatarStatus] = useState(''); // autosave status text
  const [bannerStatus, setBannerStatus] = useState('');
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // baseline snapshot of the info tab (avatar/banner autosave immediately, so they're never "dirty")
  const initialInfo = useRef({ nickname: profile.nickname || '', status: profile.status || '', bio: profile.bio || '' });
  const infoDirty = nickname !== initialInfo.current.nickname || status !== initialInfo.current.status || bio !== initialInfo.current.bio;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoDirty]);

  const requestClose = () => {
    if (infoDirty) {
      if (!window.confirm('У вас є незбережені зміни профілю. Закрити без збереження?')) return;
    }
    onClose();
  };

  const saveInfo = async () => {
    const { data } = await api.put('/users/me', { nickname, status, bio });
    onSaved?.(data.user);
    initialInfo.current = { nickname, status, bio };
    return data.user;
  };

  // autosave: fires immediately on file pick, no "Зберегти" step needed
  const autoSaveAvatar = async (file) => {
    setAvatarStatus('Завантаження…');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.put('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved?.({ avatar: data.avatar });
      setAvatarStatus('Збережено ✓');
      setTimeout(() => setAvatarStatus(''), 1500);
    } catch (err) {
      setAvatarStatus('');
      setError(err?.response?.data?.message || 'Не вдалося зберегти аватар');
    }
  };

  const autoSaveBanner = async (file) => {
    setBannerStatus('Завантаження…');
    try {
      const form = new FormData();
      form.append('banner', file);
      const { data } = await api.put('/users/me/banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved?.({ banner: data.banner });
      setBannerStatus('Збережено ✓');
      setTimeout(() => setBannerStatus(''), 1500);
    } catch (err) {
      setBannerStatus('');
      setError(err?.response?.data?.message || 'Не вдалося зберегти банер');
    }
  };

  const pickAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    autoSaveAvatar(file);
  };

  const pickBanner = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(reader.result);
    reader.readAsDataURL(file);
    autoSaveBanner(file);
  };

  // save only the info tab
  const saveTab = async () => {
    setBusy('tab');
    setError('');
    setSavedTab(null);
    try {
      await saveInfo();
      setSavedTab(tab);
      setTimeout(() => setSavedTab((t) => (t === tab ? null : t)), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Не вдалося зберегти зміни');
    } finally {
      setBusy(null);
    }
  };

  // save info and close (avatar/banner already autosaved)
  const saveAll = async (e) => {
    e.preventDefault();
    setBusy('all');
    setError('');
    try {
      await saveInfo();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Не вдалося зберегти зміни');
    } finally {
      setBusy(null);
    }
  };

  const TABS = [
    { key: 'info', label: 'Профіль', dirty: infoDirty },
    { key: 'avatar', label: 'Аватар' },
    { key: 'banner', label: 'Банер' },
  ];

  return (
    <div className="modal-overlay" onClick={requestClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={requestClose} aria-label="Закрити">✕</button>
        <form className="edit-community-card" onSubmit={saveAll}>
          <h1>Редагувати профіль</h1>
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

          {tab === 'info' && (
            <div className="edit-community-panel">
              <label>
                Нікнейм
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/\s+/g, '_'))}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  title="Тільки латинські літери, цифри та підкреслення"
                  required
                />
              </label>
              <label>
                Статус
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  maxLength={100}
                  placeholder="Наприклад: 🚀 Досліджую нові технології"
                />
              </label>
              <label>
                Про себе
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={300} />
              </label>
            </div>
          )}

          {tab === 'avatar' && (
            <div className="edit-community-panel edit-community-panel-center">
              <div className="edit-avatar-preview">
                {avatarPreview ? <img src={avatarPreview} alt="" /> : <span className="sub-icon large">{nickname[0]?.toUpperCase() || '?'}</span>}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => pickAvatar(e.target.files?.[0])}
              />
              <button type="button" className="btn btn-outline btn-sm file-btn" onClick={() => avatarInputRef.current?.click()}>
                Завантажити аватар
              </button>
              <p className="autosave-status">{avatarStatus}</p>
            </div>
          )}

          {tab === 'banner' && (
            <div className="edit-community-panel edit-community-panel-center">
              <div className="edit-banner-preview" style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined} />
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => pickBanner(e.target.files?.[0])}
              />
              <button type="button" className="btn btn-outline btn-sm file-btn" onClick={() => bannerInputRef.current?.click()}>
                Завантажити банер
              </button>
              <p className="autosave-status">{bannerStatus}</p>
            </div>
          )}

          {tab === 'info' && (
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
                {busy === 'all' ? 'Збереження…' : 'Зберегти і закрити'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
