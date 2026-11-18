/* eslint-disable no-script-url -- the javascript: URLs are the attack input these tests prove is refused */
import axios from 'axios';
import {
  SESSION,
  TX,
  PAY_URL,
  signIn,
  httpError,
  routeAxios,
  postsTo,
  asApp,
  leaveApp,
} from '../../testSupport/checkoutKit';
import {
  startCheckout,
  planIsFreeTrial,
  isBusinessPlan,
  parsePositiveInt,
  seatsFor,
  totalFor,
  FREE_TRIAL_NOTE,
} from '../../services/planCheckout';

jest.mock('axios', () => ({post: jest.fn(), get: jest.fn()}));
jest.mock('../../services/socialApi', () => ({
  chatApi: {post: jest.fn(() => Promise.resolve({}))},
}));
jest.mock('uuid', () => ({v4: () => '11111111-2222-3333-4444-555555555555'}));
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);

const PAID = {
  plan_id: 1,
  title: 'Hevolve+',
  price: 199,
  days: 30,
  type: 'individual',
};
const BUSINESS = {
  plan_id: 21,
  title: 'Hevolve Business',
  price: 500,
  days: 30,
  type: 'business',
};
const FREE = {
  plan_id: 4,
  title: 'Free',
  price: 0,
  days: 30,
  type: 'individual',
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  routeAxios();
});
afterEach(() => leaveApp());

