/**
 * Nunba desktop narrow-viewport layout — task #595.
 *
 * app.py creates the desktop window at 472x912 and the WebView2 client area
 * measures 458x904 (confirmed via Win32 EnumChildWindows on the live frozen
 * build), so 458 CSS px is the app's OWN default width — not an edge case.
 *
 * At that width a PrintWindow capture of the running app shows three unrelated
 * elements clipped at exactly the right edge: the "Hive" mode pill (cut
 * mid-word), the greeting bubble, and the setup card's progress bar. Three
 * independent components clipping at the same x = horizontal overflow.
 *
 * WHY CYPRESS AND NOT THE CHROME EXTENSION: Chrome enforces a ~515px minimum
 * WINDOW width on Windows, so 458 is unreachable by resizing a real browser
 * window (measured: SetWindowPos(474) -> 515). cy.viewport() has no such floor.
 *
 * This spec MEASURES rather than asserts, by design — the offending element is
 * not yet known, and a hard-failing spec would break the CI gate for everyone
 * before there is a fix to gate.
 *
 * !! READ THE `reachedChat` FLAG IN cypress/reports/595-overflow.json !!
 * A fresh Cypress profile lands on the first-run LANGUAGE PICKER, not the chat
 * view. As of 2026-08-03 reachChatView() does NOT successfully clear it, so the
 * measurement is of the WRONG SCREEN and `overflow: 0` means nothing about
 * #595. The first version of this spec reported overflow=0 with all three
 * target elements ABSENT and that looked like a clean bill of health — it was
 * the onboarding page. Do not close #595 on a run where reachedChat is false.
 *
 * TO FINISH THIS: make reachChatView() actually reach chat — most likely by
 * seeding the app's language/onboarding state directly (localStorage or the
 * hart_language.json equivalent the SPA reads) rather than clicking through,
 * since the click path did not advance the picker.
 */

// Nunba serves the built SPA on :5000; cypress.config baseUrl points at the
// CRA dev server on :3000. Target the real app unless told otherwise.
const APP = Cypress.env('NUNBA_URL') || 'http://127.0.0.1:5000';

// Real WebView2 client area of the desktop window (Win32-measured).
const NUNBA_W = 458;
const NUNBA_H = 904;

const stubBaseline = () => {
  cy.intercept('GET', '**/api/social/resonance/wallet', {statusCode: 200, body: {success: true, data: null}});
  cy.intercept('GET', '**/api/social/onboarding/progress', {statusCode: 200, body: {success: true}});
  cy.intercept('GET', '**/api/social/notifications*', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/api/social/encounters/suggestions', {statusCode: 200, body: {success: true, data: []}});
};

/**
 * Get past first-run onboarding to the actual chat view.
 *
 * A fresh Cypress profile lands on the language picker ("What language feels
 * like home?"), NOT the chat screen. Measuring there is measuring the wrong
 * page — the first version of this spec reported overflow=0 with all three
 * target elements ABSENT, which looked like a clean bill of health and was
 * simply the wrong screen. Always assert we reached chat before measuring.
 */
const reachChatView = () => {
  cy.get('body', {timeout: 30000}).should('exist');
  cy.wait(1500);
  cy.get('body').then(($b) => {
    if (/language feels like home/i.test($b.text())) {
      cy.contains('English', {timeout: 10000}).click({force: true});
      cy.wait(2500);
    }
  });
  // Continue through any further onboarding gates that expose an obvious CTA.
  cy.get('body').then(($b) => {
    const t = $b.text();
    if (/Use Hevolve Agent for Free/i.test(t)) {
      cy.contains(/Use Hevolve Agent for Free/i).click({force: true});
      cy.wait(2500);
    }
  });
  cy.wait(2500);
};

/** Widest elements whose right edge escapes the viewport. */
const measureOverflow = (win) => {
  const d = win.document;
  const vw = d.documentElement.clientWidth;
  const sw = Math.max(d.documentElement.scrollWidth, d.body.scrollWidth);
  const offenders = [...d.querySelectorAll('*')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cls = (typeof el.className === 'string' && el.className)
        ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
        : '';
      return {sel: (el.tagName + cls).slice(0, 100), right: Math.round(r.right), width: Math.round(r.width)};
    })
    // >1px tolerance: sub-pixel rounding routinely puts elements 0.5px over.
    .filter((x) => x.right > vw + 1)
    .sort((a, b) => b.right - a.right);
  return {viewport: vw, scrollWidth: sw, overflow: sw - vw, offenders};
};

