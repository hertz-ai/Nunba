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
 *
 * Ownership — one entry point per concern, so callers cannot race each other:
 *   - setIdentity() is the only way the SSE stream is opened or re-keyed.
 *     RealtimeProvider calls it in the app; the <hart-agent> embed calls it on
 *     host pages, which have no provider.
 *   - attachWorker()/detachWorker() only wire the crossbar worker.  The page
 *     that creates and terminates the worker calls them.  They never open,
 *     close or re-key the stream.
 *   - disconnect() only closes the stream and forgets its credentials.
 *   The result is the same whichever of identity and worker arrives first.
 */

import {SOCIAL_API_URL} from '../config/apiBase';

let _worker = null;
let _eventSource = null;
let _sseReconnectTimer = null;
// The rotated stream waiting for its onopen.  Held here so a newer identity
// or disconnect() can close it; otherwise it opened later as an orphan.
let _pendingRotateEs = null;

// Resume point for the server's replay window (main.py REPLAY).  Every event
// frame carries `id: <epoch>-<seq>`; the 'connected' frame carries the
// stream's starting point as `resume` in its data.  _sseCursor is the latest
// point and the stream key (base + user) it belongs to; _sseFirstId is the
// first point this page saw.  Event ids already dispatched are remembered so
// a replayed copy is dropped.
let _sseCursor = null; // {key, id}
let _sseFirstId = null;
const _seenFrameIds = new Set();
const _streamKeyOf = new WeakMap(); // EventSource -> stream key

// Every consumer of crossbar worker messages registers a route here.  Exactly
// one 'message' listener sits on the attached worker and fans out to all
// routes, so every consumer follows the worker when the page replaces it.
const _workerRoutes = new Set();
// Run on every attach so each consumer re-sends its subscriptions to the
// new worker (a replacement worker starts with none).
const _attachHooks = new Set();

function _runEach(fns, arg, label) {
  fns.forEach((fn) => {
    try {
      fn(arg);
    } catch (err) {
      console.warn(`${label} error:`, err);
    }
  });
}

function _onWorkerMessage(e) {
  _runEach(_workerRoutes, (e && e.data) || {}, 'Realtime worker route');
}

/** Route every crossbar worker message to `route`.  Returns an unregister. */
export function addWorkerRoute(route) {
  _workerRoutes.add(route);
  return () => _workerRoutes.delete(route);
}

/** Run `hook` each time a worker attaches, to re-send subscriptions. */
export function onWorkerAttach(hook) {
  _attachHooks.add(hook);
  return () => _attachHooks.delete(hook);
}

/** Post to the attached worker.  False when there is none. */
export function postToWorker(type, payload) {
  if (!_worker) return false;
  _worker.postMessage({type, payload});
  return true;
}

export function hasWorker() {
  return Boolean(_worker);
}

const SSE_RECONNECT_DELAY = 3000; // 3s retry on SSE disconnect
const SSE_SEEN_IDS_MAX = 1024; // covers the server's 2 x 256-frame replay
const DEDUP_WINDOW_MS = 10000; // 10s dedup window
const DEDUP_MAX_SIZE = 200; // max tracked message IDs

/**
 * The card inside a HARTOS A2UI envelope, flat, or null when `payload` is
 * not one.
 *
 * HARTOS LiquidUIService.agent_ui_update emits
 * {agent_id, component: {type, ...props}, user_id, msg_id} on the
 * `agent.ui.update` channel.  Android unwraps `component` the same way
 * (AutobahnConnectionManager.onEventAgentUI).  AgentOverlay renders a card
 * by its own `type`, so it must receive the component, not the envelope:
 * given the envelope it saw type 'agent.ui.update', matched no renderer and
 * fell through to printing raw JSON.  Owner ruling 2026-09-26: this overlay
 * IS Liquid UI on the desktop.
 *
 * The envelope's msg_id stays the dedup key.  For agent_id and user_id the
 * component's own value wins and the envelope's only fills a gap: an
 * approval card names the agent it asks about, and a card can name the
 * person it concerns (the camera consent card's user_id is what AgentOverlay
 * hands NUNBA_CAMERA_CONSENT).
 */
