/**
 * Parity phase A — /download is no longer a navigation dead-end.
 *
 * DownloadPage was registered in MainRoute.js OUTSIDE SocialLayout and rendered a
 * bare <main>.  Reaching it from the sidebar unmounted the entire app shell, so
 * the page had no header, no footer, and no link back — the user's reported
 * "there is no way to go back".  Nine sibling public pages already used the
 * shared PublicSeoPage scaffold; this one was the outlier.
 *
 * WHY THERE IS NO `homeTo` PROP HERE, and why that is the tested contract:
 *
 * The parity plan asserted the wrap alone was insufficient because SeoHeader
 * points home at "/", which "in a desktop app exits the app".  That premise is
 * FALSE and was checked rather than assumed: MainRoute.js:214 maps "/" to
 * <Agent key="root"> — the very same component "/local" renders at :236, whose
 * own comment reads "Local route for Nunba offline mode - same as root" — and
 * /news, /research, /listings are pages in this repo.  Every header destination
 * is served by Nunba's own Flask.  Nothing exits.
 *
 * "/local" is therefore not a safer home, it is a MODE: isLocalRoute drives
 * forceGuestMode on the auth modal and auto-opens login when unauthenticated
 * (Demopage.js:424, :5734).  Sending a mode-neutral page there would silently
 * move a signed-in online user into local mode — which is exactly what the plan
 * warns about when it says a hardcoded home destination is "wrong in both
 * directions".  Hence: default "/", asserted below, not merely left implicit.
 *
 * Also pinned: the ?ref= funnel attribution.  marketingApi.track() is why this
 * page exists — if a rewrite drops it, install attribution silently reads zero
 * and nothing in the UI looks wrong.
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

  test('offers a way back: home link present and pointing at the in-app root', () => {
    renderAt();
    const hrefs = linkHrefs();
    // Wordmark + "Home" nav item both target "/" — <Agent key="root">, served by
    // Nunba's own Flask.  This is the assertion that would have caught the
    // original defect: pre-fix there was no header, so no such link existed.
    expect(hrefs.filter((h) => h === '/').length).toBeGreaterThanOrEqual(2);
  });

  test('does NOT force local mode — "/local" is a mode switch, not a home', () => {
    renderAt();
    expect(linkHrefs()).not.toEqual(expect.arrayContaining(['/local']));
  });

  test('every HEADER destination stays inside the app (no off-app nav)', () => {
    renderAt();
    // Scoped to the header on purpose: the installer links in the body are
    // absolute GitHub-releases URLs and SHOULD be external.  What must not be
    // external is the navigation — an http(s) href in the header would mean the
    // "way back" leaves the product, the subtler form of the original defect.
    const header = document.querySelector('header');
    const navHrefs = Array.from(header.querySelectorAll('a[href]')).map((a) =>
      a.getAttribute('href'),
    );
    expect(navHrefs.length).toBeGreaterThan(0);
    expect(navHrefs.filter((h) => /^https?:\/\//.test(h))).toEqual([]);
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
