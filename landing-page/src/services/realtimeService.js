/**
 * Real-time Event Service — Dual-transport bridge for social events.
 *
 * Transport priority:
 *   1. Crossbar WAMP (central/regional) — via Web Worker, lowest latency
 *   2. Local SSE (flat/desktop) — EventSource to Flask /api/social/events/stream
 *
 * When the crossbar worker reports connected, WAMP is primary and SSE is not
 * opened.  When crossbar disconnects (or was never available), the service
 * automatically falls back to SSE against the local Flask server.
 *
 * API surface is identical regardless of transport so consumers
 * (SocialContext, RealtimeContext, useMultiplayerSync) work unchanged.
 */

import {SOCIAL_API_URL} from '../config/apiBase';

let _worker = null;
let _workerMessageHandler = null;
let _eventSource = null;
let _sseReconnectTimer = null;

const SSE_RECONNECT_DELAY = 3000; // 3s retry on SSE disconnect

class RealtimeService {
  constructor() {
    this._listeners = new Map();
    this._connected = false;
    this._crossbarConnected = false;
    this._sseConnected = false;
    this._token = null; // JWT for SSE auth
  }

  /**
   * Initialize with the crossbar worker reference.
   * Called from Demopage.js after the worker is created.
   * @param {Worker} crossbarWorker
   */
  init(crossbarWorker) {
    if (_worker === crossbarWorker) return;
    _worker = crossbarWorker;

    // Clean up old handler
    if (_workerMessageHandler && _worker) {
      _worker.removeEventListener('message', _workerMessageHandler);
    }

    _workerMessageHandler = (e) => {
      const {type, payload} = e.data;

      if (type === 'CONNECTION_STATUS') {
        const isConnected = payload === 'Connected';
        this._crossbarConnected = isConnected;
        this._connected = isConnected || this._sseConnected;
        this._emit(isConnected ? 'connected' : 'disconnected', {
          connected: this._connected,
        });

        if (isConnected) {
          // Crossbar is primary — tear down SSE if open
          this._closeSSE();
        } else if (this._token) {
          // Crossbar lost — open SSE fallback
          this._openSSE();
        }
      }

      if (type === 'SOCIAL_EVENT' && payload) {
        this._dispatchSocialPayload(payload);
      }
    };

    _worker.addEventListener('message', _workerMessageHandler);
  }

  /**
   * connect(token) — called by RealtimeContext / SocialContext.
   *
   * If crossbar is already connected, this is a no-op (crossbar handles auth
   * via its own WAMP session).  If crossbar is NOT connected, opens the local
   * SSE stream using the JWT token for authentication.
   */
  connect(token) {
    this._token = token || this._token;
    if (this._crossbarConnected) return; // WAMP is primary, no SSE needed
    if (this._token) {
      this._openSSE();
    }
  }

  disconnect() {
    this._connected = false;
    this._closeSSE();
    if (_workerMessageHandler && _worker) {
      _worker.removeEventListener('message', _workerMessageHandler);
      _workerMessageHandler = null;
    }
  }

  get connected() {
    return this._connected;
  }

