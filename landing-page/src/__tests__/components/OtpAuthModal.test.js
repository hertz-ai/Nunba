/* eslint-disable */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

// Mock dependencies before importing the component
jest.mock('axios');
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({toString: () => 'encrypted'})),
    decrypt: jest.fn(() => ({toString: () => 'decrypted'})),
  },
  enc: {Utf8: 'utf8'},
}));

jest.mock('libphonenumber-js', () => ({
  getCountries: () => ['IN', 'US', 'GB'],
  getCountryCallingCode: (code) => ({IN: '91', US: '1', GB: '44'})[code] || '0',
  // The real parser: the guest screen splits the account's phone with it.
  parsePhoneNumberFromString:
    jest.requireActual('libphonenumber-js').parsePhoneNumberFromString,
}));

// A signed-in account's keys are stored encrypted; "ENC:<value>" decrypts to
// <value> here so a test can seed them.
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

jest.mock('../../configData.json', () => ({
  verifyTeacherByPhone: 'http://test/verify',
  verifyOtpWithAzure: 'http://test/verifyotp',
  renew_token: 'http://test/renew',
}));

jest.mock('../../services/socialApi', () => ({
  agentApi: {
    checkHandle: jest.fn(),
  },
  authApi: {
    guestRegister: jest.fn(),
    guestRecover: jest.fn(),
  },
  chatApi: {
    migrateAgents: jest.fn(),
  },
  mailerApi: {
    renewToken: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {log: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

jest.mock('../../config/apiBase', () => ({
  API_BASE_URL: 'http://test',
  AZURE_LOGIN_URL: 'http://test/login',
  AZURE_OTP_VERIFY_URL: 'http://test/verifyotp',
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import OtpAuthModal from '../../pages/OtpAuthModal';

const renderModal = (props = {}) =>
  render(
    <MemoryRouter>
      <OtpAuthModal isOpen={true} onClose={jest.fn()} {...props} />
    </MemoryRouter>
  );

describe('OtpAuthModal', () => {
  let originalNavigator;

  beforeEach(() => {
    localStorage.clear();
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
    localStorage.clear();
  });

  // --- Rendering ---

  test('renders nothing when isOpen is false', () => {
    const {container} = render(
      <MemoryRouter>
        <OtpAuthModal isOpen={false} onClose={jest.fn()} />
      </MemoryRouter>
    );
    // Component returns null when closed — container should have minimal/empty content
    expect(container.querySelector('h2')).toBeNull();
  });

  test('renders modal when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('heading', {level: 2})).toBeInTheDocument();
  });

  test('shows "User Sign in" when online', () => {
    renderModal();
    expect(screen.getByText('User Sign in')).toBeInTheDocument();
  });

  // --- Phone/Email toggle ---

  test('shows phone input by default', () => {
    renderModal();
    const telInput = document.querySelector('input[type="tel"]');
    expect(telInput).toBeInTheDocument();
  });

  test('switches to email input when Email button is clicked', () => {
    renderModal();
    const emailButton = screen.getByRole('button', {name: /email/i});
    fireEvent.click(emailButton);

    const emailInput = document.querySelector('input[type="email"]');
    expect(emailInput).toBeInTheDocument();
    expect(document.querySelector('input[type="tel"]')).toBeNull();
  });

  // --- Validation ---

  test('shows error when phone number is empty on submit', () => {
    renderModal();
    const otpButton = screen.getByRole('button', {name: /get otp/i});
    fireEvent.click(otpButton);
    expect(
      screen.getByText(/please enter your phone number/i)
    ).toBeInTheDocument();
  });

  // --- Guest mode (offline) ---

  test('shows Guest Login when offline', () => {
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/guest login/i)).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  test('shows guest name input when offline', () => {
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/continue as guest/i)).toBeInTheDocument();
  });

  test('validates guest name is not empty on submit', () => {
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={jest.fn()} />
      </MemoryRouter>
    );

    // Don't enter a name — submit empty
    const guestButton = screen.getByText(/continue as guest/i);
    fireEvent.click(guestButton);

    expect(
      screen.getByText(/please enter your name/i, {exact: false})
    ).toBeInTheDocument();
  });

  test('guest login sets localStorage keys', async () => {
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });

    const onClose = jest.fn();
    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/enter your name/i);
    fireEvent.change(input, {target: {value: 'TestGuest'}});

    const guestButton = screen.getByText(/continue as guest/i);
    fireEvent.click(guestButton);

    await waitFor(() => {
      expect(localStorage.getItem('guest_mode')).toBe('true');
      expect(localStorage.getItem('guest_name')).toBeTruthy();
      expect(localStorage.getItem('guest_user_id')).toBeTruthy();
      expect(localStorage.getItem('guest_name_verified')).toBe('false');
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('hides phone/email tabs when offline', () => {
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={jest.fn()} />
      </MemoryRouter>
    );

    expect(document.querySelector('input[type="tel"]')).toBeNull();
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expect(screen.queryByText('GET OTP')).toBeNull();
  });
});

// 2026-11-24: the owner's phone sign-in lost its token to a 401.  The login
// dialog then offered only "Continue as buildra"; pressing it wrote a guest
// token beside his account's keys, so the page kept showing his email while
// it ran as the guest.  The guest screen now names the account first, and
// the guest press over an account signs it out before writing the guest.
describe('OtpAuthModal: the guest screen and a signed-in account', () => {
  const {authApi} = require('../../services/socialApi');
  const {readAuthSession} = require('../../hooks/useAuthSession');
  const GUEST_PRESS = 'Sign out sales@hertzai.com and continue as buildra (guest)';
  let originalNavigator;

  const seedGuest = () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'hw-guest-1');
    localStorage.setItem('guest_name', 'Radiant.Green.buildra');
  };
  // What a 401 leaves of a phone sign-in: everything but the token.
  const seedAccountAfter401 = () => {
    localStorage.setItem('user_id', 'ENC:10202');
    localStorage.setItem('email_address', 'ENC:sales@hertzai.com');
    localStorage.setItem('phone_number', 'ENC:+919000000001');
    localStorage.setItem('refresh_token', 'ENC:refresh-1');
  };
  const setOffline = () =>
    Object.defineProperty(window, 'navigator', {
      value: {onLine: false},
      configurable: true,
      writable: true,
    });
  // clearAuth posts through plain axios (mocked); either export may be it.
  const axiosPosts = () => {
    const m = require('axios');
    return [m.post, m.default && m.default.post].filter(
      (fn, i, all) => fn && all.indexOf(fn) === i
    );
  };
  const expectAccountGone = () => {
    ['access_token', 'user_id', 'email_address', 'phone_number',
     'refresh_token'].forEach((k) => expect(localStorage.getItem(k)).toBeNull());
  };

  beforeEach(() => {
    localStorage.clear();
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
    mockNavigate.mockClear();
    authApi.guestRegister.mockReset();
    axiosPosts().forEach((fn) => {
      fn.mockReset();
      fn.mockImplementation(() => Promise.resolve({status: 200, data: {}}));
    });
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
    localStorage.clear();
  });

  test('after a 401 the account comes first: "Sign in again as <email> (<phone>)", then the guest press', () => {
    seedGuest();
    seedAccountAfter401();
    renderModal({forceGuestMode: true});
    const again = screen.getByRole('button', {
      name: 'Sign in again as sales@hertzai.com (+91 ••••• 0001)',
    });
    const guest = screen.getByRole('button', {name: GUEST_PRESS});
    expect(
      again.compareDocumentPosition(guest) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(again).not.toBeDisabled();
  });

  test("in useStorageSync's pending state the pending email is named", () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', '10202');
    localStorage.setItem('guest_name', 'Radiant.Green.buildra');
    localStorage.setItem('pending_cloud_user_id', '10202');
    localStorage.setItem('pending_cloud_email', 'Sales@hertzai.com');
    renderModal({forceGuestMode: true});
    expect(
      screen.getByRole('button', {name: 'Sign in again as Sales@hertzai.com'})
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Sign out Sales@hertzai.com and continue as buildra (guest)',
      })
    ).toBeInTheDocument();
  });

  test('after a guest switch nothing names an account, and the screen is as before', () => {
    seedGuest();
    localStorage.setItem('access_token', 'guest-jwt');
    renderModal({forceGuestMode: true});
    expect(screen.queryByText(/sign in again/i)).toBeNull();
    expect(screen.queryByText(/signed in as/i)).toBeNull();
    expect(screen.queryByText(/sign out/i)).toBeNull();
    expect(
      screen.getByRole('button', {name: 'Continue as buildra'})
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Use a different name'})
    ).toBeInTheDocument();
  });

  test('signed in (the dialog opened on /local): "Signed in as <email>", no "Sign in again"', () => {
    seedGuest();
    seedAccountAfter401();
    localStorage.setItem('access_token', 'kong-tok');
    renderModal({forceGuestMode: true});
    expect(
      screen.getByText('Signed in as sales@hertzai.com')
    ).toBeInTheDocument();
    expect(screen.queryByText(/sign in again/i)).toBeNull();
    expect(screen.getByRole('button', {name: GUEST_PRESS})).toBeInTheDocument();
  });

  test('offline the account line stays, marked as needing internet', () => {
    setOffline();
    seedGuest();
    seedAccountAfter401();
    renderModal();
    expect(
      screen.getByRole('button', {name: /^Sign in again as sales@hertzai\.com/})
    ).toBeDisabled();
    expect(screen.getByText(/needs internet/i)).toBeInTheDocument();
  });

  test('"Sign in again" opens the OTP screen with the phone filled in', () => {
    seedGuest();
    seedAccountAfter401();
    renderModal({forceGuestMode: true});
    fireEvent.click(screen.getByRole('button', {name: /^Sign in again as/}));
    expect(screen.getByText('User Sign in')).toBeInTheDocument();
    expect(document.querySelector('input[type="tel"]').value).toBe('9000000001');
  });

  test('the guest press over an account: the record is emptied and answered before any guest is written', async () => {
    seedGuest();
    seedAccountAfter401();
    let answer;
    const posts = axiosPosts();
    posts.forEach((fn) =>
      fn.mockImplementation(() => new Promise((r) => { answer = r; }))
    );
    authApi.guestRegister.mockResolvedValue({
      data: {user: {id: 'g-buildra'}, token: 'guest-jwt-buildra'},
    });
    const onClose = jest.fn();
    renderModal({forceGuestMode: true, onClose});

    fireEvent.click(screen.getByRole('button', {name: /continue as buildra/i}));
    await waitFor(() => expect(answer).toBeDefined());
    const sent = posts.flatMap((fn) => fn.mock.calls);
    expect(sent).toEqual([
      ['/api/storage/set', {user_id: '', access_token: '', email: ''}, {timeout: 3000}],
    ]);
    // The account's keys are gone, and nothing of the guest is written
    // while the desktop has not answered.
    expectAccountGone();
    expect(authApi.guestRegister).not.toHaveBeenCalled();

    answer({status: 200, data: {}});
    await waitFor(() =>
      expect(localStorage.getItem('access_token')).toBe('guest-jwt-buildra')
    );
    const clearedAt = Math.min(...posts.flatMap((fn) => fn.mock.invocationCallOrder));
    expect(clearedAt).toBeLessThan(authApi.guestRegister.mock.invocationCallOrder[0]);
    ['user_id', 'email_address', 'phone_number', 'refresh_token'].forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull());
    const s = readAuthSession();
    expect(s.status).toBe('guest');
    expect(s.identity.user_id).toBe('g-buildra');
    expect(s.account).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  test('offline, the returning-guest press over an account: the account really leaves, the page is the guest', async () => {
    setOffline();
    seedGuest();
    seedAccountAfter401();
    authApi.guestRegister.mockRejectedValue(new Error('Network Error'));
    const onClose = jest.fn();
    renderModal({onClose});
    fireEvent.click(screen.getByRole('button', {name: /continue as buildra/i}));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expectAccountGone();
    const s = readAuthSession();
    expect(s.status).toBe('guest');
    expect(s.account).toBeNull();
  });

  test('offline, the new-guest press over an account: the account really leaves, the page is the guest', async () => {
    setOffline();
    seedAccountAfter401(); // no guest name yet: the new-guest screen
    const onClose = jest.fn();
    renderModal({onClose});
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
      target: {value: 'TestGuest'},
    });
    fireEvent.click(screen.getByRole('button', {name: /continue as guest/i}));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expectAccountGone();
    const s = readAuthSession();
    expect(s.status).toBe('guest');
    expect(s.account).toBeNull();
  });

  test('the new-guest button says it signs the account out', () => {
    setOffline();
    seedAccountAfter401();
    renderModal();
    expect(
      screen.getByRole('button', {
        name: 'Sign out sales@hertzai.com and continue as Guest',
      })
    ).toBeInTheDocument();
  });

  test('with no account the guest press is as before: no sign-out post', async () => {
    seedGuest();
    authApi.guestRegister.mockResolvedValue({
      data: {user: {id: 'g-buildra'}, token: 'guest-jwt-buildra'},
    });
    const onClose = jest.fn();
    renderModal({forceGuestMode: true, onClose});
    fireEvent.click(screen.getByRole('button', {name: 'Continue as buildra'}));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(axiosPosts().flatMap((fn) => fn.mock.calls)).toEqual([]);
    expect(localStorage.getItem('access_token')).toBe('guest-jwt-buildra');
    expect(readAuthSession().status).toBe('guest');
  });

  // A recovery code is the third way to the guest (review of 3f882948). Its
  // form opens from the new-guest screen, shown online when no guest name is
  // saved. It wrote the recovered guest's JWT beside the account's
  // encrypted user_id, so the page read that JWT as the account's token.
  const recoverWithACode = (onClose) => {
    authApi.guestRecover.mockReset();
    renderModal({forceGuestMode: true, onClose});
    fireEvent.click(
      screen.getByRole('button', {name: /recover guest session/i})
    );
    fireEvent.change(
      screen.getByPlaceholderText('amber breeze coral drift ember frost'),
      {target: {value: 'amber breeze coral drift ember frost'}}
    );
  };

  test('a recovery code over an account: the account is signed out, the page is the recovered guest', async () => {
    seedAccountAfter401(); // no guest name saved: the new-guest screen
    const onClose = jest.fn();
    recoverWithACode(onClose);
    authApi.guestRecover.mockResolvedValue({
      data: {
        user: {id: 'g-recovered', display_name: 'Radiant.Green.buildra'},
        token: 'guest-jwt-recovered',
      },
    });
    fireEvent.click(screen.getByRole('button', {name: 'Recover Session'}));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const s = readAuthSession();
    // Before the fix: {status: 'cloud', cloudToken: 'guest-jwt-recovered'}.
    expect({status: s.status, cloudToken: s.tokens.cloud}).toEqual({
      status: 'guest',
      cloudToken: null,
    });
    expect(s.identity.user_id).toBe('g-recovered');
    expect(s.account).toBeNull();
    ['user_id', 'email_address', 'phone_number', 'refresh_token'].forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull());
    expect(localStorage.getItem('access_token')).toBe('guest-jwt-recovered');
    expect(axiosPosts().flatMap((fn) => fn.mock.calls)).toEqual([
      ['/api/storage/set', {user_id: '', access_token: '', email: ''}, {timeout: 3000}],
    ]);
  });

  test('a wrong recovery code signs nobody out', async () => {
    seedAccountAfter401();
    recoverWithACode(jest.fn());
    authApi.guestRecover.mockRejectedValue(new Error('Request failed with status code 400'));
    fireEvent.click(screen.getByRole('button', {name: 'Recover Session'}));
    expect(
      await screen.findByText('Invalid recovery code. Please try again.')
    ).toBeInTheDocument();
    expect(localStorage.getItem('user_id')).toBe('ENC:10202');
    expect(localStorage.getItem('email_address')).toBe('ENC:sales@hertzai.com');
    expect(axiosPosts().flatMap((fn) => fn.mock.calls)).toEqual([]);
    expect(readAuthSession().account).toEqual({
      email: 'sales@hertzai.com',
      phone: '+919000000001',
    });
  });
});
