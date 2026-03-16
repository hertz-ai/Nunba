/**
 * apiCache.test.js — Unit tests for the smart API cache with TTL, stale-while-revalidate,
 * LRU eviction, public cache, request deduplication, and mutation invalidation.
 */
import {apiCache} from '../../services/apiCache';

beforeEach(() => {
  apiCache.clearAll();
  apiCache.clearPublic();
  localStorage.clear();
  jest.restoreAllMocks();
});

// ── buildKey ──────────────────────────────────────────────────────────────
describe('apiCache.buildKey', () => {
  it('builds a key with anon scope when no token in localStorage', () => {
    const key = apiCache.buildKey({method: 'get', url: '/posts'});
    expect(key).toMatch(/^anon:GET:\/posts:/);
  });

  it('includes sorted params in the key', () => {
    const key = apiCache.buildKey({
      method: 'get',
      url: '/posts',
      params: {b: 2, a: 1},
    });
    expect(key).toContain('"a":1');
    expect(key).toContain('"b":2');
  });

  it('uses user scope hash when token exists', () => {
    localStorage.setItem(
      'access_token',
      'header.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'
    );
    const key = apiCache.buildKey({method: 'get', url: '/posts'});
    expect(key).not.toMatch(/^anon:/);
    expect(key).toMatch(/^[^:]+:GET:\/posts:/);
  });

  it('uses pub prefix when _publicScope is true', () => {
    const key = apiCache.buildKey({
      method: 'get',
      url: '/posts',
      _publicScope: true,
    });
    expect(key).toMatch(/^pub:GET:\/posts:/);
  });

  it('defaults method to GET when not specified', () => {
    const key = apiCache.buildKey({url: '/feed'});
    expect(key).toContain(':GET:');
  });

  it('produces different keys for different URLs', () => {
    const key1 = apiCache.buildKey({url: '/posts'});
    const key2 = apiCache.buildKey({url: '/users'});
    expect(key1).not.toEqual(key2);
  });

  it('produces different keys for different params', () => {
    const key1 = apiCache.buildKey({url: '/posts', params: {page: 1}});
    const key2 = apiCache.buildKey({url: '/posts', params: {page: 2}});
    expect(key1).not.toEqual(key2);
  });
});

// ── get / set (user-scoped cache) ─────────────────────────────────────────
describe('apiCache.get / set', () => {
  it('returns null for a cache miss', () => {
    expect(apiCache.get('nonexistent')).toBeNull();
  });

  it('returns fresh data after set', () => {
    apiCache.set('key1', {id: 1}, '/posts');
    const result = apiCache.get('key1');
    expect(result).not.toBeNull();
    expect(result.data).toEqual({id: 1});
    expect(result.stale).toBe(false);
  });

  it('overwrites existing cache entry', () => {
    apiCache.set('key1', {id: 1}, '/posts');
    apiCache.set('key1', {id: 2}, '/posts');
    const result = apiCache.get('key1');
    expect(result.data).toEqual({id: 2});
  });
});

// ── TTL expiry ────────────────────────────────────────────────────────────
describe('TTL expiry', () => {
  it('returns stale data between 1x and 2x TTL (stale-while-revalidate)', () => {
    // Set timestamp, then advance past TTL but within 2x TTL
    const baseTime = 1000000;
    let currentTime = baseTime;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    apiCache.set('ttl-test', {val: 'stale'}, '/posts'); // /posts = 60s TTL

    // Advance to 90s (> 60s TTL, < 120s = 2x TTL)
    currentTime = baseTime + 90_000;
    const result = apiCache.get('ttl-test');
    expect(result).not.toBeNull();
    expect(result.stale).toBe(true);
    expect(result.data).toEqual({val: 'stale'});
  });

  it('evicts data after 2x TTL', () => {
    const baseTime = 1000000;
    let currentTime = baseTime;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    apiCache.set('ttl-evict', {val: 'old'}, '/posts');

    // Advance past 2x TTL (> 120s)
    currentTime = baseTime + 130_000;
    const result = apiCache.get('ttl-evict');
    expect(result).toBeNull();
  });

  it('returns fresh data within TTL', () => {
    const baseTime = 1000000;
    let currentTime = baseTime;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    apiCache.set('ttl-fresh', {val: 'fresh'}, '/posts');

    // Advance to 30s (< 60s TTL)
    currentTime = baseTime + 30_000;
    const result = apiCache.get('ttl-fresh');
    expect(result).not.toBeNull();
    expect(result.stale).toBe(false);
    expect(result.data).toEqual({val: 'fresh'});
  });
});

