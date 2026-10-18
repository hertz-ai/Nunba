/**
 * Wiring guard: Nunba speaks to the HART OS shell through ONE module.
 *
 * utils/shellBridge is tested behaviourally in __tests__/utils. This file pins
 * where it is wired, at source level, for the same reason
 * firstRunBootstrap.invariant.test.js does: rendering Demopage pulls its whole
 * provider tree, which does not run in this environment. What this guards:
 *
 *   Demopage (the /local chat page the shell frames) announces itself with
 *   nunba:ready, takes nunba:compose into its composer, and reports the turn
 *   state with nunba:turn.
 *   Agent.js posts nunba:onboarding when the ceremony seals, which is what
 *   closes the shell's first-run overlay.
 *   Neither file reaches window.parent on its own.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('shell bridge wiring', () => {
  const demopage = read('pages/Demopage.js');
  const agent = read('components/Agent/Agent.js');

  test('Demopage imports the bridge and does not hand-roll postMessage', () => {
    expect(demopage).toMatch(/import \{[^}]*onShellMessage[^}]*\} from '\.\.\/utils\/shellBridge'/);
    expect(demopage).not.toMatch(/window\.parent\.postMessage/);
  });

  test('Demopage announces, composes and reports the turn', () => {
    expect(demopage).toContain("postToShell('nunba:ready'");
    expect(demopage).toContain("if (msg.type !== 'nunba:compose') return;");
    expect(demopage).toContain("postToShell('nunba:turn', { state: loading ? 'start' : 'done' })");
  });

  test('a composed send goes through the one send path, after the composer state landed', () => {
    const start = demopage.indexOf("if (msg.type !== 'nunba:compose') return;");
    const block = demopage.slice(start, start + 1200);
    expect(block).toContain('setInputMessage(text)');
    expect(block).toContain('if (handleSendRef.current) handleSendRef.current();');
    expect(block).not.toContain('fetch(');
  });

  test('Agent.js posts the seal to the shell from the completion handler', () => {
    expect(agent).toContain("import { postToShell } from '../../utils/shellBridge';");
    const start = agent.indexOf('const handleHartComplete = useCallback((result) => {');
    const block = agent.slice(start, start + 800);
    expect(block).toContain("postToShell('nunba:onboarding', { state: 'sealed'");
    expect(agent).not.toMatch(/window\.parent\.postMessage/);
  });
});
