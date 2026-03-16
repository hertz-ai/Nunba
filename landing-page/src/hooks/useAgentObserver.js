import {useEffect, useRef, useCallback} from 'react';
import {useLocation} from 'react-router-dom';

/**
 * useAgentObserver — Fires lightweight observations to the backend agent
 * so it can self-critique and enhance the experience over time.
 *
 * Events tracked:
 *   - page_leave: time spent on each page (>2s only, filters bounces)
 *   - game_complete: score + game id when a game ends
 *   - error_encounter: page + error type when ErrorBoundary catches
 *   - scroll_depth: 25/50/75/100% milestones on long pages
 *
 * Privacy:
 *   - Gated behind `observer_consent` localStorage flag — no tracking without opt-in
 *   - Data stays on-device via MemoryGraph — never sent to cloud without consent
 *   - Error types normalized to generic categories (no stack traces)
 *   - Page paths redacted of UUIDs/IDs before sending
 */

const OBSERVE_ENDPOINT = '/api/social/agent/observe';

/** Redact user IDs and UUIDs from paths to avoid PII leakage */
const redactPath = (path) =>
  path
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id'
    )
    .replace(/\/\d{4,}/g, '/:id');

/** Normalize error types to generic categories */
const KNOWN_ERRORS = {
  TypeError: 'type_error',
  ReferenceError: 'ref_error',
  RangeError: 'range_error',
  SyntaxError: 'syntax_error',
  NetworkError: 'network_error',
  ChunkLoadError: 'chunk_error',
};
const normalizeErrorType = (errorType) =>
  KNOWN_ERRORS[errorType] || 'render_error';

/** Check if user has opted into agent observation */
const hasConsent = () => localStorage.getItem('observer_consent') === 'true';

/** Fire-and-forget POST — never throws, never blocks UI */
const sendObservation = (event, page, extras = {}) => {
  if (!hasConsent()) return;

  const token = localStorage.getItem('access_token');
  if (!token) return;

  const body = {
    event,
    page: redactPath(page),
    duration_ms: extras.duration_ms || 0,
    outcome: extras.outcome || 'neutral',
  };

  // Only include non-private extras
  if (extras.score !== undefined) body.score = extras.score;
  if (extras.total !== undefined) body.total = extras.total;
  if (extras.category) body.category = extras.category;
  if (extras.depth_pct !== undefined) body.depth_pct = extras.depth_pct;
  if (extras.error_type)
    body.error_type = normalizeErrorType(extras.error_type);

  // Always use fetch with keepalive — sendBeacon can't carry auth headers
  fetch(OBSERVE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {}); // silent — fire-and-forget
};

/**
 * Hook: tracks page dwell time and fires page_leave observation.
 * Mount in SocialLayout or any route-level component.
 */
export function usePageObserver() {
  const location = useLocation();
  const enterTimeRef = useRef(Date.now());
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    const prevPath = lastPathRef.current;
    const dwellMs = Date.now() - enterTimeRef.current;

    // Fire page_leave for the page we're leaving (>2s filters out bounces)
    if (prevPath && dwellMs > 2000) {
      sendObservation('page_leave', prevPath, {
        duration_ms: dwellMs,
        outcome: 'completed',
      });
    }

    // Reset for new page
    enterTimeRef.current = Date.now();
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  // Fire on actual page unload — use fetch with keepalive (not sendBeacon)
  useEffect(() => {
    const handleUnload = () => {
      const dwellMs = Date.now() - enterTimeRef.current;
      if (dwellMs > 2000) {
        sendObservation('page_leave', lastPathRef.current, {
          duration_ms: dwellMs,
          outcome: 'completed',
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}

/**
 * Hook: returns a callback to report game completion.
 * Use inside DynamicGameRenderer or game completion handlers.
 */
export function useGameCompleteObserver() {
  return useCallback((gameId, category, score, total) => {
    sendObservation('game_complete', `/social/games/${gameId}`, {
      outcome: score >= total * 0.7 ? 'success' : 'needs_practice',
      score,
      total,
      category,
    });
  }, []);
}

/**
 * Report an error encounter (call from ErrorBoundary).
 * Not a hook — plain function for class components.
 * Error types are normalized to generic categories before sending.
 */
export function reportErrorObservation(page, errorType) {
  sendObservation('error_encounter', page, {
    outcome: 'error',
    error_type: errorType,
  });
}

/**
 * Hook: tracks scroll depth milestones on the current page.
 * Mount in feed/list pages for engagement insight.
 */
export function useScrollDepthObserver() {
  const location = useLocation();
  const milestonesRef = useRef(new Set());

  useEffect(() => {
    milestonesRef.current = new Set();

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = Math.round((scrollTop / docHeight) * 100);
      const milestones = [25, 50, 75, 100];

      for (const m of milestones) {
        if (pct >= m && !milestonesRef.current.has(m)) {
          milestonesRef.current.add(m);
          sendObservation('scroll_depth', location.pathname, {
            outcome: `${m}%`,
            depth_pct: m,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);
}

export default usePageObserver;
