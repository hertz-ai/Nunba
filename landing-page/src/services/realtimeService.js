/**
 * Real-time Event Service — Message-origin-agnostic, idempotent event broker.
 *
 * All transports feed into ONE dispatch pipeline. Components subscribe via
 * on(eventType, callback) — they never know or care which transport delivered.
 *
 * Transport priority:
 *   1. Crossbar WAMP (central/regional) — via Web Worker, lowest latency
 *   2. Local SSE (flat/desktop) — EventSource to Flask /api/social/events/stream
 *
 * Idempotency: request_id-based dedup prevents duplicate delivery when the
 * same message arrives via both WAMP and SSE simultaneously.
 *
 * Guest/local mode: SSE opens without JWT using ?user_id=guest param.
 * No transport-specific code should exist outside this file.
 */

import {SOCIAL_API_URL} from '../config/apiBase';

let _worker = null;
let _workerMessageHandler = null;
let _eventSource = null;
let _sseReconnectTimer = null;

const SSE_RECONNECT_DELAY = 3000; // 3s retry on SSE disconnect
const DEDUP_WINDOW_MS = 10000; // 10s dedup window
const DEDUP_MAX_SIZE = 200; // max tracked message IDs

class RealtimeService {
  constructor() {
    this._listeners = new Map();
    this._connected = false;
    this._crossbarConnected = false;
    this._sseConnected = false;
    this._token = null; // JWT for SSE auth (null = guest mode)
    this._userId = null; // fallback user_id for guest/local SSE
    this._seenIds = new Map(); // request_id → timestamp (dedup)
  }

  /**
   * Initialize with the crossbar worker reference.
   * Called from Demopage.js after the worker is created.
   * Also opens SSE immediately for guest/local mode (no JWT needed).
   * @param {Worker} crossbarWorker
   * @param {Object} [opts]
   * @param {string} [opts.userId] - user_id for guest/local SSE (no JWT)
   */
  init(crossbarWorker, opts = {}) {
    // Detect userId change — when the user transitions from "anonymous
    // visitor" (effectiveUserId='' → SSE registered as literal 'guest')
    // to "registered guest" (guest_user_id UUID populated post-
    // authApi.guestRegister), an open SSE connection is stale and must
    // reconnect with the new uid in the ?user_id= query param.
    // Without this, the broker keeps storing chat.pupit events under
    // 'guest' while HARTOS publishes TTS to the per-guest UUID, and
    // the audio event silently never reaches the client.
    // Live evidence 2026-05-12: SSE registered uid='guest', TTS event
    // arrived for uid='d68c9dee-b324-…' — payload filter dropped it.
    //
    // #211 — uid change uses OVERLAP rotation, not close+reopen.
    // _rotateSSE opens a fresh EventSource with the new uid bound in
    // the URL, awaits its onopen, THEN closes the old one.  The server
    // briefly sees two subscribers (one per uid) — its uid-keyed
    // delivery routes each broadcast to the matching subscriber, so
    // multitenancy is preserved (no event for old uid leaks to new uid
    // and vice versa).  Eliminates the 3-second SSE_RECONNECT_DELAY
    // gap during which HARTOS broadcasts (TTS audio especially)
    // landed in an empty broker (`client_count=0` in frozen_debug.log
    // — root cause of #206 silent TTS).
    const userIdChanged = (
      opts.userId !== undefined
      && opts.userId !== null
      && opts.userId !== this._userId
    );
    if (userIdChanged) {
      this._userId = opts.userId;
      if (this._sseConnected) {
        this._rotateSSE();
      }
    } else if (opts.userId) {
      this._userId = opts.userId;
    }

    // Always open SSE — even if worker is null (failed to create).
    // Local events (TTS audio, agent UI) only arrive via SSE.
    if (!this._sseConnected) {
      this._openSSE();
    }

    if (crossbarWorker && _worker !== crossbarWorker) {
      // Clean up old handler on the OLD worker before overwriting
      const oldWorker = _worker;
      _worker = crossbarWorker;
      if (_workerMessageHandler && oldWorker) {
        oldWorker.removeEventListener('message', _workerMessageHandler);
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

          // SSE stays open even when crossbar connects.
          // Crossbar connects to CLOUD router (aws_rasa.hertzai.com) — handles
          // remote events. SSE connects to LOCAL Flask — handles TTS audio,
          // setup progress, agent UI updates from the local HARTOS backend.
          // Both transports coexist; dedup prevents double delivery.
          if (!this._sseConnected) {
            this._openSSE();
          }
        }

        if (type === 'SOCIAL_EVENT' && payload) {
          this._dispatchSocialPayload(payload);
        }
      };

      _worker.addEventListener('message', _workerMessageHandler);
    }

