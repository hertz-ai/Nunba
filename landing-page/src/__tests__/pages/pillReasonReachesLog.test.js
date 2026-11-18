/**
 * When the desktop's red error pill fires, the failure behind it reaches the
 * server log.
 *
 * app.py injects the "Nunba Action Pill" into every page of the desktop
 * window.  Any page promise that rejects with nobody handling it shows
 * "Something went wrong — tap to recover", and the pill writes the reason to
 * the console as "[Nunba Pill] Unhandled rejection: <reason>".  WebView2 has
 * no developer tools, so Demopage forwards console lines to /api/jslog, which
 * writes them to the server log -- but only lines tagged [TTS], [SSE],
 * [VIDEO] or [STT].  The pill's line carries none of those, so the reason was
 * dropped.
 *
 * Measured 2026-11-05: the owner saw that pill during the 23:52 IST
 * auto-start, and no log held a single forwarded line ("[JS:" 0 times in
 * gui_app.log, server.log and frozen_debug.log), while a test line posted to
 * /api/jslog landed in all of them within a second.  The reason was in no
 * log, so the failure could not be named.
 *
 * Both pieces run here as written: the pill's two listeners are cut out of
 * app.py and Demopage's forwarder out of Demopage.js (between the markers
 * below), wired the way the page wires them (the pill calls console.error,
 * which is Demopage's forwarding console.error), and a failure is fired.
 *
 * PILL_LOG_DEMOPAGE=<path> runs the same tests against another copy of
 * Demopage.js (the parent commit) to show they fail there.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/pages/pillReasonReachesLog.test.js
 */
const fs = require('fs');
const path = require('path');

const PAGE = process.env.PILL_LOG_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const APP_PY = path.join(__dirname, '..', '..', '..', '..', 'app.py');

function cut(src, start, end, where) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`${where} marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`${where} end marker not found after ${start}: ${end}`);
  return src.slice(a, b);
}

// Demopage's forwarder, with fetch recorded.
function forwarder() {
  const posts = [];
  const block = cut(fs.readFileSync(PAGE, 'utf8'),
    'const _send = (level, args) => {', 'console.log = (...args) =>', 'Demopage');
  const fakeFetch = (url, init) => {
    posts.push({ url, body: JSON.parse(init.body) });
    return Promise.resolve({ ok: true });
  };
  // eslint-disable-next-line no-new-func
  const send = new Function('fetch', `${block}\nreturn _send;`)(fakeFetch);
  return { posts, console: { error: (...args) => send('error', args) } };
}

// The pill's error and rejection listeners, registered on a stub window.
function pill(pageConsole) {
  const app = fs.readFileSync(APP_PY, 'utf8');
  const block = cut(app, '// 3. Unhandled JS errors', '// 5. Navigation failures', 'app.py');
  const listeners = {};
  const shown = [];
  const win = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  // eslint-disable-next-line no-new-func
  new Function('window', 'console', 'showErrorPill', 'showOfflinePill', 'navigator',
    'LOCAL_URL', 'location', block,
  )(win, pageConsole, (label) => { shown.push(label); }, () => { shown.push('offline'); },
    { onLine: true }, 'http://localhost:5000/local', {});
  return { listeners, shown };
}

describe('the pill\'s failure reaches the server log', () => {
  test('an unhandled rejection: the pill shows, and its reason is posted to /api/jslog', () => {
    const page = forwarder();
    const { listeners, shown } = pill(page.console);
    const reason = new TypeError("Cannot read properties of undefined (reading 'steps')");

    listeners.unhandledrejection({ reason });

    // The toast the owner saw.
    expect(shown).toEqual(['Something went wrong — tap to recover']);
    expect(page.posts).toHaveLength(1);
    expect(page.posts[0].url).toBe('/api/jslog');
    expect(page.posts[0].body.level).toBe('error');
    expect(page.posts[0].body.msg).toBe(
      "[Nunba Pill] Unhandled rejection: Cannot read properties of undefined (reading 'steps')");
  });

  test('an uncaught error: its message is posted too', () => {
    const page = forwarder();
    const { listeners, shown } = pill(page.console);

    listeners.error({ message: 'Uncaught ReferenceError: foo is not defined' });

    expect(shown).toEqual(['Something broke — tap to recover']);
    expect(page.posts.map((p) => p.body.msg)).toEqual(
      ['[Nunba Pill] Caught error: Uncaught ReferenceError: foo is not defined']);
  });

  test('a rejection the pill ignores is not posted', () => {
    const page = forwarder();
    const { listeners, shown } = pill(page.console);

    listeners.unhandledrejection({ reason: new Error('AbortError: the user aborted a request.') });

    expect(shown).toEqual([]);
    expect(page.posts).toEqual([]);
  });

  test('other console lines are still filtered as before', () => {
    const page = forwarder();

    page.console.error('Failed to send POST request:', 'x');
    page.console.error('[TTS] Play FAILED:', 'y');

    expect(page.posts.map((p) => p.body.msg)).toEqual(['[TTS] Play FAILED: y']);
  });
});
