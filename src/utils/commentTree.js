// Backend returns a flat list of comments with `parentComment` (id or null).
// Build a nested tree for rendering threaded replies client-side.
export function buildCommentTree(flatComments) {
  const byId = new Map();
  flatComments.forEach((c) => byId.set(c._id, { ...c, replies: [] }));

  const roots = [];
  byId.forEach((c) => {
    const parentId = c.parentComment?._id || c.parentComment;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}