    // Open SSE immediately if crossbar isn't connected.
    // Guest/local mode works without JWT (uses user_id param).
    if (!this._crossbarConnected) {
      this._openSSE();
    }
  }

  /**
   * connect(token) — called by RealtimeContext / SocialContext.
   *
   * Sets JWT for authenticated SSE.  #211 — token refresh is NOT an
   * identity change: the server already auth'd this EventSource at
   * open time and routes by the uid it bound to.  Rotating the SSE
   * on every token refresh (e.g. silentGuestRefresh minting a fresh
   * JWT for the SAME guest user_id) created a 3-second window where
   * HARTOS broadcasts hit an empty broker — that was the root cause
   * of #206's silent TTS.  Now we just update the cached token; the
   * existing SSE keeps delivering.  Explicit logout still calls
   * disconnect() which fully tears down + de-auths.
   */
  connect(token) {
    if (token) this._token = token;
    if (this._crossbarConnected) return;
    if (!this._sseConnected) this._openSSE();
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

  // ── Internal: SSE transport ─────────────────────────────────────────

  // Build the SSE URL from current auth state.
  // Prefer JWT when available, otherwise bind by guest user_id.
  // Always uses SOCIAL_API_URL (points to Flask :5000, not React :3000).
  _buildSSEUrl() {
    if (this._token) {
      return `${SOCIAL_API_URL}/events/stream?token=${encodeURIComponent(this._token)}`;
    }
    const uid = this._userId || 'guest';
    return `${SOCIAL_API_URL}/events/stream?user_id=${encodeURIComponent(uid)}`;
  }

  // Attach the standard handler set (onmessage, named events, onerror)
  // to an EventSource.  Extracted so both _openSSE and _rotateSSE wire
  // up the same listeners.
  _attachSSEHandlers(es) {
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'connected') return; // initial heartbeat
        this._dispatchSocialPayload(payload);
      } catch {
        // ignore parse errors (heartbeats etc.)
      }
    };

    // Named SSE event types from backend.  EventSource silently drops
    // named events (`event: <name>\ndata: ...\n\n` per main.py:3870) when
    // no addEventListener is registered for that name — `onmessage`
    // only fires for the default/unnamed channel.  Missing chat.response
    // here was why thinking-trace/text events never reached the renderer
    // in desktop mode while TTS (WAMP path) worked fine — diagnosed
    // 2026-05-14 against RequestID 30b02e45 (IPL query) where the server
    // broadcast ~100 type=chat.response events that were silently dropped.
    //
    // Array-driven so adding the next event type is a one-line change.
    // _dispatchSocialPayload normalises {type} from the payload — we
    // pass `type: name` explicitly so the dispatcher uses the event
    // channel name even when the payload omits its own type field.
    [
      'notification',
      'setup_progress',
      'chat.response',
    ].forEach((name) => {
      es.addEventListener(name, (e) => {
        try {
          const payload = JSON.parse(e.data);
          this._dispatchSocialPayload({type: name, ...payload});
        } catch { /* ignore */ }
      });
    });

    es.onerror = () => {
      // Only react if THIS es is still the live one — during a rotate
      // the old es's onerror may fire on close(), which is expected
      // and must not trigger a reconnect of the (now-active) new es.
      if (es !== _eventSource) return;
      this._closeSSE();
      // Always reconnect SSE — local events (TTS, agent UI) need it
      // even when cloud crossbar is connected.
      _sseReconnectTimer = setTimeout(
        () => this._openSSE(),
        SSE_RECONNECT_DELAY
      );
    };
  }

  _openSSE() {
    if (_eventSource) return; // already open

    const url = this._buildSSEUrl();
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

    this._attachSSEHandlers(_eventSource);
  }

  // #211 — Open a NEW EventSource with current uid/token, wait for its
  // onopen, THEN close the previous one.  Server briefly sees two
  // subscribers (old uid + new uid) — its uid-keyed delivery routes
  // each broadcast to whichever subscriber matches, so multitenancy
  // is preserved AND no broadcast lands in an empty broker during
  // the swap.  If the new EventSource fails to open, the old one
  // stays live and we retry the rotate after SSE_RECONNECT_DELAY.
  _rotateSSE() {
    if (!_eventSource) {
      // No live connection to rotate — just open fresh.
      this._openSSE();
      return;
    }

    const oldEs = _eventSource;
    const newUrl = this._buildSSEUrl();

    let newEs;
    try {
      newEs = new EventSource(newUrl);
    } catch {
      // EventSource unavailable — keep old running.  Caller has
      // already updated _userId/_token; next reconnect (if old dies)
      // will pick up the new config via _buildSSEUrl().
      return;
    }

    // Attach standard handlers FIRST so onmessage + named events are
    // wired before onopen fires.  The standard onerror will be
    // OVERRIDDEN below with rotation-specific logic for the pre-swap
    // window; after swap the standard onerror takes over via the
    // `es !== _eventSource` check it already does.
    this._attachSSEHandlers(newEs);

    let switched = false;
    newEs.onopen = () => {
      if (switched) return;
      switched = true;
      // Swap the module pointer BEFORE closing the old one so any
      // concurrent onerror on `oldEs` sees `oldEs !== _eventSource`
      // and skips the reconnect path (handler check in
      // _attachSSEHandlers).
      _eventSource = newEs;
      this._sseConnected = true;
      this._connected = true;
      try { oldEs.close(); } catch { /* noop */ }
      this._emit('connected', {connected: true, transport: 'sse', uid: this._userId});
    };

    // Override the standard onerror with rotation-specific logic for
    // the PRE-swap window.  Must come AFTER _attachSSEHandlers (which
    // sets the standard handler).  Once `switched` is true, this
    // delegates back to the standard reconnect flow via _closeSSE.
    newEs.onerror = () => {
      if (switched) {
        // Post-swap error on the new (now active) connection —
        // standard reconnect flow.
        this._closeSSE();
        _sseReconnectTimer = setTimeout(
          () => this._openSSE(),
          SSE_RECONNECT_DELAY
        );
        return;
      }
      // Failed to open the rotated connection — keep OLD running and
      // retry the rotate after the standard delay.
      try { newEs.close(); } catch { /* noop */ }
      _sseReconnectTimer = setTimeout(
        () => this._rotateSSE(),
        SSE_RECONNECT_DELAY
      );
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

  // ── Internal: dispatch (transport-agnostic, idempotent) ─────────────

  _isDuplicate(payload) {
    // Per-event dedup id from HARTOS (publish_thinking_trace +
    // EventBus.emit auto-inject this).  Critical: prefer msg_id over
    // request_id because multiple events share request_id (N thinking
    // steps in one chat turn) — keying on request_id alone would drop
    // every event after the first.  request_id stays the GROUPING key
    // for daemon-stale filtering (Demopage.js:1434), not for dedup.
    let id = payload.msg_id || payload.request_id || payload.id;
    // No explicit ID — generate content hash so identical payloads from
    // different transports (WAMP + SSE) dedup correctly.
    if (!id) {
      const key = (payload.action || payload.type || '') + '|' +
        (payload.generated_audio_url || payload.agent_id || '') + '|' +
        (payload.message || payload.content || payload.text || '').slice(0, 100);
      id = '_h:' + key;
    }
    const now = Date.now();
    if (this._seenIds.has(id) && now - this._seenIds.get(id) < DEDUP_WINDOW_MS) {
      return true; // seen within dedup window
    }
    this._seenIds.set(id, now);
    // Evict old entries to prevent unbounded growth
    if (this._seenIds.size > DEDUP_MAX_SIZE) {
      const cutoff = now - DEDUP_WINDOW_MS;
      for (const [k, ts] of this._seenIds) {
        if (ts < cutoff) this._seenIds.delete(k);
      }
    }
    return false;
  }

  _dispatchSocialPayload(payload) {
    if (this._isDuplicate(payload)) return;

    // Normalize event type from any payload shape
    let eventType = payload.type || payload.event_type || payload.action || 'message';

    // TTS audio → emit as 'tts' event (regardless of transport)
    if (payload.action === 'TTS' && payload.generated_audio_url) {
      eventType = 'tts';
    }

    // Agent UI update → emit as 'agent.ui.update' (avoid double-fire)
    if (payload.component_type || (payload.type && payload.agent_id && payload.type !== 'notification')) {
      if (eventType !== 'agent.ui.update') {
        this._emit('agent.ui.update', payload);
      }
    }

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

// ── TTS language-mismatch / unsupported topics ─────────────────────
// Surfaces the silent-degradation warnings from tts_engine.py:
//   - com.hertzai.hevolve.tts.lang_mismatch  (backend != preferred ladder)
//   - com.hertzai.hevolve.tts.lang_unsupported (no capable backend fits)
// Backend publishes one-off payloads via core.realtime.publish_async;
// frontend toasts them so users know why their Tamil voice became
// English mumbling instead of silently mis-routing.

const _ttsLangListeners = new Set();
let _ttsLangWorkerHandler = null;

function _ensureTtsLangWorker() {
  if (_ttsLangWorkerHandler || !_worker) return;
  _ttsLangWorkerHandler = (e) => {
    const {type, payload} = e.data || {};
    if (type === 'TTS_LANG_EVENT' && payload) {
      _ttsLangListeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.warn('TTS lang event handler error:', err);
        }
      });
    }
  };
  _worker.addEventListener('message', _ttsLangWorkerHandler);
  // Ask the worker to subscribe to both topics.  The worker relays as
  // `{type:'TTS_LANG_EVENT', payload:{kind:'mismatch'|'unsupported', ...}}`
  _worker.postMessage({
    type: 'TTS_LANG_SUBSCRIBE',
    payload: {
      topics: [
        'com.hertzai.hevolve.tts.lang_mismatch',
        'com.hertzai.hevolve.tts.lang_unsupported',
      ],
    },
  });
}