// ── getTTL (per-endpoint rules) ───────────────────────────────────────────
describe('apiCache.getTTL', () => {
  it('returns 30s for /feed', () => {
    expect(apiCache.getTTL('/feed')).toBe(30_000);
  });

  it('returns 15s for /notifications', () => {
    expect(apiCache.getTTL('/notifications')).toBe(15_000);
  });

  it('returns 300s for /users', () => {
    expect(apiCache.getTTL('/users')).toBe(300_000);
  });

  it('returns 600s for /feed/agent-spotlight', () => {
    expect(apiCache.getTTL('/feed/agent-spotlight')).toBe(600_000);
  });

  it('returns 300s for /feed/agents', () => {
    expect(apiCache.getTTL('/feed/agents')).toBe(300_000);
  });

  it('returns default 60s for unknown endpoints', () => {
    expect(apiCache.getTTL('/some/unknown/path')).toBe(60_000);
  });

  it('first-match-wins for overlapping patterns', () => {
    expect(apiCache.getTTL('/feed/agent-spotlight')).toBe(600_000);
  });

  it('returns 120s for individual posts (/posts/123)', () => {
    expect(apiCache.getTTL('/posts/123')).toBe(120_000);
  });

  it('returns 300s for /communities', () => {
    expect(apiCache.getTTL('/communities')).toBe(300_000);
  });

  it('returns 600s for /games/catalog', () => {
    expect(apiCache.getTTL('/games/catalog')).toBe(600_000);
  });
});

// ── Public cache ──────────────────────────────────────────────────────────
describe('Public cache (getPublic / setPublic / clearPublic)', () => {
  it('returns null on miss', () => {
    expect(apiCache.getPublic('pub-miss')).toBeNull();
  });

  it('returns data within TTL', () => {
    apiCache.setPublic('pub-key', {feed: 'data'}, 60_000);
    const result = apiCache.getPublic('pub-key');
    expect(result).toEqual({feed: 'data'});
  });

  it('returns null after TTL expires', () => {
    const baseTime = 1000000;
    let currentTime = baseTime;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    apiCache.setPublic('pub-expired', {x: 1}, 60_000);

    currentTime = baseTime + 70_000;
    const result = apiCache.getPublic('pub-expired');
    expect(result).toBeNull();
  });

  it('clearPublic removes all public entries', () => {
    apiCache.setPublic('pub-a', 'a', 60_000);
    apiCache.setPublic('pub-b', 'b', 60_000);
    apiCache.clearPublic();
    expect(apiCache.getPublic('pub-a')).toBeNull();
    expect(apiCache.getPublic('pub-b')).toBeNull();
  });

  it('getPublicTTL returns correct TTL for known patterns', () => {
    expect(apiCache.getPublicTTL('/games/catalog')).toBe(600_000);
    expect(apiCache.getPublicTTL('/mcp/servers')).toBe(300_000);
  });

  it('getPublicTTL returns default 300s for unknown patterns', () => {
    expect(apiCache.getPublicTTL('/unknown')).toBe(300_000);
  });
});

// ── clearAll ──────────────────────────────────────────────────────────────
describe('apiCache.clearAll', () => {
  it('clears all user-scoped cache entries', () => {
    apiCache.set('c1', 'v1', '/posts');
    apiCache.set('c2', 'v2', '/users');
    apiCache.clearAll();
    expect(apiCache.get('c1')).toBeNull();
    expect(apiCache.get('c2')).toBeNull();
  });

  it('does not clear public cache entries', () => {
    apiCache.setPublic('pub-survive', 'data', 60_000);
    apiCache.clearAll();
    expect(apiCache.getPublic('pub-survive')).toEqual('data');
  });
});

