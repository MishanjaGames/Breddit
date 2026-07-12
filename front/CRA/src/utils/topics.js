// Shared catalog of community topics/tags: [icon, label, tagKey].
// tagKey is what actually gets stored in Category.tags (short, lowercase, backend-filterable,
// e.g. `tags=news` picks up communities with the 'news' key). label+icon are just for display.
// Acts as a simple association table between a friendly topic label and its backend tag key.
export const TOPICS = [
  ['🎭', 'Anime & Cosplay', 'anime'], ['🎨', 'Art', 'art'], ['💼', 'Business & Finance', 'business'],
  ['🧩', 'Collectibles & Other Hobbies', 'collectibles'], ['🎓', 'Education & Career', 'education'],
  ['👗', 'Fashion & Beauty', 'fashion'], ['🍔', 'Food & Drinks', 'food'], ['🎮', 'Games', 'gaming'],
  ['❤️', 'Health', 'health'], ['🏡', 'Home & Garden', 'home'], ['📜', 'Humanities & Law', 'humanities'],
  ['💞', 'Identity & Relationships', 'relationships'], ['🌐', 'Internet Culture', 'internet'], ['🎬', 'Movies & TV', 'movies'],
  ['🎵', 'Music', 'music'], ['🌲', 'Nature & Outdoors', 'nature'], ['📰', 'News & Politics', 'news'],
  ['✈️', 'Places & Travel', 'travel'], ['✨', 'Pop Culture', 'popculture'], ['❓', 'Q&As & Stories', 'qanda'],
  ['📚', 'Reading & Writing', 'reading'], ['🔬', 'Sciences', 'science'], ['👻', 'Spooky', 'spooky'],
  ['🏅', 'Sports', 'sports'], ['🚗', 'Vehicles', 'vehicles'], ['🧘', 'Wellness', 'wellness'],
  ['🔞', 'Adult Content', 'adult'], ['🗿', 'Mature Topics', 'mature'],
];

// how many tags a community may carry (mirrors the backend Category schema limit)
export const MAX_TAGS = 10;

export const TAG_KEY_TO_LABEL = new Map(TOPICS.map(([icon, label, key]) => [key, label]));
export const TAG_KEY_TO_ICON = new Map(TOPICS.map(([icon, label, key]) => [key, icon]));

// display helper: known tag key -> "icon label", unknown/custom tag -> just the raw key
export function tagDisplay(key) {
  const label = TAG_KEY_TO_LABEL.get(key);
  const icon = TAG_KEY_TO_ICON.get(key);
  return label ? `${icon} ${label}` : key;
}