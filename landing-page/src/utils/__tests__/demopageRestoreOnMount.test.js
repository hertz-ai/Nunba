/**
 * Source guards for the chat-history restore in Demopage.js.  Demopage is too
 * large to render in a unit test, so these read the source and pin the two
 * rules the 2026-10-02 live check found broken:
 *   1. stored history is restored on mount from localStorage, NOT only after
 *      the /prompts + /agents/sync fetches return (those took 3-7 s warm and
 *      far longer during boot, so the chat sat empty);
 *   2. restored messages from the server DB go through the one normaliser, so
 *      {role,text} entries no longer render as empty bubbles.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

describe('Demopage chat restore', () => {
  test('there is a localStorage-only reader that never touches the network', () => {
    const m = SRC.match(/const readLocalMessages = [\s\S]*?\n {2}\};\n/);
    expect(m).not.toBeNull();
    expect(m[0]).toMatch(/localStorage\.getItem\(/);
    expect(m[0]).not.toMatch(/XMLHttpRequest|fetch\(/);
  });

  test('a mount effect restores from readLocalMessages and merges with live messages', () => {
    expect(SRC).toMatch(/useEffect\(\(\) => \{\s*\/\/ restore-on-mount[\s\S]*?readLocalMessages\([\s\S]*?mergeRestoredMessages\(/);
  });

  test('the server-DB fallback no longer emits {role,text} messages', () => {
    expect(SRC).not.toMatch(/restored\.push\(\{ role:/);
    expect(SRC).toMatch(/normalizeRestoredMessages/);
  });
});
