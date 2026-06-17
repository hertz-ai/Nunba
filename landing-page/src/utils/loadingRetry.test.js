import {
  loadingRetryDelayMs,
  MAX_LOADING_RETRIES,
  LOADING_RETRY_SCHEDULE_MS,
} from './loadingRetry';

describe('loadingRetryDelayMs (boot-window re-send backoff, #161)', () => {
  it('first retry is NOT immediate (>= 1s) so retries do not burn in seconds', () => {
    expect(loadingRetryDelayMs(0)).toBeGreaterThanOrEqual(1000);
  });

  it('delays are strictly increasing (spaced backoff)', () => {
    const delays = LOADING_RETRY_SCHEDULE_MS.map((_, i) => loadingRetryDelayMs(i));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('cumulatively spans the ~2 min model-warm window', () => {
    const total = LOADING_RETRY_SCHEDULE_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(120000); // >= 2 minutes
  });

  it('gives up (null) once MAX_LOADING_RETRIES is reached — bounded, never loops', () => {
    expect(loadingRetryDelayMs(MAX_LOADING_RETRIES)).toBeNull();
    expect(loadingRetryDelayMs(MAX_LOADING_RETRIES + 3)).toBeNull();
  });

  it('returns each scheduled delay for its attempt index', () => {
    LOADING_RETRY_SCHEDULE_MS.forEach((ms, i) => {
      expect(loadingRetryDelayMs(i)).toBe(ms);
    });
  });

  it('rejects invalid input (negative / non-number / NaN) with null', () => {
    expect(loadingRetryDelayMs(-1)).toBeNull();
    expect(loadingRetryDelayMs('x')).toBeNull();
    expect(loadingRetryDelayMs(NaN)).toBeNull();
    expect(loadingRetryDelayMs(undefined)).toBeNull();
  });
});
