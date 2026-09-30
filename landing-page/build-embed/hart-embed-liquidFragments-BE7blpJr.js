//#region src/constants/liquidFragments.js
var e = Object.freeze(/* @__PURE__ */ new Set([
	"notification",
	"progress",
	"agent_action",
	"payment_status",
	"lyrics",
	"order_tracking",
	"approval",
	"metric",
	"code",
	"markdown",
	"media",
	"chart",
	"list",
	"meet_copilot"
])), t = Object.freeze(/* @__PURE__ */ new Set([
	"product_card",
	"cart",
	"checkout",
	"comparison",
	"form"
])), n = Object.freeze(/* @__PURE__ */ new Set(["navigate"])), r = Object.freeze({
	FLOATING: "floating",
	INLINE: "inline",
	NAVIGATE: "navigate"
});
function i(i) {
	let a = i || "notification";
	return n.has(a) ? r.NAVIGATE : e.has(a) ? r.FLOATING : t.has(a) ? r.INLINE : r.FLOATING;
}
var a = /^[A-Z]{3}$/, o = /* @__PURE__ */ new Map();
function s(e, t) {
	if (e == null || e === "") return "";
	if (typeof e == "string" && !/^-?\d+(\.\d+)?$/.test(e.trim())) return e;
	let n = Number(e);
	if (!Number.isFinite(n)) return String(e);
	if (t && a.test(t)) {
		let e = Number.isInteger(n) ? 0 : 2, r = `${t}:${e}`;
		if (!o.has(r)) try {
			o.set(r, new Intl.NumberFormat("en-IN", {
				style: "currency",
				currency: t,
				minimumFractionDigits: e,
				maximumFractionDigits: e
			}));
		} catch {
			o.set(r, null);
		}
		let i = o.get(r);
		if (i) return i.format(n);
	}
	return `${n} ${t || "Spark"}`;
}
function c(e) {
	let t = e || {}, n = t.type || "";
	switch (n) {
		case "product_card": return `${t.name || "Product"} — ${s(t.price, t.currency) || "Free"}`;
		case "cart": return `Cart: ${(t.items || []).length} items, ${s(t.total || 0, t.currency)}`;
		case "checkout": return `Checkout: ${s(t.total || 0, t.currency)}`;
		case "comparison": return `Comparing ${(t.apps || []).length} apps`;
		case "payment_status": return `Payment ${t.status || "pending"}`;
		case "order_tracking": return `Order ${t.order_id || ""}: ${t.status || ""}`;
		case "agent_action": return t.description || t.action_type || "Working...";
		case "approval": return `Approval: ${t.description || t.action || "pending"}`;
		case "chart": return `Chart: ${t.title || "data"}`;
		case "code": return `Code: ${t.filename || t.language || "snippet"}`;
		case "markdown": return (t.content || "").substring(0, 80);
		case "media": return `Media: ${t.alt || t.title || t.media_type || "content"}`;
		case "metric": return `${t.label || "Metric"}: ${t.value || 0}${t.unit || ""}`;
		case "form": return `Form: ${t.title || "input needed"}`;
		case "qr_pair": return `Scan QR: ${t.title || t.channel || "connect"}`;
		case "list": return `List: ${(t.items || []).length} items`;
		case "navigate": return `Navigate: ${t.title || t.target || ""}`;
		case "meet_copilot": {
			let e = Array.isArray(t.transcript_lines) ? t.transcript_lines : [], n = e.length > 0 ? e[e.length - 1] : null, r = n ? typeof n == "string" ? n : n.text || "" : "";
			return `${t.platform || "meet"} · ${e.length} lines${r ? " · " + r.slice(0, 40) : ""}`;
		}
		default: return t.message || t.content || t.title || n;
	}
}
//#endregion
export { s as a, n as i, r as n, i as o, t as r, c as s, e as t };
