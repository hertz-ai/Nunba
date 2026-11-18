/**
 * Opening the chat page while HARTOS is still registering social_bp must not
 * raise the global error banner from the page's own background reads.
 *
 * Measured 2026-11-07 (WebView2 HTTP cache, exact send/answer times): the
 * page opened /local at 11:26:11; /auth/me went out at 11:26:13.564 and
 * /theme/active at 11:26:13.710, both answered 404; social_bp registered at
 * 11:26:14.18.  On the 10-19 boot the same window was ~10 s.  With a signed-in
 * page, three background reads hit social_bp at mount: /auth/me
 * (SocialContext.fetchProfile), /notifications?unread=true&limit=1
 * (SocialContext.fetchUnread) and /notifications?unread=true&limit=10
 * (NotificationBell, mounted on the chat page).  Each handles its own
 * failure; a single unsilenced 404 shows "Couldn't find what you asked for."
 *
 * This mounts the real SocialProvider and NotificationBell over the real
 * axiosFactory interceptor, with axios's network replaced by an adapter that
 * answers 404 for the social_bp paths, and counts the banner events.
 */
import {render, act} from '@testing-library/react';
import axios from 'axios';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => jest.fn()), off: jest.fn()},
}));

const BANNER = 'hevolve:api-error';
const LATE_ROUTES = ['/api/social/auth/me', '/api/social/notifications', '/api/social/theme/active'];

let lateStatus = 404;
let requested = [];

function fakeNetwork(config) {
  const url = (config.baseURL || '') + (config.url || '');
  requested.push(url);
  const late = LATE_ROUTES.some((p) => url.endsWith(p));
  const status = late ? lateStatus : 200;
  const response = {status, statusText: String(status), data: late ? {error: 'API endpoint not found'} : {}, headers: {}, config};
  if (status < 300) return Promise.resolve(response);
  const err = new Error(`Request failed with status code ${status}`);
  err.config = config;
  err.response = response;
  return Promise.reject(err);
}

// createApiClient copies axios.defaults when a client is made, so the fake
// network goes in before any module that creates one is loaded.
axios.defaults.adapter = fakeNetwork;
const {SocialProvider} = require('../../contexts/SocialContext');
const NotificationBell = require('../../components/Common/NotificationBell').default;

function fakeJwt() {
  const payload = btoa(JSON.stringify({user_id: '10202', username: 'owner', role: 'flat',
    exp: Math.floor(Date.now() / 1000) + 3600}));
  return `e30.${payload}.sig`;
}

let banners;
const onBanner = (ev) => banners.push(ev.detail);

beforeEach(() => {
  banners = [];
  requested = [];
  localStorage.clear();
  localStorage.setItem('access_token', fakeJwt());
  window.addEventListener(BANNER, onBanner);
});

afterEach(() => {
  window.removeEventListener(BANNER, onBanner);
});

async function openChatPage() {
  let view;
  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={['/local']}>
        <SocialProvider>
          <NotificationBell />
        </SocialProvider>
      </MemoryRouter>
    );
  });
  // let every mount-time read settle
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
  view.unmount();
}

test('the reads are really made against the late routes (not a vacuous pass)', async () => {
  lateStatus = 404;
  await openChatPage();
  expect(requested.filter((u) => u.endsWith('/api/social/auth/me')).length).toBeGreaterThanOrEqual(1);
  expect(requested.filter((u) => u.endsWith('/api/social/notifications')).length).toBeGreaterThanOrEqual(2);
});

test('a boot 404 on the late social routes raises no banner', async () => {
  lateStatus = 404;
  await openChatPage();
  expect(banners.filter((b) => b.status === 404)).toEqual([]);
});

test('a 500 on the same reads still raises the banner', async () => {
  lateStatus = 500;
  await openChatPage();
  expect(banners.filter((b) => b.status === 500).length).toBeGreaterThanOrEqual(1);
});
