/* eslint-disable testing-library/no-node-access -- a plan card is a plain div with no role or label, so the test reaches it from its title */
import {
  PLANS,
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
} from '../../testSupport/checkoutKit';
import SpeechTherapyPage from '../../pages/SpeechTherapyPage';

import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import axios from 'axios';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

// Boundary mocks only (see components/Pricing.checkout.test.js).  The shared
// navbar and footer are replaced by empty stand-ins: they are not what is tested.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('axios', () => ({post: jest.fn(), get: jest.fn()}));
jest.mock('uuid', () => ({v4: () => '11111111-2222-3333-4444-555555555555'}));
jest.mock('react-ga', () => ({event: jest.fn()}));
jest.mock('../../components/navbar', () => () => null);
jest.mock('../../components/footer', () => () => null);
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
// mailerApi behaves as axiosFactory's mailer client does: the stored token is
// attached as a bearer, and the response body is what the call resolves to.  The
// checkout itself does not use it for the two writes (it needs the HTTP status),
// but the plan list does, and this keeps the boundary the same for any caller.
jest.mock('../../services/socialApi', () => {
  const mailerPost = (path, data) => {
    const token = global.localStorage.getItem('access_token');
    return require('axios')
      .post(
        `https://mailer.hertzai.com${path}`,
        data,
        token ? {headers: {Authorization: `Bearer ${token}`}} : undefined
      )
      .then((response) => response.data);
  };
  return {
    mailerApi: {
      getPlans: jest.fn(),
      addSubscription: (data) => mailerPost('/addsubscription_by_phone', data),
      makePayment: (data) => mailerPost('/makepayment', data),
    },
    chatApi: {post: jest.fn(() => Promise.resolve({}))},
  };
});
let mockModalProps = null;
jest.mock('../../pages/OtpAuthModal', () => (props) => {
  mockModalProps = props;
  return <div data-testid="signin-modal" />;
});

const {mailerApi} = require('../../services/socialApi');

const SPEECH_UA = 'Mozilla/5.0 speechtherapy';

async function renderPage(firstTitle = 'Hevolve++', entry = '/speechtherapy') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SpeechTherapyPage />
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
  mailerApi.getPlans.mockImplementation(() => Promise.resolve(PLANS));
  routeAxios();
  restoreLocation = stubLocation(
    'http://localhost/speechtherapy',
    '/speechtherapy',
    ''
  );
});
afterEach(() => {
  restoreLocation();
  leaveApp();
});

describe('Speech therapy page in a plain browser (no Android bridge)', () => {
  test('a signed-in visitor can pay: the subscription row carries the bearer token, then the payment follows', async () => {
    signIn();
    await renderPage();
    fireEvent.click(buttonOf('Hevolve++'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, subBody, subCfg] = postsTo('/addsubscription_by_phone')[0];
    expect(subCfg.headers.Authorization).toBe(`Bearer ${SESSION.token}`);
    expect(subBody).toEqual({
      phone_number: SESSION.phone,
      plan_id: 6,
      transaction_id: TX,
    });
    expect(postsTo('/makepayment')[0][1]).toEqual({
      mobile_number: SESSION.phone,
      plan_id: 6,
      transaction_id: TX,
      amount: 299,
    });
    expect(window.location.href).toBe(PAY_URL);
  });

  test('a visitor with no session gets the sign-in, back to this plan, with nothing posted', async () => {
    await renderPage();
    fireEvent.click(buttonOf('Hevolve++'));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(mockModalProps.returnTo).toBe('/speechtherapy?plan=6');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('?plan=<plan_id> picks the plan to show when there is no app to say which', async () => {
    await renderPage('Hevolve+ Pro', '/speechtherapy?plan=2');
    expect(screen.queryByText('Hevolve++')).not.toBeInTheDocument();
  });

  test('without the app the heading still names the page', async () => {
    await renderPage();
    expect(
      screen.getByRole('heading', {name: /speech therapy/i})
    ).toBeInTheDocument();
  });

  test('the payment is not requested when the subscription row could not be created, and the reason is shown', async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(httpError(400, 'No active plan with plan_id 6.')),
    });
    await renderPage();
    fireEvent.click(buttonOf('Hevolve++'));

    expect(
      await within(cardOf('Hevolve++')).findByRole('alert')
    ).toHaveTextContent('No active plan with plan_id 6');
    expect(postsTo('/makepayment')).toHaveLength(0);
  });
});

describe('Speech therapy page inside the app', () => {
  const inApp = (planDetails) => {
    asApp({phone_number: '9000000002'}, SPEECH_UA);
    window.Handy.getPlanDetails = jest.fn(() => JSON.stringify(planDetails));
  };

  test("the app names the plan and the phone; the header and this click's transaction id are sent", async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    inApp({plan_ID: 2, plan_message: 'Upgrade to keep practising'});
    await renderPage('Hevolve+ Pro');
    expect(screen.getByText('Upgrade to keep practising')).toBeInTheDocument();
    fireEvent.click(buttonOf('Hevolve+ Pro'));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, subBody, subCfg] = postsTo('/addsubscription_by_phone')[0];
    expect(subCfg.headers.Authorization).toBe(`Bearer ${SESSION.token}`);
    expect(subBody.phone_number).toBe('9000000002');
    expect(subBody.plan_id).toBe(2);

    expect(window.Handy.setTransactionId).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(window.Handy.setTransactionId.mock.calls[0][0]).TRANSACTION_ID
    ).toBe(TX);
  });
});

describe('Speech therapy page: the free-trial line is shown only where it is true', () => {
  test('a paid plan card does not claim a free trial', async () => {
    await renderPage();
    expect(
      within(cardOf('Hevolve++')).queryByText(/no credit card required/i)
    ).not.toBeInTheDocument();
    expect(
      within(cardOf('Hevolve++')).queryByText(/free 14-days trial/i)
    ).not.toBeInTheDocument();
  });

  test('the free 14-day pilot plan does', async () => {
    await renderPage('Speech therapy pilot, 14 days', '/speechtherapy?plan=20');
    expect(
      within(cardOf('Speech therapy pilot, 14 days')).getByText(
        'No credit card required. Free 14-days trial'
      )
    ).toBeInTheDocument();
  });
});
