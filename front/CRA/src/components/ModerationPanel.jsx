import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import timeAgo from '../utils/timeAgo';

export default function ModerationPanel({ category, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState('pending'); // pending | banned | muted
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [banInput, setBanInput] = useState('');
  const [muteInput, setMuteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const loadLists = () => {
    setLoadingLists(true);
    api.get(`/categories/${category._id}/moderation-lists`)
      .then(({ data }) => {
        setBannedUsers(data?.bannedUsers || []);
        setMutedUsers(data?.mutedUsers || []);
      })
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  };

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category._id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPending(true);
    api.get(`/posts/category/${category._id}/pending`)
      .then(({ data }) => { if (!cancelled) setPending(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setPending([]); })
      .finally(() => { if (!cancelled) setLoadingPending(false); });
    return () => { cancelled = true; };
  }, [category._id]);

  const approve = async (postId) => {
    try {
      await api.post(`/posts/${postId}/approve`);
      setPending((prev) => prev.filter((p) => p._id !== postId));
      toast.success('Пост схвалено');
    } catch {
      toast.error('Не вдалося схвалити пост');
    }
  };

  const reject = async (postId) => {
    try {
      await api.post(`/posts/${postId}/reject`);
      setPending((prev) => prev.filter((p) => p._id !== postId));
      toast.success('Пост відхилено');
    } catch {
      toast.error('Не вдалося відхилити пост');
    }
  };

  // resolves a nickname to a user id via GET /users/:nickname, since ban/mute endpoints take an id
  const resolveNickname = async (nickname) => {
    const clean = nickname.trim().replace(/^u\//, '');
    if (!clean) return null;
    const { data } = await api.get(`/users/${encodeURIComponent(clean)}`);
    return data?.user?._id || null;
  };

  const banByNickname = async () => {
    if (!banInput.trim() || busy) return;
    setBusy(true);
    try {
      const userId = await resolveNickname(banInput);
      if (!userId) { toast.error('Користувача не знайдено'); return; }
      await api.post(`/categories/${category._id}/ban/${userId}`);
      toast.success(`Забанено u/${banInput.trim()}`);
      setBanInput('');
      loadLists();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не вдалося забанити користувача');
    } finally {
      setBusy(false);
    }
  };

  const unban = async (userId, nickname) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.delete(`/categories/${category._id}/ban/${userId}`);
      toast.success(`Розбанено u/${nickname}`);
      loadLists();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не вдалося розбанити користувача');
    } finally {
      setBusy(false);
    }
  };

  const unmute = async (userId, nickname) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.delete(`/categories/${category._id}/mute/${userId}`);
      toast.success(`Знято мут з u/${nickname}`);
      loadLists();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не вдалося зняти мут');
    } finally {
      setBusy(false);
    }
  };

  const muteByNickname = async () => {
    if (!muteInput.trim() || busy) return;
    setBusy(true);
    try {
      const userId = await resolveNickname(muteInput);
      if (!userId) { toast.error('Користувача не знайдено'); return; }
      await api.post(`/categories/${category._id}/mute/${userId}`);
      toast.success(`Замучено u/${muteInput.trim()}`);
      setMuteInput('');
      loadLists();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не вдалося замутити користувача');
    } finally {
      setBusy(false);
    }
  };

  const TABS = [
    { key: 'pending', label: `Черга модерації${pending.length ? ` (${pending.length})` : ''}` },
    { key: 'banned', label: 'Бан' },
    { key: 'muted', label: 'Мут' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрити">✕</button>
        <div className="edit-community-card">
          <h1>Модерація r/{category.name}</h1>

          <div className="mod-panel-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`mod-panel-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'pending' && (
            <div className="edit-community-panel">
              {loadingPending && <p className="feed-status">Завантаження…</p>}
              {!loadingPending && pending.length === 0 && <p className="post-meta-text">Немає постів, що очікують схвалення.</p>}
              {pending.map((post) => (
                <div className="mod-post-row" key={post._id}>
                  <div className="mod-post-title">
                    <strong>{post.title}</strong>
                    <div className="post-meta-text">u/{post.author?.nickname || '?'} · {timeAgo(post.createdAt)}</div>
                  </div>
                  <div className="mod-post-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => approve(post._id)}>Схвалити</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => reject(post._id)}>Відхилити</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'banned' && (
            <div className="edit-community-panel">
              <label>
                Забанити за нікнеймом
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={banInput}
                    onChange={(e) => setBanInput(e.target.value)}
                    placeholder="nickname"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); banByNickname(); } }}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={banByNickname} disabled={busy}>
                    Забанити
                  </button>
                </div>
              </label>
              <p className="post-meta-text">Забанений користувач не може постити чи коментувати в цій спільноті.</p>

              {loadingLists && <p className="feed-status">Завантаження…</p>}
              {!loadingLists && bannedUsers.length === 0 && <p className="post-meta-text">Немає забанених користувачів.</p>}
              {bannedUsers.map((u) => (
                <div className="mod-user-row" key={u._id}>
                  <span>u/{u.nickname}</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => unban(u._id, u.nickname)} disabled={busy}>
                    Розбанити
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'muted' && (
            <div className="edit-community-panel">
              <label>
                Замутити за нікнеймом
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={muteInput}
                    onChange={(e) => setMuteInput(e.target.value)}
                    placeholder="nickname"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); muteByNickname(); } }}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={muteByNickname} disabled={busy}>
                    Замутити
                  </button>
                </div>
              </label>
              <p className="post-meta-text">Замучений користувач може постити, але його коментарі приховані.</p>

              {loadingLists && <p className="feed-status">Завантаження…</p>}
              {!loadingLists && mutedUsers.length === 0 && <p className="post-meta-text">Немає замучених користувачів.</p>}
              {mutedUsers.map((u) => (
                <div className="mod-user-row" key={u._id}>
                  <span>u/{u.nickname}</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => unmute(u._id, u.nickname)} disabled={busy}>
                    Зняти мут
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
