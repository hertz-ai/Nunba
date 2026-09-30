import { n as e, o as t, s as n } from "./hart-embed-liquidFragments-BE7blpJr.js";
//#region src/embed/a2uiAdapter.js
var r = 0;
function i(e, t) {
	if (!e || typeof e != "object") return null;
	let n = e;
	n.component && typeof n.component == "object" && (n = {
		...n.component,
		agent_id: n.component.agent_id || n.agent_id,
		agent_name: n.component.agent_name || n.agent_name,
		msg_id: n.component.msg_id || n.msg_id
	});
	let i = n.type && n.type !== "agent.ui.update" ? n.type : n.component_type || "notification", a = n._agent_id || n.agent_id || t || "agent", o = n._fid || n.msg_id || `f${Date.now().toString(36)}_${++r}`;
	return {
		...n,
		type: i,
		_agent_id: a,
		_ts: n._ts || Date.now() / 1e3,
		_fid: o,
		msg_id: n.msg_id || o
	};
}
function a(r, i) {
	let a = r, o = t(a.type);
	return o === e.NAVIGATE ? (i.navigate({
		target: a.target || "",
		params: a.params || {},
		transition: a.transition || "default",
		title: a.title || a.target || "",
		_agent_id: a._agent_id,
		_ts: a._ts
	}), i.floating({
		type: "notification",
		title: a.agent_name || a._agent_id,
		message: "Navigating to " + (a.title || a.target || "..."),
		severity: "info",
		_ts: a._ts,
		_fid: `${a._fid}:nav`,
		msg_id: `${a._fid}:nav`,
		_summaryOf: a._fid
	})) : o === e.INLINE ? (i.inline(a), i.floating({
		type: "notification",
		title: a.agent_name || a._agent_id,
		message: n(a),
		severity: "info",
		_ts: a._ts,
		_fid: `${a._fid}:summary`,
		msg_id: `${a._fid}:summary`,
		_summaryOf: a._fid
	})) : i.floating(a), o;
}
function o(e) {
	if (!e || !Array.isArray(e.ui_components)) return [];
	let t = e.agent_id || e.source || "local";
	return e.ui_components.filter((e) => e && e.type).map((e) => i(e, t));
}
//#endregion
//#region src/embed/hostBridge.js
var s = Object.freeze([
	"cart.add",
	"cart.remove",
	"cart.update",
	"checkout.start",
	"payment.authorize",
	"catalog.search",
	"merchant.onboard",
	"merchant.sku.upsert",
	"campaign.draft"
]), c = Object.freeze({
	READY: "hart:ready",
	ACTION: "hart:action",
	ACTION_RESULT: "hart:action-result",
	NAVIGATE: "hart:navigate",
	MESSAGE: "hart:message",
	ERROR: "hart:error"
}), l = 15e3, u = 0;
function d() {
	return u += 1, `hart_${Date.now().toString(36)}_${u}`;
}
function f(e, t = {}) {
	var n;
	let r = (n = t.timeoutMs) == null ? l : n, i = /* @__PURE__ */ new Map(), a = t.resultTargets || [e, typeof window < "u" ? window : null].filter(Boolean);
	function o(e) {
		if (!e || !e.requestId) return !1;
		let t = i.get(e.requestId);
		return t ? (i.delete(e.requestId), clearTimeout(t.timer), t.resolve(e.ok === !1 ? {
			ok: !1,
			error: e.error || "The store could not complete that.",
			code: e.code || "host_error",
			data: e.data
		} : {
			ok: !0,
			data: e.data
		}), !0) : !1;
	}
	let s = (e) => o(e && e.detail);
	a.forEach((e) => e.addEventListener(c.ACTION_RESULT, s));
	function u(t, n) {
		let r = new CustomEvent(t, {
			detail: n,
			bubbles: !0,
			composed: !0,
			cancelable: !0
		});
		return e.dispatchEvent(r);
	}
	function f(e, t, n = {}) {
		var a;
		let s = d(), l = (a = n.timeoutMs) == null ? r : a;
		return new Promise((n) => {
			let r = setTimeout(() => {
				i.has(s) && (i.delete(s), n({
					ok: !1,
					code: "timeout",
					error: "The store did not answer in time."
				}));
			}, l);
			i.set(s, {
				resolve: n,
				timer: r,
				kind: e
			}), u(c.ACTION, {
				kind: e,
				requestId: s,
				payload: t || {},
				respond: (e) => o({
					...e || {},
					requestId: s
				})
			});
		});
	}
	function p() {
		a.forEach((e) => e.removeEventListener(c.ACTION_RESULT, s)), i.forEach((e) => {
			clearTimeout(e.timer), e.resolve({
				ok: !1,
				code: "destroyed",
				error: "The assistant was closed."
			});
		}), i.clear();
	}
	return {
		emit: u,
		request: f,
		settle: o,
		destroy: p,
		get pendingCount() {
			return i.size;
		}
	};
}
//#endregion
export { i as a, o as i, c as n, a as o, f as r, s as t };