/**
 * Subscribe to TTS language-mismatch / unsupported events.
 * Callback receives `{kind, requested_lang, active_backend, preferred?}`.
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribeTtsLangEvents(callback) {
  _ensureTtsLangWorker();
  _ttsLangListeners.add(callback);
  return () => _ttsLangListeners.delete(callback);
}

// ── chat.new (cross-device sync, U5) ──────────────────────────────
// HARTOS publishes <CHAT_TOPIC_NEW>.<user_id> on every persisted chat
// turn (see HARTOS integrations/social/chat_messages.publish_new).
// The web worker already subscribes (crossbarWorker.js topics list);
// here we filter its generic DATA_RECEIVED postMessage by sourceTopic
// and surface it as a typed subscriber callback.
//
// IMPORTANT — no-parallel-paths invariant for callers:
// the LOCAL device's own /chat HTTP turns ALSO produce chat.new
// events (server-side persist publishes regardless of origin).
// Callers MUST drop events whose `device_id` matches their local
// device id; otherwise messages will appear twice (once from the
// optimistic /chat-response write path, once from this WAMP path).
// NunbaChatProvider.jsx is the canonical consumer + filter site.

const _chatNewListeners = new Set();
let _chatNewWorkerHandler = null;

function _ensureChatNewWorker() {
  if (_chatNewWorkerHandler || !_worker) return;
  _chatNewWorkerHandler = (e) => {
    const {type, payload} = e.data || {};
    if (type !== 'DATA_RECEIVED' || !payload) return;
    const {sourceTopic, data} = payload;
    if (
      typeof sourceTopic !== 'string' ||
      !sourceTopic.startsWith('com.hertzai.hevolve.chat.new.')
    ) {
      return;
    }
    _chatNewListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('chat.new event handler error:', err);
      }
    });
  };
  _worker.addEventListener('message', _chatNewWorkerHandler);
}

/**
 * Subscribe to chat.new WAMP events.  Callback receives the persisted
 * ChatMessage row dict: `msg_id`, `request_id`, `device_id`, `user_id`,
 * `role`, `content`, `lang`, `attachments`, `created_at`.
 *
 * @param {(event: object) => void} callback
 * @returns {Function} unsubscribe
 */
