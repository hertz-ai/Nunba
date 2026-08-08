/**
 * Single source of truth for download links in the UI.
 *
 * There were three of these, each commented as the canonical one, and they
 * disagreed:
 *
 *   src/pages/Download.js        '/go/win'                      attributed
 *   src/components/Agent/Agent.js  github.com/.../latest/...    NOT attributed
 *   src/pages/Blogs/BlogIndex.js   github.com/.../latest/...    NOT attributed
 *
 * Agent.js said "Single constant so the Hero, /download, and any future blog
 * CTA all point at the same URL" and BlogIndex.js said "mirrors
 * src/pages/Download.js and src/components/Agent/Agent.js". Neither was true.
 *
 * It cost real measurement. The homepage hero and the blog are the two highest
 * traffic calls to action on the site, and both handed the visitor straight to
 * GitHub, so the click happened entirely between them and GitHub and nothing
 * recorded it. That is why ~/.hevolve/attribution.jsonl holds four events, three
 * of them flagged as bots, while the release shows downloads: the downloads did
 * not come through anything we can see.
 *
 * `/go/<asset>` records the click (channel, campaign, opaque recipient token,
 * bot flag) and then 302s to the same file, so the download itself is
 * unchanged. serve-build.js resolves these through scripts/download-targets.js,
 * which maps a fixed key set and never accepts a URL parameter -- an open
 * redirect on the domain that sends our campaign mail would be a phishing gift.
 *
 * Keys here MUST match DOWNLOAD_TARGETS in scripts/download-targets.js. They
 * cannot be imported from there: CRA's ModuleScopePlugin refuses imports from
 * outside src/, so this is the client-side half of one table rather than a
 * second table. Adding an asset means adding it in both places.
 */

/** Attributed paths. Use these for anything a person clicks. */
export const DOWNLOAD_PATHS = {
  win: '/go/win',
  deb: '/go/deb',
  appimage: '/go/appimage',
  android: '/go/android',
};

/** The Windows installer, which is what every primary CTA points at. */
export const NUNBA_DOWNLOAD_URL = DOWNLOAD_PATHS.win;

/**
 * The real asset URL, for schema.org and anywhere a machine reads the link.
 *
 * A relative /go/ path is not a download location to a crawler, and the
 * redirect is a measurement detail with no business in structured data.
 */
export const NUNBA_RELEASE_URL =
  'https://github.com/hertz-ai/Nunba/releases/latest/download/Nunba_Setup.exe';
