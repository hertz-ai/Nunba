/**
 * Parity phase A — the shared public header must be able to point "home" at the APP.
 *
 * The reported defect was "no way to go back to the admin page" from /download.
 * DownloadPage was registered OUTSIDE SocialLayout as a bare <main>, so clicking
 * "Download" in the sidebar unmounted the whole shell and left the user on a page
 * with zero navigation.
 *
 * The obvious fix — wrap it in PublicSeoPage like the nine sibling public pages —
 * was NOT sufficient on its own, and that is what these tests exist to protect.
 * SeoHeader hardcoded `to="/"` for both the wordmark and its "Home" nav item, and
 * PublicSeoPage exposed no destination prop. In a desktop app, a page whose only
 * exit is "/" throws the user OUT of the app — the same headless dead-end in a
 * subtler costume.
 *
 * So `homeTo` is a PARAMETER with default '/':
 *   - web's nine existing consumers keep rendering byte-identically (a REQUIRED
 *     prop would have broken all nine),
 *   - Nunba's app-reachable pages pass '/local'.
 *
 * Per the user's stated design intent (2026-08-11): "/" resolves online when
 * available and degrades to /local, so /local is the safe home for a
 * Nunba-reachable page.
 */
import PublicSeoPage from '../../../components/shared/PublicSeoPage';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// SeoFooter pulls in unrelated marketing deps; the contract under test is the
// header's home destination.
jest.mock('../../../components/shared/SeoFooter', () => {
  const MockSeoFooter = () => <div data-testid="seo-footer" />;
  return MockSeoFooter;
});

const renderPage = (props = {}) =>
  render(
    <MemoryRouter>
      <PublicSeoPage heading="test heading" {...props}>
        <div>body</div>
      </PublicSeoPage>
    </MemoryRouter>,
  );

const homeHrefs = () =>
  Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href'))
    .filter((h) => h === '/' || h === '/local');

describe('PublicSeoPage homeTo', () => {
  test('defaults to "/" so the nine existing web consumers are unchanged', () => {
    renderPage();
    const hrefs = homeHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs).toEqual(expect.arrayContaining(['/']));
    expect(hrefs).not.toEqual(expect.arrayContaining(['/local']));
  });

  test('routes the wordmark AND the Home nav item to homeTo when given', () => {
    renderPage({ homeTo: '/local' });
    const hrefs = homeHrefs();
    // Both affordances must move together — a wordmark that still points at "/"
    // while the nav says /local is exactly the kind of half-fix that leaves the
    // user one misclick from being thrown out of the app.
    expect(hrefs.filter((h) => h === '/local').length).toBeGreaterThanOrEqual(2);
    expect(hrefs).not.toEqual(expect.arrayContaining(['/']));
  });

  test('still renders the page heading (scaffold not broken by the prop)', () => {
    renderPage({ homeTo: '/local' });
    expect(screen.getByText('test heading')).toBeInTheDocument();
  });

  test('renders children', () => {
    renderPage();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
