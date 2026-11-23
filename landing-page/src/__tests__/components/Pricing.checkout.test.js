/* eslint-disable react/display-name -- jest.mock factories return anonymous stand-in components */
import {
  SESSION,
  TX,
  PAY_URL,
  signIn,
  signInAsGuest,
  httpError,
  routeAxios,
  postsTo,
  stubLocation,
  asApp,
  leaveApp,
  planServer,
} from '../../testSupport/checkoutKit';
import Pricing from '../../components/Pricing';

import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  act,
} from '@testing-library/react';
import axios from 'axios';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

// Boundary mocks only: the network (axios for the two writes, mailerApi for the
// plan list), the router's navigate, window.location (where the person is sent
// to pay), the Android bridge, the sign-in modal (it has its own suite) and the
// helpers that need a browser or a secret.  The component and everything it
// imports from this repo run for real.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('axios', () =>
  jest.requireActual('../../testSupport/axiosWire').wireAxios()
);
jest.mock('uuid', () => ({v4: () => '11111111-2222-3333-4444-555555555555'}));
jest.mock('react-ga', () => ({event: jest.fn()}));
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
// The plan list is mailerApi.getPlans, answered by the account store model in
// the kit (planServer): speech plans only by ?plan_id=.  The checkout's two
// writes do not go through mailerApi (they need the HTTP status), so only
// getPlans is here.
jest.mock('../../services/socialApi', () => ({
  mailerApi: {getPlans: jest.fn()},
  chatApi: {post: jest.fn(() => Promise.resolve({}))},
}));
let mockModalProps = null;
jest.mock('../../pages/OtpAuthModal', () => (props) => {
  mockModalProps = props;
  return <div data-testid="signin-modal" />;
});

const {mailerApi} = require('../../services/socialApi');

async function renderPlan(entry = '/Plan') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Pricing />
    </MemoryRouter>
  );
  await screen.findByText('Hevolve+ Pro');
}
const cardOf = (title) => screen.getByText(title).closest('.relative');
const buttonOf = (title) => within(cardOf(title)).getByRole('button');

let restoreLocation;
let server;
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockModalProps = null;
  server = planServer();
  mailerApi.getPlans.mockImplementation(server.getPlans);
  routeAxios();
  restoreLocation = stubLocation();
  Element.prototype.scrollIntoView = jest.fn();
});
afterEach(() => {
  restoreLocation();
  leaveApp();
});

describe('Plan page checkout: who is paying and in what order', () => {
  test('a signed-in visit sends the bearer token and the session phone, not an empty phone (#206)', async () => {
    signIn();
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() =>
      expect(postsTo('/addsubscription_by_phone')).toHaveLength(1)
    );
    const [, body, cfg] = postsTo('/addsubscription_by_phone')[0];
    expect(cfg.headers.Authorization).toBe(`Bearer ${SESSION.token}`);
    expect(body).toEqual({
      phone_number: SESSION.phone,
      plan_id: 1,
      transaction_id: TX,
    });
  });

  test('the payment is requested only after the subscription row exists', async () => {
    signIn();
    let finishSubscription;
    routeAxios({
      sub: () =>
        new Promise((resolve) => {
          finishSubscription = () => resolve({status: 200, data: {}});
        }),
    });
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() =>
      expect(postsTo('/addsubscription_by_phone')).toHaveLength(1)
    );
    // The subscription call has not answered yet: nothing may be paid.
    expect(postsTo('/makepayment')).toHaveLength(0);

    await act(async () => {
      finishSubscription();
    });
    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(window.location.href).toBe(PAY_URL);
  });

  test('payment is not called when the subscription call fails, and the reason is shown', async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(
          httpError(
            400,
            'No active plan with plan_id 1. Pick a plan_id from GET /getallplandetails.'
          )
        ),
    });
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(
      await within(cardOf('Hevolve+')).findByRole('alert')
    ).toHaveTextContent(/not available any more/i);
    expect(postsTo('/makepayment')).toHaveLength(0);
    expect(window.location.href).toBe('http://localhost/Plan');
  });

  test('a refused payment (price changed) shows the server hint and does not redirect', async () => {
    signIn();
    routeAxios({
      pay: () =>
        Promise.reject(
          httpError(
            400,
            'The amount sent (199) is not the price of this plan: 249 for 1 student(s). Reload the plan list and send num_students.'
          )
        ),
    });
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(
      await within(cardOf('Hevolve+')).findByRole('alert')
    ).toHaveTextContent(/price of this plan changed/i);
    expect(window.location.href).toBe('http://localhost/Plan');
  });

  test('the payment body names the plan and the shown total as a check, with no student count for an individual plan', async () => {
    signIn();
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/makepayment')[0][1]).toEqual({
      mobile_number: SESSION.phone,
      plan_id: 1,
      transaction_id: TX,
      amount: 199,
    });
  });

  test('a business plan sends num_students, and the amount is only the total the page showed', async () => {
    signIn();
    render(
      <MemoryRouter
        initialEntries={[
          {pathname: '/Plan', state: {DataForPricePage: {num_of_students: 3}}},
        ]}
      >
        <Pricing />
      </MemoryRouter>
    );
    await screen.findByText('Hevolve Business');
    expect(screen.queryByText('Hevolve+')).not.toBeInTheDocument();
    fireEvent.click(buttonOf('Hevolve Business'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, body] = postsTo('/makepayment')[0];
    expect(body.num_students).toBe(3);
    expect(body.amount).toBe(1500);
    expect(body.plan_id).toBe(21);
  });

  test('a second click while the first is in flight does not create a second pending row', async () => {
    signIn();
    routeAxios({sub: () => new Promise(() => {})});
    await renderPlan();
    const button = buttonOf('Hevolve+');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(buttonOf('Hevolve+ Pro'));

    await waitFor(() =>
      expect(postsTo('/addsubscription_by_phone')).toHaveLength(1)
    );
    expect(postsTo('/addsubscription_by_phone')).toHaveLength(1);
  });
});

