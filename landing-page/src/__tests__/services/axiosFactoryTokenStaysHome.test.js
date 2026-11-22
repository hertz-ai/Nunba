/**
 * The person's bearer token never leaves for somebody else's host.
 *
 * services/axiosFactory attaches localStorage access_token to every request
 * of every client it makes.  Four clients were made for hosts that are not
 * ours (a reverse geocoder at api.bigdatacloud.net in curriculai, essentials
 * and hertz; a file on raw.githubusercontent.com in knnresults), so a
 * signed-in person's token would have gone to those hosts with each call
 * (found in the review of a2c1dc49).  A client says sendToken: false and no
 * request of it carries the token.
 *
 * That leak was latent, never live: nothing in the app imported those four
 * pages or parallaxCodepen (they imported only each other), knnresults needs
 * packages that are not installed, and the shipped bundle never held the
 * geocoder's host.  The five files were deleted on 2026-11-22, so today no
 * client is made for a foreign host at all.  The option and both checks
 * stay, for the next one.
 *
 * Two checks:
 *   - at the wire, with the real factory: what leaves for a foreign host has
 *     no Authorization header, and our own hosts still get it;
 *   - over the source: every createApiClient whose base is written out as a
 *     URL is either one of our hosts or says sendToken: false.  A new client
 *     for a foreign host fails here until it says so.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import {createApiClient} from '../../services/axiosFactory';

jest.mock('axios', () =>
  jest.requireActual('../../testSupport/axiosWire').wireAxios()
);

const TOKEN = 'tok-of-the-signed-in-person';

// Hosts the token is for.  Anything else is somebody else's.
const OUR_HOSTS = [/(^|\.)hertzai\.com$/, /(^|\.)hevolve\.ai$/, /^localhost$/, /^127\.0\.0\.1$/];
const isOurs = (url) => OUR_HOSTS.some((re) => re.test(new URL(url).hostname));

const sent = (method = 'get') =>
  axios[method].mock.calls.map(([url, , config]) => ({
    url,
    authorization: config.headers.Authorization,
  }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('access_token', TOKEN);
  axios.get.mockResolvedValue({status: 200, data: {}});
  axios.post.mockResolvedValue({status: 200, data: {}});
});

describe('at the wire', () => {
  test.each([
    ['https://api.bigdatacloud.net', '/data/reverse-geocode-client?latitude=1&longitude=2'],
    ['https://raw.githubusercontent.com', '/someone/some-repo/main/file.json'],
  ])('nothing sent to %s carries the token', async (host, route) => {
    const client = createApiClient(host, {handle401: false, sendToken: false});
    await client.get(route);
    await client.get(route, {cache: false});
    await client.post(route, {a: 1});
    // a request cannot switch it back on for a client that keeps it home
    await client.get(`${route}&again=1`, {sendToken: true, cache: false});

    const out = [...sent('get'), ...sent('post')];
    expect(out.length).toBeGreaterThanOrEqual(3);
    for (const request of out) {
      expect(request.url.startsWith(host)).toBe(true);
      expect(request.authorization).toBeUndefined();
    }
  });

  test('a client of our own host still sends it, on every request', async () => {
    const client = createApiClient('https://azurekong.hertzai.com', {cache: false});
    await client.get('/api/social/auth/me');
    await client.post('/api/social/posts', {a: 1});
    expect([...sent('get'), ...sent('post')].map((r) => r.authorization)).toEqual([
      `Bearer ${TOKEN}`,
      `Bearer ${TOKEN}`,
    ]);
  });

  test('one request of such a client can still leave it off', async () => {
    const client = createApiClient('https://mailer.hertzai.com', {cache: false});
    await client.post('/makepayment', {a: 1}, {sendToken: false});
    await client.post('/addsubscription_by_phone', {a: 1});
    expect(sent('post').map((r) => r.authorization)).toEqual([
      undefined,
      `Bearer ${TOKEN}`,
    ]);
  });

  test('signed out, nobody gets a header at all', async () => {
    localStorage.clear();
    await createApiClient('https://azurekong.hertzai.com', {cache: false}).get('/x');
    await createApiClient('https://api.bigdatacloud.net', {sendToken: false}).get('/y');
    expect(sent('get').map((r) => r.authorization)).toEqual([undefined, undefined]);
  });
});

describe('over the source', () => {
  const SRC = path.resolve(__dirname, '..', '..');
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['__tests__', 'node_modules', 'testSupport'].includes(entry.name)) walk(full);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
  })(SRC);

  // Every createApiClient( ... ) call, with its whole argument text.
  const clients = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let at = text.indexOf('createApiClient(');
    while (at !== -1) {
      let depth = 0;
      let end = at + 'createApiClient'.length;
      do {
        if (text[end] === '(') depth += 1;
        if (text[end] === ')') depth -= 1;
        end += 1;
      } while (depth > 0 && end < text.length);
      clients.push({
        file: path.relative(SRC, file).split(path.sep).join('/'),
        args: text.slice(at + 'createApiClient('.length, end - 1),
      });
      at = text.indexOf('createApiClient(', end);
    }
  }
  const literalHost = (args) => {
    const m = /^\s*['"`](https?:\/\/[^'"`]+)['"`]/.exec(args);
    return m ? m[1] : null;
  };
  const foreign = clients.filter(
    (c) => literalHost(c.args) && !isOurs(literalHost(c.args))
  );

  test('the walk finds the clients it is about', () => {
    expect(clients.length).toBeGreaterThanOrEqual(11);
    // None since the five dead pages were deleted (2026-11-22).  A new one
    // shows up here and must pass the next test.
    expect(foreign.map((c) => c.file).sort()).toEqual([]);
  });

  test('every client made for a foreign host keeps the token home', () => {
    const leaking = foreign
      .filter((c) => !/\bsendToken:\s*false\b/.test(c.args))
      .map((c) => `${c.file} -> ${literalHost(c.args)}`);
    expect(leaking).toEqual([]);
  });
});
