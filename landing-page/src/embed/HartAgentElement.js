/**
 * <hart-agent> — Nunba Liquid UI as a floating microfrontend (PLAN §6 / §11).
 *
 *   <hart-agent surface="assistant" gateway-url="/agent" prompt-id="mcgroce_shopper"
 *               theme='{"brand":"#01b0a8","accent":"#f05f40"}'></hart-agent>
 *
 * Attributes  surface (assistant | overlay | voice | merchant-onboarding |
 *             marketing), gateway-url, prompt-id, user-id, locale, theme,
 *             position (bottom-right | bottom-left), demo, agent-name,
 *             stt-url, session, auto-open
 * Properties  getToken (async () => jwt), context
 * Methods     open(), close(), send(text), setUser({id, getToken}),
 *             setContext(ctx)
 * Events      hart:ready, hart:action, hart:navigate, hart:message,
 *             hart:error  (see hostBridge.js); host answers with
 *             hart:action-result.
 *
 * The shell (orb, live regions, host bridge, session, transport) is plain
 * DOM and runs immediately; the React/MUI Liquid UI loads on first use, so
 * a page pays for the UI only when a person reaches for it.
 */

import {acquireSession, createSession, pageSheets, releaseSession} from './embedSession';
import {resolveEmbedTheme, mix} from './embedTheme';
import {HOST_EVENTS, createHostBridge} from './hostBridge';
import {ICONS, launcherCss} from './launcherStyles';

export const SURFACES = Object.freeze(['assistant', 'overlay', 'voice', 'merchant-onboarding', 'marketing']);

const ORB_ICON = {
  assistant: 'spark', voice: 'mic', 'merchant-onboarding': 'store', marketing: 'megaphone',
};

const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

let _seq = 0;

function loadUiModule() {
  return import('./ui/mountEmbed.jsx');
}

export function surfaceLabel(surface, agentName) {
  switch (surface) {
    case 'voice': return `Talk to ${agentName}`;
    case 'merchant-onboarding': return 'Store setup assistant';
    case 'marketing': return 'Marketing assistant';
    default: return `Ask ${agentName}`;
  }
}

export class HartAgentElement extends BaseElement {
  static get observedAttributes() {
    return ['surface', 'theme', 'position', 'agent-name', 'auto-open'];
  }

  constructor() {
    super();
    _seq += 1;
    this._hid = `hart-${_seq}`;
    this._open = false;
    this._getToken = null;
    this._pendingContext = null;
    this._ui = null;
    this._uiPromise = null;
    this._session = null;
    this._bridge = null;
    this._unsubs = [];
    this._built = false;
  }

  // ── attributes ──────────────────────────────────────────────────────
  get surface() {
    const s = (this.getAttribute('surface') || 'assistant').toLowerCase();
    return SURFACES.includes(s) ? s : 'assistant';
  }

  get agentName() { return this.getAttribute('agent-name') || 'Nunba'; }

  get isDemo() {
    return this.hasAttribute('demo') || !(this.getAttribute('gateway-url') || '').trim();
  }

  get sessionKey() { return this.getAttribute('session') || 'default'; }

  get hasOrb() { return this.surface !== 'overlay'; }

  get isOpen() { return this._open; }

  // ── JS-only properties (never attributes: tokens stay out of the DOM) ─
  get getToken() { return this._getToken; }

  set getToken(fn) {
    this._getToken = typeof fn === 'function' ? fn : null;
    if (this._session) this._session.auth.getToken = this._getToken;
  }

  get context() { return this._session ? this._session.getContext() : (this._pendingContext || {}); }

  set context(ctx) { this.setContext(ctx); }

  // ── lifecycle ───────────────────────────────────────────────────────
  connectedCallback() {
    this._build();
    this._session = acquireSession(this.sessionKey, () => this._createSession());
    const s = this._session;
    this._bridge = createHostBridge(this);
    s.addBridge(this._bridge);
    if (this._getToken) s.auth.getToken = this._getToken;
    if (this.getAttribute('user-id')) s.auth.userId = this.getAttribute('user-id');
    if (this._pendingContext) {
      s.setContext(this._pendingContext);
      this._pendingContext = null;
    }
    s.claimFloating(this._hid, this.surface === 'overlay' ? 2 : 1);
    this._unsubs.push(s.subscribe(() => this._syncFromSession()));
    this._unsubs.push(pageSheets.subscribe(() => this._syncFromSession()));
    this._unsubs.push(s.onAnnounce((text, politeness) => this._announce(text, politeness)));
    // The unread dot belongs on the orb that opens the timeline, and only
    // while no timeline is on screen.
    this._unsubs.push(s.subscribeFloating(() => {
      if (!['assistant', 'merchant-onboarding', 'marketing'].includes(this.surface)) return;
      if (!this._open && s.getState().openSheets.length === 0) this._root.dataset.unread = 'true';
    }));
    this._applyAll();
    this._syncFromSession();

    this._bridge.emit(HOST_EVENTS.READY, {surface: this.surface, demo: this.isDemo, session: this.sessionKey});

    if (this.hasAttribute('auto-open') && this.hasOrb) this.open();
    // The floating stack must be live before the first fragment arrives,
    // so a surface that draws it loads the UI when the page is idle.
    if (!this.hasOrb) this._whenIdle(() => this._loadUi());
  }

