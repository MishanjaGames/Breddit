import { useState } from 'react';

// backend POST /api/votes body: { targetType, targetId, value: 1 | -1 }
// response is only { success, message } - no updated score/vote is echoed back,
// so we manage score/myVote optimistically on the client only.
export default function VoteButtons({ score: initialScore, myVote: initialVote, onVote, vertical = true }) {
  const [score, setScore] = useState(initialScore || 0);
  const [myVote, setMyVote] = useState(initialVote || null);

  const vote = async (value) => {
    const next = myVote === value ? null : value;
    const prevScore = score;
    const prevVote = myVote;
    const delta = (next || 0) - (prevVote || 0);
    setScore(prevScore + delta);
    setMyVote(next);
    try {
      // backend toggles: same value again removes the vote, different value flips it
      await onVote(value);
    } catch {
      setScore(prevScore);
      setMyVote(prevVote);
    }
  };

  return (
    <div className={`d-flex ${vertical ? 'flex-column' : ''} align-items-center gap-1`}>
      <button
        className={`btn btn-sm p-1 border-0 ${myVote === 1 ? 'text-danger' : 'text-secondary'}`}
        onClick={() => vote(1)}
        aria-label="Upvote"
      >▲</button>
      <span className="fw-semibold small">{score}</span>
      <button
        className={`btn btn-sm p-1 border-0 ${myVote === -1 ? 'text-primary' : 'text-secondary'}`}
        onClick={() => vote(-1)}
        aria-label="Downvote"
      >▼</button>
    </div>
  );
}