describe('Plan page checkout: not signed in', () => {
  test('no session: nothing is posted and the sign-in opens, to bring the person back to the chosen plan', async () => {
    await renderPlan();
    expect(screen.queryByTestId('signin-modal')).not.toBeInTheDocument();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(mockModalProps.isOpen).toBe(true);
    expect(mockModalProps.returnTo).toBe('/Plan?plan=1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('closing the sign-in leaves the page as it was', async () => {
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));
    await screen.findByTestId('signin-modal');
    act(() => mockModalProps.onClose());
    expect(screen.queryByTestId('signin-modal')).not.toBeInTheDocument();
  });

  test('a guest token is not a payer session', async () => {
    signInAsGuest();
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('a cloud sign-in from before the phone was kept is asked to sign in once more', async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('an expired token (401 on the subscription call) opens the sign-in and pays nothing', async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(
          httpError(
            401,
            'Invalid or expired token. Sign in again to get a new access_token.'
          )
        ),
    });
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(mockModalProps.returnTo).toBe('/Plan?plan=1');
    expect(postsTo('/makepayment')).toHaveLength(0);
  });

  test('the way back keeps the student count of a business plan', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {pathname: '/Plan', state: {DataForPricePage: {num_of_students: 3}}},
        ]}
      >
        <Pricing />
      </MemoryRouter>
    );
    await screen.findByText('Hevolve Business');
    fireEvent.click(buttonOf('Hevolve Business'));

    await screen.findByTestId('signin-modal');
    expect(mockModalProps.returnTo).toBe('/Plan?plan=21&num_students=3');
  });
});