  disconnectedCallback() {
    this._unsubs.splice(0).forEach((u) => u && u());
    if (this._ui) {
      this._ui.unmount();
      this._ui = null;
    }
    if (this._session) {
      this._session.setSheetOpen(this._hid, false);
      this._session.releaseFloating(this._hid);
      this._session.removeBridge(this._bridge);
      releaseSession(this.sessionKey);
      this._session = null;
    }
    if (this._bridge) this._bridge.destroy();
    this._bridge = null;
    this._uiPromise = null;
  }

  attributeChangedCallback() {
    if (this._built) this._applyAll();
    if (this._session) {
      this._session.claimFloating(this._hid, this.surface === 'overlay' ? 2 : 1);
      this._renderUi();
    }
  }

  // ── public methods ──────────────────────────────────────────────────
  open() {
    if (!this.hasOrb || this._open) return;
    this._open = true;
    if (this._session) this._session.setSheetOpen(this._hid, true);
    this._root.dataset.open = 'true';
    this._root.dataset.unread = 'false';
    this._orb.setAttribute('aria-expanded', 'true');
    this._orb.setAttribute('aria-label', `Close ${surfaceLabel(this.surface, this.agentName).toLowerCase()}`);
    this._loadUi();
    this._renderUi();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    if (this._session) this._session.setSheetOpen(this._hid, false);
    this._root.dataset.open = 'false';
    this._orb.setAttribute('aria-expanded', 'false');
    this._orb.setAttribute('aria-label', surfaceLabel(this.surface, this.agentName));
    this._renderUi();
    // Focus returns to the control that opened the panel.
    const active = this.shadowRoot && this.shadowRoot.activeElement;
    if (active && active !== this._orb) this._orb.focus();
  }

  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  send(text) {
    if (!this._session) return Promise.resolve();
    if (this.hasOrb && this.surface !== 'voice') this.open();
    return this._session.send(text);
  }

  setUser({id, getToken} = {}) {
    if (getToken !== undefined) this.getToken = getToken;
    if (this._session) {
      if (id !== undefined) this._session.auth.userId = id;
      const t = this._session.transport;
      if (t && t.setUser && id !== undefined) t.setUser(id);
    }
  }

  setContext(ctx) {
    if (this._session) this._session.setContext(ctx || {});
    else this._pendingContext = {...(this._pendingContext || {}), ...(ctx || {})};
  }

  // ── internals ───────────────────────────────────────────────────────
  _createSession() {
    const session = createSession({surface: this.surface, agentName: this.agentName});
    const gatewayUrl = (this.getAttribute('gateway-url') || '').trim();
    const storeName = this.getAttribute('store-name') || undefined;
    const opts = {
      promptId: this.getAttribute('prompt-id') || undefined,
      userId: this.getAttribute('user-id') || undefined,
      locale: this.getAttribute('locale') || undefined,
    };
    // Transports are their own chunks: the launcher stays small and a demo
    // page never downloads the realtime client.
    session.setTransportLoader(this.isDemo
      ? import('./transports/demoTransport').then((m) => m.createDemoTransport({sink: session.sink, storeName}))
      : import('./transports/gatewayTransport').then((m) => {
        const t = m.createGatewayTransport({
          sink: session.sink,
          gatewayUrl,
          ...opts,
          getToken: () => (session.auth.getToken ? session.auth.getToken() : null),
        });
        t.connect();
        return t;
      }));
    return session;
  }

  _build() {
    if (this._built) return;
    const root = this.shadowRoot || this.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = launcherCss();
    const wrap = document.createElement('div');
    wrap.className = 'hart-root';
    wrap.innerHTML = `
      <div class="hart-sr" role="status" aria-live="polite" aria-atomic="true" data-live="polite"></div>
      <div class="hart-sr" role="alert" aria-live="assertive" aria-atomic="true" data-live="assertive"></div>
      <div class="hart-app"></div>
      <div class="hart-dock">
        <span class="hart-halo">
          <span class="hart-ripple" aria-hidden="true"></span>
          <span class="hart-ripple r2" aria-hidden="true"></span>
          <button type="button" class="hart-orb" aria-haspopup="dialog" aria-expanded="false">
            <span class="hart-glyph hart-glyph-main"></span>
            <span class="hart-glyph hart-glyph-close">${ICONS.close}</span>
            <span class="hart-ring" aria-hidden="true"></span>
            <span class="hart-badge" aria-hidden="true"></span>
          </button>
        </span>
        <span class="hart-label" aria-hidden="true"></span>
      </div>`;
    root.appendChild(style);
    root.appendChild(wrap);
    this._root = wrap;
    this._appEl = wrap.querySelector('.hart-app');
    this._dock = wrap.querySelector('.hart-dock');
    this._orb = wrap.querySelector('.hart-orb');
    this._live = {
      polite: wrap.querySelector('[data-live="polite"]'),
      assertive: wrap.querySelector('[data-live="assertive"]'),
    };
    this._orb.addEventListener('click', () => {
      if (this._root.dataset.state === 'error' && !this._ui) {
        this._uiPromise = null;
      }
      this.toggle();
    });
    this._built = true;
  }

