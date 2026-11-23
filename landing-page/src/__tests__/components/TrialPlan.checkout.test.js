/* eslint-disable react/display-name -- jest.mock factories return anonymous stand-in components */
import {
  SESSION,
  TX,
  PAY_URL,
  signIn,
  httpError,
  routeAxios,
  postsTo,
  stubLocation,
  asApp,
  leaveApp,
  planServer,
} from '../../testSupport/checkoutKit';
import TrialPlan from '../../components/TrialPlan';

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

// Boundary mocks only (see Pricing.checkout.test.js).  Swiper is ESM-only and a
// carousel widget: it is replaced by plain containers so the cards render.
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
  'swiper/react',
  () => ({
    Swiper: ({children}) => <div>{children}</div>,
    SwiperSlide: ({children, className}) => (
      <div className={className}>{children}</div>
    ),
  }),
  {virtual: true}
);
jest.mock('swiper/css', () => ({}), {virtual: true});
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

async function renderTrial(firstTitle = 'Hevolve+ Pro') {
  render(
    <MemoryRouter initialEntries={['/trialplan']}>
      <TrialPlan />
    </MemoryRouter>
  );
  await screen.findByText(firstTitle);
}
const cardOf = (title) => screen.getByText(title).closest('.relative');
const buttonOf = (title) => within(cardOf(title)).getByRole('button');

let restoreLocation;
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockModalProps = null;
  mailerApi.getPlans.mockImplementation(planServer().getPlans);
  routeAxios();
  restoreLocation = stubLocation(
    'http://localhost/trialplan',
    '/trialplan',
    ''
  );
});
afterEach(() => {
  restoreLocation();
  leaveApp();
});

describe('TrialPlan checkout', () => {
  test('a signed-in visit sends the bearer token and the session phone (#206)', async () => {
    signIn();
    await renderTrial();
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

  test('the payment is requested only after the subscription row exists, and carries no student count', async () => {
    signIn();
    let finishSubscription;
    routeAxios({
      sub: () =>
        new Promise((resolve) => {
          finishSubscription = () => resolve({status: 200, data: {}});
        }),
    });
    await renderTrial();
    fireEvent.click(buttonOf('Hevolve+'));

    await waitFor(() =>
      expect(postsTo('/addsubscription_by_phone')).toHaveLength(1)
    );
    expect(postsTo('/makepayment')).toHaveLength(0);

    await act(async () => {
      finishSubscription();
    });
    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/makepayment')[0][1]).toEqual({
      mobile_number: SESSION.phone,
      plan_id: 1,
      transaction_id: TX,
      amount: 199,
    });
    expect(window.location.href).toBe(PAY_URL);
  });

  test('payment is not called when the subscription call fails, and the reason is shown', async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(
          httpError(
            403,
            'This access token does not belong to the account with that phone number.'
          )
        ),
    });
    await renderTrial();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(
      await within(cardOf('Hevolve+')).findByRole('alert')
    ).toHaveTextContent(/different account/i);
    expect(postsTo('/makepayment')).toHaveLength(0);
  });

  test('no session: nothing is posted and the sign-in opens, to bring the person back to the plan', async () => {
    await renderTrial();
    fireEvent.click(buttonOf('Hevolve+'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(mockModalProps.returnTo).toBe('/Plan?plan=1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('a business plan sends num_students from the sign-up state', async () => {
    signIn();
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/trialplan',
            state: {DataForPricePage: {num_of_students: 4}},
          },
        ]}
      >
        <TrialPlan />
      </MemoryRouter>
    );
    await screen.findByText('Hevolve Business');
    fireEvent.click(buttonOf('Hevolve Business'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, body] = postsTo('/makepayment')[0];
    expect(body.num_students).toBe(4);
    expect(body.amount).toBe(2000);
  });
});

describe('TrialPlan: the free-trial line is shown only where it is true', () => {
  test('paid plan cards do not carry it', async () => {
    await renderTrial();
    for (const title of ['Hevolve+', 'Hevolve+ Pro', 'Custom Credits']) {
      expect(
        within(cardOf(title)).queryByText(/no credit card required/i)
      ).not.toBeInTheDocument();
    }
  });

  test('the Rs 29 plan the app shows as the "trial" is a paid plan and does not claim a free trial', async () => {
    asApp({phone_number: '9000000002'});
    await renderTrial('Hevolve Basic');
    expect(
      within(cardOf('Hevolve Basic')).queryByText(/no credit card required/i)
    ).not.toBeInTheDocument();
    expect(
      within(cardOf('Hevolve Basic')).queryByText(/free 14-days trial/i)
    ).not.toBeInTheDocument();
  });
});

describe('TrialPlan checkout inside the Android webview', () => {
  test("the phone comes from the app and the app gets this click's transaction id", async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    asApp({phone_number: '9000000002'});
    await renderTrial('Hevolve Basic');
    fireEvent.click(buttonOf('Hevolve Basic'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/addsubscription_by_phone')[0][1].phone_number).toBe(
      '9000000002'
    );
    expect(postsTo('/makepayment')[0][1].mobile_number).toBe('9000000002');

    expect(window.Handy.setTransactionId).toHaveBeenCalledTimes(1);
    const told = JSON.parse(window.Handy.setTransactionId.mock.calls[0][0]);
    expect(told.TRANSACTION_ID).toBe(TX);
  });
});

describe('TrialPlan: the line under the price', () => {
  test('names one user, never an empty count', async () => {
    await renderTrial();
    expect(
      within(cardOf('Hevolve+')).getByText(/per month \/ per user/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/for\s+user/i)).not.toBeInTheDocument();
  });
});
