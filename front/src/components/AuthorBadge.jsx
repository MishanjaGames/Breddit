// Determines whether an author is the post's OP or the community creator,
// and renders the small colored badges Reddit shows next to usernames.
// Backend has no moderator list, only a single Category.creator, so "MOD" means creator.

export function getAuthorRole(authorId, { postAuthorId, creatorId } = {}) {
  if (!authorId) return null;
  const isOP = postAuthorId && authorId === postAuthorId;
  const isMod = creatorId && authorId === creatorId;
  if (isOP && isMod) return 'op-mod';
  if (isOP) return 'op';
  if (isMod) return 'mod';
  return null;
}

export default function AuthorBadge({ role }) {
  if (!role) return null;
  if (role === 'op-mod') {
    return (
      <>
        <span className="author-badge author-badge-op">OP</span>
        <span className="author-badge author-badge-mod">MOD</span>
      </>
    );
  }
  if (role === 'op') return <span className="author-badge author-badge-op">OP</span>;
  if (role === 'mod') return <span className="author-badge author-badge-mod">MOD</span>;
  return null;
}