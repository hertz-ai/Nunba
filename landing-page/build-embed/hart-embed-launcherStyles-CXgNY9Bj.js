import { s as e } from "./hart-embed-liquidFragments-BE7blpJr.js";
import { a as t, n, o as r, t as i } from "./hart-embed-hostBridge-8cnIGXKd.js";
//#region src/embed/embedSession.js
var a = 3;
function o(e, t, n, r, i) {
	let a = e.findIndex((e) => e.kind === "msg" && e.speculationId === t && e.isDraft);
	if (a !== -1) {
		let t = e.slice();
		return t[a] = {
			...t[a],
			...i || {},
			text: n,
			isDraft: !1,
			source: r || "expert"
		}, t;
	}
	return [...e.slice(-79), {
		kind: "msg",
		id: m("m"),
		role: "assistant",
		text: n,
		ts: Date.now(),
		source: r || "expert",
		...i || {}
	}];
}
var s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Set(), l = [];
function u() {
	l = Array.from(new Set(s.values())), c.forEach((e) => e());
}
var d = {
	subscribe(e) {
		return c.add(e), () => c.delete(e);
	},
	getSnapshot() {
		return l;
	},
	openElsewhere(e) {
		return Array.from(s.keys()).some((t) => !t.endsWith(`:${e}`));
	}
}, f = 0, p = 0;
function m(e) {
	return p += 1, `${e}${p}`;
}
function h({ bridge: c, surface: l = "assistant", agentName: d = "Nunba" } = {}) {
	let p = {
		timeline: [],
		thinking: !1,
		agentName: d,
		transportKind: null,
		transportLabel: "",
		layout: null,
		layoutData: {},
		lastUserText: "",
		floatingOwner: null,
		openSheets: []
	}, h = /* @__PURE__ */ new Map();
	f += 1;
	let g = `s${f}`, _ = {}, v = null, y = null, b = /* @__PURE__ */ new Set(), x = /* @__PURE__ */ new Set(), S = /* @__PURE__ */ new Set(), C = /* @__PURE__ */ new Set(), w = [], T = new Set(c ? [c] : []);
	function E(e) {
		p = {
			...p,
			...typeof e == "function" ? e(p) : e
		}, b.forEach((e) => e());
	}
	function D(e, t = "polite") {
		e && C.forEach((n) => n(e, t));
	}
	function O() {
		return T.values().next().value || null;
	}
	function k(e, t) {
		let n = O();
		n && n.emit(e, t);
	}
	let A = {
		navigate(e) {
			k(n.NAVIGATE, {
				path: e.target,
				params: e.params,
				title: e.title,
				transition: e.transition
			});
		},
		floating(e) {
			S.size === 0 && (w.push(e), w.length > a && w.shift()), S.forEach((t) => t(e)), x.forEach((t) => t(e));
		},
		inline(e) {
			let t = e.type === "cart" ? (e) => e.kind === "fragment" && e.fragment.type === "cart" ? {
				...e,
				fragment: {
					...e.fragment,
					superseded: !0
				}
			} : e : (e) => e;
			E((n) => ({ timeline: [...n.timeline.slice(-79).map(t), {
				kind: "fragment",
				id: e._fid,
				fragment: e,
				ts: Date.now()
			}] }));
		}
	}, j = {
		message({ text: e, speculationId: t, isDraft: r, source: i, suggestions: a, tone: o } = {}) {
			e && (E((n) => ({ timeline: [...n.timeline.slice(-79), {
				kind: "msg",
				id: m("m"),
				role: "assistant",
				text: e,
				ts: Date.now(),
				speculationId: t,
				isDraft: !!r,
				source: i,
				suggestions: a,
				tone: o
			}] })), r || (D(e, o === "error" ? "assertive" : "polite"), k(n.MESSAGE, {
				role: "assistant",
				text: e
			})));
		},
		replaceDraft(e, t, r, i) {
			E((n) => ({ timeline: o(n.timeline, e, t, r, i) })), D(t), k(n.MESSAGE, {
				role: "assistant",
				text: t
			});
		},
		fragment(n, i) {
			let a = t(n, i);
			return a ? (!a.agent_name && p.agentName && (a.agent_name = p.agentName), r(a, A), a.type !== "navigate" && D(e(a)), a) : null;
		},
		layout(e, t) {
			E({
				layout: e || null,
				layoutData: t || {}
			});
		},
		thinking(e) {
			E({ thinking: !!e });
		},
		error(e, t) {
			let r = e && e.message || String(e || "Something went wrong.");
			E((e) => ({
				thinking: !1,
				timeline: [...e.timeline, {
					kind: "msg",
					id: m("m"),
					role: "assistant",
					tone: "error",
					text: r,
					retryText: t,
					ts: Date.now()
				}]
			})), D(r, "assertive"), k(n.ERROR, {
				code: e && e.code || "error",
				message: r
			});
		},
		request(e, t, n) {
			let r = O();
			return r ? r.request(e, t, n) : Promise.resolve({
				ok: !1,
				code: "no_host",
				error: "No store is connected."
			});
		},
		getContext() {
			return _;
		},
		patchInline(e, t) {
			E((n) => ({ timeline: n.timeline.map((n) => n.kind === "fragment" && e(n.fragment) ? {
				...n,
				fragment: {
					...n.fragment,
					...t
				}
			} : n) }));
		}
	};
	async function M(e) {
		let t = String(e || "").trim();
		if (t && (!v && y && await y, v)) {
			E((e) => ({
				lastUserText: t,
				thinking: !0,
				timeline: [...e.timeline.slice(-79), {
					kind: "msg",
					id: m("m"),
					role: "user",
					text: t,
					ts: Date.now()
				}]
			})), k(n.MESSAGE, {
				role: "user",
				text: t
			});
			try {
				await v.send(t, { context: _ });
			} catch (e) {
				j.error(e, t);
			} finally {
				E({ thinking: !1 });
			}
		}
	}
	async function N(e, t) {
		if (!v && y && await y, v && v.handleAction) {
			let n = await v.handleAction(e, t || {}, { context: _ });
			if (n !== void 0) return n;
		}
		if (i.includes(e)) {
			let n = await j.request(e, t || {});
			return n.ok || D(n.error, "assertive"), n;
		}
		return {
			ok: !1,
			code: "unknown_action",
			error: `Unknown action ${e}`
		};
	}
	function P() {
		let e = null, t = -1;
		h.forEach((n, r) => {
			n > t && (e = r, t = n);
		}), e !== p.floatingOwner && E({ floatingOwner: e });
	}
	return {
		sink: j,
		send: M,
		claimFloating(e, t) {
			h.set(e, t), P();
		},
		releaseFloating(e) {
			h.delete(e), P();
		},
		orbCount() {
			let e = 0;
			return h.forEach((t) => {
				t === 1 && (e += 1);
			}), e;
		},
		uid: g,
		setSheetOpen(e, t) {
			t ? s.set(`${g}:${e}`, g) : s.delete(`${g}:${e}`), u();
			let n = p.openSheets.includes(e);
			t && !n && E((t) => ({ openSheets: [...t.openSheets, e] })), !t && n && E((t) => ({ openSheets: t.openSheets.filter((t) => t !== e) }));
		},
		auth: {
			userId: null,
			getToken: null
		},
		act: N,
		announce: D,
		retry() {
			return p.lastUserText ? M(p.lastUserText) : Promise.resolve();
		},
		setTransport(e) {
			v = e, E({
				transportKind: e ? e.kind : null,
				transportLabel: e ? e.label : ""
			});
		},
		setTransportLoader(e) {
			return y = Promise.resolve(e).then((e) => (e && this.setTransport(e), e)), y;
		},
		whenReady() {
			return y || Promise.resolve(v);
		},
		get transport() {
			return v;
		},
		setContext(e) {
			_ = {
				..._,
				...e || {}
			};
		},
		getContext() {
			return _;
		},
		addBridge(e) {
			e && T.add(e);
		},
		removeBridge(e) {
			T.delete(e);
		},
		get bridgeCount() {
			return T.size;
		},
		getState() {
			return p;
		},
		subscribe(e) {
			return b.add(e), () => b.delete(e);
		},
		subscribeFloating(e) {
			return x.add(e), () => x.delete(e);
		},
		subscribeStack(e) {
			return S.add(e), w.splice(0).forEach((t) => e(t)), () => S.delete(e);
		},
		onAnnounce(e) {
			return C.add(e), () => C.delete(e);
		},
		surface: l,
		destroy() {
			v && v.disconnect && v.disconnect(), b.clear(), x.clear(), S.clear(), C.clear();
		}
	};
}
var g = /* @__PURE__ */ new Map();
function _(e, t) {
	let n = g.get(e);
	return n || (n = {
		session: t(),
		refs: 0
	}, g.set(e, n)), n.refs += 1, n.session;
}
function v(e) {
	let t = g.get(e);
	t && (--t.refs, t.refs <= 0 && (t.session.destroy(), g.delete(e)));
}
//#endregion
//#region src/theme/hartGlass.js
var y = 20, b = 180, x = 16, S = .65, C = "18, 19, 28", w = "rgba(255,255,255,0.09)", T = Object.freeze({
	blur: y,
	saturation: b,
	radius: x,
	panelOpacity: S,
	tintRgb: C,
	borderColor: w,
	background: `rgba(${C}, ${S})`,
	backdropFilter: `blur(${y}px) saturate(${b}%)`,
	border: `1px solid ${w}`,
	boxShadow: "0 26px 76px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.06)"
}), E = Object.freeze({
	background: T.background,
	backdropFilter: T.backdropFilter,
	WebkitBackdropFilter: T.backdropFilter,
	border: T.border,
	borderRadius: `${x}px`,
	boxShadow: T.boxShadow
});
Object.freeze({
	...E,
	borderRadius: "24px"
});
//#endregion
//#region src/theme/themePresets.js
var D = {
	id: "hart-default",
	name: "HART Default",
	description: "Deep navy with aspiration violet accents",
	colors: {
		background: "#0F0E17",
		paper: "#1A1932",
		surface_elevated: "#232148",
		surface_overlay: "#2D2B55",
		primary: "#6C63FF",
		primary_light: "#9B94FF",
		primary_dark: "#4A42CC",
		secondary: "#FF6B6B",
		secondary_light: "#FF9494",
		secondary_dark: "#CC5555",
		accent: "#2ECC71",
		accent_light: "#A8E6CF",
		text_primary: "#FFFFFE",
		text_secondary: "rgba(255,255,254,0.72)",
		divider: "rgba(255,255,255,0.12)",
		success: "#2ECC71",
		warning: "#FFAB00",
		error: "#e74c3c",
		info: "#00B8D9"
	},
	glass: {
		blur_radius: T.blur,
		surface_opacity: .85,
		elevated_opacity: .92,
		border_opacity: .08
	},
	animations: {
		glassmorphism: {
			enabled: !0,
			intensity: 70
		},
		gradients: {
			enabled: !0,
			intensity: 50
		},
		liquid_motion: {
			enabled: !0,
			intensity: 60
		}
	},
	font: {
		family: "Inter",
		size: 13
	},
	shell: {
		panel_opacity: T.panelOpacity,
		blur_radius: T.blur,
		border_radius: T.radius
	},
	metadata: {
		is_preset: !0,
		is_ai_generated: !1
	}
};
function O(e, t) {
	let n = { ...e };
	for (let r of Object.keys(t)) n[r] = t[r] && typeof t[r] == "object" && !Array.isArray(t[r]) && e[r] && typeof e[r] == "object" && !Array.isArray(e[r]) ? O(e[r], t[r]) : t[r];
	return n;
}
//#endregion
//#region src/embed/embedTheme.js
var k = "#0b1413", A = .7, j = `linear-gradient(rgba(${T.tintRgb}, ${A}), rgba(${T.tintRgb}, ${A})), ${T.background}`;
function M(e) {
	let t = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(e || "").trim());
	if (!t) return null;
	let n = t[1];
	return n.length === 3 && (n = n.split("").map((e) => e + e).join("")), [
		0,
		2,
		4
	].map((e) => parseInt(n.slice(e, e + 2), 16));
}
function N(e) {
	return `#${e.map((e) => Math.round(Math.max(0, Math.min(255, e))).toString(16).padStart(2, "0")).join("")}`;
}
var P = `rgba(${T.tintRgb}, 0.96)`;
function F(e) {
	let t = M(e);
	if (!t) return null;
	let [n, r, i] = t.map((e) => {
		let t = e / 255;
		return t <= .03928 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4;
	});
	return .2126 * n + .7152 * r + .0722 * i;
}
function I(e, t) {
	let n = F(e), r = F(t);
	if (n === null || r === null) return null;
	let [i, a] = n > r ? [n, r] : [r, n];
	return (i + .05) / (a + .05);
}
function L(e, t, n) {
	let r = M(e), i = M(t);
	return !r || !i ? e : N(r.map((e, t) => e + (i[t] - e) * n));
}
function R(e) {
	let t = M(e) ? e : D.colors.primary;
	for (let e = 0; e < 12 && (I(t, "#0b1413") || 0) < 7; e++) t = L(t, "#ffffff", .12);
	return t;
}
function z(e) {
	let t = (...t) => t.map((t) => e[t]).find((e) => typeof e == "string"), n = t("brand", "color-brand", "--mg-color-brand", "primary"), r = t("accent", "color-accent", "--mg-color-accent", "secondary");
	if (!n && !r) return null;
	let i = {};
	return n && (i.primary = n), r && (i.secondary = r), { colors: i };
}
function B(e) {
	if (!e) return {};
	if (typeof e == "object") return e;
	try {
		let t = JSON.parse(e);
		return t && typeof t == "object" ? t : {};
	} catch {
		return {};
	}
}
function V(e) {
	let t = B(e), n = t.colors ? t : z(t) || {}, r = n.colors || {}, i = {};
	r.primary && !r.primary_light && (i.primary_light = L(r.primary, "#ffffff", .3)), r.primary && !r.primary_dark && (i.primary_dark = L(r.primary, "#000000", .28)), r.secondary && !r.secondary_light && (i.secondary_light = L(r.secondary, "#ffffff", .3)), r.secondary && !r.secondary_dark && (i.secondary_dark = L(r.secondary, "#000000", .28));
	let a = O(D, {
		...n,
		colors: {
			...i,
			...r
		}
	}), o = R(a.colors.primary), s = R(a.colors.secondary || a.colors.primary);
	return {
		config: a,
		accent: o,
		accentStrong: L(o, "#ffffff", .18),
		accent2: s,
		ink: k
	};
}
//#endregion
//#region src/theme/motionTokens.js
var H = {
	snappy: "cubic-bezier(0.2, 0, 0, 1)",
	bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
	smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
	decelerate: "cubic-bezier(0, 0, 0.2, 1)",
	spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
}, U = {
	instant: 100,
	fast: 200,
	normal: 300,
	slow: 500
}, W = H.spring, G = U.normal;
function K() {
	return `
:host {
  all: initial;
  display: contents;
  --hart-spring: ${H.spring};
  --hart-ease: ${H.smooth};
  --hart-dur: ${U.normal}ms;
  --hart-dur-fast: ${U.fast}ms;
  --hart-glass-bg: ${j};
  --hart-glass-filter: ${T.backdropFilter};
  --hart-glass-border: ${T.border};
  --hart-glass-shadow: ${T.boxShadow};
  --hart-radius: ${T.radius}px;
  --hart-orb: 56px;
  --hart-inset: 16px;
  --hart-offset-bottom: 0px;
}
:host([hidden]) { display: none; }
.hart-root {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
:where(.hart-root, .hart-root *, .hart-root *::before, .hart-root *::after) { box-sizing: border-box; }
.hart-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.hart-dock {
  position: fixed;
  z-index: 2147483000;
  bottom: calc(var(--hart-inset) + var(--hart-offset-bottom) + env(safe-area-inset-bottom, 0px));
  right: calc(var(--hart-inset) + env(safe-area-inset-right, 0px));
  display: flex; align-items: center; gap: 10px;
  flex-direction: row-reverse;
}
.hart-dock[hidden] { display: none; }
.hart-root[data-position="bottom-left"] .hart-dock {
  right: auto;
  left: calc(var(--hart-inset) + env(safe-area-inset-left, 0px));
  flex-direction: row;
}
.hart-orb {
  position: relative;
  width: var(--hart-orb); height: var(--hart-orb);
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.45);
  padding: 0; margin: 0; cursor: pointer;
  color: #fff;
  background:
    radial-gradient(circle at 32% 26%, rgba(255,255,255,0.75) 0, rgba(255,255,255,0) 38%),
    radial-gradient(circle at 70% 80%, var(--hart-accent-2, #ff9494) 0, transparent 55%),
    radial-gradient(circle at 50% 50%, var(--hart-accent, #9b94ff) 0, var(--hart-accent-deep, #4a42cc) 100%);
  box-shadow:
    0 12px 32px -6px color-mix(in srgb, var(--hart-accent, #9b94ff) 55%, transparent),
    0 2px 6px rgba(0,0,0,0.18),
    inset 0 -6px 14px rgba(0,0,0,0.18),
    inset 0 2px 6px rgba(255,255,255,0.55);
  overflow: hidden;
  transform: translateZ(0) scale(1);
  transition: transform var(--hart-dur) var(--hart-spring), box-shadow var(--hart-dur) var(--hart-ease);
  outline: none;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.hart-halo {
  /* breathing lives on a wrapper so the button's own hover/press spring
     is never overridden by the idle animation */
  position: relative; display: inline-block; border-radius: 50%;
  animation: hart-breathe 4.8s var(--hart-ease) infinite;
}
.hart-orb::before {
  /* the liquid: a slow conic swirl under the glass */
  content: ""; position: absolute; inset: -30%;
  background: conic-gradient(from 0deg,
    transparent 0deg, rgba(255,255,255,0.28) 60deg, transparent 120deg,
    color-mix(in srgb, var(--hart-accent-2, #ff9494) 60%, transparent) 200deg, transparent 280deg);
  animation: hart-swirl 9s linear infinite;
  mix-blend-mode: soft-light;
}
.hart-orb::after {
  /* specular rim */
  content: ""; position: absolute; inset: 3px; border-radius: 50%;
  border-top: 1px solid rgba(255,255,255,0.7);
  opacity: 0.8; pointer-events: none;
}
.hart-orb:hover { transform: translateZ(0) scale(1.06); }
.hart-orb:active { transform: translateZ(0) scale(0.92); }
.hart-orb:focus-visible {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--hart-accent-deep, #4a42cc);
}
.hart-orb .hart-glyph {
  position: relative; z-index: 1;
  display: grid; place-items: center; width: 100%; height: 100%;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
  transition: transform var(--hart-dur) var(--hart-spring), opacity var(--hart-dur-fast) var(--hart-ease);
}
.hart-orb svg { width: 26px; height: 26px; }
.hart-orb .hart-glyph-close { position: absolute; inset: 0; opacity: 0; transform: rotate(-90deg) scale(0.6); }
.hart-root[data-open="true"] .hart-orb .hart-glyph-main { opacity: 0; transform: rotate(90deg) scale(0.6); }
.hart-root[data-open="true"] .hart-orb .hart-glyph-close { opacity: 1; transform: none; }
.hart-root[data-state="thinking"] .hart-orb::before { animation-duration: 1.4s; }
.hart-root[data-state="thinking"] .hart-halo { animation: hart-think 1.2s var(--hart-ease) infinite; }
.hart-root[data-state="loading"] .hart-orb .hart-ring,
.hart-root[data-state="thinking"] .hart-orb .hart-ring {
  opacity: 1; animation: hart-spin 0.9s linear infinite;
}
.hart-ring {
  position: absolute; inset: 2px; border-radius: 50%; z-index: 2;
  border: 2px solid transparent; border-top-color: rgba(255,255,255,0.95);
  opacity: 0; transition: opacity var(--hart-dur-fast) var(--hart-ease);
  pointer-events: none;
}
.hart-ripple {
  position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  border: 2px solid var(--hart-accent, #9b94ff); opacity: 0;
}
.hart-root[data-state="listening"] .hart-halo { animation: none; }
.hart-root[data-state="listening"] .hart-ripple { animation: hart-ripple 1.6s var(--hart-ease) infinite; }
.hart-root[data-state="listening"] .hart-ripple.r2 { animation-delay: 0.8s; }
.hart-root[data-state="error"] .hart-halo { animation: hart-shake 0.42s var(--hart-ease) 1; }
.hart-badge {
  position: absolute; top: 2px; right: 2px; z-index: 3;
  min-width: 14px; height: 14px; border-radius: 7px;
  background: #ff5c80; border: 2px solid #fff;
  transform: scale(0); transition: transform var(--hart-dur) var(--hart-spring);
}
.hart-root[data-unread="true"] .hart-badge { transform: scale(1); }
.hart-label {
  pointer-events: none;
  padding: 8px 14px; border-radius: 999px;
  background: var(--hart-glass-bg);
  -webkit-backdrop-filter: var(--hart-glass-filter); backdrop-filter: var(--hart-glass-filter);
  border: var(--hart-glass-border);
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
  font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap;
  opacity: 0; transform: translateX(8px) scale(0.96);
  transition: opacity var(--hart-dur-fast) var(--hart-ease), transform var(--hart-dur) var(--hart-spring);
}
.hart-root[data-position="bottom-left"] .hart-label { transform: translateX(-8px) scale(0.96); }
@media (hover: hover) and (pointer: fine) {
  .hart-dock:hover .hart-label, .hart-orb:focus-visible + .hart-label { opacity: 1; transform: none; }
}
.hart-root[data-open="true"] .hart-label { opacity: 0 !important; }
.hart-tip {
  position: absolute; bottom: calc(100% + 10px); right: 0;
  max-width: min(280px, calc(100vw - 32px));
  padding: 10px 12px; border-radius: 12px;
  background: var(--hart-glass-bg); border: var(--hart-glass-border);
  -webkit-backdrop-filter: var(--hart-glass-filter); backdrop-filter: var(--hart-glass-filter);
  color: #fff; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.hart-root[data-position="bottom-left"] .hart-tip { right: auto; left: 0; }
@media (max-width: 767px) {
  /* the mobile sheet has its own close button; the orb would cover Send */
  .hart-root[data-open="true"]:not([data-surface="voice"]) .hart-dock,
  .hart-root[data-elsewhere="true"] .hart-dock {
    opacity: 0; pointer-events: none; transform: scale(0.6);
    transition: opacity var(--hart-dur-fast) var(--hart-ease), transform var(--hart-dur) var(--hart-spring);
  }
}
@keyframes hart-breathe { 0%, 100% { transform: translateZ(0) scale(1); } 50% { transform: translateZ(0) scale(1.035); } }
@keyframes hart-think { 0%, 100% { transform: translateZ(0) scale(1); } 50% { transform: translateZ(0) scale(0.96); } }
@keyframes hart-swirl { to { transform: rotate(360deg); } }
@keyframes hart-spin { to { transform: rotate(360deg); } }
@keyframes hart-ripple { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.8); } }
@keyframes hart-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@media (prefers-reduced-motion: reduce) {
  .hart-root *, .hart-root *::before, .hart-root *::after {
    animation: none !important; transition: none !important; scroll-behavior: auto !important;
  }
}
@media (forced-colors: active) {
  .hart-orb { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
`;
}
var q = {
	spark: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5zm6.5 11l.95 2.55L22 17l-2.55.95L18.5 20.5l-.95-2.55L15 17l2.55-.95.95-2.55z\"/></svg>",
	mic: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z\"/></svg>",
	store: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M4 4h16l1 5a3 3 0 0 1-2 2.83V20H5v-8.17A3 3 0 0 1 3 9l1-5zm3 16h4v-5H7v5zm6-5v3h4v-3h-4z\"/></svg>",
	megaphone: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M3 10v4a1 1 0 0 0 1 1h2l4 4V5L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.06A7 7 0 0 1 14 18.74v2.06A9 9 0 0 0 14 3.2z\"/></svg>",
	close: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z\"/></svg>"
};
//#endregion
export { d as _, U as a, P as c, V as d, D as f, h as g, _ as h, K as i, k as l, E as m, W as n, H as o, T as p, G as r, j as s, q as t, L as u, v };
