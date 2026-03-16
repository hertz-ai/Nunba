/**
 * routePrefetcher.js — Prefetch API data on nav hover for instant page loads.
 *
 * When a user hovers over a nav link, we fire the API call that page will need.
 * The response goes into the apiCache (Phase 1) automatically, so when the user
 * actually navigates, the data is already cached and renders instantly.
 *
 * Usage:
 *   import { prefetchRoute } from '../services/routePrefetcher';
 *   <NavItem onMouseEnter={() => prefetchRoute('/social')} />
 */

import {
  feedApi,
  notificationsApi,
  communitiesApi,
  usersApi,
  gamesApi,
} from './socialApi';

const _prefetched = new Set();
const COOLDOWN_MS = 30_000; // Don't re-prefetch the same route within 30s

const ROUTE_PREFETCH_MAP = {
  '/social': () => feedApi.personalized({limit: 10}),
  '/social/search': () => communitiesApi.list({limit: 5}),
  '/social/notifications': () => notificationsApi.list({limit: 10}),
  '/social/communities': () => communitiesApi.list({limit: 10}),
  '/social/games': () => gamesApi.catalog({limit: 10}),
  '/social/resonance': () => {}, // resonance is fetched by SocialContext
};

/**
 * Prefetch data for a route. Safe to call on hover — deduped and throttled.
 * @param {string} path — route path (e.g. '/social', '/social/games')
 */
export function prefetchRoute(path) {
  // Normalize: strip trailing slash, match prefix
  const normalized = path.replace(/\/$/, '') || '/social';

  if (_prefetched.has(normalized)) return;

  const prefetchFn = ROUTE_PREFETCH_MAP[normalized];
  if (!prefetchFn) return;

  _prefetched.add(normalized);

  // Fire and forget — errors are silent (it's just a prefetch)
  try {
    prefetchFn();
  } catch {
    // silent
  }

  // Allow re-prefetch after cooldown
  setTimeout(() => _prefetched.delete(normalized), COOLDOWN_MS);
}

/**
 * Prefetch profile data for a user (on hover of profile link).
 * @param {string|number} userId
 */
export function prefetchProfile(userId) {
  if (!userId) return;
  const key = `profile:${userId}`;
  if (_prefetched.has(key)) return;
  _prefetched.add(key);
  try {
    usersApi.get(userId);
  } catch {
    // silent
  }
  setTimeout(() => _prefetched.delete(key), COOLDOWN_MS);
}
