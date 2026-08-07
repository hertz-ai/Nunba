/**
 * #592 — the voice orb must actually fill the media column in LANDSCAPE.
 *
 * WHY DOM-MEASURED AND NOT EYEBALLED: a PrintWindow screenshot silently cropped
 * 31% earlier today and manufactured two false UI bugs on this very component
 * (see memory/feedback_printwindow_dpi_trap.md). Layout claims come from
 * getBoundingClientRect, never from a picture.
 *
 * THE REGRESSION THIS PINS. Demopage sizes the orb as
 *     Math.min(innerWidth * 0.28, innerHeight * 0.68)
 * and passes canvasMax="100%" (72780cd4, 2026-06-24). Before that the orb was
 * hard-capped at 160/200px, so on a wide window it rendered as a dot in a large
 * empty column. A 2026-08-03 screenshot of the SHIPPED build measured ~180px in
 * a 2557px-wide window — i.e. the installed app still had the pre-72780cd4 cap,
 * because the SPA is frozen into the bundle by setup_freeze_nunba.py:656 and an
 * npm build alone never reaches it.
 *
 * The assertion is deliberately a RATIO, not a pixel count: it must hold at any
 * landscape size and must fail for the old constant cap.
 */

const APP = Cypress.env('APP_URL') || 'http://localhost:5000';

/** Landscape desktop. 0.28 * 1920 = 537.6 -> the constraining dimension. */
const W = 1920;
const H = 1080;

const seedHart = (win) => {
  // Agent.js:285 gates on hartSealed <- useAuthSession.js:118 reads
  // localStorage 'hart_sealed'. Without this we measure the first-run language
  // picker and the orb is simply absent — which a naive spec reads as "pass".
  win.localStorage.setItem('hart_sealed', 'true');
  win.localStorage.setItem('hart_language', 'en');
  win.localStorage.setItem('hart_name', 'CypressProbe');
  win.localStorage.setItem('hart_emoji', '✨');
  win.localStorage.setItem('guest_mode', 'true');
  win.localStorage.setItem('guest_user_id', 'cypress-592-probe');
  // Audio Only -> the VoiceVisualizer branch (mediaMode === 'audio').
  // The key is `nunba_media_mode` — Demopage.js:636 reads exactly that, and
  // :741 writes it. This spec previously seeded `mediaMode`, which no component
  // ever reads: a seed that looks deliberate and does nothing. It "worked" only
  // because 'audio' is the `|| 'audio'` default, so the test passed for a
  // reason unrelated to what it claimed to set up — and setting VIDEO mode the
  // same way would silently have measured audio mode instead.
  win.localStorage.setItem('nunba_media_mode', 'audio');
};

/** Seed as above but in video mode, to compare column footprints (#617a). */
const seedHartVideo = (win) => {
  seedHart(win);
  win.localStorage.setItem('nunba_media_mode', 'video');
};

/**
 * The media column is the element Demopage.js:5211-5219 sizes with `w-[30%]`
 * for BOTH video and audio (and w-0 for text). Locate it structurally — as the
 * positioned ancestor of the orb/video — rather than by class string, so a
 * Tailwind refactor does not silently turn this into a no-op selector.
 */
const mediaColumnOf = (el) => {
  let n = el.parentElement;
  while (n && !(n.className || '').toString().includes('justify-center')) n = n.parentElement;
  return n;
};

const stub = () => {
  cy.intercept('GET', '**/api/social/peers', {statusCode: 200, body: {success: true, peers: [], count: 0, remote_count: 0}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {status: 'ok'}});
};

