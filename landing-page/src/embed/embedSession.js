/**
 * embedSession — one agent conversation shared by every <hart-agent> on a page.
 *
 * The Android LiquidOverlay keeps its conversation in liquidOverlayStore
 * (zustand); this is the web embed's equivalent, framework-free so the
 * element can run a turn (and a test can assert on it) before any React UI
 * has loaded.  React surfaces read it through useSyncExternalStore.
 *
 * An assistant, an overlay and a voice element on the same page join the
 * same session (keyed by the `session` attribute, default "default"), so a
 * spoken "add 2 milk" lands in the same timeline the assistant sheet shows.
 */

import {normalizeFragment, routeFragment} from './a2uiAdapter';
import {ACTION_KINDS, HOST_EVENTS} from './hostBridge';

import {getComponentSummary} from '../constants/liquidFragments';

const MAX_TIMELINE = 80;
const FLOATING_REPLAY = 3;

/**
 * Draft replacement — ported from liquidOverlayStore.replaceDraft
 * (Hevolve_React_Native).  Replace the draft bubble carrying
 * `speculationId` in place; with no matching draft, append.
 */
export function replaceDraft(timeline, speculationId, text, source, extra) {
  const idx = timeline.findIndex(
    (m) => m.kind === 'msg' && m.speculationId === speculationId && m.isDraft);
  if (idx !== -1) {
    const updated = timeline.slice();
    updated[idx] = {
      ...updated[idx], ...(extra || {}), text, isDraft: false,
      source: source || 'expert',
    };
    return updated;
  }
  return [...timeline.slice(-(MAX_TIMELINE - 1)), {
    kind: 'msg', id: nextId('m'), role: 'assistant', text,
    ts: Date.now(), source: source || 'expert', ...(extra || {}),
  }];
}

// Page-wide: which sessions have a sheet open right now.  A phone shows one
// sheet at a time, so another session's floating stack steps aside for it.
const _pageSheets = new Map(); // `${sessionUid}:${ownerId}` -> sessionUid
const _pageListeners = new Set();
let _pageSnapshot = [];
function _pageChanged() {
  _pageSnapshot = Array.from(new Set(_pageSheets.values()));
  _pageListeners.forEach((l) => l());
}
export const pageSheets = {
  subscribe(l) {
    _pageListeners.add(l);
    return () => _pageListeners.delete(l);
  },
  /** session uids with an open sheet (stable array between changes) */
  getSnapshot() { return _pageSnapshot; },
  /** Is a sheet open that belongs to some other element on the page? */
  openElsewhere(ownerId) {
    return Array.from(_pageSheets.keys()).some((k) => !k.endsWith(`:${ownerId}`));
  },
};
let _sessionSeq = 0;

let _id = 0;
function nextId(prefix) {
  _id += 1;
  return `${prefix}${_id}`;
}

