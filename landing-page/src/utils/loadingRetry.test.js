import {
  loadingRetryDelayMs,
  scheduleLoadingRetry,
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

describe('scheduleLoadingRetry (boot-window re-send wiring, #161)', () => {
  it('does NOT schedule when retries are exhausted (returns null)', () => {
    const fakeSetTimeout = jest.fn();
    const reEnqueue = jest.fn();
    expect(scheduleLoadingRetry(MAX_LOADING_RETRIES, 'hi', reEnqueue, fakeSetTimeout)).toBeNull();
    expect(fakeSetTimeout).not.toHaveBeenCalled();
    expect(reEnqueue).not.toHaveBeenCalled();
  });

  it('does NOT schedule when text is empty/whitespace (returns null)', () => {
    const fakeSetTimeout = jest.fn();
    expect(scheduleLoadingRetry(0, '   ', jest.fn(), fakeSetTimeout)).toBeNull();
    expect(fakeSetTimeout).not.toHaveBeenCalled();
  });

  it('schedules at the backoff delay and re-enqueues TRIMMED text only when the timer fires', () => {
    let fired;
    const fakeSetTimeout = jest.fn((fn, ms) => { fired = fn; return 99; });
    const reEnqueue = jest.fn();
    const id = scheduleLoadingRetry(0, '  hi  ', reEnqueue, fakeSetTimeout);
    expect(id).toBe(99); // returns the timer id for cleanup tracking
    expect(fakeSetTimeout).toHaveBeenCalledWith(expect.any(Function), loadingRetryDelayMs(0));
    expect(reEnqueue).not.toHaveBeenCalled(); // not until the delay elapses
    fired();
    expect(reEnqueue).toHaveBeenCalledWith('hi'); // trimmed
  });

  it('uses the increasing schedule across successive attempts', () => {
    const fakeSetTimeout = jest.fn(() => 1);
    scheduleLoadingRetry(0, 'x', jest.fn(), fakeSetTimeout);
    scheduleLoadingRetry(1, 'x', jest.fn(), fakeSetTimeout);
    expect(fakeSetTimeout.mock.calls[0][1]).toBe(loadingRetryDelayMs(0));
    expect(fakeSetTimeout.mock.calls[1][1]).toBe(loadingRetryDelayMs(1));
    expect(fakeSetTimeout.mock.calls[1][1]).toBeGreaterThan(fakeSetTimeout.mock.calls[0][1]);
  });
});
