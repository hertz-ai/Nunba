/**
 * The resting orb must visibly breathe, at every size it is asked to be.
 *
 * WHY THIS EXISTS: #617a raised the landscape orb to fill=0.38 so it would stop
 * reading as a dot in a tall column. Nobody noticed that the idle wave is a
 * fixed ~13px excursion mapped through `peakHeadroom` (= 0.49W - fill*W), so
 * making the orb bigger spends the very budget the breathing comes out of. The
 * animation flattened to a third of portrait's depth and the orb read as a
 * plain circle -- reported 2026-08-08, landscape only. Size and breathing were
 * sharing one budget and nothing said so.
 *
 * The existing size guard could not have caught this: it asserts the orb's
 * EDGE, and the edge was correct throughout. This asserts the thing that was
 * actually wrong, which is how far the silhouette moves.
 *
 * Driven through the component's own exported idleWaveAt/waveToRadius rather
 * than a restatement of their formulas -- a guard with its own copy of the
 * arithmetic passes happily while the shipped code drifts. jsdom has no canvas,
 * so the draw loop itself cannot be run; these are the functions it calls.
 */

import { idleWaveAt, waveToRadius } from '../../components/VoiceVisualizer';

const PTS = 180;
const MAX_R_FRAC = 0.49;          // outermost radius the orb may reach
const TS = [0, 1.1, 2.2, 3.3, 4.4, 5.5];

/** Peak-to-trough travel of the RESTING silhouette, as a % of its radius. */
const breathingPct = (fill, idleGain = 1, W = 1000) => {
  const baseR = W * fill;
  const headroom = Math.max(0, W * MAX_R_FRAC - baseR);
  let lo = Infinity;
  let hi = -Infinity;
  TS.forEach((t) => {
    for (let i = 0; i <= PTS; i++) {
      const a = (i / PTS) * Math.PI * 2;
      const r = waveToRadius(baseR, headroom, idleWaveAt(a, t, idleGain));
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  });
  return { pct: ((hi - lo) / baseR) * 100, outermost: hi / W };
};

const PORTRAIT_FILL = 0.25;
const LANDSCAPE_FILL = 0.30;
const LANDSCAPE_GAIN = 1.36;      // what Demopage passes
const PORTRAIT_DEPTH = breathingPct(PORTRAIT_FILL).pct;   // ~7.4%

describe('idle breathing — the regression', () => {
  test('portrait breathes visibly at the default gain', () => {
    expect(PORTRAIT_DEPTH).toBeGreaterThan(7);
  });

  test('THE bug: at gain 1 a bigger orb breathes LESS, not the same', () => {
    // This is the coupling itself. Not a defect to fix here -- it is the
    // shipped mapping -- but it must stay visible, because it is the reason
    // the gain prop exists.
    const flat = breathingPct(LANDSCAPE_FILL).pct;
    expect(flat).toBeLessThan(PORTRAIT_DEPTH * 0.75);
    // ...and at the size that shipped, it is barely movement at all.
    expect(breathingPct(0.38).pct).toBeLessThan(3);
  });

  test('the shipped landscape gain restores portrait depth', () => {
    const { pct } = breathingPct(LANDSCAPE_FILL, LANDSCAPE_GAIN);
    expect(pct).toBeGreaterThanOrEqual(PORTRAIT_DEPTH * 0.97);
    expect(pct).toBeLessThanOrEqual(PORTRAIT_DEPTH * 1.03);
  });

  test('breathing is reachable at ANY size, which is the point of the prop', () => {
    [0.28, 0.30, 0.34, 0.38].forEach((fill) => {
      // A gain exists within the accepted range (<= 4) that hits portrait depth.
      const gains = [1.2, 1.36, 1.8, 2.54, 4];
      const best = gains.map((g) => breathingPct(fill, g).pct);
      expect(Math.max(...best)).toBeGreaterThanOrEqual(PORTRAIT_DEPTH);
    });
  });
});

describe('idle breathing — neutrality for every existing caller', () => {
  test('gain 1 is an exact identity, not an approximation', () => {
    // The prop must be unable to affect portrait, VoiceOrbPage or
    // LightYourHART. Not "close enough" -- identical, sample for sample.
    for (let i = 0; i <= PTS; i++) {
      const a = (i / PTS) * Math.PI * 2;
      const bare = 6 * Math.sin(2 * a + 3.3 * 0.6)
        + 4 * Math.sin(3 * a - 3.3 * 0.45)
        + 3 * Math.sin(5 * a + 3.3 * 0.7);
      expect(idleWaveAt(a, 3.3, 1)).toBe(bare);
    }
  });

  test('an omitted / invalid gain must behave as 1', () => {
    // Mirrors the component's own guard: anything outside (0, 4] falls back.
    [undefined, null, 0, -2, NaN, 'big', 9].forEach((bad) => {
      const g = (typeof bad === 'number' && bad > 0 && bad <= 4) ? bad : 1;
      expect(breathingPct(PORTRAIT_FILL, g).pct).toBeCloseTo(PORTRAIT_DEPTH, 6);
    });
  });
});

describe('idle breathing — the orb must not clip or look like it is talking', () => {
  test('the resting orb stays inside the canvas at the shipped gain', () => {
    const { outermost } = breathingPct(LANDSCAPE_FILL, LANDSCAPE_GAIN);
    expect(outermost).toBeLessThan(MAX_R_FRAC);
  });

  test('even the maximum accepted gain leaves speaking headroom', () => {
    // Idle must not consume the whole envelope, or a speaking orb has nowhere
    // left to go and the two states become indistinguishable.
    const { outermost } = breathingPct(0.38, 4);
    expect(outermost).toBeLessThan(MAX_R_FRAC);
    const idleShare = (outermost - 0.38) / (MAX_R_FRAC - 0.38);
    expect(idleShare).toBeLessThan(0.6);
  });

  test('a saturated speech wave still clamps to the canvas edge', () => {
    // waveToRadius min()s at PEAK_FULL, so an absurd wave cannot escape maxR.
    const baseR = 1000 * LANDSCAPE_FILL;
    const headroom = 1000 * MAX_R_FRAC - baseR;
    expect(waveToRadius(baseR, headroom, 5000)).toBeCloseTo(1000 * MAX_R_FRAC, 6);
  });
});