describe('Plan page checkout: a free plan is granted, not bought', () => {
  test('a free plan makes no subscription and no payment call (makepayment refuses free plans)', async () => {
    signIn();
    await renderPlan();
    fireEvent.click(buttonOf('Free'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/agents/Hevolve')
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('a visitor with no session who picks a free plan is sent to register', async () => {
    await renderPlan();
    fireEvent.click(buttonOf('Free'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/signup'));
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('Plan page: the free-trial line is shown only where it is true', () => {
  test('a paid plan card never says there is no credit card or a free trial', async () => {
    await renderPlan();
    for (const title of ['Hevolve+', 'Hevolve+ Pro', 'Custom Credits']) {
      expect(
        within(cardOf(title)).queryByText(/no credit card required/i)
      ).not.toBeInTheDocument();
      expect(
        within(cardOf(title)).queryByText(/free 14-days trial/i)
      ).not.toBeInTheDocument();
    }
  });

  test('a free 30-day plan is not a 14-day trial', async () => {
    await renderPlan();
    expect(
      within(cardOf('Free')).queryByText(/free 14-days trial/i)
    ).not.toBeInTheDocument();
  });

  test('the free 14-day plan carries the line, and it is the only card that does', async () => {
    await renderPlan();
    expect(
      within(cardOf('Hevolve Trial')).getByText(
        'No credit card required. Free 14-days trial'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(/no credit card required/i)).toHaveLength(1);
  });
});

describe('Plan page: /Plan?plan=<plan_id> preselects a plan', () => {
  test('the named plan is marked selected and brought into view', async () => {
    await renderPlan('/Plan?plan=2');
    await waitFor(() =>
      expect(cardOf('Hevolve+ Pro')).toHaveAttribute('data-selected', 'true')
    );
    expect(cardOf('Hevolve+')).not.toHaveAttribute('data-selected', 'true');
    // Scrolling runs in an effect after the attribute commits, so wait for it,
    // and check it was the selected card that was brought into view.
    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    );
    expect(Element.prototype.scrollIntoView.mock.instances[0].id).toBe(
      'plan-card-2'
    );
  });

  test('a plan the public list hides is still shown when a link names it', async () => {
    await renderPlan('/Plan?plan=5');
    expect(screen.getByText('Hevolve Basic')).toBeInTheDocument();
    await waitFor(() =>
      expect(cardOf('Hevolve Basic')).toHaveAttribute('data-selected', 'true')
    );
  });

  test('without the parameter the hidden plan stays hidden and nothing is selected', async () => {
    await renderPlan('/Plan');
    expect(screen.queryByText('Hevolve Basic')).not.toBeInTheDocument();
    expect(document.querySelector('[data-selected="true"]')).toBeNull();
  });

  test('a plan id that is not in the list says so instead of silently ignoring the link', async () => {
    await renderPlan('/Plan?plan=999');
    expect(await screen.findByRole('status')).toHaveTextContent(/999/);
    expect(document.querySelector('[data-selected="true"]')).toBeNull();
  });

  test('a junk value is ignored', async () => {
    await renderPlan('/Plan?plan=abc');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('[data-selected="true"]')).toBeNull();
  });
});

describe('Plan page: /Plan?plan=<id> reaches a plan the server keeps off the public list', () => {
  test('a speech plan is fetched by plan_id, listed and marked selected', async () => {
    await renderPlan('/Plan?plan=22');
    expect(
      await screen.findByText('Speech therapy, per child per month')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(cardOf('Speech therapy, per child per month')).toHaveAttribute(
        'data-selected',
        'true'
      )
    );
    expect(server.calls).toContainEqual({plan_id: 22});
  });

  test('the plan it fetched can be bought: row first, then payment for the per-child price', async () => {
    signIn();
    await renderPlan('/Plan?plan=22');
    fireEvent.click(buttonOf('Speech therapy, per child per month'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/addsubscription_by_phone')[0][1].plan_id).toBe(22);
    expect(postsTo('/makepayment')[0][1]).toMatchObject({
      plan_id: 22,
      amount: 5000,
      num_students: 1,
    });
  });

  test('an id the server does not know is looked up and then reported as not available', async () => {
    await renderPlan('/Plan?plan=999');
    expect(await screen.findByRole('status')).toHaveTextContent(/999/);
    expect(server.calls).toContainEqual({plan_id: 999});
  });

  test('a plan the public list already has is not fetched a second time', async () => {
    await renderPlan('/Plan?plan=2');
    await waitFor(() =>
      expect(cardOf('Hevolve+ Pro')).toHaveAttribute('data-selected', 'true')
    );
    expect(server.calls.filter((c) => c && c.plan_id)).toHaveLength(0);
  });

  test('a page-hidden plan that the public list carries (price 29) is not fetched a second time either', async () => {
    await renderPlan('/Plan?plan=5');
    await waitFor(() =>
      expect(cardOf('Hevolve Basic')).toHaveAttribute('data-selected', 'true')
    );
    expect(server.calls.filter((c) => c && c.plan_id)).toHaveLength(0);
  });

  test('a server that ignores plan_id still works: the named plan is picked out of the full list', async () => {
    server = planServer({ignoresPlanId: true});
    mailerApi.getPlans.mockImplementation(server.getPlans);
    await renderPlan('/Plan?plan=22');
    await waitFor(() =>
      expect(cardOf('Speech therapy, per child per month')).toHaveAttribute(
        'data-selected',
        'true'
      )
    );
  });
});

describe('Plan page checkout: a stalled server', () => {
  test('a timeout tells the person so and gives the buttons back, with nothing paid', async () => {
    signIn();
    const stalled = Object.assign(new Error('timeout of 15000ms exceeded'), {
      code: 'ECONNABORTED',
    });
    routeAxios({sub: () => Promise.reject(stalled)});
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(
      await within(cardOf('Hevolve+')).findByRole('alert')
    ).toHaveTextContent(/too long/i);
    expect(postsTo('/makepayment')).toHaveLength(0);
    expect(buttonOf('Hevolve+')).not.toBeDisabled();
    expect(buttonOf('Hevolve+ Pro')).not.toBeDisabled();
  });
});

describe('Plan page: the line under the price', () => {
  test('names one user, never an empty count', async () => {
    await renderPlan();
    expect(
      within(cardOf('Hevolve+')).getByText(/per month \/ per user/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/for\s+user/i)).not.toBeInTheDocument();
  });
});

describe('Plan page checkout inside the Android webview', () => {
  test('the phone comes from the app and the payment is not blocked by reassigning a const', async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    asApp({phone_number: '9000000002', email_address: 'x', name: 'y'});
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/addsubscription_by_phone')[0][1].phone_number).toBe(
      '9000000002'
    );
    expect(postsTo('/makepayment')[0][1].mobile_number).toBe('9000000002');
    expect(window.location.href).toBe(PAY_URL);
  });

  test("the app is given this click's transaction id, not the empty state from before the click", async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    asApp({phone_number: '9000000002'});
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() =>
      expect(window.Handy.setTransactionId).toHaveBeenCalledTimes(1)
    );
    const told = JSON.parse(window.Handy.setTransactionId.mock.calls[0][0]);
    expect(told.TRANSACTION_ID).toBe(TX);
    expect(postsTo('/makepayment')[0][1].transaction_id).toBe(TX);
  });

  test('the app is not told about a transaction whose subscription row was never created', async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    asApp({phone_number: '9000000002'});
    routeAxios({sub: () => Promise.reject(httpError(400, 'No active plan'))});
    await renderPlan();
    fireEvent.click(buttonOf('Hevolve+'));

    await within(cardOf('Hevolve+')).findByRole('alert');
    expect(window.Handy.setTransactionId).not.toHaveBeenCalled();
  });
});
