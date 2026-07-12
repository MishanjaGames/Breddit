import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TOPIC_TABS = [
  'All', 'Most Visited', 'Internet Culture', 'Games', 'Q&As & Stories', 'Movies & TV',
  'Technology', 'Sports', 'Places & Travel', 'Pop Culture', 'Business & Finance',
  'Education & Career', 'News & Politics', 'Fashion & Beauty', 'Home & Garden',
  'Vehicles', 'Food & Drinks', 'Music', 'Anime & Cosplay', 'Humanities & Law',
  'Reading & Writing', 'Art', 'Sciences', 'Collectibles & Other Hobbies', 'Wellness',
  'Nature & Outdoors', 'Spooky',
];

// normalizes a tab label or a community tag into comparable lowercase words, so a tag like
// "news" matches the tab "News & Politics" and "sci-fi" matches "Sciences", etc.
const slugWords = (str) => String(str || '')
  .toLowerCase()
  .replace(/&/g, ' ')
  .split(/[^a-z0-9]+/)
  .filter(Boolean);

// a community "matches" a tab if any of its tags shares a word with the tab label
// (e.g. tag "gaming" matches tab "Games" via the shared root "gam"... kept simple: exact word match,
// plus a couple of hand-mapped synonyms for the most common mismatches)
const TAB_SYNONYMS = {
  games: ['game', 'gaming', 'games'],
  technology: ['tech', 'technology'],
  movies: ['movie', 'movies', 'tv', 'film'],
  news: ['news', 'politics'],
  sciences: ['science', 'sciences', 'sci'],
  music: ['music'],
  sports: ['sport', 'sports'],
  art: ['art', 'arts'],
  vehicles: ['car', 'cars', 'vehicle', 'vehicles'],
  food: ['food', 'drink', 'drinks', 'cooking'],
  wellness: ['wellness', 'health', 'fitness'],
  fashion: ['fashion', 'beauty'],
};

function communityMatchesTab(community, tabWords) {
  const tags = (community.tags || []).map((t) => t.toLowerCase());
  if (tags.length === 0) return false;
  return tags.some((tag) => {
    if (tabWords.includes(tag)) return true;
    return Object.values(TAB_SYNONYMS).some((group) => group.includes(tag) && tabWords.some((w) => group.includes(w)));
  });
}

function CommunityCard({ c, joined, onToggleJoin }) {
  return (
    <div className="explore-card">
      <div className="explore-card-head">
        {c.icon ? (
          <img className="sub-icon" src={c.icon} alt="" />
        ) : (
          <span className="sub-icon">{c.name[0]?.toUpperCase()}</span>
        )}
        <div className="explore-card-title">
          <Link to={`/r/${encodeURIComponent(c.name)}`} className="post-sub-link">{c.name}</Link>
          <span className="widget-sub">{(c.subscriberCount ?? 0).toLocaleString('en-US')} weekly visitors</span>
        </div>
        <button
          className={`btn btn-sm join-btn ${joined ? 'btn-outline' : 'btn-primary'}`}
          onClick={() => onToggleJoin(c)}
        >
          {joined ? 'Joined' : 'Join'}
        </button>
      </div>
      {c.description && <p className="explore-card-desc">{c.description}</p>}
    </div>
  );
}

export default function Explore() {
  const { user } = useAuth();
  const toast = useToast();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [joinedIds, setJoinedIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/categories')
      .then(({ data }) => {
        if (cancelled) return;
        const list = data || [];
        setCommunities(list);
        setJoinedIds(new Set(list.filter((c) => c.isSubscribed).map((c) => c._id)));
      })
      .catch(() => { if (!cancelled) setCommunities([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleJoin = async (c) => {
    if (!user) return;
    const wasJoined = joinedIds.has(c._id);
    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (wasJoined) next.delete(c._id); else next.add(c._id);
      return next;
    });
    try {
      if (wasJoined) await api.delete(`/categories/${c._id}/subscribe`);
      else await api.post(`/categories/${c._id}/subscribe`);
    } catch {
      toast.error('Не вдалося оновити підписку');
      setJoinedIds((prev) => {
        const next = new Set(prev);
        if (wasJoined) next.add(c._id); else next.delete(c._id);
        return next;
      });
    }
  };

  const grouped = useMemo(() => {
    if (tab === 'All') return { 'Recommended for you': communities };
    if (tab === 'Most Visited') {
      const sorted = [...communities].sort((a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0));
      return { 'Most visited': sorted };
    }
    // filter down to communities whose tags actually match this topic — a community without
    // any matching tag (or without tags at all) simply doesn't show up under this tab
    const tabWords = slugWords(tab);
    const matched = communities.filter((c) => communityMatchesTab(c, tabWords));
    return { [tab]: matched };
  }, [communities, tab]);

  return (
    <div className="explore-page">
      <h1>Explore Communities</h1>

      <div className="explore-tabs">
        {TOPIC_TABS.map((t) => (
          <button
            key={t}
            className={`explore-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="feed-status">Завантаження…</p>}

      {!loading && Object.entries(grouped).map(([section, list]) => (
        <section key={section} className="explore-section">
          <h2>{section}</h2>
          {list.length === 0 && (
            <p className="feed-status">
              {tab === 'All' || tab === 'Most Visited'
                ? 'Нічого не знайдено.'
                : `Немає спільнот з тегом, що відповідає темі «${tab}».`}
            </p>
          )}
          <div className="explore-grid">
            {list.map((c) => (
              <CommunityCard
                key={c._id}
                c={c}
                joined={joinedIds.has(c._id)}
                onToggleJoin={toggleJoin}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}