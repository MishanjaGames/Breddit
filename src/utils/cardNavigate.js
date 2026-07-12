import { useNavigate } from 'react-router-dom';

// Selector list of "interactive" elements/regions that should behave normally instead of
// triggering the card-wide navigation: real links/buttons, form controls, the media carousel
// (which has its own click-to-zoom + arrow behavior), and anything explicitly opted out via
// data-stop-card-nav (e.g. the vote buttons column, menus).
const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, label, [data-stop-card-nav], .media-carousel, .lightbox-overlay';

// Returns an onClick handler that navigates to `to` unless the click started on an interactive
// descendant of the card (a link, button, the carousel, etc.), in which case it does nothing and
// lets that element's own handler run normally.
export function useCardNavigate(to) {
  const navigate = useNavigate();
  return (e) => {
    if (e.target.closest(INTERACTIVE_SELECTOR)) return;
    navigate(to);
  };
}
