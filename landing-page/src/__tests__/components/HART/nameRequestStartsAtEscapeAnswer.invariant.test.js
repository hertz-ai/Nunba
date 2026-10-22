/**
 * The name request starts when the escape answer lands, not after the
 * acknowledgement and pre-reveal have played.
 *
 * Measured 2026-10-22 on a CPU-only desktop: /api/hart/generate took 270s
 * while an agent plan held the one llama-server slot, and the ceremony only
 * sent it AFTER "I like that about you already." + 2s + "I think I know you."
 * + 3s, so none of that ~8.5s helped the model.  HARTOS now bounds the route's
 * wait (generate_hart_name_within, NAME_WAIT_S = that 8.5s cover + the
 * session's 2.5s reveal tail), which only works out if the request is in
 * flight while those lines play -- the same trick the HARTOS session prewarm
 * uses.
 *
 * Source-level guard, like firstRunBootstrap.invariant.test.js: rendering the
 * ceremony needs its audio, canvas and timer stack.  It pins the ordering;
 * it cannot prove the request fires at runtime.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(__dirname, '../../../components/HART/LightYourHART.js'),
  'utf8'
);

function answerEscapeBody() {
  const start = src.indexOf('const answerEscape = useCallback(');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('// ── Post-reveal', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('LightYourHART name request timing', () => {
  test('the request is sent before the acknowledgement is spoken', () => {
    const body = answerEscapeBody();
    const fetchAt = body.indexOf('/api/hart/generate');
    const ackAt = body.indexOf("speak('ack_escape'");
    expect(fetchAt).toBeGreaterThan(-1);
    expect(ackAt).toBeGreaterThan(-1);
    expect(fetchAt).toBeLessThan(ackAt);
  });

  test('the answer is awaited only once the pre-reveal has played', () => {
    const body = answerEscapeBody();
    const preRevealAt = body.indexOf("speak('pre_reveal'");
    const awaitAt = body.indexOf('await nameRequest');
    expect(awaitAt).toBeGreaterThan(preRevealAt);
  });

  test('a failed request still reveals a name', () => {
    const body = answerEscapeBody();
    expect(body).toMatch(/\.catch\(\(\) => null\)/);
    expect(body).toContain('setHartName(_fallbackName())');
  });
});
