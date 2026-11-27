/**
 * What the agent's <video> shows after a source fails to load (owner 27 Nov: "I visually see in the
 * nunba desktop the container is not there").
 *
 * The page used to hide the element for good on any error (style.display = 'none'), so one broken
 * idle link left video mode with no face for every later reply too.  Now:
 *   - a live talking-face reply handles its own errors (utils/liveAvatar falls back to its audio);
 *   - a failed IDLE video is remembered and not tried again until the next agent listing (no retry
 *     loop: the page returns to idle after every reply; a new listing may carry a clip made since),
 *     and the page shows the agent's portrait, exactly as for an agent that has no idle video;
 *   - any other clip that fails goes back to the idle face, or to the portrait when there is none.
 */

function absolute(url, base) {
  try {
    return new URL(url, base).href;
  } catch (e) {
    return String(url);
  }
}

/** True when the two URLs name the same media (a relative idle link vs the element's absolute src). */
export function sameMediaUrl(a, b, base = window.location.href) {
  return Boolean(a) && Boolean(b) && absolute(a, base) === absolute(b, base);
}

/** True when this idle URL already failed in this session. */
export function isFailedIdle(url, failedIdle, base = window.location.href) {
  return Boolean(url) && failedIdle.has(absolute(url, base));
}

/**
 * The page's next step after its <video> failed to load `failedSrc`:
 * {ignore: true} (a live reply's own stream) or {clearIdle, videoUrl}.
 */
export function afterVideoError({failedSrc, idleUrl, liveUrl, failedIdle, base = window.location.href}) {
  if (liveUrl && failedSrc === liveUrl) {
    return {ignore: true};
  }
  if (idleUrl && sameMediaUrl(failedSrc, idleUrl, base)) {
    failedIdle.add(absolute(idleUrl, base));
    return {clearIdle: true, videoUrl: null};
  }
  const usableIdle = idleUrl && !isFailedIdle(idleUrl, failedIdle, base) ? idleUrl : null;
  return {clearIdle: false, videoUrl: usableIdle};
}

/**
 * The page's idle-face URL for an agent, or null: the FIRST idle filler it can play (the node's own
 * face goes first, central's after it), by the page's own link when the filler carries one
 * (``page_link``, same-origin; ``video_link`` is a phone's, absolute on the LAN address), skipping a
 * link that already failed this session.  The ONE pick of the idle filler: every place the page sets
 * an agent's idle face calls this (review rv_page: five places picked it five ways).
 */
export function idleLinkOf(agent, failedIdle = new Set(), base = window.location.href) {
  for (const filler of (agent && agent.fillers) || []) {
    if (!filler || filler.type !== 'idle') continue;
    const link = filler.page_link || filler.video_link;
    if (link && !isFailedIdle(link, failedIdle, base)) return link;
  }
  return null;
}
