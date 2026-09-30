import { a as e } from "./hart-embed-liquidFragments-BE7blpJr.js";
//#region src/embed/transports/demoCatalog.js
var t = {
	Dairy: ["#e6f7f6", "#00736d"],
	Bakery: ["#fff4e5", "#8a4b00"],
	Staples: ["#f3efe6", "#5b4a2a"],
	Produce: ["#eaf7ea", "#1f6b2a"],
	Snacks: ["#fdecec", "#9b1c3a"],
	Beverages: ["#e9f0ff", "#1d4ed8"]
};
function n(e, n) {
	let [r, i] = t[n] || t.Staples, a = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><defs><radialGradient id="g" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${r}"/></radialGradient></defs><rect width="320" height="200" rx="18" fill="url(#g)"/><circle cx="160" cy="100" r="62" fill="${i}" fill-opacity="0.08"/><text x="160" y="124" font-size="72" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${e}</text></svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(a)}`;
}
function r(e, t, r, i, a, o, s) {
	return {
		sku: e,
		product_id: e,
		name: t,
		price: r,
		currency: "INR",
		category: i,
		image: n(a, i),
		rating: s,
		tags: o,
		source: "demo-synthetic"
	};
}
var i = Object.freeze([
	r("MLK-AAV-500", "Aavin Full Cream Milk 500 ml", 30, "Dairy", "🥛", ["milk", "full cream"], 4.6),
	r("MLK-AMT-500", "Amul Taaza Toned Milk 500 ml", 27, "Dairy", "🥛", ["milk", "toned"], 4.4),
	r("PNR-AMU-200", "Amul Fresh Paneer 200 g", 90, "Dairy", "🧀", ["paneer", "cottage cheese"], 4.5),
	r("PNR-MLM-200", "Milky Mist Paneer 200 g", 95, "Dairy", "🧀", ["paneer", "cottage cheese"], 4.7),
	r("BTR-AMU-100", "Amul Butter 100 g", 56, "Dairy", "🧈", ["butter"], 4.8),
	r("CRD-MTD-400", "Mother Dairy Curd 400 g", 35, "Dairy", "🥣", [
		"curd",
		"dahi",
		"yogurt"
	], 4.3),
	r("BRD-BRT-400", "Britannia Brown Bread 400 g", 50, "Bakery", "🍞", ["bread", "brown bread"], 4.2),
	r("EGG-FRM-6", "Farm Fresh Eggs (6 pcs)", 48, "Produce", "🥚", ["egg", "eggs"], 4.4),
	r("TOM-LOC-1K", "Tomato (Local) 1 kg", 40, "Produce", "🍅", ["tomato", "thakkali"], 4.1),
	r("ONI-LOC-1K", "Onion 1 kg", 35, "Produce", "🧅", ["onion", "vengayam"], 4.2),
	r("ATA-ASH-5K", "Aashirvaad Whole Wheat Atta 5 kg", 265, "Staples", "🌾", ["atta", "wheat flour"], 4.6),
	r("RCE-SNM-5K", "Sona Masoori Rice 5 kg", 340, "Staples", "🍚", ["rice", "sona masoori"], 4.5),
	r("DAL-TUR-1K", "Toor Dal 1 kg", 160, "Staples", "🫘", [
		"dal",
		"toor",
		"lentils"
	], 4.4),
	r("COF-NAR-200", "Narasu's Filter Coffee 200 g", 120, "Beverages", "☕", ["coffee", "filter coffee"], 4.7)
]);
function a(e) {
	return String(e || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function o(e) {
	return e.length > 3 && e.endsWith("s") ? e.slice(0, -1) : e;
}
function s(e, t = 3) {
	let n = a(e).split(" ").filter(Boolean).map(o);
	if (n.length === 0) return [];
	let r = i.map((e, t) => {
		let r = a(`${e.name} ${e.tags.join(" ")} ${e.category}`).split(" ").map(o), i = 0;
		return n.forEach((e) => {
			r.includes(e) ? i += 3 : r.some((t) => t.startsWith(e) || e.startsWith(t)) && (i += 1);
		}), {
			prod: e,
			score: i,
			i: t
		};
	}).filter((e) => e.score > 0);
	return r.sort((e, t) => t.score - e.score || e.i - t.i), r.slice(0, t).map((e) => e.prod);
}
var c = [
	["Dairy", [
		"milk",
		"butter",
		"paneer",
		"curd",
		"dahi",
		"cheese",
		"ghee",
		"cream"
	]],
	["Bakery", [
		"bread",
		"bun",
		"cake",
		"rusk"
	]],
	["Staples", [
		"atta",
		"rice",
		"dal",
		"flour",
		"sugar",
		"salt",
		"oil"
	]],
	["Produce", [
		"tomato",
		"onion",
		"potato",
		"egg",
		"banana",
		"apple"
	]],
	["Snacks", [
		"chips",
		"biscuit",
		"namkeen",
		"murukku",
		"chocolate"
	]],
	["Beverages", [
		"coffee",
		"tea",
		"juice",
		"water",
		"soda"
	]]
], l = {
	Dairy: "🧈",
	Bakery: "🍞",
	Staples: "🌾",
	Produce: "🥬",
	Snacks: "🍪",
	Beverages: "☕"
};
function u(e) {
	let t = a(e).split(" ").map(o), n = c.find(([, e]) => e.some((e) => t.includes(e)));
	return n ? n[0] : "Staples";
}
function d(e) {
	return l[e] || "🛍️";
}
//#endregion
//#region src/embed/transports/demoTransport.js
var f = {
	a: 1,
	an: 1,
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10,
	dozen: 12
}, p = {
	diwali: {
		name: "Diwali",
		date: "2026-11-08",
		emoji: "🪔",
		offer: "15% off sweets, dry fruits and ghee"
	},
	deepavali: {
		name: "Deepavali",
		date: "2026-11-08",
		emoji: "🪔",
		offer: "15% off sweets, dry fruits and ghee"
	},
	pongal: {
		name: "Pongal",
		date: "2027-01-14",
		emoji: "🌾",
		offer: "10% off rice, jaggery and moong dal"
	},
	christmas: {
		name: "Christmas",
		date: "2026-12-25",
		emoji: "🎄",
		offer: "10% off cakes, cocoa and baking needs"
	},
	"new year": {
		name: "New Year",
		date: "2027-01-01",
		emoji: "🎉",
		offer: "10% off party snacks and beverages"
	}
};
function m(e) {
	return String(e || "").replace(/[“”"'‘’]/g, "").replace(/[?!.]+$/g, "").replace(/\s+/g, " ").trim();
}
function h(e) {
	if (!e) return 1;
	let t = parseInt(e, 10);
	return Number.isFinite(t) && t > 0 ? Math.min(t, 99) : f[e.toLowerCase()] || 1;
}
function g(e) {
	let t = m(e), n = t.toLowerCase(), r;
	return n ? (r = t.match(/^(?:add|create|new|list)\s+(?:a\s+)?(?:new\s+)?sku\s+(.+?)\s*(?:@|at|for|price)?\s*(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*$/i), r ? {
		intent: "sku.create",
		name: r[1].trim(),
		price: Number(r[2])
	} : (r = t.match(/onboard\s+(?:my\s+)?(?:store|shop|kirana)\s+(.+?)\s+(?:in|at|pincode|pin|,)\s*(\d{6})\b/i), r ? {
		intent: "merchant.onboard",
		name: r[1].trim(),
		pincode: r[2]
	} : (r = t.match(/onboard\s+(?:my\s+)?(?:store|shop|kirana)\s*(.*)$/i), r ? {
		intent: "merchant.onboard",
		name: r[1].trim() || "",
		pincode: ""
	} : /\b(campaign|promotion|broadcast|festive offer)\b/i.test(n) ? {
		intent: "campaign.draft",
		occasion: Object.keys(p).find((e) => n.includes(e)) || null
	} : /\btrack\b|where(?:s| is) my order|order status|my orders?$/.test(n) ? { intent: "order.track" } : /^(?:checkout|check out|place (?:the |my )?order|pay(?: now)?|buy (?:it|them|everything)|proceed to (?:pay|checkout))$/.test(n) || /\b(checkout|check out)\b/.test(n) ? { intent: "checkout" } : /(what(?:s| is)? in my cart|show (?:me )?(?:my )?cart|view (?:my )?cart|^(?:my )?cart$|cart total)/.test(n) ? { intent: "cart.view" } : (r = n.match(/^(?:remove|delete|drop)\s+(?:(\d+|a|an|one|two|three)\s+)?(.+?)(?:\s+from\s+(?:my\s+)?cart)?$/), r ? {
		intent: "cart.remove",
		qty: r[1] ? h(r[1]) : null,
		query: r[2]
	} : (r = n.match(/^(?:add|buy|order|get|i want|i need|send)\s+(?:me\s+)?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)?\s*(?:x\s+|packets? of\s+|packs? of\s+|litres? of\s+|kg of\s+)?(.+?)(?:\s+to\s+(?:my\s+)?cart)?$/), r && r[2] ? {
		intent: "cart.add",
		qty: h(r[1]),
		query: r[2]
	} : (r = n.match(/^(?:find|search(?: for)?|show(?: me)?|look for|looking for|do you have|any|i(?:m| am) looking for)\s+(.+)$/), r ? {
		intent: "catalog.find",
		query: r[1]
	} : /^(hi|hello|hey|vanakkam|namaste)\b/.test(n) ? { intent: "greet" } : /\b(help|what can you do)\b/.test(n) ? { intent: "help" } : {
		intent: "catalog.find",
		query: n,
		implicit: !0
	})))))) : { intent: "empty" };
}
var _ = [
	"Add 2 milk",
	"Find paneer",
	"What's in my cart?",
	"Track my order"
];
function v(e) {
	if (!e) return null;
	let t = typeof e.price == "object" && e.price ? Number(e.price.amount) : Number(e.price);
	return {
		sku: e.sku || e.sku_id || e.skuId || e.id || e.product_id || e.productId,
		product_id: e.product_id || e.productId || e.id || e.sku,
		category_id: e.category_id || e.categoryId,
		name: e.name || e.title || "Item",
		price: Number.isFinite(t) ? t : 0,
		currency: e.currency || e.price && e.price.currency || "INR",
		image: e.image || e.image_url || e.imageUrl || e.thumbnail || null,
		rating: e.rating,
		description: e.description
	};
}
function y(e) {
	return {
		type: "product_card",
		name: e.name,
		price: e.price,
		currency: e.currency || "INR",
		image: e.image || n(d(u(e.name)), u(e.name)),
		image_url: e.image || void 0,
		rating: e.rating,
		description: e.description,
		sku: e.sku,
		product_id: e.product_id,
		category_id: e.category_id,
		buy_action: "cart.add"
	};
}
function b(t) {
	return {
		type: "cart",
		items: t.items.map((n) => ({
			name: n.name,
			qty: n.qty,
			sku: n.sku,
			price: e(n.price * n.qty, t.currency)
		})),
		total: t.total,
		currency: t.currency,
		checkout_action: "checkout.start"
	};
}
function x(e) {
	var t;
	if (!e || !Array.isArray(e.items)) return null;
	let n = e.items.map((e) => {
		var t, n;
		return {
			sku: e.sku || e.sku_id || e.id,
			name: e.name || "Item",
			qty: Number(e.qty || e.quantity || 1),
			price: Number(typeof e.price == "object" && e.price ? e.price.amount : (t = (n = e.unit_price) == null ? e.price : n) == null ? 0 : t)
		};
	});
	return {
		items: n,
		total: Number(typeof e.total == "object" && e.total ? e.total.amount : (t = e.total) == null ? n.reduce((e, t) => e + t.price * t.qty, 0) : t),
		currency: e.currency || "INR"
	};
}
function S(e) {
	let t = JSON.stringify(e.items.map((e) => [
		e.sku,
		e.qty,
		e.price
	]).sort((e, t) => String(e[0]).localeCompare(String(t[0])))) + `|${e.total}|${e.currency}`, n = 2166136261;
	for (let e = 0; e < t.length; e++) n ^= t.charCodeAt(e), n = Math.imul(n, 16777619) >>> 0;
	return n.toString(16).padStart(8, "0");
}
function C({ sink: t, delayMs: r = 420, hostTimeoutMs: i = 2500, storeName: a } = {}) {
	let o = 0, c = 24816, l = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map(), C = null, w = [], T = (e) => e > 0 ? new Promise((t) => setTimeout(t, e)) : Promise.resolve();
	function E() {
		let e = Array.from(l.values());
		return {
			items: e,
			total: e.reduce((e, t) => e + t.price * t.qty, 0),
			currency: "INR"
		};
	}
	function D(e) {
		return x(e && e.cart) || E();
	}
	function O(e) {
		return e && (e.store && e.store.name || e.merchant && e.merchant.name) || a || "your store";
	}
	async function k(e, n) {
		o += 1;
		let i = `demo-spec-${o}`;
		t.message({
			text: e,
			speculationId: i,
			isDraft: !0,
			source: "draft"
		}), await T(r);
		let a = await n();
		t.replaceDraft(i, a.text, "demo", {
			suggestions: a.suggestions,
			tone: a.tone
		}), (a.fragments || []).forEach((e) => t.fragment(e, "mcgroce_demo"));
	}
	async function A(e, n = 3) {
		let r = await t.request("catalog.search", {
			q: e,
			limit: n
		}, { timeoutMs: i });
		return r.ok ? {
			items: (Array.isArray(r.data) ? r.data : r.data && (r.data.items || r.data.products || r.data.results) || []).map(v).filter(Boolean).slice(0, n),
			from: "host"
		} : r.code === "timeout" || r.code === "no_host" ? {
			items: s(e, n),
			from: "demo"
		} : {
			items: [],
			from: "host",
			error: r.error
		};
	}
	async function j(e, n) {
		let r = {
			sku: e.sku,
			productId: e.product_id,
			categoryId: e.category_id,
			name: e.name,
			qty: n,
			price: e.price,
			currency: e.currency || "INR"
		}, a = await t.request("cart.add", r, { timeoutMs: i });
		if (!a.ok && a.code !== "timeout" && a.code !== "no_host") return {
			ok: !1,
			error: a.error
		};
		let o = l.get(e.sku) || {
			sku: e.sku,
			name: e.name,
			qty: 0,
			price: e.price
		};
		return o.qty += n, l.set(e.sku, o), {
			ok: !0,
			cart: a.ok && a.data && x(a.data.cart || a.data) || E(),
			offline: !a.ok
		};
	}
	async function M(e, t, n) {
		let r = await A(e, 3);
		if (w = r.items, r.error) return {
			text: `I couldn't search the store just now (${r.error}). Try again in a moment.`,
			tone: "error",
			suggestions: ["Find paneer"]
		};
		if (r.items.length === 0) return {
			text: n ? `I can help you shop at ${O(t)}. Try "add 2 milk", "find paneer" or "track my order".` : `I couldn't find "${e}" at ${O(t)}. Try milk, paneer, bread or eggs.`,
			suggestions: _
		};
		let i = r.items.length;
		return {
			text: `Here ${i === 1 ? "is 1 option" : `are ${i} options`} for ${e}. Tap Add to put one in your cart.`,
			fragments: r.items.map(y),
			suggestions: [`Add 1 ${r.items[0].name}`, "What's in my cart?"]
		};
	}
	async function N(t, n) {
		let r = (await A(t, 1)).items[0];
		if (!r) return {
			text: `I couldn't find "${t}". Try "find ${t.split(" ")[0]}" to see what's in stock.`,
			suggestions: ["Find milk", "Find paneer"]
		};
		let i = await j(r, n);
		if (!i.ok) return {
			text: `I couldn't add ${r.name}: ${i.error}`,
			tone: "error",
			suggestions: [`Add ${n} ${t}`]
		};
		let a = i.cart, o = a.items.reduce((e, t) => e + t.qty, 0);
		return {
			text: `Added ${n} × ${r.name} (${e(r.price * n, "INR")}). You have ${o} item${o === 1 ? "" : "s"} · ${e(a.total, a.currency)}.`,
			fragments: [b(a)],
			suggestions: ["Checkout", "Find paneer"]
		};
	}
	async function P(e, n) {
		let r = Array.from(l.values()).find((t) => t.name.toLowerCase().includes(e.toLowerCase().split(" ")[0]));
		if (!r) return {
			text: `There's no ${e} in your cart.`,
			suggestions: ["What's in my cart?"]
		};
		let a = n ? Math.min(n, r.qty) : r.qty, o = await t.request(a >= r.qty ? "cart.remove" : "cart.update", {
			sku: r.sku,
			qty: r.qty - a
		}, { timeoutMs: i });
		if (!o.ok && o.code !== "timeout" && o.code !== "no_host") return {
			text: `I couldn't update your cart: ${o.error}`,
			tone: "error"
		};
		r.qty -= a, r.qty <= 0 && l.delete(r.sku);
		let s = E();
		return {
			text: `Removed ${a} × ${r.name}.`,
			fragments: s.items.length ? [b(s)] : [],
			suggestions: s.items.length ? ["Checkout"] : ["Add 2 milk"]
		};
	}
	function F(t) {
		let n = D(t);
		if (!n.items.length) return {
			text: "Your cart is empty. Try \"add 2 milk\" or \"find paneer\".",
			suggestions: ["Add 2 milk", "Find paneer"]
		};
		let r = n.items.reduce((e, t) => e + t.qty, 0);
		return {
			text: `You have ${r} item${r === 1 ? "" : "s"} worth ${e(n.total, n.currency)}.`,
			fragments: [b(n)],
			suggestions: ["Checkout", "Add 2 milk"]
		};
	}
	function I(t) {
		let n = D(t);
		if (!n.items.length) return {
			text: "Your cart is empty, so there is nothing to pay for yet.",
			suggestions: ["Add 2 milk"]
		};
		o += 1;
		let r = n.items.reduce((e, t) => e + t.qty, 0), i = `pay_demo_${o}`, a = `ap2_pay:${i}`, s = {
			mandate_id: `mnd_demo_${o}`,
			payment_id: i,
			merchant: O(t),
			amount: n.total,
			currency: n.currency,
			cart_hash: S(n),
			status: "pending",
			items: n.items
		};
		return f.set(a, s), {
			text: `Your total is ${e(n.total, n.currency)}. Approve the payment and I'll place the order — nothing is charged until you do.`,
			fragments: [{
				type: "checkout",
				items: n.items.map((e) => ({
					name: e.name,
					qty: e.qty
				})),
				items_count: n.items.reduce((e, t) => e + t.qty, 0),
				total: n.total,
				currency: n.currency,
				payment_methods: [
					"UPI",
					"Card",
					"Cash on delivery"
				],
				confirm_action: a,
				approval_action: a
			}, {
				type: "approval",
				title: "Approve payment",
				description: `Pay ${e(n.total, n.currency)} to ${s.merchant} for ${r} item${r === 1 ? "" : "s"}.`,
				action: a,
				options: [
					`Pay ${e(n.total, n.currency)}`,
					"Cancel",
					"Later"
				]
			}]
		};
	}
	function L(e) {
		let t = [
			"Order placed",
			"Accepted by store",
			"Out for delivery",
			"Delivered"
		], n = Math.max(0, t.indexOf(e.status));
		return {
			type: "order_tracking",
			order_id: e.order_id,
			status: e.status,
			steps: t.map((e, t) => ({
				label: e,
				completed: t <= n,
				current: t === n
			})),
			eta: e.eta
		};
	}
	function R(e) {
		let t = e && Array.isArray(e.orders) && e.orders[0], n = t ? {
			order_id: t.order_id || t.orderNumber || t.id,
			status: t.status || "Accepted by store",
			eta: t.eta
		} : C || {
			order_id: "MG-24816",
			status: "Out for delivery",
			eta: "about 12 min"
		};
		return n.order_id ? {
			text: `Order ${n.order_id} is ${String(n.status).toLowerCase()}${n.eta ? ` — ${n.eta} away` : ""}.`,
			fragments: [L(n)],
			suggestions: ["Add 2 milk"]
		} : {
			text: "You don't have an active order right now.",
			suggestions: ["Add 2 milk"]
		};
	}
	function z(e, t) {
		o += 1;
		let n = `mrc_demo_${o}`;
		return h.set(n, {
			name: e,
			pincode: t
		}), {
			text: e ? `Let's get ${e} live on McGroce. I've filled in what I know — add your phone and email, then submit.` : "Let's get your store live on McGroce. Tell me a few details.",
			fragments: [{
				type: "form",
				title: e ? `Onboard ${e}` : "Onboard your store",
				action: "merchant.onboard",
				draft_id: n,
				submit_label: "Submit for review",
				fields: [
					{
						name: "display_name",
						label: "Store name",
						value: e,
						required: !0
					},
					{
						name: "zip",
						label: "Pincode",
						value: t,
						required: !0,
						type: "text",
						inputMode: "numeric"
					},
					{
						name: "phone",
						label: "Phone",
						type: "tel",
						required: !0,
						placeholder: "10-digit mobile"
					},
					{
						name: "email",
						label: "Email",
						type: "email",
						required: !0
					},
					{
						name: "address",
						label: "Street address",
						placeholder: "Shop no., street, area"
					},
					{
						name: "delivery_radius_km",
						label: "Delivery radius (km)",
						type: "number",
						value: "5"
					},
					{
						name: "min_order_inr",
						label: "Minimum order (₹)",
						type: "number",
						value: "0"
					}
				]
			}]
		};
	}
	function B(t, r, i) {
		o += 1;
		let a = `sku_demo_${o}`, s = u(t), c = {
			draft_id: a,
			name: t,
			price_inr: r,
			category: s,
			merchant: O(i)
		};
		return m.set(`sku_publish:${a}`, c), {
			text: `Here's the listing for ${t}. Approve it and it goes live at ${e(r, "INR")}.`,
			fragments: [{
				type: "product_card",
				name: t,
				price: r,
				currency: "INR",
				description: `New SKU · ${s} · draft`,
				image: n(d(s), s),
				sku: a
			}, {
				type: "approval",
				title: "Publish new SKU?",
				description: `${t} at ${e(r, "INR")} in ${s}.`,
				action: `sku_publish:${a}`,
				options: [
					"Publish",
					"Discard",
					"Later"
				]
			}]
		};
	}
	function V(e, t) {
		let n = p[e] || {
			name: "Weekend",
			date: "",
			emoji: "🛒",
			offer: "10% off fresh produce"
		}, r = O(t);
		return {
			text: `Here's a ${n.name} campaign draft for ${r}. Edit anything, then save it — nothing is sent to customers until you approve it.`,
			fragments: [{
				type: "form",
				title: `${n.name} campaign`,
				action: "campaign.draft",
				submit_label: "Save draft",
				fields: [
					{
						name: "title",
						label: "Campaign name",
						value: `${n.name} Dhamaka`,
						required: !0
					},
					{
						name: "message",
						label: "Message",
						type: "textarea",
						required: !0,
						value: `${n.emoji} This ${n.name}, celebrate with ${r}! Get ${n.offer}. Free delivery above ₹499 — order on McGroce.`
					},
					{
						name: "audience",
						label: "Send to",
						value: "Customers who ordered in the last 90 days"
					},
					{
						name: "channel",
						label: "Channel",
						value: "WhatsApp and SMS"
					},
					{
						name: "send_on",
						label: "Send on",
						type: "date",
						value: n.date
					}
				]
			}, {
				type: "metric",
				label: "Estimated reach",
				value: 1240,
				unit: " customers",
				trend: "up"
			}]
		};
	}
	async function H(e, { context: n } = {}) {
		let r = g(e), i = n || t.getContext() || {};
		switch (r.intent) {
			case "cart.add": return k(`Finding ${r.query}…`, () => N(r.query, r.qty));
			case "cart.remove": return k("Updating your cart…", () => P(r.query, r.qty));
			case "catalog.find": return k(`Looking for ${r.query}…`, () => M(r.query, i, r.implicit));
			case "cart.view": return k("Checking your cart…", () => F(i));
			case "checkout": return k("Preparing checkout…", () => I(i));
			case "order.track": return k("Checking your order…", () => R(i));
			case "merchant.onboard": return k("Setting up your store…", () => z(r.name, r.pincode));
			case "sku.create": return k("Drafting the listing…", () => B(r.name, r.price, i));
			case "campaign.draft": return k("Writing a draft…", () => V(r.occasion, i));
			default: return k("…", () => ({
				text: `Vanakkam! I'm the ${O(i)} assistant. I can find products, fill your cart, check out and track orders.`,
				suggestions: _
			}));
		}
	}
	async function U({ action: e, decision: t }) {
		return f.has(e) ? W(e, t) : m.has(e) ? G(e, t) : {
			ok: !1,
			error: "This approval has expired."
		};
	}
	async function W(n, r) {
		let i = f.get(n);
		if (i.status !== "pending") return {
			ok: !1,
			error: `This payment is already ${i.status}.`
		};
		let a = (e) => t.patchInline((e) => e.type === "checkout" && e.approval_action === n, e);
		if (r === "deny") return i.status = "rejected", a({ cancelled: !0 }), t.message({
			text: "Okay, I've cancelled that payment. Your cart is unchanged.",
			suggestions: ["What's in my cart?"]
		}), { ok: !0 };
		if (r === "later") return t.message({ text: "No problem — say \"checkout\" whenever you are ready." }), { ok: !0 };
		let o = await t.request("payment.authorize", {
			mandate: {
				mandate_id: i.mandate_id,
				payment_id: i.payment_id,
				cart_hash: i.cart_hash,
				merchant: i.merchant
			},
			amount: i.amount,
			currency: i.currency,
			merchant: i.merchant
		}, { timeoutMs: 6e4 });
		if (!o.ok) return t.fragment({
			type: "payment_status",
			status: "error",
			amount: e(i.amount, i.currency)
		}, "mcgroce_demo"), t.message({
			text: `The payment didn't go through: ${o.error} Your cart is safe — try again when you're ready.`,
			tone: "error",
			suggestions: ["Checkout"]
		}), {
			ok: !1,
			error: o.error
		};
		i.status = "consumed", c += 1;
		let s = o.data && (o.data.order_id || o.data.orderNumber) || `MG-${c}`;
		return C = {
			order_id: s,
			status: "Accepted by store",
			eta: "about 25 min"
		}, l.clear(), a({
			paid: !0,
			order_id: s
		}), t.patchInline((e) => e.type === "cart", {
			superseded: !0,
			ordered: !0
		}), t.fragment({
			type: "payment_status",
			status: "success",
			amount: e(i.amount, i.currency),
			method: o.data && o.data.method || "UPI · AP2 mandate",
			transaction_id: o.data && o.data.transaction_id || i.payment_id
		}, "mcgroce_demo"), t.fragment(L(C), "mcgroce_demo"), t.message({
			text: `Paid ${e(i.amount, i.currency)}. Order ${s} is confirmed — ${i.merchant} is packing it now.`,
			suggestions: ["Track my order"]
		}), {
			ok: !0,
			data: { order_id: s }
		};
	}
	async function G(n, r) {
		let a = m.get(n);
		if (r === "deny") return m.delete(n), t.message({ text: `Discarded the ${a.name} draft.` }), { ok: !0 };
		if (r === "later") return t.message({ text: `I'll keep the ${a.name} draft for later.` }), { ok: !0 };
		let o = await t.request("merchant.sku.upsert", a, { timeoutMs: i * 4 });
		return o.ok ? (m.delete(n), t.fragment({
			type: "notification",
			severity: "success",
			title: "SKU published",
			message: `${a.name} is live at ${e(a.price_inr, "INR")}.`
		}, "mcgroce_demo"), t.message({
			text: `${a.name} is live. Customers near ${a.merchant} can order it now.`,
			suggestions: ["Draft a Diwali campaign for my customers"]
		}), {
			ok: !0,
			data: o.data
		}) : (t.message({
			text: `Couldn't publish ${a.name}: ${o.error}`,
			tone: "error"
		}), {
			ok: !1,
			error: o.error
		});
	}
	function K(e, t) {
		let n = {};
		return e === "merchant.onboard" && (String(t.display_name || "").trim() || (n.display_name = "Enter your store name"), /^\d{6}$/.test(String(t.zip || "").trim()) || (n.zip = "Enter a 6-digit pincode"), /^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(String(t.phone || "").replace(/\s/g, "")) || (n.phone = "Enter a 10-digit mobile number"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(t.email || "").trim()) || (n.email = "Enter a valid email")), e === "campaign.draft" && (String(t.title || "").trim() || (n.title = "Give the campaign a name"), String(t.message || "").trim() || (n.message = "Write a message")), n;
	}
	async function q({ action: e, values: n, form: r }) {
		let a = e, o = n || {}, s = K(a, o);
		if (Object.keys(s).length) return {
			ok: !1,
			fieldErrors: s,
			error: "Please fix the highlighted fields."
		};
		let c = a === "merchant.onboard" ? {
			...o,
			draft_id: r && r.draft_id,
			delivery_radius_km: Number(o.delivery_radius_km || 5),
			min_order_inr: Number(o.min_order_inr || 0)
		} : o, l = await t.request(a, c, { timeoutMs: i * 4 });
		return !l.ok && l.code !== "timeout" && l.code !== "no_host" ? {
			ok: !1,
			error: l.error
		} : (a === "merchant.onboard" ? (t.fragment({
			type: "agent_action",
			action: "Store submitted",
			description: `${o.display_name} · ${o.zip}`,
			status: "completed",
			result: "We'll email a secure link to set your password."
		}, "mcgroce_demo"), t.message({
			text: `${o.display_name} is submitted for review. Next, add your first product — e.g. "add SKU Amul Butter 100g ₹56".`,
			suggestions: ["Add SKU Amul Butter 100g ₹56"]
		})) : a === "campaign.draft" && (t.fragment({
			type: "notification",
			severity: "success",
			title: "Draft saved",
			message: `"${o.title}" is saved. Nothing is sent until you approve it.`
		}, "mcgroce_demo"), t.message({ text: `Saved "${o.title}" as a draft.` })), {
			ok: !0,
			data: l.data,
			offline: !l.ok
		});
	}
	async function J(n, r) {
		if (n === "approval.decide") return U(r);
		if (n === "checkout.confirm") return U({
			action: r.approval_action || r.confirm_action,
			decision: "approve"
		});
		if (n === "form.submit") return q(r);
		if (n === "cart.add") {
			let n = w.find((e) => e.sku === r.sku) || r, i = await j({
				...n,
				currency: n.currency || "INR"
			}, r.qty || 1);
			return i.ok && t.fragment({
				type: "notification",
				severity: "success",
				title: "Added to cart",
				message: `${n.name} · ${e(i.cart.total, i.cart.currency)} total`
			}, "mcgroce_demo"), i;
		}
	}
	return {
		kind: "demo",
		label: "Demo agent · offline",
		send: H,
		handleAction: J,
		disconnect() {}
	};
}
//#endregion
export { C as createDemoTransport };
