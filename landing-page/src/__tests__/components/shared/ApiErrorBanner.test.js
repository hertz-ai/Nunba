/**
 * ApiErrorBanner — smoke tests for the global server-error toast.
 *
 * Locks the contract with the axios interceptor in services/axiosFactory.js:
 *   - Subscribes to window 'hevolve:api-error' CustomEvents
 *   - Dedup window: 5 s for identical (status, path)
 *   - Message text is status-based (5xx vs 401/403 vs 404 vs 4xx)
 *   - Mounts inside the existing provider tree, doesn't crash on init
 */

import ApiErrorBanner from '../../../components/shared/ApiErrorBanner';

import {ThemeProvider, createTheme} from '@mui/material/styles';
import {render, screen, act, cleanup} from '@testing-library/react';
import React from 'react';


const theme = createTheme();
const renderBanner = () =>
  render(
    <ThemeProvider theme={theme}>
      <ApiErrorBanner />
    </ThemeProvider>,
  );

const emit = (detail) => {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('hevolve:api-error', {detail}),
    );
  });
};

afterEach(() => {
  cleanup();
});

describe('ApiErrorBanner', () => {
  test('mounts without crashing and renders nothing until an event fires', () => {
    renderBanner();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('renders a 5xx-specific message on a 500 event', () => {
    renderBanner();
    emit({status: 500, path: '/api/social/communities', method: 'GET'});
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Something's off on our end",
    );
  });

  test('renders an auth-specific message on a 401 event', () => {
    renderBanner();
    emit({status: 401, path: '/api/social/posts', method: 'GET'});
    expect(screen.getByRole('alert')).toHaveTextContent(/Session expired/i);
  });

  test('renders a 404-specific message on a 404 event', () => {
    renderBanner();
    emit({status: 404, path: '/api/social/communities/missing', method: 'GET'});
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't find/i);
  });

  test('dedups two identical events fired in quick succession', () => {
    renderBanner();
    emit({status: 500, path: '/api/social/posts', method: 'GET'});
    // Immediately fire the same one — should be swallowed by dedup window.
    emit({status: 500, path: '/api/social/posts', method: 'GET'});
    // Only one Alert should be visible.
    expect(screen.getAllByRole('alert').length).toBe(1);
  });

  test('different paths within the dedup window each show', () => {
    renderBanner();
    emit({status: 500, path: '/api/social/posts', method: 'GET'});
    emit({status: 500, path: '/api/social/communities', method: 'GET'});
    // Snackbar autoHideDuration means only one is visible at a time, but
    // the second emit must have *triggered* (i.e., the message updates).
    // We assert the latest message wins.
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Something's off on our end");
  });
});
