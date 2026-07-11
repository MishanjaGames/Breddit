import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useCreateCommunityModal } from '../context/CreateCommunityModalContext';

const TOPICS = [
  ['🎭', 'Anime & Cosplay'], ['🎨', 'Art'], ['💼', 'Business & Finance'],
  ['🧩', 'Collectibles & Other Hobbies'], ['🎓', 'Education & Career'],
  ['👗', 'Fashion & Beauty'], ['🍔', 'Food & Drinks'], ['🎮', 'Games'],
  ['❤️', 'Health'], ['🏡', 'Home & Garden'], ['📜', 'Humanities & Law'],
  ['💞', 'Identity & Relationships'], ['🌐', 'Internet Culture'], ['🎬', 'Movies & TV'],
  ['🎵', 'Music'], ['🌲', 'Nature & Outdoors'], ['📰', 'News & Politics'],
  ['✈️', 'Places & Travel'], ['✨', 'Pop Culture'], ['❓', 'Q&As & Stories'],
  ['📚', 'Reading & Writing'], ['🔬', 'Sciences'], ['👻', 'Spooky'],
  ['🏅', 'Sports'], ['🚗', 'Vehicles'], ['🧘', 'Wellness'],
  ['🔞', 'Adult Content'], ['🗿', 'Mature Topics'],
];

const STEPS = ['topic', 'type', 'details'];

export default function CreateCommunityModal() {
  const { open, close } = useCreateCommunityModal();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(null);
  const [type, setType] = useState('public');
  const [mature, setMature] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setTopic(null);
      setType('public');
      setMature(false);
      setName('');
      setDescription('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const back = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      // backend POST /api/categories only accepts { name, description, icon, banner, rules }
      const { data } = await api.post('/categories', { name, description });
      toast.success('Спільноту створено');
      close();
      navigate(`/r/${encodeURIComponent(data?.name || name)}`);
    } catch {
      toast.error('Не вдалося створити спільноту');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close} aria-label="Закрити">✕</button>

        <div className="create-community-card">
          <div className="create-community-dots">
            {STEPS.map((s, i) => (
              <span key={s} className={`create-community-dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="create-community-step">
              <h1>What will your community be about?</h1>
              <p className="create-community-subtitle">Choose a topic to help redditors discover your community</p>
              <div className="topic-grid">
                {TOPICS.map(([icon, label]) => (
                  <button
                    type="button"
                    key={label}
                    className={`topic-chip ${topic === label ? 'active' : ''}`}
                    onClick={() => setTopic(label)}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
              <div className="create-community-footer">
                <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={next} disabled={!topic}>Next</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="create-community-step">
              <h1>What kind of community is this?</h1>
              <p className="create-community-subtitle">
                Decide who can view and contribute in your community. Only public communities show up in search. <strong>Important:</strong> Once set, you will need to submit a request to change your community type.
              </p>
              <div className="community-type-list">
                <label className={`community-type-option ${type === 'public' ? 'active' : ''}`}>
                  <div>
                    <strong>Public</strong>
                    <p>Anyone can view, post, and comment to this community</p>
                  </div>
                  <input type="radio" name="type" checked={type === 'public'} onChange={() => setType('public')} />
                </label>
                <label className={`community-type-option ${type === 'restricted' ? 'active' : ''}`}>
                  <div>
                    <strong>Restricted</strong>
                    <p>Anyone can view, but only approved users can contribute</p>
                  </div>
                  <input type="radio" name="type" checked={type === 'restricted'} onChange={() => setType('restricted')} />
                </label>
                <label className={`community-type-option ${type === 'private' ? 'active' : ''}`}>
                  <div>
                    <strong>Private</strong>
                    <p>Only approved users can view and contribute</p>
                  </div>
                  <input type="radio" name="type" checked={type === 'private'} onChange={() => setType('private')} />
                </label>
              </div>

              <div className="community-mature-row">
                <div>
                  <strong>Mature (18+)</strong>
                  <p>Users must be over 18 to view and contribute</p>
                </div>
                <button
                  type="button"
                  className={`user-menu-switch ${mature ? 'on' : ''}`}
                  role="switch"
                  aria-checked={mature}
                  onClick={() => setMature((m) => !m)}
                >
                  <span className="user-menu-switch-knob" />
                </button>
              </div>

              <p className="create-community-legal">
                By continuing, you agree to our <a href="#mod-code" onClick={(e) => e.preventDefault()}>Mod Code of Conduct</a> and acknowledge that you understand the <a href="#reddit-rules" onClick={(e) => e.preventDefault()}>Reddit Rules</a>.
              </p>

              <div className="create-community-footer">
                <button type="button" className="btn btn-outline" onClick={back}>Back</button>
                <button type="button" className="btn btn-primary" onClick={next}>Next</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form className="create-community-step" onSubmit={submit}>
              <h1>Tell us about your community</h1>
              <p className="create-community-subtitle">A name and description help people understand what your community is all about.</p>

              <div className="create-community-details-row">
                <div className="create-community-fields">
                  <label>
                    Community name
                    <input
                      type="text"
                      value={name}
                      maxLength={21}
                      onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
                      placeholder="Community name"
                      required
                      autoFocus
                    />
                    <span className="field-counter">{name.length}/21</span>
                  </label>
                  <label>
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      maxLength={300}
                    />
                    <span className="field-counter">{description.length}</span>
                  </label>
                </div>
                <div className="create-community-preview">
                  <span className="sub-icon large">r/</span>
                  <strong>r/{name || 'communityname'}</strong>
                  <span className="post-meta-text">1 weekly visitor · 1 weekly contributor</span>
                  <p className="create-community-preview-desc">{description || 'Your community description'}</p>
                </div>
              </div>

              <div className="create-community-footer">
                <button type="button" className="btn btn-outline" onClick={back}>Back</button>
                <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create Community'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}