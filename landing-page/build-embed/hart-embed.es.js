import { i as e, o as t, r as n, s as r, t as i } from "./hart-embed-liquidFragments-BE7blpJr.js";
import { a, n as o, o as s, r as c, t as l } from "./hart-embed-hostBridge-8cnIGXKd.js";
import { _ as u, d, g as f, h as p, i as m, t as h, u as g, v as _ } from "./hart-embed-launcherStyles-CXgNY9Bj.js";
//#region src/embed/HartAgentElement.js
var v = Object.freeze([
	"assistant",
	"overlay",
	"voice",
	"merchant-onboarding",
	"marketing"
]), y = {
	assistant: "spark",
	voice: "mic",
	"merchant-onboarding": "store",
	marketing: "megaphone"
}, b = typeof HTMLElement < "u" ? HTMLElement : class {}, x = 0;
function S() {
	return import("./hart-embed-mountEmbed-CQ-AwODS.js");
}
function C(e, t) {
	switch (e) {
		case "voice": return `Talk to ${t}`;
		case "merchant-onboarding": return "Store setup assistant";
		case "marketing": return "Marketing assistant";
		default: return `Ask ${t}`;
	}
}
var w = class extends b {
	static get observedAttributes() {
		return [
			"surface",
			"theme",
			"position",
			"agent-name",
			"auto-open"
		];
	}
	constructor() {
		super(), x += 1, this._hid = `hart-${x}`, this._open = !1, this._getToken = null, this._pendingContext = null, this._ui = null, this._uiPromise = null, this._session = null, this._bridge = null, this._unsubs = [], this._built = !1;
	}
	get surface() {
		let e = (this.getAttribute("surface") || "assistant").toLowerCase();
		return v.includes(e) ? e : "assistant";
	}
	get agentName() {
		return this.getAttribute("agent-name") || "Nunba";
	}
	get isDemo() {
		return this.hasAttribute("demo") || !(this.getAttribute("gateway-url") || "").trim();
	}
	get sessionKey() {
		return this.getAttribute("session") || "default";
	}
	get hasOrb() {
		return this.surface !== "overlay";
	}
	get isOpen() {
		return this._open;
	}
	get getToken() {
		return this._getToken;
	}
	set getToken(e) {
		this._getToken = typeof e == "function" ? e : null, this._session && (this._session.auth.getToken = this._getToken);
	}
	get context() {
		return this._session ? this._session.getContext() : this._pendingContext || {};
	}
	set context(e) {
		this.setContext(e);
	}
	connectedCallback() {
		this._build(), this._session = p(this.sessionKey, () => this._createSession());
		let e = this._session;
		this._bridge = c(this), e.addBridge(this._bridge), this._getToken && (e.auth.getToken = this._getToken), this.getAttribute("user-id") && (e.auth.userId = this.getAttribute("user-id")), this._pendingContext && (e.setContext(this._pendingContext), this._pendingContext = null), e.claimFloating(this._hid, this.surface === "overlay" ? 2 : 1), this._unsubs.push(e.subscribe(() => this._syncFromSession())), this._unsubs.push(u.subscribe(() => this._syncFromSession())), this._unsubs.push(e.onAnnounce((e, t) => this._announce(e, t))), this._unsubs.push(e.subscribeFloating(() => {
			[
				"assistant",
				"merchant-onboarding",
				"marketing"
			].includes(this.surface) && !this._open && e.getState().openSheets.length === 0 && (this._root.dataset.unread = "true");
		})), this._applyAll(), this._syncFromSession(), this._bridge.emit(o.READY, {
			surface: this.surface,
			demo: this.isDemo,
			session: this.sessionKey
		}), this.hasAttribute("auto-open") && this.hasOrb && this.open(), this.hasOrb || this._whenIdle(() => this._loadUi());
	}
	disconnectedCallback() {
		this._unsubs.splice(0).forEach((e) => e && e()), this._ui && (this._ui.unmount(), this._ui = null), this._session && (this._session.setSheetOpen(this._hid, !1), this._session.releaseFloating(this._hid), this._session.removeBridge(this._bridge), _(this.sessionKey), this._session = null), this._bridge && this._bridge.destroy(), this._bridge = null, this._uiPromise = null;
	}
	attributeChangedCallback() {
		this._built && this._applyAll(), this._session && (this._session.claimFloating(this._hid, this.surface === "overlay" ? 2 : 1), this._renderUi());
	}
	open() {
		this.hasOrb && !this._open && (this._open = !0, this._session && this._session.setSheetOpen(this._hid, !0), this._root.dataset.open = "true", this._root.dataset.unread = "false", this._orb.setAttribute("aria-expanded", "true"), this._orb.setAttribute("aria-label", `Close ${C(this.surface, this.agentName).toLowerCase()}`), this._loadUi(), this._renderUi());
	}
	close() {
		if (!this._open) return;
		this._open = !1, this._session && this._session.setSheetOpen(this._hid, !1), this._root.dataset.open = "false", this._orb.setAttribute("aria-expanded", "false"), this._orb.setAttribute("aria-label", C(this.surface, this.agentName)), this._renderUi();
		let e = this.shadowRoot && this.shadowRoot.activeElement;
		e && e !== this._orb && this._orb.focus();
	}
	toggle() {
		this._open ? this.close() : this.open();
	}
	send(e) {
		return this._session ? (this.hasOrb && this.surface !== "voice" && this.open(), this._session.send(e)) : Promise.resolve();
	}
	setUser({ id: e, getToken: t } = {}) {
		if (t !== void 0 && (this.getToken = t), this._session) {
			e !== void 0 && (this._session.auth.userId = e);
			let t = this._session.transport;
			t && t.setUser && e !== void 0 && t.setUser(e);
		}
	}
	setContext(e) {
		this._session ? this._session.setContext(e || {}) : this._pendingContext = {
			...this._pendingContext || {},
			...e || {}
		};
	}
	_createSession() {
		let e = f({
			surface: this.surface,
			agentName: this.agentName
		}), t = (this.getAttribute("gateway-url") || "").trim(), n = this.getAttribute("store-name") || void 0, r = {
			promptId: this.getAttribute("prompt-id") || void 0,
			userId: this.getAttribute("user-id") || void 0,
			locale: this.getAttribute("locale") || void 0
		};
		return e.setTransportLoader(this.isDemo ? import("./hart-embed-demoTransport-BxS-BN13.js").then((t) => t.createDemoTransport({
			sink: e.sink,
			storeName: n
		})) : import("./hart-embed-gatewayTransport-Bt0iq4hr.js").then((n) => {
			let i = n.createGatewayTransport({
				sink: e.sink,
				gatewayUrl: t,
				...r,
				getToken: () => e.auth.getToken ? e.auth.getToken() : null
			});
			return i.connect(), i;
		})), e;
	}
	_build() {
		if (this._built) return;
		let e = this.shadowRoot || this.attachShadow({ mode: "open" }), t = document.createElement("style");
		t.textContent = m();
		let n = document.createElement("div");
		n.className = "hart-root", n.innerHTML = `
      <div class="hart-sr" role="status" aria-live="polite" aria-atomic="true" data-live="polite"></div>
      <div class="hart-sr" role="alert" aria-live="assertive" aria-atomic="true" data-live="assertive"></div>
      <div class="hart-app"></div>
      <div class="hart-dock">
        <span class="hart-halo">
          <span class="hart-ripple" aria-hidden="true"></span>
          <span class="hart-ripple r2" aria-hidden="true"></span>
          <button type="button" class="hart-orb" aria-haspopup="dialog" aria-expanded="false">
            <span class="hart-glyph hart-glyph-main"></span>
            <span class="hart-glyph hart-glyph-close">${h.close}</span>
            <span class="hart-ring" aria-hidden="true"></span>
            <span class="hart-badge" aria-hidden="true"></span>
          </button>
        </span>
        <span class="hart-label" aria-hidden="true"></span>
      </div>`, e.appendChild(t), e.appendChild(n), this._root = n, this._appEl = n.querySelector(".hart-app"), this._dock = n.querySelector(".hart-dock"), this._orb = n.querySelector(".hart-orb"), this._live = {
			polite: n.querySelector("[data-live=\"polite\"]"),
			assertive: n.querySelector("[data-live=\"assertive\"]")
		}, this._orb.addEventListener("click", () => {
			this._root.dataset.state === "error" && !this._ui && (this._uiPromise = null), this.toggle();
		}), this._built = !0;
	}
	_applyAll() {
		let e = this.surface;
		this._root.dataset.surface = e, this._root.dataset.position = this.getAttribute("position") === "bottom-left" ? "bottom-left" : "bottom-right", this._dock.hidden = !this.hasOrb;
		let t = C(e, this.agentName);
		this._open || this._orb.setAttribute("aria-label", t), this._root.querySelector(".hart-label").textContent = t, this._root.querySelector(".hart-glyph-main").innerHTML = h[y[e] || "spark"];
		let n = d(this.getAttribute("theme"));
		this._theme = n;
		let r = this._root.style;
		r.setProperty("--hart-accent", n.accent), r.setProperty("--hart-accent-strong", n.accentStrong), r.setProperty("--hart-accent-2", n.accent2), r.setProperty("--hart-accent-deep", n.config.colors.primary_dark || g(n.config.colors.primary, "#000000", .3)), r.setProperty("--hart-ink", n.ink);
	}
	_syncFromSession() {
		if (!this._session || !this._root) return;
		let e = this._session.getState(), t = "idle";
		this._uiPromise && !this._ui && (t = "loading"), e.thinking && (t = "thinking"), this._listening && (t = "listening"), this._uiError && (t = "error"), this._root.dataset.state = t, this._root.dataset.elsewhere = u.openElsewhere(this._hid) ? "true" : "false", this._orb.setAttribute("aria-busy", t === "thinking" || t === "loading" ? "true" : "false");
	}
	_announce(e, t) {
		let n = this._live[t === "assertive" ? "assertive" : "polite"];
		if (!n) return;
		let r = this._session && this._session.getState().floatingOwner;
		(this._open || r === this._hid) && (n.textContent = "", setTimeout(() => {
			n.textContent = e;
		}, 30));
	}
	_setListening(e) {
		this._listening = !!e, this._syncFromSession();
	}
	_whenIdle(e) {
		typeof window < "u" && (window.requestIdleCallback ? window.requestIdleCallback(e, { timeout: 1500 }) : setTimeout(e, 300));
	}
	_loadUi() {
		return this._uiPromise ? this._uiPromise : (this._uiError = !1, this._uiPromise = S().then((e) => (this._uiMod = e, this._renderUi(), this._syncFromSession(), e)).catch((e) => (this._uiError = !0, this._uiPromise = null, this._syncFromSession(), this._open = !1, this._root.dataset.open = "false", this._announce("Couldn't load the assistant. Tap to try again.", "assertive"), this._bridge && this._bridge.emit(o.ERROR, {
			code: "ui_load",
			message: String(e && e.message)
		}), null)), this._syncFromSession(), this._uiPromise);
	}
	_renderUi() {
		if (!this._uiMod || !this._session) return;
		let e = {
			element: this,
			elementId: this._hid,
			session: this._session,
			surface: this.surface,
			open: this._open,
			theme: this._theme,
			agentName: this.agentName,
			position: this._root.dataset.position,
			sttUrl: this.getAttribute("stt-url"),
			locale: this.getAttribute("locale") || void 0,
			shadowRoot: this.shadowRoot,
			container: this._appEl,
			onClose: () => this.close(),
			onListening: (e) => this._setListening(e),
			onNavigate: (e) => this._bridge && this._bridge.emit(o.NAVIGATE, e)
		};
		this._ui ? this._ui.update(e) : this._ui = this._uiMod.mountEmbed(e);
	}
};
function T(e = "hart-agent") {
	return typeof customElements > "u" ? null : (customElements.get(e) || customElements.define(e, class extends w {}), customElements.get(e));
}
//#endregion
//#region src/embed/index.js
var E = "1.0.0";
T();
//#endregion
export { l as ACTION_KINDS, i as FLOATING_TYPES, o as HOST_EVENTS, w as HartAgentElement, n as INLINE_TYPES, e as NAVIGATE_TYPES, v as SURFACES, E as VERSION, c as createHostBridge, T as defineHartAgent, t as fragmentMode, r as getComponentSummary, a as normalizeFragment, s as routeFragment };
