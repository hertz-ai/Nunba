/**
 * The desktop's red "Chat error" pill is for chat requests only.
 *
 * app.py injects the "Nunba Action Pill" into every page of the desktop
 * window and wraps fetch: a reply from a chat request that carries `error`
 * (and no `success`) shows "Chat error — tap to retry".  It picked chat
 * requests by the text "/chat" anywhere in the address, so the cross-device
 * sync calls (/api/chat-sync/...) counted too.
 *
 * Measured 2026-11-13: cloud sync is off on the owner's desktop
 * (GET /api/admin/config/chat -> cloud_sync_enabled false), and
 * GET /api/chat-sync/pull-since answers its documented refusal
 * 403 {"error":"sync_disabled","message":"Enable cloud sync in admin
 * settings first."}.  NunbaChatProvider calls it whenever the signed-in user
 * or its message handler changes, so the owner was told "Chat error" while
 * no chat request had failed (no chat turn of his was logged after the
 * 14:53 and 15:05 restarts).
 *
 * The fetch and XHR wrappers run here as written: they are cut out of app.py
 * (between the markers below) and run against a stub window.
 *
 * CHAT_PILL_APP_PY=<path> runs the same tests against another copy of app.py
 * (the parent commit) to show they fail there.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/pages/chatPillOnlyForChat.test.js
 */
const fs = require('fs');
const path = require('path');

const APP_PY = process.env.CHAT_PILL_APP_PY
  || path.join(__dirname, '..', '..', '..', '..', 'app.py');

function cut(src, start, end) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`app.py marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`app.py end marker not found after ${start}: ${end}`);
  return src.slice(a, b);
}

// A fetch Response with a JSON body.
function reply(status, body) {
  const res = {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  };
  res.clone = () => res;
  return res;
}

// The window's fetch and XHR wrappers, installed on a stub window.
// `answer(url)` gives the Response for a fetch.
function wrappers(answer) {
  const block = cut(fs.readFileSync(APP_PY, 'utf8'),
    '// 1. Fetch interceptor', '// 3. Unhandled JS errors');
  const shown = [];
  const where = [];
  const win = { fetch: (url) => Promise.resolve(answer(url)) };
  function XHR() { this.listeners = {}; }
  XHR.prototype.open = function () {};
  XHR.prototype.send = function () {};
  XHR.prototype.addEventListener = function (type, fn) { this.listeners[type] = fn; };
  // eslint-disable-next-line no-new-func
  new Function('window', 'XMLHttpRequest', 'showErrorPill', 'showOfflinePill',
    'showComputePill', '_isSilentUrl', '_dismissErrorPill', 'navigator', 'LOCAL_URL',
    'location', '_errorCount', '_errorThreshold', block,
  )(win, XHR, (label) => { shown.push(label); }, () => { shown.push('offline'); },
    (mode) => { where.push(mode); }, () => false, () => {}, { onLine: true },
    'http://localhost:5000/local', {}, 0, 3);
  return { win, XHR, shown, where };
}

// Let the wrapper's .then(json) chains run.
const settle = () => new Promise((r) => setTimeout(r, 0));

const SYNC_REFUSAL = {
  error: 'sync_disabled',
  message: 'Enable cloud sync in admin settings first.',
};

describe('the "Chat error" pill is for chat requests only', () => {
  test('the sync refusal from pull-since is not called a chat error', async () => {
    const { win, shown } = wrappers(() => reply(403, SYNC_REFUSAL));

    await win.fetch('/api/chat-sync/pull-since?since=0&limit=500');
    await settle();

    expect(shown).toEqual([]);
  });

  test('nor the same refusal from the bucket pull', async () => {
    const { win, shown } = wrappers(() => reply(403, SYNC_REFUSAL));

    await win.fetch('/api/chat-sync/pull');
    await settle();

    expect(shown).toEqual([]);
  });

  test('a chat turn that fails still says so', async () => {
    const { win, shown } = wrappers(() => reply(200, { error: 'llm_failed', success: false }));

    await win.fetch('/chat');
    await settle();

    expect(shown).toEqual(['Chat error — tap to retry']);
  });

  test('an agent chat path is still a chat request', async () => {
    const { win, shown } = wrappers(() => reply(200, { error: 'agent_failed' }));

    await win.fetch('http://localhost:5000/api/social/agent/42/chat?stream=0');
    await settle();

    expect(shown).toEqual(['Chat error — tap to retry']);
  });

  test('a path under /chat/ is still a chat request', async () => {
    const { win, shown } = wrappers(() => reply(200, { error: 'teach_failed' }));

    await win.fetch('https://cloud.example/chat/teachme2');
    await settle();

    expect(shown).toEqual(['Chat error — tap to retry']);
  });

  test('a chat reply still shows where it ran', async () => {
    const { win, shown, where } = wrappers(() => reply(200, { response: 'hi', source: 'local' }));

    await win.fetch('/chat');
    await settle();

    expect(where).toEqual(['local']);
    expect(shown).toEqual([]);
  });

  test('a sync server error counts like any other failing API', async () => {
    const { win, shown } = wrappers(() => reply(500, { error: 'pull_failed' }));

    await win.fetch('/api/chat-sync/pull');
    await win.fetch('/api/chat-sync/pull');
    await win.fetch('/api/chat-sync/pull');
    await settle();

    expect(shown).toEqual(['Server error — tap to reload']);
  });

  test('an XHR to a chat path is still left to the chat code', () => {
    const { XHR, shown } = wrappers(() => reply(200, {}));

    for (let i = 0; i < 3; i += 1) {
      const xhr = new XHR();
      xhr.open('POST', '/api/social/agent/42/chat');
      xhr.send();
      xhr.status = 500;
      xhr.listeners.load();
    }

    expect(shown).toEqual([]);
  });

  test('an XHR sync server error counts like any other failing API', () => {
    const { XHR, shown } = wrappers(() => reply(200, {}));

    for (let i = 0; i < 3; i += 1) {
      const xhr = new XHR();
      xhr.open('POST', '/api/chat-sync/push');
      xhr.send();
      xhr.status = 500;
      xhr.listeners.load();
    }

    expect(shown).toEqual(['Server error — tap to reload']);
  });
});
