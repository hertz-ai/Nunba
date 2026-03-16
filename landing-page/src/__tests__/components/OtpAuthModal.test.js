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
}));

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
