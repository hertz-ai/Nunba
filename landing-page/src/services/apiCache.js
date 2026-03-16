/**
 * apiCache.js — Smart API cache with request deduplication and stale-while-revalidate.
 *
 * Provides automatic caching at the axios interceptor level so every API consumer
 * benefits without per-component work.
 *
 * Patterns extracted from:
 * - GameAssetService.js _inFlight Map (request dedup)
 * - MediaCacheManager.js TTL + LRU (cache eviction)
 */

// ── TTL Configuration (ms) ──────────────────────────────────────────────
const DEFAULT_TTL = 60_000; // 1 minute

const TTL_RULES = [
  // ── Specific patterns FIRST (first-match-wins) ──
  {pattern: /\/feed\/agent-spotlight/, ttl: 600_000}, // 10min — spotlight is curated
  {pattern: /\/feed\/agents/, ttl: 300_000}, // 5min  — agent feed
  {pattern: /\/feed/, ttl: 30_000}, // 30s   — main feed changes often
  {pattern: /\/notifications/, ttl: 15_000}, // 15s   — time-sensitive
  {pattern: /\/posts\/[^/]+$/, ttl: 120_000}, // 2min  — individual posts
  {pattern: /\/posts/, ttl: 60_000}, // 1min  — post lists
  {pattern: /\/users/, ttl: 300_000}, // 5min  — user profiles
  {pattern: /\/communities/, ttl: 300_000}, // 5min  — communities
  {pattern: /\/games\/catalog/, ttl: 600_000}, // 10min — game catalog
  {pattern: /\/games/, ttl: 300_000}, // 5min  — game data
  {pattern: /\/marketplace\/categories/, ttl: 600_000}, // 10min — static categories
  {pattern: /\/marketplace\/listings\/[^/]+$/, ttl: 120_000}, // 2min — single listing
  {pattern: /\/marketplace/, ttl: 120_000}, // 2min  — marketplace data
  {pattern: /\/mcp/, ttl: 300_000}, // 5min  — MCP tool registry
  {pattern: /\/search/, ttl: 60_000}, // 1min  — search results
  {pattern: /\/auth\/me/, ttl: 300_000}, // 5min  — current user
  {pattern: /\/resonance/, ttl: 120_000}, // 2min  — resonance data
  {pattern: /\/achievements/, ttl: 300_000}, // 5min  — achievements
];

// ── Mutation → Invalidation Rules ───────────────────────────────────────
// When a mutation (POST/PUT/PATCH/DELETE) hits a pattern, invalidate matching GET caches.
const INVALIDATION_RULES = [
  {mutation: /\/posts\/[^/]+\/upvote/, invalidate: [/\/posts/, /\/feed/]},
  {mutation: /\/posts\/[^/]+\/downvote/, invalidate: [/\/posts/, /\/feed/]},
  {mutation: /\/posts$/, invalidate: [/\/posts/, /\/feed/]},
  {mutation: /\/posts\/[^/]+$/, invalidate: [/\/posts/, /\/feed/]},
  {mutation: /\/comments/, invalidate: [/\/posts\//]},
  {mutation: /\/communities\/[^/]+\/join/, invalidate: [/\/communities/]},
  {mutation: /\/communities\/[^/]+\/leave/, invalidate: [/\/communities/]},
  {mutation: /\/users\/[^/]+\/follow/, invalidate: [/\/users/]},
  {mutation: /\/notifications/, invalidate: [/\/notifications/]},
  {mutation: /\/auth\//, invalidate: [/\/auth\/me/]},
];

// ── Public Cache TTL Rules ────────────────────────────────────────────
// Public content is cached longer and shared across all users (survives logout).
const PUBLIC_TTL_RULES = [
  {pattern: /\/feed\/agent-spotlight/, ttl: 600_000}, // 10min — spotlight curated
  {pattern: /\/feed\/agents/, ttl: 600_000}, // 10min — agent feed
  {pattern: /\/games\/catalog/, ttl: 600_000}, // 10min — game catalog
  {pattern: /\/mcp\/servers/, ttl: 300_000}, // 5min  — MCP servers
  {pattern: /\/mcp\/discover/, ttl: 300_000}, // 5min  — MCP discover
  {pattern: /\/marketplace\/categories/, ttl: 600_000}, // 10min — static categories
  {pattern: /\/marketplace\/listings/, ttl: 300_000}, // 5min  — public listings
];

const PUBLIC_DEFAULT_TTL = 300_000; // 5min default for public content

// ── Cache Store ─────────────────────────────────────────────────────────
const _cache = new Map(); // key → { data, timestamp, ttl } (user-scoped)
const _publicCache = new Map(); // key → { value, expiresAt }    (shared, no user scope)
const _inFlight = new Map(); // key → Promise (dedup concurrent identical requests)

const MAX_ENTRIES = 500;
const MAX_PUBLIC_ENTRIES = 200;

/**
 * Get current user identifier for cache isolation.
 * Uses a lightweight hash of the access token to avoid cross-user cache bleed.
 */
function _getUserScope() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return 'anon';
    // Use first 8 chars of JWT payload hash as user scope (fast, no PII)
    const payload = token.split('.')[1] || '';
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  } catch {
    return 'anon';
  }
}

/**
 * Build a deterministic cache key from request config.
 * Pattern: userScope:METHOD:url:paramHash
 * User scope ensures one user's cached data never bleeds into another session.
 * When config._publicScope is true, uses 'pub' prefix instead of user scope.
 */
function buildKey(config) {
  const scope = config._publicScope ? 'pub' : _getUserScope();
  const method = (config.method || 'get').toUpperCase();
  const url = config.url || '';
  const params = config.params
    ? JSON.stringify(config.params, Object.keys(config.params).sort())
    : '';
  return `${scope}:${method}:${url}:${params}`;
}

/**
 * Get TTL for a given URL path.
 */
function getTTL(url) {
  for (const rule of TTL_RULES) {
    if (rule.pattern.test(url)) return rule.ttl;
  }
  return DEFAULT_TTL;
}

/**
 * Get public TTL for a given URL path.
 */
function getPublicTTL(url) {
  for (const rule of PUBLIC_TTL_RULES) {
    if (rule.pattern.test(url)) return rule.ttl;
  }
  return PUBLIC_DEFAULT_TTL;
}

/**
 * Check if a cache entry is still fresh.
 */
function isFresh(entry) {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Check if a cache entry is stale but still usable for stale-while-revalidate.
 * We allow stale data up to 2x TTL.
 */
function isUsable(entry) {
  return Date.now() - entry.timestamp < entry.ttl * 2;
}

/**
 * Store a response in cache.
 */
function set(key, data, url) {
  // LRU eviction: remove oldest entries when exceeding max
  if (_cache.size >= MAX_ENTRIES) {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [k, v] of _cache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldest = k;
      }
    }
    if (oldest) _cache.delete(oldest);
  }

  _cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: getTTL(url),
  });
}

