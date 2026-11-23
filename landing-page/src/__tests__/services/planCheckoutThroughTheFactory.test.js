/**
 * The checkout's two writes go through axiosFactory's client, and lose nothing
 * they had as plain axios calls.
 *
 * planCheckout.test.js pins the order, the bodies, the token on the
 * subscription call (and its absence on the payment call), the timeout and the
 * wording of every refusal.  This file pins what a move onto the shared client
 * could silently change, each checked at the wire with the real factory:
 *   - a 401 sends the person to sign in and leaves the session alone (the
 *     shared client's default clears the token and tells the page it expired);
 *   - no failure raises the page's error banner (the checkout words it);
 *   - a refusal with no JSON body still says its status;
 *   - the writes do not touch the read cache.
 */
import axios from 'axios';
import {
  SESSION,
  signIn,
  httpError,
  routeAxios,
  postsTo,
  leaveApp,
} from '../../testSupport/checkoutKit';
import {startCheckout} from '../../services/planCheckout';
import {apiCache} from '../../services/apiCache';

jest.mock('axios', () =>
  jest.requireActual('../../testSupport/axiosWire').wireAxios()
);
jest.mock('../../services/socialApi', () => ({
  mailerApi: {getPlans: jest.fn()},
  chatApi: {post: jest.fn(() => Promise.resolve({}))},
}));
jest.mock('uuid', () => ({v4: () => '11111111-2222-3333-4444-555555555555'}));
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);

const PAID = {plan_id: 1, title: 'Hevolve+', price: 199, days: 30};

const stalled = () =>
  Object.assign(new Error('timeout of 15000ms exceeded'), {
    code: 'ECONNABORTED',
  });
const bodyless = (status, data) =>
  Object.assign(new Error(`HTTP ${status}`), {response: {status, data}});

let expired;
let banners;
const onExpired = () => expired.push('auth:expired');
const onBanner = (event) => banners.push(event.detail);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  routeAxios();
  expired = [];
  banners = [];
  window.addEventListener('auth:expired', onExpired);
  window.addEventListener('hevolve:api-error', onBanner);
});
afterEach(() => {
  window.removeEventListener('auth:expired', onExpired);
  window.removeEventListener('hevolve:api-error', onBanner);
  leaveApp();
});

describe('the checkout on the shared client', () => {
  test('both writes are sent by a client that keeps the HTTP status of a refusal', async () => {
    signIn();
    await startCheckout({plan: PAID});
    expect(postsTo('/addsubscription_by_phone')[0][2].keepStatus).toBe(true);
    expect(postsTo('/makepayment')[0][2].keepStatus).toBe(true);
  });

  test('a 401 on the row asks for a sign-in and leaves the session as it was', async () => {
    signIn();
    routeAxios({
      sub: () => Promise.reject(httpError(401, 'Invalid or expired token.')),
    });
    const outcome = await startCheckout({plan: PAID});
    expect(outcome).toEqual({
      status: 'sign_in',
      message: 'Invalid or expired token.',
    });
    expect(localStorage.getItem('access_token')).toBe(SESSION.token);
    expect(expired).toEqual([]);
    expect(postsTo('/makepayment')).toHaveLength(0);
  });

  test('a 401 with no body on the row is still a sign-in, and says the status', async () => {
    signIn();
    routeAxios({sub: () => Promise.reject(bodyless(401, ''))});
    const outcome = await startCheckout({plan: PAID});
    expect(outcome.status).toBe('sign_in');
    expect(outcome.message).toMatch(/\(401\)/);
    expect(localStorage.getItem('access_token')).toBe(SESSION.token);
  });

  test('a 401 on the payment is an error, not a sign-out', async () => {
    signIn();
    routeAxios({pay: () => Promise.reject(httpError(401, 'Not for you.'))});
    const outcome = await startCheckout({plan: PAID});
    expect(outcome).toEqual({status: 'error', message: 'Not for you.'});
    expect(localStorage.getItem('access_token')).toBe(SESSION.token);
    expect(expired).toEqual([]);
  });

  test('a server error page (HTML, not JSON) on the row says its status', async () => {
    signIn();
    routeAxios({
      sub: () => Promise.reject(bodyless(502, '<html>Bad Gateway</html>')),
    });
    const outcome = await startCheckout({plan: PAID});
    expect(outcome.status).toBe('error');
    expect(outcome.message).toMatch(/\(502\)/);
  });

  test.each([
    ['sub', 'a 401', () => httpError(401, 'Invalid or expired token.')],
    ['sub', 'a 400', () => httpError(400, 'No active plan with plan_id 1.')],
    ['sub', 'a timeout', stalled],
    ['sub', 'no network', () => new Error('Network Error')],
    ['pay', 'a 401', () => httpError(401, 'Not for you.')],
    ['pay', 'a 400', () => httpError(400, '5 is not the price of this plan')],
    ['pay', 'a 500', () => httpError(500, 'boom')],
    ['pay', 'a timeout', stalled],
    ['pay', 'no network', () => new Error('Network Error')],
  ])(
    'on %s, %s raises no error banner: the checkout says it itself',
    async (leg, _what, failure) => {
      signIn();
      routeAxios({[leg]: () => Promise.reject(failure())});
      const outcome = await startCheckout({plan: PAID});
      expect(['error', 'sign_in']).toContain(outcome.status);
      expect(outcome.message).toBeTruthy();
      expect(banners).toEqual([]);
    }
  );

  test('the two writes leave the read cache alone', async () => {
    const invalidate = jest.spyOn(apiCache, 'invalidateOnMutation');
    signIn();
    expect((await startCheckout({plan: PAID})).status).toBe('redirect');
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();
    invalidate.mockRestore();
  });
});
