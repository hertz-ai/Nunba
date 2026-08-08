import { formatLongDate } from '../../utils/formatDate';
/* eslint-disable */
// Shared bits for the /research pages — one place for topic labels and
// formatting so index/detail never drift.

export const TOPIC_LABELS = {
  ai: 'Artificial Intelligence',
  bci: 'Brain–Computer Interfaces',
};

// Kept as a named re-export so the ~40 call sites do not all have to change,
// and so the name still says which surface it belongs to. The behaviour, and
// the UTC that hydration depends on, lives in one place now.
export const formatPaperDate = formatLongDate;

export function paperAuthorsLine(authors) {
  if (!authors || authors.length === 0) return '';
  if (authors.length <= 3) return authors.join(', ');
  return `${authors.slice(0, 3).join(', ')} +${authors.length - 3} more`;
}
