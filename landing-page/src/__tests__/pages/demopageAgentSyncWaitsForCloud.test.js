/**
 * The agent sync waits for the cloud session, and runs when it comes.
 *
 * Live 2026-11-25: the page knew the user id from storage before
 * useStorageSync restored the token, so GET /agents/sync went out with no
 * token, got 401 and never ran again that page load.  Its effect re-ran only
 * on agentData, decryptedUserId or agentRetryTrigger, and none of them change
 * when the token lands.  The sync is now sent only for a cloud session, and
 * session.status is in the effect's dependencies, so the restore that turns
 * the session cloud runs the sync, with the token.
 *
 * Demopage has no render harness, so like the other Demopage tests this one
 * reads the source.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const SYNC_CALL = 'chatApi.getAgentSync()';

test('the agent sync is sent only for a cloud session', () => {
  const at = SRC.indexOf('const mergeSyncedAgents = async () => {');
  expect(at).toBeGreaterThan(-1);
  const gate = SRC.slice(at, SRC.indexOf(SYNC_CALL, at));
  expect(gate).toMatch(/if \([^)]*session\.status === 'cloud'[^)]*\)/);
});

test('the agent sync effect runs again when the session turns cloud', () => {
  const deps = SRC.slice(SRC.indexOf(SYNC_CALL))
    .match(/fetchPrompts\(\);\s*\}, \[([^\]]*)\]\);/);
  expect(deps).not.toBeNull();
  expect(deps[1].split(',').map((s) => s.trim())).toContain('session.status');
});
