/* eslint-disable */
/**
 * useCrashReporter.js - Auto-initialized crash reporting for Nunba
 *
 * Automatically sends crashes to Sentry - no configuration needed.
 * Dashboard: https://sentry.io (login with your Hevolve account)
 */

import {useEffect, useCallback, useRef} from 'react';
import {
  SENTRY_DSN as _SENTRY_DSN,
  APP_VERSION as _APP_VERSION,
} from '../config/apiBase';
import {logger} from '../utils/logger';

// Get DSN from config (set via REACT_APP_SENTRY_DSN env var)
const SENTRY_DSN = _SENTRY_DSN || '';
const APP_VERSION = _APP_VERSION || '1.0.0';
const APP_NAME = 'Nunba';

// Sentry SDK reference
let Sentry = null;
let initialized = false;

/**
 * Auto-initialize Sentry on module load
 */
async function autoInit() {
  if (initialized) return true;
  if (!SENTRY_DSN) return false; // No DSN configured — crash reporting disabled

  try {
    // Dynamic import
    Sentry = await import('@sentry/react');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      release: `${APP_NAME}@${APP_VERSION}`,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Filter expected errors
        const exceptionType = event.exception?.values?.[0]?.type;
        const ignoredTypes = ['ChunkLoadError', 'AbortError', 'ResizeObserver'];
        if (ignoredTypes.some((t) => exceptionType?.includes(t))) {
          return null;
        }
        return event;
      },
    });

    // Set device context
    Sentry.setContext('device', {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });

    initialized = true;
    logger.log('[CrashReporter] Initialized');
    return true;
  } catch (error) {
    console.warn('[CrashReporter] Failed to initialize:', error.message);
    return false;
  }
}

// Auto-initialize on import
autoInit();

/**
 * Capture an exception
 */
export function captureException(error, context = {}) {
  if (!initialized || !Sentry) {
    console.error('Exception:', error);
    return null;
  }

  return Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    return Sentry.captureException(error);
  });
}

/**
 * Capture a message
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!initialized || !Sentry) {
    console[level]?.(message) || logger.log(message);
    return null;
  }

  return Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    return Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context
 */
export function setUser(userId, email = null, username = null) {
  if (!initialized || !Sentry) return;
  Sentry.setUser({
    id: userId,
    ...(email && {email}),
    ...(username && {username}),
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  if (initialized && Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Add a breadcrumb
 */
export function addBreadcrumb(
  message,
  category = 'app',
  level = 'info',
  data = {}
) {
  if (!initialized || !Sentry) return;
  Sentry.addBreadcrumb({message, category, level, data});
}

/**
 * Set a tag for filtering
 */
export function setTag(key, value) {
  if (initialized && Sentry) {
    Sentry.setTag(key, value);
  }
}

/**
 * Get crash reporting status
 */
export function getStatus() {
  return {
    enabled: true,
    initialized,
    sentryAvailable: Sentry !== null,
  };
}

/**
 * Error Boundary wrapper (use in App.js)
 */
export function withErrorBoundary(Component, fallback) {
  if (!Sentry) return Component;
  return Sentry.withErrorBoundary(Component, {fallback});
}

/**
 * React hook for crash reporting
 */
export function useCrashReporter(options = {}) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      autoInit();
    }
  }, []);

  // Set user when provided
  useEffect(() => {
    if (options.userId) {
      setUser(options.userId, options.userEmail, options.userName);
    }
  }, [options.userId, options.userEmail, options.userName]);

  const capture = useCallback((error, context = {}) => {
    return captureException(error, context);
  }, []);

  const log = useCallback((message, level = 'info', context = {}) => {
    return captureMessage(message, level, context);
  }, []);

  const breadcrumb = useCallback((message, category = 'ui', data = {}) => {
    addBreadcrumb(message, category, 'info', data);
  }, []);

  return {
    capture,
    log,
    breadcrumb,
    setUser,
    clearUser,
    setTag,
    addBreadcrumb,
    status: getStatus(),
  };
}

// Global error handler (catches unhandled errors)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureException(event.error, {type: 'unhandled_error'});
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, {type: 'unhandled_rejection'});
  });
}

export default useCrashReporter;
