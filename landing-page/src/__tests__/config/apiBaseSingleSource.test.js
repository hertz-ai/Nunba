/**
 * The local backend's address has one definition: API_BASE_URL in
 * src/config/apiBase.js (REACT_APP_API_BASE_URL, else localhost:5000).
 *
 * LogsViewer and crossbarWorker each wrote 'http://localhost:5000' inline.
 * A bundle built with REACT_APP_API_BASE_URL still sent those calls to
 * :5000, which on a developer's box is the installed Nunba: measured
 * 2026-11-04, a Cypress run against a test Flask on :5001 reached the
 * installed app.  This fails on any such literal outside apiBase.js.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');
const CANONICAL = path.join(SRC, 'config', 'apiBase.js');
// A quoted or templated URL to the local backend port, not a comment.
const LITERAL = /['"`]https?:\/\/(?:localhost|127\.0\.0\.1):5000/;

function sourceFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('local backend URL has one source', () => {
  it('no file but config/apiBase.js writes localhost:5000', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => file !== CANONICAL)
      .flatMap((file) =>
        fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({line, no: i + 1}))
          .filter(({line}) => LITERAL.test(line) && !/^\s*(\/\/|\*)/.test(line))
          .map(({no}) => `${path.relative(SRC, file)}:${no}`)
      );
    expect(offenders).toEqual([]);
  });

  it('the guard sees a literal when one is there', () => {
    expect(LITERAL.test("axios.get('http://localhost:5000/status')")).toBe(true);
    expect(LITERAL.test('// Flask :5000 /chat')).toBe(false);
  });
});
