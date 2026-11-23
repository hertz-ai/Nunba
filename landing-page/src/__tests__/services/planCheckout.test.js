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
  fetchPlans,
  seatsLabel,
} from '../../services/planCheckout';

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
    expect(refused.message).toMatch(/different account|not the account/i);
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

describe('startCheckout: a stalled server', () => {
  test('both calls carry a timeout, so a server that never answers cannot hold the buttons for ever', async () => {
    signIn();
    await startCheckout({plan: PAID});
    const timeouts = [
      postsTo('/addsubscription_by_phone')[0][2].timeout,
      postsTo('/makepayment')[0][2].timeout,
    ];
    for (const t of timeouts) {
      expect(typeof t).toBe('number');
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(30000);
    }
  });

  test.each([
    ['the row', 'sub'],
    ['the payment', 'pay'],
  ])(
    'a timeout while asking for %s says the server took too long and that nothing was charged',
    async (_what, leg) => {
      signIn();
      const stalled = Object.assign(new Error('timeout of 15000ms exceeded'), {
        code: 'ECONNABORTED',
      });
      routeAxios({[leg]: () => Promise.reject(stalled)});
      const outcome = await startCheckout({plan: PAID});
      expect(outcome.status).toBe('error');
      expect(outcome.message).toMatch(/too long/i);
      expect(outcome.message).toMatch(/nothing was charged/i);
    }
  );
});

describe('startCheckout: a refusal is worded for the buyer', () => {
  // The server's own refusal text names its API (plan_id, quantity,
  // /addsubscription_by_phone).  Each real text of account store c1eeb2131 that a
  // buyer can reach is turned into words about the buyer's situation.
  test.each([
    [
      'sub',
      400,
      'The amount sent (199) is not the price of this plan: 249 for quantity 1. Reload the plan list and send quantity.',
      /price of this plan changed/i,
    ],
    [
      'sub',
      403,
      'This access token does not belong to the account with that phone number. A subscription can only be added for the signed-in user.',
      /different account|not the account/i,
    ],
    [
      'pay',
      400,
      'No pending subscription for this transaction, user and plan. Create it first with POST /addsubscription_by_phone (signed in) using the same transaction_id, plan_id and phone number, then call makepayment.',
      /could not start this order/i,
    ],
    [
      'sub',
      400,
      'The mobile number must be at least 10 characters (with country code if it has one); sign in again so the app can send it.',
      /phone number.*sign in again/i,
    ],
    [
      'pay',
      400,
      'No account has that mobile number. Sign up first, then pay.',
      /could not find one account/i,
    ],
    [
      'sub',
      400,
      'No active plan with plan_id 7. Pick a plan_id from GET /getallplandetails.',
      /not available any more/i,
    ],
    ['pay', 400, 'quantity must be between 1 and 1000.', /between 1 and 1000/i],
  ])('%s %i: %s', async (leg, status, detail, expected) => {
    signIn();
    routeAxios({[leg]: () => Promise.reject(httpError(status, detail))});
    const outcome = await startCheckout({plan: PAID});
    expect(outcome.status).toBe('error');
    expect(outcome.message).toMatch(expected);
    expect(outcome.message).not.toMatch(
      /plan_id|quantity|num_students|transaction_id|makepayment|addsubscription|\bPOST\b|\bGET\b/
    );
  });

  test("a refusal that is not one of those keeps the server's own words", async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(httpError(400, 'Something the server worded itself.')),
    });
    expect((await startCheckout({plan: PAID})).message).toBe(
      'Something the server worded itself.'
    );
  });
});

describe('fetchPlans: the plan list, or one plan by id', () => {
  const {mailerApi} = require('../../services/socialApi');

  test('without an id it asks for the public list', async () => {
    mailerApi.getPlans.mockResolvedValueOnce([PAID]);
    expect(await fetchPlans()).toEqual([PAID]);
    expect(mailerApi.getPlans).toHaveBeenCalledWith(undefined);
  });

  test('with an id it sends plan_id, the only way to reach a plan the public list leaves out', async () => {
    mailerApi.getPlans.mockResolvedValueOnce([BUSINESS]);
    await fetchPlans(22);
    expect(mailerApi.getPlans).toHaveBeenCalledWith({plan_id: 22});
  });

  test('a failure is an error the caller can show or ignore', async () => {
    mailerApi.getPlans.mockRejectedValueOnce(new Error('503'));
    await expect(fetchPlans()).rejects.toThrow(/503/);
  });
});

describe('seatsLabel: what the card says under the price', () => {
  test('a single person, nobody, or an unknown count all read "per user"', () => {
    for (const seats of [null, undefined, 0, 1]) {
      expect(seatsLabel(seats)).toBe('per month / per user');
    }
  });
  test('several seats read "for N users"', () => {
    expect(seatsLabel(3)).toBe('per month / for 3 users');
  });
});