export function subscribeChatNew(callback) {
  _ensureChatNewWorker();
  _chatNewListeners.add(callback);
  return () => _chatNewListeners.delete(callback);
}

// ── BLE encounter match + icebreaker (J204, J209-J210) ──────────────
// Same worker-message-filter pattern as subscribeChatNew above.  HARTOS
// encounter_api._publish_match / _publish_icebreaker fire on the
// per-user-suffixed topics; the worker subscribes (crossbarWorker.js)
// and posts DATA_RECEIVED with sourceTopic intact; we filter and
// dispatch to typed listeners.

const _encounterMatchListeners = new Set();
let _encounterMatchWorkerHandler = null;

function _ensureEncounterMatchWorker() {
  if (_encounterMatchWorkerHandler || !_worker) return;
  _encounterMatchWorkerHandler = (e) => {
    const {type, payload} = e.data || {};
    if (type !== 'DATA_RECEIVED' || !payload) return;
    const {sourceTopic, data} = payload;
    if (
      typeof sourceTopic !== 'string' ||
      !sourceTopic.startsWith('com.hevolve.encounter.match.')
    ) {
      return;
    }
    _encounterMatchListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('encounter.match handler error:', err);
      }
    });
  };
  _worker.addEventListener('message', _encounterMatchWorkerHandler);
}

