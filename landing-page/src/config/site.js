/**
 * Where the site lives, and how a page names itself to a crawler.
 *
 * The origin was declared separately in seven files (ListingsPage, AnswerIndex,
 * AnswerPage, IncidentIndex, IncidentPage, ResearchIndex, ResearchPaperPage),
 * each as `const SITE = 'https://hevolve.ai'`. They agreed, so nothing was
 * visibly broken, but the same shape in src/config/downloads.js did not: five
 * copies of one constant drifted and two of them sent every download click
 * straight to GitHub where nothing could count it.
 */
export const SITE = 'https://hevolve.ai';

/**
 * The canonical URL for a path.
 *
 * WHY THIS EXISTS
 *
 * MainRoute.js declares a site-wide Helmet whose values act as fallbacks for
 * pages that do not set their own, and its canonical was the literal
 * 'https://hevolve.ai/'. A canonical is not a fallback: it tells a crawler
 * which URL to index INSTEAD of this one. So every page that did not override
 * it was telling Google it was a duplicate of the homepage.
 *
 * Eleven prerendered pages did exactly that, measured from build/ on
 * 2026-08-04: all nine /social routes, plus /docs and /pupit. Each one carried
 * `robots: index, follow`, each was listed in sitemap.xml, and each then told
 * the crawler to index the homepage instead. They cancelled themselves out.
 *
 * Self-referential is the right default. A page that genuinely is a duplicate,
 * an alias like /Plan, still sets its own canonical and still overrides this,
 * because react-helmet-async lets the deeper declaration win.
 *
 * @param {string} pathname location.pathname, no query and no hash: those
 *   identify a view of a page, not a different page.
 * @returns {string} absolute URL
 */
export function canonicalFor(pathname) {
  if (typeof pathname !== 'string' || pathname === '' || pathname === '/') return `${SITE}/`;
  // Already absolute. Several pages build their canonical from SITE and a slug
  // before they have anything else to say, and making each unpick that back
  // into a path would be busywork with a chance of getting it wrong.
  if (/^https?:\/\//i.test(pathname)) return pathname.replace(/\/+$/, '') || `${SITE}/`;
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  // Strip a trailing slash so /news and /news/ do not become two canonicals of
  // the same page. The prerenderer writes /news/index.html either way.
  const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
  return `${SITE}${trimmed}`;
}