export function unwrapAgentUiEnvelope(payload) {
  if (!payload || payload.type !== 'agent.ui.update') return null;
  const card = payload.component;
  if (!card || typeof card !== 'object' || Array.isArray(card) || !card.type) {
    return null;
  }
  return {
    ...card,
    agent_id: card.agent_id != null ? card.agent_id : payload.agent_id,
    user_id: card.user_id != null ? card.user_id : payload.user_id,
    msg_id: payload.msg_id != null ? payload.msg_id : card.msg_id,
  };
}

class RealtimeService {
  constructor() {
    this._listeners = new Map();
    this._connected = false;
    this._crossbarConnected = false;
    this._sseConnected = false;
    this._token = null; // JWT for SSE auth (null = guest mode)
    this._userId = null; // fallback user_id for guest/local SSE
    this._seenIds = new Map(); // request_id → timestamp (dedup)
    this._sseBase = null; // null = SOCIAL_API_URL (the app); set by the embed
    addWorkerRoute((message) => this._onWorkerMessage(message));
  }

  /**
   * Set who the SSE stream belongs to, opening it if none is open.
   *
   * The only entry point that opens or re-keys the stream.  Idempotent: the
   * same identity again changes nothing, so callers may re-assert it on
   * every render.
   *
   * @param {Object} [identity]
   * @param {string} [identity.userId] - user_id the stream registers under.
   *   Absent or null keeps the current one.
   * @param {?string} [identity.token] - tri-state: absent leaves the cached
   *   credential alone, a string selects authenticated SSE, and null selects
   *   the local user_id channel.  The distinction matters after a cloud user
   *   signs out or a persisted guest session wins auth resolution: keeping
   *   the old token makes _buildSSEUrl ignore the new guest UUID and the
   *   server registers the stream under the previous token owner.
   * @param {string} [identity.sseBase] - base the stream hangs off
   *   (`<base>/events/stream`).  Absent = SOCIAL_API_URL, which is what the
   *   app always uses; the <hart-agent> embed passes its runtime gateway,
   *   since a host page's gateway is only known at element connect time.
   */
  setIdentity(identity = {}) {
    let changed = false;

    if (identity.sseBase && identity.sseBase !== this._sseBase) {
      this._sseBase = identity.sseBase;
      changed = true;
    }

    // #211 — a token refresh within the same credential mode is NOT an
    // identity change: the server authenticated this EventSource at open
    // time and routes by the uid it bound to.  Rotating on every refresh
    // (silentGuestRefresh mints a fresh JWT for the SAME guest) opened a
    // window where broadcasts hit an empty broker — #206's silent TTS.
    if (Object.prototype.hasOwnProperty.call(identity, 'token')) {
      const token = identity.token || null;
      if (Boolean(token) !== Boolean(this._token)) changed = true;
      this._token = token;
    }

    // A stream registered as literal 'guest' while HARTOS publishes TTS to
    // the real uid never receives it (live 2026-05-12: SSE uid='guest', TTS
    // for 'd68c9dee-…'; live 2026-10-03: SSE uid='guest', /chat as 10202).
    const {userId} = identity;
    if (userId !== undefined && userId !== null && userId !== this._userId) {
      this._userId = userId;
      changed = true;
    }

    // #211 — an identity change uses OVERLAP rotation: the new stream opens
    // and only its onopen closes the old one, so no broadcast lands in an
    // empty broker.  A stream that is still connecting counts too.
    if (changed && _eventSource) {
      this._rotateSSE();
    } else {
      this._openSSE();
    }
  }

  /**
   * Wire the crossbar worker's messages into the dispatch pipeline.
   * Replaces any previously attached worker.  Opens no stream.
   * @param {Worker} worker
   */
  attachWorker(worker) {
    if (!worker || worker === _worker) return;
    if (_worker) _worker.removeEventListener('message', _onWorkerMessage);
    _worker = worker;
    _worker.addEventListener('message', _onWorkerMessage);
    // A fresh worker has not reported a connection yet.
    this._setCrossbarConnected(false, {silent: true});
    _runEach(_attachHooks, undefined, 'Realtime worker attach hook');
  }

  /**
   * Unwire `worker` if it is the attached one.  Call before terminating it.
   * @param {Worker} worker
   */
  detachWorker(worker) {
    if (!worker || worker !== _worker) return;
    _worker.removeEventListener('message', _onWorkerMessage);
    _worker = null;
    this._setCrossbarConnected(false, {silent: !this._crossbarConnected});
  }

