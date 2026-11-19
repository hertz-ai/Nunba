/**
 * socialApiOneCheckout.test.js
 *
 * The checkout is services/planCheckout.js: the subscription row first (bearer
 * token), then the payment at the server's price.  mailerApi used to carry a
 * second way in, addSubscription and makePayment, with no order and no header
 * contract.  Nothing calls them (grepped across hevolve web, this landing page,
 * the React Native, iOS and HARTOS repos) and anyone who started to would get the
 * parallel, browser-priced flow the account store now refuses.
 *
 * What stays, and is pinned here: the plan list, which can be asked for one plan
 * by id (GET /getallplandetails?plan_id=<id>): the only way to reach a speech plan,
 * which the account store keeps off the public list.
 *
 * Boundary mocked, as in socialApi.test.js: axiosFactory's client.
 */
const mockAxiosInstance = {
  get: jest.fn(() => Promise.resolve([])),
  post: jest.fn(() => Promise.resolve({})),
  patch: jest.fn(() => Promise.resolve({})),
  put: jest.fn(() => Promise.resolve({})),
  delete: jest.fn(() => Promise.resolve({})),
};

jest.mock('../../services/axiosFactory', () => ({
  createApiClient: jest.fn(() => mockAxiosInstance),
}));

const {mailerApi} = require('../../services/socialApi');

beforeEach(() => jest.clearAllMocks());

describe('mailerApi: one way to check out, and it is not here', () => {
  test('there is no second entry point for the subscription row or the payment', () => {
    expect(mailerApi.addSubscription).toBeUndefined();
    expect(mailerApi.makePayment).toBeUndefined();
  });

  test('the other mailer calls are still there', () => {
    expect(typeof mailerApi.verifyOtp).toBe('function');
    expect(typeof mailerApi.renewToken).toBe('function');
    expect(typeof mailerApi.deductCredits).toBe('function');
  });
});

describe('mailerApi.getPlans: the plan list, or one plan by id', () => {
  test('without an id it asks for the public list', async () => {
    await mailerApi.getPlans();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getallplandetails', {
      params: undefined,
    });
  });

  test('with params it sends them, so ?plan_id=<id> reaches a plan the public list leaves out', async () => {
    await mailerApi.getPlans({plan_id: 22});
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getallplandetails', {
      params: {plan_id: 22},
    });
  });
});
