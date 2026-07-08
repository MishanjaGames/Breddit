import { useState } from 'react';

export default function VoteButtons({ score: initialScore, myVote: initialVote, onVote, vertical = true }) {
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState(initialVote);

  const vote = async (value) => {
    const next = myVote === value ? null : value;
    const prevScore = score;
    const prevVote = myVote;
    // optimistic update
    const delta = (next === 'UP' ? 1 : next === 'DOWN' ? -1 : 0) - (prevVote === 'UP' ? 1 : prevVote === 'DOWN' ? -1 : 0);
    setScore(prevScore + delta);
    setMyVote(next);
    try {
      const data = await onVote(next);
      if (data) { setScore(data.score); setMyVote(data.myVote); }
    } catch {
      setScore(prevScore);
      setMyVote(prevVote);
    }
  };

  return (
    <div className={`d-flex ${vertical ? 'flex-column' : ''} align-items-center gap-1`}>
      <button
        className={`btn btn-sm p-1 border-0 ${myVote === 'UP' ? 'text-danger' : 'text-secondary'}`}
        onClick={() => vote('UP')}
        aria-label="Upvote"
      >▲</button>
      <span className="fw-semibold small">{score}</span>
      <button
        className={`btn btn-sm p-1 border-0 ${myVote === 'DOWN' ? 'text-primary' : 'text-secondary'}`}
        onClick={() => vote('DOWN')}
        aria-label="Downvote"
      >▼</button>
    </div>
  );
}