// ── invalidateOnMutation ──────────────────────────────────────────────────
describe('apiCache.invalidateOnMutation', () => {
  it('invalidates /posts and /feed caches when a post is upvoted', () => {
    apiCache.set('anon:GET:/posts:', {posts: []}, '/posts');
    apiCache.set('anon:GET:/feed:', {feed: []}, '/feed');
    apiCache.set('anon:GET:/users:', {users: []}, '/users');
    apiCache.invalidateOnMutation('/posts/123/upvote');
    expect(apiCache.get('anon:GET:/posts:')).toBeNull();
    expect(apiCache.get('anon:GET:/feed:')).toBeNull();
    // Users should NOT be invalidated
    expect(apiCache.get('anon:GET:/users:')).not.toBeNull();
  });

  it('invalidates /posts/ caches when a comment is made', () => {
    apiCache.set('anon:GET:/posts/1:', 'post-data', '/posts/1');
    apiCache.invalidateOnMutation('/comments');
    expect(apiCache.get('anon:GET:/posts/1:')).toBeNull();
  });

  it('invalidates /communities caches when joining a community', () => {
    apiCache.set('anon:GET:/communities:', 'comm-data', '/communities');
    apiCache.invalidateOnMutation('/communities/abc/join');
    expect(apiCache.get('anon:GET:/communities:')).toBeNull();
  });

  it('does nothing for non-matching mutations', () => {
    apiCache.set('anon:GET:/posts:', 'data', '/posts');
    apiCache.invalidateOnMutation('/some/random/endpoint');
    expect(apiCache.get('anon:GET:/posts:')).not.toBeNull();
  });

  it('invalidates /notifications on notification mutation', () => {
    apiCache.set('anon:GET:/notifications:', 'notif-data', '/notifications');
    apiCache.invalidateOnMutation('/notifications');
    expect(apiCache.get('anon:GET:/notifications:')).toBeNull();
  });
});

// ── dedupFetch ────────────────────────────────────────────────────────────
describe('apiCache.dedupFetch', () => {
  it('returns same promise for concurrent calls with same key', async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return Promise.resolve('result');
    };
    const p1 = apiCache.dedupFetch('dedup-key', fn);
    const p2 = apiCache.dedupFetch('dedup-key', fn);
    expect(p1).toBe(p2);
    await p1;
    expect(callCount).toBe(1);
  });

  it('cleans up after promise resolves (allows fresh fetch next time)', async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return Promise.resolve('ok');
    };
    await apiCache.dedupFetch('dedup-clean', fn);
    await apiCache.dedupFetch('dedup-clean', fn);
    expect(callCount).toBe(2);
  });

  it('cleans up after promise rejects', async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return Promise.reject(new Error('fail'));
    };
    await apiCache.dedupFetch('dedup-err', fn).catch(() => {});
    await apiCache.dedupFetch('dedup-err', fn).catch(() => {});
    expect(callCount).toBe(2);
  });

  it('uses different keys for different requests', async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return Promise.resolve('ok');
    };
    const p1 = apiCache.dedupFetch('key-a', fn);
    const p2 = apiCache.dedupFetch('key-b', fn);
    expect(p1).not.toBe(p2);
    await Promise.all([p1, p2]);
    expect(callCount).toBe(2);
  });
});

// ── getStats ──────────────────────────────────────────────────────────────
describe('apiCache.getStats', () => {
  it('returns correct stats for empty cache', () => {
    const stats = apiCache.getStats();
    expect(stats.total).toBe(0);
    expect(stats.fresh).toBe(0);
    expect(stats.stale).toBe(0);
    expect(stats.inFlight).toBe(0);
    expect(stats.publicTotal).toBe(0);
  });

  it('counts fresh entries correctly', () => {
    apiCache.set('s1', 'v1', '/posts');
    apiCache.set('s2', 'v2', '/users');
    const stats = apiCache.getStats();
    expect(stats.total).toBe(2);
    expect(stats.fresh).toBe(2);
    expect(stats.stale).toBe(0);
  });

  it('counts public entries correctly', () => {
    apiCache.setPublic('pub1', 'data1', 60_000);
    apiCache.setPublic('pub2', 'data2', 60_000);
    const stats = apiCache.getStats();
    expect(stats.publicTotal).toBe(2);
    expect(stats.publicFresh).toBe(2);
  });
});
