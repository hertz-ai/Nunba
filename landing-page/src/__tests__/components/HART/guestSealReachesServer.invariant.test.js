/**
 * Drift guard: a first-run guest's HART seal must reach the server.
 *
 * THE BUG THIS EXISTS FOR (measured 2026-10-21 on a dev boot): the
 * ceremony's seal effect sent /api/hart/seal with a bearer only when
 * localStorage.access_token existed.  A first-run guest has no token: the
 * guest account is registered AFTER the ceremony (silentGuestRefresh reads
 * guest_name, which applyHartSeal back-fills from the HART name).  So the
 * seal answered 400 "No user_id" for every candidate, fell back to the
 * local-only seal, and the server never learned the name: with the guest's
 * own JWT, /api/hart/check said has_hart=false and /api/hart/profile 404,
 * while the screen showed @kazera.
 *
 * The fix registers the guest under the name being sealed, through the
 * canonical silentGuestRefresh helper, before the seal loop.  This guard
 * pins that ordering at source level (same approach, and same stated
 * limits, as firstRunBootstrap.invariant.test.js: the ceremony's render
 * tree is not mountable in this environment).
 */
const fs = require('fs');
const path = require('path');

const HART_JS = path.resolve(
  __dirname, '../../../components/HART/LightYourHART.js');
const hartSrc = fs.readFileSync(HART_JS, 'utf8');

describe('guest HART seal reaches the server', () => {
  test('the ceremony imports the canonical guest registration helper', () => {
    expect(hartSrc).toMatch(
      /import \{[^}]*[\s,{]silentGuestRefresh[\s,}][^}]*\} from '\.\.\/\.\.\/hooks\/useAuthSession'/,
    );
  });

  test('the guest is registered under the HART name before the seal loop', () => {
    const sealEffect = hartSrc.indexOf('// ── Seal on the server BEFORE any local write ──');
    expect(sealEffect).toBeGreaterThan(-1);
    const registerAt = hartSrc.indexOf('silentGuestRefresh({ guestName: hartName })', sealEffect);
    const loopAt = hartSrc.indexOf('for (const candidate of [hartName, ...hartCandidates])', sealEffect);
    expect(registerAt).toBeGreaterThan(-1);
    expect(loopAt).toBeGreaterThan(-1);
    expect(registerAt).toBeLessThan(loopAt);
  });

  test('registration is gated by canRegisterGuestForSeal (no token, no pending cloud user)', () => {
    // The helper's behaviour is tested for real in
    // hooks/canRegisterGuestForSeal.test.js; this only pins that the
    // ceremony asks it, and not a bare token check that would mint a guest
    // over a cloud user whose token is missing.
    expect(hartSrc).toMatch(
      /import \{[^}]*[\s,{]canRegisterGuestForSeal[\s,}][^}]*\} from '\.\.\/\.\.\/hooks\/useAuthSession'/,
    );
    const at = hartSrc.indexOf('silentGuestRefresh({ guestName: hartName })');
    const guard = hartSrc.lastIndexOf('if (canRegisterGuestForSeal())', at);
    expect(guard).toBeGreaterThan(-1);
    expect(at - guard).toBeLessThan(400);
    expect(hartSrc).not.toMatch(
      /if \(!localStorage\.getItem\('access_token'\)\)\s*\{\s*await silentGuestRefresh/,
    );
  });
});