  on(eventType, callback) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(callback);
    return () => this._listeners.get(eventType)?.delete(callback);
  }

  off(eventType, callback) {
    this._listeners.get(eventType)?.delete(callback);
  }

  // ── Internal: SSE fallback ──────────────────────────────────────────

  _openSSE() {
    if (_eventSource) return; // already open
    if (!this._token) return;

    const url = `${SOCIAL_API_URL}/events/stream?token=${encodeURIComponent(this._token)}`;
    try {
      _eventSource = new EventSource(url);
    } catch {
      return; // EventSource not available (e.g. SSR)
    }

    _eventSource.onopen = () => {
      this._sseConnected = true;
      this._connected = true;
      this._emit('connected', {connected: true, transport: 'sse'});
    };

    _eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'connected') return; // initial heartbeat
        this._dispatchSocialPayload(payload);
      } catch {
        // ignore parse errors (heartbeats etc.)
      }
    };

    // Named event type from backend: `event: notification\ndata: {...}`
    _eventSource.addEventListener('notification', (e) => {
      try {
        const payload = JSON.parse(e.data);
        this._dispatchSocialPayload({type: 'notification', ...payload});
      } catch {
        /* ignore */
      }
    });

    _eventSource.onerror = () => {
      this._closeSSE();
      // Auto-reconnect unless crossbar came back
      if (!this._crossbarConnected && this._token) {
        _sseReconnectTimer = setTimeout(
          () => this._openSSE(),
          SSE_RECONNECT_DELAY
        );
      }
    };
  }

  _closeSSE() {
    if (_sseReconnectTimer) {
      clearTimeout(_sseReconnectTimer);
      _sseReconnectTimer = null;
    }
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    this._sseConnected = false;
    if (!this._crossbarConnected) {
      this._connected = false;
    }
  }

  // ── Internal: dispatch ──────────────────────────────────────────────

  _dispatchSocialPayload(payload) {
    const eventType = payload.type || payload.event_type || 'message';
    this._emit(eventType, payload);

    // Also dispatch sub-type for notification events
    if (eventType === 'notification') {
      const subType = payload.data?.type || payload.data?.event_type;
      if (subType && subType !== 'notification') {
        this._emit(subType, payload.data || payload);
      }
    }
  }

  _emit(eventType, data) {
    const cbs = this._listeners.get(eventType);
    if (cbs)
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (_) {}
      });
    // Wildcard listeners
    const wildcardCbs = this._listeners.get('*');
    if (wildcardCbs)
      wildcardCbs.forEach((cb) => {
        try {
          cb({type: eventType, data});
        } catch (_) {}
      });
  }
}

// ── Community topic handler ──────────────────────────────────────────

let _communityWorker = null;
const _communityListeners = new Map(); // communityId → Set<callback>
let _communityWorkerHandler = null;

/**
 * Initialize community realtime with the crossbar worker reference.
 * Called lazily by subscribeCommunity if not already set.
 */
function _ensureCommunityWorker() {
  if (_communityWorkerHandler || !_worker) return;
  _communityWorker = _worker;

  _communityWorkerHandler = (e) => {
    const {type, payload} = e.data;
    if (type === 'COMMUNITY_EVENT' && payload) {
      const communityId = payload.communityId || payload.community_id;
      const callbacks = _communityListeners.get(communityId);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.warn('Community event handler error:', err);
          }
        });
      }
      // Wildcard listeners
      const wildcardCbs = _communityListeners.get('*');
      if (wildcardCbs) {
        wildcardCbs.forEach((cb) => {
          try {
            cb(payload);
          } catch (_) {}
        });
      }
    }
  };

  _worker.addEventListener('message', _communityWorkerHandler);
}

/**
 * Subscribe to real-time events for a community.
 * Handles `type: 'community_post'` and `type: 'presence'` events on
 * topic `com.hertzai.hevolve.community.{communityId}`.
 *
 * @param {string} communityId
 * @param {Function} callback - receives event objects { type, ... }
 * @returns {Function} unsubscribe function
 */
export function subscribeCommunity(communityId, callback) {
  _ensureCommunityWorker();

  if (!_communityListeners.has(communityId)) {
    _communityListeners.set(communityId, new Set());
  }
  _communityListeners.get(communityId).add(callback);

  // Tell worker to subscribe to WAMP community topic
  if (_worker) {
    _worker.postMessage({
      type: 'COMMUNITY_SUBSCRIBE',
      payload: {communityId},
    });
  }

  // Return unsubscribe function
  return () => {
    _communityListeners.get(communityId)?.delete(callback);
    if (_communityListeners.get(communityId)?.size === 0) {
      _communityListeners.delete(communityId);
      // Unsubscribe from WAMP if no more listeners
      if (_worker) {
        _worker.postMessage({
          type: 'COMMUNITY_UNSUBSCRIBE',
          payload: {communityId},
        });
      }
    }
  };
}

// Singleton
const realtimeService = new RealtimeService();
export default realtimeService;
