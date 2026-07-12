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
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickFile = (file, setPreview, setFile) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let patch = {};

      const { data: profileData } = await api.put('/users/me', { nickname, status, bio });
      patch = { ...patch, ...profileData.user };

      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const { data } = await api.put('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        patch.avatar = data.avatar;
      }

      if (bannerFile) {
        const form = new FormData();
        form.append('banner', bannerFile);
        const { data } = await api.put('/users/me/banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        patch.banner = data.banner;
      }

      onSaved?.(patch);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Не вдалося зберегти зміни');
    } finally {
      setBusy(false);
    }
  };

  const TABS = [
    { key: 'info', label: 'Профіль' },
    { key: 'avatar', label: 'Аватар' },
    { key: 'banner', label: 'Банер' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>
        <form className="edit-community-card" onSubmit={submit}>
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
                  onChange={(e) => setNickname(e.target.value)}
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
                onChange={(e) => pickFile(e.target.files?.[0], setAvatarPreview, setAvatarFile)}
              />
              <button type="button" className="btn btn-outline btn-sm file-btn" onClick={() => avatarInputRef.current?.click()}>
                Завантажити аватар
              </button>
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
                onChange={(e) => pickFile(e.target.files?.[0], setBannerPreview, setBannerFile)}
              />
              <button type="button" className="btn btn-outline btn-sm file-btn" onClick={() => bannerInputRef.current?.click()}>
                Завантажити банер
              </button>
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Збереження…' : 'Зберегти зміни'}
          </button>
        </form>
      </div>
    </div>
  );
}