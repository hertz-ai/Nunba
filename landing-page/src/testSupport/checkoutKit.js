/**
 * Fixtures and boundary stubs shared by the checkout tests (Plan, trial plan,
 * speech therapy, planCheckout, checkoutSession).  Not under __tests__, so jest
 * does not collect it as a suite.
 *
 * Plan rows are in the shape GET /getallplandetails returns.  The first six are
 * the live plan list as it was read on 2026-11-18 (id, title, price, days,
 * type).  The last two are NOT live yet and their ids are invented:
 * 'Speech therapy pilot, 14 days' is what the account store's migration
 * 0eba2ac3f05c seeds (Rs 0, 14 days, business), and 'Hevolve Business' is the
 * title the plan page filters its business mode on.
 *
 * `axios` is imported here but mocked by each suite's own jest.mock('axios'),
 * so the helpers drive the suite's mock.  The encryption mock every suite uses
 * writes 'ENC:' + value, which `enc` reproduces.
 */
import axios from 'axios';

const row = (plan_id, title, price, days, type = 'individual') => ({
  plan_id,
  title,
  price,
  days,
  type,
  description: `${title} description`,
  features: [{name: `${title} feature`, access: true}],
});

export const PLANS = [
  row(4, 'Free', 0, 30),
  row(5, 'Hevolve Basic', 29, 14),
  row(1, 'Hevolve+', 199, 30),
  row(6, 'Hevolve++', 299, 30),
  row(2, 'Hevolve+ Pro', 699, 30),
  {...row(7, 'Custom Credits', 1000, 365), features: []},
  row(20, 'Speech therapy pilot, 14 days', 0, 14, 'business'),
  row(21, 'Hevolve Business', 500, 30, 'business'),
];

export const SESSION = {token: 'tok-test-123', phone: '9000000001'};

// What the suites' mocked utils/encryption writes.
export const enc = (value) => `ENC:${value}`;
export const encryptionMock = {
  __esModule: true,
  encrypt: (v) => (v == null ? null : enc(v)),
  decrypt: (v) =>
    typeof v === 'string' && v.startsWith('ENC:') ? v.slice(4) : null,
};

// What uuid is mocked to ('11111111-2222-3333-4444-555555555555') becomes:
export const TX = 'T11111111222233334444555555555555';
export const PAY_URL = 'https://pay.example/phonepe/abc';
export const PAGE_URL = 'http://localhost/Plan';

/** A cloud sign-in as setAuthFromOtp leaves it, phone included. */
export const signIn = () => {
  localStorage.setItem('access_token', SESSION.token);
  localStorage.setItem('user_id', enc('42'));
  localStorage.setItem('phone_number', enc(SESSION.phone));
};

/** A guest: an access_token that is a HARTOS JWT, not a Kong token. */
export const signInAsGuest = () => {
  localStorage.setItem('access_token', 'guest-jwt');
  localStorage.setItem('guest_mode', 'true');
  localStorage.setItem('guest_user_id', 'guest-1');
  localStorage.setItem('phone_number', enc(SESSION.phone));
};

export const httpError = (status, detail) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: {status, data: {detail}},
  });

/** Route axios.post by URL; either leg can be replaced per test. */
export function routeAxios({sub, pay} = {}) {
  axios.post.mockImplementation((url, body, cfg) => {
    if (url.includes('/addsubscription_by_phone')) {
      return sub
        ? sub(body, cfg)
        : Promise.resolve({status: 200, data: {user_id: 1}});
    }
    if (url.includes('/makepayment')) {
      return pay
        ? pay(body, cfg)
        : Promise.resolve({status: 200, data: PAY_URL});
    }
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
}

export const postsTo = (part) =>
  axios.post.mock.calls.filter(([url]) => url.includes(part));

/**
 * Replace window.location (where the person is sent to pay) with a plain
 * object so the test can read the URL that was assigned.  Returns the restore.
 */
export function stubLocation(href = PAGE_URL, pathname = '/Plan', search = '') {
  const real = window.location;
  delete window.location;
  window.location = {href, pathname, search, assign: jest.fn()};
  return () => {
    window.location = real;
  };
}

/** Pretend to be the Android webview: user agent plus the Handy bridge. */
export function asApp(details, userAgent = 'Mozilla/5.0 hevolvedroid') {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });
  window.Handy = {
    getUserDetails: jest.fn(() => JSON.stringify(details)),
    setTransactionId: jest.fn(),
  };
}

export function leaveApp() {
  delete window.Handy;
  delete window.navigator.userAgent;
}
