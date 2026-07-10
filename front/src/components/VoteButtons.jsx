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
    <div className={`vote-pill d-flex ${vertical ? 'flex-column' : ''} align-items-center`}>
      <button
        className={`vote-btn up ${myVote === 1 ? 'active' : ''}`}
        onClick={() => vote(1)}
        aria-label="Upvote"
      >▲</button>
      <span className="fw-bold small px-1" style={{ color: myVote === 1 ? '#ff4500' : myVote === -1 ? '#7193ff' : '#1a1a1b' }}>{score}</span>
      <button
        className={`vote-btn down ${myVote === -1 ? 'active' : ''}`}
        onClick={() => vote(-1)}
        aria-label="Downvote"
      >▼</button>
    </div>
  );
}