describe('#595 desktop narrow-viewport overflow', () => {
  it(`measures horizontal overflow at the app's own ${NUNBA_W}px width`, () => {
    stubBaseline();
    cy.viewport(NUNBA_W, NUNBA_H);
    cy.visit(`${APP}/local`, {failOnStatusCode: false});
    reachChatView();

    cy.window().then((win) => {
      const r = measureOverflow(win);
      cy.log(`viewport=${r.viewport} scrollWidth=${r.scrollWidth} overflow=${r.overflow}px`);
      // eslint-disable-next-line no-console
      console.log('[#595] ' + JSON.stringify(r, null, 2));
      cy.task('log', `[#595] viewport=${r.viewport} scrollWidth=${r.scrollWidth} overflow=${r.overflow}px offenders=${r.offenders.length}`, {log: false})
        .then(() => {}, () => {});   // cy.task('log') is optional; ignore if unregistered
      r.offenders.slice(0, 12).forEach((o) => {
        cy.log(`  overflow +${o.right - r.viewport}px  w=${o.width}  ${o.sel}`);
      });

      // The three elements the PrintWindow capture showed clipped. If they are
      // present AND in-bounds here, the capture — not the layout — was wrong.
      const probe = (label, pred) => {
        const el = [...win.document.querySelectorAll('*')].find(pred);
        if (!el) return `${label}: ABSENT`;
        const r2 = el.getBoundingClientRect();
        return `${label}: right=${Math.round(r2.right)} (vw=${r.viewport}) ${r2.right > r.viewport + 1 ? 'CLIPPED' : 'in-bounds'}`;
      };
      const report = [
        probe('Hive pill', (e) => e.children.length === 0 && (e.textContent || '').trim() === 'Hive'),
        probe('greeting bubble', (e) => (e.textContent || '').includes("Hey! I'm Nunba")),
        probe('setup card', (e) => /Setting up|Installing/i.test((e.textContent || '')) && e.children.length === 0),
      ];
      report.forEach((line) => cy.log(line));
      // Persist to disk: cy.log goes to the Cypress UI and page console.log is
      // not reliably forwarded to stdout in headless runs, so neither is usable
      // as evidence from a terminal.
      const reachedChat = !/language feels like home/i.test(win.document.body.innerText || '');
      if (!reachedChat) {
        cy.log('!! STILL ON ONBOARDING — this measurement does NOT cover the chat view');
      }
      cy.writeFile('cypress/reports/595-overflow.json', {
        reachedChat,
        meaningful: reachedChat,
        note: reachedChat
          ? 'measured the chat view'
          : 'MEASURED THE ONBOARDING LANGUAGE PICKER — overflow figure says nothing about #595',
        viewport: r.viewport,
        scrollWidth: r.scrollWidth,
        overflow: r.overflow,
        offenderCount: r.offenders.length,
        offenders: r.offenders.slice(0, 15),
        probes: report,
        bodyTextLen: (win.document.body.innerText || '').length,
        bodyTextHead: (win.document.body.innerText || '').slice(0, 300),
      });
      expect(r.viewport, 'cy.viewport must actually apply — Chrome window minimums do not bind here')
        .to.equal(NUNBA_W);
    });
  });

  it('does not overflow at desktop width (control — proves the bug is width-specific)', () => {
    stubBaseline();
    cy.viewport(1280, 800);
    cy.visit(`${APP}/local`, {failOnStatusCode: false});
    reachChatView();
    cy.window().then((win) => {
      const r = measureOverflow(win);
      cy.log(`control: viewport=${r.viewport} overflow=${r.overflow}px`);
      expect(r.overflow, 'layout is clean at desktop width').to.be.at.most(1);
    });
  });

  // ARM THIS WHEN #595 IS FIXED — it is the regression guard.
  // Left skipped deliberately: Cypress is hard-gated in CI (see CLAUDE.md), so
  // landing a knowingly-red spec would break the gate for everyone before a fix
  // exists. Flip .skip -> normal in the same commit that fixes the layout.
  it.skip(`[ARM ON FIX] no horizontal overflow at ${NUNBA_W}px`, () => {
    stubBaseline();
    cy.viewport(NUNBA_W, NUNBA_H);
    cy.visit(`${APP}/local`, {failOnStatusCode: false});
    reachChatView();
    cy.window().then((win) => {
      const r = measureOverflow(win);
      const worst = r.offenders.slice(0, 5).map((o) => `${o.sel} (+${o.right - r.viewport}px)`).join(', ');
      expect(r.overflow, `overflows by ${r.overflow}px at ${r.viewport}px. Widest: ${worst}`)
        .to.be.at.most(1);
    });
  });
});
