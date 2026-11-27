/**
 * SOURCE GUARD (a source-shape check, not a behaviour test; never the only proof): the chat page
 * reads nothing before its declaration while it renders.  The behavioural proof is the real page
 * loading in Nunba with no ReferenceError/TypeError in the console (live-proof list).
 *
 * Review rv_page, 27 Nov 2026: the open agent's idle pick read failedIdleUrlsRef.current at the top
 * of the component body ~190 lines before `const failedIdleUrlsRef = useRef(...)`, so every render
 * threw "Cannot access 'failedIdleUrlsRef' before initialization" and the chat page drew nothing.
 * The same class crashed the built page on 2026-05-11 ("Cannot access 'ot' before initialization").
 * No suite renders the real Demopage (58 imports; the others cut pieces or mock it), so this guard
 * reads the real file with ESLint's no-use-before-define limited to SAME-scope reads: a read inside a
 * callback or an effect runs after the whole body and is not flagged; a read in the body itself is.
 *
 * ESLint runs in a child `node` process: this suite keeps the app's jsdom environment (setupTests
 * needs `window`; rv_page's run of an `@jest-environment node` version failed to load), and ESLint
 * runs where it is built to run.
 */
const path = require('path');
const {spawnSync} = require('child_process');

const LANDING = path.join(__dirname, '..', '..', '..');
const PAGE = path.join(__dirname, '..', '..', 'pages', 'Demopage.js');

// argv: <mode: 'text' | 'file'> <source text or file path>; prints the problems as JSON.
const LINT = `
const {ESLint} = require('eslint');
const [mode, arg] = process.argv.slice(1);
(async () => {
  const eslint = new ESLint({
    useEslintrc: false,
    // An ignored file passed explicitly comes back as a non-fatal warning with no rule id, which
    // the filter below would drop: a silent pass.  Nothing is ignored here (rv_page).
    ignore: false,
    overrideConfig: {
      parserOptions: {ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: {jsx: true}},
      rules: {'no-use-before-define': ['error', {functions: false, classes: false, variables: false}]},
    },
  });
  const [r] = mode === 'text' ? await eslint.lintText(arg) : await eslint.lintFiles([arg]);
  const out = r.messages
    .filter((m) => m.ruleId === 'no-use-before-define' || m.fatal)
    .map((m) => m.line + ': ' + m.message);
  process.stdout.write(JSON.stringify(out));
})().catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exit(2); });
`;

function problems(mode, arg) {
  // A synchronous spawn blocks jest's own 60 s test timeout, so the child carries its own: a hung
  // ESLint ends at 55 s (status null, ETIMEDOUT) and the test fails instead of hanging the run.
  const r = spawnSync(process.execPath, ['-e', LINT, mode, arg],
    {cwd: LANDING, encoding: 'utf8', timeout: 55000});
  if (r.status !== 0) {
    throw new Error(`the ESLint guard did not run (exit ${r.status}): ${r.stderr}`);
  }
  return JSON.parse(r.stdout);
}

describe('SOURCE GUARD: Demopage reads nothing before its declaration', () => {
  it('the guard catches a body-level read before its declaration, and not one in an effect', () => {
    expect(problems('text',
      'function C() {\n  const a = ref.current;\n  const ref = {current: 1};\n  return a;\n}\n'))
      .toHaveLength(1);
    expect(problems('text',
      'function C() {\n  useEffect(() => { ref.current = 2; });\n  const ref = {current: 1};\n}\n'))
      .toEqual([]);
  }, 60000);

  it('the real chat page renders no such read', () => {
    expect(problems('file', PAGE)).toEqual([]);
  }, 60000);
});
