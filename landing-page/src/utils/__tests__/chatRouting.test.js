/**
 * Where a chat message goes.
 *
 * Found testing a fresh install (2026-10-01): a guest who picked Hive got
 * "Session expired" on every message.  Hive sent the guest's node-minted
 * token (scope "local") to the cloud API, which answered 401; the silent
 * guest refresh minted another node token and the retry failed the same way.
 */
import {shouldUseLocalBackend} from '../chatRouting';

const route = (o) =>
  shouldUseLocalBackend({backendHealth: 'healthy', isGuestMode: false, localAgent: false, online: true, ...o})
    ? 'local'
    : 'cloud';

describe('shouldUseLocalBackend', () => {
  test('a guest on Hive goes local (the cloud rejects a node-minted token)', () => {
    expect(route({preference: 'hive_preferred', isGuestMode: true})).toBe('local');
  });

  test('a guest goes local on every preference, even with the backend reported offline', () => {
    for (const preference of ['local_only', 'auto', 'hive_preferred']) {
      expect(route({preference, isGuestMode: true, backendHealth: 'offline'})).toBe('local');
    }
  });

  test('a signed-in cloud user on Hive still uses the cloud API', () => {
    expect(route({preference: 'hive_preferred'})).toBe('cloud');
  });

  test('Local always goes local', () => {
    expect(route({preference: 'local_only', backendHealth: 'offline', online: false})).toBe('local');
  });

  describe('Hybrid (auto) for a signed-in user is unchanged', () => {
    test('a local agent goes local', () => {
      expect(route({preference: 'auto', localAgent: true})).toBe('local');
    });
    test('offline network goes local', () => {
      expect(route({preference: 'auto', online: false})).toBe('local');
    });
    test('a cloud agent online goes to the cloud', () => {
      expect(route({preference: 'auto'})).toBe('cloud');
    });
    test('an offline backend never takes a local agent', () => {
      expect(route({preference: 'auto', localAgent: true, backendHealth: 'offline'})).toBe('cloud');
    });
  });
});
