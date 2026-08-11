/**
 * Parity phase B — the /agents/:agentName round-trip must close.
 *
 * The defect these tests pin: one writer, three reader rules, none of which
 * reversed the writer. Agents.js wrote `name.replace(/\s+/g,'-')`; Agent.js:271
 * compared `a.name.toLowerCase() === agentName.toLowerCase()`; Demopage.js:957
 * compared `a.name === agentName`. No reader un-hyphenated, so any agent with a
 * space in its name could not be addressed by URL.
 *
 * It hid because clicking a card passes the agent through router state
 * (Agent.js:70), so the URL is never consulted on that path. Deep links,
 * refreshes, bookmarks and shared URLs have no state and fell through to
 * `defaultAgentData` — the wrong agent, silently.
 *
 * The round-trip property below (slug -> match -> same agent) is the contract.
 * Everything else here exists to stop a "tidy-up" from breaking backward
 * compatibility, which is the expensive failure: old links dying quietly.
 */
import { agentSlug, matchAgentBySlug } from '../../utils/agentSlug';

const LOCAL_TUTOR = { prompt_id: 1, name: 'Local Tutor' };
const DR_WHO = { prompt_id: 2, name: 'Dr. Who?' };
const PLAIN = { prompt_id: 3, name: 'Hevolve' };
const AGENTS = [LOCAL_TUTOR, DR_WHO, PLAIN];

describe('agentSlug', () => {
  test('lowercases, hyphenates whitespace, strips punctuation', () => {
    expect(agentSlug('Local Tutor')).toBe('local-tutor');
    expect(agentSlug('Dr. Who?')).toBe('dr-who');
    expect(agentSlug('  Spaced   Out  ')).toBe('spaced-out');
  });

  test('is idempotent — slugifying a slug is a no-op', () => {
    // This is the property that makes reader-side slugification safe, and thus
    // the property that makes old URLs keep working. If it ever stops holding,
    // backward compatibility goes with it.
    const names = ['Local Tutor', 'Dr. Who?', 'a--b', '-lead', 'trail-', 'Hevolve'];
    names.forEach((n) => {
      const once = agentSlug(n);
      expect(agentSlug(once)).toBe(once);
    });
  });

  test('collapses runs and trims leading/trailing hyphens', () => {
    expect(agentSlug('a   -   b')).toBe('a-b');
    expect(agentSlug('---edge---')).toBe('edge');
  });

  test('caps length at 72 chars', () => {
    expect(agentSlug('x'.repeat(200))).toHaveLength(72);
  });

  test('empty-ish input yields empty string, never throws', () => {
    [undefined, null, '', '   ', '!!!'].forEach((v) => {
      expect(agentSlug(v)).toBe('');
    });
  });
});

describe('matchAgentBySlug — the round trip', () => {
  test('a slug built from a name resolves back to that same agent', () => {
    AGENTS.forEach((agent) => {
      expect(matchAgentBySlug(AGENTS, agentSlug(agent.name))).toBe(agent);
    });
  });

  test('resolves the OLD naive URL form (the backward-compat guarantee)', () => {
    // What the pre-fix writer emitted: spaces->hyphens, original case,
    // punctuation left in. These URLs are already in users' history.
    expect(matchAgentBySlug(AGENTS, 'Local-Tutor')).toBe(LOCAL_TUTOR);
    expect(matchAgentBySlug(AGENTS, 'Dr.-Who?')).toBe(DR_WHO);
  });

  test('resolves a raw un-encoded name too (defensive, some links carry it)', () => {
    expect(matchAgentBySlug(AGENTS, 'Local Tutor')).toBe(LOCAL_TUTOR);
  });

  test('is case-insensitive', () => {
    expect(matchAgentBySlug(AGENTS, 'LOCAL-TUTOR')).toBe(LOCAL_TUTOR);
  });

  test('returns undefined for an unknown slug rather than a wrong agent', () => {
    // The original defect was returning the WRONG agent (the default). An
    // explicit undefined forces the caller to decide.
    expect(matchAgentBySlug(AGENTS, 'nobody-here')).toBeUndefined();
  });

  test('returns undefined for empty input and tolerates a junk list', () => {
    expect(matchAgentBySlug(AGENTS, '')).toBeUndefined();
    expect(matchAgentBySlug(undefined, 'local-tutor')).toBeUndefined();
    expect(matchAgentBySlug([null, undefined, LOCAL_TUTOR], 'local-tutor')).toBe(
      LOCAL_TUTOR,
    );
  });
});
