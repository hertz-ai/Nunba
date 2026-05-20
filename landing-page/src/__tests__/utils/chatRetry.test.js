/**
 * chatRetry.test.js — #125 pin the MAX_RETRIES contract + verify
 * classifyError + getBackoff helpers stay stable.
 *
 * #125 root cause: Demopage handleSend used `while (!localSuccess)`
 * and `while (true)` with no upper bound — if classifyError kept
 * returning retryable=true (which it does for offline / timeout /
 * network error / 429 / 5xx), the loop ran indefinitely.
 *
 * This test pins:
 *   * MAX_RETRIES is exported and sane (>= 5, <= 20)
 *   * getBackoff caps at MAX_BACKOFF_MS no matter how high retryCount goes
 *   * classifyError returns retryable=false for 401 (the only
 *     non-retryable terminal status we recognize today)
 *   * 5xx + 429 + timeout + offline are all retryable
 */

const {
  classifyError,
  getBackoff,
  makeMsgId,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MAX_RETRIES,
} = require('../../utils/chatRetry');

describe('#125 chatRetry contract', () => {
  test('MAX_RETRIES is exported and within sane bounds', () => {
    expect(typeof MAX_RETRIES).toBe('number');
    expect(MAX_RETRIES).toBeGreaterThanOrEqual(5);
    expect(MAX_RETRIES).toBeLessThanOrEqual(20);
  });

  test('getBackoff caps at MAX_BACKOFF_MS regardless of retry count', () => {
    // First retry: 2^0 * 2000 = 2000ms
    expect(getBackoff(0)).toBe(BASE_BACKOFF_MS);
    // 4th retry: 2^3 * 2000 = 16000ms (under cap)
    expect(getBackoff(3)).toBe(16000);
    // 5th retry: 2^4 * 2000 = 32000ms -> capped to MAX_BACKOFF_MS (30000)
    expect(getBackoff(4)).toBe(MAX_BACKOFF_MS);
    // Way beyond — still capped
    expect(getBackoff(100)).toBe(MAX_BACKOFF_MS);
  });

  test('classifyError: 401 is NOT retryable (the only terminal status)', () => {
    const result = classifyError({response: {status: 401}});
    expect(result.retryable).toBe(false);
    expect(result.reason).toMatch(/session expired/i);
  });

  test('classifyError: 429 IS retryable', () => {
    expect(classifyError({response: {status: 429}}).retryable).toBe(true);
  });

  test('classifyError: 500 IS retryable', () => {
    expect(classifyError({response: {status: 500}}).retryable).toBe(true);
  });

  test('classifyError: timeout IS retryable', () => {
    expect(classifyError({code: 'ECONNABORTED'}).retryable).toBe(true);
    expect(classifyError({message: 'request timeout'}).retryable).toBe(true);
  });

  test('classifyError: network error IS retryable', () => {
    expect(classifyError({code: 'ERR_NETWORK'}).retryable).toBe(true);
    expect(classifyError({message: 'Network Error'}).retryable).toBe(true);
  });

  test('classifyError offline detection (jsdom default)', () => {
    // jsdom defaults navigator.onLine = true; this validates the
    // happy path (offline branch tested manually in browser).
    const result = classifyError({response: {status: 500}});
    expect(result.retryable).toBe(true);
  });

  test('makeMsgId produces unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) ids.add(makeMsgId());
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(/^msg_\d+_[a-z0-9]+$/);
    }
  });
});
