/**
 * The page's two startup reads, /auth/me and /theme/active, must not raise
 * the global error banner when the route is not there yet.
 *
 * Measured 2026-11-07 on the installed desktop: the page opened at 11:26:11,
 * both reads were answered 404 "API endpoint not found" at 11:26:13 (WebView2
 * cache, Date header), and HARTOS registered the routes (social_bp) at
 * 11:26:14.18.  The banner then told the owner "Couldn't find what you asked
 * for." although they had asked for nothing.  Both callers already handle
 * that 404 themselves: SocialContext keeps it as 'unanswered' and RoleGuard
 * asks again; ThemeContext keeps the default theme.
 *
 * These tests drive the real axiosFactory interceptor (the one place that
 * raises the banner) through the real socialApi calls, with axios's network
 * replaced by an adapter that answers with a chosen status.
 */
import axios from 'axios';

const BANNER = 'hevolve:api-error';

let answer = {status: 200, data: {}};

function fakeNetwork(config) {
  const {status, data} = answer;
  const response = {status, statusText: String(status), data, headers: {}, config};
  if (status >= 200 && status < 300) return Promise.resolve(response);
  const err = new Error(`Request failed with status code ${status}`);
  err.config = config;
  err.response = response;
  return Promise.reject(err);
}

// Instances made by createApiClient copy axios.defaults when they are made,
// so the fake network goes in before socialApi creates its clients.
axios.defaults.adapter = fakeNetwork;
const {createApiClient} = require('../../services/axiosFactory');
const {authApi, themeApi, notificationsApi} = require('../../services/socialApi');

let banners;
const onBanner = (ev) => banners.push(ev.detail);

beforeEach(() => {
  banners = [];
  window.addEventListener(BANNER, onBanner);
  localStorage.clear();
});

afterEach(() => {
  window.removeEventListener(BANNER, onBanner);
});

async function settle(promise) {
  try {
    await promise;
  } catch (_) {
    // the callers handle the rejection; these tests only watch the banner
  }
}

describe('startup reads answered 404 while HARTOS registers its routes', () => {
  test('/auth/me 404 raises no banner', async () => {
    answer = {status: 404, data: {error: 'API endpoint not found', path: '/api/social/auth/me'}};
    await settle(authApi.me());
    expect(banners).toEqual([]);
  });

  test('/theme/active 404 raises no banner', async () => {
    answer = {status: 404, data: {error: 'API endpoint not found', path: '/api/social/theme/active'}};
    await settle(themeApi.getActive());
    expect(banners).toEqual([]);
  });

  test('/auth/me 404 still rejects with the status, so SocialContext sees "unanswered"', async () => {
    answer = {status: 404, data: {error: 'API endpoint not found'}};
    await expect(authApi.me()).rejects.toMatchObject({status: 404});
  });
});

describe('every other failure still reaches the banner', () => {
  test('/auth/me 401 still says the session expired', async () => {
    answer = {status: 401, data: {error: 'Invalid token'}};
    await settle(authApi.me());
    expect(banners).toHaveLength(1);
    expect(banners[0]).toMatchObject({status: 401, method: 'GET'});
    expect(banners[0].path).toMatch(/\/auth\/me$/);
  });

  test('/auth/me 503 still raises the banner', async () => {
    answer = {status: 503, data: {}};
    await settle(authApi.me());
    expect(banners).toHaveLength(1);
    expect(banners[0].status).toBe(503);
  });

  test('/theme/active 500 still raises the banner', async () => {
    answer = {status: 500, data: {}};
    await settle(themeApi.getActive());
    expect(banners).toHaveLength(1);
    expect(banners[0].status).toBe(500);
  });

  test('a 404 on any other read still raises the banner', async () => {
    answer = {status: 404, data: {error: 'API endpoint not found'}};
    await settle(notificationsApi.list({unread: true, limit: 1}));
    expect(banners).toHaveLength(1);
    expect(banners[0].status).toBe(404);
  });
});

describe('a silentError status list', () => {
  test('notificationsApi.list passes a caller\'s silentError through', async () => {
    answer = {status: 404, data: {error: 'API endpoint not found'}};
    await settle(notificationsApi.list({unread: true, limit: 1}, {silentError: [404]}));
    expect(banners).toEqual([]);
  });

  test('statuses written as strings still match', async () => {
    answer = {status: 404, data: {}};
    const client = createApiClient('http://localhost:5000', {cache: false});
    await settle(client.get('/x', {silentError: ['404']}));
    expect(banners).toEqual([]);
  });
});

describe('silentError: true still silences every failure', () => {
  test('a 500 on a silentError: true request raises no banner', async () => {
    answer = {status: 500, data: {}};
    const client = createApiClient('http://localhost:5000', {cache: false});
    await settle(client.post('/api/storage/set', {}, {silentError: true}));
    expect(banners).toEqual([]);
  });

  test('the same request without silentError raises the banner', async () => {
    answer = {status: 500, data: {}};
    const client = createApiClient('http://localhost:5000', {cache: false});
    await settle(client.post('/api/storage/set', {}));
    expect(banners).toHaveLength(1);
  });
});