  _applyAll() {
    const surface = this.surface;
    this._root.dataset.surface = surface;
    this._root.dataset.position = this.getAttribute('position') === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    this._dock.hidden = !this.hasOrb;
    const label = surfaceLabel(surface, this.agentName);
    if (!this._open) this._orb.setAttribute('aria-label', label);
    this._root.querySelector('.hart-label').textContent = label;
    this._root.querySelector('.hart-glyph-main').innerHTML = ICONS[ORB_ICON[surface] || 'spark'];
    const th = resolveEmbedTheme(this.getAttribute('theme'));
    this._theme = th;
    const st = this._root.style;
    st.setProperty('--hart-accent', th.accent);
    st.setProperty('--hart-accent-strong', th.accentStrong);
    st.setProperty('--hart-accent-2', th.accent2);
    st.setProperty('--hart-accent-deep', th.config.colors.primary_dark || mix(th.config.colors.primary, '#000000', 0.3));
    st.setProperty('--hart-ink', th.ink);
  }

  _syncFromSession() {
    if (!this._session || !this._root) return;
    const st = this._session.getState();
    let state = 'idle';
    if (this._uiPromise && !this._ui) state = 'loading';
    if (st.thinking) state = 'thinking';
    if (this._listening) state = 'listening';
    if (this._uiError) state = 'error';
    this._root.dataset.state = state;
    // Another element's sheet is open: on a phone this orb would sit on top
    // of that sheet's input bar, so the stylesheet tucks it away.
    this._root.dataset.elsewhere = pageSheets.openElsewhere(this._hid) ? 'true' : 'false';
    this._orb.setAttribute('aria-busy', state === 'thinking' || state === 'loading' ? 'true' : 'false');
  }

  _announce(text, politeness) {
    const region = this._live[politeness === 'assertive' ? 'assertive' : 'polite'];
    if (!region) return;
    // Only the element whose UI is showing speaks, so a page with three
    // surfaces does not read every arrival three times.
    const owner = this._session && this._session.getState().floatingOwner;
    if (!this._open && owner !== this._hid) return;
    region.textContent = '';
    setTimeout(() => { region.textContent = text; }, 30);
  }

  _setListening(on) {
    this._listening = !!on;
    this._syncFromSession();
  }

  _whenIdle(fn) {
    if (typeof window === 'undefined') return;
    if (window.requestIdleCallback) window.requestIdleCallback(fn, {timeout: 1500});
    else setTimeout(fn, 300);
  }

  _loadUi() {
    if (this._uiPromise) return this._uiPromise;
    this._uiError = false;
    this._uiPromise = loadUiModule().then((mod) => {
      this._uiMod = mod;
      this._renderUi();
      this._syncFromSession();
      return mod;
    }).catch((err) => {
      this._uiError = true;
      this._uiPromise = null;
      this._syncFromSession();
      this._open = false;
      this._root.dataset.open = 'false';
      this._announce("Couldn't load the assistant. Tap to try again.", 'assertive');
      if (this._bridge) this._bridge.emit(HOST_EVENTS.ERROR, {code: 'ui_load', message: String(err && err.message)});
      return null;
    });
    this._syncFromSession();
    return this._uiPromise;
  }

  _renderUi() {
    if (!this._uiMod || !this._session) return;
    const props = {
      element: this,
      elementId: this._hid,
      session: this._session,
      surface: this.surface,
      open: this._open,
      theme: this._theme,
      agentName: this.agentName,
      position: this._root.dataset.position,
      sttUrl: this.getAttribute('stt-url'),
      locale: this.getAttribute('locale') || undefined,
      shadowRoot: this.shadowRoot,
      container: this._appEl,
      onClose: () => this.close(),
      onListening: (on) => this._setListening(on),
      onNavigate: (nav) => this._bridge && this._bridge.emit(HOST_EVENTS.NAVIGATE, nav),
    };
    if (this._ui) this._ui.update(props);
    else this._ui = this._uiMod.mountEmbed(props);
  }
}

export function defineHartAgent(tag = 'hart-agent') {
  if (typeof customElements === 'undefined') return null;
  if (!customElements.get(tag)) customElements.define(tag, class extends HartAgentElement {});
  return customElements.get(tag);
}
