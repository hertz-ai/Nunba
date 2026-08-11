/**
 * Parity phase A — /download is no longer a navigation dead-end.
 *
 * DownloadPage was registered in MainRoute.js OUTSIDE SocialLayout and rendered a
 * bare <main>.  Reaching it from the sidebar unmounted the entire app shell, so
 * the page had no header, no footer, and no link back — the user's reported
 * "there is no way to go back".
 *
 * These tests pin BOTH halves of the fix, because either alone is insufficient:
 *
 *   1. the page renders the shared PublicSeoPage scaffold (so it has nav at all);
 *   2. its home destination is '/local', NOT '/'.  In the desktop app '/' leaves
 *      the app; a header whose only exit exits the product is the same dead end
 *      with better styling.
 *
 * And it pins the thing a careless refactor would silently destroy: the ?ref=
 * funnel attribution.  marketingApi.track() is why this page exists at all — if
 * a rewrite drops it, every install attribution silently reads zero and nothing
 * in the UI looks wrong.
 *
 * Uses the repo's canonical renderWithProviders (HelmetProvider + Router + MUI
 * theme) rather than a local wrapper — DownloadPage renders <Helmet>, which
 * throws without its provider.
 */
import DownloadPage from '../../pages/DownloadPage';

import { renderWithProviders } from '../testHelpers';

import { screen } from '@testing-library/react';
import React from 'react';

const mockTrack = jest.fn(() => Promise.resolve({}));

jest.mock('../../services/socialApi', () => ({
  marketingApi: { track: (...a) => mockTrack(...a) },
}));

jest.mock('../../hooks/useReferral', () => ({
  getReferralCode: () => '',
}));

jest.mock('../../components/shared/SeoFooter', () => {
  const MockSeoFooter = () => <div data-testid="seo-footer" />;
  return MockSeoFooter;
});

const renderAt = (search = '') => {
  // DownloadPage reads window.location.search directly (the referral code may
  // already have been stripped from the router's view by useReferral).
  window.history.pushState({}, '', `/download${search}`);
  return renderWithProviders(<DownloadPage />);
};

const linkHrefs = () =>
  Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));

beforeEach(() => {
  mockTrack.mockClear();
});

describe('DownloadPage — parity phase A', () => {
  test('renders the shared public scaffold (header + footer), not a bare <main>', () => {
    renderAt();
    expect(document.querySelector('header')).toBeInTheDocument();
    expect(screen.getByTestId('seo-footer')).toBeInTheDocument();
  });

  test('home points at /local so the only exit returns to the app', () => {
    renderAt();
    const hrefs = linkHrefs();
    // Wordmark + "Home" nav item both.
    expect(hrefs.filter((h) => h === '/local').length).toBeGreaterThanOrEqual(2);
    // The bare marketing root must NOT be linked from an app-reachable page.
    expect(hrefs).not.toEqual(expect.arrayContaining(['/']));
  });

  test('still renders the heading and all three installer cards', () => {
    renderAt();
    expect(screen.getByText('download nunba')).toBeInTheDocument();
    const installers = linkHrefs().filter((h) =>
      /(Nunba_Setup\.exe|Nunba_Setup\.dmg|Nunba-x86_64\.AppImage)$/.test(h),
    );
    expect(installers).toHaveLength(3);
  });

  test('?ref= funnel attribution still fires after the wrap', () => {
    renderAt('?ref=partner42');
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'partner42', event: 'click', platform: 'web' }),
    );
  });

  test('no ref code means no tracking call (unchanged best-effort behaviour)', () => {
    renderAt();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
