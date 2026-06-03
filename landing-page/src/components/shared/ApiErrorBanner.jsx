/**
 * ApiErrorBanner — global toast for server errors.
 *
 * Subscribes to window 'hevolve:api-error' CustomEvents (emitted by
 * services/socialApi.js axios interceptor on non-2xx responses) and
 * surfaces a dismissible MUI Snackbar at top-right.
 *
 * Mirrors the Hevolve RN ApiErrorBanner (DeviceEventEmitter 'ApiError')
 * + iOS Swift Notification.Name("ApiError").  Same dedup window (5 s),
 * same auto-dismiss (6 s), same per-status-code copy so the polish
 * feels identical across surfaces.
 *
 * Mount once at the app root, alongside the existing ToastProvider.
 */
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {Snackbar, Alert} from '@mui/material';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';

const DEDUP_WINDOW_MS = 5_000;
const AUTO_DISMISS_MS = 6_000;
const EVENT_NAME = 'hevolve:api-error';

function messageFor(status) {
  if (status >= 500) return "Something's off on our end. Try refreshing.";
  if (status === 401 || status === 403) return 'Session expired — please sign in again.';
  if (status === 404) return "Couldn't find what you asked for.";
  if (status >= 400) return 'Bad request — try again in a moment.';
  return 'Network glitch. Try refreshing.';
}

export default function ApiErrorBanner() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('error');
  const dedupRef = useRef(new Map());

  const handleClose = useCallback((_e, reason) => {
    // Allow click-away dismiss; ignore the "timeout" / "escapeKeyDown"
    // path only when we WANT the snackbar to stay (we don't, here).
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  useEffect(() => {
    const onError = ev => {
      const detail = ev?.detail || {};
      const status = Number(detail.status) || 0;
      const path = String(detail.path || '');
      const key = `${status}:${path}`;
      const now = Date.now();
      const lastTs = dedupRef.current.get(key) || 0;
      if (now - lastTs < DEDUP_WINDOW_MS) return;
      dedupRef.current.set(key, now);
      // Opportunistic prune so the Map doesn't grow unbounded.
      if (dedupRef.current.size > 50) {
        for (const [k, ts] of dedupRef.current.entries()) {
          if (now - ts > DEDUP_WINDOW_MS) dedupRef.current.delete(k);
        }
      }
      setMessage(messageFor(status));
      setSeverity(status >= 500 ? 'error' : status === 401 || status === 403 ? 'warning' : 'info');
      setOpen(true);
    };
    window.addEventListener(EVENT_NAME, onError);
    return () => window.removeEventListener(EVENT_NAME, onError);
  }, []);

  return (
    <Snackbar
      open={open}
      autoHideDuration={AUTO_DISMISS_MS}
      onClose={handleClose}
      anchorOrigin={{vertical: 'top', horizontal: 'right'}}
    >
      <Alert
        onClose={() => setOpen(false)}
        severity={severity}
        variant="filled"
        iconMapping={{
          error: <CloudOffOutlinedIcon fontSize="small" />,
        }}
        sx={{
          minWidth: 280,
          alignItems: 'center',
          fontWeight: 600,
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
