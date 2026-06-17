// Spaced backoff for re-sending a chat message the backend bounced with
// `loading:true` (the local model is still warming after boot).
//
// Why: the model can take ~2 min to warm after boot. The previous handler
// re-enqueued the message 3× IMMEDIATELY, so all 3 attempts were spent in a
// few seconds of fast round-trips (each returning loading:true again) and the
// message was then dropped — long before the model was ready ("why the hell?",
// live 2026-06-17). These delays SPAN the warm window so the queued message is
// auto-sent once the backend is actually ready, and the schedule is BOUNDED so
// a permanently-degraded backend can't retry forever.
//
// Pure + exported so it is unit-testable without rendering the (large) Demopage
// component — the React wiring (setTimeout + cleanup ref) lives in Demopage and
// consumes this single source for the delay decision.
export const LOADING_RETRY_SCHEDULE_MS = [5000, 12000, 25000, 45000, 70000];
export const MAX_LOADING_RETRIES = LOADING_RETRY_SCHEDULE_MS.length;

// attempt is 0-based (0 = the first retry). Returns the delay in ms before the
// next re-send, or `null` when retries are exhausted (give up; leave the toast).
export function loadingRetryDelayMs(attempt) {
  if (typeof attempt !== 'number' || !Number.isFinite(attempt) || attempt < 0) {
    return null;
  }
  return attempt < LOADING_RETRY_SCHEDULE_MS.length
    ? LOADING_RETRY_SCHEDULE_MS[attempt]
    : null;
}
