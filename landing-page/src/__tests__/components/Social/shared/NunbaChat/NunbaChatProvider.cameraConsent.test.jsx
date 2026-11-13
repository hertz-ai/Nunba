/**
 * The chat panel streams the camera while the owner's camera consent is on
 * file in HARTOS -- one yes is the only gate, and it survives a restart.
 *
 * Owner, 2026-11-09: "consent ask shd be the only gate and when consented it
 * shd work without any additional asks for vision captioning etc".  Before,
 * NunbaChatProvider kept the yes in sessionStorage: forgotten at the next
 * launch, while HARTOS (holding the granted row) never asked again, so the
 * camera stayed off for good.
 *
 * Real provider, real socialApi + axiosFactory; only axios's transport is
 * replaced (an adapter that records each request, as in
 * services/dashboardSteerSendsToken.test.jsx) and the camera hook is a
 * recorder, so what is asserted is what the provider asks the camera to do.
 */
const mockSent = [];
let mockConsents = [];
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const real = actual.default || actual;
  const adapter = (config) => {
    mockSent.push(config);
    const isConsent = config.method === 'get' && (config.url || '').endsWith('/consent');
    const data = isConsent
      ? {success: true, data: {consents: mockConsents, count: mockConsents.length}}
      : {success: true, data: {}};
    return Promise.resolve({data, status: 200, statusText: '200', headers: {}, config});
  };
  const create = (cfg) => real.create({...cfg, adapter});
  const wrapped = Object.assign(real.create({adapter}), {
    create, isAxiosError: real.isAxiosError, CancelToken: real.CancelToken,
    isCancel: real.isCancel,
  });
  return {__esModule: true, ...actual, default: wrapped, create};
});

let mockStream = null;
jest.mock('../../../../../hooks/useCameraFrameStream', () => ({
  __esModule: true,
  default: (opts) => { mockStream = opts; },
}));
jest.mock('../../../../../hooks/useComputerActivity', () => ({
  __esModule: true,
  default: () => ({activity: null, liveRun: null}),
}));
jest.mock('../../../../../contexts/SocialContext', () => ({
  __esModule: true,
  useSocial: () => ({currentUser: {id: '10202'}}),
  default: {},
}));
jest.mock('../../../../../hooks/useAuthSession', () => ({
  __esModule: true,
  default: () => ({_raw: {}}),
  clearAccessTokenForExpiry: () => {},
}));
let mockUuidN = 0;
jest.mock('uuid', () => ({v4: () => `uuid-${++mockUuidN}`}));
jest.mock('../../../../../hooks/useTTS', () => ({
  __esModule: true,
  useTTS: () => ({speak: () => {}, stop: () => {}}),
  default: () => ({speak: () => {}, stop: () => {}}),
}));
// The realtime stream keeps its handlers, so a test can announce what HARTOS
// announces (consent.granted / consent.revoked).
const mockHandlers = {};
jest.mock('../../../../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (evt, cb) => {
      (mockHandlers[evt] = mockHandlers[evt] || []).push(cb);
      return () => {
        mockHandlers[evt] = (mockHandlers[evt] || []).filter((f) => f !== cb);
      };
    },
    off: () => {},
  },
  subscribeChatNew: () => () => {},
}));

// eslint-disable-next-line import/first
import NunbaChatProvider from '../../../../../components/Social/shared/NunbaChat/NunbaChatProvider';
// eslint-disable-next-line import/first
import {NUNBA_CAMERA_CONSENT} from '../../../../../constants/events';
// eslint-disable-next-line import/first
import {apiCache} from '../../../../../services/apiCache';

// eslint-disable-next-line import/first
import {act, render, waitFor} from '@testing-library/react';
// eslint-disable-next-line import/first
import React from 'react';

jest.setTimeout(30000);

beforeEach(() => {
  mockSent.length = 0;
  mockConsents = [];
  mockStream = null;
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k]);
  // Each test starts from a fresh page: no GET kept from an earlier test.
  apiCache.clearAll();
  localStorage.clear();
  sessionStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve({}),
  }));
});

const consentReads = () => mockSent.filter(
  (c) => c.method === 'get' && (c.url || '').endsWith('/consent'));

test('a camera consent on file streams the camera from the first mount', async () => {
  localStorage.setItem('access_token', 'owner-token');
  mockConsents = [{consent_type: 'camera_capture', scope: '*', granted: true, revoked_at: null}];
  render(<NunbaChatProvider><div /></NunbaChatProvider>);
  await waitFor(() => expect(mockStream && mockStream.enabled).toBe(true));
  expect(mockStream.userId).toBe('10202');
  expect(mockStream.channel).toBe('camera');
  expect(consentReads()[0].params).toEqual(
    {consent_type: 'camera_capture', active_only: 'true'});
});

test('no consent on file: no camera, whatever an old session flag says', async () => {
  localStorage.setItem('access_token', 'owner-token');
  // The flag the provider used to trust: a yes from an earlier session in
  // this window, which no consent row backs any more.
  sessionStorage.setItem('nunba_camera_consent', 'true');
  render(<NunbaChatProvider><div /></NunbaChatProvider>);
  await waitFor(() => expect(consentReads().length).toBeGreaterThan(0));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  expect(mockStream.enabled).toBe(false);
});

test('Allow on the card keeps the camera on when HARTOS then announces the grant', async () => {
  // The page's API client keeps every GET for 60 s and nothing clears the
  // consent list on a grant.  The mount read ("no consent") was such a GET,
  // so the re-read the grant announcement triggers would be answered with
  // that "no" and turn the camera straight back off.
  localStorage.setItem('access_token', 'owner-token');
  render(<NunbaChatProvider><div /></NunbaChatProvider>);
  await waitFor(() => expect(consentReads().length).toBe(1));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  expect(mockStream.enabled).toBe(false);

  mockConsents = [{consent_type: 'camera_capture', scope: '*', granted: true, revoked_at: null}];
  await act(async () => {
    window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {detail: {approved: true}}));
  });
  expect(mockStream.enabled).toBe(true);
  await act(async () => {
    (mockHandlers['consent.granted'] || []).forEach(
      (cb) => cb({consent_type: 'camera_capture'}));
  });
  // HARTOS itself is asked again, not the copy from the mount read.
  await waitFor(() => expect(consentReads().length).toBe(2));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  expect(mockStream.enabled).toBe(true);
});
