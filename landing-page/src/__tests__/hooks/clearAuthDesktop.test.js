/**
 * clearAuth signs the person out of the desktop too, not only this page.
 *
 * Without it the desktop's user_data.json keeps the account, useStorageSync
 * hydrates it back on the next load, and the desktop owner never changes.
 */
const mockSetDesktopIdentity = jest.fn(() => Promise.resolve({success: true}));
jest.mock('../../services/socialApi', () => ({
  chatApi: {setDesktopIdentity: (...args) => mockSetDesktopIdentity(...args)},
}));

const {clearAuth} = require('../../hooks/useAuthSession');

beforeEach(() => {
  localStorage.clear();
  mockSetDesktopIdentity.mockClear();
});

test('logout clears the account from the desktop record, keeping the HART identity', () => {
  localStorage.setItem('access_token', 'tok');
  localStorage.setItem('hart_name', 'solari');
  clearAuth();
  expect(mockSetDesktopIdentity).toHaveBeenCalledTimes(1);
  const [cleared] = mockSetDesktopIdentity.mock.calls[0];
  expect(cleared).toEqual({access_token: '', email: '', user_id: ''});
  expect(Object.keys(cleared).some((k) => k.startsWith('hart_'))).toBe(false);
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('hart_name')).toBe('solari');
});

test('a failed desktop clear does not break logout', async () => {
  mockSetDesktopIdentity.mockImplementationOnce(() => Promise.reject(new Error('down')));
  localStorage.setItem('access_token', 'tok');
  expect(() => clearAuth()).not.toThrow();
  await Promise.resolve();
  expect(localStorage.getItem('access_token')).toBeNull();
});