export function createSession({bridge, surface = 'assistant', agentName = 'Nunba'} = {}) {
  let state = {
    timeline: [],
    thinking: false,
    agentName,
    transportKind: null,
    transportLabel: '',
    layout: null,
    layoutData: {},
    lastUserText: '',
    // Which element draws the floating fragment stack (one per session):
    // an `overlay` surface outranks an orb surface.
    floatingOwner: null,
    // Element ids whose Liquid sheet is open right now.
    openSheets: [],
  };
  const floatingClaims = new Map(); // owner id -> priority
  _sessionSeq += 1;
  const uid = `s${_sessionSeq}`;
  let context = {};
  let transport = null;
  let transportReady = null; // promise while the transport chunk loads
  const listeners = new Set();
  const floatingListeners = new Set();
  const stackListeners = new Set(); // the one drawn stack (gets the backlog)
  const announceListeners = new Set();
  const floatingBacklog = [];
  const bridges = new Set(bridge ? [bridge] : []);

  function set(patch) {
    state = {...state, ...(typeof patch === 'function' ? patch(state) : patch)};
    listeners.forEach((l) => l());
  }

  function announce(text, politeness = 'polite') {
    if (!text) return;
    announceListeners.forEach((l) => l(text, politeness));
  }

  function primaryBridge() {
    return bridges.values().next().value || null;
  }

  function emitToHost(type, detail) {
    const b = primaryBridge();
    if (b) b.emit(type, detail);
  }

  // ── Sinks used by routeFragment ─────────────────────────────────────
  const sinks = {
    navigate(nav) {
      emitToHost(HOST_EVENTS.NAVIGATE, {
        path: nav.target, params: nav.params, title: nav.title,
        transition: nav.transition,
      });
    },
    floating(fragment) {
      // Held only while no stack is drawn yet (the UI chunk is loading), and
      // handed to the stack exactly once when it subscribes.
      if (stackListeners.size === 0) {
        floatingBacklog.push(fragment);
        if (floatingBacklog.length > FLOATING_REPLAY) floatingBacklog.shift();
      }
      stackListeners.forEach((l) => l(fragment));
      floatingListeners.forEach((l) => l(fragment));
    },
    inline(fragment) {
      // The host's cart is the one truth: an older cart snapshot in the
      // timeline stops being actionable once a newer one arrives.
      const supersede = fragment.type === 'cart'
        ? (it) => (it.kind === 'fragment' && it.fragment.type === 'cart'
          ? {...it, fragment: {...it.fragment, superseded: true}} : it)
        : (it) => it;
      set((s) => ({
        timeline: [...s.timeline.slice(-(MAX_TIMELINE - 1)).map(supersede),
          {kind: 'fragment', id: fragment._fid, fragment, ts: Date.now()}],
      }));
    },
  };

  // ── What a transport reports back into the session ──────────────────
  const sink = {
    message({text, speculationId, isDraft, source, suggestions, tone} = {}) {
      if (!text) return;
      set((s) => ({
        timeline: [...s.timeline.slice(-(MAX_TIMELINE - 1)), {
          kind: 'msg', id: nextId('m'), role: 'assistant', text,
          ts: Date.now(), speculationId, isDraft: !!isDraft, source,
          suggestions, tone,
        }],
      }));
      if (!isDraft) {
        announce(text, tone === 'error' ? 'assertive' : 'polite');
        emitToHost(HOST_EVENTS.MESSAGE, {role: 'assistant', text});
      }
    },
    replaceDraft(speculationId, text, source, extra) {
      set((s) => ({timeline: replaceDraft(s.timeline, speculationId, text, source, extra)}));
      announce(text);
      emitToHost(HOST_EVENTS.MESSAGE, {role: 'assistant', text});
    },
    fragment(payload, agentId) {
      const f = normalizeFragment(payload, agentId);
      if (!f) return null;
      if (!f.agent_name && state.agentName) f.agent_name = state.agentName;
      routeFragment(f, sinks);
      if (f.type !== 'navigate') announce(getComponentSummary(f));
      return f;
    },
    layout(layout, data) {
      set({layout: layout || null, layoutData: data || {}});
    },
    thinking(on) {
      set({thinking: !!on});
    },
    error(err, retryText) {
      const text = (err && err.message) || String(err || 'Something went wrong.');
      set((s) => ({
        thinking: false,
        timeline: [...s.timeline, {
          kind: 'msg', id: nextId('m'), role: 'assistant', tone: 'error',
          text, retryText, ts: Date.now(),
        }],
      }));
      announce(text, 'assertive');
      emitToHost(HOST_EVENTS.ERROR, {code: (err && err.code) || 'error', message: text});
    },
    request(kind, payload, opts) {
      const b = primaryBridge();
      if (!b) return Promise.resolve({ok: false, code: 'no_host', error: 'No store is connected.'});
      return b.request(kind, payload, opts);
    },
    getContext() {
      return context;
    },
    /** Update inline fragments in place (e.g. a checkout card once paid). */
    patchInline(match, patch) {
      set((s) => ({
        timeline: s.timeline.map((it) => (it.kind === 'fragment' && match(it.fragment)
          ? {...it, fragment: {...it.fragment, ...patch}} : it)),
      }));
    },
  };

  async function send(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return;
    if (!transport && transportReady) await transportReady;
    if (!transport) return;
    set((s) => ({
      lastUserText: text,
      thinking: true,
      timeline: [...s.timeline.slice(-(MAX_TIMELINE - 1)),
        {kind: 'msg', id: nextId('m'), role: 'user', text, ts: Date.now()}],
    }));
    emitToHost(HOST_EVENTS.MESSAGE, {role: 'user', text});
    try {
      await transport.send(text, {context});
    } catch (err) {
      sink.error(err, text);
    } finally {
      set({thinking: false});
    }
  }

  /**
   * A button on a rendered fragment (AgentOverlay renderers' onAction).
   * The transport gets first refusal (approvals, forms, AP2); a host
   * capability kind falls through to the host bridge.
   */
  async function act(kind, payload) {
    if (!transport && transportReady) await transportReady;
    if (transport && transport.handleAction) {
      const handled = await transport.handleAction(kind, payload || {}, {context});
      if (handled !== undefined) return handled;
    }
    if (ACTION_KINDS.includes(kind)) {
      const res = await sink.request(kind, payload || {});
      if (!res.ok) announce(res.error, 'assertive');
      return res;
    }
    return {ok: false, code: 'unknown_action', error: `Unknown action ${kind}`};
  }

  function electFloatingOwner() {
    let best = null;
    let bestPrio = -1;
    floatingClaims.forEach((prio, id) => {
      if (prio > bestPrio) {
        best = id;
        bestPrio = prio;
      }
    });
    if (best !== state.floatingOwner) set({floatingOwner: best});
  }

  return {
    sink,
    send,
    claimFloating(ownerId, priority) {
      floatingClaims.set(ownerId, priority);
      electFloatingOwner();
    },
    releaseFloating(ownerId) {
      floatingClaims.delete(ownerId);
      electFloatingOwner();
    },
    /** How many orb surfaces (assistant, voice, …) share this session. */
    orbCount() {
      let n = 0;
      floatingClaims.forEach((prio) => { if (prio === 1) n += 1; });
      return n;
    },
    uid,
    setSheetOpen(ownerId, open) {
      if (open) _pageSheets.set(`${uid}:${ownerId}`, uid);
      else _pageSheets.delete(`${uid}:${ownerId}`);
      _pageChanged();
      const has = state.openSheets.includes(ownerId);
      if (open && !has) set((s) => ({openSheets: [...s.openSheets, ownerId]}));
      if (!open && has) set((s) => ({openSheets: s.openSheets.filter((x) => x !== ownerId)}));
    },
    auth: {userId: null, getToken: null},
    act,
    announce,
    retry() {
      if (state.lastUserText) return send(state.lastUserText);
      return Promise.resolve();
    },
    setTransport(t) {
      transport = t;
      set({transportKind: t ? t.kind : null, transportLabel: t ? t.label : ''});
    },
    /** A transport that is still loading; turns wait for it. */
    setTransportLoader(promise) {
      transportReady = Promise.resolve(promise).then((t) => {
        if (t) this.setTransport(t);
        return t;
      });
      return transportReady;
    },
    whenReady() {
      return transportReady || Promise.resolve(transport);
    },
    get transport() { return transport; },
    setContext(ctx) {
      context = {...context, ...(ctx || {})};
    },
    getContext() { return context; },
    addBridge(b) { if (b) bridges.add(b); },
    removeBridge(b) { bridges.delete(b); },
    get bridgeCount() { return bridges.size; },
    getState() { return state; },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Observe floating fragments (badges, tests).  No replay. */
    subscribeFloating(l) {
      floatingListeners.add(l);
      return () => floatingListeners.delete(l);
    },
    /** The drawn stack (AgentOverlay `subscribe` prop): gets the backlog once. */
    subscribeStack(l) {
      stackListeners.add(l);
      floatingBacklog.splice(0).forEach((f) => l(f));
      return () => stackListeners.delete(l);
    },
    onAnnounce(l) {
      announceListeners.add(l);
      return () => announceListeners.delete(l);
    },
    surface,
    destroy() {
      if (transport && transport.disconnect) transport.disconnect();
      listeners.clear();
      floatingListeners.clear();
      stackListeners.clear();
      announceListeners.clear();
    },
  };
}

// ── Page-wide registry: elements with the same `session` share one ─────
const _sessions = new Map();

export function acquireSession(key, factory) {
  let entry = _sessions.get(key);
  if (!entry) {
    entry = {session: factory(), refs: 0};
    _sessions.set(key, entry);
  }
  entry.refs += 1;
  return entry.session;
}

export function releaseSession(key) {
  const entry = _sessions.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.session.destroy();
    _sessions.delete(key);
  }
}