describe('startCheckout', () => {
  test('creates the row with the bearer token, then pays, then says where to go', async () => {
    signIn();
    const outcome = await startCheckout({plan: PAID});

    expect(outcome).toEqual({
      status: 'redirect',
      url: PAY_URL,
      transactionId: TX,
    });
    const urls = axios.post.mock.calls.map(([url]) => url);
    expect(urls[0]).toContain('/addsubscription_by_phone');
    expect(urls[1]).toContain('/makepayment');
    expect(
      postsTo('/addsubscription_by_phone')[0][2].headers.Authorization
    ).toBe(`Bearer ${SESSION.token}`);
  });

  test('the payment call does not carry the bearer token: the contract asks for it only on the subscription call', async () => {
    signIn();
    await startCheckout({plan: PAID});
    expect(postsTo('/makepayment')[0][2].headers.Authorization).toBeUndefined();
  });

  test('a free plan is granted, not bought: no call at all', async () => {
    signIn();
    expect(await startCheckout({plan: FREE})).toEqual({status: 'free'});
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('no session: sign in first, no call', async () => {
    expect(await startCheckout({plan: PAID})).toEqual({status: 'sign_in'});
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("a 401 on the row is a sign-in, a 403 (someone else's account) is an error that says so", async () => {
    signIn();
    routeAxios({
      sub: () => Promise.reject(httpError(401, 'Invalid or expired token.')),
    });
    expect((await startCheckout({plan: PAID})).status).toBe('sign_in');

    routeAxios({
      sub: () =>
        Promise.reject(
          httpError(
            403,
            'This access token does not belong to the account with that phone number.'
          )
        ),
    });
    const refused = await startCheckout({plan: PAID});
    expect(refused.status).toBe('error');
    expect(refused.message).toMatch(/does not belong/);
    expect(postsTo('/makepayment')).toHaveLength(0);
  });

  test('the shown amount defaults to price x students and can be overridden by what the page displayed', async () => {
    signIn();
    await startCheckout({plan: BUSINESS, numStudents: 3});
    expect(postsTo('/makepayment')[0][1]).toMatchObject({
      num_students: 3,
      amount: 1500,
    });

    axios.post.mockClear();
    await startCheckout({plan: BUSINESS, numStudents: 3, shownAmount: 1400});
    expect(postsTo('/makepayment')[0][1].amount).toBe(1400);
  });

  test('no student count means the field is not sent at all', async () => {
    signIn();
    await startCheckout({plan: PAID});
    expect('num_students' in postsTo('/makepayment')[0][1]).toBe(false);
  });

  test('a payment answer that is not an https URL is not followed, and the app is not told about it', async () => {
    signIn();
    asApp({phone_number: '9000000002'});
    for (const bad of [
      'javascript:alert(1)',
      'http://pay.example/x',
      '',
      null,
      {url: PAY_URL},
    ]) {
      routeAxios({pay: () => Promise.resolve({status: 200, data: bad})});
      const outcome = await startCheckout({plan: PAID, notifyApp: true});
      expect(outcome.status).toBe('error');
      expect(outcome.message).toMatch(/Nothing was charged/);
    }
    expect(window.Handy.setTransactionId).not.toHaveBeenCalled();
  });

  test('the app is told the transaction only when payment is ready, and only when asked', async () => {
    signIn();
    asApp({phone_number: '9000000002'});
    await startCheckout({plan: PAID});
    expect(window.Handy.setTransactionId).not.toHaveBeenCalled();
    await startCheckout({plan: PAID, notifyApp: true});
    expect(window.Handy.setTransactionId).toHaveBeenCalledTimes(1);
  });

  test('a broken app bridge does not stop the payment', async () => {
    signIn();
    window.Handy = {
      getUserDetails: () => JSON.stringify({phone_number: '9000000002'}),
      setTransactionId: () => {
        throw new Error('bridge');
      },
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await startCheckout({plan: PAID, notifyApp: true})).status).toBe(
      'redirect'
    );
    spy.mockRestore();
  });

  test.each([
    [
      'no response at all',
      () => Promise.reject(new Error('Network Error')),
      /Could not reach the server/,
    ],
    [
      'a validation error whose detail is a list',
      () =>
        Promise.reject(
          Object.assign(new Error('x'), {
            response: {status: 422, data: {detail: [{msg: 'field required'}]}},
          })
        ),
      /\(422\)/,
    ],
    [
      'a server error with no body',
      () =>
        Promise.reject(
          Object.assign(new Error('x'), {response: {status: 500, data: ''}})
        ),
      /\(500\)/,
    ],
  ])(
    'a payment failure with %s gets a readable message',
    async (_label, pay, expected) => {
      signIn();
      routeAxios({pay});
      const outcome = await startCheckout({plan: PAID});
      expect(outcome.status).toBe('error');
      expect(outcome.message).toMatch(expected);
    }
  );
});

describe('plan helpers', () => {
  test('only a free plan of 14 days is a free trial', () => {
    expect(planIsFreeTrial({price: 0, days: 14})).toBe(true);
    expect(planIsFreeTrial({price: 0, days: 30})).toBe(false);
    expect(planIsFreeTrial({price: 29, days: 14})).toBe(false);
    expect(planIsFreeTrial(null)).toBe(false);
    expect(FREE_TRIAL_NOTE).toBe('No credit card required. Free 14-days trial');
  });

  test('a business plan is one the list types business, or titled Hevolve Business', () => {
    expect(
      isBusinessPlan({
        type: 'business',
        title: 'Speech therapy, per child per month',
      })
    ).toBe(true);
    expect(
      isBusinessPlan({type: 'individual', title: 'Hevolve Business'})
    ).toBe(true);
    expect(isBusinessPlan({type: 'individual', title: 'Hevolve+'})).toBe(false);
  });

  test.each([
    [3, 3],
    ['4', 4],
    [' 5 ', 5],
    [1, 1],
    [0, null],
    [-2, null],
    [1.5, null],
    ['abc', null],
    ['2.5', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('parsePositiveInt(%j) is %j', (input, expected) => {
    expect(parsePositiveInt(input)).toBe(expected);
  });

  test('students multiply a business plan only, and default to one', () => {
    expect(seatsFor(BUSINESS, 3)).toBe(3);
    expect(seatsFor(BUSINESS, null)).toBe(1);
    expect(seatsFor(PAID, 3)).toBeNull();
    expect(totalFor(BUSINESS, 3)).toBe(1500);
    expect(totalFor(PAID, null)).toBe(199);
  });
});
