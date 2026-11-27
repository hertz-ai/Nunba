/* eslint-disable testing-library/no-node-access, testing-library/no-container -- the phone field has no label, so the test finds it by its input type, as OtpAuthModal.test.js does */
import {encryptionMock} from '../../testSupport/checkoutKit';
import OtpAuthModal from '../../pages/OtpAuthModal';

import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

// Drives the real phone-OTP sign-in (send OTP, enter OTP, verify) and checks
// what it leaves for the checkout: the phone, and where the person lands.
// Boundaries mocked: fetch (the two account-store calls), the router's navigate,
// the encryption key, and the services the modal reaches for.
jest.mock('axios');
jest.mock('uuid', () => ({v4: () => 'test-uuid-1234'}));
jest.mock('libphonenumber-js', () => ({
  getCountries: () => ['IN', 'US', 'GB'],
  getCountryCallingCode: (code) => ({IN: '91', US: '1', GB: '44'})[code] || '0',
  // The real parser: "Sign in again" splits the account's phone with it.
  parsePhoneNumberFromString:
    jest.requireActual('libphonenumber-js').parsePhoneNumberFromString,
}));
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
jest.mock('../../services/socialApi', () => ({
  agentApi: {checkHandle: jest.fn()},
  authApi: {guestRegister: jest.fn(), guestRecover: jest.fn()},
  chatApi: {migrateAgents: jest.fn(), post: jest.fn(() => Promise.resolve({}))},
  mailerApi: {renewToken: jest.fn()},
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

const VERIFY_RESPONSE = {
  access_token: 'kong-bearer-xyz',
  user_id: 42,
  email_address: 'someone@example.com',
  refresh_token: 'refresh-xyz',
  expires_in: 3600,
};

// Phone, Get OTP, OTP, Verify OTP: the account store answers both calls.
async function signInWith(verifyBody, props = {}) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ok: true, json: async () => ({})})
    .mockResolvedValueOnce({ok: true, json: async () => verifyBody});
  render(
    <MemoryRouter>
      <OtpAuthModal isOpen={true} onClose={jest.fn()} {...props} />
    </MemoryRouter>
  );
  fireEvent.change(document.querySelector('input[type="tel"]'), {
    target: {value: '9000000001'},
  });
  fireEvent.click(screen.getByRole('button', {name: /get otp/i}));
  fireEvent.change(await screen.findByPlaceholderText('Enter OTP'), {
    target: {value: '1234'},
  });
  fireEvent.click(screen.getByRole('button', {name: /verify otp/i}));
  await waitFor(() =>
    expect(localStorage.getItem('access_token')).toBe('kong-bearer-xyz')
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('OtpAuthModal: what a cloud sign-in leaves for the checkout', () => {
  test('the phone the account store returned is kept, encrypted like the user id', async () => {
    await signInWith({...VERIFY_RESPONSE, phone_number: '9000000001'});
    expect(localStorage.getItem('phone_number')).toBe(
      encryptionMock.encrypt('9000000001')
    );
  });

  test('a response with no phone clears one left by an earlier account', async () => {
    localStorage.setItem('phone_number', encryptionMock.encrypt('9000000099'));
    await signInWith(VERIFY_RESPONSE);
    expect(localStorage.getItem('phone_number')).toBeNull();
  });

  test('without returnTo the person lands on their agents, as before', async () => {
    await signInWith({...VERIFY_RESPONSE, phone_number: '9000000001'});
    expect(mockNavigate).toHaveBeenCalledWith('/agents/Hevolve');
  });

  test('returnTo sends the person back to the plan they chose', async () => {
    await signInWith(
      {...VERIFY_RESPONSE, phone_number: '9000000001'},
      {returnTo: '/Plan?plan=5'}
    );
    expect(mockNavigate).toHaveBeenCalledWith('/Plan?plan=5');
    expect(mockNavigate).not.toHaveBeenCalledWith('/agents/Hevolve');
  });

  test('a returnTo that leaves the site is not followed', async () => {
    await signInWith(
      {...VERIFY_RESPONSE, phone_number: '9000000001'},
      {returnTo: '//evil.example/Plan'}
    );
    expect(mockNavigate).toHaveBeenCalledWith('/agents/Hevolve');
  });
});

// 2026-11-24: the page used a new token before the desktop had stored it,
// the desktop's social API answered 401, and the page deleted the token.
// The sign-in now waits for the desktop's answer before anything moves on.
describe('OtpAuthModal: nothing moves on until the desktop has the new token', () => {
  test('no token stored, no close, no navigate while the desktop post is pending', async () => {
    const axiosModule = require('axios');
    const posts = [axiosModule.post, axiosModule.default && axiosModule.default.post]
      .filter((fn, i, all) => fn && all.indexOf(fn) === i);
    let answer;
    posts.forEach((fn) => fn.mockImplementation(() => new Promise((r) => { answer = r; })));
    const onClose = jest.fn();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ok: true, json: async () => ({})})
      .mockResolvedValueOnce({ok: true, json: async () => VERIFY_RESPONSE});
    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );
    fireEvent.change(document.querySelector('input[type="tel"]'), {
      target: {value: '9000000001'},
    });
    fireEvent.click(screen.getByRole('button', {name: /get otp/i}));
    fireEvent.change(await screen.findByPlaceholderText('Enter OTP'), {
      target: {value: '1234'},
    });
    fireEvent.click(screen.getByRole('button', {name: /verify otp/i}));
    await waitFor(() => expect(answer).toBeDefined());
    const sent = posts.flatMap((fn) => fn.mock.calls);
    expect(sent[0][0]).toBe('/api/storage/set');
    expect(sent[0][1]).toEqual({
      user_id: '42', access_token: 'kong-bearer-xyz', email: 'someone@example.com',
    });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    answer({status: 200, data: {}});
    await waitFor(() =>
      expect(localStorage.getItem('access_token')).toBe('kong-bearer-xyz')
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/agents/Hevolve'));
    expect(onClose).toHaveBeenCalled();
  });
});

