/**
 * One date format for the whole site, rendered in UTC.
 *
 * WHY UTC IS NOT A DETAIL
 *
 * A date-only ISO string ("2026-08-04") parses as MIDNIGHT UTC, and
 * toLocaleDateString then renders it in the reader's timezone. Anywhere behind
 * UTC that is still the previous day, so the same input produced "August 3" for
 * one reader and "August 4" for another.
 *
 * That breaks hydration, because the prerenderer and the visitor are two such
 * readers. The saved file holds the date as the build machine saw it and the
 * first client render holds it as the visitor's machine sees it, so React finds
 * different text and discards the subtree: #425, "Text content does not match
 * server-rendered HTML", which /news and /research were both reporting.
 *
 * Pinning the zone makes the two agree. A published date is a fact about when
 * something was published, not about where it is being read, so UTC is also the
 * correct answer regardless of hydration.
 *
 * WHY IT IS SHARED
 *
 * This function existed twice, byte for byte, in src/pages/News/newsData.js and
 * src/pages/Research/researchShared.js. Two copies of a formatter is how one
 * gets a timezone fix and the other does not.
 */
export function formatLongDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