describe('#592 voice orb fills the media column in landscape', () => {
  beforeEach(() => {
    stub();
    cy.viewport(W, H);
    cy.visit(`${APP}/local`, {failOnStatusCode: false, onBeforeLoad: seedHart});
  });

  /**
   * PRECONDITION for every measurement below: the bundle the page is EXECUTING
   * must be one the server actually serves.
   *
   * This is not hypothetical. On 2026-08-05, Chrome on the dev box executed
   * /static/js/main.66d05810.js — 2,472,483 bytes of it — while the server
   * 404'd that exact path and served main.04ab9965.js to every other client.
   * Byte-level confirmed: same URL, same length (20593), same offset (12337),
   * eight different characters. A second Flask on :5000, service workers,
   * Cache Storage and HTTP caching were each ruled out by direct test; the
   * Chrome-side mechanism was never identified.
   *
   * A whole session was spent measuring that phantom and reasoning about code
   * that had not shipped in days (see memory/feedback_vacuous_guards.md).
   *
   * Deliberately NOT a hardcoded hash — that would go stale on every build and
   * become the next false failure. Assert the PROPERTY: whatever bundle this
   * page is running, the server can serve it. A browser executing a 404 fails
   * here instead of silently producing numbers about dead code.
   */
  const assertLiveBundle = () =>
    cy.document().then((doc) => {
      const el = [...doc.querySelectorAll('script[src]')].find((s) => /main\.[0-9a-f]{6,}\.js/.test(s.src));
      expect(el, 'a main.<hash>.js bundle should be on the page').to.exist;
      const path = new URL(el.src).pathname;
      return cy.request({url: `${APP}${path}`, failOnStatusCode: false}).then((res) => {
        expect(
          res.status,
          `page is executing ${path} but the server answers ${res.status} for it — ` +
          'measuring this DOM would describe code that is not shipped',
        ).to.eq(200);
      });
    });

  it('renders the orb canvas at a usable fraction of the viewport', () => {
    // The orb is a <canvas> inside the media column.
    cy.get('canvas', {timeout: 20000}).should('exist');
    assertLiveBundle();

    cy.get('canvas').then(($c) => {
      // Pick the largest canvas — other canvases (charts) may exist.
      let best = null;
      $c.each((_i, el) => {
        const r = el.getBoundingClientRect();
        if (!best || r.width * r.height > best.width * best.height) best = r;
      });

      const report = {
        viewport: {w: W, h: H},
        orb: {w: Math.round(best.width), h: Math.round(best.height)},
        widthRatio: +(best.width / W).toFixed(4),
        expectedMin: 0.15,
        oldCappedPx: 200,
      };
      // Write BEFORE asserting, and assert INSIDE the .then so the queued
      // write actually runs. A bare synchronous expect() throws before
      // Cypress drains the command queue, so the report never lands and a
      // failing run tells you nothing about the numbers — which is exactly
      // what happened on the first run of this spec.
      cy.writeFile('cypress/reports/592-orb-landscape.json', report).then(() => {
        cy.log(JSON.stringify(report));

        // Old behaviour: a constant 160-200px cap => ratio ~0.10 at 1920.
        // New behaviour: min(0.28*1920, 0.68*1080) = 537.6 => ratio ~0.28.
        // 0.15 sits cleanly between the two, so this fails on the old cap and
        // passes on the fix without being brittle about exact px.
        expect(
          best.width,
          `orb ${Math.round(best.width)}px in a ${W}px viewport — the pre-72780cd4 build capped it at ~160-200px`,
        ).to.be.greaterThan(W * 0.15);

        // Square: the 80% canvasMax on a non-square column used to distort it.
        const aspect = best.width / best.height;
        expect(
          aspect,
          `orb ${Math.round(best.width)}x${Math.round(best.height)} — aspect ${aspect.toFixed(3)}, should be square`,
        ).to.be.closeTo(1, 0.08);
      });
    });
  });

  /**
   * #617a, second half — the VISIBLE orb, not the canvas box.
   *
   * WHY A SEPARATE TEST.  Every other measurement here reads
   * getBoundingClientRect, which describes the <canvas> ELEMENT.  The user
   * cannot see that element; they see the circle painted inside it.  Those
   * two numbers were 478px and 239px on the shipped build — the canvas filled
   * its column perfectly while the orb looked like a dot, and every existing
   * assertion passed.  A DOM-only spec is structurally blind to this: it can
   * only ever confirm the box, never the pixels.
   *
   * So read the pixels.  getImageData is available because the canvas is
   * painted with same-origin drawing calls only (no external images), so it
   * is never tainted.
   *
   * The ratio is deliberate rather than a pixel count: it must hold at any
   * landscape size.  Pre-fix the lit extent was ~0.65 of the canvas
   * (baseR = 0.25W => a circle half the canvas, plus the +70 glow); post-fix
   * (fill = 0.38) it is ~0.91.  0.75 sits between the two, so this test is
   * RED on the old build and GREEN on the new one.
   */
  it('#617a the painted orb — not just its canvas — fills the column', () => {
    cy.get('canvas', {timeout: 20000}).should('exist');
    assertLiveBundle();

    cy.get('canvas').then(($c) => {
      let el = null;
      $c.each((_i, n) => {
        const r = n.getBoundingClientRect();
        if (!el || r.width * r.height >
            el.getBoundingClientRect().width * el.getBoundingClientRect().height) el = n;
      });

      const w = el.width, h = el.height;          // backing store
      const ctx = el.getContext('2d');
      const data = ctx.getImageData(0, 0, w, h).data;
      // Alpha 40/255: catches the ring and its fill, ignores the faintest
      // tail of the outer glow so the number tracks the orb people see.
      const A = 40;
      let minX = w, maxX = -1, minY = h, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > A) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const litW = maxX - minX + 1, litH = maxY - minY + 1;
      const report = {
        canvasBacking: {w, h},
        canvasCss: {w: Math.round(el.getBoundingClientRect().width)},
        litExtent: {w: litW, h: litH},
        litFraction: +(litW / w).toFixed(3),
        alphaThreshold: A,
      };
      cy.writeFile('cypress/reports/617-orb-painted.json', report).then(() => {
        cy.log(JSON.stringify(report));
        expect(maxX, 'nothing was painted on the orb canvas').to.be.greaterThan(-1);
        expect(
          litW / w,
          `painted orb spans ${litW}px of a ${w}px canvas ` +
          `(${(100 * litW / w).toFixed(1)}%) — it must fill the canvas, not sit as a dot inside it`,
        ).to.be.greaterThan(0.75);
        // Still round: a non-square lit box means one axis got stretched.
        expect(
          litW / litH,
          `painted orb ${litW}x${litH} — should stay circular`,
        ).to.be.closeTo(1, 0.1);
      });
    });
  });

  /**
   * #617(a), the user's words: "orb width must equal the RIGHT PANEL width —
   * the same footprint the IDLE VIDEO fills in video mode. Switching modes must
   * not change the column's visual width."
   *
   * Two separable claims, measured separately because they can fail apart:
   *   1. the COLUMN is the same width in audio and video mode
   *   2. the ORB fills that column
   *
   * Claim 1 is structural — Demopage.js:5214 gives both modes `w-[30%]`. Claim 2
   * is the one that can drift, and the numbers are reported either way so a
   * failure says how far off it is rather than just "not equal".
   */
  it('#617a media column is the same width in audio and video mode', () => {
    const measure = (seed) =>
      cy.visit(`${APP}/local`, {failOnStatusCode: false, onBeforeLoad: seed})
        .then(() => cy.get('canvas, video', {timeout: 20000}).should('exist'))
        .then(($el) => {
          const col = mediaColumnOf($el[0]);
          expect(col, 'media column ancestor should be findable').to.exist;
          return {col: col.getBoundingClientRect().width, inner: $el[0].getBoundingClientRect().width};
        });

    measure(seedHart).then((audio) => {
      measure(seedHartVideo).then((video) => {
        const report = {
          viewport: {w: W, h: H},
          audio: {columnW: Math.round(audio.col), orbW: Math.round(audio.inner)},
          video: {columnW: Math.round(video.col)},
          columnDeltaPx: Math.round(Math.abs(audio.col - video.col)),
          orbFillsColumn: +(audio.inner / audio.col).toFixed(3),
        };
        cy.writeFile('cypress/reports/617-column-parity.json', report).then(() => {
          cy.log(JSON.stringify(report));
          // Claim 1: switching modes must not change the column width.
          expect(
            Math.abs(audio.col - video.col),
            `media column ${Math.round(audio.col)}px in audio vs ${Math.round(video.col)}px in video`,
          ).to.be.lessThan(2);

          // Claim 2 — THE ONE THE USER ACTUALLY ASKED FOR, and until now the
          // one this spec computed and then threw away.  `orbFillsColumn` was
          // written to the report and never asserted, so "#617a passes" only
          // ever meant "both modes use the same w-[30%] class" — a string
          // shared by both branches, i.e. an assertion that cannot fail for
          // the defect it is named after.  Assert the ratio.
          expect(
            audio.inner / audio.col,
            `orb ${Math.round(audio.inner)}px in a ${Math.round(audio.col)}px column ` +
            `(${(100 * audio.inner / audio.col).toFixed(1)}%) — the orb must fill the media column`,
          ).to.be.greaterThan(0.95);
        });
      });
    });
  });

  /**
   * #617(b): "the whole icon list sits UNDER the orb column and wraps to the
   * next row Claude-style when width is insufficient (flex-wrap, dynamic)."
   *
   * ChatInputBar.js:164 is `flex flex-wrap sm:flex-nowrap`, i.e. wrapping is
   * gated on the 640px breakpoint rather than on whether the icons actually
   * fit. That is a class string though, not behaviour — so measure it: count
   * distinct rows by grouping the composer's buttons on their top offset, and
   * record whether the row overflows its container at each width.
   *
   * Buttons are found structurally (all buttons in the bottom third, grouped
   * by geometry) rather than by class or aria-label, so this cannot silently
   * become a no-op selector — the failure mode the dead `mediaMode` seed in
   * this same file already demonstrated.
   *
   * REPORTS BEFORE IT ASSERTS. The point is to characterise real behaviour
   * across widths; a bare pass/fail would hide whether icons wrap, shrink, or
   * spill.
   */
  it('#617b characterise icon-strip wrapping across widths', () => {
    const widths = [1920, 1100, 800, 700, 640, 560, 420];
    const rows = [];

    const measureAt = (w) =>
      cy.viewport(w, 900)
        .then(() => cy.visit(`${APP}/local`, {failOnStatusCode: false, onBeforeLoad: seedHart}))
        .then(() => cy.get('textarea[placeholder="Message..."]', {timeout: 20000}).should('exist'))
        .then(($ta) => {
          // composer root = nearest ancestor that also contains buttons
          let root = $ta[0].parentElement;
          while (root && root.querySelectorAll('button').length < 3) root = root.parentElement;
          if (!root) return {w, rows: null, note: 'composer root not found'};
          const btns = [...root.querySelectorAll('button')]
            .map((b) => b.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0);
          const tops = [...new Set(btns.map((r) => Math.round(r.top / 6) * 6))];
          const rowRect = root.getBoundingClientRect();
          const rightmost = Math.max(...btns.map((r) => r.right));
          // #617b's OTHER half: "the icon list sits UNDER the orb column".
          // Measure horizontal overlap between the strip and the media column
          // — "under" means sharing the column's x-range, not merely being
          // lower down the page. Reported as a fraction of the strip's own
          // width so the number means the same thing at every viewport.
          const orb = $ta[0].ownerDocument.querySelector('canvas');
          const col = orb ? mediaColumnOf(orb) : null;
          let underColumn = null;
          if (col) {
            const c = col.getBoundingClientRect();
            const sL = Math.min(...btns.map((r) => r.left));
            const sR = rightmost;
            const overlap = Math.max(0, Math.min(sR, c.right) - Math.max(sL, c.left));
            underColumn = {
              stripX: [Math.round(sL), Math.round(sR)],
              columnX: [Math.round(c.left), Math.round(c.right)],
              overlapFrac: +(overlap / Math.max(1, sR - sL)).toFixed(3),
            };
          }
          return {
            w,
            buttons: btns.length,
            rowCount: tops.length,
            overflowsPx: Math.round(Math.max(0, rightmost - rowRect.right)),
            underColumn,
          };
        })
        .then((r) => rows.push(r));

    widths.reduce((chain, w) => chain.then(() => measureAt(w)), cy.wrap(null)).then(() => {
      cy.writeFile('cypress/reports/617b-icon-wrap.json', {viewportHeights: 900, rows}).then(() => {
        cy.log(JSON.stringify(rows));
        // The only hard requirement: icons must never spill outside their
        // container at ANY width. Whether they achieve that by wrapping or by
        // shrinking is a design choice; silently overflowing is not.
        const spilling = rows.filter((r) => r && r.overflowsPx > 2);
        expect(
          spilling.map((r) => `${r.w}px:+${r.overflowsPx}`).join(' '),
          'icon strip overflows its container at these widths',
        ).to.eq('');

        // #617b's ACTUAL requirement: "the WHOLE icon list sits UNDER the
        // orb column".  The previous bar here — bbox overlapFrac >= 0.05 —
        // was satisfiable by the ml-auto Send button ALONE: Send sat under
        // the column, the ten icons stayed bunched at the far left, and the
        // strip's bounding box spanned the gap, scoring 0.27.  Verified on
        // the 2026-08-07 install: the shipped layout passed this spec while
        // visibly contradicting the requirement.  A bar the wrong layout
        // clears is not a guard, so the assertion is now CONTAINMENT: at
        // wide viewports every button must sit inside the column's x-range
        // (±8px for rounding).  Below 1100px the column is narrower than
        // the strip and containment is geometrically impossible; those
        // widths stay report-only, as before.
        const wide = rows.filter((r) => r && r.w >= 1100 && r.underColumn);
        expect(wide.length, 'expected measurements at >=1100px').to.be.greaterThan(0);
        const notUnder = wide.filter((r) =>
          r.underColumn.stripX[0] < r.underColumn.columnX[0] - 8
          || r.underColumn.stripX[1] > r.underColumn.columnX[1] + 8);
        expect(
          notUnder
            .map((r) => `${r.w}px: strip x${r.underColumn.stripX} vs column x${r.underColumn.columnX}`)
            .join(' | '),
          'the whole icon strip must sit INSIDE the orb column x-range at these widths',
        ).to.eq('');
      });
    });
  });

  it('composer is dark, not the cream #fff8ea (#233 revert guard)', () => {
    cy.get('textarea[placeholder="Message..."]', {timeout: 20000})
      .should('exist')
      .then(($t) => {
        const bg = getComputedStyle($t[0]).backgroundColor;
        // #fff8ea === rgb(255, 248, 234)
        expect(bg, `composer background ${bg}`).to.not.eq('rgb(255, 248, 234)');
        // and it should be genuinely dark
        const m = bg.match(/\d+/g).map(Number);
        const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        expect(lum, `composer luminance ${lum.toFixed(3)} — should be a dark surface`).to.be.lessThan(0.5);
      });
  });
});
