/**
 * gameRealtimeService — Bridges crossbar WAMP pub/sub with multiplayer game sync.
 *
 * Rides realtimeService's worker wiring: GAME_EVENT messages arrive through
 * its single worker listener, and session subscriptions are re-sent each time
 * the chat page attaches a new worker, so play keeps flowing across a worker
 * replacement and a session joined before any worker exists still connects.
 * Falls back to REST polling (useMultiplayerSync) if no worker is attached.
 *
 * Usage:
 *   gameRealtimeService.subscribe('session-123', (event) => { ... });
 *   gameRealtimeService.publish('session-123', { type: 'game_move', ... });
 *   gameRealtimeService.unsubscribe('session-123');
 */
import {
  addWorkerRoute,
  hasWorker,
  onWorkerAttach,
  postToWorker,
} from './realtimeService';

const _listeners = new Map(); // sessionId → Set<callback>

function _notify(callbacks, payload) {
  callbacks.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.warn('Game event handler error:', err);
    }
  });
}

addWorkerRoute(({type, payload}) => {
  if (type !== 'GAME_EVENT' || !payload) return;
  const sessionId = payload.sessionId || payload.session_id;
  const callbacks = _listeners.get(sessionId);
  if (callbacks) _notify(callbacks, payload);
  // Also broadcast to wildcard listeners
  const wildcardCbs = _listeners.get('*');
  if (wildcardCbs) _notify(wildcardCbs, payload);
});

onWorkerAttach(() => {
  _listeners.forEach((_, sessionId) => {
    if (sessionId !== '*') postToWorker('GAME_SUBSCRIBE', {sessionId});
  });
});

/**
 * Subscribe to real-time events for a game session.
 * @param {string} sessionId
 * @param {Function} callback - receives event objects
 */
export function subscribe(sessionId, callback) {
  if (!_listeners.has(sessionId)) {
    _listeners.set(sessionId, new Set());
  }
  _listeners.get(sessionId).add(callback);

  // Tell worker to subscribe to WAMP topic
  if (sessionId !== '*') postToWorker('GAME_SUBSCRIBE', {sessionId});
}

/**
 * Unsubscribe from a game session's events.
 * @param {string} sessionId
 * @param {Function} [callback] - specific callback, or all if omitted
 */
export function unsubscribe(sessionId, callback) {
  if (callback) {
    _listeners.get(sessionId)?.delete(callback);
    if (_listeners.get(sessionId)?.size === 0) {
      _listeners.delete(sessionId);
    }
  } else {
    _listeners.delete(sessionId);
  }

  // If no more listeners for this session, unsubscribe from WAMP
  if (!_listeners.has(sessionId) && sessionId !== '*') {
    postToWorker('GAME_UNSUBSCRIBE', {sessionId});
  }
}

/**
 * Publish a game event to all session participants via WAMP.
 * @param {string} sessionId
 * @param {Object} event - the event payload (must include `type` field)
 * @returns {boolean} true if published, false if no worker/connection
 */
export function publish(sessionId, event) {
  return postToWorker('GAME_PUBLISH', {
    sessionId,
    event: {...event, sessionId, ts: Date.now()},
  });
}

/** Whether the crossbar worker is available */
export function isAvailable() {
  return hasWorker();
}

const gameRealtimeService = {
  subscribe,
  unsubscribe,
  publish,
  isAvailable,
};

export default gameRealtimeService;
