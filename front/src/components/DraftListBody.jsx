import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';

// shared list body: renders the draft cards, used both on the /drafts page and inside DraftsModal
export default function DraftListBody({ drafts, onDelete, onNavigate }) {
  if (drafts.length === 0) {
    return <p className="feed-status">У вас ще немає чернеток. Почніть створювати пост і натисніть «Зберегти чернетку».</p>;
  }

  return (
    <div className="draft-list">
      {drafts.map((d) => {
        const blocks = d.blocks || [];
        const firstText = blocks.find((b) => b.type === 'text' && b.text?.trim())?.text || '';
        const mediaCount = blocks.filter((b) => b.type !== 'text').length;
        return (
          <div key={d.id} className="draft-card">
            <div className="draft-card-body">
              <span className="post-meta-text">
                {d.community ? `r/${d.community}` : 'Без спільноти'} · {timeAgo(d.updatedAt)}
                {mediaCount > 0 && ` · ${mediaCount} медіафайл${mediaCount === 1 ? '' : 'ів'}`}
              </span>
              <h3 className="draft-card-title">{d.title || 'Без заголовка'}</h3>
              {firstText && <p className="draft-card-desc">{firstText}</p>}
            </div>
            <div className="draft-card-actions">
              <Link
                className="btn btn-primary btn-sm"
                to={d.community
                  ? `/r/${encodeURIComponent(d.community)}/submit?draft=${d.id}`
                  : `/submit?draft=${d.id}`}
                onClick={onNavigate}
              >
                Редагувати
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={() => onDelete(d.id)}>Видалити</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}