// 2026-11-24: after a 401 the guest screen offered only the guest.  It now
// offers "Sign in again as <account>", which opens this OTP screen filled in
// with the account's phone (split into country code and number) or email,
// so the person only presses Get OTP.
describe('OtpAuthModal: "Sign in again" fills in the account it names', () => {
  // What a 401 leaves of a sign-in, beside the guest keys of this desktop.
  const seedAfter401 = ({phone, email}) => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'hw-guest-1');
    localStorage.setItem('guest_name', 'Radiant.Green.buildra');
    localStorage.setItem('user_id', encryptionMock.encrypt('42'));
    if (email) localStorage.setItem('email_address', encryptionMock.encrypt(email));
    if (phone) localStorage.setItem('phone_number', encryptionMock.encrypt(phone));
  };
  const openGuestScreen = () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ok: true, json: async () => ({})});
    render(
      <MemoryRouter>
        <OtpAuthModal isOpen={true} onClose={jest.fn()} forceGuestMode={true} />
      </MemoryRouter>
    );
  };
  const sentLogin = () => JSON.parse(global.fetch.mock.calls[0][1].body);

  test.each([
    ['with its country code', '+919000000001', '+91 ••••• 0001', '9000000001', '+919000000001'],
    ['as a bare 10-digit number', '9000000001', '+91 ••••• 0001', '9000000001', '+919000000001'],
    ['from another country', '+14155550123', '+1 ••••• 0123', '4155550123', '+14155550123'],
  ])('a phone stored %s', (_label, stored, masked, national, sent) => {
    seedAfter401({phone: stored, email: 'someone@example.com'});
    openGuestScreen();
    // The button names the email, with the phone masked to its last 4.
    fireEvent.click(
      screen.getByRole('button', {
        name: `Sign in again as someone@example.com (${masked})`,
      })
    );
    expect(screen.getByText('User Sign in')).toBeInTheDocument();
    expect(document.querySelector('input[type="tel"]').value).toBe(national);
    fireEvent.click(screen.getByRole('button', {name: /get otp/i}));
    expect(sentLogin()).toEqual({phone_number: sent});
  });

  test('an account with no phone opens the email tab with the email filled in', () => {
    seedAfter401({email: 'someone@example.com'});
    openGuestScreen();
    fireEvent.click(
      screen.getByRole('button', {name: 'Sign in again as someone@example.com'})
    );
    expect(document.querySelector('input[type="email"]').value).toBe(
      'someone@example.com'
    );
    fireEvent.click(screen.getByRole('button', {name: /get otp/i}));
    expect(sentLogin()).toEqual({phone_number: 'someone@example.com'});
  });
});