/**
 * Subscribe to BLE encounter match events.  Callback receives the
 * canonical Encounter row dict (id, user_a, user_b, lat, lng,
 * matched_at, icebreaker_a_status, icebreaker_b_status, etc.).
 * Fires once per mutual-like.  Use the payload's `id` as `match_id`
 * for the subsequent /icebreaker/draft request.
 *
 * @param {(event: object) => void} callback
 * @returns {Function} unsubscribe
 */
export function subscribeEncounterMatch(callback) {
  _ensureEncounterMatchWorker();
  _encounterMatchListeners.add(callback);
  return () => _encounterMatchListeners.delete(callback);
}


const _encounterIcebreakerListeners = new Set();
let _encounterIcebreakerWorkerHandler = null;

function _ensureEncounterIcebreakerWorker() {
  if (_encounterIcebreakerWorkerHandler || !_worker) return;
  _encounterIcebreakerWorkerHandler = (e) => {
    const {type, payload} = e.data || {};
    if (type !== 'DATA_RECEIVED' || !payload) return;
    const {sourceTopic, data} = payload;
    if (
      typeof sourceTopic !== 'string' ||
      !sourceTopic.startsWith('com.hevolve.encounter.icebreaker.')
    ) {
      return;
    }
    _encounterIcebreakerListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('encounter.icebreaker handler error:', err);
      }
    });
  };
  _worker.addEventListener('message', _encounterIcebreakerWorkerHandler);
}

/**
 * Subscribe to BLE encounter icebreaker state-change events.
 * Callback receives `{match_id, side: 'a'|'b', status: 'sent'|'declined',
 * icebreaker_a, icebreaker_b}`.  Fires when EITHER party approves or
 * declines a draft.  Use to update the UI state on the OTHER party's
 * device (e.g., dismiss the draft modal once the other side has acted).
 *
 * @param {(event: object) => void} callback
 * @returns {Function} unsubscribe
 */
export function subscribeEncounterIcebreaker(callback) {
  _ensureEncounterIcebreakerWorker();
  _encounterIcebreakerListeners.add(callback);
  return () => _encounterIcebreakerListeners.delete(callback);
}

// Singleton
const realtimeService = new RealtimeService();

// Dev/test hook: expose the singleton so Cypress (and curl-style
// dev probes) can inject synthetic events to verify the full
// agent_ui_update → AgentOverlay → DOM chain without spinning up
// Flask + HARTOS + WAMP.  Production builds skip this — the check
// uses CRA's NODE_ENV which is statically replaced at build time, so
// the production bundle excludes the assignment via dead-code-elim.
if (typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production') {
  window.__realtimeService = realtimeService;
}

export default realtimeService;
