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
//
// The plan list is the account store as it stands at c1eeb2131: the speech plans
// are NOT on the public list, and only GET /getallplandetails?plan_id=<id>
// returns one.  A page that never sends plan_id sees no speech plan at all.
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
jest.mock('../../components/navbar', () => () => null);
jest.mock('../../components/footer', () => () => null);
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
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

const SPEECH_UA = 'Mozilla/5.0 speechtherapy';
const PER_CHILD = 'Speech therapy, per child per month';
const PILOT = 'Speech therapy pilot, 14 days';

async function renderPage(waitForText, entry = '/speechtherapy') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SpeechTherapyPage />
    </MemoryRouter>
  );
  if (waitForText) await screen.findByText(waitForText);
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

describe('Speech therapy page: it asks the server for the plan it was sent', () => {
  test('?plan=22 requests plan_id=22 and shows the per-child plan the public list does not carry', async () => {
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    expect(server.calls).toContainEqual({plan_id: 22});
    expect(screen.queryByText('Hevolve++')).not.toBeInTheDocument();
  });

  test('?plan=20 shows the pilot plan, which the public list does not carry either', async () => {
    await renderPage(PILOT, '/speechtherapy?plan=20');
    expect(server.calls).toContainEqual({plan_id: 20});
  });

  test('a server that ignores plan_id still works: only the named plan is shown', async () => {
    server = planServer({ignoresPlanId: true});
    mailerApi.getPlans.mockImplementation(server.getPlans);
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    expect(screen.queryByText('Hevolve+')).not.toBeInTheDocument();
    expect(screen.queryByText('Hevolve++')).not.toBeInTheDocument();
  });

  test('an id the server does not have says so, instead of an empty page', async () => {
    await renderPage(null, '/speechtherapy?plan=999');
    expect(await screen.findByRole('status')).toHaveTextContent(/999/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(server.calls).toContainEqual({plan_id: 999});
  });
});

describe('Speech therapy page: no plan was chosen', () => {
  test('there is no default plan: a plain message, no buy button, and no other plan sold under this heading', async () => {
    await renderPage(null, '/speechtherapy');
    expect(await screen.findByRole('status')).toHaveTextContent(
      /no plan was chosen/i
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Hevolve++')).not.toBeInTheDocument();
    expect(mailerApi.getPlans).not.toHaveBeenCalled();
  });

  test('the heading still names the page', async () => {
    await renderPage(null, '/speechtherapy');
    expect(
      screen.getByRole('heading', {name: /speech therapy/i})
    ).toBeInTheDocument();
  });

  test('inside the app, an app that offers no plan gets the same message', async () => {
    asApp({phone_number: '9000000002'}, SPEECH_UA);
    window.Handy.getPlanDetails = jest.fn(() =>
      JSON.stringify({plan_ID: null, plan_message: 'Nothing today'})
    );
    await renderPage(null, '/speechtherapy');
    expect(await screen.findByRole('status')).toHaveTextContent(
      /no plan was chosen/i
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Speech therapy page in a plain browser (no Android bridge)', () => {
  test('a signed-in visitor can pay for the per-child plan: the row carries the bearer token, then the payment follows', async () => {
    signIn();
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    fireEvent.click(buttonOf(PER_CHILD));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, subBody, subCfg] = postsTo('/addsubscription_by_phone')[0];
    expect(subCfg.headers.Authorization).toBe(`Bearer ${SESSION.token}`);
    expect(subBody).toEqual({
      phone_number: SESSION.phone,
      plan_id: 22,
      transaction_id: TX,
    });
    expect(postsTo('/makepayment')[0][1]).toEqual({
      mobile_number: SESSION.phone,
      plan_id: 22,
      transaction_id: TX,
      amount: 5000,
      num_students: 1,
    });
    expect(window.location.href).toBe(PAY_URL);
  });

  test('the number of children multiplies the price, and the server is told the number', async () => {
    signIn();
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/speechtherapy',
            search: '?plan=22',
            state: {DataForPricePage: {num_of_students: 3}},
          },
        ]}
      >
        <SpeechTherapyPage />
      </MemoryRouter>
    );
    await screen.findByText(PER_CHILD);
    fireEvent.click(buttonOf(PER_CHILD));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    expect(postsTo('/makepayment')[0][1]).toMatchObject({
      plan_id: 22,
      amount: 15000,
      num_students: 3,
    });
  });

  test('a visitor with no session gets the sign-in, back to this plan, with nothing posted', async () => {
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    fireEvent.click(buttonOf(PER_CHILD));

    expect(await screen.findByTestId('signin-modal')).toBeInTheDocument();
    expect(mockModalProps.returnTo).toBe('/speechtherapy?plan=22');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('the payment is not requested when the subscription row could not be created, and the reason is shown', async () => {
    signIn();
    routeAxios({
      sub: () =>
        Promise.reject(httpError(400, 'No active plan with plan_id 22.')),
    });
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    fireEvent.click(buttonOf(PER_CHILD));

    expect(
      await within(cardOf(PER_CHILD)).findByRole('alert')
    ).toHaveTextContent(/not available any more/i);
    expect(postsTo('/makepayment')).toHaveLength(0);
  });
});

describe('Speech therapy page inside the app', () => {
  const inApp = (planDetails) => {
    asApp({phone_number: '9000000002'}, SPEECH_UA);
    window.Handy.getPlanDetails = jest.fn(() => JSON.stringify(planDetails));
  };

  test("the app offers plan 22: it is requested by plan_id, shown, and the header and this click's transaction id are sent", async () => {
    localStorage.setItem('access_token', SESSION.token);
    localStorage.setItem('user_id', 'ENC:42');
    inApp({plan_ID: 22, plan_message: 'Continue after the free days'});
    await renderPage(PER_CHILD);
    expect(
      screen.getByText('Continue after the free days')
    ).toBeInTheDocument();
    expect(server.calls).toContainEqual({plan_id: 22});
    fireEvent.click(buttonOf(PER_CHILD));

    await waitFor(() => expect(postsTo('/makepayment')).toHaveLength(1));
    const [, subBody, subCfg] = postsTo('/addsubscription_by_phone')[0];
    expect(subCfg.headers.Authorization).toBe(`Bearer ${SESSION.token}`);
    expect(subBody.phone_number).toBe('9000000002');
    expect(subBody.plan_id).toBe(22);

    expect(window.Handy.setTransactionId).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(window.Handy.setTransactionId.mock.calls[0][0]).TRANSACTION_ID
    ).toBe(TX);
  });
});

describe('Speech therapy page: the free-trial line is shown only where it is true', () => {
  test('the paid per-child plan does not claim a free trial', async () => {
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    expect(
      within(cardOf(PER_CHILD)).queryByText(/no credit card required/i)
    ).not.toBeInTheDocument();
    expect(
      within(cardOf(PER_CHILD)).queryByText(/free 14-days trial/i)
    ).not.toBeInTheDocument();
  });

  test('the free 14-day pilot plan does', async () => {
    await renderPage(PILOT, '/speechtherapy?plan=20');
    expect(
      within(cardOf(PILOT)).getByText(
        'No credit card required. Free 14-days trial'
      )
    ).toBeInTheDocument();
  });
});

describe('Speech therapy page: the line under the price', () => {
  test('names one user, never an empty count', async () => {
    await renderPage(PER_CHILD, '/speechtherapy?plan=22');
    expect(
      within(cardOf(PER_CHILD)).getByText(/per month \/ per user/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/for\s+user/i)).not.toBeInTheDocument();
  });
});
