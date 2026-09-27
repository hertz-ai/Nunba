import { i as e, t } from "./hart-embed-hostBridge-8cnIGXKd.js";
import { t as n } from "./hart-embed-realtimeService-CuKUvH0I.js";
//#region src/embed/transports/gatewayTransport.js
var r = 9e4;
function i(e, t) {
	return `${String(e || "").replace(/\/+$/, "")}${t.startsWith("/") ? t : `/${t}`}`;
}
function a(e) {
	return (Array.isArray(e) ? e[0] : e) || "";
}
function o(e) {
	if (!e) return {};
	let t = {};
	return e.page && (t.page = e.page), e.product && (t.product = e.product), e.cart && (t.cart = {
		total: e.cart.total,
		currency: e.cart.currency,
		items: (e.cart.items || []).slice(0, 20).map((e) => ({
			sku: e.sku,
			name: e.name,
			qty: e.qty
		}))
	}), e.store && (t.store = {
		id: e.store.id,
		name: e.store.name
	}), e.merchant && (t.merchant = {
		id: e.merchant.id,
		name: e.merchant.name
	}), t;
}
function s({ sink: s, gatewayUrl: c, promptId: l, userId: u, locale: d, getToken: f, fetchImpl: p, realtime: m }) {
	let h = p || ((...e) => fetch(...e)), g = m || n, _ = l || null, v = 0, y = [];
	async function b() {
		let e = { "Content-Type": "application/json" };
		try {
			let t = f ? await f() : null;
			t && (e.Authorization = `Bearer ${t}`);
		} catch {}
		return e;
	}
	async function x(e, t, n = 2e4) {
		let r = typeof AbortController < "u" ? new AbortController() : null, a = r ? setTimeout(() => r.abort(), n) : null;
		try {
			let n = await h(i(c, e), {
				method: "POST",
				headers: await b(),
				body: JSON.stringify(t),
				signal: r ? r.signal : void 0,
				credentials: "same-origin"
			}), a = null;
			try {
				a = await n.json();
			} catch {
				a = null;
			}
			if (!n.ok) {
				let e = /* @__PURE__ */ Error(n.status === 429 ? "The assistant is busy. Please try again in a few seconds." : n.status === 401 || n.status === 403 ? "Please sign in again to use the assistant." : "The assistant could not answer just now.");
				throw e.code = `http_${n.status}`, e;
			}
			return a || {};
		} catch (e) {
			if (e && e.name === "AbortError") {
				let e = /* @__PURE__ */ Error("The assistant took too long to answer. Please try again.");
				throw e.code = "timeout", e;
			}
			if (e && e.code) throw e;
			let t = /* @__PURE__ */ Error("Can't reach the assistant. Check your connection and try again.");
			throw t.code = "network", t;
		} finally {
			a && clearTimeout(a);
		}
	}
	function S() {
		let e = null;
		Promise.resolve(f ? f() : null).then((t) => {
			e = t;
		}).catch(() => {}).finally(() => {
			e && g.connect(e), g.init(null, {
				userId: u || void 0,
				sseBase: i(c, "/api/social")
			});
		}), y.push(g.on("agent.ui.update", (e) => s.fragment(e)));
		let t = (e) => {
			if (!e || !e.speculation_id) return;
			let t = a(e.text) || e.response || "";
			t && s.replaceDraft(e.speculation_id, t, e.source || "expert");
		};
		y.push(g.on("chat.response", t)), y.push(g.on("chat_response", t));
	}
	async function C(t, { context: n } = {}) {
		v += 1;
		let i = `emb_${Date.now().toString(36)}_${v}`, c = o(n), l = await x("/chat", {
			prompt: `[mcgroce_ctx]${JSON.stringify(c)}\n${t}`,
			text: t,
			context: c,
			prompt_id: _ || void 0,
			request_id: i,
			user_id: u || void 0,
			media_mode: "text",
			preferred_lang: d || void 0
		}, r);
		l.prompt_id && (_ = l.prompt_id);
		let f = a(l.text) || l.response || l.message || l.answer || "";
		if (f) {
			let e = !!(l.speculation_id && l.expert_pending);
			s.message({
				text: f,
				speculationId: l.speculation_id,
				isDraft: e,
				source: e ? "draft" : l.responding_agent || "agent"
			});
		}
		e(l).forEach((e) => s.fragment(e)), l.dynamic_layout && s.layout(l.dynamic_layout, l.dynamic_data || l.layout_data || {}), !f && !(l.ui_components || []).length && s.message({ text: "I didn't catch that. Could you say it another way?" });
	}
	async function w(e) {
		let t = String(e.action || "");
		if (t.startsWith("ap2_pay:") && e.decision === "approve") {
			let n = await s.request("payment.authorize", {
				mandate: {
					payment_id: t.slice(8),
					mandate_id: e.mandate_id
				},
				amount: e.amount,
				currency: e.currency,
				merchant: e.merchant
			}, { timeoutMs: 6e4 });
			if (!n.ok) return n;
		}
		try {
			return {
				ok: !0,
				data: await x("/api/agent/approval", {
					agent_id: e.agent_id || e._agent_id,
					action: t,
					decision: e.decision,
					approved: e.decision === "approve"
				})
			};
		} catch (e) {
			return {
				ok: !1,
				error: e.message,
				code: e.code
			};
		}
	}
	async function T(e, n) {
		if (e === "approval.decide") return w(n);
		if (e === "checkout.confirm") return w({
			...n,
			action: n.approval_action || n.confirm_action,
			decision: "approve"
		});
		if (e === "form.submit") {
			let e = String(n.action || "");
			if (t.includes(e)) return s.request(e, n.values || {});
			if (e.startsWith("/")) try {
				return {
					ok: !0,
					data: await x(e, n.values || {})
				};
			} catch (e) {
				return {
					ok: !1,
					error: e.message
				};
			}
			return {
				ok: !1,
				error: "This form has no destination."
			};
		}
	}
	return {
		kind: "gateway",
		label: "",
		connect: S,
		send: C,
		handleAction: T,
		setUser(e) {
			u = e || null, g.init(null, {
				userId: u || void 0,
				sseBase: i(c, "/api/social")
			});
		},
		disconnect() {
			y.splice(0).forEach((e) => e && e());
		}
	};
}
//#endregion
export { s as createGatewayTransport };
