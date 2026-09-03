/**
 * Real pointer input for canvas games, aimed in APPLICATION coordinates.
 *
 * Two separate traps sit between a Cypress test and a Phaser canvas, and both
 * have already produced false verdicts in this suite:
 *
 * 1. Synthetic events. cy.click() dispatches events Phaser's InputManager
 *    ignores, so a game can look dead while being perfectly healthy. CDP
 *    (Input.dispatchMouseEvent) goes through the browser's own input pipeline
 *    and is indistinguishable from a human mouse.
 *
 * 2. Coordinate space. CDP addresses the BROWSER WINDOW, but every coordinate
 *    a test can compute — getBoundingClientRect(), canvas offsets — is
 *    APPLICATION-relative. The Cypress runner renders the app in an iframe that
 *    is both offset (below the header, right of the command log) and SCALED to
 *    fit. Measured on this suite: scale 0.6, origin (468, 80). Aiming with app
 *    coordinates therefore missed by hundreds of pixels, which is why a Match-3
 *    board with 15 legal moves survived all 112 adjacent swaps with score 0.
 *
 * calibrate() measures the transform at runtime instead of hardcoding it, so it
 * stays correct when the runner zoom changes (different viewport, --headed,
 * a different Cypress version).
 */

export function cdpMouse(type, x, y, extra = {}) {
  return Cypress.automation('remote:debugger:protocol', {
    command: 'Input.dispatchMouseEvent',
    params: {
      type,
      x: Math.round(x),
      y: Math.round(y),
      button: 'left',
      buttons: type === 'mouseReleased' ? 0 : 1,
      clickCount: 1,
      pointerType: 'mouse',
      ...extra,
    },
  });
}

/**
 * Measure the app -> browser-window transform.
 *
 * Probes with mouseMoved rather than a click so calibration cannot disturb game
 * state: a stray mousedown on a board would select a gem and desync everything
 * that follows.
 *
 * @returns Promise<(ax, by) => {x, y}> mapping app coords to window coords.
 */
export function calibrate(win, probes = [[600, 200], [1100, 500]]) {
  win.__calibHits = [];
  const onMove = (e) => win.__calibHits.push({ x: e.clientX, y: e.clientY });
  win.document.addEventListener('mousemove', onMove, true);

  let chain = Cypress.Promise.resolve();
  probes.forEach(([x, y]) => {
    chain = chain.then(() =>
      cdpMouse('mouseMoved', x, y, { button: 'none', buttons: 0 })
    ).then(() => Cypress.Promise.delay(120));
  });

  return chain.then(() => {
    win.document.removeEventListener('mousemove', onMove, true);
    const hits = win.__calibHits;
    if (hits.length < 2) {
      throw new Error(
        `pointer calibration failed: ${hits.length} of ${probes.length} probes ` +
        `reached the app. Probe points must land inside the app iframe.`
      );
    }
    // Use the first and last hit so a wide baseline keeps the scale accurate.
    const a1 = hits[0], a2 = hits[hits.length - 1];
    const w1 = probes[0], w2 = probes[probes.length - 1];

    const dax = a2.x - a1.x, day = a2.y - a1.y;
    const dwx = w2[0] - w1[0], dwy = w2[1] - w1[1];
    if (!dax || !day) {
      throw new Error('pointer calibration failed: probes did not separate');
    }
    // window = w1 + (app - a1) * (dw / da)
    const kx = dwx / dax, ky = dwy / day;
    const map = (ax, ay) => ({
      x: w1[0] + (ax - a1.x) * kx,
      y: w1[1] + (ay - a1.y) * ky,
    });
    map.scale = { kx, ky };
    map.origin = map(0, 0);
    return map;
  });
}

/** Click at APP coordinates, given a transform from calibrate(). */
export function clickApp(map, ax, ay) {
  const p = map(ax, ay);
  return cdpMouse('mouseMoved', p.x, p.y, { button: 'none', buttons: 0 })
    .then(() => cdpMouse('mousePressed', p.x, p.y))
    .then(() => cdpMouse('mouseReleased', p.x, p.y));
}

/** Press-drag-release in APP coordinates, for swipe/aim style games. */
export function dragApp(map, ax1, ay1, ax2, ay2, steps = 8) {
  const a = map(ax1, ay1);
  const b = map(ax2, ay2);
  let chain = cdpMouse('mouseMoved', a.x, a.y, { button: 'none', buttons: 0 })
    .then(() => cdpMouse('mousePressed', a.x, a.y));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    chain = chain.then(() =>
      cdpMouse('mouseMoved', a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    );
  }
  return chain.then(() => cdpMouse('mouseReleased', b.x, b.y));
}
