/* eslint-disable */
/**
 * The frameless titlebar offset CSS exists in TWO places, by design:
 *
 *   1. public/index.html  <style id="nunba-titlebar-offsets">   <- PRIMARY
 *      Applies from first paint, before React mounts, so the 32px titlebar
 *      reservation holds even if the app boots slowly or fails to mount.
 *   2. components/Shell/NunbaTitleBar.js                        <- FALLBACK
 *      Injected only when #nunba-titlebar-offsets is absent (e.g. under Jest,
 *      where index.html is never loaded).
 *
 * Because the HTML is parsed first, its copy ALWAYS wins in the real app —
 * NunbaTitleBar's injector sees the id already present and returns early.
 *
 * WHY THIS TEST EXISTS (2026-08-09): the two copies drifted. The JS copy was
 * updated to `overflow-x:hidden; overflow-y:auto` plus a .nunba-fixed-viewport
 * rule; index.html was not. Since the HTML copy always wins, the shipped app
 * kept `overflow: hidden` on <html>. The root element's overflow propagates to
 * the viewport (CSS Overflow 3.3), so that disabled DOCUMENT SCROLLING —
 * /admin/* and /social/* could not be scrolled with the mouse wheel at all
 * inside Nunba, while scrolling fine in a browser (class never applied there).
 *
 * The fix looked correct in code, passed its unit tests, and shipped in the
 * bundle — and was still completely inert, because the bundle's copy never
 * reached the DOM. Reviewing the diff could not catch that. Only comparing the
 * two copies can.
 *
 * So: this test does not check that the CSS is "right". It checks that the
 * copy that WINS says the same thing as the copy that gets reviewed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const INDEX_HTML = path.join(ROOT, 'public', 'index.html');
const TITLEBAR_JS = path.join(ROOT, 'src', 'components', 'Shell', 'NunbaTitleBar.js');

/** Strip CSS comments, collapse whitespace, drop empties → comparable set. */
function declarations(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')   // CSS comments carry no behaviour
    .replace(/\s+/g, ' ')
    .split(/(?<=\})/)                    // one entry per rule
    .map((s) => s.trim())
    .filter(Boolean);
}

function cssFromIndexHtml() {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const m = html.match(/<style id="nunba-titlebar-offsets">([\s\S]*?)<\/style>/);
  if (!m) throw new Error('public/index.html no longer has #nunba-titlebar-offsets');
  return m[1];
}

function cssFromTitlebarJs() {
  const js = fs.readFileSync(TITLEBAR_JS, 'utf8');
  // The injected stylesheet is a template literal assigned to .textContent.
  const m = js.match(/textContent\s*=\s*`([\s\S]*?)`/);
  if (!m) throw new Error('NunbaTitleBar.js no longer assigns a template-literal stylesheet');
  return m[1];
}

describe('nunba-titlebar-offsets: the two copies must agree', () => {
  it('both sources still exist (neither was silently deleted)', () => {
    expect(() => cssFromIndexHtml()).not.toThrow();
    expect(() => cssFromTitlebarJs()).not.toThrow();
  });

  it('declare byte-equivalent rules once comments and whitespace are removed', () => {
    // If this fails, the copy you edited is probably NOT the copy that ships.
    // index.html is parsed first and therefore always wins in the real app.
    expect(declarations(cssFromTitlebarJs())).toEqual(declarations(cssFromIndexHtml()));
  });
});

describe('the specific regression that made Nunba unscrollable', () => {
  const html = () => cssFromIndexHtml().replace(/\/\*[\s\S]*?\*\//g, '');

  it('does NOT put a bare overflow:hidden on the frameless root', () => {
    // `overflow:hidden` on <html> propagates to the viewport and kills the
    // mouse wheel document-wide. Comments are stripped first so the prose
    // explaining this rule cannot satisfy its own guard.
    const rootRule = html().match(/html\.nunba-frameless-active\s*\{[^}]*\}/);
    expect(rootRule).not.toBeNull();
    expect(rootRule[0]).not.toMatch(/overflow\s*:\s*hidden/);
    expect(rootRule[0]).toMatch(/overflow-y\s*:\s*auto/);
  });

  it('scopes the viewport clamp to .nunba-fixed-viewport routes only', () => {
    expect(html()).toMatch(
      /html\.nunba-frameless-active\.nunba-fixed-viewport\s*\{[^}]*overflow\s*:\s*hidden/
    );
  });
});
