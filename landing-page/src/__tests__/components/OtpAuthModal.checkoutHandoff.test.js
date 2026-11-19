/* eslint-disable testing-library/no-node-access, testing-library/no-container -- the phone field has no label, so the test finds it by its input type, as OtpAuthModal.test.js does */
import axios from 'axios';
import {encryptionMock} from '../../testSupport/checkoutKit';
import OtpAuthModal from '../../pages/OtpAuthModal';
import {chatApi} from '../../services/socialApi';

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
}));
jest.mock(
  '../../utils/encryption',
  () => jest.requireActual('../../testSupport/checkoutKit').encryptionMock
);
jest.mock('../../services/socialApi', () => ({
  agentApi: {checkHandle: jest.fn()},
  authApi: {guestRegister: jest.fn(), guestRecover: jest.fn()},
  chatApi: {
    migrateAgents: jest.fn(),
    post: jest.fn(() => Promise.resolve({})),
    setDesktopIdentity: jest.fn(),
  },
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
  // jsdom runs on localhost, which OtpAuthModal treats as the local desktop:
  // it syncs the new login to the desktop and confirms it via /auth/me first.
  chatApi.setDesktopIdentity.mockResolvedValue({success: true});
  axios.get.mockResolvedValue({data: {success: true, data: {id: 42}}});
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
