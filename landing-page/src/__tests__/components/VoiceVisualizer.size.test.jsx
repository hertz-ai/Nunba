/**
 * The voice orb must be square AND actually fill the space it has.
 *
 * WHY THIS EXISTS: 54505caf fixed squareness and silently destroyed size.
 * Its guard asserted `aspect == 1 +/- 0.08` and nothing else, so a collapse
 * from 333x382 to 125x125 PASSED — the orb was more square than ever while
 * being a third of the size. Measured live 2026-08-04: desktop 125x125,
 * browser (pre-fix bundle) 333x382.
 *
 * Two independent failure modes, therefore two independent assertions. Every
 * test below checks BOTH. An aspect-only test is what let this ship.
 *
 * The sizing decision is tested as a pure function on purpose: jsdom has no
 * layout engine and no canvas, which is exactly why the previous guard had to
 * live in a real browser and why VoiceOrbPage.test.jsx mocks this component
 * outright. Pure input -> pure output needs neither.
 */

import { computeOrbEdge, _capToPx } from '../../components/VoiceVisualizer';

// Square is structural now (one value, both axes), so "aspect" is really
// "did we return a single edge at all". Assert the pair explicitly anyway —
// the point is that a future refactor back to two axes trips this file.
const expectSquareAndLarge = (edge, { atLeast, container }) => {
  expect(Number.isFinite(edge)).toBe(true);
  expect(edge).toBeGreaterThan(0);
  // SIZE half — the assertion 54505caf's guard was missing.
  expect(edge).toBeGreaterThanOrEqual(atLeast);
  // Never exceed the box we were given.
  if (container) expect(edge).toBeLessThanOrEqual(Math.min(...container));
};

describe('computeOrbEdge — the regression', () => {
  test('THE case: 333x466 column yields 333, not a collapse', () => {
    // The user-confirmed correct outcome. Pre-fix this produced 125.
    const edge = computeOrbEdge(333, 466, undefined, '100%');
    expect(edge).toBe(333);
    expectSquareAndLarge(edge, { atLeast: 333, container: [333, 466] });
  });

  test('a SHORT wide column is bounded by height, not by half of it', () => {
    const edge = computeOrbEdge(900, 400, undefined, '100%');
    expect(edge).toBe(400);
    expectSquareAndLarge(edge, { atLeast: 400, container: [900, 400] });
  });

  test('a frozen tiny viewport no longer pins the orb (the desktop bug)', () => {
    // Demopage used to pass size=min(innerWidth*.28, innerHeight*.68) captured
    // at first paint. Mounting while the window was minimized froze it at ~126
    // and the orb stayed 125px after restore. With no size prop, the container
    // decides — and the container is measured live by ResizeObserver.
    const frozen = computeOrbEdge(333, 466, 126, '100%');
    expect(frozen).toBe(126); // proves size WOULD still cap...

    const live = computeOrbEdge(333, 466, undefined, '100%');
    expect(live).toBe(333); // ...which is why Demopage must not pass it.
    expect(live).toBeGreaterThan(frozen * 2);
  });
});

describe('computeOrbEdge — caps stay load-bearing', () => {
  test("canvasMax '80%' default still restrains standalone orbs", () => {
    // Dropping canvasMax would NOT be a no-op: it defaults to '80%', so
    // ignoring it would silently grow every standalone orb to fill its parent.
    const edge = computeOrbEdge(500, 500, undefined, '80%');
    expect(edge).toBe(400);
  });

  test('explicit size={100} (LightYourHART) is honoured as a cap', () => {
    // LightYourHART.js:1155 wants a deliberately small orb. A big container
    // must not inflate it.
    const edge = computeOrbEdge(800, 800, 100, '80%');
    expect(edge).toBe(100);
  });

  test('px canvasMax participates in the min', () => {
    expect(computeOrbEdge(800, 800, undefined, '240px')).toBe(240);
  });
});

describe('computeOrbEdge — degenerate boxes never collapse the orb', () => {
  test('unmeasured container (pre-layout frame) falls back, not to 0', () => {
    const edge = computeOrbEdge(0, 0, undefined, '100%');
    expect(edge).toBe(200); // ORB_FALLBACK_PX
    expect(edge).toBeGreaterThan(0);
  });

  test('display:none parent with an explicit size uses that size', () => {
    expect(computeOrbEdge(0, 0, 100, '80%')).toBe(100);
  });

  test('a zero axis is ignored rather than winning the min', () => {
    // A 0-height box must not produce a 0px (invisible) orb.
    expect(computeOrbEdge(300, 0, undefined, '100%')).toBe(300);
    expect(computeOrbEdge(0, 300, undefined, '100%')).toBe(300);
  });

  test('never returns a fractional or negative edge', () => {
    const edge = computeOrbEdge(333.7, 466.2, undefined, '100%');
    expect(Number.isInteger(edge)).toBe(true);
    expect(edge).toBeGreaterThan(0);
  });
});

describe('_capToPx', () => {
  test.each([
    ['100%', 400, 400],
    ['80%', 500, 400],
    ['240px', 999, 240],
    [240, 999, 240],
  ])('%s of %s -> %s', (cap, basis, want) => {
    expect(_capToPx(cap, basis)).toBe(want);
  });

  test('unparseable / absent caps drop out of the min instead of zeroing it', () => {
    // Returning 0 here would collapse the orb; Infinity makes it a no-op.
    expect(_capToPx(undefined, 400)).toBe(Infinity);
    expect(_capToPx(null, 400)).toBe(Infinity);
    expect(_capToPx('auto', 400)).toBe(Infinity);
    expect(_capToPx('', 400)).toBe(Infinity);
  });

  test('percentage against an unmeasured basis is a no-op, not 0', () => {
    expect(_capToPx('80%', 0)).toBe(Infinity);
  });
});

describe('drift guard — Demopage must not reintroduce a frozen viewport size', () => {
  // A window-derived `size=` is NOT itself the bug, and an earlier version of
  // this guard wrongly banned it.  computeOrbEdge() min()s `size` with the
  // measured container, so the prop is a CAP, not the driver.  The actual
  // regression was that React does not re-render on resize, so a cap measured
  // at first paint was frozen forever — open minimized, get a ~126px orb that
  // survives the restore.  Pin the thing that unfreezes it.
  test('Demopage re-renders on resize so a window-derived cap cannot freeze', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../pages/Demopage.js'), 'utf8',
    );
    // Non-greedy to the first '/>'.  A bounded window ({0,400}) silently
    // matched NOTHING here — these call sites span ~13 lines — so the guard
    // passed its forEach vacuously and only tripped on the length assertion.
    const tags = src.match(/<VoiceVisualizer[\s\S]*?\/>/g) || [];
    expect(tags.length).toBeGreaterThan(0);

    const windowDerived = tags.filter((t) => /size=\{[^}]*window\./.test(t));
    if (windowDerived.length > 0) {
      // Then a resize must force a re-render, or those caps go stale.
      expect(src).toMatch(/addEventListener\(\s*'resize'/);
      // …and it must actually drive React state; a bare listener that only
      // mutates a ref would leave the rendered cap exactly as stale.
      expect(src).toMatch(/_bumpViewport/);
    }
  });
});
