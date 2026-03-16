/**
 * gameRealtimeService — Bridges crossbar WAMP pub/sub with multiplayer game sync.
 *
 * Sends messages to the crossbar Web Worker for game session pub/sub.
 * Falls back to REST polling if crossbar isn't connected.
 *
 * Usage:
 *   gameRealtimeService.subscribe('session-123', (event) => { ... });
 *   gameRealtimeService.publish('session-123', { type: 'game_move', ... });
 *   gameRealtimeService.unsubscribe('session-123');
 */

let _worker = null;
const _listeners = new Map(); // sessionId → Set<callback>
let _workerMessageHandler = null;

/**
 * Initialize with the crossbar worker reference.
 * Called once from Demopage.js after the worker is created.
 */
export function initGameRealtime(crossbarWorker) {
  if (_worker === crossbarWorker) return;
  _worker = crossbarWorker;

  // Clean up old handler
  if (_workerMessageHandler && _worker) {
    _worker.removeEventListener('message', _workerMessageHandler);
  }

  _workerMessageHandler = (e) => {
    const {type, payload} = e.data;
    if (type === 'GAME_EVENT' && payload) {
      const sessionId = payload.sessionId || payload.session_id;
      const callbacks = _listeners.get(sessionId);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.warn('Game event handler error:', err);
          }
        });
      }
      // Also broadcast to wildcard listeners
      const wildcardCbs = _listeners.get('*');
      if (wildcardCbs) {
        wildcardCbs.forEach((cb) => {
          try {
            cb(payload);
          } catch (_) {}
        });
      }
    }
  };

  _worker.addEventListener('message', _workerMessageHandler);
}

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
  if (_worker && sessionId !== '*') {
    _worker.postMessage({
      type: 'GAME_SUBSCRIBE',
      payload: {sessionId},
    });
  }
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
  if (!_listeners.has(sessionId) && _worker && sessionId !== '*') {
    _worker.postMessage({
      type: 'GAME_UNSUBSCRIBE',
      payload: {sessionId},
    });
  }
}

/**
 * Publish a game event to all session participants via WAMP.
 * @param {string} sessionId
 * @param {Object} event - the event payload (must include `type` field)
 * @returns {boolean} true if published, false if no worker/connection
 */
export function publish(sessionId, event) {
  if (!_worker) return false;

  _worker.postMessage({
    type: 'GAME_PUBLISH',
    payload: {
      sessionId,
      event: {...event, sessionId, ts: Date.now()},
    },
  });
  return true;
}

/** Whether the crossbar worker is available */
export function isAvailable() {
  return !!_worker;
}

const gameRealtimeService = {
  init: initGameRealtime,
  subscribe,
  unsubscribe,
  publish,
  isAvailable,
};

export default gameRealtimeService;
