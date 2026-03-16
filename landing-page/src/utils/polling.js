/**
 * polling.js — Generic poll-until-done utility for async server tasks.
 * Replaces duplicated pollUntilDone in kidsLearningApi.js and kidsMediaApi.js.
 */

/**
 * @param {Function} checkFn - async function returning { status, data, ... }
 * @param {Object} opts
 * @param {number} [opts.intervalMs=2000]
 * @param {number} [opts.maxAttempts=60]
 * @param {string[]} [opts.doneStatuses]
 * @param {string[]} [opts.failStatuses]
 * @param {Function} [opts.onProgress] - called with result each cycle
 * @returns {Promise<Object>}
 */
export async function pollUntilDone(checkFn, opts = {}) {
  const {
    intervalMs = 2000,
    maxAttempts = 60,
    doneStatuses = ['done', 'completed', 'complete', 'ready'],
    failStatuses = ['failed', 'error', 'cancelled'],
    onProgress,
  } = opts;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await checkFn();
      const status = (
        result?.status ||
        result?.data?.status ||
        ''
      ).toLowerCase();

      if (doneStatuses.includes(status)) return result;

      if (failStatuses.includes(status)) {
        throw new Error(
          result?.error ||
            result?.data?.error ||
            `Failed with status: ${status}`
        );
      }

      if (onProgress) onProgress(result);
    } catch (err) {
      if (err.message?.includes('ailed')) throw err; // re-throw recognized failures
      if (attempt >= maxAttempts - 1) throw err;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}