/**
 * Get a cached response if fresh.
 * Returns { data, stale } or null.
 */
function get(key) {
  const entry = _cache.get(key);
  if (!entry) return null;

  if (isFresh(entry)) {
    return {data: entry.data, stale: false};
  }

  if (isUsable(entry)) {
    return {data: entry.data, stale: true};
  }

  // Too old — evict
  _cache.delete(key);
  return null;
}

// ── Public Cache Operations ───────────────────────────────────────────

/**
 * Store a response in the public cache WITHOUT user scope prefix.
 * Public cache entries use { value, expiresAt } structure.
 * @param {string} key — cache key (should be built with _publicScope: true)
 * @param {*} data — response data to cache
 * @param {number} ttl — time-to-live in milliseconds
 */
function setPublic(key, data, ttl) {
  // LRU eviction for public cache
  if (_publicCache.size >= MAX_PUBLIC_ENTRIES) {
    let oldest = null;
    let oldestExpiry = Infinity;
    for (const [k, v] of _publicCache) {
      if (v.expiresAt < oldestExpiry) {
        oldestExpiry = v.expiresAt;
        oldest = k;
      }
    }
    if (oldest) _publicCache.delete(oldest);
  }

  _publicCache.set(key, {
    value: data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Get a cached response from the public cache.
 * Returns the cached data if not expired, null otherwise.
 */
function getPublic(key) {
  const entry = _publicCache.get(key);
  if (!entry) return null;

  if (Date.now() < entry.expiresAt) {
    return entry.value;
  }

  // Expired — evict
  _publicCache.delete(key);
  return null;
}

/**
 * Clear all public cache entries explicitly.
 */
function clearPublic() {
  _publicCache.clear();
}

/**
 * Invalidate cache entries matching URL patterns after a mutation.
 */
function invalidateOnMutation(url) {
  for (const rule of INVALIDATION_RULES) {
    if (rule.mutation.test(url)) {
      for (const [key] of _cache) {
        for (const pattern of rule.invalidate) {
          if (pattern.test(key)) {
            _cache.delete(key);
            break;
          }
        }
      }
    }
  }
}

/**
 * Deduplicate concurrent identical GET requests.
 * If a request for `key` is already in-flight, return the existing promise.
 */
function dedupFetch(key, fn) {
  if (_inFlight.has(key)) {
    return _inFlight.get(key);
  }
  const promise = fn().finally(() => {
    _inFlight.delete(key);
  });
  _inFlight.set(key, promise);
  return promise;
}

/**
 * Clear all user-scoped cache entries. Call on logout.
 * Public cache is intentionally preserved — public content survives logout.
 */
function clearAll() {
  _cache.clear();
  _inFlight.clear();
}

/**
 * Get cache stats for debugging.
 */
function getStats() {
  let fresh = 0;
  let stale = 0;
  for (const [, entry] of _cache) {
    if (isFresh(entry)) fresh++;
    else stale++;
  }
  let publicFresh = 0;
  let publicExpired = 0;
  const now = Date.now();
  for (const [, entry] of _publicCache) {
    if (now < entry.expiresAt) publicFresh++;
    else publicExpired++;
  }
  return {
    total: _cache.size,
    fresh,
    stale,
    inFlight: _inFlight.size,
    publicTotal: _publicCache.size,
    publicFresh,
    publicExpired,
  };
}

// Clear cache on auth expiry
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', clearAll);
}

export const apiCache = {
  buildKey,
  get,
  set,
  getPublic,
  setPublic,
  clearPublic,
  getPublicTTL,
  invalidateOnMutation,
  dedupFetch,
  clearAll,
  getStats,
  getTTL,
};
