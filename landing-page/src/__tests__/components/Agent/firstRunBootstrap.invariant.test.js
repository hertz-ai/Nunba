/**
 * Drift guard: first-run AI bootstrap must have exactly one live trigger.
 *
 * THE BUG THIS EXISTS FOR (found 2026-08-13, fixed in abc46c67):
 * /api/ai/bootstrap had TWO candidate triggers and BOTH were inert on a
 * first run, because each deferred to the other.
 *
 *   1. Agent.js:139 silent-bootstrap-on-mount:
 *        if (!hartSealed) return; // will bootstrap via welcome bridge on first run
 *      …with `[]` deps.  A brand-new user is not sealed at mount, so it
 *      bails once and never retries.
 *
 *   2. The welcome bridge, opened by setShowWelcome(true), which is called
 *      ONLY from handleHartComplete — which is LightYourHART's onComplete.
 *      That callback was unreachable: the ceremony wrote localStorage on
 *      entry to the reveal, flipping the gate and unmounting the component
 *      ~11s before onComplete was reached (see LightYourHART f7a2cf9c).
 *
 * Net effect: a first-run user's models were never bootstrapped for the
 * language they had just chosen, and nothing failed loudly.
 *
 * WHY THIS IS A SOURCE-LEVEL GUARD, NOT A RENDER TEST — stated plainly so
 * nobody mistakes its strength: rendering AgentPage pulls in Demopage and
 * its full provider tree, and the neighbouring Agent suite
 * (AgentOverlayNotificationActions.test.js) already fails at suite level
 * in this environment.  A render test asserting "fetch('/api/ai/bootstrap')
 * called exactly once" is the RIGHT test and remains the follow-up; this
 * guard only pins the wiring invariants that were silently broken, so the
 * same class of regression cannot land unnoticed again.  It cannot prove
 * the call actually fires at runtime.
 *
 * WHICH OF THESE ACTUALLY CATCH THE ORIGINAL BUG — measured by running
 * this file against HEAD~2 (the pre-fix tree), not assumed:
 *   RED pre-fix (3): local seal after the beats, server seal before the
 *     local seal, and network failure not laundered as success.
 *   GREEN pre-fix (2): "handleHartComplete opens the bridge" and "the
 *     mount effect defers to the bridge".  Those two were ALREADY true
 *     and still broken in combination — setShowWelcome existed, it was
 *     merely unreachable.  They are forward pins, not bug detectors, and
 *     are labelled as such so nobody reads their passing as proof the
 *     bootstrap works.
 */
const fs = require('fs');
const path = require('path');

const AGENT_JS = path.resolve(__dirname, '../../../components/Agent/Agent.js');
const HART_JS = path.resolve(
  __dirname, '../../../components/HART/LightYourHART.js');

const agentSrc = fs.readFileSync(AGENT_JS, 'utf8');
const hartSrc = fs.readFileSync(HART_JS, 'utf8');

describe('first-run AI bootstrap wiring', () => {
  test('handleHartComplete still opens the welcome bridge', () => {
    // setShowWelcome(true) is the ONLY thing that opens the bridge that
    // POSTs /api/ai/bootstrap.  If this disappears, first-run bootstrap
    // silently dies again.
    const fn = agentSrc.slice(agentSrc.indexOf('const handleHartComplete'));
    const body = fn.slice(0, fn.indexOf('}, []);') + 7);
    expect(body).toContain('setShowWelcome(true)');
  });

  test('the mount-time bootstrap still defers to the bridge, not to nothing', () => {
    // The mount effect intentionally skips unsealed users because the
    // bridge covers them.  That contract is only safe while the bridge is
    // actually reachable (previous test).  Pinning both together is the
    // point: it was the PAIR that was broken, not either half.
    expect(agentSrc).toContain('/api/ai/bootstrap');
    expect(agentSrc).toMatch(/if \(!hartSealed\) return;/);
  });

  test('the local seal happens AFTER the ceremony beats, not on entry', () => {
    // applyHartSeal flips Agent.js's gate and unmounts this component, so
    // everything sequenced after it is dead.  It must therefore come after
    // the closing beats.
    //
    // NOTE on why the anchor is setPhase('post_reveal') and not
    // onComplete: "applyHartSeal before onComplete" is VACUOUS — it held in
    // the broken code too (seal on entry at :1052, onComplete at :1135, so
    // seal < complete either way).  Verified by running this file against
    // HEAD~2.  post_reveal discriminates: pre-fix the seal preceded it,
    // post-fix it follows it.
    const sealAt = hartSrc.indexOf('applyHartSeal({');
    const postRevealAt = hartSrc.indexOf("setPhase('post_reveal')");
    expect(sealAt).toBeGreaterThan(-1);
    expect(postRevealAt).toBeGreaterThan(-1);
    expect(sealAt).toBeGreaterThan(postRevealAt);
  });

  test('the server seal is attempted BEFORE the local seal', () => {
    // Regression pin for f7a2cf9c: /api/hart/seal must be reached while
    // the component is still mounted.
    const fetchAt = hartSrc.indexOf('/api/hart/seal');
    const sealAt = hartSrc.indexOf('applyHartSeal({');
    expect(fetchAt).toBeGreaterThan(-1);
    expect(fetchAt).toBeLessThan(sealAt);
  });

  test('network failure is not laundered as a successful seal', () => {
    // The old code did `sealed = true` in the catch, so an offline seal
    // was indistinguishable from a real one and could never be retried.
    expect(hartSrc).not.toContain('treat as sealed locally');
    expect(hartSrc).toContain('sealedRemotely');
  });
});
