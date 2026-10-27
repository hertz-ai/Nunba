import { createCeremonySession, nameFromReveal } from '../../../components/HART/ceremonySession';

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

const ok = (body) => ({ ok: true, json: async () => body });

test('a step is sent only after the one before it answered', async () => {
  const first = deferred();
  const sent = [];
  const fetchImpl = jest.fn((url, opts) => {
    sent.push(JSON.parse(opts.body).action);
    return sent.length === 1 ? first.promise : Promise.resolve(ok({ phase: 'b' }));
  });
  const s = createCeremonySession({ baseUrl: '', fetchImpl, key: 'k' });

  const a = s.step('select_language', { language: 'en' });
  const b = s.step();
  await Promise.resolve();
  expect(sent).toEqual(['select_language']);      // the second is held back

  first.resolve(ok({ phase: 'a' }));
  expect(await a).toEqual({ phase: 'a' });
  expect(await b).toEqual({ phase: 'b' });
  expect(sent).toEqual(['select_language', null]);
});

test('every step names the same session and sends no credentials', async () => {
  const fetchImpl = jest.fn(async () => ok({}));
  const s = createCeremonySession({ baseUrl: 'http://x', fetchImpl });
  await s.step('answer', { key: 'music_art' });
  await s.step();

  const bodies = fetchImpl.mock.calls.map(([, o]) => JSON.parse(o.body));
  expect(fetchImpl.mock.calls[0][0]).toBe('http://x/api/hart/advance');
  expect(bodies.map((b) => b.user_id)).toEqual([s.key, s.key]);
  expect(s.key).toMatch(/^hart-ceremony-/);
  fetchImpl.mock.calls.forEach(([, o]) => expect(o.headers.Authorization).toBeUndefined());
});

test('two ceremonies get two sessions', () => {
  const a = createCeremonySession({ baseUrl: '' });
  const b = createCeremonySession({ baseUrl: '' });
  expect(a.key).not.toBe(b.key);
});

test('a hung step times out and the next one still goes', async () => {
  const fetchImpl = jest.fn((url, opts) => (fetchImpl.mock.calls.length === 1
    ? new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('aborted'))))
    : Promise.resolve(ok({ phase: 'next' }))));
  const s = createCeremonySession({ baseUrl: '', fetchImpl, timeoutMs: 50 });
  const hung = s.step();
  const next = s.step();
  expect(await hung).toBeNull();
  expect(await next).toEqual({ phase: 'next' });
});

test('a failed or offline step answers null', async () => {
  const bad = createCeremonySession({ baseUrl: '', fetchImpl: async () => ({ ok: false }) });
  const off = createCeremonySession({ baseUrl: '', fetchImpl: async () => { throw new Error('offline'); } });
  expect(await bad.step()).toBeNull();
  expect(await off.step()).toBeNull();
});

test('nameFromReveal reads a reveal and nothing else', () => {
  expect(nameFromReveal({
    phase: 'reveal', hart_name: 'kazeran', hart_tag: '@kazeran',
    emoji_combo: 'x', candidates: ['kazeran', 'zephyr'],
  })).toEqual({ name: 'kazeran', hartTag: '@kazeran', emojiCombo: 'x', candidates: ['zephyr'] });
  expect(nameFromReveal({ phase: 'pre_reveal' })).toBeNull();
  expect(nameFromReveal({ phase: 'reveal' })).toBeNull();
  expect(nameFromReveal(null)).toBeNull();
});
