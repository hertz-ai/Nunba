import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { canonicalFor } from '../../config/site';

/**
 * Everything a page tells a crawler and a link preview, in one place.
 *
 * WHY THIS EXISTS
 *
 * A page's identity was spread across up to eight tags declared by hand,
 * usually inline in MainRoute.js, and most declarations stopped after three of
 * them. Measured from build/ on 2026-08-04: 25 prerendered pages set their own
 * <title> and then inherited the site-wide og:title, so every share of them on
 * WhatsApp, Slack, LinkedIn or X read "Hevolve AI | Self-Evolving Multimodal AI
 * Agents" instead of what the page was. /docs offered the Mindstory SDK docs and
 * previewed as the homepage.
 *
 * Nothing was broken in a way anyone could see by reading the file. Each page
 * looked complete: a title, usually a description, often a canonical. The gap
 * was in what was ABSENT, which is exactly what review misses and what a
 * component makes impossible: ask for a title here and the share card, the
 * canonical and the Twitter tags follow from it.
 *
 * Of 57 Helmet blocks in MainRoute.js, 20 declared a title and nothing else.
 *
 * ONE WAY TO DO THIS. Every page uses this component; none hand-roll Helmet for
 * page identity. Half a migration would be worse than none: some pages complete
 * and some not, with no way to tell which by looking, which is the state this
 * replaces.
 *
 * Pass `children` for anything page-specific that does not generalise, JSON-LD
 * being the real case. It lands inside the same Helmet.
 */
export default function PageMeta({
  title,
  description,
  // Defaults to the current route. Pass it only for a page that deliberately
  // points somewhere else, which for a canonical means a genuine alias.
  path,
  // Share-card overrides, for the pages where the card should read differently
  // from the browser tab: a <title> carries "| Hevolve AI" for a search result,
  // a share card does not need it.
  ogTitle,
  ogDescription,
  type = 'website',
  noindex = false,
  // The exact robots value, for the private routes that want more than
  // "noindex": several carry "noindex, nofollow". `noindex` stays as the
  // shorthand because it is what most callers mean.
  robots,
  // Helmet's own flag: emit the SEO tags ahead of everything else, which
  // matters on the landing page where a crawler may stop reading early.
  prioritizeSeoTags = false,
  children,
}) {
  const { pathname } = useLocation();
  const url = canonicalFor(path || pathname);
  const robotsValue = robots || (noindex ? 'noindex' : null);
  const shareTitle = ogTitle || title;
  const shareDescription = ogDescription || description;

  // Built as an array and filtered rather than with {cond && <tag/>} inline:
  // react-helmet-async walks its children itself and a `false` among them is
  // not an element it can read.
  const tags = [
    title ? <title key="title">{title}</title> : null,
    description ? <meta key="d" name="description" content={description} /> : null,
    <link key="c" rel="canonical" href={url} />,
    robotsValue ? <meta key="r" name="robots" content={robotsValue} /> : null,
    <meta key="ot" property="og:type" content={type} />,
    shareTitle ? <meta key="og" property="og:title" content={shareTitle} /> : null,
    shareDescription ? (
      <meta key="od" property="og:description" content={shareDescription} />
    ) : null,
    <meta key="ou" property="og:url" content={url} />,
    shareTitle ? <meta key="tt" name="twitter:title" content={shareTitle} /> : null,
    shareDescription ? (
      <meta key="td" name="twitter:description" content={shareDescription} />
    ) : null,
  ].filter(Boolean);

  return (
    <Helmet prioritizeSeoTags={prioritizeSeoTags}>
      {tags}
      {children}
    </Helmet>
  );
}
