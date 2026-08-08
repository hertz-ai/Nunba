/**
 * Carry what the prerenderer fetched into the client's FIRST render.
 *
 * WHY THIS EXISTS
 *
 * A page that fetches its content starts at a loading state, so its first
 * client render is a spinner. The prerendered file is a capture taken after
 * the fetch resolved, so it holds the result. Those two disagree by
 * construction, and hydration throws the boundary away and re-renders it: React
 * #421/#422, which is what /hive and /news still reported after the three
 * capture-level fixes in scripts/prerender.js.
 *
 * Worse on /hive specifically. The prerenderer's fetch failed on 2026-08-04, so
 * the saved page shows the "unreachable" card, while every visitor's first
 * render says "loading". Google was being served an error page for the hive
 * census, and every visitor paid a re-render to get past it.
 *
 * So the prerenderer publishes what it got, the build writes it into the page,
 * and the component starts from it. Both sides then render the same thing on
 * the first pass, whatever that thing was:
 *
 *   fetch succeeded during prerender -> crawler gets real figures, client
 *                                       starts with them, hydration is clean
 *   fetch failed during prerender    -> crawler gets the same honest state the
 *                                       client starts in, hydration is clean,
 *                                       and the component re-fetches on mount
 *                                       so a visitor sees live data anyway
 *
 * This is the ordinary SSR data-handoff (__NEXT_DATA__ and friends), not a new
 * idea. It is written out here because the app has no framework doing it.
 *
 * The state travels with the data on purpose. Seeding only the payload would
 * leave the component in 'loading' while the saved HTML showed a result, which
 * is the same mismatch in a smaller costume.
 */

/**
 * WHERE TO CALL publishPrerenderData, learned three times the hard way.
 *
 * If the value KEEPS CHANGING after its first set, publish from an EFFECT keyed
 * on the value:
 *
 *     useEffect(() => { publishPrerenderData('key', value); }, [value]);
 *
 * Anywhere else and the seed records something other than what the capture
 * saw, which is worse than not seeding at all:
 *
 *   inside a state updater   reached the saved file NOT AT ALL. build/about
 *                            came back carrying every other seed and no
 *                            heroAgentIndex.
 *   at the places that set   recorded a STALE value. Demopage sets currentAgent
 *   it                       again later, so the file held one agent's text and
 *                            the seed an earlier one, turning /'s #418 into
 *                            #425.
 *   from a setPosts updater  landed in SOME RUNS AND NOT OTHERS, on the same
 *                            build, depending on machine load. /social's feed
 *                            seed came and went between prerenders.
 *
 * If the value is a fetch result that does not change afterwards, publishing
 * once at completion is fine, and that is what HiveCensus, InstallCounter, the
 * carousel and news do.
 *
 * And ALWAYS confirm the seed reached build/<route>/index.html. Twice it did
 * not while the code looked correct, and the build log's payload total looked
 * healthy both times.
 */

const KEY = '__HEVOLVE_PRERENDER_DATA__';

/**
 * Record what this page loaded, for the prerenderer to save.
 *
 * Harmless in a normal visit: it writes one property on window that nothing
 * reads. Cheaper than asking the component whether it is being prerendered,
 * which it has no honest way to know.
 *
 * @param {string} name stable key, one per page
 * @param {*} value must survive JSON.stringify
 */
export function publishPrerenderData(name, value) {
  if (typeof window === 'undefined') return;
  if (!window[KEY]) window[KEY] = {};
  window[KEY][name] = value;
}

/**
 * What the prerenderer saved for this page, or undefined on a fresh visit.
 *
 * Call it in a useState initialiser so it lands in the FIRST render. Read in an
 * effect it would arrive one render too late, which is the mismatch this
 * exists to remove.
 *
 * @param {string} name the key used when publishing
 */
export function readPrerenderData(name) {
  if (typeof window === 'undefined') return undefined;
  const bag = window[KEY];
  if (!bag || typeof bag !== 'object') return undefined;
  return bag[name];
}

export const PRERENDER_DATA_KEY = KEY;