  /**
   * Close the stream and forget its credentials.  The auth boundary (logout,
   * provider unmount): a later guest/local identity must not reuse the
   * previous owner's bearer.  The crossbar worker belongs to the page that
   * attached it and stays attached.
   */
  disconnect() {
    this._closeSSE();
    this._token = null;
    this._userId = null;
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

  // ── Internal: crossbar worker ───────────────────────────────────────

  _onWorkerMessage({type, payload}) {
    if (type === 'CONNECTION_STATUS') {
      this._setCrossbarConnected(payload === 'Connected');
    } else if (type === 'SOCIAL_EVENT' && payload) {
      this._dispatchSocialPayload(payload);
    }
  }

  // The worker reaches the CLOUD router; SSE reaches the LOCAL Flask.  Both
  // coexist (dedup prevents double delivery), so either one keeps the
  // service connected.  `silent` skips the event for bookkeeping-only
  // changes that no status message caused.
  _setCrossbarConnected(isConnected, {silent = false} = {}) {
    this._crossbarConnected = isConnected;
    this._connected = isConnected || this._sseConnected;
    if (!silent) {
      this._emit(isConnected ? 'connected' : 'disconnected', {
        connected: this._connected,
      });
    }
  }

  // ── Internal: SSE transport ─────────────────────────────────────────

  // One pending retry at a time: a second schedule replaces the first, so
  // overlapping failures cannot stack timers and open duplicate streams.
  _scheduleSSE(fn) {
    if (_sseReconnectTimer) clearTimeout(_sseReconnectTimer);
    _sseReconnectTimer = setTimeout(() => {
      _sseReconnectTimer = null;
      fn();
    }, SSE_RECONNECT_DELAY);
  }

  // Build the SSE URL from current auth state.
  // Prefer JWT when available, otherwise bind by guest user_id.
  // Always uses SOCIAL_API_URL (points to Flask :5000, not React :3000).
  _buildSSEUrl() {
    const base = this._sseBase || SOCIAL_API_URL;
    if (this._token) {
      // The server authenticates the token first. Bundled mode may use the
      // claimed uid only when an old opaque cloud token is no longer present
      // in the local auth DB; remote servers never trust this fallback.
      const uid = this._userId || 'guest';
      return `${base}/events/stream?token=${encodeURIComponent(this._token)}`
        + `&user_id=${encodeURIComponent(uid)}`;
    }
    const uid = this._userId || 'guest';
    return `${base}/events/stream?user_id=${encodeURIComponent(uid)}`;
  }

  // Who the stream delivers for: base + user.  The cursor is keyed on this,
  // not on the URL, because a token refresh in the same mode is not an
  // identity change (#211) and must keep resuming from its last id.
  _streamKey() {
    return `${this._sseBase || SOCIAL_API_URL}|${this._userId || 'guest'}`;
  }

  // A new EventSource for the current identity, resuming from the cursor:
  // the last point when it belongs to this stream key, else the page's first
  // point (a different identity has missed everything since the page opened;
  // the server keeps only its replay window).  No point yet = a fresh page:
  // nothing to replay.
  _newEventSource() {
    const key = this._streamKey();
    const since = _sseCursor && _sseCursor.key === key
      ? _sseCursor.id
      : _sseFirstId;
    const url = this._buildSSEUrl();
    const es = new EventSource(
      since ? `${url}&since=${encodeURIComponent(since)}` : url);
    _streamKeyOf.set(es, key);
    return es;
  }

  // Move the resume point to `id`, delivered by `es`.
  _advanceCursor(es, id) {
    if (!_sseFirstId) _sseFirstId = id;
    _sseCursor = {key: _streamKeyOf.get(es), id};
  }

  // Note an event frame's id.  False when that id was already dispatched: a
  // replay overlapping what the previous stream delivered.  Frames from a
  // server that sends no ids always pass.  Contract: once a stream sends an
  // id, every later event frame on it must carry its own -- per the SSE spec
  // a frame without one inherits the previous id and would be dropped here.
  _acceptFrame(es, e) {
    const id = e && e.lastEventId;
    if (!id) return true;
    this._advanceCursor(es, id);
    if (_seenFrameIds.has(id)) return false;
    _seenFrameIds.add(id);
    if (_seenFrameIds.size > SSE_SEEN_IDS_MAX) {
      _seenFrameIds.delete(_seenFrameIds.values().next().value);
    }
    return true;
  }

  // Attach the standard handler set (onmessage, named events, onerror)
  // to an EventSource.  Extracted so both _openSSE and _rotateSSE wire
  // up the same listeners.
  _attachSSEHandlers(es) {
    es.onmessage = (e) => {
      let payload;
      try {
        payload = JSON.parse(e.data);
      } catch {
        return; // ignore parse errors (heartbeats etc.)
      }
      // The hello carries the stream's starting point in its data.  It only
      // moves the cursor: it is not an event, and its point is the last id
      // recorded for ANY user, so marking it seen would drop a real frame
      // with that id still queued on this page's other stream.
      if (payload.type === 'connected') {
        if (payload.resume) this._advanceCursor(es, payload.resume);
        return;
      }
      if (!this._acceptFrame(es, e)) return;
      this._dispatchSocialPayload(payload);
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
    // `agent.ui.update` is the channel EVERY agent-pushed component travels
    // on -- approval/consent cards, qr_pair, metric, notification cards --
    // and AgentOverlay subscribes to it (AgentOverlay.jsx:911) expecting to
    // receive them. Without a listener registered for the NAME here, the
    // frames arrive and EventSource discards them before any handler runs,
    // so the overlay is mounted, subscribed, and permanently silent.
    //
    // MEASURED 2026-08-22: the agent raised a camera consent card via
    // hart_intelligence_entry._request_capability_consent; the payload
    // {"type":"approval","agent_id":"vision","action":"enable_camera"} was
    // confirmed on the wire and the server logged targeted=7/7 delivered --
    // and nothing rendered, because this array did not name the channel.
    // That is the same failure this comment already documents for
    // chat.response; the lesson did not reach the event that carries
    // consent, which is the one place a silent drop is a privacy question
    // and not just a missing message.
    [
      'notification',
      // Computer-use commentary/ribbon updates are emitted on the existing
      // chat.social channel.  EventSource drops named events unless the
      // channel is explicitly registered here; route it through the same
      // transport-neutral dispatcher as every other realtime event.
      'chat.social',
      'setup_progress',
      'chat.response',
      'agent.ui.update',
      // Named events a component subscribes to with realtimeService.on():
      // NotificationBell ('notification.read') and Demopage
      // ('capability_update').  Registered nowhere, so neither subscriber
      // could fire over SSE.
      'notification.read',
      'capability_update',
    ].forEach((name) => {
      es.addEventListener(name, (e) => {
        if (!this._acceptFrame(es, e)) return;
        try {
          const payload = JSON.parse(e.data);
          this._dispatchSocialPayload({type: name, ...payload});
        } catch { /* ignore */ }
      });
    });

    // A persisted chat turn (HARTOS chat_messages.publish_new).  Not routed
    // through _dispatchSocialPayload: a row carries agent_id, which that
    // path would also announce on agent.ui.update as a card.
    es.addEventListener('chat.new', (e) => {
      if (!this._acceptFrame(es, e)) return;
      try {
        this._deliverChatNew(JSON.parse(e.data));
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // Only react if THIS es is still the live one — during a rotate
      // the old es's onerror may fire on close(), which is expected
      // and must not trigger a reconnect of the (now-active) new es.
      if (es !== _eventSource) return;
      this._closeSSE();
      // Always reconnect SSE — local events (TTS, agent UI) need it
      // even when cloud crossbar is connected.
      this._scheduleSSE(() => this._openSSE());
    };
  }

  _openSSE() {
    if (_eventSource) return; // already open
    // Opening now supersedes a pending reconnect.
    if (_sseReconnectTimer) {
      clearTimeout(_sseReconnectTimer);
      _sseReconnectTimer = null;
    }

    try {
      _eventSource = this._newEventSource();
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

    // This rotation supersedes a retry still waiting from a failed one.
    if (_sseReconnectTimer) {
      clearTimeout(_sseReconnectTimer);
      _sseReconnectTimer = null;
    }
    const oldEs = _eventSource;
    if (_pendingRotateEs) {
      try { _pendingRotateEs.close(); } catch { /* noop */ }
      _pendingRotateEs = null;
    }

    let newEs;
    try {
      newEs = this._newEventSource();
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
    _pendingRotateEs = newEs;

    let switched = false;
    newEs.onopen = () => {
      if (switched || newEs !== _pendingRotateEs) return;
      switched = true;
      _pendingRotateEs = null;
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
        this._scheduleSSE(() => this._openSSE());
        return;
      }
      // Failed to open the rotated connection — keep OLD running and
      // retry the rotate after the standard delay.
      try { newEs.close(); } catch { /* noop */ }
      if (newEs !== _pendingRotateEs) return; // superseded or disconnected
      _pendingRotateEs = null;
      this._scheduleSSE(() => this._rotateSSE());
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
    if (_pendingRotateEs) {
      try { _pendingRotateEs.close(); } catch { /* noop */ }
      _pendingRotateEs = null;
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
      // notification.read carries `ids`, capability_update carries
      // capability+name: without them every event of the kind hashes alike
      // and the second one inside the window is dropped.
      const key = (payload.action || payload.type || '') + '|' +
        (payload.generated_audio_url || payload.agent_id || '') + '|' +
        (payload.message || payload.content || payload.text || '').slice(0, 100) + '|' +
        (Array.isArray(payload.ids) ? payload.ids.join(',') : '') + '|' +
        (payload.capability || '') + ':' + (payload.name || '');
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

  // One chat.new row, from SSE or the crossbar worker, to the subscribeChatNew
  // listeners once: both transports carry the row's own msg_id.
  _deliverChatNew(row) {
    if (!row || typeof row !== 'object' || !row.msg_id) return;
    if (this._isDuplicate(row)) return;
    _notifyAll(_chatNewListeners, row, 'chat.new event');
  }

  _dispatchSocialPayload(payload) {
    if (this._isDuplicate(payload)) return;

    // A HARTOS A2UI envelope is an agent card and nothing else: the overlay
    // gets the card, and it is NOT re-announced on the card's own type
    // channel (a 'notification' card would otherwise reach the bell too).
    const card = unwrapAgentUiEnvelope(payload);
    if (card) {
      this._emit('agent.ui.update', card);
      return;
    }

    // Normalize event type from any payload shape
    let eventType = payload.type || payload.event_type || payload.action || 'message';

    // TTS audio → emit as 'tts' event (regardless of transport)
    if (payload.action === 'TTS' && payload.generated_audio_url) {
      eventType = 'tts';
    }

    // Agent UI update → emit as 'agent.ui.update' (avoid double-fire).
    // A HARTOS consent ask is agent UI whether or not it names an agent:
    // an ask for every agent (VisionService screen capture, a computer-
    // control ask from an agent that could not be identified) carries
    // agent_id null and was dropped here, so its card never showed.
    const isConsentAsk = payload.type === 'consent.request';
    if (payload.component_type || isConsentAsk || (payload.type && payload.agent_id && payload.type !== 'notification')) {
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

// ── Worker-routed subscriptions ──────────────────────────────────────
// Each subscription below is one route on the shared worker fan-out
// (_workerRoutes), so it keeps working across worker replacement and
// whether it is subscribed before or after the worker attaches.  Topic
// subscriptions are re-sent from an attach hook; the worker ignores a topic
// it already holds, so re-sending is safe.

function _notifyAll(listeners, data, label) {
  _runEach(listeners, data, `${label} handler`);
}

// ── Community topic handler ──────────────────────────────────────────

const _communityListeners = new Map(); // communityId → Set<callback>

addWorkerRoute(({type, payload}) => {
  if (type !== 'COMMUNITY_EVENT' || !payload) return;
  const communityId = payload.communityId || payload.community_id;
  const callbacks = _communityListeners.get(communityId);
  if (callbacks) _notifyAll(callbacks, payload, 'Community event');
  const wildcardCbs = _communityListeners.get('*');
  if (wildcardCbs) _notifyAll(wildcardCbs, payload, 'Community event');
});

onWorkerAttach(() => {
  _communityListeners.forEach((_, communityId) =>
    postToWorker('COMMUNITY_SUBSCRIBE', {communityId}));
});

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
  if (!_communityListeners.has(communityId)) {
    _communityListeners.set(communityId, new Set());
  }
  _communityListeners.get(communityId).add(callback);

  // Tell worker to subscribe to WAMP community topic
  postToWorker('COMMUNITY_SUBSCRIBE', {communityId});

  // Return unsubscribe function
  return () => {
    _communityListeners.get(communityId)?.delete(callback);
    if (_communityListeners.get(communityId)?.size === 0) {
      _communityListeners.delete(communityId);
      // Unsubscribe from WAMP if no more listeners
      postToWorker('COMMUNITY_UNSUBSCRIBE', {communityId});
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
// The worker relays as
// `{type:'TTS_LANG_EVENT', payload:{kind:'mismatch'|'unsupported', ...}}`
const _TTS_LANG_TOPICS = [
  'com.hertzai.hevolve.tts.lang_mismatch',
  'com.hertzai.hevolve.tts.lang_unsupported',
];

addWorkerRoute(({type, payload}) => {
  if (type === 'TTS_LANG_EVENT' && payload) {
    _notifyAll(_ttsLangListeners, payload, 'TTS lang event');
  }
});

onWorkerAttach(() => {
  if (_ttsLangListeners.size > 0) {
    postToWorker('TTS_LANG_SUBSCRIBE', {topics: _TTS_LANG_TOPICS});
  }
});

/**
 * Subscribe to TTS language-mismatch / unsupported events.
 * Callback receives `{kind, requested_lang, active_backend, preferred?}`.
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribeTtsLangEvents(callback) {
  if (_ttsLangListeners.size === 0) {
    postToWorker('TTS_LANG_SUBSCRIBE', {topics: _TTS_LANG_TOPICS});
  }
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
// isRemoteChatTurn below is the ONE filter; NunbaChatProvider and
// Demopage both use it.

// A worker DATA_RECEIVED message carries {sourceTopic, data}; deliver `data`
// to `listeners` when the topic starts with `prefix`.
function _addTopicRoute(prefix, listeners, label) {
  addWorkerRoute(({type, payload}) => {
    if (type !== 'DATA_RECEIVED' || !payload) return;
    const {sourceTopic, data} = payload;
    if (typeof sourceTopic === 'string' && sourceTopic.startsWith(prefix)) {
      _notifyAll(listeners, data, label);
    }
  });
}

const _chatNewListeners = new Set();
const _CHAT_NEW_PREFIX = 'com.hertzai.hevolve.chat.new.';
addWorkerRoute(({type, payload}) => {
  if (type !== 'DATA_RECEIVED' || !payload) return;
  const {sourceTopic, data} = payload;
  if (typeof sourceTopic === 'string' && sourceTopic.startsWith(_CHAT_NEW_PREFIX)) {
    // eslint-disable-next-line no-use-before-define
    realtimeService._deliverChatNew(data);
  }
});

/**
 * Subscribe to chat.new WAMP events.  Callback receives the persisted
 * ChatMessage row dict: `msg_id`, `request_id`, `device_id`, `user_id`,
 * `role`, `content`, `lang`, `attachments`, `created_at`.
 *
 * @param {(event: object) => void} callback
 * @returns {Function} unsubscribe
 */
export function subscribeChatNew(callback) {
  _chatNewListeners.add(callback);
  return () => _chatNewListeners.delete(callback);
}

/**
 * Is this chat.new row a chat turn from ANOTHER device that a chat view
 * should show?  A user/assistant turn with text, on the ordinary chat
 * channel (a row from a call or an external room carries its own
 * channel_type, e.g. 'livekit:<call>', and is not a chat bubble), and not
 * sent from `localDeviceId` -- this device's own turns are already on
 * screen from its /chat reply.
 */
export function isRemoteChatTurn(row, localDeviceId) {
  if (!row || typeof row !== 'object' || !row.msg_id) return false;
  if (row.role !== 'user' && row.role !== 'assistant') return false;
  if (typeof row.content !== 'string' || !row.content) return false;
  if (row.channel_type && row.channel_type !== 'chat') return false;
  // No local id yet: cannot tell our own turns apart, so show nothing
  // rather than echo them.
  return Boolean(localDeviceId) && row.device_id !== localDeviceId;
}

// ── BLE encounter match + icebreaker (J204, J209-J210) ──────────────
// Same worker-message-filter pattern as subscribeChatNew above.  HARTOS
// encounter_api._publish_match / _publish_icebreaker fire on the
// per-user-suffixed topics; the worker subscribes (crossbarWorker.js)
// and posts DATA_RECEIVED with sourceTopic intact; we filter and
// dispatch to typed listeners.

const _encounterMatchListeners = new Set();
_addTopicRoute('com.hevolve.encounter.match.', _encounterMatchListeners, 'encounter.match');

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
  _encounterMatchListeners.add(callback);
  return () => _encounterMatchListeners.delete(callback);
}


const _encounterIcebreakerListeners = new Set();
_addTopicRoute(
  'com.hevolve.encounter.icebreaker.',
  _encounterIcebreakerListeners,
  'encounter.icebreaker',
);

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
