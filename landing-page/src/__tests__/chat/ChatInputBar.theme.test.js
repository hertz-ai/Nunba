/**
 * Drift-guard: the chat composer must not go back to a light panel.
 *
 * Task #233. The composer textarea shipped as
 *   text-black bg-[#fff8ea] border-gray-200
 * a bright cream block wedged between the dark chat surface above and the dark
 * toolbar below, in a composer that is dark-only by design (the same file uses
 * bg-gray-800 / bg-gray-900 unconditionally at lines 86/87/167/182, with no
 * `dark:` variants anywhere).
 *
 * WHY A GUARD AND NOT JUST A FIX: this already regressed once. Git history:
 *   96661414e  original (cream added)
 *   7b4466915  "security+DRY ... a11y skip-link"   -> #233 REMOVED it
 *   57ad232f7  "... ChatInputBar revert"           -> put it straight back
 * A revert is exactly the failure mode a source-level assertion catches and a
 * render test would not (a snapshot would just be re-recorded).
 *
 * Source-level by design: the class list is a Tailwind string, so the literal
 * IS the contract. No DOM, no jsdom, no mocking of the component's many
 * providers.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../../pages/chat/ChatInputBar.js');
const src = fs.readFileSync(FILE, 'utf8');

/** The className string of the composer <textarea>, without comments. */
const composerClassName = () => {
  // Strip // comments so the explanatory note above the attribute (which
  // legitimately mentions the old colours) cannot satisfy or trip these checks.
  const code = src.replace(/^\s*\/\/.*$/gm, '');
  const m = code.match(/placeholder="Message\.\.\."[\s\S]{0,600}?className="([^"]+)"/);
  if (!m) {
    throw new Error(
      'Could not locate the composer textarea className in ChatInputBar.js — ' +
      'the markup changed; update this guard rather than deleting it.'
    );
  }
  return m[1];
};

describe('#233 ChatInputBar composer stays dark-themed', () => {
  test('does not use the cream #fff8ea background', () => {
    expect(composerClassName()).not.toMatch(/fff8ea/i);
  });

  test('does not force black text', () => {
    expect(composerClassName()).not.toMatch(/(^|\s)text-black(\s|$)/);
  });

  test('uses a dark surface consistent with the rest of the file', () => {
    const cls = composerClassName();
    expect(cls).toMatch(/(^|\s)bg-(gray|slate|zinc|neutral)-(7|8|9)00(\s|$)/);
  });

  test('keeps readable light text on that dark surface', () => {
    const cls = composerClassName();
    expect(cls).toMatch(/(^|\s)text-(white|gray-[12]00|slate-[12]00)(\s|$)/);
  });

  test('placeholder is styled too (default placeholder is unreadably dark)', () => {
    expect(composerClassName()).toMatch(/placeholder-/);
  });

  test('the composer is still dark-only — no dark: variant crept in', () => {
    // The file has no light theme; a `dark:` variant would imply one exists and
    // would leave the light branch as the old cream. Keep it unconditional.
    expect(composerClassName()).not.toMatch(/dark:/);
  });
});
