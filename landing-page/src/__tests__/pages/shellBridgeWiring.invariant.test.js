/**
 * Wiring guard: Nunba speaks to the HART OS shell through ONE module.
 *
 * What the bridge DOES (announce, compose, send once, report the turn) is
 * tested behaviourally in __tests__/utils/shellBridge.test.js, through
 * useShellBridge itself. This file is a source guard for the one thing a
 * behavioural test cannot reach: that the pages are wired to it, for the same
 * reason firstRunBootstrap.invariant.test.js exists (rendering Demopage pulls
 * its whole provider tree, which does not run in this environment). It used
 * to pin the page's own copy of the effects by string, and passed with the
 * lost-send defect in them (review of Nunba 22b282cf, M1 and m3).
 *
 *   Demopage (the /local chat page the shell frames) hands its composer, its
 *   send and its turn state to useShellBridge.
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

  test('source guard: Demopage hands its composer, send and turn to the bridge hook', () => {
    expect(demopage).toMatch(/import \{ useShellBridge \} from '\.\.\/utils\/shellBridge'/);
    expect(demopage).toContain(
      'useShellBridge({ setInputMessage, handleSendRef, textareaRef, loading });');
  });

  test('source guard: Demopage keeps no copy of the bridge of its own', () => {
    expect(demopage).not.toMatch(/window\.parent\.postMessage/);
    expect(demopage).not.toContain("'nunba:compose'");
    expect(demopage).not.toContain("'nunba:turn'");
  });

  test('Agent.js posts the seal to the shell from the completion handler', () => {
    expect(agent).toContain("import { postToShell } from '../../utils/shellBridge';");
    const start = agent.indexOf('const handleHartComplete = useCallback((result) => {');
    const block = agent.slice(start, start + 800);
    expect(block).toContain("postToShell('nunba:onboarding', { state: 'sealed'");
    expect(agent).not.toMatch(/window\.parent\.postMessage/);
  });
});
