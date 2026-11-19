/* eslint-disable no-script-url -- the javascript: URLs are the attack input these tests prove is refused */
import {
  SESSION,
  signIn,
  signInAsGuest,
  enc,
} from '../../testSupport/checkoutKit';
import {
  hasCloudSession,
  readPayer,
  safeReturnPath,
  checkoutReturnPath,
} from '../../utils/checkoutSession';

jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
jest.mock('../../services/socialApi', () => ({
  chatApi: {post: jest.fn(() => Promise.resolve({}))},
}));

beforeEach(() => {
  localStorage.clear();
  delete window.Handy;
});

describe('readPayer: who is signed in', () => {
  test('a cloud sign-in with its phone makes a payer, with the Kong bearer', () => {
    signIn();
    expect(hasCloudSession()).toBe(true);
    expect(readPayer()).toEqual({
      accessToken: SESSION.token,
      phone: SESSION.phone,
    });
  });

  test('no token: nobody is signed in, even with a phone left behind', () => {
    localStorage.setItem('phone_number', enc(SESSION.phone));
    expect(hasCloudSession()).toBe(false);
    expect(readPayer()).toBeNull();
  });

  test('a cloud sign-in from before the phone was kept (token and user, no phone) is not a payer', () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', enc('42'));
    expect(hasCloudSession()).toBe(true);
    expect(readPayer()).toBeNull();
  });

  test('a guest token is not a payer, even with a phone left behind', () => {
    signInAsGuest();
    expect(hasCloudSession()).toBe(false);
    expect(readPayer()).toBeNull();
  });

  test('inside the app the phone comes from the app, the token from the cloud sign-in', () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', enc('42'));
    window.Handy = {
      getUserDetails: () => JSON.stringify({phone_number: '9000000002'}),
    };
    expect(readPayer()).toEqual({
      accessToken: SESSION.token,
      phone: '9000000002',
    });
  });

  test('an app that answers with junk or throws falls back to the stored phone', () => {
    signIn();
    window.Handy = {getUserDetails: () => 'not json'};
    expect(readPayer().phone).toBe(SESSION.phone);
    window.Handy = {
      getUserDetails: () => {
        throw new Error('bridge down');
      },
    };
    expect(readPayer().phone).toBe(SESSION.phone);
  });
});

describe('safeReturnPath: only a page of this site', () => {
  test.each([
    ['/Plan'],
    ['/Plan?plan=5'],
    ['/Plan?plan=21&num_students=3'],
    ['/speechtherapy?plan=6'],
  ])('%s is accepted unchanged', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  test.each([
    [undefined],
    [null],
    [''],
    [42],
    ['Plan'],
    ['https://evil.example/x'],
    ['//evil.example/x'],
    ['/\\evil.example'],
    ['javascript:alert(1)'],
    ['/Plan\nX: y'],
    ['/Plan\u007f'],
    [`/${'a'.repeat(400)}`],
  ])('%j is refused', (path) => {
    expect(safeReturnPath(path)).toBeNull();
  });
});

describe('the way back to a plan', () => {
  test('is the plan page of this site, /Plan (the /pricing route here is the commercial API table)', () => {
    expect(checkoutReturnPath(5)).toBe('/Plan?plan=5');
  });

  test('carries a student count only when there is one, and safeReturnPath accepts it', () => {
    expect(checkoutReturnPath(5, null)).toBe('/Plan?plan=5');
    expect(checkoutReturnPath(21, 3)).toBe('/Plan?plan=21&num_students=3');
    expect(safeReturnPath(checkoutReturnPath(21, 3))).toBe(
      '/Plan?plan=21&num_students=3'
    );
  });
});
