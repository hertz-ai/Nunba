import { a as e } from "./hart-embed-liquidFragments-BE7blpJr.js";
import { _ as t, a as n, c as r, f as i, l as a, m as o, n as s, o as c, r as l, s as u } from "./hart-embed-launcherStyles-CXgNY9Bj.js";
import { a as d, i as f, n as p, o as m, r as h, s as g, t as _ } from "./hart-embed-realtimeService-BPbQiNix.js";
//#region \0rolldown/runtime.js
var v = Object.create, y = Object.defineProperty, b = Object.getOwnPropertyDescriptor, x = Object.getOwnPropertyNames, S = Object.getPrototypeOf, C = Object.prototype.hasOwnProperty, w = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, T = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), E = (e, t) => {
	let n = {};
	for (var r in e) y(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || y(n, Symbol.toStringTag, { value: "Module" }), n;
}, D = (e, t, n, r) => {
	if (t && typeof t == "object" || typeof t == "function") for (var i = x(t), a = 0, o = i.length, s; a < o; a++) s = i[a], !C.call(e, s) && s !== n && y(e, s, {
		get: ((e) => t[e]).bind(null, s),
		enumerable: !(r = b(t, s)) || r.enumerable
	});
	return e;
}, O = (e, t, n) => (n = e == null ? {} : v(S(e)), D(t || !e || !e.__esModule || !C.call(e, "default") ? y(n, "default", {
	value: e,
	enumerable: !0
}) : n, e)), k = (e) => C.call(e, "module.exports") ? e["module.exports"] : D(y({}, "__esModule", { value: !0 }), e), A = Object.freeze({
	computer_control: {
		asks: "control this computer",
		privacyCard: !0
	},
	screen_capture: {
		asks: "see this screen",
		privacyCard: !0
	},
	camera_capture: {
		asks: "see through your camera",
		privacyCard: !0
	},
	data_access: {
		asks: "use your data",
		privacyCard: !1
	},
	copilot_access: {
		asks: "use your Claude subscription for a hard step",
		privacyCard: !0
	},
	device_access: {
		asks: "use this computer's agents from the network",
		privacyCard: !0,
		perRequester: !0
	},
	voice_speech: {
		asks: "speak aloud and provide voice guidance",
		privacyCard: !0
	},
	capability_setup: {
		asks: "set up a capability this computer is missing",
		privacyCard: !1
	},
	peer_admission: {
		asks: "link with this computer without proving who it is",
		privacyCard: !1
	},
	credential: {
		asks: "use a password or key you enter here",
		privacyCard: !1,
		secret: !0,
		declinable: !0
	}
}), j = "secret:";
function M(e) {
	return !!(A[e] && A[e].secret);
}
function N(e) {
	let t = String(e || "");
	return t.startsWith(j) ? t.slice(7) : null;
}
var P = "device:", ee = /^[0-9a-f]{64}$/;
function te(e) {
	if (typeof e != "string") return null;
	let t = e.toLowerCase();
	return t.startsWith(P) && (t = t.slice(7)), ee.test(t) ? [
		0,
		4,
		8,
		12
	].map((e) => t.slice(e, e + 4)).join(" ") : null;
}
var F = "Check the code matches on the phone", ne = Object.freeze(Object.keys(A).filter((e) => A[e].privacyCard));
function I(e) {
	return A[e] ? A[e].asks : `use ${String(e || "this permission").replace(/_/g, " ")}`;
}
function L(e) {
	return !!(A[e] && A[e].perRequester);
}
function re(e) {
	return String(e || "").trim() || "An agent";
}
function ie(e, t) {
	if (!L(e)) return "Permission needed";
	let n = String(t || "").trim();
	return n ? `A phone calling itself "${n}"` : "An unnamed phone";
}
function ae(e) {
	return `Allow ALL agents to ${I(e)}`;
}
var oe = "Save it for any agent to use";
function se(e) {
	return L(e) ? "Always allow this phone" : M(e) ? oe : ae(e);
}
function ce(e) {
	return ne.includes(e) || !!(A[e] && A[e].declinable);
}
function le(e, t) {
	return ne.includes(e) ? `"${t}" lasts until you allow it again in Privacy settings; "Not now" leaves the ask open.` : M(e) ? `"${t}" tells the agent no, and it will not ask for this again until you choose "Allow asking again" in Privacy settings; "Not now" leaves the ask open.` : `"${t}" tells the agent no; "Not now" leaves the ask open.`;
}
function ue(e, t, n) {
	if (L(e) || !t) return "Don't allow";
	let r = String(n || "").trim();
	return r ? `Don't allow ${r}` : "Don't allow this agent";
}
var de = Object.freeze(["consent.granted", "consent.revoked"]);
Object.freeze([...de, "consent.reopened"]);
function fe(e, t) {
	if (!e || !t || !e.consent_type || e.consent_type !== t.consent_type) return !1;
	let n = e.scope || "*", r = t.scope || "*", i = e.agent_id == null ? t.agent_id == null : String(e.agent_id) === String(t.agent_id);
	return n === r && i ? !0 : t.agent_id == null || n !== "*" ? !1 : e.agent_id == null || String(e.agent_id) === String(t.agent_id);
}
//#endregion
//#region src/constants/events.js
var pe = "nunba-camera-consent", me = 6e4, he = [
	{
		pattern: /\/feed\/agent-spotlight/,
		ttl: 6e5
	},
	{
		pattern: /\/feed\/agents/,
		ttl: 3e5
	},
	{
		pattern: /\/feed/,
		ttl: 3e4
	},
	{
		pattern: /\/notifications/,
		ttl: 15e3
	},
	{
		pattern: /\/posts\/[^/]+$/,
		ttl: 12e4
	},
	{
		pattern: /\/posts/,
		ttl: 6e4
	},
	{
		pattern: /\/users/,
		ttl: 3e5
	},
	{
		pattern: /\/communities/,
		ttl: 3e5
	},
	{
		pattern: /\/games\/catalog/,
		ttl: 6e5
	},
	{
		pattern: /\/games/,
		ttl: 3e5
	},
	{
		pattern: /\/marketplace\/categories/,
		ttl: 6e5
	},
	{
		pattern: /\/marketplace\/listings\/[^/]+$/,
		ttl: 12e4
	},
	{
		pattern: /\/marketplace/,
		ttl: 12e4
	},
	{
		pattern: /\/mcp/,
		ttl: 3e5
	},
	{
		pattern: /\/search/,
		ttl: 6e4
	},
	{
		pattern: /\/auth\/me/,
		ttl: 3e5
	},
	{
		pattern: /\/resonance/,
		ttl: 12e4
	},
	{
		pattern: /\/achievements/,
		ttl: 3e5
	}
], ge = [
	{
		mutation: /\/posts\/[^/]+\/upvote/,
		invalidate: [/\/posts/, /\/feed/]
	},
	{
		mutation: /\/posts\/[^/]+\/downvote/,
		invalidate: [/\/posts/, /\/feed/]
	},
	{
		mutation: /\/posts$/,
		invalidate: [/\/posts/, /\/feed/]
	},
	{
		mutation: /\/posts\/[^/]+$/,
		invalidate: [/\/posts/, /\/feed/]
	},
	{
		mutation: /\/comments/,
		invalidate: [/\/posts\//]
	},
	{
		mutation: /\/communities\/[^/]+\/join/,
		invalidate: [/\/communities/]
	},
	{
		mutation: /\/communities\/[^/]+\/leave/,
		invalidate: [/\/communities/]
	},
	{
		mutation: /\/users\/[^/]+\/follow/,
		invalidate: [/\/users/]
	},
	{
		mutation: /\/notifications/,
		invalidate: [/\/notifications/]
	},
	{
		mutation: /\/auth\//,
		invalidate: [/\/auth\/me/]
	}
], _e = [
	{
		pattern: /\/feed\/agent-spotlight/,
		ttl: 6e5
	},
	{
		pattern: /\/feed\/agents/,
		ttl: 6e5
	},
	{
		pattern: /\/games\/catalog/,
		ttl: 6e5
	},
	{
		pattern: /\/mcp\/servers/,
		ttl: 3e5
	},
	{
		pattern: /\/mcp\/discover/,
		ttl: 3e5
	},
	{
		pattern: /\/marketplace\/categories/,
		ttl: 6e5
	},
	{
		pattern: /\/marketplace\/listings/,
		ttl: 3e5
	}
], ve = 3e5, ye = /* @__PURE__ */ new Map(), be = /* @__PURE__ */ new Map(), xe = /* @__PURE__ */ new Map(), Se = 500, Ce = 200;
function we() {
	try {
		let e = localStorage.getItem("access_token");
		if (!e) return "anon";
		let t = e.split(".")[1] || "", n = 0;
		for (let e = 0; e < t.length; e++) n = (n << 5) - n + t.charCodeAt(e) | 0;
		return n.toString(36);
	} catch {
		return "anon";
	}
}
function Te(e) {
	return `${e._publicScope ? "pub" : we()}:${(e.method || "get").toUpperCase()}:${e.url || ""}:${e.params ? JSON.stringify(e.params, Object.keys(e.params).sort()) : ""}`;
}
function Ee(e) {
	for (let t of he) if (t.pattern.test(e)) return t.ttl;
	return me;
}
function De(e) {
	for (let t of _e) if (t.pattern.test(e)) return t.ttl;
	return ve;
}
function Oe(e) {
	return Date.now() - e.timestamp < e.ttl;
}
function ke(e) {
	return Date.now() - e.timestamp < e.ttl * 2;
}
function Ae(e, t, n) {
	if (ye.size >= Se) {
		let e = null, t = Infinity;
		for (let [n, r] of ye) r.timestamp < t && (t = r.timestamp, e = n);
		e && ye.delete(e);
	}
	ye.set(e, {
		data: t,
		timestamp: Date.now(),
		ttl: Ee(n)
	});
}
function je(e) {
	let t = ye.get(e);
	return t ? Oe(t) ? {
		data: t.data,
		stale: !1
	} : ke(t) ? {
		data: t.data,
		stale: !0
	} : (ye.delete(e), null) : null;
}
function Me(e, t, n) {
	if (be.size >= Ce) {
		let e = null, t = Infinity;
		for (let [n, r] of be) r.expiresAt < t && (t = r.expiresAt, e = n);
		e && be.delete(e);
	}
	be.set(e, {
		value: t,
		expiresAt: Date.now() + n
	});
}
function Ne(e) {
	let t = be.get(e);
	return t ? Date.now() < t.expiresAt ? t.value : (be.delete(e), null) : null;
}
function Pe() {
	be.clear();
}
function Fe(e) {
	for (let t of ge) if (t.mutation.test(e)) {
		for (let [e] of ye) for (let n of t.invalidate) if (n.test(e)) {
			ye.delete(e);
			break;
		}
	}
}
function Ie(e, t) {
	if (xe.has(e)) return xe.get(e);
	let n = t().finally(() => {
		xe.delete(e);
	});
	return xe.set(e, n), n;
}
function Le() {
	ye.clear(), xe.clear();
}
function Re() {
	let e = 0, t = 0;
	for (let [, n] of ye) Oe(n) ? e++ : t++;
	let n = 0, r = 0, i = Date.now();
	for (let [, e] of be) i < e.expiresAt ? n++ : r++;
	return {
		total: ye.size,
		fresh: e,
		stale: t,
		inFlight: xe.size,
		publicTotal: be.size,
		publicFresh: n,
		publicExpired: r
	};
}
typeof window < "u" && window.addEventListener("auth:expired", Le);
var ze = {
	buildKey: Te,
	get: je,
	set: Ae,
	getPublic: Ne,
	setPublic: Me,
	clearPublic: Pe,
	getPublicTTL: De,
	invalidateOnMutation: Fe,
	dedupFetch: Ie,
	clearAll: Le,
	getStats: Re,
	getTTL: Ee
};
//#endregion
//#region node_modules/axios/lib/helpers/bind.js
function Be(e, t) {
	return function() {
		return e.apply(t, arguments);
	};
}
//#endregion
//#region node_modules/axios/lib/utils.js
var { toString: Ve } = Object.prototype, { getPrototypeOf: He } = Object, { iterator: Ue, toStringTag: We } = Symbol, Ge = (({ hasOwnProperty: e }) => (t, n) => e.call(t, n))(Object.prototype), Ke = (e) => typeof e == "string" && (e === "__proto__" || e === "constructor" || e === "prototype"), qe = (e, t, n) => e === Object.prototype || !n && t === null, Je = (e) => {
	if (!Object.isExtensible(e)) return !1;
	let t = Object.getOwnPropertyNames(e);
	return Object.getOwnPropertySymbols && t.push(...Object.getOwnPropertySymbols(e)), t.every((t) => {
		if (Ke(t)) return !1;
		let n = Object.getOwnPropertyDescriptor(e, t);
		return !!n && n.configurable && n.writable === !0;
	});
}, Ye = (e, t) => {
	let n = e, r = [];
	for (; n != null;) {
		if (r.indexOf(n) !== -1) return !1;
		r.push(n);
		let i = He(n);
		if (qe(n, i, n === e)) return !1;
		if (Ge(n, t)) return !0;
		n = i;
	}
	return !1;
}, Xe = (e, t) => e != null && Ye(e, t) ? e[t] : void 0, Ze = (e) => {
	if (e == null || typeof e != "object" && typeof e != "function") return e;
	let t = He(e);
	if (t === null && Je(e)) return e;
	let n = Object.create(null), r = Object.create(null), i = [], a = e;
	for (; a != null && i.indexOf(a) === -1;) {
		i.push(a);
		let o = a === e ? t : He(a);
		if (qe(a, o, a === e)) break;
		let s = Object.getOwnPropertyNames(a);
		Object.getOwnPropertySymbols && s.push(...Object.getOwnPropertySymbols(a));
		for (let t of s) Ke(t) || Ge(r, t) || (n[t] = e[t], r[t] = !0);
		a = o;
	}
	return n;
}, Qe = ((e) => (t) => {
	let n = Ve.call(t);
	return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
})(Object.create(null)), $e = (e) => (e = e.toLowerCase(), (t) => Qe(t) === e), et = (e) => (t) => typeof t === e, { isArray: tt } = Array, nt = et("undefined");
function rt(e) {
	return e !== null && !nt(e) && e.constructor !== null && !nt(e.constructor) && st(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
var it = $e("ArrayBuffer");
function at(e) {
	let t;
	return t = typeof ArrayBuffer < "u" && ArrayBuffer.isView ? ArrayBuffer.isView(e) : e && e.buffer && it(e.buffer), t;
}
var ot = et("string"), st = et("function"), ct = et("number"), lt = (e) => typeof e == "object" && !!e, ut = (e) => e === !0 || e === !1, dt = (e) => {
	if (!lt(e)) return !1;
	let t = He(e);
	return (t === null || t === Object.prototype || He(t) === null) && !Ye(e, We) && !Ye(e, Ue);
}, ft = (e) => {
	if (!lt(e) || rt(e)) return !1;
	try {
		return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
	} catch {
		return !1;
	}
}, pt = $e("Date"), mt = $e("File"), ht = (e) => !!(e && e.uri !== void 0), gt = (e) => e && e.getParts !== void 0, _t = $e("Blob"), vt = $e("FileList"), yt = $e("Set"), bt = (e) => lt(e) && st(e.pipe);
function xt() {
	return typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
}
var St = xt(), Ct = St.FormData === void 0 ? void 0 : St.FormData, wt = (e) => {
	if (!e) return !1;
	if (Ct && e instanceof Ct) return !0;
	let t = He(e);
	if (!t || t === Object.prototype || !st(e.append)) return !1;
	let n = Qe(e);
	return n === "formdata" || n === "object" && st(e.toString) && e.toString() === "[object FormData]";
}, Tt = $e("URLSearchParams"), [Et, Dt, Ot, kt] = [
	"ReadableStream",
	"Request",
	"Response",
	"Headers"
].map($e), At = (e) => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function jt(e, t, { allOwnKeys: n = !1 } = {}) {
	if (e == null) return;
	let r, i;
	if (typeof e != "object" && (e = [e]), tt(e)) for (r = 0, i = e.length; r < i; r++) t.call(null, e[r], r, e);
	else {
		if (rt(e)) return;
		let i = n ? Object.getOwnPropertyNames(e) : Object.keys(e), a = i.length, o;
		for (r = 0; r < a; r++) o = i[r], t.call(null, e[o], o, e);
	}
}
function Mt(e, t) {
	if (rt(e)) return null;
	t = t.toLowerCase();
	let n = Object.keys(e), r = n.length, i;
	for (; r-- > 0;) if (i = n[r], t === i.toLowerCase()) return i;
	return null;
}
var Nt = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Pt = (e) => !nt(e) && e !== Nt;
function Ft(...e) {
	let { caseless: t, skipUndefined: n } = Pt(this) && this || {}, r = {}, i = (e, i) => {
		if (i === "__proto__" || i === "constructor" || i === "prototype") return;
		let a = t && typeof i == "string" && Mt(r, i) || i, o = Ge(r, a) ? r[a] : void 0;
		dt(o) && dt(e) ? r[a] = Ft(o, e) : dt(e) ? r[a] = Ft({}, e) : tt(e) ? r[a] = e.slice() : (!n || !nt(e)) && (r[a] = e);
	};
	for (let t = 0, n = e.length; t < n; t++) {
		let n = e[t];
		if (!n || rt(n) || (jt(n, i), typeof n != "object" || tt(n))) continue;
		let r = Object.getOwnPropertySymbols(n);
		for (let e = 0; e < r.length; e++) {
			let t = r[e];
			qt.call(n, t) && i(n[t], t);
		}
	}
	return r;
}
var It = (e, t, n, { allOwnKeys: r } = {}) => (jt(t, (t, r) => {
	n && st(t) ? Object.defineProperty(e, r, {
		__proto__: null,
		value: Be(t, n),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : Object.defineProperty(e, r, {
		__proto__: null,
		value: t,
		writable: !0,
		enumerable: !0,
		configurable: !0
	});
}, { allOwnKeys: r }), e), Lt = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e), Rt = (e, t, n, r) => {
	e.prototype = Object.create(t.prototype, r), Object.defineProperty(e.prototype, "constructor", {
		__proto__: null,
		value: e,
		writable: !0,
		enumerable: !1,
		configurable: !0
	}), Object.defineProperty(e, "super", {
		__proto__: null,
		value: t.prototype
	}), n && Object.assign(e.prototype, n);
}, zt = (e, t, n, r) => {
	let i, a, o, s = {};
	if (t = t || {}, e == null) return t;
	do {
		for (i = Object.getOwnPropertyNames(e), a = i.length; a-- > 0;) o = i[a], (!r || r(o, e, t)) && !s[o] && (t[o] = e[o], s[o] = !0);
		e = n !== !1 && He(e);
	} while (e && (!n || n(e, t)) && e !== Object.prototype);
	return t;
}, Bt = (e, t, n) => {
	e = String(e), (n === void 0 || n > e.length) && (n = e.length), n -= t.length;
	let r = e.indexOf(t, n);
	return r !== -1 && r === n;
}, Vt = (e) => {
	if (!e) return null;
	if (tt(e)) return e;
	let t = e.length;
	if (!ct(t)) return null;
	let n = Array(t);
	for (; t-- > 0;) n[t] = e[t];
	return n;
}, Ht = ((e) => (t) => e && t instanceof e)(typeof Uint8Array < "u" && He(Uint8Array)), Ut = (e, t) => {
	let n = (e && e[Ue]).call(e), r;
	for (; (r = n.next()) && !r.done;) {
		let n = r.value;
		t.call(e, n[0], n[1]);
	}
}, Wt = (e, t) => {
	let n, r = [];
	for (; (n = e.exec(t)) !== null;) r.push(n);
	return r;
}, Gt = $e("HTMLFormElement"), Kt = (e) => e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(e, t, n) {
	return t.toUpperCase() + n;
}), { propertyIsEnumerable: qt } = Object.prototype, Jt = $e("RegExp"), Yt = (e, t) => {
	let n = Object.getOwnPropertyDescriptors(e), r = {};
	jt(n, (n, i) => {
		let a;
		(a = t(n, i, e)) !== !1 && (r[i] = a || n);
	}), Object.defineProperties(e, r);
}, Xt = (e) => {
	Yt(e, (t, n) => {
		if (st(e) && [
			"arguments",
			"caller",
			"callee"
		].includes(n)) return !1;
		let r = e[n];
		if (st(r)) {
			if (t.enumerable = !1, "writable" in t) {
				t.writable = !1;
				return;
			}
			t.set || (t.set = () => {
				throw Error("Can not rewrite read-only method '" + n + "'");
			});
		}
	});
}, Zt = (e, t) => {
	let n = {}, r = (e) => {
		e.forEach((e) => {
			n[e] = !0;
		});
	};
	return tt(e) ? r(e) : r(String(e).split(t)), n;
}, Qt = () => {}, $t = (e, t) => e != null && Number.isFinite(e = +e) ? e : t;
function en(e) {
	return !!(e && st(e.append) && e[We] === "FormData" && e[Ue]);
}
var tn = (e) => {
	let t = /* @__PURE__ */ new WeakSet(), n = (e) => {
		if (lt(e)) {
			if (t.has(e)) return;
			if (rt(e)) return e;
			if (!("toJSON" in e)) {
				t.add(e);
				let r;
				if (yt(e)) {
					r = [];
					for (let t of e) {
						let e = n(t);
						!nt(e) && r.push(e);
					}
				} else r = tt(e) ? [] : {}, jt(e, (e, t) => {
					let i = n(e);
					!nt(i) && (r[t] = i);
				});
				return t.delete(e), r;
			}
		}
		return e;
	};
	return n(e);
}, nn = $e("AsyncFunction"), rn = (e) => e && (lt(e) || st(e)) && st(e.then) && st(e.catch), an = ((e, t) => e ? setImmediate : t ? ((e, t) => (Nt.addEventListener("message", ({ source: n, data: r }) => {
	n === Nt && r === e && t.length && t.shift()();
}, !1), (n) => {
	t.push(n), Nt.postMessage(e, "*");
}))(`axios@${Math.random()}`, []) : (e) => setTimeout(e))(typeof setImmediate == "function", st(Nt.postMessage)), on = typeof queueMicrotask < "u" ? queueMicrotask.bind(Nt) : typeof process < "u" && process.nextTick || an, sn = (e) => e != null && st(e[Ue]), R = {
	isArray: tt,
	isArrayBuffer: it,
	isBuffer: rt,
	isFormData: wt,
	isArrayBufferView: at,
	isString: ot,
	isNumber: ct,
	isBoolean: ut,
	isObject: lt,
	isPlainObject: dt,
	isEmptyObject: ft,
	isReadableStream: Et,
	isRequest: Dt,
	isResponse: Ot,
	isHeaders: kt,
	isUndefined: nt,
	isDate: pt,
	isFile: mt,
	isReactNativeBlob: ht,
	isReactNative: gt,
	isBlob: _t,
	isRegExp: Jt,
	isFunction: st,
	isStream: bt,
	isURLSearchParams: Tt,
	isTypedArray: Ht,
	isFileList: vt,
	forEach: jt,
	merge: Ft,
	extend: It,
	trim: At,
	stripBOM: Lt,
	inherits: Rt,
	toFlatObject: zt,
	kindOf: Qe,
	kindOfTest: $e,
	endsWith: Bt,
	toArray: Vt,
	forEachEntry: Ut,
	matchAll: Wt,
	isHTMLForm: Gt,
	hasOwnProperty: Ge,
	hasOwnProp: Ge,
	hasOwnInPrototypeChain: Ye,
	getSafeProp: Xe,
	toSafeFlatObject: Ze,
	reduceDescriptors: Yt,
	freezeMethods: Xt,
	toObjectSet: Zt,
	toCamelCase: Kt,
	noop: Qt,
	toFiniteNumber: $t,
	findKey: Mt,
	global: Nt,
	isContextDefined: Pt,
	isSpecCompliantForm: en,
	toJSONObject: tn,
	isAsyncFn: nn,
	isThenable: rn,
	setImmediate: an,
	asap: on,
	isIterable: sn,
	isSafeIterable: (e) => e != null && Ye(e, Ue) && sn(e)
}, cn = R.toObjectSet([
	"age",
	"authorization",
	"content-length",
	"content-type",
	"etag",
	"expires",
	"from",
	"host",
	"if-modified-since",
	"if-unmodified-since",
	"last-modified",
	"location",
	"max-forwards",
	"proxy-authorization",
	"referer",
	"retry-after",
	"user-agent"
]), ln = (e) => {
	let t = {}, n, r, i;
	return e && e.split("\n").forEach(function(e) {
		i = e.indexOf(":"), n = e.substring(0, i).trim().toLowerCase(), r = e.substring(i + 1).trim();
		let a = R.hasOwnProp(t, n);
		!n || a && R.hasOwnProp(cn, n) || (n === "set-cookie" ? a ? t[n].push(r) : t[n] = [r] : t[n] = a ? t[n] + ", " + r : r);
	}), t;
};
//#endregion
//#region node_modules/axios/lib/helpers/sanitizeHeaderValue.js
function un(e) {
	let t = 0, n = e.length;
	for (; t < n;) {
		let n = e.charCodeAt(t);
		if (n !== 9 && n !== 32) break;
		t += 1;
	}
	for (; n > t;) {
		let t = e.charCodeAt(n - 1);
		if (t !== 9 && t !== 32) break;
		--n;
	}
	return t === 0 && n === e.length ? e : e.slice(t, n);
}
var dn = /* @__PURE__ */ RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g"), fn = /* @__PURE__ */ RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function pn(e, t) {
	return R.isArray(e) ? e.map((e) => pn(e, t)) : un(String(e).replace(t, ""));
}
var mn = (e) => pn(e, dn), hn = (e) => pn(e, fn);
function gn(e) {
	let t = Object.create(null);
	return R.forEach(e.toJSON(), (e, n) => {
		t[n] = hn(e);
	}), t;
}
//#endregion
//#region node_modules/axios/lib/core/AxiosHeaders.js
var _n = Symbol("internals");
function vn(e) {
	return e && String(e).trim().toLowerCase();
}
function yn(e) {
	return e === !1 || e == null ? e : R.isArray(e) ? e.map(yn) : mn(String(e));
}
function bn(e) {
	let t = Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g, r;
	for (; r = n.exec(e);) t[r[1]] = r[2];
	return t;
}
var xn = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function Sn(e) {
	let t = 0, n = e.length;
	for (; t < n;) {
		let n = e.charCodeAt(t);
		if (n !== 9 && n !== 32) break;
		t += 1;
	}
	for (; n > t;) {
		let t = e.charCodeAt(n - 1);
		if (t !== 9 && t !== 32) break;
		--n;
	}
	return t === 0 && n === e.length ? e : e.slice(t, n);
}
function Cn(e) {
	let t = e.length - 1;
	if (t < 1 || e.charCodeAt(0) !== 34 || e.charCodeAt(t) !== 34) return e;
	let n = "";
	for (let r = 1; r < t; r++) {
		let i = e.charCodeAt(r);
		if (i === 34 || i === 92 && (r += 1, r >= t)) return e;
		n += e[r];
	}
	return n;
}
function wn(e) {
	let t = Object.create(null), n = String(e), r = 0, i = !1, a = !1;
	function o(e) {
		let i = Sn(n.slice(r, e)), a = i.indexOf("=");
		if (a < 1) return;
		let o = Sn(i.slice(0, a));
		if (!xn.test(o)) return;
		let s = o.toLowerCase();
		if (s === "__proto__" || s === "constructor" || s === "prototype") return;
		let c = Sn(i.slice(a + 1));
		t[s] = Cn(c);
	}
	for (let e = 0; e < n.length; e++) {
		let t = n.charCodeAt(e);
		i ? a ? a = !1 : t === 92 ? a = !0 : t === 34 && (i = !1) : t === 34 ? i = !0 : (t === 44 || t === 59) && (o(e), r = e + 1);
	}
	return o(n.length), t;
}
var Tn = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function En(e, t, n, r, i) {
	if (R.isFunction(r)) return r.call(this, t, n);
	if (i && (t = n), R.isString(t)) {
		if (R.isString(r)) return t.indexOf(r) !== -1;
		if (R.isRegExp(r)) return r.test(t);
	}
}
function Dn(e) {
	return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, t, n) => t.toUpperCase() + n);
}
function On(e, t) {
	let n = R.toCamelCase(" " + t);
	[
		"get",
		"set",
		"has"
	].forEach((r) => {
		Object.defineProperty(e, r + n, {
			__proto__: null,
			value: function(e, n, i) {
				return this[r].call(this, t, e, n, i);
			},
			configurable: !0
		});
	});
}
var kn = class {
	constructor(e) {
		e && this.set(e);
	}
	set(e, t, n) {
		let r = this;
		function i(e, t, n) {
			let i = vn(t);
			if (!i) return;
			let a = R.findKey(r, i);
			(!a || r[a] === void 0 || n === !0 || n === void 0 && r[a] !== !1) && (r[a || t] = yn(e));
		}
		let a = (e, t) => R.forEach(e, (e, n) => i(e, n, t));
		if (R.isPlainObject(e) || e instanceof this.constructor) a(e, t);
		else if (R.isString(e) && (e = e.trim()) && !Tn(e)) a(ln(e), t);
		else if (R.isObject(e) && R.isSafeIterable(e)) {
			let n = Object.create(null), r, i;
			for (let t of e) {
				if (!R.isArray(t)) throw TypeError("Object iterator must return a key-value pair");
				i = t[0], R.hasOwnProp(n, i) ? (r = n[i], n[i] = R.isArray(r) ? [...r, t[1]] : [r, t[1]]) : n[i] = t[1];
			}
			a(n, t);
		} else e != null && i(t, e, n);
		return this;
	}
	get(e, t) {
		if (e = vn(e), e) {
			let n = R.findKey(this, e);
			if (n) {
				let e = this[n];
				if (!t) return e;
				if (t === !0) return bn(e);
				if (R.isFunction(t)) return t.call(this, e, n);
				if (R.isRegExp(t)) return t.exec(e);
				throw TypeError("parser must be boolean|regexp|function");
			}
		}
	}
	has(e, t) {
		if (e = vn(e), e) {
			let n = R.findKey(this, e);
			return !(!n || this[n] === void 0 || t && !En(this, this[n], n, t));
		}
		return !1;
	}
	delete(e, t) {
		let n = this, r = !1;
		function i(e) {
			if (e = vn(e), e) {
				let i = R.findKey(n, e);
				i && (!t || En(n, n[i], i, t)) && (delete n[i], r = !0);
			}
		}
		return R.isArray(e) ? e.forEach(i) : i(e), r;
	}
	clear(e) {
		let t = Object.keys(this), n = t.length, r = !1;
		for (; n--;) {
			let i = t[n];
			(!e || En(this, this[i], i, e, !0)) && (delete this[i], r = !0);
		}
		return r;
	}
	normalize(e) {
		let t = this, n = {};
		return R.forEach(this, (r, i) => {
			let a = R.findKey(n, i);
			if (a) {
				t[a] = yn(r), delete t[i];
				return;
			}
			let o = e ? Dn(i) : String(i).trim();
			o !== i && delete t[i], t[o] = yn(r), n[o] = !0;
		}), this;
	}
	concat(...e) {
		return this.constructor.concat(this, ...e);
	}
	toJSON(e) {
		let t = Object.create(null);
		return R.forEach(this, (n, r) => {
			n != null && n !== !1 && (t[r] = e && R.isArray(n) ? n.join(", ") : n);
		}), t;
	}
	[Symbol.iterator]() {
		return Object.entries(this.toJSON())[Symbol.iterator]();
	}
	toString() {
		return Object.entries(this.toJSON()).map(([e, t]) => e + ": " + t).join("\n");
	}
	getSetCookie() {
		let e = this.get("set-cookie");
		return R.isArray(e) ? e : e == null || e === !1 ? [] : [e];
	}
	get [Symbol.toStringTag]() {
		return "AxiosHeaders";
	}
	static from(e) {
		return e instanceof this ? e : new this(e);
	}
	static parseParameters(e) {
		return wn(e);
	}
	static concat(e, ...t) {
		let n = new this(e);
		return t.forEach((e) => n.set(e)), n;
	}
	static accessor(e) {
		let t = (this[_n] = this[_n] = { accessors: {} }).accessors, n = this.prototype;
		function r(e) {
			let r = vn(e);
			t[r] || (On(n, e), t[r] = !0);
		}
		return R.isArray(e) ? e.forEach(r) : r(e), this;
	}
};
kn.accessor([
	"Content-Type",
	"Content-Length",
	"Accept",
	"Accept-Encoding",
	"User-Agent",
	"Authorization"
]), R.reduceDescriptors(kn.prototype, ({ value: e }, t) => {
	let n = t[0].toUpperCase() + t.slice(1);
	return {
		get: () => e,
		set(e) {
			this[n] = e;
		}
	};
}), R.freezeMethods(kn);
//#endregion
//#region node_modules/axios/lib/core/AxiosError.js
var An = "[REDACTED ****]";
function jn(e) {
	if (R.hasOwnProp(e, "toJSON")) return !0;
	let t = Object.getPrototypeOf(e);
	for (; t && t !== Object.prototype;) {
		if (R.hasOwnProp(t, "toJSON")) return !0;
		t = Object.getPrototypeOf(t);
	}
	return !1;
}
function Mn(e, t) {
	let n = new Set(t.map((e) => String(e).toLowerCase())), r = [], i = (e) => {
		if (typeof e != "object" || !e || R.isBuffer(e)) return e;
		if (r.indexOf(e) !== -1) return;
		e instanceof kn && (e = e.toJSON()), r.push(e);
		let t;
		if (R.isArray(e)) t = [], e.forEach((e, n) => {
			let r = i(e);
			R.isUndefined(r) || (t[n] = r);
		});
		else {
			if (!R.isPlainObject(e) && jn(e)) return r.pop(), e;
			t = Object.create(null);
			for (let [r, a] of Object.entries(e)) {
				let e = n.has(r.toLowerCase()) ? An : i(a);
				R.isUndefined(e) || (t[r] = e);
			}
		}
		return r.pop(), t;
	};
	return i(e);
}
function Nn(e) {
	try {
		return String(e);
	} catch {
		return "";
	}
}
function Pn(e) {
	return e.errors.map((e) => {
		try {
			return e && e.message ? Nn(e.message) : Nn(e);
		} catch {
			return "";
		}
	}).filter(Boolean).join("; ") || e.name || "AggregateError";
}
var z = class e extends Error {
	static from(t, n, r, i, a, o) {
		let s = t.message;
		!s && R.isArray(t.errors) && t.errors.length && (s = Pn(t));
		let c = new e(s, n || t.code, r, i, a);
		return Object.defineProperty(c, "cause", {
			__proto__: null,
			value: t,
			writable: !0,
			enumerable: !1,
			configurable: !0
		}), c.name = t.name, t.status != null && c.status == null && (c.status = t.status), o && Object.assign(c, o), c;
	}
	constructor(e, t, n, r, i) {
		super(e), Object.defineProperty(this, "message", {
			__proto__: null,
			value: e,
			enumerable: !0,
			writable: !0,
			configurable: !0
		}), this.name = "AxiosError", this.isAxiosError = !0, t && (this.code = t), n && (this.config = n), r && (this.request = r), i && (this.response = i, this.status = i.status);
	}
	toJSON() {
		let e = this.config, t = e && R.hasOwnProp(e, "redact") ? e.redact : void 0, n = R.isArray(t) && t.length > 0 ? Mn(e, t) : R.toJSONObject(e);
		return {
			message: this.message,
			name: this.name,
			description: this.description,
			number: this.number,
			fileName: this.fileName,
			lineNumber: this.lineNumber,
			columnNumber: this.columnNumber,
			stack: this.stack,
			config: n,
			code: this.code,
			status: this.status
		};
	}
};
z.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE", z.ERR_BAD_OPTION = "ERR_BAD_OPTION", z.ECONNABORTED = "ECONNABORTED", z.ETIMEDOUT = "ETIMEDOUT", z.ECONNREFUSED = "ECONNREFUSED", z.ERR_NETWORK = "ERR_NETWORK", z.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS", z.ERR_DEPRECATED = "ERR_DEPRECATED", z.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE", z.ERR_BAD_REQUEST = "ERR_BAD_REQUEST", z.ERR_CANCELED = "ERR_CANCELED", z.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT", z.ERR_INVALID_URL = "ERR_INVALID_URL", z.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
function Fn(e) {
	return R.isPlainObject(e) || R.isArray(e);
}
function In(e) {
	return R.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
function Ln(e, t, n) {
	return e ? e.concat(t).map(function(e, t) {
		return e = In(e), !n && t ? "[" + e + "]" : e;
	}).join(n ? "." : "") : t;
}
function Rn(e) {
	return R.isArray(e) && !e.some(Fn);
}
var zn = R.toFlatObject(R, {}, null, function(e) {
	return /^is[A-Z]/.test(e);
});
function Bn(e, t, n) {
	if (!R.isObject(e)) throw TypeError("target must be an object");
	t = t || new FormData();
	let r = (e, t) => {
		let r = R.getSafeProp(n, e);
		return R.isUndefined(r) ? t : r;
	}, i = r("metaTokens", !0), a = r("visitor") || h, o = r("dots", !1), s = r("indexes", !1), c = r("Blob") || typeof Blob < "u" && Blob, l = r("maxDepth", 100), u = c && R.isSpecCompliantForm(t), d = [];
	if (!R.isFunction(a)) throw TypeError("visitor must be a function");
	function f(e) {
		if (e === null) return "";
		if (R.isDate(e)) return e.toISOString();
		if (R.isBoolean(e)) return e.toString();
		if (!u && R.isBlob(e)) throw new z("Blob is not supported. Use a Buffer instead.");
		if (R.isArrayBuffer(e) || R.isTypedArray(e)) {
			if (u && typeof c == "function") return new c([e]);
			throw new z("Blob is not supported. Use a Buffer instead.", z.ERR_NOT_SUPPORT);
		}
		return e;
	}
	function p(e) {
		if (e > l) throw new z("Object is too deeply nested (" + e + " levels). Max depth: " + l, z.ERR_FORM_DATA_DEPTH_EXCEEDED);
	}
	function m(e, t) {
		if (l === Infinity) return JSON.stringify(e);
		let n = [];
		return JSON.stringify(e, function(e, r) {
			if (!R.isObject(r)) return r;
			for (; n.length && n[n.length - 1] !== this;) n.pop();
			return n.push(r), p(t + n.length - 1), r;
		});
	}
	function h(e, n, r) {
		let a = e;
		if (R.isReactNative(t) && R.isReactNativeBlob(e)) return t.append(Ln(r, n, o), f(e)), !1;
		if (e && !r && typeof e == "object") {
			if (R.endsWith(n, "{}")) n = i ? n : n.slice(0, -2), e = m(e, 1);
			else if (R.isArray(e) && Rn(e) || (R.isFileList(e) || R.endsWith(n, "[]")) && (a = R.toArray(e))) return n = In(n), a.forEach(function(e, r) {
				!(R.isUndefined(e) || e === null) && t.append(s === !0 ? Ln([n], r, o) : s === null ? n : n + "[]", f(e));
			}), !1;
		}
		return Fn(e) ? !0 : (t.append(Ln(r, n, o), f(e)), !1);
	}
	let g = Object.assign(zn, {
		defaultVisitor: h,
		convertValue: f,
		isVisitable: Fn
	});
	function _(e, n, r = 0) {
		if (!R.isUndefined(e)) {
			if (p(r), d.indexOf(e) !== -1) throw Error("Circular reference detected in " + n.join("."));
			d.push(e), R.forEach(e, function(e, i) {
				(!(R.isUndefined(e) || e === null) && a.call(t, e, R.isString(i) ? i.trim() : i, n, g)) === !0 && _(e, n ? n.concat(i) : [i], r + 1);
			}), d.pop();
		}
	}
	if (!R.isObject(e)) throw TypeError("data must be an object");
	return _(e), t;
}
//#endregion
//#region node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function Vn(e) {
	let t = {
		"!": "%21",
		"'": "%27",
		"(": "%28",
		")": "%29",
		"~": "%7E",
		"%20": "+"
	};
	return encodeURIComponent(e).replace(/[!'()~]|%20/g, function(e) {
		return t[e];
	});
}
function Hn(e, t) {
	this._pairs = [], e && Bn(e, this, t);
}
var Un = Hn.prototype;
Un.append = function(e, t) {
	this._pairs.push([e, t]);
}, Un.toString = function(e) {
	let t = e ? (t) => e.call(this, t, Vn) : Vn;
	return this._pairs.map(function(e) {
		return t(e[0]) + "=" + t(e[1]);
	}, "").join("&");
};
//#endregion
//#region node_modules/axios/lib/helpers/buildURL.js
function Wn(e) {
	return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function Gn(e, t, n) {
	if (!t) return e;
	e = e || "";
	let r = R.isFunction(n) ? { serialize: n } : n, i = R.getSafeProp(r, "encode") || Wn, a = R.getSafeProp(r, "serialize"), o;
	if (o = a ? a(t, r) : R.isURLSearchParams(t) ? t.toString() : new Hn(t, r).toString(i), o) {
		let t = e.indexOf("#");
		t !== -1 && (e = e.slice(0, t)), e += (e.indexOf("?") === -1 ? "?" : "&") + o;
	}
	return e;
}
//#endregion
//#region node_modules/axios/lib/core/InterceptorManager.js
var Kn = Symbol("internals");
function qn(e) {
	return e ? e.length : 0;
}
function Jn(e) {
	if (e) for (; e.length && e[e.length - 1] === null;) e.pop();
}
function Yn(e, t) {
	let n = e.handlers, r = qn(n);
	n === t.handlersRef ? r !== t.handlersLength && (r ? t.handlerEntries.forEach(function(e, r) {
		n[e.index] !== e.handler && t.handlerEntries.delete(r);
	}) : t.handlerEntries.clear()) : (t.handlersRef = n, t.handlerEntries.clear()), t.handlersLength = r;
}
var Xn = class {
	constructor() {
		this.handlers = [], this[Kn] = {
			handlersRef: this.handlers,
			handlersLength: this.handlers.length,
			handlerEntries: /* @__PURE__ */ new Map(),
			iterationDepth: 0,
			nextId: 0
		};
	}
	use(e, t, n) {
		let r = {
			fulfilled: e,
			rejected: t,
			synchronous: n ? n.synchronous : !1,
			runWhen: n ? n.runWhen : null
		}, i = this[Kn];
		this.handlers == null && (this.handlers = []), Yn(this, i);
		let a = i.nextId++;
		return this.handlers.push(r), i.handlerEntries.set(a, {
			handler: r,
			index: this.handlers.length - 1
		}), i.handlersLength = this.handlers.length, a;
	}
	eject(e) {
		let t = this[Kn];
		Yn(this, t);
		let n = t.handlerEntries.get(e);
		if (n) {
			if (t.handlerEntries.delete(e), this.handlers[n.index] !== n.handler) return;
			this.handlers[n.index] = null, t.iterationDepth || (Jn(this.handlers), t.handlersLength = this.handlers.length);
		}
	}
	clear() {
		this.handlers && (this.handlers = [], Yn(this, this[Kn]));
	}
	forEach(e) {
		let t = this[Kn];
		Yn(this, t), t.iterationDepth++;
		try {
			R.forEach(this.handlers, function(t) {
				t !== null && e(t);
			});
		} finally {
			--t.iterationDepth || (Yn(this, t), Jn(this.handlers), t.handlersLength = qn(this.handlers));
		}
	}
}, Zn = {
	silentJSONParsing: !0,
	forcedJSONParsing: !0,
	clarifyTimeoutError: !1,
	legacyInterceptorReqResOrdering: !0,
	advertiseZstdAcceptEncoding: !1,
	validateStatusUndefinedResolves: !0
}, Qn = {
	isBrowser: !0,
	classes: {
		URLSearchParams: typeof URLSearchParams < "u" ? URLSearchParams : Hn,
		FormData: typeof FormData < "u" ? FormData : null,
		Blob: typeof Blob < "u" ? Blob : null
	},
	protocols: [
		"http",
		"https",
		"file",
		"blob",
		"url",
		"data"
	]
}, $n = /* @__PURE__ */ E({
	hasBrowserEnv: () => er,
	hasStandardBrowserEnv: () => nr,
	hasStandardBrowserWebWorkerEnv: () => rr,
	navigator: () => tr,
	origin: () => ir
}), er = typeof window < "u" && typeof document < "u", tr = typeof navigator == "object" && navigator || void 0, nr = er && (!tr || [
	"ReactNative",
	"NativeScript",
	"NS"
].indexOf(tr.product) < 0), rr = typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope && typeof self.importScripts == "function", ir = er && window.location.href || "http://localhost", ar = {
	...$n,
	...Qn
};
//#endregion
//#region node_modules/axios/lib/helpers/toURLEncodedForm.js
function or(e, t) {
	return Bn(e, new ar.classes.URLSearchParams(), {
		visitor: function(e, t, n, r) {
			return ar.isNode && R.isBuffer(e) ? (this.append(t, e.toString("base64")), !1) : r.defaultVisitor.apply(this, arguments);
		},
		...t
	});
}
//#endregion
//#region node_modules/axios/lib/helpers/formDataToJSON.js
var sr = 100;
function cr(e) {
	if (e > sr) throw new z("FormData field is too deeply nested (" + e + " levels). Max depth: " + sr, z.ERR_FORM_DATA_DEPTH_EXCEEDED);
}
function lr(e) {
	let t = [], n = /[^.[\]]+|\[([^.[\]]*)]/g, r;
	for (; (r = n.exec(e)) !== null;) cr(t.length), t.push(r[0] === "[]" ? "" : r[1] || r[0]);
	return t;
}
function ur(e) {
	let t = {}, n = Object.keys(e), r, i = n.length, a;
	for (r = 0; r < i; r++) a = n[r], t[a] = e[a];
	return t;
}
function dr(e) {
	function t(e, n, r, i) {
		cr(i);
		let a = e[i++];
		if (a === "__proto__") return !0;
		let o = Number.isFinite(+a), s = i >= e.length;
		return a = !a && R.isArray(r) ? r.length : a, s ? (R.hasOwnProp(r, a) ? r[a] = R.isArray(r[a]) ? r[a].concat(n) : [r[a], n] : r[a] = n, !o) : ((!R.hasOwnProp(r, a) || !R.isObject(r[a])) && (r[a] = []), t(e, n, r[a], i) && R.isArray(r[a]) && (r[a] = ur(r[a])), !o);
	}
	if (R.isFormData(e) && R.isFunction(e.entries)) {
		let n = {};
		return R.forEachEntry(e, (e, r) => {
			t(lr(e), r, n, 0);
		}), n;
	}
	return null;
}
//#endregion
//#region node_modules/axios/lib/core/methodList.js
var fr = Object.freeze([
	"get",
	"delete",
	"head",
	"options",
	"post",
	"put",
	"patch",
	"purge",
	"link",
	"unlink",
	"query"
]), pr = (e, t) => e != null && R.hasOwnProp(e, t) ? e[t] : void 0;
function mr(e, t, n) {
	if (R.isString(e)) try {
		return (t || JSON.parse)(e), R.trim(e);
	} catch (e) {
		if (e.name !== "SyntaxError") throw e;
	}
	return (n || JSON.stringify)(e);
}
var hr = {
	transitional: Zn,
	adapter: [
		"xhr",
		"http",
		"fetch"
	],
	transformRequest: [function(e, t) {
		let n = t.getContentType() || "", r = n.indexOf("application/json") > -1, i = R.isObject(e);
		if (i && R.isHTMLForm(e) && (e = new FormData(e)), R.isFormData(e)) return r ? JSON.stringify(dr(e)) : e;
		if (R.isArrayBuffer(e) || R.isBuffer(e) || R.isStream(e) || R.isFile(e) || R.isBlob(e) || R.isReadableStream(e)) return e;
		if (R.isArrayBufferView(e)) return e.buffer;
		if (R.isURLSearchParams(e)) return t.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
		let a;
		if (i) {
			let t = pr(this, "formSerializer");
			if (n.indexOf("application/x-www-form-urlencoded") > -1) return or(e, t).toString();
			if ((a = R.isFileList(e)) || n.indexOf("multipart/form-data") > -1) {
				let n = pr(this, "env"), r = n && n.FormData;
				return Bn(a ? { "files[]": e } : e, r && new r(), t);
			}
		}
		return i || r ? (t.setContentType("application/json", !1), mr(e)) : e;
	}],
	transformResponse: [function(e) {
		let t = pr(this, "transitional") || hr.transitional, n = t && t.forcedJSONParsing, r = pr(this, "responseType"), i = r === "json";
		if (R.isResponse(e) || R.isReadableStream(e)) return e;
		if (e && R.isString(e) && (n && !r || i)) {
			let n = !(t && t.silentJSONParsing) && i;
			try {
				return JSON.parse(e, pr(this, "parseReviver"));
			} catch (e) {
				if (n) throw e.name === "SyntaxError" ? z.from(e, z.ERR_BAD_RESPONSE, this, null, pr(this, "response")) : e;
			}
		}
		return e;
	}],
	timeout: 0,
	xsrfCookieName: "XSRF-TOKEN",
	xsrfHeaderName: "X-XSRF-TOKEN",
	maxContentLength: -1,
	maxBodyLength: -1,
	env: {
		FormData: ar.classes.FormData,
		Blob: ar.classes.Blob
	},
	validateStatus: function(e) {
		return e >= 200 && e < 300;
	},
	headers: { common: {
		Accept: "application/json, text/plain, */*",
		"Content-Type": void 0
	} }
};
R.forEach(fr, (e) => {
	hr.headers[e] = {};
});
//#endregion
//#region node_modules/axios/lib/core/transformData.js
function gr(e, t) {
	let n = this || hr, r = t || n, i = kn.from(r.headers), a = r.data;
	return R.forEach(e, function(e) {
		a = e.call(n, a, i.normalize(), t ? t.status : void 0);
	}), i.normalize(), a;
}
//#endregion
//#region node_modules/axios/lib/cancel/isCancel.js
function _r(e) {
	return !!(e && e.__CANCEL__);
}
//#endregion
//#region node_modules/axios/lib/cancel/CanceledError.js
var vr = class extends z {
	constructor(e, t, n) {
		super(e == null ? "canceled" : e, z.ERR_CANCELED, t, n), this.name = "CanceledError", this.__CANCEL__ = !0;
	}
};
//#endregion
//#region node_modules/axios/lib/core/settle.js
function yr(e, t, n) {
	let r = n.config.validateStatus;
	!n.status || !r || r(n.status) ? e(n) : t(new z("Request failed with status code " + n.status, n.status >= 400 && n.status < 500 ? z.ERR_BAD_REQUEST : z.ERR_BAD_RESPONSE, n.config, n.request, n));
}
//#endregion
//#region node_modules/axios/lib/helpers/normalizeURLForProtocolCheck.js
var br = /[\t\n\r]/g;
function xr(e) {
	if (typeof e != "string") return e;
	let t = 0;
	for (; t < e.length && e.charCodeAt(t) <= 32;) t++;
	return e.slice(t).replace(br, "");
}
//#endregion
//#region node_modules/axios/lib/helpers/parseProtocol.js
function Sr(e) {
	let t = /^([-+\w]{1,25}):(?:\/\/)?/.exec(e);
	return t && t[1] || "";
}
//#endregion
//#region node_modules/axios/lib/helpers/speedometer.js
function Cr(e, t) {
	e = e || 10;
	let n = Array(e), r = Array(e), i = 0, a = 0, o;
	return t = t === void 0 ? 1e3 : t, function(s) {
		let c = Date.now(), l = r[a];
		o || (o = c), n[i] = s, r[i] = c;
		let u = a, d = 0;
		for (; u !== i;) d += n[u++], u %= e;
		if (i = (i + 1) % e, i === a && (a = (a + 1) % e), c - o < t) return;
		let f = l && c - l;
		return f ? Math.round(d * 1e3 / f) : void 0;
	};
}
//#endregion
//#region node_modules/axios/lib/helpers/throttle.js
function wr(e, t) {
	let n = 0, r = 1e3 / t, i, a, o = (t, r = Date.now()) => {
		n = r, i = null, a && (clearTimeout(a), a = null), e(...t);
	};
	return [
		(...e) => {
			let t = Date.now(), s = t - n;
			s >= r ? o(e, t) : (i = e, a || (a = setTimeout(() => {
				a = null, o(i);
			}, r - s)));
		},
		() => i && o(i),
		(...e) => o(e)
	];
}
//#endregion
//#region node_modules/axios/lib/helpers/progressEventReducer.js
var Tr = (e, t, n = 3) => {
	let r = 0, i = Cr(50, 250);
	return wr((n) => {
		if (!n || !R.isNumber(n.loaded)) return;
		let a = n.loaded, o = n.lengthComputable ? n.total : void 0, s = Math.max(0, o == null ? a : Math.min(a, o)), c = Math.max(0, s - r), l = i(c);
		r = Math.max(r, s), e({
			loaded: s,
			total: o,
			progress: o ? s / o : void 0,
			bytes: c,
			rate: l || void 0,
			estimated: l && o ? (o - s) / l : void 0,
			event: n,
			lengthComputable: o != null,
			[t ? "download" : "upload"]: !0
		});
	}, n);
}, Er = (e, t) => {
	let n = e != null;
	return [(r) => t[0]({
		lengthComputable: n,
		total: e,
		loaded: r
	}), t[1]];
}, Dr = (e, t = R.asap) => (...n) => t(() => e(...n)), Or = ar.hasStandardBrowserEnv ? ((e, t) => (n) => (n = new URL(n, ar.origin), e.protocol === n.protocol && e.host === n.host && (t || e.port === n.port)))(new URL(ar.origin), ar.navigator && /(msie|trident)/i.test(ar.navigator.userAgent)) : () => !0, kr = ar.hasStandardBrowserEnv ? {
	write(e, t, n, r, i, a, o) {
		if (typeof document > "u") return;
		let s = [`${e}=${encodeURIComponent(t)}`];
		R.isNumber(n) && s.push(`expires=${new Date(n).toUTCString()}`), R.isString(r) && s.push(`path=${r}`), R.isString(i) && s.push(`domain=${i}`), a === !0 && s.push("secure"), R.isString(o) && s.push(`SameSite=${o}`), document.cookie = s.join("; ");
	},
	read(e) {
		if (typeof document > "u") return null;
		let t = document.cookie.split(";");
		for (let n = 0; n < t.length; n++) {
			let r = t[n].replace(/^\s+/, ""), i = r.indexOf("=");
			if (i !== -1 && r.slice(0, i) === e) try {
				return decodeURIComponent(r.slice(i + 1));
			} catch {
				return r.slice(i + 1);
			}
		}
		return null;
	},
	remove(e) {
		this.write(e, "", Date.now() - 864e5, "/");
	}
} : {
	write() {},
	read() {
		return null;
	},
	remove() {}
};
//#endregion
//#region node_modules/axios/lib/helpers/isAbsoluteURL.js
function Ar(e) {
	return typeof e == "string" && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
//#endregion
//#region node_modules/axios/lib/helpers/combineURLs.js
function jr(e, t) {
	if (!t) return e;
	let n = e.length;
	for (; n > 0 && e.charCodeAt(n - 1) === 47;) n--;
	return e.slice(0, n) + "/" + t.replace(/^\/+/, "");
}
//#endregion
//#region node_modules/axios/lib/core/buildFullPath.js
var Mr = /^https?:(?!\/\/)/i;
function Nr(e) {
	return e && e.replace(/(^|&)([^=&]*=)?[^&]+/g, (e, t, n = "") => `${t}${n}${An}`);
}
function Pr(e) {
	let t = e.replace(/^(https?:\/{0,2})[^/?#]*@/i, `$1${An}@`), n = t.indexOf("#"), r = (n === -1 ? t : t.slice(0, n)).replace(/([?&][^=&#]*=)[^&#]*/g, `$1${An}`);
	return n === -1 ? r : `${r}#${Nr(t.slice(n + 1))}`;
}
function Fr(e, t) {
	if (typeof e == "string") {
		let n = xr(e);
		if (Mr.test(n)) throw new z(`Invalid URL ${JSON.stringify(Pr(n))}: missing "//" after protocol`, z.ERR_INVALID_URL, t);
	}
}
function Ir(e, t, n, r) {
	Fr(t, r);
	let i = !Ar(t);
	return e && (i || n === !1) ? (Fr(e, r), jr(e, t)) : t;
}
//#endregion
//#region node_modules/axios/lib/core/mergeConfig.js
var Lr = (e) => e instanceof kn ? { ...e } : e, Rr = (e) => Object.getOwnPropertySymbols && Object.getOwnPropertyDescriptor ? Object.keys(e).concat(Object.getOwnPropertySymbols(e).filter((t) => Object.getOwnPropertyDescriptor(e, t).enumerable)) : Object.keys(e);
function zr(e, t) {
	e = e || {}, t = t || {};
	let n = Object.create(null);
	Object.defineProperty(n, "hasOwnProperty", {
		__proto__: null,
		value: Object.prototype.hasOwnProperty,
		enumerable: !1,
		writable: !0,
		configurable: !0
	});
	function r(e, t, n, r) {
		return R.isPlainObject(e) && R.isPlainObject(t) ? R.merge.call({ caseless: r }, e, t) : R.isPlainObject(t) ? R.merge({}, t) : R.isArray(t) ? t.slice() : t;
	}
	function i(e, t, n, i) {
		if (!R.isUndefined(t)) return r(e, t, n, i);
		if (!R.isUndefined(e)) return r(void 0, e, n, i);
	}
	function a(e, t) {
		if (!R.isUndefined(t)) return r(void 0, t);
	}
	function o(e, t) {
		if (!R.isUndefined(t)) return r(void 0, t);
		if (!R.isUndefined(e)) return r(void 0, e);
	}
	function s(n) {
		let r = R.hasOwnProp(t, "transitional") ? t.transitional : void 0;
		if (!R.isUndefined(r)) {
			if (R.isPlainObject(r)) {
				if (R.hasOwnProp(r, n)) return r[n];
			} else return;
		}
		let i = R.hasOwnProp(e, "transitional") ? e.transitional : void 0;
		if (R.isPlainObject(i) && R.hasOwnProp(i, n)) return i[n];
	}
	function c(n, i, a) {
		if (R.hasOwnProp(t, a)) return r(n, i);
		if (R.hasOwnProp(e, a)) return r(void 0, n);
	}
	let l = {
		url: a,
		method: a,
		data: a,
		baseURL: o,
		transformRequest: o,
		transformResponse: o,
		paramsSerializer: o,
		timeout: o,
		timeoutErrorMessage: o,
		withCredentials: o,
		withXSRFToken: o,
		adapter: o,
		responseType: o,
		xsrfCookieName: o,
		xsrfHeaderName: o,
		onUploadProgress: o,
		onDownloadProgress: o,
		decompress: o,
		maxContentLength: o,
		maxBodyLength: o,
		beforeRedirect: o,
		transport: o,
		httpAgent: o,
		httpsAgent: o,
		cancelToken: o,
		socketPath: o,
		allowedSocketPaths: o,
		responseEncoding: o,
		validateStatus: c,
		headers: (e, t, n) => i(Lr(e), Lr(t), n, !0)
	};
	return R.forEach(Rr({
		...e,
		...t
	}), function(r) {
		if (r === "__proto__" || r === "constructor" || r === "prototype") return;
		let a = R.hasOwnProp(l, r) ? l[r] : i, o = a(R.hasOwnProp(e, r) ? e[r] : void 0, R.hasOwnProp(t, r) ? t[r] : void 0, r);
		R.isUndefined(o) && a !== c || (n[r] = o);
	}), R.hasOwnProp(t, "validateStatus") && R.isUndefined(t.validateStatus) && s("validateStatusUndefinedResolves") === !1 && (R.hasOwnProp(e, "validateStatus") ? n.validateStatus = r(void 0, e.validateStatus) : delete n.validateStatus), n;
}
//#endregion
//#region node_modules/axios/lib/core/setFormDataHeaders.js
var Br = ["content-type", "content-length"];
function Vr(e, t, n) {
	if (n !== "content-only") {
		e.set(t);
		return;
	}
	Object.entries(t || {}).forEach(([t, n]) => {
		Br.includes(t.toLowerCase()) && e.set(t, n);
	});
}
//#endregion
//#region node_modules/axios/lib/helpers/resolveConfig.js
var Hr = (e) => encodeURIComponent(e).replace(/%([0-9A-F]{2})/gi, (e, t) => String.fromCharCode(parseInt(t, 16)));
function Ur(e) {
	let t = zr({}, e), n = (e) => R.hasOwnProp(t, e) ? t[e] : void 0, r = n("data"), i = n("withXSRFToken"), a = n("xsrfHeaderName"), o = n("xsrfCookieName"), s = n("headers"), c = n("auth"), l = n("baseURL"), u = n("allowAbsoluteUrls"), d = n("url");
	if (t.headers = s = kn.from(s), t.url = Gn(Ir(l, d, u, t), n("params"), n("paramsSerializer")), c) {
		let t = R.getSafeProp(c, "username") || "", n = R.getSafeProp(c, "password") || "";
		try {
			s.set("Authorization", "Basic " + btoa(t + ":" + (n ? Hr(n) : "")));
		} catch (t) {
			throw z.from(t, z.ERR_BAD_OPTION_VALUE, e);
		}
	}
	if (R.isFormData(r)) {
		let e = R.getSafeProp(r, "getHeaders");
		ar.hasStandardBrowserEnv || ar.hasStandardBrowserWebWorkerEnv || R.isReactNative(r) ? s.setContentType(void 0) : R.isFunction(e) && Vr(s, e.call(r), n("formDataHeaderPolicy"));
	}
	if (ar.hasStandardBrowserEnv && (R.isFunction(i) && (i = i(t)), i === !0 || i == null && Or(t.url))) {
		let e = a && o && kr.read(o);
		e && s.set(a, e);
	}
	return t;
}
var Wr = typeof XMLHttpRequest < "u" && function(e) {
	return new Promise(function(t, n) {
		let r = Ur(e), i = r.data, a = kn.from(r.headers).normalize(), { responseType: o, onUploadProgress: s, onDownloadProgress: c } = r, l, u, d, f, p, m;
		function h() {
			f && f(), p && p(), r.cancelToken && r.cancelToken.unsubscribe(l), r.signal && r.signal.removeEventListener("abort", l);
		}
		let g = new XMLHttpRequest();
		g.open(r.method.toUpperCase(), r.url, !0), g.timeout = r.timeout;
		function _(i) {
			if (!g) return;
			if (g.status === 0 && (Sr(xr(r.url)) || Sr(ar.origin)) !== "file" && !(g.responseURL && g.responseURL.startsWith("file:"))) {
				n(new z("Request aborted", z.ECONNABORTED, e, g)), h(), g = null;
				return;
			}
			try {
				i ? m && m(i) : p && p();
			} catch (e) {
				setTimeout(() => {
					throw e;
				});
			}
			if (!g) return;
			let a = kn.from("getAllResponseHeaders" in g && g.getAllResponseHeaders());
			yr(function(e) {
				t(e), h();
			}, function(e) {
				n(e), h();
			}, {
				data: !o || o === "text" || o === "json" ? g.responseText : g.response,
				status: g.status,
				statusText: g.statusText,
				headers: a,
				config: e,
				request: g
			}), g = null;
		}
		"onloadend" in g ? g.onloadend = _ : g.onreadystatechange = function() {
			g && g.readyState === 4 && (g.status !== 0 || g.responseURL && g.responseURL.startsWith("file:")) && setTimeout(_);
		}, g.onabort = function() {
			g && (n(new z("Request aborted", z.ECONNABORTED, e, g)), h(), g = null);
		}, g.onerror = function(t) {
			let r = new z(t && t.message ? t.message : "Network Error", z.ERR_NETWORK, e, g);
			r.event = t || null, n(r), h(), g = null;
		}, g.ontimeout = function() {
			let t = r.timeout ? "timeout of " + r.timeout + "ms exceeded" : "timeout exceeded", i = r.transitional || Zn;
			r.timeoutErrorMessage && (t = r.timeoutErrorMessage), n(new z(t, i.clarifyTimeoutError ? z.ETIMEDOUT : z.ECONNABORTED, e, g)), h(), g = null;
		}, i === void 0 && a.setContentType(null), "setRequestHeader" in g && R.forEach(gn(a), function(e, t) {
			g.setRequestHeader(t, e);
		}), R.isUndefined(r.withCredentials) || (g.withCredentials = !!r.withCredentials), o && o !== "json" && (g.responseType = r.responseType), c && ([d, p, m] = Tr(c, !0), g.addEventListener("progress", d)), s && g.upload && ([u, f] = Tr(s), g.upload.addEventListener("progress", u), g.upload.addEventListener("loadend", f)), (r.cancelToken || r.signal) && (l = (t) => {
			g && (n(!t || t.type ? new vr(null, e, g) : t), g.abort(), h(), g = null);
		}, r.cancelToken && r.cancelToken.subscribe(l), r.signal && (r.signal.aborted ? l() : r.signal.addEventListener("abort", l)));
		let v = Sr(r.url);
		if (v && !ar.protocols.includes(v)) {
			n(new z("Unsupported protocol " + v + ":", z.ERR_BAD_REQUEST, e)), h();
			return;
		}
		g.send(i || null);
	});
}, Gr = (e, t) => {
	if (e = e ? e.filter(Boolean) : [], !t && !e.length) return;
	let n = new AbortController(), r = !1, i = function(e) {
		if (!r) {
			r = !0, o();
			let t = e instanceof Error ? e : this.reason;
			n.abort(t instanceof z ? t : new vr(t instanceof Error ? t.message : t));
		}
	}, a = t && setTimeout(() => {
		a = null, i(new z(`timeout of ${t}ms exceeded`, z.ETIMEDOUT));
	}, t), o = () => {
		e && (a && clearTimeout(a), a = null, e.forEach((e) => {
			e.unsubscribe ? e.unsubscribe(i) : e.removeEventListener("abort", i);
		}), e = null);
	};
	e.forEach((e) => {
		if (!r) {
			if (e.aborted) {
				i.call(e);
				return;
			}
			e.addEventListener("abort", i, { once: !0 });
		}
	});
	let { signal: s } = n;
	return s.unsubscribe = () => R.asap(o), s;
}, Kr = function* (e, t) {
	let n = e.byteLength;
	if (!t || n < t) {
		yield e;
		return;
	}
	let r = 0, i;
	for (; r < n;) i = r + t, yield e.slice(r, i), r = i;
}, qr = async function* (e, t) {
	for await (let n of Jr(e)) yield* Kr(n, t);
}, Jr = async function* (e) {
	if (e[Symbol.asyncIterator]) {
		yield* e;
		return;
	}
	let t = e.getReader();
	try {
		for (;;) {
			let { done: e, value: n } = await t.read();
			if (e) break;
			yield n;
		}
	} finally {
		await t.cancel();
	}
}, Yr = (e, t, n, r) => {
	let i = qr(e, t), a = 0, o, s = (e) => {
		o || (o = !0, r && r(e));
	};
	return new ReadableStream({
		async pull(e) {
			try {
				let { done: t, value: r } = await i.next();
				if (t) {
					s(), e.close();
					return;
				}
				let o = r.byteLength;
				n && n(a += o), e.enqueue(new Uint8Array(r));
			} catch (e) {
				throw s(e), e;
			}
		},
		cancel(e) {
			return s(e), i.return();
		}
	}, { highWaterMark: 2 });
}, Xr = (e) => e >= 48 && e <= 57 || e >= 65 && e <= 70 || e >= 97 && e <= 102, Zr = (e, t, n) => t + 2 < n && Xr(e.charCodeAt(t + 1)) && Xr(e.charCodeAt(t + 2)), Qr = (e) => e <= 57 ? e - 48 : (e & 223) - 55, $r = (e) => e >= 65 && e <= 90 || e >= 97 && e <= 122 || e >= 48 && e <= 57 || e === 43 || e === 47 || e === 45 || e === 95, ei = (e) => e === 9 || e === 10 || e === 12 || e === 13 || e === 32, ti = (e) => {
	let t = Math.floor(e / 4), n = e % 4;
	return t * 3 + (n === 2 ? 1 : n === 3 ? 2 : 0);
}, ni = (e) => {
	let t = e.length, n = 0;
	return t > 0 && e.charCodeAt(t - 1) === 61 && (n++, t > 1 && e.charCodeAt(t - 2) === 61 && n++), Math.floor((t - n) * 3 / 4);
}, ri = (e) => {
	let t = e.length, n = 0, r = 0, i = !1;
	for (let a = 0; a < t; a++) {
		let o = e.charCodeAt(a);
		if (o === 37 && Zr(e, a, t) && (o = Qr(e.charCodeAt(a + 1)) * 16 + Qr(e.charCodeAt(a + 2)), a += 2), !ei(o)) {
			if (o === 61) {
				r++;
				continue;
			}
			if (!$r(o) || r > 0) {
				i = !0;
				continue;
			}
			n++;
		}
	}
	return i || r > 2 || r > 0 && (n + r) % 4 != 0 || n % 4 == 1 ? ni(e) : ti(n);
}, ii = (e, t) => {
	if (!e || typeof e != "string" || !e.startsWith("data:")) return 0;
	let n = e.indexOf(",");
	if (n < 0) return 0;
	let r = e.slice(5, n), i = e.slice(n + 1);
	if (/;base64/i.test(r)) return t(i);
	let a = 0;
	for (let e = 0, t = i.length; e < t; e++) {
		let n = i.charCodeAt(e);
		if (n === 37 && Zr(i, e, t)) a += 1, e += 2;
		else if (n < 128) a += 1;
		else if (n < 2048) a += 2;
		else if (n >= 55296 && n <= 56319 && e + 1 < t) {
			let t = i.charCodeAt(e + 1);
			t >= 56320 && t <= 57343 ? (a += 4, e++) : a += 3;
		} else a += 3;
	}
	return a;
};
function ai(e) {
	let t = typeof e == "string" ? e.indexOf("#") : -1;
	return ii(t === -1 ? e : e.slice(0, t), ri);
}
//#endregion
//#region node_modules/axios/lib/env/data.js
var oi = "1.20.0", si = 65536, ci = {
	cache: "default",
	redirect: "follow",
	referrer: "about:client",
	referrerPolicy: "",
	mode: "cors",
	integrity: "",
	keepalive: !1,
	priority: "auto",
	window: null
}, { isFunction: li } = R, ui = (e) => encodeURIComponent(e).replace(/%([0-9A-F]{2})/gi, (e, t) => String.fromCharCode(parseInt(t, 16))), di = (e) => {
	if (!R.isString(e)) return e;
	try {
		return decodeURIComponent(e);
	} catch {
		return e;
	}
}, fi = (e, ...t) => {
	try {
		return !!e(...t);
	} catch {
		return !1;
	}
}, pi = (e) => {
	let t = e.indexOf("://"), n = e;
	return t !== -1 && (n = n.slice(t + 3)), n.includes("@") || n.includes(":");
}, mi = (e) => {
	let t = R.global !== void 0 && R.global !== null ? R.global : globalThis, { ReadableStream: n, TextEncoder: r } = t;
	e = R.merge.call({ skipUndefined: !0 }, {
		Request: t.Request,
		Response: t.Response
	}, e);
	let { fetch: i, Request: a, Response: o } = e, s = i ? li(i) : typeof fetch == "function", c = li(a), l = li(o);
	if (!s) return !1;
	let u = s && li(n), d = s && (typeof r == "function" ? ((e) => (t) => e.encode(t))(new r()) : async (e) => new Uint8Array(await new a(e).arrayBuffer())), f = c && u && fi(() => {
		let e = !1, t = new a(ar.origin, {
			body: new n(),
			method: "POST",
			get duplex() {
				return e = !0, "half";
			}
		}), r = t.headers.has("Content-Type");
		return t.body != null && t.body.cancel(), e && !r;
	}), p = l && u && fi(() => R.isReadableStream(new o("").body)), m = { stream: p && ((e) => e.body) };
	s && [
		"text",
		"arrayBuffer",
		"blob",
		"formData",
		"stream"
	].forEach((e) => {
		!m[e] && (m[e] = (t, n) => {
			let r = t && t[e];
			if (r) return r.call(t);
			throw new z(`Response type '${e}' is not supported`, z.ERR_NOT_SUPPORT, n);
		});
	});
	let h = async (e) => {
		if (e == null) return 0;
		if (R.isBlob(e)) return e.size;
		if (R.isSpecCompliantForm(e)) return (await new a(ar.origin, {
			method: "POST",
			body: e
		}).arrayBuffer()).byteLength;
		if (R.isArrayBufferView(e) || R.isArrayBuffer(e)) return e.byteLength;
		if (R.isURLSearchParams(e) && (e += ""), R.isString(e)) return (await d(e)).byteLength;
	}, g = async (e, t) => {
		let n = R.toFiniteNumber(e.getContentLength());
		return n == null ? h(t) : n;
	};
	return async (e) => {
		let { url: t, method: n, data: s, signal: l, cancelToken: d, timeout: _, onDownloadProgress: v, onUploadProgress: y, responseType: b, headers: x, withCredentials: S = "same-origin", fetchOptions: C, maxContentLength: w, maxBodyLength: T, maxRedirects: E } = Ur(e), D = R.isNumber(w) && w > -1, O = R.isNumber(T) && T > -1, k = (t) => R.hasOwnProp(e, t) ? e[t] : void 0, A = i || fetch;
		b = b ? (b + "").toLowerCase() : "text";
		let j = Gr([l, d && d.toAbortSignal()], _), M = null, N = j && j.unsubscribe && (() => {
			j.unsubscribe();
		}), P, ee = null, te = () => new z("Request body larger than maxBodyLength limit", z.ERR_BAD_REQUEST, e, M);
		try {
			let i, l = k("auth");
			if (l && (i = {
				username: R.getSafeProp(l, "username") || "",
				password: R.getSafeProp(l, "password") || ""
			}), pi(t)) {
				let e = new URL(t, ar.origin);
				!i && (e.username || e.password) && (i = {
					username: di(e.username),
					password: di(e.password)
				}), (e.username || e.password) && (e.username = "", e.password = "", t = e.href);
			}
			if (i && (x.delete("authorization"), x.set("Authorization", "Basic " + btoa(ui((i.username || "") + ":" + (i.password || ""))))), D && typeof t == "string" && t.startsWith("data:") && ai(t) > w) throw new z("maxContentLength size of " + w + " exceeded", z.ERR_BAD_RESPONSE, e, M);
			if (O && n !== "get" && n !== "head") {
				let e = await h(s);
				if (typeof e == "number" && isFinite(e) && (P = e, e > T)) throw te();
			}
			let d = O && (R.isReadableStream(s) || R.isStream(s)), _ = (e, t, n) => Yr(e, si, (e) => {
				if (O && e > T) throw ee = te();
				t && t(e);
			}, n);
			if (f && n !== "get" && n !== "head" && (y || d)) {
				if (P = P == null ? await g(x, s) : P, P !== 0 || d) {
					let e = new a(t, {
						method: "POST",
						body: s,
						duplex: "half"
					}), n;
					if (R.isFormData(s) && (n = e.headers.get("content-type")) && x.setContentType(n), e.body) {
						let [t, n] = y && Er(P, Tr(Dr(y))) || [];
						s = _(e.body, t, n);
					}
				}
			} else if (d && !c && u && n !== "get" && n !== "head") s = _(s);
			else if (d && c && !f && n !== "get" && n !== "head") throw new z("Stream request bodies are not supported by the current fetch implementation", z.ERR_NOT_SUPPORT, e, M);
			R.isString(S) || (S = S ? "include" : "omit");
			let F = c && "credentials" in a.prototype;
			if (R.isFormData(s)) {
				let e = x.getContentType();
				e && /^multipart\/form-data/i.test(e) && !/boundary=/i.test(e) && x.delete("content-type");
			}
			x.set("User-Agent", "axios/" + oi, !1);
			let ne = C == null ? C : Object.assign(Object.create(null), C);
			ne && (delete ne.body, delete ne.headers, delete ne.method, delete ne.signal, delete ne.duplex, delete ne.credentials);
			let I = Object.assign(Object.create(null), ne, {
				signal: j,
				method: n.toUpperCase(),
				headers: gn(x.normalize()),
				body: s,
				duplex: "half",
				credentials: F ? S : void 0
			});
			c && (R.forEach(ci, (e, t) => {
				I[t] === void 0 && (I[t] = e);
			}), I.signal === void 0 && (I.signal = null), I.body === void 0 && (I.body = null)), E === 0 && (I.redirect = "manual", ne && (ne.redirect = "manual")), M = c && new a(t, I);
			let L = await (c ? A(M, ne) : A(t, I)), re = kn.from(L.headers);
			if (D) {
				let t = R.toFiniteNumber(re.getContentLength());
				if (t != null && t > w) throw new z("maxContentLength size of " + w + " exceeded", z.ERR_BAD_RESPONSE, e, M);
			}
			let ie = p && (b === "stream" || b === "response");
			if (p && L.body && (v || D || ie && N)) {
				let t = {};
				[
					"status",
					"statusText",
					"headers"
				].forEach((e) => {
					t[e] = L[e];
				});
				let n = R.toFiniteNumber(re.getContentLength()), [r, i] = v && Er(n, Tr(Dr(v), !0)) || [], a = 0;
				L = new o(Yr(L.body, si, (t) => {
					if (D && (a = t, a > w)) throw new z("maxContentLength size of " + w + " exceeded", z.ERR_BAD_RESPONSE, e, M);
					r && r(t);
				}, () => {
					i && i(), N && N();
				}), t);
			}
			b = b || "text";
			let ae = await m[R.findKey(m, b) || "text"](L, e);
			if (D && !p && !ie) {
				let t;
				if (ae != null && (typeof ae.byteLength == "number" ? t = ae.byteLength : typeof ae.size == "number" ? t = ae.size : typeof ae == "string" && (t = typeof r == "function" ? new r().encode(ae).byteLength : ae.length)), typeof t == "number" && t > w) throw new z("maxContentLength size of " + w + " exceeded", z.ERR_BAD_RESPONSE, e, M);
			}
			return !ie && N && N(), await new Promise((t, n) => {
				yr(t, n, {
					data: ae,
					headers: kn.from(L.headers),
					status: L.status,
					statusText: L.statusText,
					config: e,
					request: M
				});
			});
		} catch (t) {
			if (N && N(), j && j.aborted && j.reason instanceof z) {
				let n = j.reason;
				throw n.config = e, M && (n.request = M), t !== n && Object.defineProperty(n, "cause", {
					__proto__: null,
					value: t,
					writable: !0,
					enumerable: !1,
					configurable: !0
				}), n;
			}
			if (ee) throw M && !ee.request && (ee.request = M), ee;
			if (t instanceof z) throw M && !t.request && (t.request = M), t;
			if (t && t.name === "TypeError" && /Load failed|fetch/i.test(t.message)) {
				let n = new z("Network Error", z.ERR_NETWORK, e, M, t && t.response);
				throw Object.defineProperty(n, "cause", {
					__proto__: null,
					value: t.cause || t,
					writable: !0,
					enumerable: !1,
					configurable: !0
				}), n;
			}
			throw z.from(t, t && t.code, e, M, t && t.response);
		}
	};
}, hi = /* @__PURE__ */ new Map(), gi = (e) => {
	let t = e && e.env || {}, { fetch: n, Request: r, Response: i } = t, a = [
		r,
		i,
		n
	], o = a.length, s, c, l = hi;
	for (; o--;) s = a[o], c = l.get(s), c === void 0 && l.set(s, c = o ? /* @__PURE__ */ new Map() : mi(t)), l = c;
	return c;
};
gi();
//#endregion
//#region node_modules/axios/lib/adapters/adapters.js
var _i = {
	http: null,
	xhr: Wr,
	fetch: { get: gi }
};
R.forEach(_i, (e, t) => {
	if (e) {
		try {
			Object.defineProperty(e, "name", {
				__proto__: null,
				value: t
			});
		} catch {}
		Object.defineProperty(e, "adapterName", {
			__proto__: null,
			value: t
		});
	}
});
var vi = (e) => `- ${e}`, yi = (e) => R.isFunction(e) || e === null || e === !1;
function bi(e, t) {
	e = R.isArray(e) ? e : [e];
	let { length: n } = e, r, i, a = {};
	for (let o = 0; o < n; o++) {
		r = e[o];
		let n;
		if (i = r, !yi(r) && (i = _i[(n = String(r)).toLowerCase()], i === void 0)) throw new z(`Unknown adapter '${n}'`);
		if (i && (R.isFunction(i) || (i = i.get(t)))) break;
		a[n || "#" + o] = i;
	}
	if (!i) {
		let e = Object.entries(a).map(([e, t]) => `adapter ${e} ` + (t === !1 ? "is not supported by the environment" : "is not available in the build"));
		throw new z("There is no suitable adapter to dispatch the request " + (n ? e.length > 1 ? "since :\n" + e.map(vi).join("\n") : " " + vi(e[0]) : "as no adapter specified"), z.ERR_NOT_SUPPORT);
	}
	return i;
}
var xi = {
	getAdapter: bi,
	adapters: _i
};
//#endregion
//#region node_modules/axios/lib/core/dispatchRequest.js
function Si(e) {
	if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted) throw new vr(null, e);
}
function Ci(e) {
	let t = R.toSafeFlatObject(e);
	return Si(t), t.headers = kn.from(R.getSafeProp(t, "headers")), t.data = gr.call(t, t.transformRequest), [
		"post",
		"put",
		"patch"
	].indexOf(t.method) !== -1 && t.headers.setContentType("application/x-www-form-urlencoded", !1), xi.getAdapter(t.adapter || hr.adapter, t)(t).then(function(e) {
		Si(t), t.response = e;
		try {
			e.data = gr.call(t, t.transformResponse, e);
		} finally {
			delete t.response;
		}
		return e.headers = kn.from(e.headers), e;
	}, function(e) {
		if (!_r(e) && (Si(t), e && e.response)) {
			t.response = e.response;
			try {
				e.response.data = gr.call(t, t.transformResponse, e.response);
			} finally {
				delete t.response;
			}
			e.response.headers = kn.from(e.response.headers);
		}
		return Promise.reject(e);
	});
}
//#endregion
//#region node_modules/axios/lib/helpers/validator.js
var wi = {};
[
	"object",
	"boolean",
	"number",
	"function",
	"string",
	"symbol"
].forEach((e, t) => {
	wi[e] = function(n) {
		return typeof n === e || "a" + (t < 1 ? "n " : " ") + e;
	};
});
var Ti = {};
wi.transitional = function(e, t, n) {
	function r(e, t) {
		return "[Axios v" + oi + "] Transitional option '" + e + "'" + t + (n ? ". " + n : "");
	}
	return (n, i, a) => {
		if (e === !1) throw new z(r(i, " has been removed" + (t ? " in " + t : "")), z.ERR_DEPRECATED);
		return t && !Ti[i] && (Ti[i] = !0, console.warn(r(i, " has been deprecated since v" + t + " and will be removed in the near future"))), !e || e(n, i, a);
	};
}, wi.spelling = function(e) {
	return (t, n) => (console.warn(`${n} is likely a misspelling of ${e}`), !0);
};
function Ei(e, t, n) {
	if (typeof e != "object" || !e) throw new z("options must be an object", z.ERR_BAD_OPTION_VALUE);
	let r = Object.keys(e), i = r.length;
	for (; i-- > 0;) {
		let a = r[i], o = Object.prototype.hasOwnProperty.call(t, a) ? t[a] : void 0;
		if (o) {
			let t = e[a], n = t === void 0 || o(t, a, e);
			if (n !== !0) throw new z("option " + a + " must be " + n, z.ERR_BAD_OPTION_VALUE);
			continue;
		}
		if (n !== !0) throw new z("Unknown option " + a, z.ERR_BAD_OPTION);
	}
}
var Di = {
	assertOptions: Ei,
	validators: wi
}, Oi = Di.validators, ki = class {
	constructor(e) {
		this.defaults = e || {}, this.interceptors = {
			request: new Xn(),
			response: new Xn()
		};
	}
	async request(e, t) {
		try {
			return await this._request(e, t);
		} catch (e) {
			if (e instanceof Error) try {
				let t = {};
				Error.captureStackTrace ? Error.captureStackTrace(t) : t = /* @__PURE__ */ Error();
				let n = t.stack, r = "";
				if (typeof n == "string") {
					let e = n.indexOf("\n");
					r = e === -1 ? "" : n.slice(e + 1);
				}
				if (!e.stack) e.stack = r;
				else if (r) {
					let t = r.indexOf("\n"), n = t === -1 ? -1 : r.indexOf("\n", t + 1), i = n === -1 ? "" : r.slice(n + 1);
					String(e.stack).endsWith(i) || (e.stack += "\n" + r);
				}
			} catch {}
			throw e;
		}
	}
	_request(e, t) {
		typeof e == "string" ? (t = t || {}, t.url = e) : t = e || {}, t = zr(this.defaults, t);
		let { transitional: n, paramsSerializer: r, headers: i } = t;
		n !== void 0 && Di.assertOptions(n, {
			silentJSONParsing: Oi.transitional(Oi.boolean),
			forcedJSONParsing: Oi.transitional(Oi.boolean),
			clarifyTimeoutError: Oi.transitional(Oi.boolean),
			legacyInterceptorReqResOrdering: Oi.transitional(Oi.boolean),
			advertiseZstdAcceptEncoding: Oi.transitional(Oi.boolean),
			validateStatusUndefinedResolves: Oi.transitional(Oi.boolean)
		}, !1), r != null && (R.isFunction(r) ? t.paramsSerializer = { serialize: r } : Di.assertOptions(r, {
			encode: Oi.function,
			serialize: Oi.function
		}, !0)), t.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls === void 0 ? t.allowAbsoluteUrls = !0 : t.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls), Di.assertOptions(t, {
			baseUrl: Oi.spelling("baseURL"),
			withXsrfToken: Oi.spelling("withXSRFToken")
		}, !0), t.method = (R.getSafeProp(t, "method") || R.getSafeProp(this.defaults, "method") || "get").toLowerCase();
		let a = i && R.merge(i.common, i[t.method]);
		i && R.forEach(fr.concat("common"), (e) => {
			delete i[e];
		}), t.headers = kn.concat(a, i);
		let o = [], s = !0;
		this.interceptors.request.forEach(function(e) {
			if (typeof e.runWhen == "function" && e.runWhen(t) === !1) return;
			s = s && e.synchronous;
			let n = t.transitional || Zn;
			n && n.legacyInterceptorReqResOrdering ? o.unshift(e.fulfilled, e.rejected) : o.push(e.fulfilled, e.rejected);
		});
		let c = [];
		this.interceptors.response.forEach(function(e) {
			c.push(e.fulfilled, e.rejected);
		});
		let l, u = 0, d;
		if (!s) {
			let e = [Ci.bind(this), void 0];
			for (e.unshift(...o), e.push(...c), d = e.length, l = Promise.resolve(t); u < d;) l = l.then(e[u++], e[u++]);
			return l;
		}
		d = o.length;
		let f = t;
		for (; u < d;) {
			let e = o[u++], t = o[u++];
			try {
				f = e ? e(f) : f;
			} catch (e) {
				if (!t) {
					l = Promise.reject(e);
					break;
				}
				try {
					let n = t.call(this, e);
					R.isThenable(n) && (l = Promise.resolve(n).then(() => Ci.call(this, f)));
				} catch (e) {
					l = Promise.reject(e);
				}
				break;
			}
		}
		if (!l) try {
			l = Ci.call(this, f);
		} catch (e) {
			l = Promise.reject(e);
		}
		for (u = 0, d = c.length; u < d;) l = l.then(c[u++], c[u++]);
		return l;
	}
	getUri(e) {
		return e = zr(this.defaults, e), Gn(Ir(e.baseURL, e.url, e.allowAbsoluteUrls, e), e.params, e.paramsSerializer);
	}
};
R.forEach([
	"delete",
	"get",
	"head",
	"options"
], function(e) {
	ki.prototype[e] = function(t, n) {
		return this.request(zr(n || {}, {
			method: e,
			url: t,
			data: n && R.hasOwnProp(n, "data") ? n.data : void 0
		}));
	};
}), R.forEach([
	"post",
	"put",
	"patch",
	"query"
], function(e) {
	function t(t) {
		return function(n, r, i) {
			return this.request(zr(i || {}, {
				method: e,
				headers: t ? { "Content-Type": "multipart/form-data" } : {},
				url: n,
				data: r
			}));
		};
	}
	ki.prototype[e] = t(), e !== "query" && (ki.prototype[e + "Form"] = t(!0));
});
//#endregion
//#region node_modules/axios/lib/cancel/CancelToken.js
var Ai = class e {
	constructor(e) {
		if (typeof e != "function") throw TypeError("executor must be a function.");
		let t;
		this.promise = new Promise(function(e) {
			t = e;
		});
		let n = this;
		this.promise.then((e) => {
			if (!n._listeners) return;
			let t = n._listeners.length;
			for (; t-- > 0;) n._listeners[t](e);
			n._listeners = null;
		}), this.promise.then = (e) => {
			let t, r = new Promise((e) => {
				n.subscribe(e), t = e;
			}).then(e);
			return r.cancel = function() {
				n.unsubscribe(t);
			}, r;
		}, e(function(e, r, i) {
			n.reason || (n.reason = new vr(e, r, i), t(n.reason));
		});
	}
	throwIfRequested() {
		if (this.reason) throw this.reason;
	}
	subscribe(e) {
		if (this.reason) {
			e(this.reason);
			return;
		}
		this._listeners ? this._listeners.push(e) : this._listeners = [e];
	}
	unsubscribe(e) {
		if (!this._listeners) return;
		let t = this._listeners.indexOf(e);
		t !== -1 && this._listeners.splice(t, 1);
	}
	toAbortSignal() {
		let e = new AbortController(), t = (t) => {
			e.abort(t);
		};
		return this.subscribe(t), e.signal.unsubscribe = () => this.unsubscribe(t), e.signal;
	}
	static source() {
		let t;
		return {
			token: new e(function(e) {
				t = e;
			}),
			cancel: t
		};
	}
};
//#endregion
//#region node_modules/axios/lib/helpers/spread.js
function ji(e) {
	return function(t) {
		return e.apply(null, t);
	};
}
//#endregion
//#region node_modules/axios/lib/helpers/isAxiosError.js
function Mi(e) {
	return R.isObject(e) && e.isAxiosError === !0;
}
//#endregion
//#region node_modules/axios/lib/helpers/HttpStatusCode.js
var Ni = {
	Continue: 100,
	SwitchingProtocols: 101,
	Processing: 102,
	EarlyHints: 103,
	Ok: 200,
	Created: 201,
	Accepted: 202,
	NonAuthoritativeInformation: 203,
	NoContent: 204,
	ResetContent: 205,
	PartialContent: 206,
	MultiStatus: 207,
	AlreadyReported: 208,
	ImUsed: 226,
	MultipleChoices: 300,
	MovedPermanently: 301,
	Found: 302,
	SeeOther: 303,
	NotModified: 304,
	UseProxy: 305,
	Unused: 306,
	TemporaryRedirect: 307,
	PermanentRedirect: 308,
	BadRequest: 400,
	Unauthorized: 401,
	PaymentRequired: 402,
	Forbidden: 403,
	NotFound: 404,
	MethodNotAllowed: 405,
	NotAcceptable: 406,
	ProxyAuthenticationRequired: 407,
	RequestTimeout: 408,
	Conflict: 409,
	Gone: 410,
	LengthRequired: 411,
	PreconditionFailed: 412,
	PayloadTooLarge: 413,
	ContentTooLarge: 413,
	UriTooLong: 414,
	UnsupportedMediaType: 415,
	RangeNotSatisfiable: 416,
	ExpectationFailed: 417,
	ImATeapot: 418,
	MisdirectedRequest: 421,
	UnprocessableEntity: 422,
	UnprocessableContent: 422,
	Locked: 423,
	FailedDependency: 424,
	TooEarly: 425,
	UpgradeRequired: 426,
	PreconditionRequired: 428,
	TooManyRequests: 429,
	RequestHeaderFieldsTooLarge: 431,
	UnavailableForLegalReasons: 451,
	InternalServerError: 500,
	NotImplemented: 501,
	BadGateway: 502,
	ServiceUnavailable: 503,
	GatewayTimeout: 504,
	HttpVersionNotSupported: 505,
	VariantAlsoNegotiates: 506,
	InsufficientStorage: 507,
	LoopDetected: 508,
	NotExtended: 510,
	NetworkAuthenticationRequired: 511,
	WebServerReturnsAnUnknownError: 520,
	WebServerIsDown: 521,
	ConnectionTimedOut: 522,
	OriginIsUnreachable: 523,
	TimeoutOccurred: 524,
	SslHandshakeFailed: 525,
	InvalidSslCertificate: 526
};
Object.entries(Ni).forEach(([e, t]) => {
	Ni[t] === void 0 && (Ni[t] = e);
});
//#endregion
//#region node_modules/axios/lib/axios.js
function Pi(e) {
	let t = new ki(e), n = Be(ki.prototype.request, t);
	return R.extend(n, ki.prototype, t, { allOwnKeys: !0 }), R.extend(n, t, null, { allOwnKeys: !0 }), n.create = function(t) {
		return Pi(zr(e, t));
	}, n;
}
var Fi = Pi(hr);
Fi.Axios = ki, Fi.CanceledError = vr, Fi.CancelToken = Ai, Fi.isCancel = _r, Fi.VERSION = oi, Fi.toFormData = Bn, Fi.AxiosError = z, Fi.Cancel = Fi.CanceledError, Fi.all = function(e) {
	return Promise.all(e);
}, Fi.spread = ji, Fi.isAxiosError = Mi, Fi.mergeConfig = zr, Fi.AxiosHeaders = kn, Fi.formToJSON = (e) => dr(R.isHTMLForm(e) ? new FormData(e) : e), Fi.getAdapter = xi.getAdapter, Fi.HttpStatusCode = Ni, Fi.default = Fi;
//#endregion
//#region \0hart-embed:no-app-session
var Ii = /* @__PURE__ */ T((() => {
	throw Error("hart-embed: the app auth session is not bundled");
})), Li = null;
function Ri() {
	if (Li) return Li;
	try {
		Li = Ii().clearAccessTokenForExpiry;
	} catch {
		Li = () => {
			localStorage.removeItem("access_token");
			try {
				window.dispatchEvent(new Event("auth:expired"));
			} catch {}
		};
	}
	return Li;
}
function zi(e, { timeout: t = 15e3, handle401: n = !0, cache: r = !0 } = {}) {
	let i = Fi.create({
		baseURL: e,
		headers: { "Content-Type": "application/json" },
		timeout: t
	});
	if (i.interceptors.request.use((e) => {
		let t = localStorage.getItem("access_token");
		return t && (e.headers.Authorization = `Bearer ${t}`), e;
	}), r && i.interceptors.request.use((e) => {
		if ((e.method || "get").toLowerCase() !== "get" || e.cache === !1) return e;
		let t = ze.buildKey({
			...e,
			_publicScope: !0
		}), n = ze.getPublic(t);
		if (n !== null) return e.adapter = () => Promise.resolve({
			data: n,
			status: 200,
			statusText: "OK (public cache)",
			headers: {},
			config: e
		}), e;
		let r = ze.buildKey(e), i = ze.get(r);
		return i && !i.stale ? (e.adapter = () => Promise.resolve({
			data: i.data,
			status: 200,
			statusText: "OK (cache)",
			headers: {},
			config: e
		}), e) : (i && i.stale && (e._staleData = i.data, e._cacheKey = r), e._cacheKey = e._cacheKey || r, e);
	}), i.interceptors.response.use((e) => {
		let t = e.data;
		if (r) {
			let r = e.config || {}, i = (r.method || "get").toLowerCase();
			if (i === "get" && r.cache !== !1) {
				var n;
				let i = r._cacheKey || ze.buildKey(r), a = (r.baseURL || "") + (r.url || "");
				ze.set(i, t, a);
				let o = ((n = e.headers) == null ? void 0 : n["x-cache-scope"]) === "public", s = (t == null ? void 0 : t._public) === !0;
				if (o || s) {
					let e = ze.buildKey({
						...r,
						_publicScope: !0
					}), n = ze.getPublicTTL(a);
					ze.setPublic(e, t, n);
				}
			} else if ([
				"post",
				"put",
				"patch",
				"delete"
			].includes(i)) {
				let e = (r.baseURL || "") + (r.url || "");
				ze.invalidateOnMutation(e);
			}
		}
		return t;
	}, (e) => {
		var t, i, a;
		n && ((t = e.response) == null ? void 0 : t.status) === 401 && Ri()();
		try {
			if (typeof window < "u" && e != null && e.config && !e.config.silentError) {
				var o;
				let t = Number((o = e.response) == null ? void 0 : o.status) || 0, n = (e.config.baseURL || "") + (e.config.url || ""), r = String(e.config.method || "get").toUpperCase();
				window.dispatchEvent(new CustomEvent("hevolve:api-error", { detail: {
					status: t,
					path: n,
					method: r
				} }));
			}
		} catch {}
		if (r && ((i = e.config) == null ? void 0 : i._staleData) !== void 0) return e.config._staleData;
		if ((a = e.config) != null && a.keepStatus && e.response) {
			let { status: t, data: n } = e.response;
			return Promise.reject(n && typeof n == "object" && !Array.isArray(n) ? {
				...n,
				status: t
			} : { status: t });
		}
		return Promise.reject(e.response ? e.response.data : e);
	}), r) {
		let e = i.request.bind(i);
		i.request = function(t) {
			if ((t.method || "get").toLowerCase() === "get" && t.cache !== !1) {
				let n = ze.buildKey(t);
				return ze.dedupFetch(n, () => e(t));
			}
			return e(t);
		};
		let t = i.get.bind(i);
		i.get = function(e, n = {}) {
			let r = {
				...n,
				url: e,
				method: "get"
			}, i = ze.buildKey(r);
			return ze.dedupFetch(i, () => t(e, n));
		};
	}
	return i;
}
//#endregion
//#region src/services/socialApi.js
var Bi = zi(g);
zi(p, { handle401: !1 });
var Vi = {
	list: (e) => Bi.get("/notifications", { params: e }),
	markRead: (e) => Bi.post("/notifications/read", { ids: e }),
	markAllRead: () => Bi.post("/notifications/read-all")
}, Hi = {
	grant: ({ consent_type: e, scope: t, agent_id: n, metadata: r }) => Bi.post("/consent", {
		consent_type: e,
		scope: t,
		agent_id: n,
		metadata: r
	}),
	revoke: ({ consent_type: e, scope: t, agent_id: n }) => Bi.post("/consent/revoke", {
		consent_type: e,
		scope: t,
		agent_id: n
	}),
	decline: ({ consent_type: e, scope: t, agent_id: n }) => Bi.post("/consent/decline", {
		consent_type: e,
		scope: t,
		agent_id: n
	}),
	reopen: ({ consent_type: e, scope: t }) => Bi.post("/consent/reopen", {
		consent_type: e,
		scope: t
	}),
	list: ({ consent_type: e, active_only: t } = {}) => {
		let n = {};
		return e !== void 0 && (n.consent_type = e), t !== void 0 && (n.active_only = t ? "true" : "false"), Bi.get("/consent", { params: n });
	}
};
zi(g.replace(/\/social$/, ""));
var Ui = /^\/api\/./, Wi = zi(h, { cache: !1 }), Gi = { submit: (e, t) => typeof e != "string" || !Ui.test(e) ? Promise.reject(/* @__PURE__ */ Error("This form points outside the app, so it was not sent.")) : Wi.post(e, t, { silentError: !0 }) }, Ki = zi(f, {
	timeout: 18e4,
	cache: !1
}), qi = 18e4, Ji = null;
function Yi() {
	Ji && Ji.reset();
}
var Xi = zi(d, {
	handle401: !1,
	cache: !1
}), Zi = {
	getPrompts: (e) => Ki.get("/prompts", { params: { user_id: e } }),
	getPublicPrompts: () => Ki.get("/prompts/public"),
	getPublicPromptsCloud: () => Xi.get("/getprompt_all/"),
	getUserPromptsCloud: (e) => Xi.get("/getprompt_userid/", { params: { user_id: e } }),
	chat: (e, t = {}) => {
		let n = new AbortController(), r = setTimeout(() => n.abort(), qi), i = { reset: () => {
			clearTimeout(r), r = setTimeout(() => n.abort(), qi);
		} };
		Ji = i;
		let a = () => {
			clearTimeout(r), Ji === i && (Ji = null);
		};
		return Ki.post("/chat", e, {
			signal: n.signal,
			timeout: 0,
			...t
		}).then((e) => (a(), e), (e) => {
			throw a(), e;
		});
	},
	bumpChatDeadline: Yi,
	customGpt: (e) => Ki.post("/custom_gpt", e),
	ttsVoices: () => Ki.get("/tts/voices"),
	ttsSynthesize: (e) => Ki.post("/tts/synthesize", e),
	ttsStatus: () => Ki.get("/tts/status"),
	health: () => Ki.get("/backend/health"),
	llmStatus: () => Ki.get("/api/llm/status"),
	networkStatus: () => Ki.get("/network/status"),
	getAgentSync: () => Ki.get("/agents/sync"),
	syncAgents: (e) => Ki.post("/agents/sync", { agents: e }),
	migrateAgents: (e) => Ki.post("/agents/migrate", e),
	getLlmConfig: () => Ki.get("/api/llm/config"),
	updateLlmConfig: (e) => Ki.post("/api/llm/config", e),
	testLlmConnection: (e) => Ki.post("/api/llm/test", e),
	vaultStore: (e) => Ki.post("/api/vault/store", e),
	vaultKeys: () => Ki.get("/api/vault/keys"),
	vaultHas: (e, t) => Ki.get("/api/vault/has", { params: {
		key_name: e,
		channel_type: t || ""
	} }),
	get: (e, t) => Ki.get(e, t),
	post: (e, t, n) => Ki.post(e, t, n),
	forgetGuest: () => Ki.delete("/api/guest-id", { data: { confirm: !0 } })
};
zi(m, {
	handle401: !1,
	cache: !1
});
//#endregion
//#region node_modules/@babel/runtime/helpers/interopRequireDefault.js
var Qi = /* @__PURE__ */ T(((e, t) => {
	function n(e) {
		return e && e.__esModule ? e : { default: e };
	}
	t.exports = n, t.exports.__esModule = !0, t.exports.default = t.exports;
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/extends.js
function B() {
	return B = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, B.apply(null, arguments);
}
var V = w((() => {})), $i = /* @__PURE__ */ T(((e) => {
	var t = Symbol.for("react.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.provider"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.iterator;
	function p(e) {
		return typeof e != "object" || !e ? null : (e = f && e[f] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var m = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, h = Object.assign, g = {};
	function _(e, t, n) {
		this.props = e, this.context = t, this.refs = g, this.updater = n || m;
	}
	_.prototype.isReactComponent = {}, _.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, _.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function v() {}
	v.prototype = _.prototype;
	function y(e, t, n) {
		this.props = e, this.context = t, this.refs = g, this.updater = n || m;
	}
	var b = y.prototype = new v();
	b.constructor = y, h(b, _.prototype), b.isPureReactComponent = !0;
	var x = Array.isArray, S = Object.prototype.hasOwnProperty, C = { current: null }, w = {
		key: !0,
		ref: !0,
		__self: !0,
		__source: !0
	};
	function T(e, n, r) {
		var i, a = {}, o = null, s = null;
		if (n != null) for (i in n.ref !== void 0 && (s = n.ref), n.key !== void 0 && (o = "" + n.key), n) S.call(n, i) && !w.hasOwnProperty(i) && (a[i] = n[i]);
		var c = arguments.length - 2;
		if (c === 1) a.children = r;
		else if (1 < c) {
			for (var l = Array(c), u = 0; u < c; u++) l[u] = arguments[u + 2];
			a.children = l;
		}
		if (e && e.defaultProps) for (i in c = e.defaultProps, c) a[i] === void 0 && (a[i] = c[i]);
		return {
			$$typeof: t,
			type: e,
			key: o,
			ref: s,
			props: a,
			_owner: C.current
		};
	}
	function E(e, n) {
		return {
			$$typeof: t,
			type: e.type,
			key: n,
			ref: e.ref,
			props: e.props,
			_owner: e._owner
		};
	}
	function D(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function O(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var k = /\/+/g;
	function A(e, t) {
		return typeof e == "object" && e && e.key != null ? O("" + e.key) : t.toString(36);
	}
	function j(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n: c = !0;
			}
		}
		if (c) return c = e, o = o(c), e = a === "" ? "." + A(c, 0) : a, x(o) ? (i = "", e != null && (i = e.replace(k, "$&/") + "/"), j(o, r, i, "", function(e) {
			return e;
		})) : o != null && (D(o) && (o = E(o, i + (!o.key || c && c.key === o.key ? "" : ("" + o.key).replace(k, "$&/") + "/") + e)), r.push(o)), 1;
		if (c = 0, a = a === "" ? "." : a + ":", x(e)) for (var l = 0; l < e.length; l++) {
			s = e[l];
			var u = a + A(s, l);
			c += j(s, r, i, u, o);
		}
		else if (u = p(e), typeof u == "function") for (e = u.call(e), l = 0; !(s = e.next()).done;) s = s.value, u = a + A(s, l++), c += j(s, r, i, u, o);
		else if (s === "object") throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		return c;
	}
	function M(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return j(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function N(e) {
		if (e._status === -1) {
			var t = e._result;
			t = t(), t.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t);
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t);
			}), e._status === -1 && (e._status = 0, e._result = t);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var P = { current: null }, ee = { transition: null }, te = {
		ReactCurrentDispatcher: P,
		ReactCurrentBatchConfig: ee,
		ReactCurrentOwner: C
	};
	function F() {
		throw Error("act(...) is not supported in production builds of React.");
	}
	e.Children = {
		map: M,
		forEach: function(e, t, n) {
			M(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return M(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return M(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!D(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	}, e.Component = _, e.Fragment = r, e.Profiler = a, e.PureComponent = y, e.StrictMode = i, e.Suspense = l, e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = te, e.act = F, e.cloneElement = function(e, n, r) {
		if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
		var i = h({}, e.props), a = e.key, o = e.ref, s = e._owner;
		if (n != null) {
			if (n.ref !== void 0 && (o = n.ref, s = C.current), n.key !== void 0 && (a = "" + n.key), e.type && e.type.defaultProps) var c = e.type.defaultProps;
			for (l in n) S.call(n, l) && !w.hasOwnProperty(l) && (i[l] = n[l] === void 0 && c !== void 0 ? c[l] : n[l]);
		}
		var l = arguments.length - 2;
		if (l === 1) i.children = r;
		else if (1 < l) {
			c = Array(l);
			for (var u = 0; u < l; u++) c[u] = arguments[u + 2];
			i.children = c;
		}
		return {
			$$typeof: t,
			type: e.type,
			key: a,
			ref: o,
			props: i,
			_owner: s
		};
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null,
			_defaultValue: null,
			_globalName: null
		}, e.Provider = {
			$$typeof: o,
			_context: e
		}, e.Consumer = e;
	}, e.createElement = T, e.createFactory = function(e) {
		var t = T.bind(null, e);
		return t.type = e, t;
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = D, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: N
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = function(e) {
		var t = ee.transition;
		ee.transition = {};
		try {
			e();
		} finally {
			ee.transition = t;
		}
	}, e.unstable_act = F, e.useCallback = function(e, t) {
		return P.current.useCallback(e, t);
	}, e.useContext = function(e) {
		return P.current.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e) {
		return P.current.useDeferredValue(e);
	}, e.useEffect = function(e, t) {
		return P.current.useEffect(e, t);
	}, e.useId = function() {
		return P.current.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return P.current.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return P.current.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return P.current.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return P.current.useMemo(e, t);
	}, e.useReducer = function(e, t, n) {
		return P.current.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return P.current.useRef(e);
	}, e.useState = function(e) {
		return P.current.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return P.current.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return P.current.useTransition();
	}, e.version = "18.3.1";
})), ea = /* @__PURE__ */ T(((e, t) => {
	t.exports = $i();
}));
//#endregion
//#region node_modules/@mui/utils/esm/deepmerge/deepmerge.js
function ta(e) {
	if (typeof e != "object" || !e) return !1;
	let t = Object.getPrototypeOf(e);
	return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Symbol.toStringTag in e) && !(Symbol.iterator in e);
}
function na(e) {
	if (/*#__PURE__*/ ia.isValidElement(e) || !ta(e)) return e;
	let t = {};
	return Object.keys(e).forEach((n) => {
		t[n] = na(e[n]);
	}), t;
}
function ra(e, t, n = { clone: !0 }) {
	let r = n.clone ? B({}, e) : e;
	return ta(e) && ta(t) && Object.keys(t).forEach((i) => {
		/*#__PURE__*/ ia.isValidElement(t[i]) ? r[i] = t[i] : ta(t[i]) && Object.prototype.hasOwnProperty.call(e, i) && ta(e[i]) ? r[i] = ra(e[i], t[i], n) : n.clone ? r[i] = ta(t[i]) ? na(t[i]) : t[i] : r[i] = t[i];
	}), r;
}
var ia, aa = w((() => {
	V(), ia = /* @__PURE__ */ O(ea());
})), oa = /* @__PURE__ */ E({
	default: () => ra,
	isPlainObject: () => ta
}), sa = w((() => {
	aa(), aa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/formatMuiErrorMessage/formatMuiErrorMessage.js
function ca(e) {
	let t = "https://mui.com/production-error/?code=" + e;
	for (let e = 1; e < arguments.length; e += 1) t += "&args[]=" + encodeURIComponent(arguments[e]);
	return "Minified MUI error #" + e + "; visit " + t + " for the full message.";
}
var la = w((() => {})), ua = /* @__PURE__ */ E({ default: () => ca }), da = w((() => {
	la();
})), fa = /* @__PURE__ */ T(((e) => {
	var t = Symbol.for("react.forward_ref"), n = Symbol.for("react.memo");
	e.ForwardRef = t, e.Memo = n;
})), pa = /* @__PURE__ */ T(((e, t) => {
	t.exports = fa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/getDisplayName/getDisplayName.js
function ma(e) {
	let t = `${e}`.match(ya);
	return t && t[1] || "";
}
function ha(e, t = "") {
	return e.displayName || e.name || ma(e) || t;
}
function ga(e, t, n) {
	let r = ha(t);
	return e.displayName || (r === "" ? n : `${n}(${r})`);
}
function _a(e) {
	if (e != null) {
		if (typeof e == "string") return e;
		if (typeof e == "function") return ha(e, "Component");
		if (typeof e == "object") switch (e.$$typeof) {
			case va.ForwardRef: return ga(e, e.render, "ForwardRef");
			case va.Memo: return ga(e, e.type, "memo");
			default: return;
		}
	}
}
var va, ya, ba = w((() => {
	va = pa(), ya = /^\s*function(?:\s|\s*\/\*.*\*\/\s*)+([^(\s/]*)\s*/;
})), xa = /* @__PURE__ */ E({
	default: () => _a,
	getFunctionName: () => ma
}), Sa = w((() => {
	ba(), ba();
}));
//#endregion
//#region node_modules/@mui/utils/esm/capitalize/capitalize.js
function Ca(e) {
	if (typeof e != "string") throw Error(ca(7));
	return e.charAt(0).toUpperCase() + e.slice(1);
}
var wa = w((() => {
	da();
})), Ta = /* @__PURE__ */ E({ default: () => Ca }), Ea = w((() => {
	wa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/createChainedFunction/createChainedFunction.js
function Da(...e) {
	return e.reduce((e, t) => t == null ? e : function(...n) {
		e.apply(this, n), t.apply(this, n);
	}, () => {});
}
var Oa = w((() => {})), ka = w((() => {
	Oa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/debounce/debounce.js
function Aa(e, t = 166) {
	let n;
	function r(...r) {
		clearTimeout(n), n = setTimeout(() => {
			e.apply(this, r);
		}, t);
	}
	return r.clear = () => {
		clearTimeout(n);
	}, r;
}
var ja = w((() => {})), Ma = w((() => {
	ja(), ja();
}));
//#endregion
//#region node_modules/@mui/utils/esm/deprecatedPropType/deprecatedPropType.js
function Na(e, t) {
	return () => null;
}
var Pa = w((() => {})), Fa = w((() => {
	Pa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/isMuiElement/isMuiElement.js
function Ia(e, t) {
	var n, r;
	return /*#__PURE__*/ La.isValidElement(e) && t.indexOf((n = e.type.muiName) == null ? (r = e.type) == null || (r = r._payload) == null || (r = r.value) == null ? void 0 : r.muiName : n) !== -1;
}
var La, Ra = w((() => {
	La = /* @__PURE__ */ O(ea());
})), za = w((() => {
	Ra();
}));
//#endregion
//#region node_modules/@mui/utils/esm/ownerDocument/ownerDocument.js
function Ba(e) {
	return e && e.ownerDocument || document;
}
var Va = w((() => {})), Ha = w((() => {
	Va();
}));
//#endregion
//#region node_modules/@mui/utils/esm/ownerWindow/ownerWindow.js
function Ua(e) {
	return Ba(e).defaultView || window;
}
var Wa = w((() => {
	Ha();
})), Ga = w((() => {
	Wa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/requirePropFactory/requirePropFactory.js
function Ka(e, t) {
	return () => null;
}
var qa = w((() => {})), Ja = w((() => {
	qa();
}));
//#endregion
//#region node_modules/@mui/utils/esm/setRef/setRef.js
function Ya(e, t) {
	typeof e == "function" ? e(t) : e && (e.current = t);
}
var Xa = w((() => {})), Za = w((() => {
	Xa();
})), Qa, $a, eo = w((() => {
	Qa = /* @__PURE__ */ O(ea()), $a = typeof window < "u" ? Qa.useLayoutEffect : Qa.useEffect;
})), to = w((() => {
	eo();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useId/useId.js
function no(e) {
	let [t, n] = io.useState(e), r = e || t;
	return io.useEffect(() => {
		t == null && (ao += 1, n(`mui-${ao}`));
	}, [t]), r;
}
function ro(e) {
	if (oo !== void 0) {
		let t = oo();
		return e == null ? t : e;
	}
	return no(e);
}
var io, ao, oo, so = w((() => {
	io = /* @__PURE__ */ O(ea()), ao = 0, oo = io.useId;
})), co = w((() => {
	so();
}));
//#endregion
//#region node_modules/@mui/utils/esm/unsupportedProp/unsupportedProp.js
function lo(e, t, n, r, i) {
	return null;
}
var uo = w((() => {})), fo = w((() => {
	uo();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useControlled/useControlled.js
function po({ controlled: e, default: t, name: n, state: r = "value" }) {
	let { current: i } = mo.useRef(e !== void 0), [a, o] = mo.useState(t);
	return [i ? e : a, mo.useCallback((e) => {
		i || o(e);
	}, [])];
}
var mo, ho = w((() => {
	mo = /* @__PURE__ */ O(ea());
})), go = w((() => {
	ho();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useEventCallback/useEventCallback.js
function _o(e) {
	let t = vo.useRef(e);
	return $a(() => {
		t.current = e;
	}), vo.useRef((...e) => (0, t.current)(...e)).current;
}
var vo, yo = w((() => {
	vo = /* @__PURE__ */ O(ea()), to();
})), bo = w((() => {
	yo();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useForkRef/useForkRef.js
function xo(...e) {
	return So.useMemo(() => e.every((e) => e == null) ? null : (t) => {
		e.forEach((e) => {
			Ya(e, t);
		});
	}, e);
}
var So, Co = w((() => {
	So = /* @__PURE__ */ O(ea()), Za();
})), wo = w((() => {
	Co();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useLazyRef/useLazyRef.js
function To(e, t) {
	let n = Eo.useRef(Do);
	return n.current === Do && (n.current = e(t)), n;
}
var Eo, Do, Oo = w((() => {
	Eo = /* @__PURE__ */ O(ea()), Do = {};
}));
//#endregion
//#region node_modules/@mui/utils/esm/useOnMount/useOnMount.js
function ko(e) {
	Ao.useEffect(e, jo);
}
var Ao, jo, Mo = w((() => {
	Ao = /* @__PURE__ */ O(ea()), jo = [];
}));
//#endregion
//#region node_modules/@mui/utils/esm/useTimeout/useTimeout.js
function No() {
	let e = To(Po.create).current;
	return ko(e.disposeEffect), e;
}
var Po, Fo = w((() => {
	Oo(), Mo(), Po = class e {
		constructor() {
			this.currentId = null, this.clear = () => {
				this.currentId !== null && (clearTimeout(this.currentId), this.currentId = null);
			}, this.disposeEffect = () => this.clear;
		}
		static create() {
			return new e();
		}
		start(e, t) {
			this.clear(), this.currentId = setTimeout(() => {
				this.currentId = null, t();
			}, e);
		}
	};
})), Io = w((() => {
	Fo();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useIsFocusVisible/useIsFocusVisible.js
function Lo(e) {
	let { type: t, tagName: n } = e;
	return !!(n === "INPUT" && Jo[t] && !e.readOnly || n === "TEXTAREA" && !e.readOnly || e.isContentEditable);
}
function Ro(e) {
	e.metaKey || e.altKey || e.ctrlKey || (Go = !0);
}
function zo() {
	Go = !1;
}
function Bo() {
	this.visibilityState === "hidden" && Ko && (Go = !0);
}
function Vo(e) {
	e.addEventListener("keydown", Ro, !0), e.addEventListener("mousedown", zo, !0), e.addEventListener("pointerdown", zo, !0), e.addEventListener("touchstart", zo, !0), e.addEventListener("visibilitychange", Bo, !0);
}
function Ho(e) {
	let { target: t } = e;
	try {
		return t.matches(":focus-visible");
	} catch {}
	return Go || Lo(t);
}
function Uo() {
	let e = Wo.useCallback((e) => {
		e != null && Vo(e.ownerDocument);
	}, []), t = Wo.useRef(!1);
	function n() {
		return t.current ? (Ko = !0, qo.start(100, () => {
			Ko = !1;
		}), t.current = !1, !0) : !1;
	}
	function r(e) {
		return Ho(e) ? (t.current = !0, !0) : !1;
	}
	return {
		isFocusVisibleRef: t,
		onFocus: r,
		onBlur: n,
		ref: e
	};
}
var Wo, Go, Ko, qo, Jo, Yo = w((() => {
	Wo = /* @__PURE__ */ O(ea()), Fo(), Go = !0, Ko = !1, qo = new Po(), Jo = {
		text: !0,
		search: !0,
		url: !0,
		tel: !0,
		email: !0,
		password: !0,
		number: !0,
		date: !0,
		month: !0,
		week: !0,
		time: !0,
		datetime: !0,
		"datetime-local": !0
	};
})), Xo = w((() => {
	Yo(), Yo();
}));
//#endregion
//#region node_modules/@mui/utils/esm/getScrollbarSize/getScrollbarSize.js
function Zo(e) {
	let t = e.documentElement.clientWidth;
	return Math.abs(window.innerWidth - t);
}
var Qo = w((() => {})), $o = w((() => {
	Qo();
})), es, ts = w((() => {
	es = {
		border: 0,
		clip: "rect(0 0 0 0)",
		height: "1px",
		margin: "-1px",
		overflow: "hidden",
		padding: 0,
		position: "absolute",
		whiteSpace: "nowrap",
		width: "1px"
	};
})), ns = w((() => {
	ts();
}));
//#endregion
//#region node_modules/@mui/utils/esm/resolveProps/resolveProps.js
function rs(e, t) {
	let n = B({}, t);
	return Object.keys(e).forEach((r) => {
		if (r.toString().match(/^(components|slots)$/)) n[r] = B({}, e[r], n[r]);
		else if (r.toString().match(/^(componentsProps|slotProps)$/)) {
			let i = e[r] || {}, a = t[r];
			n[r] = {}, !a || !Object.keys(a) ? n[r] = i : !i || !Object.keys(i) ? n[r] = a : (n[r] = B({}, a), Object.keys(i).forEach((e) => {
				n[r][e] = rs(i[e], a[e]);
			}));
		} else n[r] === void 0 && (n[r] = e[r]);
	}), n;
}
var is = w((() => {
	V();
})), as = w((() => {
	is();
}));
//#endregion
//#region node_modules/@mui/utils/esm/composeClasses/composeClasses.js
function os(e, t, n = void 0) {
	let r = {};
	return Object.keys(e).forEach((i) => {
		r[i] = e[i].reduce((e, r) => {
			if (r) {
				let i = t(r);
				i !== "" && e.push(i), n && n[r] && e.push(n[r]);
			}
			return e;
		}, []).join(" ");
	}), r;
}
var ss = w((() => {})), cs = w((() => {
	ss();
})), ls, us, ds, fs = w((() => {
	ls = (e) => e, us = () => {
		let e = ls;
		return {
			configure(t) {
				e = t;
			},
			generate(t) {
				return e(t);
			},
			reset() {
				e = ls;
			}
		};
	}, ds = us();
})), ps = w((() => {
	fs();
}));
//#endregion
//#region node_modules/@mui/utils/esm/generateUtilityClass/generateUtilityClass.js
function ms(e, t, n = "Mui") {
	let r = hs[t];
	return r ? `${n}-${r}` : `${ds.generate(e)}-${t}`;
}
var hs, gs = w((() => {
	ps(), hs = {
		active: "active",
		checked: "checked",
		completed: "completed",
		disabled: "disabled",
		error: "error",
		expanded: "expanded",
		focused: "focused",
		focusVisible: "focusVisible",
		open: "open",
		readOnly: "readOnly",
		required: "required",
		selected: "selected"
	};
})), _s = w((() => {
	gs(), gs();
}));
//#endregion
//#region node_modules/@mui/utils/esm/generateUtilityClasses/generateUtilityClasses.js
function vs(e, t, n = "Mui") {
	let r = {};
	return t.forEach((t) => {
		r[t] = ms(e, t, n);
	}), r;
}
var ys = w((() => {
	_s();
})), bs = w((() => {
	ys();
}));
//#endregion
//#region node_modules/@mui/utils/esm/clamp/clamp.js
function xs(e, t = -(2 ** 53 - 1), n = 2 ** 53 - 1) {
	return Math.max(t, Math.min(e, n));
}
var Ss = w((() => {})), Cs = /* @__PURE__ */ E({ default: () => xs }), ws = w((() => {
	Ss();
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function H(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var U = w((() => {}));
//#endregion
//#region node_modules/@mui/utils/esm/isHostComponent/isHostComponent.js
function Ts(e) {
	return typeof e == "string";
}
var Es = w((() => {})), Ds = w((() => {
	Es();
}));
//#endregion
//#region node_modules/@mui/utils/esm/appendOwnerState/appendOwnerState.js
function Os(e, t, n) {
	return e === void 0 || Ts(e) ? t : B({}, t, { ownerState: B({}, t.ownerState, n) });
}
var ks = w((() => {
	V(), Ds();
})), As = w((() => {
	ks();
}));
//#endregion
//#region node_modules/clsx/dist/clsx.mjs
function js(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = js(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function W() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = js(e)) && (r && (r += " "), r += t);
	return r;
}
var Ms = w((() => {}));
//#endregion
//#region node_modules/@mui/utils/esm/extractEventHandlers/extractEventHandlers.js
function Ns(e, t = []) {
	if (e === void 0) return {};
	let n = {};
	return Object.keys(e).filter((n) => n.match(/^on[A-Z]/) && typeof e[n] == "function" && !t.includes(n)).forEach((t) => {
		n[t] = e[t];
	}), n;
}
var Ps = w((() => {})), Fs = w((() => {
	Ps();
}));
//#endregion
//#region node_modules/@mui/utils/esm/omitEventHandlers/omitEventHandlers.js
function Is(e) {
	if (e === void 0) return {};
	let t = {};
	return Object.keys(e).filter((t) => !(t.match(/^on[A-Z]/) && typeof e[t] == "function")).forEach((n) => {
		t[n] = e[n];
	}), t;
}
var Ls = w((() => {})), Rs = w((() => {
	Ls();
}));
//#endregion
//#region node_modules/@mui/utils/esm/mergeSlotProps/mergeSlotProps.js
function zs(e) {
	let { getSlotProps: t, additionalProps: n, externalSlotProps: r, externalForwardedProps: i, className: a } = e;
	if (!t) {
		let e = W(n == null ? void 0 : n.className, a, i == null ? void 0 : i.className, r == null ? void 0 : r.className), t = B({}, n == null ? void 0 : n.style, i == null ? void 0 : i.style, r == null ? void 0 : r.style), o = B({}, n, i, r);
		return e.length > 0 && (o.className = e), Object.keys(t).length > 0 && (o.style = t), {
			props: o,
			internalRef: void 0
		};
	}
	let o = Ns(B({}, i, r)), s = Is(r), c = Is(i), l = t(o), u = W(l == null ? void 0 : l.className, n == null ? void 0 : n.className, a, i == null ? void 0 : i.className, r == null ? void 0 : r.className), d = B({}, l == null ? void 0 : l.style, n == null ? void 0 : n.style, i == null ? void 0 : i.style, r == null ? void 0 : r.style), f = B({}, l, n, c, s);
	return u.length > 0 && (f.className = u), Object.keys(d).length > 0 && (f.style = d), {
		props: f,
		internalRef: l.ref
	};
}
var Bs = w((() => {
	V(), Ms(), Fs(), Rs();
})), Vs = w((() => {
	Bs();
}));
//#endregion
//#region node_modules/@mui/utils/esm/resolveComponentProps/resolveComponentProps.js
function Hs(e, t, n) {
	return typeof e == "function" ? e(t, n) : e;
}
var Us = w((() => {})), Ws = w((() => {
	Us();
}));
//#endregion
//#region node_modules/@mui/utils/esm/useSlotProps/useSlotProps.js
function Gs(e) {
	var t;
	let { elementType: n, externalSlotProps: r, ownerState: i, skipResolvingSlotProps: a = !1 } = e, o = H(e, Ks), s = a ? {} : Hs(r, i), { props: c, internalRef: l } = zs(B({}, o, { externalSlotProps: s })), u = xo(l, s == null ? void 0 : s.ref, (t = e.additionalProps) == null ? void 0 : t.ref);
	return Os(n, B({}, c, { ref: u }), i);
}
var Ks, qs = w((() => {
	V(), U(), wo(), As(), Vs(), Ws(), Ks = [
		"elementType",
		"externalSlotProps",
		"ownerState",
		"skipResolvingSlotProps"
	];
})), Js = w((() => {
	qs();
}));
//#endregion
//#region node_modules/@mui/utils/esm/getReactElementRef/getReactElementRef.js
function Ys(e) {
	return (e == null ? void 0 : e.ref) || null;
}
var Xs = w((() => {
	ea();
})), Zs = w((() => {
	Xs();
})), Qs = w((() => {})), $s = w((() => {
	sa(), da(), Sa(), Ea(), ka(), Ma(), Fa(), za(), Ha(), Ga(), Ja(), Za(), to(), co(), fo(), go(), bo(), wo(), Oo(), Io(), Mo(), Xo(), $o(), ns(), as(), cs(), _s(), _s(), bs(), ps(), ws(), Js(), Ws(), Fs(), Zs(), Qs();
})), G, ec = w((() => {
	Ea(), G = Ca;
})), tc, nc = w((() => {
	ka(), tc = Da;
})), rc = /* @__PURE__ */ T(((e) => {
	var t = ea(), n = Symbol.for("react.element"), r = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, o = {
		key: !0,
		ref: !0,
		__self: !0,
		__source: !0
	};
	function s(e, t, r) {
		var s, c = {}, l = null, u = null;
		for (s in r !== void 0 && (l = "" + r), t.key !== void 0 && (l = "" + t.key), t.ref !== void 0 && (u = t.ref), t) i.call(t, s) && !o.hasOwnProperty(s) && (c[s] = t[s]);
		if (e && e.defaultProps) for (s in t = e.defaultProps, t) c[s] === void 0 && (c[s] = t[s]);
		return {
			$$typeof: n,
			type: e,
			key: l,
			ref: u,
			props: c,
			_owner: a.current
		};
	}
	e.Fragment = r, e.jsx = s, e.jsxs = s;
})), ic = /* @__PURE__ */ T(((e, t) => {
	t.exports = rc();
}));
//#endregion
//#region node_modules/@mui/system/esm/DefaultPropsProvider/DefaultPropsProvider.js
function ac({ value: e, children: t }) {
	return /*#__PURE__*/ (0, lc.jsx)(uc.Provider, {
		value: e,
		children: t
	});
}
function oc(e) {
	let { theme: t, name: n, props: r } = e;
	if (!t || !t.components || !t.components[n]) return r;
	let i = t.components[n];
	return i.defaultProps ? rs(i.defaultProps, r) : !i.styleOverrides && !i.variants ? rs(i, r) : r;
}
function sc({ props: e, name: t }) {
	return oc({
		props: e,
		name: t,
		theme: { components: cc.useContext(uc) }
	});
}
var cc, lc, uc, dc = w((() => {
	cc = /* @__PURE__ */ O(ea()), as(), lc = ic(), uc = /*#__PURE__*/ cc.createContext(void 0);
})), fc = w((() => {
	dc();
}));
//#endregion
//#region node_modules/@mui/material/DefaultPropsProvider/DefaultPropsProvider.js
function pc(e) {
	return sc(e);
}
var mc = w((() => {
	ea(), fc(), ic();
})), K = w((() => {
	mc();
})), hc = /* @__PURE__ */ T(((e, t) => {
	function n() {
		return t.exports = n = Object.assign ? Object.assign.bind() : function(e) {
			for (var t = 1; t < arguments.length; t++) {
				var n = arguments[t];
				for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
			}
			return e;
		}, t.exports.__esModule = !0, t.exports.default = t.exports, n.apply(null, arguments);
	}
	t.exports = n, t.exports.__esModule = !0, t.exports.default = t.exports;
})), q = /* @__PURE__ */ T(((e, t) => {
	function n(e, t) {
		if (e == null) return {};
		var n = {};
		for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
			if (t.indexOf(r) !== -1) continue;
			n[r] = e[r];
		}
		return n;
	}
	t.exports = n, t.exports.__esModule = !0, t.exports.default = t.exports;
}));
//#endregion
//#region node_modules/@emotion/sheet/dist/emotion-sheet.esm.js
function gc(e) {
	if (e.sheet) return e.sheet;
	/* istanbul ignore next */
	for (var t = 0; t < document.styleSheets.length; t++) if (document.styleSheets[t].ownerNode === e) return document.styleSheets[t];
}
function _c(e) {
	var t = document.createElement("style");
	return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var vc, yc = w((() => {
	vc = /*#__PURE__*/ function() {
		function e(e) {
			var t = this;
			this._insertTag = function(e) {
				var n = t.tags.length === 0 ? t.insertionPoint ? t.insertionPoint.nextSibling : t.prepend ? t.container.firstChild : t.before : t.tags[t.tags.length - 1].nextSibling;
				t.container.insertBefore(e, n), t.tags.push(e);
			}, this.isSpeedy = e.speedy === void 0 || e.speedy, this.tags = [], this.ctr = 0, this.nonce = e.nonce, this.key = e.key, this.container = e.container, this.prepend = e.prepend, this.insertionPoint = e.insertionPoint, this.before = null;
		}
		var t = e.prototype;
		return t.hydrate = function(e) {
			e.forEach(this._insertTag);
		}, t.insert = function(e) {
			this.ctr % (this.isSpeedy ? 65e3 : 1) == 0 && this._insertTag(_c(this));
			var t = this.tags[this.tags.length - 1];
			if (this.isSpeedy) {
				var n = gc(t);
				try {
					n.insertRule(e, n.cssRules.length);
				} catch {}
			} else t.appendChild(document.createTextNode(e));
			this.ctr++;
		}, t.flush = function() {
			this.tags.forEach(function(e) {
				var t;
				return (t = e.parentNode) == null ? void 0 : t.removeChild(e);
			}), this.tags = [], this.ctr = 0;
		}, e;
	}();
})), bc, xc, Sc, Cc, wc, Tc, Ec, Dc, Oc, kc = w((() => {
	bc = "-ms-", xc = "-moz-", Sc = "-webkit-", Cc = "comm", wc = "rule", Tc = "decl", Ec = "@import", Dc = "@keyframes", Oc = "@layer";
}));
//#endregion
//#region node_modules/stylis/src/Utility.js
function Ac(e, t) {
	return Pc(e, 0) ^ 45 ? (((t << 2 ^ Pc(e, 0)) << 2 ^ Pc(e, 1)) << 2 ^ Pc(e, 2)) << 2 ^ Pc(e, 3) : 0;
}
function jc(e) {
	return e.trim();
}
function Mc(e, t) {
	return (e = t.exec(e)) ? e[0] : e;
}
function J(e, t, n) {
	return e.replace(t, n);
}
function Nc(e, t) {
	return e.indexOf(t);
}
function Pc(e, t) {
	return e.charCodeAt(t) | 0;
}
function Fc(e, t, n) {
	return e.slice(t, n);
}
function Ic(e) {
	return e.length;
}
function Lc(e) {
	return e.length;
}
function Rc(e, t) {
	return t.push(e), e;
}
function zc(e, t) {
	return e.map(t).join("");
}
var Bc, Vc, Hc, Uc = w((() => {
	Bc = Math.abs, Vc = String.fromCharCode, Hc = Object.assign;
}));
//#endregion
//#region node_modules/stylis/src/Tokenizer.js
function Wc(e, t, n, r, i, a, o) {
	return {
		value: e,
		root: t,
		parent: n,
		type: r,
		props: i,
		children: a,
		line: sl,
		column: cl,
		length: o,
		return: ""
	};
}
function Gc(e, t) {
	return Hc(Wc("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function Kc() {
	return dl;
}
function qc() {
	return dl = ul > 0 ? Pc(fl, --ul) : 0, cl--, dl === 10 && (cl = 1, sl--), dl;
}
function Jc() {
	return dl = ul < ll ? Pc(fl, ul++) : 0, cl++, dl === 10 && (cl = 1, sl++), dl;
}
function Yc() {
	return Pc(fl, ul);
}
function Xc() {
	return ul;
}
function Zc(e, t) {
	return Fc(fl, e, t);
}
function Qc(e) {
	switch (e) {
		case 0:
		case 9:
		case 10:
		case 13:
		case 32: return 5;
		case 33:
		case 43:
		case 44:
		case 47:
		case 62:
		case 64:
		case 126:
		case 59:
		case 123:
		case 125: return 4;
		case 58: return 3;
		case 34:
		case 39:
		case 40:
		case 91: return 2;
		case 41:
		case 93: return 1;
	}
	return 0;
}
function $c(e) {
	return sl = cl = 1, ll = Ic(fl = e), ul = 0, [];
}
function el(e) {
	return fl = "", e;
}
function tl(e) {
	return jc(Zc(ul - 1, il(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function nl(e) {
	for (; (dl = Yc()) && dl < 33;) Jc();
	return Qc(e) > 2 || Qc(dl) > 3 ? "" : " ";
}
function rl(e, t) {
	for (; --t && Jc() && !(dl < 48 || dl > 102 || dl > 57 && dl < 65 || dl > 70 && dl < 97););
	return Zc(e, Xc() + (t < 6 && Yc() == 32 && Jc() == 32));
}
function il(e) {
	for (; Jc();) switch (dl) {
		case e: return ul;
		case 34:
		case 39:
			e !== 34 && e !== 39 && il(dl);
			break;
		case 40:
			e === 41 && il(e);
			break;
		case 92: Jc();
	}
	return ul;
}
function al(e, t) {
	for (; Jc() && e + dl !== 57 && (e + dl !== 84 || Yc() !== 47););
	return "/*" + Zc(t, ul - 1) + "*" + Vc(e === 47 ? e : Jc());
}
function ol(e) {
	for (; !Qc(Yc());) Jc();
	return Zc(e, ul);
}
var sl, cl, ll, ul, dl, fl, pl = w((() => {
	Uc(), sl = 1, cl = 1, ll = 0, ul = 0, dl = 0, fl = "";
}));
//#endregion
//#region node_modules/stylis/src/Parser.js
function ml(e) {
	return el(hl("", null, null, null, [""], e = $c(e), 0, [0], e));
}
function hl(e, t, n, r, i, a, o, s, c) {
	for (var l = 0, u = 0, d = o, f = 0, p = 0, m = 0, h = 1, g = 1, _ = 1, v = 0, y = "", b = i, x = a, S = r, C = y; g;) switch (m = v, v = Jc()) {
		case 40: if (m != 108 && Pc(C, d - 1) == 58) {
			Nc(C += J(tl(v), "&", "&\f"), "&\f") != -1 && (_ = -1);
			break;
		}
		case 34:
		case 39:
		case 91:
			C += tl(v);
			break;
		case 9:
		case 10:
		case 13:
		case 32:
			C += nl(m);
			break;
		case 92:
			C += rl(Xc() - 1, 7);
			continue;
		case 47:
			switch (Yc()) {
				case 42:
				case 47:
					Rc(_l(al(Jc(), Xc()), t, n), c);
					break;
				default: C += "/";
			}
			break;
		case 123 * h: s[l++] = Ic(C) * _;
		case 125 * h:
		case 59:
		case 0:
			switch (v) {
				case 0:
				case 125: g = 0;
				case 59 + u:
					_ == -1 && (C = J(C, /\f/g, "")), p > 0 && Ic(C) - d && Rc(p > 32 ? vl(C + ";", r, n, d - 1) : vl(J(C, " ", "") + ";", r, n, d - 2), c);
					break;
				case 59: C += ";";
				default: if (Rc(S = gl(C, t, n, l, u, i, s, y, b = [], x = [], d), a), v === 123) {
					if (u === 0) hl(C, t, S, S, b, a, d, s, x);
					else switch (f === 99 && Pc(C, 3) === 110 ? 100 : f) {
						case 100:
						case 108:
						case 109:
						case 115:
							hl(e, S, S, r && Rc(gl(e, S, S, 0, 0, i, s, y, i, b = [], d), x), i, x, d, s, r ? b : x);
							break;
						default: hl(C, S, S, S, [""], x, 0, s, x);
					}
				}
			}
			l = u = p = 0, h = _ = 1, y = C = "", d = o;
			break;
		case 58: d = 1 + Ic(C), p = m;
		default:
			if (h < 1) {
				if (v == 123) --h;
				else if (v == 125 && h++ == 0 && qc() == 125) continue;
			}
			switch (C += Vc(v), v * h) {
				case 38:
					_ = u > 0 ? 1 : (C += "\f", -1);
					break;
				case 44:
					s[l++] = (Ic(C) - 1) * _, _ = 1;
					break;
				case 64:
					Yc() === 45 && (C += tl(Jc())), f = Yc(), u = d = Ic(y = C += ol(Xc())), v++;
					break;
				case 45: m === 45 && Ic(C) == 2 && (h = 0);
			}
	}
	return a;
}
function gl(e, t, n, r, i, a, o, s, c, l, u) {
	for (var d = i - 1, f = i === 0 ? a : [""], p = Lc(f), m = 0, h = 0, g = 0; m < r; ++m) for (var _ = 0, v = Fc(e, d + 1, d = Bc(h = o[m])), y = e; _ < p; ++_) (y = jc(h > 0 ? f[_] + " " + v : J(v, /&\f/g, f[_]))) && (c[g++] = y);
	return Wc(e, t, n, i === 0 ? wc : s, c, l, u);
}
function _l(e, t, n) {
	return Wc(e, t, n, Cc, Vc(Kc()), Fc(e, 2, -2), 0);
}
function vl(e, t, n, r) {
	return Wc(e, t, n, Tc, Fc(e, 0, r), Fc(e, r + 1, -1), r);
}
var yl = w((() => {
	kc(), Uc(), pl();
})), bl = w((() => {}));
//#endregion
//#region node_modules/stylis/src/Serializer.js
function xl(e, t) {
	for (var n = "", r = Lc(e), i = 0; i < r; i++) n += t(e[i], i, e, t) || "";
	return n;
}
function Sl(e, t, n, r) {
	switch (e.type) {
		case Oc: if (e.children.length) break;
		case Ec:
		case Tc: return e.return = e.return || e.value;
		case Cc: return "";
		case Dc: return e.return = e.value + "{" + xl(e.children, r) + "}";
		case wc: e.value = e.props.join(",");
	}
	return Ic(n = xl(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
var Cl = w((() => {
	kc(), Uc();
}));
//#endregion
//#region node_modules/stylis/src/Middleware.js
function wl(e) {
	var t = Lc(e);
	return function(n, r, i, a) {
		for (var o = "", s = 0; s < t; s++) o += e[s](n, r, i, a) || "";
		return o;
	};
}
function Tl(e) {
	return function(t) {
		t.root || (t = t.return) && e(t);
	};
}
var El = w((() => {
	Uc();
})), Dl = w((() => {
	kc(), Uc(), yl(), bl(), pl(), Cl(), El();
}));
//#endregion
//#region node_modules/@emotion/memoize/dist/emotion-memoize.esm.js
function Ol(e) {
	var t = Object.create(null);
	return function(n) {
		return t[n] === void 0 && (t[n] = e(n)), t[n];
	};
}
var kl = w((() => {}));
//#endregion
//#region node_modules/@emotion/cache/dist/emotion-cache.browser.esm.js
function Al(e, t) {
	switch (Ac(e, t)) {
		case 5103: return Sc + "print-" + e + e;
		case 5737:
		case 4201:
		case 3177:
		case 3433:
		case 1641:
		case 4457:
		case 2921:
		case 5572:
		case 6356:
		case 5844:
		case 3191:
		case 6645:
		case 3005:
		case 6391:
		case 5879:
		case 5623:
		case 6135:
		case 4599:
		case 4855:
		case 4215:
		case 6389:
		case 5109:
		case 5365:
		case 5621:
		case 3829: return Sc + e + e;
		case 5349:
		case 4246:
		case 4810:
		case 6968:
		case 2756: return Sc + e + xc + e + bc + e + e;
		case 6828:
		case 4268: return Sc + e + bc + e + e;
		case 6165: return Sc + e + bc + "flex-" + e + e;
		case 5187: return Sc + e + J(e, /(\w+).+(:[^]+)/, Sc + "box-$1$2" + bc + "flex-$1$2") + e;
		case 5443: return Sc + e + bc + "flex-item-" + J(e, /flex-|-self/, "") + e;
		case 4675: return Sc + e + bc + "flex-line-pack" + J(e, /align-content|flex-|-self/, "") + e;
		case 5548: return Sc + e + bc + J(e, "shrink", "negative") + e;
		case 5292: return Sc + e + bc + J(e, "basis", "preferred-size") + e;
		case 6060: return Sc + "box-" + J(e, "-grow", "") + Sc + e + bc + J(e, "grow", "positive") + e;
		case 4554: return Sc + J(e, /([^-])(transform)/g, "$1" + Sc + "$2") + e;
		case 6187: return J(J(J(e, /(zoom-|grab)/, Sc + "$1"), /(image-set)/, Sc + "$1"), e, "") + e;
		case 5495:
		case 3959: return J(e, /(image-set\([^]*)/, Sc + "$1$`$1");
		case 4968: return J(J(e, /(.+:)(flex-)?(.*)/, Sc + "box-pack:$3" + bc + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + Sc + e + e;
		case 4095:
		case 3583:
		case 4068:
		case 2532: return J(e, /(.+)-inline(.+)/, Sc + "$1$2") + e;
		case 8116:
		case 7059:
		case 5753:
		case 5535:
		case 5445:
		case 5701:
		case 4933:
		case 4677:
		case 5533:
		case 5789:
		case 5021:
		case 4765:
			if (Ic(e) - 1 - t > 6) switch (Pc(e, t + 1)) {
				case 109: if (Pc(e, t + 4) !== 45) break;
				case 102: return J(e, /(.+:)(.+)-([^]+)/, "$1" + Sc + "$2-$3$1" + xc + (Pc(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
				case 115: return ~Nc(e, "stretch") ? Al(J(e, "stretch", "fill-available"), t) + e : e;
			}
			break;
		case 4949: if (Pc(e, t + 1) !== 115) break;
		case 6444:
			switch (Pc(e, Ic(e) - 3 - (~Nc(e, "!important") && 10))) {
				case 107: return J(e, ":", ":" + Sc) + e;
				case 101: return J(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + Sc + (Pc(e, 14) === 45 ? "inline-" : "") + "box$3$1" + Sc + "$2$3$1" + bc + "$2box$3") + e;
			}
			break;
		case 5936:
			switch (Pc(e, t + 11)) {
				case 114: return Sc + e + bc + J(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
				case 108: return Sc + e + bc + J(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
				case 45: return Sc + e + bc + J(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
			}
			return Sc + e + bc + e + e;
	}
	return e;
}
var jl, Ml, Nl, Pl, Fl, Il, Ll, Rl, zl = w((() => {
	yc(), Dl(), jl = function(e, t, n) {
		for (var r = 0, i = 0; r = i, i = Yc(), r === 38 && i === 12 && (t[n] = 1), !Qc(i);) Jc();
		return Zc(e, ul);
	}, Ml = function(e, t) {
		var n = -1, r = 44;
		do
			switch (Qc(r)) {
				case 0:
					r === 38 && Yc() === 12 && (t[n] = 1), e[n] += jl(ul - 1, t, n);
					break;
				case 2:
					e[n] += tl(r);
					break;
				case 4: if (r === 44) {
					e[++n] = Yc() === 58 ? "&\f" : "", t[n] = e[n].length;
					break;
				}
				default: e[n] += Vc(r);
			}
		while (r = Jc());
		return e;
	}, Nl = function(e, t) {
		return el(Ml($c(e), t));
	}, Pl = /* #__PURE__ */ new WeakMap(), Fl = function(e) {
		if (!(e.type !== "rule" || !e.parent || e.length < 1)) {
			for (var t = e.value, n = e.parent, r = e.column === n.column && e.line === n.line; n.type !== "rule";) if (n = n.parent, !n) return;
			if ((e.props.length !== 1 || t.charCodeAt(0) === 58 || Pl.get(n)) && !r) {
				Pl.set(e, !0);
				for (var i = [], a = Nl(t, i), o = n.props, s = 0, c = 0; s < a.length; s++) for (var l = 0; l < o.length; l++, c++) e.props[c] = i[s] ? a[s].replace(/&\f/g, o[l]) : o[l] + " " + a[s];
			}
		}
	}, Il = function(e) {
		if (e.type === "decl") {
			var t = e.value;
			t.charCodeAt(0) === 108 && t.charCodeAt(2) === 98 && (e.return = "", e.value = "");
		}
	}, Ll = [function(e, t, n, r) {
		if (e.length > -1 && !e.return) switch (e.type) {
			case Tc:
				e.return = Al(e.value, e.length);
				break;
			case Dc: return xl([Gc(e, { value: J(e.value, "@", "@" + Sc) })], r);
			case wc: if (e.length) return zc(e.props, function(t) {
				switch (Mc(t, /(::plac\w+|:read-\w+)/)) {
					case ":read-only":
					case ":read-write": return xl([Gc(e, { props: [J(t, /:(read-\w+)/, ":" + xc + "$1")] })], r);
					case "::placeholder": return xl([
						Gc(e, { props: [J(t, /:(plac\w+)/, ":" + Sc + "input-$1")] }),
						Gc(e, { props: [J(t, /:(plac\w+)/, ":" + xc + "$1")] }),
						Gc(e, { props: [J(t, /:(plac\w+)/, bc + "input-$1")] })
					], r);
				}
				return "";
			});
		}
	}], Rl = function(e) {
		var t = e.key;
		if (t === "css") {
			var n = document.querySelectorAll("style[data-emotion]:not([data-s])");
			Array.prototype.forEach.call(n, function(e) {
				e.getAttribute("data-emotion").indexOf(" ") !== -1 && (document.head.appendChild(e), e.setAttribute("data-s", ""));
			});
		}
		var r = e.stylisPlugins || Ll, i = {}, a, o = [];
		a = e.container || document.head, Array.prototype.forEach.call(document.querySelectorAll("style[data-emotion^=\"" + t + " \"]"), function(e) {
			for (var t = e.getAttribute("data-emotion").split(" "), n = 1; n < t.length; n++) i[t[n]] = !0;
			o.push(e);
		});
		var s, c = [Fl, Il], l, u = [Sl, Tl(function(e) {
			l.insert(e);
		})], d = wl(c.concat(r, u)), f = function(e) {
			return xl(ml(e), d);
		};
		s = function(e, t, n, r) {
			l = n, f(e ? e + "{" + t.styles + "}" : t.styles), r && (p.inserted[t.name] = !0);
		};
		var p = {
			key: t,
			sheet: new vc({
				key: t,
				container: a,
				nonce: e.nonce,
				speedy: e.speedy,
				prepend: e.prepend,
				insertionPoint: e.insertionPoint
			}),
			nonce: e.nonce,
			inserted: i,
			registered: {},
			insert: s
		};
		return p.sheet.hydrate(o), p;
	};
})), Bl = /* @__PURE__ */ T(((e) => {
	var t = typeof Symbol == "function" && Symbol.for, n = t ? Symbol.for("react.element") : 60103, r = t ? Symbol.for("react.portal") : 60106, i = t ? Symbol.for("react.fragment") : 60107, a = t ? Symbol.for("react.strict_mode") : 60108, o = t ? Symbol.for("react.profiler") : 60114, s = t ? Symbol.for("react.provider") : 60109, c = t ? Symbol.for("react.context") : 60110, l = t ? Symbol.for("react.async_mode") : 60111, u = t ? Symbol.for("react.concurrent_mode") : 60111, d = t ? Symbol.for("react.forward_ref") : 60112, f = t ? Symbol.for("react.suspense") : 60113, p = t ? Symbol.for("react.suspense_list") : 60120, m = t ? Symbol.for("react.memo") : 60115, h = t ? Symbol.for("react.lazy") : 60116, g = t ? Symbol.for("react.block") : 60121, _ = t ? Symbol.for("react.fundamental") : 60117, v = t ? Symbol.for("react.responder") : 60118, y = t ? Symbol.for("react.scope") : 60119;
	function b(e) {
		if (typeof e == "object" && e) {
			var t = e.$$typeof;
			switch (t) {
				case n: switch (e = e.type, e) {
					case l:
					case u:
					case i:
					case o:
					case a:
					case f: return e;
					default: switch (e = e && e.$$typeof, e) {
						case c:
						case d:
						case h:
						case m:
						case s: return e;
						default: return t;
					}
				}
				case r: return t;
			}
		}
	}
	function x(e) {
		return b(e) === u;
	}
	e.AsyncMode = l, e.ConcurrentMode = u, e.ContextConsumer = c, e.ContextProvider = s, e.Element = n, e.ForwardRef = d, e.Fragment = i, e.Lazy = h, e.Memo = m, e.Portal = r, e.Profiler = o, e.StrictMode = a, e.Suspense = f, e.isAsyncMode = function(e) {
		return x(e) || b(e) === l;
	}, e.isConcurrentMode = x, e.isContextConsumer = function(e) {
		return b(e) === c;
	}, e.isContextProvider = function(e) {
		return b(e) === s;
	}, e.isElement = function(e) {
		return typeof e == "object" && !!e && e.$$typeof === n;
	}, e.isForwardRef = function(e) {
		return b(e) === d;
	}, e.isFragment = function(e) {
		return b(e) === i;
	}, e.isLazy = function(e) {
		return b(e) === h;
	}, e.isMemo = function(e) {
		return b(e) === m;
	}, e.isPortal = function(e) {
		return b(e) === r;
	}, e.isProfiler = function(e) {
		return b(e) === o;
	}, e.isStrictMode = function(e) {
		return b(e) === a;
	}, e.isSuspense = function(e) {
		return b(e) === f;
	}, e.isValidElementType = function(e) {
		return typeof e == "string" || typeof e == "function" || e === i || e === u || e === o || e === a || e === f || e === p || typeof e == "object" && !!e && (e.$$typeof === h || e.$$typeof === m || e.$$typeof === s || e.$$typeof === c || e.$$typeof === d || e.$$typeof === _ || e.$$typeof === v || e.$$typeof === y || e.$$typeof === g);
	}, e.typeOf = b;
})), Vl = /* @__PURE__ */ T(((e, t) => {
	t.exports = Bl();
})), Hl = /* @__PURE__ */ T(((e, t) => {
	var n = Vl(), r = {
		childContextTypes: !0,
		contextType: !0,
		contextTypes: !0,
		defaultProps: !0,
		displayName: !0,
		getDefaultProps: !0,
		getDerivedStateFromError: !0,
		getDerivedStateFromProps: !0,
		mixins: !0,
		propTypes: !0,
		type: !0
	}, i = {
		name: !0,
		length: !0,
		prototype: !0,
		caller: !0,
		callee: !0,
		arguments: !0,
		arity: !0
	}, a = {
		$$typeof: !0,
		render: !0,
		defaultProps: !0,
		displayName: !0,
		propTypes: !0
	}, o = {
		$$typeof: !0,
		compare: !0,
		defaultProps: !0,
		displayName: !0,
		propTypes: !0,
		type: !0
	}, s = {};
	s[n.ForwardRef] = a, s[n.Memo] = o;
	function c(e) {
		return n.isMemo(e) ? o : s[e.$$typeof] || r;
	}
	var l = Object.defineProperty, u = Object.getOwnPropertyNames, d = Object.getOwnPropertySymbols, f = Object.getOwnPropertyDescriptor, p = Object.getPrototypeOf, m = Object.prototype;
	function h(e, t, n) {
		if (typeof t != "string") {
			if (m) {
				var r = p(t);
				r && r !== m && h(e, r, n);
			}
			var a = u(t);
			d && (a = a.concat(d(t)));
			for (var o = c(e), s = c(t), g = 0; g < a.length; ++g) {
				var _ = a[g];
				if (!i[_] && !(n && n[_]) && !(s && s[_]) && !(o && o[_])) {
					var v = f(t, _);
					try {
						l(e, _, v);
					} catch {}
				}
			}
		}
		return e;
	}
	t.exports = h;
}));
//#endregion
//#region node_modules/@emotion/utils/dist/emotion-utils.browser.esm.js
function Ul(e, t, n) {
	var r = "";
	return n.split(" ").forEach(function(n) {
		e[n] === void 0 ? n && (r += n + " ") : t.push(e[n] + ";");
	}), r;
}
var Wl, Gl, Kl = w((() => {
	Wl = function(e, t, n) {
		var r = e.key + "-" + t.name;
		n === !1 && e.registered[r] === void 0 && (e.registered[r] = t.styles);
	}, Gl = function(e, t, n) {
		Wl(e, t, n);
		var r = e.key + "-" + t.name;
		if (e.inserted[t.name] === void 0) {
			var i = t;
			do
				e.insert(t === i ? "." + r : "", i, e.sheet, !0), i = i.next;
			while (i !== void 0);
		}
	};
}));
//#endregion
//#region node_modules/@emotion/hash/dist/emotion-hash.esm.js
function ql(e) {
	for (var t = 0, n, r = 0, i = e.length; i >= 4; ++r, i -= 4) n = e.charCodeAt(r) & 255 | (e.charCodeAt(++r) & 255) << 8 | (e.charCodeAt(++r) & 255) << 16 | (e.charCodeAt(++r) & 255) << 24, n = (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16), n ^= n >>> 24, t = (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16) ^ (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
	switch (i) {
		case 3: t ^= (e.charCodeAt(r + 2) & 255) << 16;
		case 2: t ^= (e.charCodeAt(r + 1) & 255) << 8;
		case 1: t ^= e.charCodeAt(r) & 255, t = (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
	}
	return t ^= t >>> 13, t = (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16), ((t ^ t >>> 15) >>> 0).toString(36);
}
var Jl = w((() => {})), Yl, Xl = w((() => {
	Yl = {
		animationIterationCount: 1,
		aspectRatio: 1,
		borderImageOutset: 1,
		borderImageSlice: 1,
		borderImageWidth: 1,
		boxFlex: 1,
		boxFlexGroup: 1,
		boxOrdinalGroup: 1,
		columnCount: 1,
		columns: 1,
		flex: 1,
		flexGrow: 1,
		flexPositive: 1,
		flexShrink: 1,
		flexNegative: 1,
		flexOrder: 1,
		gridRow: 1,
		gridRowEnd: 1,
		gridRowSpan: 1,
		gridRowStart: 1,
		gridColumn: 1,
		gridColumnEnd: 1,
		gridColumnSpan: 1,
		gridColumnStart: 1,
		msGridRow: 1,
		msGridRowSpan: 1,
		msGridColumn: 1,
		msGridColumnSpan: 1,
		fontWeight: 1,
		lineHeight: 1,
		opacity: 1,
		order: 1,
		orphans: 1,
		scale: 1,
		tabSize: 1,
		widows: 1,
		zIndex: 1,
		zoom: 1,
		WebkitLineClamp: 1,
		fillOpacity: 1,
		floodOpacity: 1,
		stopOpacity: 1,
		strokeDasharray: 1,
		strokeDashoffset: 1,
		strokeMiterlimit: 1,
		strokeOpacity: 1,
		strokeWidth: 1
	};
}));
//#endregion
//#region node_modules/@emotion/serialize/dist/emotion-serialize.esm.js
function Zl(e, t, n) {
	if (n == null) return "";
	var r = n;
	if (r.__emotion_styles !== void 0) return r;
	switch (typeof n) {
		case "boolean": return "";
		case "object":
			var i = n;
			if (i.anim === 1) return lu = {
				name: i.name,
				styles: i.styles,
				next: lu
			}, i.name;
			var a = n;
			if (a.styles !== void 0) {
				var o = a.next;
				if (o !== void 0) for (; o !== void 0;) lu = {
					name: o.name,
					styles: o.styles,
					next: lu
				}, o = o.next;
				return a.styles + ";";
			}
			return Ql(e, t, n);
		case "function": if (e !== void 0) {
			var s = lu, c = n(e);
			return lu = s, Zl(e, t, c);
		}
	}
	var l = n;
	if (t == null) return l;
	var u = t[l];
	return u === void 0 ? l : u;
}
function Ql(e, t, n) {
	var r = "";
	if (Array.isArray(n)) for (var i = 0; i < n.length; i++) r += Zl(e, t, n[i]) + ";";
	else for (var a in n) {
		var o = n[a];
		if (typeof o != "object") {
			var s = o;
			t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : iu(s) && (r += au(a) + ":" + ou(a, s) + ";");
		} else {
			if (a === "NO_COMPONENT_SELECTOR" && eu) throw Error(su);
			if (Array.isArray(o) && typeof o[0] == "string" && (t == null || t[o[0]] === void 0)) for (var c = 0; c < o.length; c++) iu(o[c]) && (r += au(a) + ":" + ou(a, o[c]) + ";");
			else {
				var l = Zl(e, t, o);
				switch (a) {
					case "animation":
					case "animationName":
						r += au(a) + ":" + l + ";";
						break;
					default: r += a + "{" + l + "}";
				}
			}
		}
	}
	return r;
}
function $l(e, t, n) {
	if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0) return e[0];
	var r = !0, i = "";
	lu = void 0;
	var a = e[0];
	a == null || a.raw === void 0 ? (r = !1, i += Zl(n, t, a)) : i += a[0];
	for (var o = 1; o < e.length; o++) i += Zl(n, t, e[o]), r && (i += a[o]);
	cu.lastIndex = 0;
	for (var s = "", c; (c = cu.exec(i)) !== null;) s += "-" + c[1];
	return {
		name: ql(i) + s,
		styles: i,
		next: lu
	};
}
var eu, tu, nu, ru, iu, au, ou, su, cu, lu, uu = w((() => {
	Jl(), Xl(), kl(), eu = !1, tu = /[A-Z]|^ms/g, nu = /_EMO_([^_]+?)_([^]*?)_EMO_/g, ru = function(e) {
		return e.charCodeAt(1) === 45;
	}, iu = function(e) {
		return e != null && typeof e != "boolean";
	}, au = /* #__PURE__ */ Ol(function(e) {
		return ru(e) ? e : e.replace(tu, "-$&").toLowerCase();
	}), ou = function(e, t) {
		switch (e) {
			case "animation":
			case "animationName": if (typeof t == "string") return t.replace(nu, function(e, t, n) {
				return lu = {
					name: t,
					styles: n,
					next: lu
				}, t;
			});
		}
		return Yl[e] !== 1 && !ru(e) && typeof t == "number" && t !== 0 ? t + "px" : t;
	}, su = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.", cu = /label:\s*([^\s;{]+)\s*(;|$)/g;
})), du, fu, pu, mu, hu, gu = w((() => {
	du = /* @__PURE__ */ O(ea()), fu = function(e) {
		return e();
	}, pu = du.useInsertionEffect ? du.useInsertionEffect : !1, mu = pu || fu, hu = pu || du.useLayoutEffect;
})), _u, vu, yu, bu, xu, Su, Cu, wu, Tu, Eu, Du, Ou = w((() => {
	_u = /* @__PURE__ */ O(ea()), vu = /* @__PURE__ */ O(ea()), zl(), Kl(), uu(), gu(), yu = /* #__PURE__ */ _u.createContext(typeof HTMLElement < "u" ? /* #__PURE__ */ Rl({ key: "css" }) : null), bu = yu.Provider, xu = function(e) {
		return /*#__PURE__*/ (0, vu.forwardRef)(function(t, n) {
			return e(t, (0, vu.useContext)(yu), n);
		});
	}, Su = /* #__PURE__ */ _u.createContext({}), Cu = {}.hasOwnProperty, wu = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", Tu = function(e, t) {
		var n = {};
		for (var r in t) Cu.call(t, r) && (n[r] = t[r]);
		return n[wu] = e, n;
	}, Eu = function(e) {
		var t = e.cache, n = e.serialized, r = e.isStringTag;
		return Wl(t, n, r), mu(function() {
			return Gl(t, n, r);
		}), null;
	}, Du = /* @__PURE__ */ xu(function(e, t, n) {
		var r = e.css;
		typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
		var i = e[wu], a = [r], o = "";
		typeof e.className == "string" ? o = Ul(t.registered, a, e.className) : e.className != null && (o = e.className + " ");
		var s = $l(a, void 0, _u.useContext(Su));
		o += t.key + "-" + s.name;
		var c = {};
		for (var l in e) Cu.call(e, l) && l !== "css" && l !== wu && (c[l] = e[l]);
		return c.className = o, n && (c.ref = n), /*#__PURE__*/ _u.createElement(_u.Fragment, null, /*#__PURE__*/ _u.createElement(Eu, {
			cache: t,
			serialized: s,
			isStringTag: typeof i == "string"
		}), /*#__PURE__*/ _u.createElement(i, c));
	});
}));
//#endregion
//#region node_modules/@emotion/react/dist/emotion-react.browser.esm.js
function ku() {
	return $l([...arguments]);
}
function Au() {
	var e = ku.apply(void 0, arguments), t = "animation-" + e.name;
	return {
		name: t,
		styles: "@keyframes " + t + "{" + e.styles + "}",
		anim: 1,
		toString: function() {
			return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
		}
	};
}
var ju, Mu, Nu, Pu = w((() => {
	Ou(), ju = /* @__PURE__ */ O(ea()), Kl(), gu(), uu(), Hl(), Mu = function(e, t) {
		var n = arguments;
		if (t == null || !Cu.call(t, "css")) return ju.createElement.apply(void 0, n);
		var r = n.length, i = Array(r);
		i[0] = Du, i[1] = Tu(e, t);
		for (var a = 2; a < r; a++) i[a] = n[a];
		return ju.createElement.apply(null, i);
	}, (function(e) {
		var t;
		t || (t = e.JSX || (e.JSX = {}));
	})(Mu || (Mu = {})), Nu = /* #__PURE__ */ xu(function(e, t) {
		var n = e.styles, r = $l([n], void 0, ju.useContext(Su)), i = ju.useRef();
		return hu(function() {
			var e = t.key + "-global", n = new t.sheet.constructor({
				key: e,
				nonce: t.sheet.nonce,
				container: t.sheet.container,
				speedy: t.sheet.isSpeedy
			}), a = !1, o = document.querySelector("style[data-emotion=\"" + e + " " + r.name + "\"]");
			return t.sheet.tags.length && (n.before = t.sheet.tags[0]), o !== null && (a = !0, o.setAttribute("data-emotion", e), n.hydrate([o])), i.current = [n, a], function() {
				n.flush();
			};
		}, [t]), hu(function() {
			var e = i.current, n = e[0];
			if (e[1]) {
				e[1] = !1;
				return;
			}
			r.next !== void 0 && Gl(t, r.next, !0), n.tags.length && (n.before = n.tags[n.tags.length - 1].nextElementSibling, n.flush()), t.insert("", r, n, !1);
		}, [t, r.name]), null;
	});
})), Fu, Iu, Lu = w((() => {
	kl(), Fu = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|popover|popoverTarget|popoverTargetAction|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, Iu = /* #__PURE__ */ Ol(function(e) {
		return Fu.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
	});
})), Ru, zu, Bu, Vu, Hu, Uu, Wu, Gu, Ku = w((() => {
	V(), Pu(), uu(), gu(), Kl(), Ru = /* @__PURE__ */ O(ea()), Lu(), zu = !1, Bu = Iu, Vu = function(e) {
		return e !== "theme";
	}, Hu = function(e) {
		return typeof e == "string" && e.charCodeAt(0) > 96 ? Bu : Vu;
	}, Uu = function(e, t, n) {
		var r;
		if (t) {
			var i = t.shouldForwardProp;
			r = e.__emotion_forwardProp && i ? function(t) {
				return e.__emotion_forwardProp(t) && i(t);
			} : i;
		}
		return typeof r != "function" && n && (r = e.__emotion_forwardProp), r;
	}, Wu = function(e) {
		var t = e.cache, n = e.serialized, r = e.isStringTag;
		return Wl(t, n, r), mu(function() {
			return Gl(t, n, r);
		}), null;
	}, Gu = function e(t, n) {
		var r = t.__emotion_real === t, i = r && t.__emotion_base || t, a, o;
		n !== void 0 && (a = n.label, o = n.target);
		var s = Uu(t, n, r), c = s || Hu(i), l = !c("as");
		return function() {
			var u = arguments, d = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
			if (a !== void 0 && d.push("label:" + a + ";"), u[0] == null || u[0].raw === void 0) d.push.apply(d, u);
			else {
				var f = u[0];
				d.push(f[0]);
				for (var p = u.length, m = 1; m < p; m++) d.push(u[m], f[m]);
			}
			var h = xu(function(e, t, n) {
				var r = l && e.as || i, a = "", u = [], f = e;
				if (e.theme == null) {
					for (var p in f = {}, e) f[p] = e[p];
					f.theme = Ru.useContext(Su);
				}
				typeof e.className == "string" ? a = Ul(t.registered, u, e.className) : e.className != null && (a = e.className + " ");
				var m = $l(d.concat(u), t.registered, f);
				a += t.key + "-" + m.name, o !== void 0 && (a += " " + o);
				var h = l && s === void 0 ? Hu(r) : c, g = {};
				for (var _ in e) l && _ === "as" || h(_) && (g[_] = e[_]);
				return g.className = a, n && (g.ref = n), /*#__PURE__*/ Ru.createElement(Ru.Fragment, null, /*#__PURE__*/ Ru.createElement(Wu, {
					cache: t,
					serialized: m,
					isStringTag: typeof r == "string"
				}), /*#__PURE__*/ Ru.createElement(r, g));
			});
			return h.displayName = a === void 0 ? "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")" : a, h.defaultProps = t.defaultProps, h.__emotion_real = h, h.__emotion_base = i, h.__emotion_styles = d, h.__emotion_forwardProp = s, Object.defineProperty(h, "toString", { value: function() {
				return o === void 0 && zu ? "NO_COMPONENT_SELECTOR" : "." + o;
			} }), h.withComponent = function(t, r) {
				return e(t, B({}, n, r, { shouldForwardProp: Uu(h, r, !0) })).apply(void 0, d);
			}, h;
		};
	};
})), qu, Ju, Yu = w((() => {
	Ku(), gu(), ea(), qu = /* @__PURE__ */ "a.abbr.address.area.article.aside.audio.b.base.bdi.bdo.big.blockquote.body.br.button.canvas.caption.cite.code.col.colgroup.data.datalist.dd.del.details.dfn.dialog.div.dl.dt.em.embed.fieldset.figcaption.figure.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.iframe.img.input.ins.kbd.keygen.label.legend.li.link.main.map.mark.marquee.menu.menuitem.meta.meter.nav.noscript.object.ol.optgroup.option.output.p.param.picture.pre.progress.q.rp.rt.ruby.s.samp.script.section.select.small.source.span.strong.style.sub.summary.sup.table.tbody.td.textarea.tfoot.th.thead.time.title.tr.track.u.ul.var.video.wbr.circle.clipPath.defs.ellipse.foreignObject.g.image.line.linearGradient.mask.path.pattern.polygon.polyline.radialGradient.rect.stop.svg.text.tspan".split("."), Ju = Gu.bind(null), qu.forEach(function(e) {
		Ju[e] = Ju(e);
	});
}));
//#endregion
//#region node_modules/@mui/styled-engine/StyledEngineProvider/StyledEngineProvider.js
function Xu(e, t) {
	let n = Rl({
		key: "css",
		prepend: e
	});
	if (t) {
		let e = n.insert;
		n.insert = (...t) => (t[1].styles.match(/^@layer\s+[^{]*$/) || (t[1].styles = `@layer mui {${t[1].styles}}`), e(...t));
	}
	return n;
}
function Zu(e) {
	let { injectFirst: t, enableCssLayer: n, children: r } = e, i = Qu.useMemo(() => {
		let e = `${t}-${n}`;
		if (typeof document == "object" && ed.has(e)) return ed.get(e);
		let r = Xu(t, n);
		return ed.set(e, r), r;
	}, [t, n]);
	return t || n ? /*#__PURE__*/ (0, $u.jsx)(bu, {
		value: i,
		children: r
	}) : r;
}
var Qu, $u, ed, td = w((() => {
	Qu = /* @__PURE__ */ O(ea()), Pu(), zl(), $u = ic(), ed = /* @__PURE__ */ new Map();
})), nd = w((() => {
	td();
}));
//#endregion
//#region node_modules/@mui/styled-engine/GlobalStyles/GlobalStyles.js
function rd(e) {
	return e == null || Object.keys(e).length === 0;
}
function id(e) {
	let { styles: t, defaultTheme: n = {} } = e;
	return /*#__PURE__*/ (0, ad.jsx)(Nu, { styles: typeof t == "function" ? (e) => t(rd(e) ? n : e) : t });
}
var ad, od = w((() => {
	ea(), Pu(), ad = ic();
})), sd = w((() => {
	od();
})), cd = /* @__PURE__ */ E({
	GlobalStyles: () => id,
	StyledEngineProvider: () => Zu,
	ThemeContext: () => Su,
	css: () => ku,
	default: () => ld,
	internal_processStyles: () => dd,
	internal_serializeStyles: () => ud,
	keyframes: () => Au
});
function ld(e, t) {
	return Ju(e, t);
}
function ud(e) {
	return fd[0] = e, $l(fd);
}
var dd, fd, pd = w((() => {
	Yu(), uu(), Pu(), nd(), sd(), dd = (e, t) => {
		Array.isArray(e.__emotion_styles) && (e.__emotion_styles = t(e.__emotion_styles));
	}, fd = [];
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createBreakpoints.js
function md(e) {
	let { values: t = {
		xs: 0,
		sm: 600,
		md: 900,
		lg: 1200,
		xl: 1536
	}, unit: n = "px", step: r = 5 } = e, i = H(e, hd), a = gd(t), o = Object.keys(a);
	function s(e) {
		return `@media (min-width:${typeof t[e] == "number" ? t[e] : e}${n})`;
	}
	function c(e) {
		return `@media (max-width:${(typeof t[e] == "number" ? t[e] : e) - r / 100}${n})`;
	}
	function l(e, i) {
		let a = o.indexOf(i);
		return `@media (min-width:${typeof t[e] == "number" ? t[e] : e}${n}) and (max-width:${(a !== -1 && typeof t[o[a]] == "number" ? t[o[a]] : i) - r / 100}${n})`;
	}
	function u(e) {
		return o.indexOf(e) + 1 < o.length ? l(e, o[o.indexOf(e) + 1]) : s(e);
	}
	function d(e) {
		let t = o.indexOf(e);
		return t === 0 ? s(o[1]) : t === o.length - 1 ? c(o[t]) : l(e, o[o.indexOf(e) + 1]).replace("@media", "@media not all and");
	}
	return B({
		keys: o,
		values: a,
		up: s,
		down: c,
		between: l,
		only: u,
		not: d,
		unit: n
	}, i);
}
var hd, gd, _d = w((() => {
	U(), V(), hd = [
		"values",
		"unit",
		"step"
	], gd = (e) => {
		let t = Object.keys(e).map((t) => ({
			key: t,
			val: e[t]
		})) || [];
		return t.sort((e, t) => e.val - t.val), t.reduce((e, t) => B({}, e, { [t.key]: t.val }), {});
	};
})), vd, yd = w((() => {
	vd = { borderRadius: 4 };
}));
//#endregion
//#region node_modules/@mui/system/esm/merge.js
function bd(e, t) {
	return t ? ra(e, t, { clone: !1 }) : e;
}
var xd = w((() => {
	sa();
}));
//#endregion
//#region node_modules/@mui/system/esm/breakpoints.js
function Sd(e, t, n) {
	let r = e.theme || {};
	if (Array.isArray(t)) {
		let e = r.breakpoints || Ed;
		return t.reduce((r, i, a) => (r[e.up(e.keys[a])] = n(t[a]), r), {});
	}
	if (typeof t == "object") {
		let e = r.breakpoints || Ed;
		return Object.keys(t).reduce((r, i) => {
			if (Object.keys(e.values || Td).indexOf(i) !== -1) {
				let a = e.up(i);
				r[a] = n(t[i], i);
			} else {
				let e = i;
				r[e] = t[e];
			}
			return r;
		}, {});
	}
	return n(t);
}
function Cd(e = {}) {
	var t;
	return ((t = e.keys) == null ? void 0 : t.reduce((t, n) => {
		let r = e.up(n);
		return t[r] = {}, t;
	}, {})) || {};
}
function wd(e, t) {
	return e.reduce((e, t) => {
		let n = e[t];
		return (!n || Object.keys(n).length === 0) && delete e[t], e;
	}, t);
}
var Td, Ed, Dd = w((() => {
	Td = {
		xs: 0,
		sm: 600,
		md: 900,
		lg: 1200,
		xl: 1536
	}, Ed = {
		keys: [
			"xs",
			"sm",
			"md",
			"lg",
			"xl"
		],
		up: (e) => `@media (min-width:${Td[e]}px)`
	};
}));
//#endregion
//#region node_modules/@mui/system/esm/style.js
function Od(e, t, n = !0) {
	if (!t || typeof t != "string") return null;
	if (e && e.vars && n) {
		let n = `vars.${t}`.split(".").reduce((e, t) => e && e[t] ? e[t] : null, e);
		if (n != null) return n;
	}
	return t.split(".").reduce((e, t) => e && e[t] != null ? e[t] : null, e);
}
function kd(e, t, n, r = n) {
	let i;
	return i = typeof e == "function" ? e(n) : Array.isArray(e) ? e[n] || r : Od(e, n) || r, t && (i = t(i, r, e)), i;
}
function Ad(e) {
	let { prop: t, cssProperty: n = e.prop, themeKey: r, transform: i } = e, a = (e) => {
		if (e[t] == null) return null;
		let a = e[t], o = e.theme, s = Od(o, r) || {};
		return Sd(e, a, (e) => {
			let r = kd(s, i, e);
			return e === r && typeof e == "string" && (r = kd(s, i, `${t}${e === "default" ? "" : Ca(e)}`, e)), n === !1 ? r : { [n]: r };
		});
	};
	return a.propTypes = {}, a.filterProps = [t], a;
}
var jd = w((() => {
	Ea(), Dd();
}));
//#endregion
//#region node_modules/@mui/system/esm/memoize.js
function Md(e) {
	let t = {};
	return (n) => (t[n] === void 0 && (t[n] = e(n)), t[n]);
}
var Nd = w((() => {}));
//#endregion
//#region node_modules/@mui/system/esm/spacing.js
function Pd(e, t, n, r) {
	var i;
	let a = (i = Od(e, t, !1)) == null ? n : i;
	return typeof a == "number" ? (e) => typeof e == "string" ? e : a * e : Array.isArray(a) ? (e) => typeof e == "string" ? e : a[e] : typeof a == "function" ? a : () => void 0;
}
function Fd(e) {
	return Pd(e, "spacing", 8, "spacing");
}
function Id(e, t) {
	if (typeof t == "string" || t == null) return t;
	let n = e(Math.abs(t));
	return t >= 0 ? n : typeof n == "number" ? -n : `-${n}`;
}
function Ld(e, t) {
	return (n) => e.reduce((e, r) => (e[r] = Id(t, n), e), {});
}
function Rd(e, t, n, r) {
	if (t.indexOf(n) === -1) return null;
	let i = Ld(Gd(n), r), a = e[n];
	return Sd(e, a, i);
}
function zd(e, t) {
	let n = Fd(e.theme);
	return Object.keys(e).map((r) => Rd(e, t, r, n)).reduce(bd, {});
}
function Bd(e) {
	return zd(e, Kd);
}
function Vd(e) {
	return zd(e, qd);
}
var Hd, Ud, Wd, Gd, Kd, qd, Jd = w((() => {
	Dd(), jd(), xd(), Nd(), Hd = {
		m: "margin",
		p: "padding"
	}, Ud = {
		t: "Top",
		r: "Right",
		b: "Bottom",
		l: "Left",
		x: ["Left", "Right"],
		y: ["Top", "Bottom"]
	}, Wd = {
		marginX: "mx",
		marginY: "my",
		paddingX: "px",
		paddingY: "py"
	}, Gd = Md((e) => {
		if (e.length > 2) {
			if (Wd[e]) e = Wd[e];
			else return [e];
		}
		let [t, n] = e.split(""), r = Hd[t], i = Ud[n] || "";
		return Array.isArray(i) ? i.map((e) => r + e) : [r + i];
	}), Kd = [
		"m",
		"mt",
		"mr",
		"mb",
		"ml",
		"mx",
		"my",
		"margin",
		"marginTop",
		"marginRight",
		"marginBottom",
		"marginLeft",
		"marginX",
		"marginY",
		"marginInline",
		"marginInlineStart",
		"marginInlineEnd",
		"marginBlock",
		"marginBlockStart",
		"marginBlockEnd"
	], qd = [
		"p",
		"pt",
		"pr",
		"pb",
		"pl",
		"px",
		"py",
		"padding",
		"paddingTop",
		"paddingRight",
		"paddingBottom",
		"paddingLeft",
		"paddingX",
		"paddingY",
		"paddingInline",
		"paddingInlineStart",
		"paddingInlineEnd",
		"paddingBlock",
		"paddingBlockStart",
		"paddingBlockEnd"
	], [...Kd, ...qd], Bd.propTypes = {}, Bd.filterProps = Kd, Vd.propTypes = {}, Vd.filterProps = qd;
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createSpacing.js
function Yd(e = 8) {
	if (e.mui) return e;
	let t = Fd({ spacing: e }), n = (...e) => (e.length === 0 ? [1] : e).map((e) => {
		let n = t(e);
		return typeof n == "number" ? `${n}px` : n;
	}).join(" ");
	return n.mui = !0, n;
}
var Xd = w((() => {
	Jd();
}));
//#endregion
//#region node_modules/@mui/system/esm/compose.js
function Zd(...e) {
	let t = e.reduce((e, t) => (t.filterProps.forEach((n) => {
		e[n] = t;
	}), e), {}), n = (e) => Object.keys(e).reduce((n, r) => t[r] ? bd(n, t[r](e)) : n, {});
	return n.propTypes = {}, n.filterProps = e.reduce((e, t) => e.concat(t.filterProps), []), n;
}
var Qd = w((() => {
	xd();
}));
//#endregion
//#region node_modules/@mui/system/esm/borders.js
function $d(e) {
	return typeof e == "number" ? `${e}px solid` : e;
}
function ef(e, t) {
	return Ad({
		prop: e,
		themeKey: "borders",
		transform: t
	});
}
var tf, nf, rf, af, of, sf, cf, lf, uf, df, ff, pf, mf, hf = w((() => {
	jd(), Qd(), Jd(), Dd(), tf = ef("border", $d), nf = ef("borderTop", $d), rf = ef("borderRight", $d), af = ef("borderBottom", $d), of = ef("borderLeft", $d), sf = ef("borderColor"), cf = ef("borderTopColor"), lf = ef("borderRightColor"), uf = ef("borderBottomColor"), df = ef("borderLeftColor"), ff = ef("outline", $d), pf = ef("outlineColor"), mf = (e) => {
		if (e.borderRadius !== void 0 && e.borderRadius !== null) {
			let t = Pd(e.theme, "shape.borderRadius", 4, "borderRadius");
			return Sd(e, e.borderRadius, (e) => ({ borderRadius: Id(t, e) }));
		}
		return null;
	}, mf.propTypes = {}, mf.filterProps = ["borderRadius"], Zd(tf, nf, rf, af, of, sf, cf, lf, uf, df, mf, ff, pf);
})), gf, _f, vf, yf, bf, xf, Sf, Cf, wf, Tf, Ef, Df, Of = w((() => {
	jd(), Qd(), Jd(), Dd(), gf = (e) => {
		if (e.gap !== void 0 && e.gap !== null) {
			let t = Pd(e.theme, "spacing", 8, "gap");
			return Sd(e, e.gap, (e) => ({ gap: Id(t, e) }));
		}
		return null;
	}, gf.propTypes = {}, gf.filterProps = ["gap"], _f = (e) => {
		if (e.columnGap !== void 0 && e.columnGap !== null) {
			let t = Pd(e.theme, "spacing", 8, "columnGap");
			return Sd(e, e.columnGap, (e) => ({ columnGap: Id(t, e) }));
		}
		return null;
	}, _f.propTypes = {}, _f.filterProps = ["columnGap"], vf = (e) => {
		if (e.rowGap !== void 0 && e.rowGap !== null) {
			let t = Pd(e.theme, "spacing", 8, "rowGap");
			return Sd(e, e.rowGap, (e) => ({ rowGap: Id(t, e) }));
		}
		return null;
	}, vf.propTypes = {}, vf.filterProps = ["rowGap"], yf = Ad({ prop: "gridColumn" }), bf = Ad({ prop: "gridRow" }), xf = Ad({ prop: "gridAutoFlow" }), Sf = Ad({ prop: "gridAutoColumns" }), Cf = Ad({ prop: "gridAutoRows" }), wf = Ad({ prop: "gridTemplateColumns" }), Tf = Ad({ prop: "gridTemplateRows" }), Ef = Ad({ prop: "gridTemplateAreas" }), Df = Ad({ prop: "gridArea" }), Zd(gf, _f, vf, yf, bf, xf, Sf, Cf, wf, Tf, Ef, Df);
}));
//#endregion
//#region node_modules/@mui/system/esm/palette.js
function kf(e, t) {
	return t === "grey" ? t : e;
}
var Af, jf, Mf, Nf = w((() => {
	jd(), Qd(), Af = Ad({
		prop: "color",
		themeKey: "palette",
		transform: kf
	}), jf = Ad({
		prop: "bgcolor",
		cssProperty: "backgroundColor",
		themeKey: "palette",
		transform: kf
	}), Mf = Ad({
		prop: "backgroundColor",
		themeKey: "palette",
		transform: kf
	}), Zd(Af, jf, Mf);
}));
//#endregion
//#region node_modules/@mui/system/esm/sizing.js
function Pf(e) {
	return e <= 1 && e !== 0 ? `${e * 100}%` : e;
}
var Ff, If, Lf, Rf, zf, Bf, Vf, Hf = w((() => {
	jd(), Qd(), Dd(), Ff = Ad({
		prop: "width",
		transform: Pf
	}), If = (e) => e.maxWidth !== void 0 && e.maxWidth !== null ? Sd(e, e.maxWidth, (t) => {
		var n, r;
		let i = ((n = e.theme) == null || (n = n.breakpoints) == null || (n = n.values) == null ? void 0 : n[t]) || Td[t];
		return i ? ((r = e.theme) == null || (r = r.breakpoints) == null ? void 0 : r.unit) === "px" ? { maxWidth: i } : { maxWidth: `${i}${e.theme.breakpoints.unit}` } : { maxWidth: Pf(t) };
	}) : null, If.filterProps = ["maxWidth"], Lf = Ad({
		prop: "minWidth",
		transform: Pf
	}), Rf = Ad({
		prop: "height",
		transform: Pf
	}), zf = Ad({
		prop: "maxHeight",
		transform: Pf
	}), Bf = Ad({
		prop: "minHeight",
		transform: Pf
	}), Ad({
		prop: "size",
		cssProperty: "width",
		transform: Pf
	}), Ad({
		prop: "size",
		cssProperty: "height",
		transform: Pf
	}), Vf = Ad({ prop: "boxSizing" }), Zd(Ff, If, Lf, Rf, zf, Bf, Vf);
})), Uf, Wf = w((() => {
	Jd(), hf(), Of(), Nf(), Hf(), Uf = {
		border: {
			themeKey: "borders",
			transform: $d
		},
		borderTop: {
			themeKey: "borders",
			transform: $d
		},
		borderRight: {
			themeKey: "borders",
			transform: $d
		},
		borderBottom: {
			themeKey: "borders",
			transform: $d
		},
		borderLeft: {
			themeKey: "borders",
			transform: $d
		},
		borderColor: { themeKey: "palette" },
		borderTopColor: { themeKey: "palette" },
		borderRightColor: { themeKey: "palette" },
		borderBottomColor: { themeKey: "palette" },
		borderLeftColor: { themeKey: "palette" },
		outline: {
			themeKey: "borders",
			transform: $d
		},
		outlineColor: { themeKey: "palette" },
		borderRadius: {
			themeKey: "shape.borderRadius",
			style: mf
		},
		color: {
			themeKey: "palette",
			transform: kf
		},
		bgcolor: {
			themeKey: "palette",
			cssProperty: "backgroundColor",
			transform: kf
		},
		backgroundColor: {
			themeKey: "palette",
			transform: kf
		},
		p: { style: Vd },
		pt: { style: Vd },
		pr: { style: Vd },
		pb: { style: Vd },
		pl: { style: Vd },
		px: { style: Vd },
		py: { style: Vd },
		padding: { style: Vd },
		paddingTop: { style: Vd },
		paddingRight: { style: Vd },
		paddingBottom: { style: Vd },
		paddingLeft: { style: Vd },
		paddingX: { style: Vd },
		paddingY: { style: Vd },
		paddingInline: { style: Vd },
		paddingInlineStart: { style: Vd },
		paddingInlineEnd: { style: Vd },
		paddingBlock: { style: Vd },
		paddingBlockStart: { style: Vd },
		paddingBlockEnd: { style: Vd },
		m: { style: Bd },
		mt: { style: Bd },
		mr: { style: Bd },
		mb: { style: Bd },
		ml: { style: Bd },
		mx: { style: Bd },
		my: { style: Bd },
		margin: { style: Bd },
		marginTop: { style: Bd },
		marginRight: { style: Bd },
		marginBottom: { style: Bd },
		marginLeft: { style: Bd },
		marginX: { style: Bd },
		marginY: { style: Bd },
		marginInline: { style: Bd },
		marginInlineStart: { style: Bd },
		marginInlineEnd: { style: Bd },
		marginBlock: { style: Bd },
		marginBlockStart: { style: Bd },
		marginBlockEnd: { style: Bd },
		displayPrint: {
			cssProperty: !1,
			transform: (e) => ({ "@media print": { display: e } })
		},
		display: {},
		overflow: {},
		textOverflow: {},
		visibility: {},
		whiteSpace: {},
		flexBasis: {},
		flexDirection: {},
		flexWrap: {},
		justifyContent: {},
		alignItems: {},
		alignContent: {},
		order: {},
		flex: {},
		flexGrow: {},
		flexShrink: {},
		alignSelf: {},
		justifyItems: {},
		justifySelf: {},
		gap: { style: gf },
		rowGap: { style: vf },
		columnGap: { style: _f },
		gridColumn: {},
		gridRow: {},
		gridAutoFlow: {},
		gridAutoColumns: {},
		gridAutoRows: {},
		gridTemplateColumns: {},
		gridTemplateRows: {},
		gridTemplateAreas: {},
		gridArea: {},
		position: {},
		zIndex: { themeKey: "zIndex" },
		top: {},
		right: {},
		bottom: {},
		left: {},
		boxShadow: { themeKey: "shadows" },
		width: { transform: Pf },
		maxWidth: { style: If },
		minWidth: { transform: Pf },
		height: { transform: Pf },
		maxHeight: { transform: Pf },
		minHeight: { transform: Pf },
		boxSizing: {},
		fontFamily: { themeKey: "typography" },
		fontSize: { themeKey: "typography" },
		fontStyle: { themeKey: "typography" },
		fontWeight: { themeKey: "typography" },
		letterSpacing: {},
		textTransform: {},
		lineHeight: {},
		textAlign: {},
		typography: {
			cssProperty: !1,
			themeKey: "typography"
		}
	};
}));
//#endregion
//#region node_modules/@mui/system/esm/styleFunctionSx/styleFunctionSx.js
function Gf(...e) {
	let t = e.reduce((e, t) => e.concat(Object.keys(t)), []), n = new Set(t);
	return e.every((e) => n.size === Object.keys(e).length);
}
function Kf(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function qf() {
	function e(e, t, n, r) {
		let i = {
			[e]: t,
			theme: n
		}, a = r[e];
		if (!a) return { [e]: t };
		let { cssProperty: o = e, themeKey: s, transform: c, style: l } = a;
		if (t == null) return null;
		if (s === "typography" && t === "inherit") return { [e]: t };
		let u = Od(n, s) || {};
		return l ? l(i) : Sd(i, t, (t) => {
			let n = kd(u, c, t);
			return t === n && typeof t == "string" && (n = kd(u, c, `${e}${t === "default" ? "" : Ca(t)}`, t)), o === !1 ? n : { [o]: n };
		});
	}
	function t(n) {
		var r;
		let { sx: i, theme: a = {}, nested: o } = n || {};
		if (!i) return null;
		let s = (r = a.unstable_sxConfig) == null ? Uf : r;
		function c(n) {
			let r = n;
			if (typeof n == "function") r = n(a);
			else if (typeof n != "object") return n;
			if (!r) return null;
			let i = Cd(a.breakpoints), c = Object.keys(i), l = i;
			return Object.keys(r).forEach((n) => {
				let i = Kf(r[n], a);
				if (i != null) {
					if (typeof i == "object") {
						if (s[n]) l = bd(l, e(n, i, a, s));
						else {
							let e = Sd({ theme: a }, i, (e) => ({ [n]: e }));
							Gf(e, i) ? l[n] = t({
								sx: i,
								theme: a,
								nested: !0
							}) : l = bd(l, e);
						}
					} else l = bd(l, e(n, i, a, s));
				}
			}), !o && a.modularCssLayers ? { "@layer sx": wd(c, l) } : wd(c, l);
		}
		return Array.isArray(i) ? i.map(c) : c(i);
	}
	return t;
}
var Jf, Yf = w((() => {
	Ea(), xd(), jd(), Dd(), Wf(), Jf = qf(), Jf.filterProps = ["sx"];
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/applyStyles.js
function Xf(e, t) {
	let n = this;
	return n.vars && typeof n.getColorSchemeSelector == "function" ? { [n.getColorSchemeSelector(e).replace(/(\[[^\]]+\])/, "*:where($1)")]: t } : n.palette.mode === e ? t : {};
}
var Zf = w((() => {}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createTheme.js
function Qf(e = {}, ...t) {
	let { breakpoints: n = {}, palette: r = {}, spacing: i, shape: a = {} } = e, o = H(e, $f), s = md(n), c = Yd(i), l = ra({
		breakpoints: s,
		direction: "ltr",
		components: {},
		palette: B({ mode: "light" }, r),
		spacing: c,
		shape: B({}, vd, a)
	}, o);
	return l.applyStyles = Xf, l = t.reduce((e, t) => ra(e, t), l), l.unstable_sxConfig = B({}, Uf, o == null ? void 0 : o.unstable_sxConfig), l.unstable_sx = function(e) {
		return Jf({
			sx: e,
			theme: this
		});
	}, l;
}
var $f, ep = w((() => {
	V(), U(), sa(), _d(), yd(), Xd(), Yf(), Wf(), Zf(), $f = [
		"breakpoints",
		"palette",
		"spacing",
		"shape"
	];
})), tp = /* @__PURE__ */ E({
	default: () => Qf,
	private_createBreakpoints: () => md,
	unstable_applyStyles: () => Xf
}), np = w((() => {
	ep(), _d(), Zf();
}));
//#endregion
//#region node_modules/@mui/system/esm/styleFunctionSx/extendSxProp.js
function rp(e) {
	let { sx: t } = e, n = H(e, ip), { systemProps: r, otherProps: i } = ap(n), a;
	return a = Array.isArray(t) ? [r, ...t] : typeof t == "function" ? (...e) => {
		let n = t(...e);
		return ta(n) ? B({}, r, n) : r;
	} : B({}, r, t), B({}, i, { sx: a });
}
var ip, ap, op = w((() => {
	V(), U(), sa(), Wf(), ip = ["sx"], ap = (e) => {
		var t, n;
		let r = {
			systemProps: {},
			otherProps: {}
		}, i = (t = e == null || (n = e.theme) == null ? void 0 : n.unstable_sxConfig) == null ? Uf : t;
		return Object.keys(e).forEach((t) => {
			i[t] ? r.systemProps[t] = e[t] : r.otherProps[t] = e[t];
		}), r;
	};
})), sp = /* @__PURE__ */ E({
	default: () => Jf,
	extendSxProp: () => rp,
	unstable_createStyleFunctionSx: () => qf,
	unstable_defaultSxConfig: () => Uf
}), cp = w((() => {
	Yf(), op(), Wf();
})), lp = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = S, e.shouldForwardProp = h, e.systemDefaultTheme = void 0;
	var n = t(hc()), r = t(q()), i = f((pd(), k(cd))), a = (sa(), k(oa));
	t((Ea(), k(Ta))), t((Sa(), k(xa)));
	var o = t((np(), k(tp))), s = t((cp(), k(sp))), c = ["ownerState"], l = ["variants"], u = [
		"name",
		"slot",
		"skipVariantsResolver",
		"skipSx",
		"overridesResolver"
	];
	function d(e) {
		if (typeof WeakMap != "function") return null;
		var t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (d = function(e) {
			return e ? n : t;
		})(e);
	}
	function f(e, t) {
		if (!t && e && e.__esModule) return e;
		if (e === null || typeof e != "object" && typeof e != "function") return { default: e };
		var n = d(t);
		if (n && n.has(e)) return n.get(e);
		var r = { __proto__: null }, i = Object.defineProperty && Object.getOwnPropertyDescriptor;
		for (var a in e) if (a !== "default" && Object.prototype.hasOwnProperty.call(e, a)) {
			var o = i ? Object.getOwnPropertyDescriptor(e, a) : null;
			o && (o.get || o.set) ? Object.defineProperty(r, a, o) : r[a] = e[a];
		}
		return r.default = e, n && n.set(e, r), r;
	}
	function p(e) {
		return Object.keys(e).length === 0;
	}
	function m(e) {
		return typeof e == "string" && e.charCodeAt(0) > 96;
	}
	function h(e) {
		return e !== "ownerState" && e !== "theme" && e !== "sx" && e !== "as";
	}
	function g(e, t) {
		return t && e && typeof e == "object" && e.styles && !e.styles.startsWith("@layer") && (e.styles = `@layer ${t}{${String(e.styles)}}`), e;
	}
	var _ = e.systemDefaultTheme = (0, o.default)(), v = (e) => e && e.charAt(0).toLowerCase() + e.slice(1);
	function y({ defaultTheme: e, theme: t, themeId: n }) {
		return p(t) ? e : t[n] || t;
	}
	function b(e) {
		return e ? (t, n) => n[e] : null;
	}
	function x(e, t, a) {
		let { ownerState: o } = t, s = (0, r.default)(t, c), u = typeof e == "function" ? e((0, n.default)({ ownerState: o }, s)) : e;
		if (Array.isArray(u)) return u.flatMap((e) => x(e, (0, n.default)({ ownerState: o }, s), a));
		if (u && typeof u == "object" && Array.isArray(u.variants)) {
			let { variants: e = [] } = u, t = (0, r.default)(u, l);
			return e.forEach((e) => {
				let r = !0;
				if (typeof e.props == "function" ? r = e.props((0, n.default)({ ownerState: o }, s, o)) : Object.keys(e.props).forEach((t) => {
					(o == null ? void 0 : o[t]) !== e.props[t] && s[t] !== e.props[t] && (r = !1);
				}), r) {
					Array.isArray(t) || (t = [t]);
					let r = typeof e.style == "function" ? e.style((0, n.default)({ ownerState: o }, s, o)) : e.style;
					t.push(a ? g((0, i.internal_serializeStyles)(r), a) : r);
				}
			}), t;
		}
		return a ? g((0, i.internal_serializeStyles)(u), a) : u;
	}
	function S(e = {}) {
		let { themeId: t, defaultTheme: o = _, rootShouldForwardProp: c = h, slotShouldForwardProp: l = h } = e, d = (e) => (0, s.default)((0, n.default)({}, e, { theme: y((0, n.default)({}, e, {
			defaultTheme: o,
			themeId: t
		})) }));
		return d.__mui_systemSx = !0, (e, s = {}) => {
			(0, i.internal_processStyles)(e, (e) => e.filter((e) => !(e != null && e.__mui_systemSx)));
			let { name: f, slot: p, skipVariantsResolver: g, skipSx: _, overridesResolver: S = b(v(p)) } = s, C = (0, r.default)(s, u), w = f && f.startsWith("Mui") || p ? "components" : "custom", T = g === void 0 ? p && p !== "Root" && p !== "root" || !1 : g, E = _ || !1, D, O = h;
			p === "Root" || p === "root" ? O = c : p ? O = l : m(e) && (O = void 0);
			let k = (0, i.default)(e, (0, n.default)({
				shouldForwardProp: O,
				label: D
			}, C)), A = (e) => typeof e == "function" && e.__emotion_real !== e || (0, a.isPlainObject)(e) ? (r) => {
				let i = y({
					theme: r.theme,
					defaultTheme: o,
					themeId: t
				});
				return x(e, (0, n.default)({}, r, { theme: i }), i.modularCssLayers ? w : void 0);
			} : e, j = (r, ...i) => {
				let a = A(r), s = i ? i.map(A) : [];
				f && S && s.push((e) => {
					let r = y((0, n.default)({}, e, {
						defaultTheme: o,
						themeId: t
					}));
					if (!r.components || !r.components[f] || !r.components[f].styleOverrides) return null;
					let i = r.components[f].styleOverrides, a = {};
					return Object.entries(i).forEach(([t, i]) => {
						a[t] = x(i, (0, n.default)({}, e, { theme: r }), r.modularCssLayers ? "theme" : void 0);
					}), S(e, a);
				}), f && !T && s.push((e) => {
					var r;
					let i = y((0, n.default)({}, e, {
						defaultTheme: o,
						themeId: t
					}));
					return x({ variants: i == null || (r = i.components) == null || (r = r[f]) == null ? void 0 : r.variants }, (0, n.default)({}, e, { theme: i }), i.modularCssLayers ? "theme" : void 0);
				}), E || s.push(d);
				let c = s.length - i.length;
				if (Array.isArray(r) && c > 0) {
					let e = Array(c).fill("");
					a = [...r, ...e], a.raw = [...r.raw, ...e];
				}
				let l = k(a, ...s);
				return e.muiName && (l.muiName = e.muiName), l;
			};
			return k.withConfig && (j.withConfig = k.withConfig), j;
		};
	}
}));
//#endregion
//#region node_modules/@mui/material/styles/createMixins.js
function up(e, t) {
	return B({ toolbar: {
		minHeight: 56,
		[e.up("xs")]: { "@media (orientation: landscape)": { minHeight: 48 } },
		[e.up("sm")]: { minHeight: 64 }
	} }, t);
}
var dp = w((() => {
	V();
})), fp = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.alpha = f, e.colorChannel = void 0, e.darken = p, e.getContrastRatio = d, e.lighten = m, e.private_safeColorChannel = void 0;
	var n = t((da(), k(ua))), r = t((ws(), k(Cs)));
	function i(e, t = 0, n = 1) {
		return (0, r.default)(e, t, n);
	}
	function a(e) {
		e = e.slice(1);
		let t = RegExp(`.{1,${e.length >= 6 ? 2 : 1}}`, "g"), n = e.match(t);
		return n && n[0].length === 1 && (n = n.map((e) => e + e)), n ? `rgb${n.length === 4 ? "a" : ""}(${n.map((e, t) => t < 3 ? parseInt(e, 16) : Math.round(parseInt(e, 16) / 255 * 1e3) / 1e3).join(", ")})` : "";
	}
	function o(e) {
		if (e.type) return e;
		if (e.charAt(0) === "#") return o(a(e));
		let t = e.indexOf("("), r = e.substring(0, t);
		if ([
			"rgb",
			"rgba",
			"hsl",
			"hsla",
			"color"
		].indexOf(r) === -1) throw Error((0, n.default)(9, e));
		let i = e.substring(t + 1, e.length - 1), s;
		if (r === "color") {
			if (i = i.split(" "), s = i.shift(), i.length === 4 && i[3].charAt(0) === "/" && (i[3] = i[3].slice(1)), [
				"srgb",
				"display-p3",
				"a98-rgb",
				"prophoto-rgb",
				"rec-2020"
			].indexOf(s) === -1) throw Error((0, n.default)(10, s));
		} else i = i.split(",");
		return i = i.map((e) => parseFloat(e)), {
			type: r,
			values: i,
			colorSpace: s
		};
	}
	var s = (e) => {
		let t = o(e);
		return t.values.slice(0, 3).map((e, n) => t.type.indexOf("hsl") !== -1 && n !== 0 ? `${e}%` : e).join(" ");
	};
	e.colorChannel = s, e.private_safeColorChannel = (e, t) => {
		try {
			return s(e);
		} catch {
			return e;
		}
	};
	function c(e) {
		let { type: t, colorSpace: n } = e, { values: r } = e;
		return t.indexOf("rgb") === -1 ? t.indexOf("hsl") !== -1 && (r[1] = `${r[1]}%`, r[2] = `${r[2]}%`) : r = r.map((e, t) => t < 3 ? parseInt(e, 10) : e), r = t.indexOf("color") === -1 ? `${r.join(", ")}` : `${n} ${r.join(" ")}`, `${t}(${r})`;
	}
	function l(e) {
		e = o(e);
		let { values: t } = e, n = t[0], r = t[1] / 100, i = t[2] / 100, a = r * Math.min(i, 1 - i), s = (e, t = (e + n / 30) % 12) => i - a * Math.max(Math.min(t - 3, 9 - t, 1), -1), l = "rgb", u = [
			Math.round(s(0) * 255),
			Math.round(s(8) * 255),
			Math.round(s(4) * 255)
		];
		return e.type === "hsla" && (l += "a", u.push(t[3])), c({
			type: l,
			values: u
		});
	}
	function u(e) {
		e = o(e);
		let t = e.type === "hsl" || e.type === "hsla" ? o(l(e)).values : e.values;
		return t = t.map((t) => (e.type !== "color" && (t /= 255), t <= .03928 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4)), Number((.2126 * t[0] + .7152 * t[1] + .0722 * t[2]).toFixed(3));
	}
	function d(e, t) {
		let n = u(e), r = u(t);
		return (Math.max(n, r) + .05) / (Math.min(n, r) + .05);
	}
	function f(e, t) {
		return e = o(e), t = i(t), (e.type === "rgb" || e.type === "hsl") && (e.type += "a"), e.type === "color" ? e.values[3] = `/${t}` : e.values[3] = t, c(e);
	}
	function p(e, t) {
		if (e = o(e), t = i(t), e.type.indexOf("hsl") !== -1) e.values[2] *= 1 - t;
		else if (e.type.indexOf("rgb") !== -1 || e.type.indexOf("color") !== -1) for (let n = 0; n < 3; n += 1) e.values[n] *= 1 - t;
		return c(e);
	}
	function m(e, t) {
		if (e = o(e), t = i(t), e.type.indexOf("hsl") !== -1) e.values[2] += (100 - e.values[2]) * t;
		else if (e.type.indexOf("rgb") !== -1) for (let n = 0; n < 3; n += 1) e.values[n] += (255 - e.values[n]) * t;
		else if (e.type.indexOf("color") !== -1) for (let n = 0; n < 3; n += 1) e.values[n] += (1 - e.values[n]) * t;
		return c(e);
	}
})), pp, mp = w((() => {
	pp = {
		black: "#000",
		white: "#fff"
	};
})), hp, gp = w((() => {
	hp = {
		50: "#fafafa",
		100: "#f5f5f5",
		200: "#eeeeee",
		300: "#e0e0e0",
		400: "#bdbdbd",
		500: "#9e9e9e",
		600: "#757575",
		700: "#616161",
		800: "#424242",
		900: "#212121",
		A100: "#f5f5f5",
		A200: "#eeeeee",
		A400: "#bdbdbd",
		A700: "#616161"
	};
})), _p, vp = w((() => {
	_p = {
		50: "#f3e5f5",
		100: "#e1bee7",
		200: "#ce93d8",
		300: "#ba68c8",
		400: "#ab47bc",
		500: "#9c27b0",
		600: "#8e24aa",
		700: "#7b1fa2",
		800: "#6a1b9a",
		900: "#4a148c",
		A100: "#ea80fc",
		A200: "#e040fb",
		A400: "#d500f9",
		A700: "#aa00ff"
	};
})), yp, bp = w((() => {
	yp = {
		50: "#ffebee",
		100: "#ffcdd2",
		200: "#ef9a9a",
		300: "#e57373",
		400: "#ef5350",
		500: "#f44336",
		600: "#e53935",
		700: "#d32f2f",
		800: "#c62828",
		900: "#b71c1c",
		A100: "#ff8a80",
		A200: "#ff5252",
		A400: "#ff1744",
		A700: "#d50000"
	};
})), xp, Sp = w((() => {
	xp = {
		50: "#fff3e0",
		100: "#ffe0b2",
		200: "#ffcc80",
		300: "#ffb74d",
		400: "#ffa726",
		500: "#ff9800",
		600: "#fb8c00",
		700: "#f57c00",
		800: "#ef6c00",
		900: "#e65100",
		A100: "#ffd180",
		A200: "#ffab40",
		A400: "#ff9100",
		A700: "#ff6d00"
	};
})), Cp, wp = w((() => {
	Cp = {
		50: "#e3f2fd",
		100: "#bbdefb",
		200: "#90caf9",
		300: "#64b5f6",
		400: "#42a5f5",
		500: "#2196f3",
		600: "#1e88e5",
		700: "#1976d2",
		800: "#1565c0",
		900: "#0d47a1",
		A100: "#82b1ff",
		A200: "#448aff",
		A400: "#2979ff",
		A700: "#2962ff"
	};
})), Tp, Ep = w((() => {
	Tp = {
		50: "#e1f5fe",
		100: "#b3e5fc",
		200: "#81d4fa",
		300: "#4fc3f7",
		400: "#29b6f6",
		500: "#03a9f4",
		600: "#039be5",
		700: "#0288d1",
		800: "#0277bd",
		900: "#01579b",
		A100: "#80d8ff",
		A200: "#40c4ff",
		A400: "#00b0ff",
		A700: "#0091ea"
	};
})), Dp, Op = w((() => {
	Dp = {
		50: "#e8f5e9",
		100: "#c8e6c9",
		200: "#a5d6a7",
		300: "#81c784",
		400: "#66bb6a",
		500: "#4caf50",
		600: "#43a047",
		700: "#388e3c",
		800: "#2e7d32",
		900: "#1b5e20",
		A100: "#b9f6ca",
		A200: "#69f0ae",
		A400: "#00e676",
		A700: "#00c853"
	};
}));
//#endregion
//#region node_modules/@mui/material/styles/createPalette.js
function kp(e, t, n, r) {
	let i = r.light || r, a = r.dark || r * 1.5;
	e[t] || (e.hasOwnProperty(n) ? e[t] = e[n] : t === "light" ? e.light = (0, Lp.lighten)(e.main, i) : t === "dark" && (e.dark = (0, Lp.darken)(e.main, a)));
}
function Ap(e = "light") {
	return e === "dark" ? {
		main: Cp[200],
		light: Cp[50],
		dark: Cp[400]
	} : {
		main: Cp[700],
		light: Cp[400],
		dark: Cp[800]
	};
}
function jp(e = "light") {
	return e === "dark" ? {
		main: _p[200],
		light: _p[50],
		dark: _p[400]
	} : {
		main: _p[500],
		light: _p[300],
		dark: _p[700]
	};
}
function Mp(e = "light") {
	return e === "dark" ? {
		main: yp[500],
		light: yp[300],
		dark: yp[700]
	} : {
		main: yp[700],
		light: yp[400],
		dark: yp[800]
	};
}
function Np(e = "light") {
	return e === "dark" ? {
		main: Tp[400],
		light: Tp[300],
		dark: Tp[700]
	} : {
		main: Tp[700],
		light: Tp[500],
		dark: Tp[900]
	};
}
function Pp(e = "light") {
	return e === "dark" ? {
		main: Dp[400],
		light: Dp[300],
		dark: Dp[700]
	} : {
		main: Dp[800],
		light: Dp[500],
		dark: Dp[900]
	};
}
function Fp(e = "light") {
	return e === "dark" ? {
		main: xp[400],
		light: xp[300],
		dark: xp[700]
	} : {
		main: "#ed6c02",
		light: xp[500],
		dark: xp[900]
	};
}
function Ip(e) {
	let { mode: t = "light", contrastThreshold: n = 3, tonalOffset: r = .2 } = e, i = H(e, Rp), a = e.primary || Ap(t), o = e.secondary || jp(t), s = e.error || Mp(t), c = e.info || Np(t), l = e.success || Pp(t), u = e.warning || Fp(t);
	function d(e) {
		return (0, Lp.getContrastRatio)(e, Bp.text.primary) >= n ? Bp.text.primary : zp.text.primary;
	}
	let f = ({ color: e, name: t, mainShade: n = 500, lightShade: i = 300, darkShade: a = 700 }) => {
		if (e = B({}, e), !e.main && e[n] && (e.main = e[n]), !e.hasOwnProperty("main")) throw Error(ca(11, t ? ` (${t})` : "", n));
		if (typeof e.main != "string") throw Error(ca(12, t ? ` (${t})` : "", JSON.stringify(e.main)));
		return kp(e, "light", i, r), kp(e, "dark", a, r), e.contrastText || (e.contrastText = d(e.main)), e;
	}, p = {
		dark: Bp,
		light: zp
	};
	return ra(B({
		common: B({}, pp),
		mode: t,
		primary: f({
			color: a,
			name: "primary"
		}),
		secondary: f({
			color: o,
			name: "secondary",
			mainShade: "A400",
			lightShade: "A200",
			darkShade: "A700"
		}),
		error: f({
			color: s,
			name: "error"
		}),
		warning: f({
			color: u,
			name: "warning"
		}),
		info: f({
			color: c,
			name: "info"
		}),
		success: f({
			color: l,
			name: "success"
		}),
		grey: hp,
		contrastThreshold: n,
		getContrastText: d,
		augmentColor: f,
		tonalOffset: r
	}, p[t]), i);
}
var Lp, Rp, zp, Bp, Vp = w((() => {
	V(), U(), da(), sa(), Lp = fp(), mp(), gp(), vp(), bp(), Sp(), wp(), Ep(), Op(), Rp = [
		"mode",
		"contrastThreshold",
		"tonalOffset"
	], zp = {
		text: {
			primary: "rgba(0, 0, 0, 0.87)",
			secondary: "rgba(0, 0, 0, 0.6)",
			disabled: "rgba(0, 0, 0, 0.38)"
		},
		divider: "rgba(0, 0, 0, 0.12)",
		background: {
			paper: pp.white,
			default: pp.white
		},
		action: {
			active: "rgba(0, 0, 0, 0.54)",
			hover: "rgba(0, 0, 0, 0.04)",
			hoverOpacity: .04,
			selected: "rgba(0, 0, 0, 0.08)",
			selectedOpacity: .08,
			disabled: "rgba(0, 0, 0, 0.26)",
			disabledBackground: "rgba(0, 0, 0, 0.12)",
			disabledOpacity: .38,
			focus: "rgba(0, 0, 0, 0.12)",
			focusOpacity: .12,
			activatedOpacity: .12
		}
	}, Bp = {
		text: {
			primary: pp.white,
			secondary: "rgba(255, 255, 255, 0.7)",
			disabled: "rgba(255, 255, 255, 0.5)",
			icon: "rgba(255, 255, 255, 0.5)"
		},
		divider: "rgba(255, 255, 255, 0.12)",
		background: {
			paper: "#121212",
			default: "#121212"
		},
		action: {
			active: pp.white,
			hover: "rgba(255, 255, 255, 0.08)",
			hoverOpacity: .08,
			selected: "rgba(255, 255, 255, 0.16)",
			selectedOpacity: .16,
			disabled: "rgba(255, 255, 255, 0.3)",
			disabledBackground: "rgba(255, 255, 255, 0.12)",
			disabledOpacity: .38,
			focus: "rgba(255, 255, 255, 0.12)",
			focusOpacity: .12,
			activatedOpacity: .24
		}
	};
}));
//#endregion
//#region node_modules/@mui/material/styles/createTypography.js
function Hp(e) {
	return Math.round(e * 1e5) / 1e5;
}
function Up(e, t) {
	let n = typeof t == "function" ? t(e) : t, { fontFamily: r = Kp, fontSize: i = 14, fontWeightLight: a = 300, fontWeightRegular: o = 400, fontWeightMedium: s = 500, fontWeightBold: c = 700, htmlFontSize: l = 16, allVariants: u, pxToRem: d } = n, f = H(n, Wp), p = i / 14, m = d || ((e) => `${e / l * p}rem`), h = (e, t, n, i, a) => B({
		fontFamily: r,
		fontWeight: e,
		fontSize: m(t),
		lineHeight: n
	}, r === Kp ? { letterSpacing: `${Hp(i / t)}em` } : {}, a, u), g = {
		h1: h(a, 96, 1.167, -1.5),
		h2: h(a, 60, 1.2, -.5),
		h3: h(o, 48, 1.167, 0),
		h4: h(o, 34, 1.235, .25),
		h5: h(o, 24, 1.334, 0),
		h6: h(s, 20, 1.6, .15),
		subtitle1: h(o, 16, 1.75, .15),
		subtitle2: h(s, 14, 1.57, .1),
		body1: h(o, 16, 1.5, .15),
		body2: h(o, 14, 1.43, .15),
		button: h(s, 14, 1.75, .4, Gp),
		caption: h(o, 12, 1.66, .4),
		overline: h(o, 12, 2.66, 1, Gp),
		inherit: {
			fontFamily: "inherit",
			fontWeight: "inherit",
			fontSize: "inherit",
			lineHeight: "inherit",
			letterSpacing: "inherit"
		}
	};
	return ra(B({
		htmlFontSize: l,
		pxToRem: m,
		fontFamily: r,
		fontSize: i,
		fontWeightLight: a,
		fontWeightRegular: o,
		fontWeightMedium: s,
		fontWeightBold: c
	}, g), f, { clone: !1 });
}
var Wp, Gp, Kp, qp = w((() => {
	V(), U(), sa(), Wp = [
		"fontFamily",
		"fontSize",
		"fontWeightLight",
		"fontWeightRegular",
		"fontWeightMedium",
		"fontWeightBold",
		"htmlFontSize",
		"allVariants",
		"pxToRem"
	], Gp = { textTransform: "uppercase" }, Kp = "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif";
}));
//#endregion
//#region node_modules/@mui/material/styles/shadows.js
function Jp(...e) {
	return [
		`${e[0]}px ${e[1]}px ${e[2]}px ${e[3]}px rgba(0,0,0,${Yp})`,
		`${e[4]}px ${e[5]}px ${e[6]}px ${e[7]}px rgba(0,0,0,${Xp})`,
		`${e[8]}px ${e[9]}px ${e[10]}px ${e[11]}px rgba(0,0,0,${Zp})`
	].join(",");
}
var Yp, Xp, Zp, Qp, $p = w((() => {
	Yp = .2, Xp = .14, Zp = .12, Qp = [
		"none",
		Jp(0, 2, 1, -1, 0, 1, 1, 0, 0, 1, 3, 0),
		Jp(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0),
		Jp(0, 3, 3, -2, 0, 3, 4, 0, 0, 1, 8, 0),
		Jp(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0),
		Jp(0, 3, 5, -1, 0, 5, 8, 0, 0, 1, 14, 0),
		Jp(0, 3, 5, -1, 0, 6, 10, 0, 0, 1, 18, 0),
		Jp(0, 4, 5, -2, 0, 7, 10, 1, 0, 2, 16, 1),
		Jp(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2),
		Jp(0, 5, 6, -3, 0, 9, 12, 1, 0, 3, 16, 2),
		Jp(0, 6, 6, -3, 0, 10, 14, 1, 0, 4, 18, 3),
		Jp(0, 6, 7, -4, 0, 11, 15, 1, 0, 4, 20, 3),
		Jp(0, 7, 8, -4, 0, 12, 17, 2, 0, 5, 22, 4),
		Jp(0, 7, 8, -4, 0, 13, 19, 2, 0, 5, 24, 4),
		Jp(0, 7, 9, -4, 0, 14, 21, 2, 0, 5, 26, 4),
		Jp(0, 8, 9, -5, 0, 15, 22, 2, 0, 6, 28, 5),
		Jp(0, 8, 10, -5, 0, 16, 24, 2, 0, 6, 30, 5),
		Jp(0, 8, 11, -5, 0, 17, 26, 2, 0, 6, 32, 5),
		Jp(0, 9, 11, -5, 0, 18, 28, 2, 0, 7, 34, 6),
		Jp(0, 9, 12, -6, 0, 19, 29, 2, 0, 7, 36, 6),
		Jp(0, 10, 13, -6, 0, 20, 31, 3, 0, 8, 38, 7),
		Jp(0, 10, 13, -6, 0, 21, 33, 3, 0, 8, 40, 7),
		Jp(0, 10, 14, -6, 0, 22, 35, 3, 0, 8, 42, 7),
		Jp(0, 11, 14, -7, 0, 23, 36, 3, 0, 9, 44, 8),
		Jp(0, 11, 15, -7, 0, 24, 38, 3, 0, 9, 46, 8)
	];
}));
//#endregion
//#region node_modules/@mui/material/styles/createTransitions.js
function em(e) {
	return `${Math.round(e)}ms`;
}
function tm(e) {
	if (!e) return 0;
	let t = e / 36;
	return Math.round((4 + 15 * t ** .25 + t / 5) * 10);
}
function nm(e) {
	let t = B({}, im, e.easing), n = B({}, am, e.duration);
	return B({
		getAutoHeightDuration: tm,
		create: (e = ["all"], r = {}) => {
			let { duration: i = n.standard, easing: a = t.easeInOut, delay: o = 0 } = r;
			return H(r, rm), (Array.isArray(e) ? e : [e]).map((e) => `${e} ${typeof i == "string" ? i : em(i)} ${a} ${typeof o == "string" ? o : em(o)}`).join(",");
		}
	}, e, {
		easing: t,
		duration: n
	});
}
var rm, im, am, om = w((() => {
	U(), V(), rm = [
		"duration",
		"easing",
		"delay"
	], im = {
		easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
		easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
		easeIn: "cubic-bezier(0.4, 0, 1, 1)",
		sharp: "cubic-bezier(0.4, 0, 0.6, 1)"
	}, am = {
		shortest: 150,
		shorter: 200,
		short: 250,
		standard: 300,
		complex: 375,
		enteringScreen: 225,
		leavingScreen: 195
	};
})), sm, cm = w((() => {
	sm = {
		mobileStepper: 1e3,
		fab: 1050,
		speedDial: 1050,
		appBar: 1100,
		drawer: 1200,
		modal: 1300,
		snackbar: 1400,
		tooltip: 1500
	};
}));
//#endregion
//#region node_modules/@mui/material/styles/createTheme.js
function lm(e = {}, ...t) {
	let { mixins: n = {}, palette: r = {}, transitions: i = {}, typography: a = {} } = e, o = H(e, um);
	if (e.vars && e.generateCssVars === void 0) throw Error(ca(18));
	let s = Ip(r), c = Qf(e), l = ra(c, {
		mixins: up(c.breakpoints, n),
		palette: s,
		shadows: Qp.slice(),
		typography: Up(s, a),
		transitions: nm(i),
		zIndex: B({}, sm)
	});
	return l = ra(l, o), l = t.reduce((e, t) => ra(e, t), l), l.unstable_sxConfig = B({}, Uf, o == null ? void 0 : o.unstable_sxConfig), l.unstable_sx = function(e) {
		return Jf({
			sx: e,
			theme: this
		});
	}, l;
}
var um, dm = w((() => {
	V(), U(), da(), sa(), cp(), np(), dp(), Vp(), qp(), $p(), om(), cm(), um = [
		"breakpoints",
		"mixins",
		"spacing",
		"palette",
		"transitions",
		"typography",
		"shape"
	];
})), fm, pm = w((() => {
	dm(), fm = lm();
})), mm, hm = w((() => {
	mm = "$$material";
}));
//#endregion
//#region node_modules/@mui/material/styles/slotShouldForwardProp.js
function gm(e) {
	return e !== "ownerState" && e !== "theme" && e !== "sx" && e !== "as";
}
var _m = w((() => {})), vm, ym = w((() => {
	_m(), vm = (e) => gm(e) && e !== "classes";
})), bm, Y, xm = w((() => {
	bm = /* @__PURE__ */ O(lp()), pm(), hm(), ym(), _m(), Y = (0, bm.default)({
		themeId: mm,
		defaultTheme: fm,
		rootShouldForwardProp: vm
	});
}));
//#endregion
//#region node_modules/@mui/material/SvgIcon/svgIconClasses.js
function Sm(e) {
	return ms("MuiSvgIcon", e);
}
var Cm = w((() => {
	bs(), _s(), vs("MuiSvgIcon", [
		"root",
		"colorPrimary",
		"colorSecondary",
		"colorAction",
		"colorError",
		"colorDisabled",
		"fontSizeInherit",
		"fontSizeSmall",
		"fontSizeMedium",
		"fontSizeLarge"
	]);
})), wm, Tm, Em, Dm, Om, km, Am, jm = w((() => {
	V(), U(), wm = /* @__PURE__ */ O(ea()), Ms(), cs(), ec(), K(), xm(), Cm(), Tm = ic(), Em = ic(), Dm = [
		"children",
		"className",
		"color",
		"component",
		"fontSize",
		"htmlColor",
		"inheritViewBox",
		"titleAccess",
		"viewBox"
	], Om = (e) => {
		let { color: t, fontSize: n, classes: r } = e;
		return os({ root: [
			"root",
			t !== "inherit" && `color${G(t)}`,
			`fontSize${G(n)}`
		] }, Sm, r);
	}, km = Y("svg", {
		name: "MuiSvgIcon",
		slot: "Root",
		overridesResolver: (e, t) => {
			let { ownerState: n } = e;
			return [
				t.root,
				n.color !== "inherit" && t[`color${G(n.color)}`],
				t[`fontSize${G(n.fontSize)}`]
			];
		}
	})(({ theme: e, ownerState: t }) => {
		var n, r, i, a, o, s, c, l, u, d, f, p, m;
		return {
			userSelect: "none",
			width: "1em",
			height: "1em",
			display: "inline-block",
			fill: t.hasSvgAsChild ? void 0 : "currentColor",
			flexShrink: 0,
			transition: (n = e.transitions) == null || (r = n.create) == null ? void 0 : r.call(n, "fill", { duration: (i = e.transitions) == null || (i = i.duration) == null ? void 0 : i.shorter }),
			fontSize: {
				inherit: "inherit",
				small: ((a = e.typography) == null || (o = a.pxToRem) == null ? void 0 : o.call(a, 20)) || "1.25rem",
				medium: ((s = e.typography) == null || (c = s.pxToRem) == null ? void 0 : c.call(s, 24)) || "1.5rem",
				large: ((l = e.typography) == null || (u = l.pxToRem) == null ? void 0 : u.call(l, 35)) || "2.1875rem"
			}[t.fontSize],
			color: (d = (f = (e.vars || e).palette) == null || (f = f[t.color]) == null ? void 0 : f.main) == null ? {
				action: (p = (e.vars || e).palette) == null || (p = p.action) == null ? void 0 : p.active,
				disabled: (m = (e.vars || e).palette) == null || (m = m.action) == null ? void 0 : m.disabled,
				inherit: void 0
			}[t.color] : d
		};
	}), Am = /*#__PURE__*/ wm.forwardRef(function(e, t) {
		let n = pc({
			props: e,
			name: "MuiSvgIcon"
		}), { children: r, className: i, color: a = "inherit", component: o = "svg", fontSize: s = "medium", htmlColor: c, inheritViewBox: l = !1, titleAccess: u, viewBox: d = "0 0 24 24" } = n, f = H(n, Dm), p = /*#__PURE__*/ wm.isValidElement(r) && r.type === "svg", m = B({}, n, {
			color: a,
			component: o,
			fontSize: s,
			instanceFontSize: e.fontSize,
			inheritViewBox: l,
			viewBox: d,
			hasSvgAsChild: p
		}), h = {};
		l || (h.viewBox = d);
		let g = Om(m);
		return /*#__PURE__*/ (0, Em.jsxs)(km, B({
			as: o,
			className: W(g.root, i),
			focusable: "false",
			color: c,
			"aria-hidden": !u || void 0,
			role: u ? "img" : void 0,
			ref: t
		}, h, f, p && r.props, {
			ownerState: m,
			children: [p ? r.props.children : r, u ? /*#__PURE__*/ (0, Tm.jsx)("title", { children: u }) : null]
		}));
	}), Am.muiName = "SvgIcon";
})), Mm = w((() => {
	jm(), Cm(), Cm();
}));
//#endregion
//#region node_modules/@mui/material/utils/createSvgIcon.js
function Nm(e, t) {
	function n(n, r) {
		return /*#__PURE__*/ (0, Fm.jsx)(Am, B({
			"data-testid": `${t}Icon`,
			ref: r
		}, n, { children: e }));
	}
	return n.muiName = Am.muiName, /*#__PURE__*/ Pm.memo(/*#__PURE__*/ Pm.forwardRef(n));
}
var Pm, Fm, Im = w((() => {
	V(), Pm = /* @__PURE__ */ O(ea()), Mm(), Fm = ic();
})), Lm, Rm = w((() => {
	Ma(), Lm = Aa;
})), zm, Bm = w((() => {
	Fa(), zm = Na;
})), Vm, Hm = w((() => {
	za(), Vm = Ia;
})), Um, Wm = w((() => {
	Ha(), Um = Ba;
})), Gm, Km = w((() => {
	Ga(), Gm = Ua;
})), qm, Jm = w((() => {
	Ja(), qm = Ka;
})), Ym, Xm = w((() => {
	Za(), Ym = Ya;
})), Zm, Qm = w((() => {
	to(), Zm = $a;
})), $m, eh = w((() => {
	co(), $m = ro;
})), th, nh = w((() => {
	fo(), th = lo;
})), rh, ih = w((() => {
	go(), rh = po;
})), ah, oh = w((() => {
	bo(), ah = _o;
})), sh, ch = w((() => {
	wo(), sh = xo;
})), lh, uh = w((() => {
	Xo(), lh = Uo;
})), dh = /* @__PURE__ */ E({
	capitalize: () => G,
	createChainedFunction: () => tc,
	createSvgIcon: () => Nm,
	debounce: () => Lm,
	deprecatedPropType: () => zm,
	isMuiElement: () => Vm,
	ownerDocument: () => Um,
	ownerWindow: () => Gm,
	requirePropFactory: () => qm,
	setRef: () => Ym,
	unstable_ClassNameGenerator: () => fh,
	unstable_useEnhancedEffect: () => Zm,
	unstable_useId: () => $m,
	unsupportedProp: () => th,
	useControlled: () => rh,
	useEventCallback: () => ah,
	useForkRef: () => sh,
	useIsFocusVisible: () => lh
}), fh, ph = w((() => {
	$s(), ec(), nc(), Im(), Rm(), Bm(), Hm(), Wm(), Km(), Jm(), Xm(), Qm(), eh(), nh(), ih(), oh(), ch(), uh(), fh = { configure: (e) => {
		ds.configure(e);
	} };
})), mh = /* @__PURE__ */ T(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), Object.defineProperty(e, "default", {
		enumerable: !0,
		get: function() {
			return t.createSvgIcon;
		}
	});
	var t = (ph(), k(dh));
})), hh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" }), "CheckCircle");
})), gh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" }), "Close");
})), _h = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z" }), "Error");
})), vh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2zm10 14.5V20H8v-3.5l4-4zm-4-5-4-4V4h8v3.5z" }), "HourglassEmpty");
})), yh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2M9.5 16.5v-9l7 4.5z" }), "PlayCircle");
})), bh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2M1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2" }), "ShoppingCart");
})), xh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m16 18 2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" }), "TrendingDown");
})), Sh = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m22 12-4-4v3H3v2h15v3z" }), "TrendingFlat");
})), Ch = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" }), "TrendingUp");
})), X = /* @__PURE__ */ O(ea());
pd();
function wh(e) {
	return Object.keys(e).length === 0;
}
function Th(e = null) {
	let t = X.useContext(Su);
	return !t || wh(t) ? e : t;
}
//#endregion
//#region node_modules/@mui/system/esm/useTheme.js
np();
var Eh = Qf();
function Dh(e = Eh) {
	return Th(e);
}
//#endregion
//#region node_modules/@mui/system/esm/GlobalStyles/GlobalStyles.js
pd();
var Z = ic();
function Oh(e) {
	let t = ud(e);
	return e !== t && t.styles ? (t.styles.match(/^@layer\s+[^{]*$/) || (t.styles = `@layer global{${t.styles}}`), t) : e;
}
function kh({ styles: e, themeId: t, defaultTheme: n = {} }) {
	let r = Dh(n), i = t && r[t] || r, a = typeof e == "function" ? e(i) : e;
	return i.modularCssLayers && (a = Array.isArray(a) ? a.map((e) => Oh(typeof e == "function" ? e(i) : e)) : Oh(a)), /*#__PURE__*/ (0, Z.jsx)(id, { styles: a });
}
V(), U(), Ms(), pd(), cp();
var Ah = ["className", "component"];
function jh(e = {}) {
	let { themeId: t, defaultTheme: n, defaultClassName: r = "MuiBox-root", generateClassName: i } = e, a = ld("div", { shouldForwardProp: (e) => e !== "theme" && e !== "sx" && e !== "as" })(Jf);
	return /* @__PURE__ */ X.forwardRef(function(e, o) {
		let s = Dh(n), c = rp(e), { className: l, component: u = "div" } = c, d = H(c, Ah);
		return /*#__PURE__*/ (0, Z.jsx)(a, B({
			as: u,
			ref: o,
			className: W(l, i ? i(r) : r),
			theme: t && s[t] || s
		}, d));
	});
}
//#endregion
//#region node_modules/@mui/system/esm/useThemeProps/getThemeProps.js
as();
function Mh(e) {
	let { theme: t, name: n, props: r } = e;
	return !t || !t.components || !t.components[n] || !t.components[n].defaultProps ? r : rs(t.components[n].defaultProps, r);
}
//#endregion
//#region node_modules/@mui/system/esm/useMediaQuery/useMediaQuery.js
to();
function Nh(e, t, n, r, i) {
	let [a, o] = X.useState(() => i && n ? n(e).matches : r ? r(e).matches : t);
	return $a(() => {
		let t = !0;
		if (!n) return;
		let r = n(e), i = () => {
			t && o(r.matches);
		};
		return i(), r.addListener(i), () => {
			t = !1, r.removeListener(i);
		};
	}, [e, n]), a;
}
var Ph = X.useSyncExternalStore;
function Fh(e, t, n, r, i) {
	let a = X.useCallback(() => t, [t]), o = X.useMemo(() => {
		if (i && n) return () => n(e).matches;
		if (r !== null) {
			let { matches: t } = r(e);
			return () => t;
		}
		return a;
	}, [
		a,
		e,
		r,
		i,
		n
	]), [s, c] = X.useMemo(() => {
		if (n === null) return [a, () => () => {}];
		let t = n(e);
		return [() => t.matches, (e) => (t.addListener(e), () => {
			t.removeListener(e);
		})];
	}, [
		a,
		n,
		e
	]);
	return Ph(c, s, o);
}
function Ih(e, t = {}) {
	let n = Th(), r = typeof window < "u" && window.matchMedia !== void 0, { defaultMatches: i = !1, matchMedia: a = r ? window.matchMedia : null, ssrMatchMedia: o = null, noSsr: s = !1 } = Mh({
		name: "MuiUseMediaQuery",
		props: t,
		theme: n
	}), c = typeof e == "function" ? e(n) : e;
	return c = c.replace(/^@media( ?)/m, ""), (Ph === void 0 ? Nh : Fh)(c, i, a, o, s);
}
da(), ws();
function Lh(e, t = 0, n = 1) {
	return xs(e, t, n);
}
function Rh(e) {
	e = e.slice(1);
	let t = RegExp(`.{1,${e.length >= 6 ? 2 : 1}}`, "g"), n = e.match(t);
	return n && n[0].length === 1 && (n = n.map((e) => e + e)), n ? `rgb${n.length === 4 ? "a" : ""}(${n.map((e, t) => t < 3 ? parseInt(e, 16) : Math.round(parseInt(e, 16) / 255 * 1e3) / 1e3).join(", ")})` : "";
}
function zh(e) {
	if (e.type) return e;
	if (e.charAt(0) === "#") return zh(Rh(e));
	let t = e.indexOf("("), n = e.substring(0, t);
	if ([
		"rgb",
		"rgba",
		"hsl",
		"hsla",
		"color"
	].indexOf(n) === -1) throw Error(ca(9, e));
	let r = e.substring(t + 1, e.length - 1), i;
	if (n === "color") {
		if (r = r.split(" "), i = r.shift(), r.length === 4 && r[3].charAt(0) === "/" && (r[3] = r[3].slice(1)), [
			"srgb",
			"display-p3",
			"a98-rgb",
			"prophoto-rgb",
			"rec-2020"
		].indexOf(i) === -1) throw Error(ca(10, i));
	} else r = r.split(",");
	return r = r.map((e) => parseFloat(e)), {
		type: n,
		values: r,
		colorSpace: i
	};
}
function Bh(e) {
	let { type: t, colorSpace: n } = e, { values: r } = e;
	return t.indexOf("rgb") === -1 ? t.indexOf("hsl") !== -1 && (r[1] = `${r[1]}%`, r[2] = `${r[2]}%`) : r = r.map((e, t) => t < 3 ? parseInt(e, 10) : e), r = t.indexOf("color") === -1 ? `${r.join(", ")}` : `${n} ${r.join(" ")}`, `${t}(${r})`;
}
function Vh(e, t) {
	return e = zh(e), t = Lh(t), (e.type === "rgb" || e.type === "hsl") && (e.type += "a"), e.type === "color" ? e.values[3] = `/${t}` : e.values[3] = t, Bh(e);
}
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/useTheme/ThemeContext.js
var Hh = /*#__PURE__*/ X.createContext(null);
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/useTheme/useTheme.js
function Uh() {
	return X.useContext(Hh);
}
var Wh = typeof Symbol == "function" && Symbol.for ? Symbol.for("mui.nested") : "__THEME_NESTED__";
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/ThemeProvider/ThemeProvider.js
V();
function Gh(e, t) {
	return typeof t == "function" ? t(e) : B({}, e, t);
}
function Kh(e) {
	let { children: t, theme: n } = e, r = Uh(), i = X.useMemo(() => {
		let e = r === null ? n : Gh(r, n);
		return e != null && (e[Wh] = r !== null), e;
	}, [n, r]);
	return /*#__PURE__*/ (0, Z.jsx)(Hh.Provider, {
		value: i,
		children: t
	});
}
V(), U();
var qh = ["value"], Jh = /*#__PURE__*/ X.createContext();
function Yh(e) {
	let { value: t } = e, n = H(e, qh);
	return /*#__PURE__*/ (0, Z.jsx)(Jh.Provider, B({ value: t == null || t }, n));
}
var Xh = () => {
	let e = X.useContext(Jh);
	return e != null && e;
};
to(), co();
function Zh(e) {
	let t = Th(), n = ro() || "", { modularCssLayers: r } = e, i = "mui.global, mui.components, mui.theme, mui.custom, mui.sx";
	return i = !r || t !== null ? "" : typeof r == "string" ? r.replace(/mui(?!\.)/g, i) : `@layer ${i};`, $a(() => {
		let e = document.querySelector("head");
		if (!e) return;
		let t = e.firstChild;
		if (i) {
			var r;
			if (t && (r = t.hasAttribute) != null && r.call(t, "data-mui-layer-order") && t.getAttribute("data-mui-layer-order") === n) return;
			let a = document.createElement("style");
			a.setAttribute("data-mui-layer-order", n), a.textContent = i, e.prepend(a);
		} else {
			var a;
			(a = e.querySelector(`style[data-mui-layer-order="${n}"]`)) == null || a.remove();
		}
	}, [i, n]), i ? /*#__PURE__*/ (0, Z.jsx)(kh, { styles: i }) : null;
}
V(), pd(), fc();
var Qh = {};
function $h(e, t, n, r = !1) {
	return X.useMemo(() => {
		let i = e && t[e] || t;
		if (typeof n == "function") {
			let a = n(i), o = e ? B({}, t, { [e]: a }) : a;
			return r ? () => o : o;
		}
		return e ? B({}, t, { [e]: n }) : B({}, t, n);
	}, [
		e,
		t,
		n,
		r
	]);
}
function eg(e) {
	let { children: t, theme: n, themeId: r } = e, i = Th(Qh), a = Uh() || Qh, o = $h(r, i, n), s = $h(r, a, n, !0), c = o.direction === "rtl", l = Zh(o);
	return /*#__PURE__*/ (0, Z.jsx)(Kh, {
		theme: s,
		children: /*#__PURE__*/ (0, Z.jsx)(Su.Provider, {
			value: o,
			children: /*#__PURE__*/ (0, Z.jsx)(Yh, {
				value: c,
				children: /*#__PURE__*/ (0, Z.jsxs)(ac, {
					value: o == null ? void 0 : o.components,
					children: [l, t]
				})
			})
		})
	});
}
//#endregion
//#region node_modules/@mui/material/styles/cssUtils.js
function tg(e) {
	return String(parseFloat(e)).length === String(e).length;
}
function ng(e) {
	return String(e).match(/[\d.\-+]*\s*(.*)/)[1] || "";
}
function rg(e) {
	return parseFloat(e);
}
function ig(e) {
	return (t, n) => {
		let r = ng(t);
		if (r === n) return t;
		let i = rg(t);
		r !== "px" && (r === "em" || r === "rem") && (i = rg(t) * rg(e));
		let a = i;
		if (n !== "px") {
			if (n === "em") a = i / rg(e);
			else if (n === "rem") a = i / rg(e);
			else return t;
		}
		return parseFloat(a.toFixed(5)) + n;
	};
}
function ag({ size: e, grid: t }) {
	let n = e - e % t, r = n + t;
	return e - n < r - e ? n : r;
}
function og({ lineHeight: e, pixels: t, htmlFontSize: n }) {
	return t / (e * n);
}
function sg({ cssProperty: e, min: t, max: n, unit: r = "rem", breakpoints: i = [
	600,
	900,
	1200
], transform: a = null }) {
	let o = { [e]: `${t}${r}` }, s = (n - t) / i[i.length - 1];
	return i.forEach((n) => {
		let i = t + s * n;
		a !== null && (i = a(i)), o[`@media (min-width:${n}px)`] = { [e]: `${Math.round(i * 1e4) / 1e4}${r}` };
	}), o;
}
V(), da();
function cg(e, t = {}) {
	let { breakpoints: n = [
		"sm",
		"md",
		"lg"
	], disableAlign: r = !1, factor: i = 2, variants: a = [
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"subtitle1",
		"subtitle2",
		"body1",
		"body2",
		"caption",
		"button",
		"overline"
	] } = t, o = B({}, e);
	o.typography = B({}, o.typography);
	let s = o.typography, c = ig(s.htmlFontSize), l = n.map((e) => o.breakpoints.values[e]);
	return a.forEach((e) => {
		let t = s[e];
		if (!t) return;
		let n = parseFloat(c(t.fontSize, "rem"));
		if (n <= 1) return;
		let a = n, o = 1 + (a - 1) / i, { lineHeight: u } = t;
		if (!tg(u) && !r) throw Error(ca(6));
		tg(u) || (u = parseFloat(c(u, "rem")) / parseFloat(n));
		let d = null;
		r || (d = (e) => ag({
			size: e,
			grid: og({
				pixels: 4,
				lineHeight: u,
				htmlFontSize: s.htmlFontSize
			})
		})), s[e] = B({}, t, sg({
			cssProperty: "fontSize",
			min: o,
			max: a,
			unit: "rem",
			breakpoints: l,
			transform: d
		}));
	}), o;
}
pm(), hm();
function lg() {
	let e = Dh(fm);
	return e.$$material || e;
}
V(), U(), hm();
var ug = ["theme"];
function dg(e) {
	let { theme: t } = e, n = H(e, ug), r = t[mm], i = r || t;
	return typeof t != "function" && (r && !r.vars ? i = B({}, r, { vars: null }) : t && !t.vars && (i = B({}, t, { vars: null }))), /*#__PURE__*/ (0, Z.jsx)(eg, B({}, n, {
		themeId: r ? mm : void 0,
		theme: i
	}));
}
//#endregion
//#region node_modules/@mui/material/styles/getOverlayAlpha.js
var fg = (e) => {
	let t;
	return t = e < 1 ? 5.11916 * e ** 2 : 4.5 * Math.log(e + 1) + 2, (t / 100).toFixed(2);
};
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function pg(e, t) {
	return pg = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(e, t) {
		return e.__proto__ = t, e;
	}, pg(e, t);
}
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function mg(e, t) {
	e.prototype = Object.create(t.prototype), e.prototype.constructor = e, pg(e, t);
}
//#endregion
//#region node_modules/scheduler/cjs/scheduler.production.min.js
var hg = /* @__PURE__ */ T(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = typeof setTimeout == "function" ? setTimeout : null, _ = typeof clearTimeout == "function" ? clearTimeout : null, v = typeof setImmediate < "u" ? setImmediate : null;
	typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
	function y(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function b(e) {
		if (h = !1, y(e), !m) {
			if (n(c) !== null) m = !0, M(x);
			else {
				var t = n(l);
				t !== null && N(b, t.startTime - e);
			}
		}
	}
	function x(t, i) {
		m = !1, h && (h = !1, _(w), w = -1), p = !0;
		var a = f;
		try {
			for (y(i), d = n(c); d !== null && (!(d.expirationTime > i) || t && !D());) {
				var o = d.callback;
				if (typeof o == "function") {
					d.callback = null, f = d.priorityLevel;
					var s = o(d.expirationTime <= i);
					i = e.unstable_now(), typeof s == "function" ? d.callback = s : d === n(c) && r(c), y(i);
				} else r(c);
				d = n(c);
			}
			if (d !== null) var u = !0;
			else {
				var g = n(l);
				g !== null && N(b, g.startTime - i), u = !1;
			}
			return u;
		} finally {
			d = null, f = a, p = !1;
		}
	}
	var S = !1, C = null, w = -1, T = 5, E = -1;
	function D() {
		return !(e.unstable_now() - E < T);
	}
	function O() {
		if (C !== null) {
			var t = e.unstable_now();
			E = t;
			var n = !0;
			try {
				n = C(!0, t);
			} finally {
				n ? k() : (S = !1, C = null);
			}
		} else S = !1;
	}
	var k;
	if (typeof v == "function") k = function() {
		v(O);
	};
	else if (typeof MessageChannel < "u") {
		var A = new MessageChannel(), j = A.port2;
		A.port1.onmessage = O, k = function() {
			j.postMessage(null);
		};
	} else k = function() {
		g(O, 0);
	};
	function M(e) {
		C = e, S || (S = !0, k());
	}
	function N(t, n) {
		w = g(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_continueExecution = function() {
		m || p || (m = !0, M(x));
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : T = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_getFirstCallbackNode = function() {
		return n(c);
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_pauseExecution = function() {}, e.unstable_requestPaint = function() {}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (_(w), w = -1) : h = !0, N(b, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, M(x))), r;
	}, e.unstable_shouldYield = D, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), gg = /* @__PURE__ */ T(((e, t) => {
	t.exports = hg();
})), _g = /* @__PURE__ */ T(((e) => {
	var t = ea(), n = gg();
	function r(e) {
		for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	var i = /* @__PURE__ */ new Set(), a = {};
	function o(e, t) {
		s(e, t), s(e + "Capture", t);
	}
	function s(e, t) {
		for (a[e] = t, e = 0; e < t.length; e++) i.add(t[e]);
	}
	var c = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, l = Object.prototype.hasOwnProperty, u = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, d = {}, f = {};
	function p(e) {
		return l.call(f, e) ? !0 : l.call(d, e) ? !1 : u.test(e) ? f[e] = !0 : (d[e] = !0, !1);
	}
	function m(e, t, n, r) {
		if (n !== null && n.type === 0) return !1;
		switch (typeof t) {
			case "function":
			case "symbol": return !0;
			case "boolean": return r ? !1 : n === null ? (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-") : !n.acceptsBooleans;
			default: return !1;
		}
	}
	function h(e, t, n, r) {
		if (t == null || m(e, t, n, r)) return !0;
		if (r) return !1;
		if (n !== null) switch (n.type) {
			case 3: return !t;
			case 4: return !1 === t;
			case 5: return isNaN(t);
			case 6: return isNaN(t) || 1 > t;
		}
		return !1;
	}
	function g(e, t, n, r, i, a, o) {
		this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = i, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = a, this.removeEmptyString = o;
	}
	var _ = {};
	"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
		_[e] = new g(e, 0, !1, e, null, !1, !1);
	}), [
		["acceptCharset", "accept-charset"],
		["className", "class"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"]
	].forEach(function(e) {
		var t = e[0];
		_[t] = new g(t, 1, !1, e[1], null, !1, !1);
	}), [
		"contentEditable",
		"draggable",
		"spellCheck",
		"value"
	].forEach(function(e) {
		_[e] = new g(e, 2, !1, e.toLowerCase(), null, !1, !1);
	}), [
		"autoReverse",
		"externalResourcesRequired",
		"focusable",
		"preserveAlpha"
	].forEach(function(e) {
		_[e] = new g(e, 2, !1, e, null, !1, !1);
	}), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
		_[e] = new g(e, 3, !1, e.toLowerCase(), null, !1, !1);
	}), [
		"checked",
		"multiple",
		"muted",
		"selected"
	].forEach(function(e) {
		_[e] = new g(e, 3, !0, e, null, !1, !1);
	}), ["capture", "download"].forEach(function(e) {
		_[e] = new g(e, 4, !1, e, null, !1, !1);
	}), [
		"cols",
		"rows",
		"size",
		"span"
	].forEach(function(e) {
		_[e] = new g(e, 6, !1, e, null, !1, !1);
	}), ["rowSpan", "start"].forEach(function(e) {
		_[e] = new g(e, 5, !1, e.toLowerCase(), null, !1, !1);
	});
	var v = /[\-:]([a-z])/g;
	function y(e) {
		return e[1].toUpperCase();
	}
	"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
		var t = e.replace(v, y);
		_[t] = new g(t, 1, !1, e, null, !1, !1);
	}), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
		var t = e.replace(v, y);
		_[t] = new g(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
	}), [
		"xml:base",
		"xml:lang",
		"xml:space"
	].forEach(function(e) {
		var t = e.replace(v, y);
		_[t] = new g(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
	}), ["tabIndex", "crossOrigin"].forEach(function(e) {
		_[e] = new g(e, 1, !1, e.toLowerCase(), null, !1, !1);
	}), _.xlinkHref = new g("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), [
		"src",
		"href",
		"action",
		"formAction"
	].forEach(function(e) {
		_[e] = new g(e, 1, !1, e.toLowerCase(), null, !0, !0);
	});
	function b(e, t, n, r) {
		var i = _.hasOwnProperty(t) ? _[t] : null;
		(i === null ? r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N" : i.type !== 0) && (h(t, n, i, r) && (n = null), r || i === null ? p(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : i.mustUseProperty ? e[i.propertyName] = n === null ? i.type !== 3 && "" : n : (t = i.attributeName, r = i.attributeNamespace, n === null ? e.removeAttribute(t) : (i = i.type, n = i === 3 || i === 4 && !0 === n ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
	}
	var x = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, S = Symbol.for("react.element"), C = Symbol.for("react.portal"), w = Symbol.for("react.fragment"), T = Symbol.for("react.strict_mode"), E = Symbol.for("react.profiler"), D = Symbol.for("react.provider"), O = Symbol.for("react.context"), k = Symbol.for("react.forward_ref"), A = Symbol.for("react.suspense"), j = Symbol.for("react.suspense_list"), M = Symbol.for("react.memo"), N = Symbol.for("react.lazy"), P = Symbol.for("react.offscreen"), ee = Symbol.iterator;
	function te(e) {
		return typeof e != "object" || !e ? null : (e = ee && e[ee] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var F = Object.assign, ne;
	function I(e) {
		if (ne === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			ne = t && t[1] || "";
		}
		return "\n" + ne + e;
	}
	var L = !1;
	function re(e, t) {
		if (!e || L) return "";
		L = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			if (t) {
				if (t = function() {
					throw Error();
				}, Object.defineProperty(t.prototype, "props", { set: function() {
					throw Error();
				} }), typeof Reflect == "object" && Reflect.construct) {
					try {
						Reflect.construct(t, []);
					} catch (e) {
						var r = e;
					}
					Reflect.construct(e, [], t);
				} else {
					try {
						t.call();
					} catch (e) {
						r = e;
					}
					e.call(t.prototype);
				}
			} else {
				try {
					throw Error();
				} catch (e) {
					r = e;
				}
				e();
			}
		} catch (t) {
			if (t && r && typeof t.stack == "string") {
				for (var i = t.stack.split("\n"), a = r.stack.split("\n"), o = i.length - 1, s = a.length - 1; 1 <= o && 0 <= s && i[o] !== a[s];) s--;
				for (; 1 <= o && 0 <= s; o--, s--) if (i[o] !== a[s]) {
					if (o !== 1 || s !== 1) do
						if (o--, s--, 0 > s || i[o] !== a[s]) {
							var c = "\n" + i[o].replace(" at new ", " at ");
							return e.displayName && c.includes("<anonymous>") && (c = c.replace("<anonymous>", e.displayName)), c;
						}
					while (1 <= o && 0 <= s);
					break;
				}
			}
		} finally {
			L = !1, Error.prepareStackTrace = n;
		}
		return (e = e ? e.displayName || e.name : "") ? I(e) : "";
	}
	function ie(e) {
		switch (e.tag) {
			case 5: return I(e.type);
			case 16: return I("Lazy");
			case 13: return I("Suspense");
			case 19: return I("SuspenseList");
			case 0:
			case 2:
			case 15: return e = re(e.type, !1), e;
			case 11: return e = re(e.type.render, !1), e;
			case 1: return e = re(e.type, !0), e;
			default: return "";
		}
	}
	function ae(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case w: return "Fragment";
			case C: return "Portal";
			case E: return "Profiler";
			case T: return "StrictMode";
			case A: return "Suspense";
			case j: return "SuspenseList";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case O: return (e.displayName || "Context") + ".Consumer";
			case D: return (e._context.displayName || "Context") + ".Provider";
			case k:
				var t = e.render;
				return e = e.displayName, e || (e = t.displayName || t.name || "", e = e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case M: return t = e.displayName || null, t === null ? ae(e.type) || "Memo" : t;
			case N:
				t = e._payload, e = e._init;
				try {
					return ae(e(t));
				} catch {}
		}
		return null;
	}
	function oe(e) {
		var t = e.type;
		switch (e.tag) {
			case 24: return "Cache";
			case 9: return (t.displayName || "Context") + ".Consumer";
			case 10: return (t._context.displayName || "Context") + ".Provider";
			case 18: return "DehydratedFragment";
			case 11: return e = t.render, e = e.displayName || e.name || "", t.displayName || (e === "" ? "ForwardRef" : "ForwardRef(" + e + ")");
			case 7: return "Fragment";
			case 5: return t;
			case 4: return "Portal";
			case 3: return "Root";
			case 6: return "Text";
			case 16: return ae(t);
			case 8: return t === T ? "StrictMode" : "Mode";
			case 22: return "Offscreen";
			case 12: return "Profiler";
			case 21: return "Scope";
			case 13: return "Suspense";
			case 19: return "SuspenseList";
			case 25: return "TracingMarker";
			case 1:
			case 0:
			case 17:
			case 2:
			case 14:
			case 15:
				if (typeof t == "function") return t.displayName || t.name || null;
				if (typeof t == "string") return t;
		}
		return null;
	}
	function se(e) {
		switch (typeof e) {
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function ce(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function le(e) {
		var t = ce(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
		if (!e.hasOwnProperty(t) && n !== void 0 && typeof n.get == "function" && typeof n.set == "function") {
			var i = n.get, a = n.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					r = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: n.enumerable }), {
				getValue: function() {
					return r;
				},
				setValue: function(e) {
					r = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function ue(e) {
		e._valueTracker || (e._valueTracker = le(e));
	}
	function de(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = ce(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	function fe(e) {
		if (e = e || (typeof document < "u" ? document : void 0), e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function pe(e, t) {
		var n = t.checked;
		return F({}, t, {
			defaultChecked: void 0,
			defaultValue: void 0,
			value: void 0,
			checked: n == null ? e._wrapperState.initialChecked : n
		});
	}
	function me(e, t) {
		var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked == null ? t.defaultChecked : t.checked;
		n = se(t.value == null ? n : t.value), e._wrapperState = {
			initialChecked: r,
			initialValue: n,
			controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null
		};
	}
	function he(e, t) {
		t = t.checked, t != null && b(e, "checked", t, !1);
	}
	function ge(e, t) {
		he(e, t);
		var n = se(t.value), r = t.type;
		if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
		else if (r === "submit" || r === "reset") {
			e.removeAttribute("value");
			return;
		}
		t.hasOwnProperty("value") ? ve(e, t.type, n) : t.hasOwnProperty("defaultValue") && ve(e, t.type, se(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
	}
	function _e(e, t, n) {
		if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
			var r = t.type;
			if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
			t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
		}
		n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
	}
	function ve(e, t, n) {
		(t !== "number" || fe(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
	}
	var ye = Array.isArray;
	function be(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + se(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function xe(e, t) {
		if (t.dangerouslySetInnerHTML != null) throw Error(r(91));
		return F({}, t, {
			value: void 0,
			defaultValue: void 0,
			children: "" + e._wrapperState.initialValue
		});
	}
	function Se(e, t) {
		var n = t.value;
		if (n == null) {
			if (n = t.children, t = t.defaultValue, n != null) {
				if (t != null) throw Error(r(92));
				if (ye(n)) {
					if (1 < n.length) throw Error(r(93));
					n = n[0];
				}
				t = n;
			}
			t == null && (t = ""), n = t;
		}
		e._wrapperState = { initialValue: se(n) };
	}
	function Ce(e, t) {
		var n = se(t.value), r = se(t.defaultValue);
		n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
	}
	function we(e) {
		var t = e.textContent;
		t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
	}
	function Te(e) {
		switch (e) {
			case "svg": return "http://www.w3.org/2000/svg";
			case "math": return "http://www.w3.org/1998/Math/MathML";
			default: return "http://www.w3.org/1999/xhtml";
		}
	}
	function Ee(e, t) {
		return e == null || e === "http://www.w3.org/1999/xhtml" ? Te(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
	}
	var De, Oe = function(e) {
		return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, i) {
			MSApp.execUnsafeLocalFunction(function() {
				return e(t, n, r, i);
			});
		} : e;
	}(function(e, t) {
		if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
		else {
			for (De = De || document.createElement("div"), De.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = De.firstChild; e.firstChild;) e.removeChild(e.firstChild);
			for (; t.firstChild;) e.appendChild(t.firstChild);
		}
	});
	function ke(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var Ae = {
		animationIterationCount: !0,
		aspectRatio: !0,
		borderImageOutset: !0,
		borderImageSlice: !0,
		borderImageWidth: !0,
		boxFlex: !0,
		boxFlexGroup: !0,
		boxOrdinalGroup: !0,
		columnCount: !0,
		columns: !0,
		flex: !0,
		flexGrow: !0,
		flexPositive: !0,
		flexShrink: !0,
		flexNegative: !0,
		flexOrder: !0,
		gridArea: !0,
		gridRow: !0,
		gridRowEnd: !0,
		gridRowSpan: !0,
		gridRowStart: !0,
		gridColumn: !0,
		gridColumnEnd: !0,
		gridColumnSpan: !0,
		gridColumnStart: !0,
		fontWeight: !0,
		lineClamp: !0,
		lineHeight: !0,
		opacity: !0,
		order: !0,
		orphans: !0,
		tabSize: !0,
		widows: !0,
		zIndex: !0,
		zoom: !0,
		fillOpacity: !0,
		floodOpacity: !0,
		stopOpacity: !0,
		strokeDasharray: !0,
		strokeDashoffset: !0,
		strokeMiterlimit: !0,
		strokeOpacity: !0,
		strokeWidth: !0
	}, je = [
		"Webkit",
		"ms",
		"Moz",
		"O"
	];
	Object.keys(Ae).forEach(function(e) {
		je.forEach(function(t) {
			t = t + e.charAt(0).toUpperCase() + e.substring(1), Ae[t] = Ae[e];
		});
	});
	function Me(e, t, n) {
		return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Ae.hasOwnProperty(e) && Ae[e] ? ("" + t).trim() : t + "px";
	}
	function Ne(e, t) {
		for (var n in e = e.style, t) if (t.hasOwnProperty(n)) {
			var r = n.indexOf("--") === 0, i = Me(n, t[n], r);
			n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
		}
	}
	var Pe = F({ menuitem: !0 }, {
		area: !0,
		base: !0,
		br: !0,
		col: !0,
		embed: !0,
		hr: !0,
		img: !0,
		input: !0,
		keygen: !0,
		link: !0,
		meta: !0,
		param: !0,
		source: !0,
		track: !0,
		wbr: !0
	});
	function Fe(e, t) {
		if (t) {
			if (Pe[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(r(137, e));
			if (t.dangerouslySetInnerHTML != null) {
				if (t.children != null) throw Error(r(60));
				if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(r(61));
			}
			if (t.style != null && typeof t.style != "object") throw Error(r(62));
		}
	}
	function Ie(e, t) {
		if (e.indexOf("-") === -1) return typeof t.is == "string";
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var Le = null;
	function Re(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var ze = null, Be = null, Ve = null;
	function He(e) {
		if (e = Vi(e)) {
			if (typeof ze != "function") throw Error(r(280));
			var t = e.stateNode;
			t && (t = Ui(t), ze(e.stateNode, e.type, t));
		}
	}
	function Ue(e) {
		Be ? Ve ? Ve.push(e) : Ve = [e] : Be = e;
	}
	function We() {
		if (Be) {
			var e = Be, t = Ve;
			if (Ve = Be = null, He(e), t) for (e = 0; e < t.length; e++) He(t[e]);
		}
	}
	function Ge(e, t) {
		return e(t);
	}
	function Ke() {}
	var qe = !1;
	function Je(e, t, n) {
		if (qe) return e(t, n);
		qe = !0;
		try {
			return Ge(e, t, n);
		} finally {
			qe = !1, (Be !== null || Ve !== null) && (Ke(), We());
		}
	}
	function Ye(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var i = Ui(n);
		if (i === null) return null;
		n = i[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(i = !i.disabled) || (e = e.type, i = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !i;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(r(231, t, typeof n));
		return n;
	}
	var Xe = !1;
	if (c) try {
		var Ze = {};
		Object.defineProperty(Ze, "passive", { get: function() {
			Xe = !0;
		} }), window.addEventListener("test", Ze, Ze), window.removeEventListener("test", Ze, Ze);
	} catch {
		Xe = !1;
	}
	function Qe(e, t, n, r, i, a, o, s, c) {
		var l = Array.prototype.slice.call(arguments, 3);
		try {
			t.apply(n, l);
		} catch (e) {
			this.onError(e);
		}
	}
	var $e = !1, et = null, tt = !1, nt = null, rt = { onError: function(e) {
		$e = !0, et = e;
	} };
	function it(e, t, n, r, i, a, o, s, c) {
		$e = !1, et = null, Qe.apply(rt, arguments);
	}
	function at(e, t, n, i, a, o, s, c, l) {
		if (it.apply(this, arguments), $e) {
			if ($e) {
				var u = et;
				$e = !1, et = null;
			} else throw Error(r(198));
			tt || (tt = !0, nt = u);
		}
	}
	function ot(e) {
		var t = e, n = e;
		if (e.alternate) for (; t.return;) t = t.return;
		else {
			e = t;
			do
				t = e, t.flags & 4098 && (n = t.return), e = t.return;
			while (e);
		}
		return t.tag === 3 ? n : null;
	}
	function st(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function ct(e) {
		if (ot(e) !== e) throw Error(r(188));
	}
	function lt(e) {
		var t = e.alternate;
		if (!t) {
			if (t = ot(e), t === null) throw Error(r(188));
			return t === e ? e : null;
		}
		for (var n = e, i = t;;) {
			var a = n.return;
			if (a === null) break;
			var o = a.alternate;
			if (o === null) {
				if (i = a.return, i !== null) {
					n = i;
					continue;
				}
				break;
			}
			if (a.child === o.child) {
				for (o = a.child; o;) {
					if (o === n) return ct(a), e;
					if (o === i) return ct(a), t;
					o = o.sibling;
				}
				throw Error(r(188));
			}
			if (n.return !== i.return) n = a, i = o;
			else {
				for (var s = !1, c = a.child; c;) {
					if (c === n) {
						s = !0, n = a, i = o;
						break;
					}
					if (c === i) {
						s = !0, i = a, n = o;
						break;
					}
					c = c.sibling;
				}
				if (!s) {
					for (c = o.child; c;) {
						if (c === n) {
							s = !0, n = o, i = a;
							break;
						}
						if (c === i) {
							s = !0, i = o, n = a;
							break;
						}
						c = c.sibling;
					}
					if (!s) throw Error(r(189));
				}
			}
			if (n.alternate !== i) throw Error(r(190));
		}
		if (n.tag !== 3) throw Error(r(188));
		return n.stateNode.current === n ? e : t;
	}
	function ut(e) {
		return e = lt(e), e === null ? null : dt(e);
	}
	function dt(e) {
		if (e.tag === 5 || e.tag === 6) return e;
		for (e = e.child; e !== null;) {
			var t = dt(e);
			if (t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	var ft = n.unstable_scheduleCallback, pt = n.unstable_cancelCallback, mt = n.unstable_shouldYield, ht = n.unstable_requestPaint, gt = n.unstable_now, _t = n.unstable_getCurrentPriorityLevel, vt = n.unstable_ImmediatePriority, yt = n.unstable_UserBlockingPriority, bt = n.unstable_NormalPriority, xt = n.unstable_LowPriority, St = n.unstable_IdlePriority, Ct = null, wt = null;
	function Tt(e) {
		if (wt && typeof wt.onCommitFiberRoot == "function") try {
			wt.onCommitFiberRoot(Ct, e, void 0, (e.current.flags & 128) == 128);
		} catch {}
	}
	var Et = Math.clz32 ? Math.clz32 : kt, Dt = Math.log, Ot = Math.LN2;
	function kt(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (Dt(e) / Ot | 0) | 0;
	}
	var At = 64, jt = 4194304;
	function Mt(e) {
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 4194240;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
			case 67108864: return e & 130023424;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 1073741824;
			default: return e;
		}
	}
	function Nt(e, t) {
		var n = e.pendingLanes;
		if (n === 0) return 0;
		var r = 0, i = e.suspendedLanes, a = e.pingedLanes, o = n & 268435455;
		if (o !== 0) {
			var s = o & ~i;
			s === 0 ? (a &= o, a !== 0 && (r = Mt(a))) : r = Mt(s);
		} else o = n & ~i, o === 0 ? a !== 0 && (r = Mt(a)) : r = Mt(o);
		if (r === 0) return 0;
		if (t !== 0 && t !== r && (t & i) === 0 && (i = r & -r, a = t & -t, i >= a || i === 16 && a & 4194240)) return t;
		if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t;) n = 31 - Et(t), i = 1 << n, r |= e[n], t &= ~i;
		return r;
	}
	function Pt(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4: return t + 250;
			case 8:
			case 16:
			case 32:
			case 64:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
			case 67108864: return -1;
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function Ft(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes; 0 < a;) {
			var o = 31 - Et(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = Pt(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
	}
	function It(e) {
		return e = e.pendingLanes & -1073741825, e === 0 ? e & 1073741824 ? 1073741824 : 0 : e;
	}
	function Lt() {
		var e = At;
		return At <<= 1, !(At & 4194240) && (At = 64), e;
	}
	function Rt(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function zt(e, t, n) {
		e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - Et(t), e[t] = n;
	}
	function Bt(e, t) {
		var n = e.pendingLanes & ~t;
		e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
		var r = e.eventTimes;
		for (e = e.expirationTimes; 0 < n;) {
			var i = 31 - Et(n), a = 1 << i;
			t[i] = 0, r[i] = -1, e[i] = -1, n &= ~a;
		}
	}
	function Vt(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - Et(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	var Ht = 0;
	function Ut(e) {
		return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
	}
	var Wt, Gt, Kt, qt, Jt, Yt = !1, Xt = [], Zt = null, Qt = null, $t = null, en = /* @__PURE__ */ new Map(), tn = /* @__PURE__ */ new Map(), nn = [], rn = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
	function an(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				Zt = null;
				break;
			case "dragenter":
			case "dragleave":
				Qt = null;
				break;
			case "mouseover":
			case "mouseout":
				$t = null;
				break;
			case "pointerover":
			case "pointerout":
				en.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": tn.delete(t.pointerId);
		}
	}
	function on(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = Vi(t), t !== null && Gt(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function sn(e, t, n, r, i) {
		switch (t) {
			case "focusin": return Zt = on(Zt, e, t, n, r, i), !0;
			case "dragenter": return Qt = on(Qt, e, t, n, r, i), !0;
			case "mouseover": return $t = on($t, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return en.set(a, on(en.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, tn.set(a, on(tn.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function R(e) {
		var t = Bi(e.target);
		if (t !== null) {
			var n = ot(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = st(n), t !== null) {
						e.blockedOn = t, Jt(e.priority, function() {
							Kt(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function cn(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = yn(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				Le = r, n.target.dispatchEvent(r), Le = null;
			} else return t = Vi(n), t !== null && Gt(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function ln(e, t, n) {
		cn(e) && n.delete(t);
	}
	function un() {
		Yt = !1, Zt !== null && cn(Zt) && (Zt = null), Qt !== null && cn(Qt) && (Qt = null), $t !== null && cn($t) && ($t = null), en.forEach(ln), tn.forEach(ln);
	}
	function dn(e, t) {
		e.blockedOn === t && (e.blockedOn = null, Yt || (Yt = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, un)));
	}
	function fn(e) {
		function t(t) {
			return dn(t, e);
		}
		if (0 < Xt.length) {
			dn(Xt[0], e);
			for (var n = 1; n < Xt.length; n++) {
				var r = Xt[n];
				r.blockedOn === e && (r.blockedOn = null);
			}
		}
		for (Zt !== null && dn(Zt, e), Qt !== null && dn(Qt, e), $t !== null && dn($t, e), en.forEach(t), tn.forEach(t), n = 0; n < nn.length; n++) r = nn[n], r.blockedOn === e && (r.blockedOn = null);
		for (; 0 < nn.length && (n = nn[0], n.blockedOn === null);) R(n), n.blockedOn === null && nn.shift();
	}
	var pn = x.ReactCurrentBatchConfig, mn = !0;
	function hn(e, t, n, r) {
		var i = Ht, a = pn.transition;
		pn.transition = null;
		try {
			Ht = 1, _n(e, t, n, r);
		} finally {
			Ht = i, pn.transition = a;
		}
	}
	function gn(e, t, n, r) {
		var i = Ht, a = pn.transition;
		pn.transition = null;
		try {
			Ht = 4, _n(e, t, n, r);
		} finally {
			Ht = i, pn.transition = a;
		}
	}
	function _n(e, t, n, r) {
		if (mn) {
			var i = yn(e, t, n, r);
			if (i === null) fi(e, t, r, vn, n), an(e, r);
			else if (sn(i, e, t, n, r)) r.stopPropagation();
			else if (an(e, r), t & 4 && -1 < rn.indexOf(e)) {
				for (; i !== null;) {
					var a = Vi(i);
					if (a !== null && Wt(a), a = yn(e, t, n, r), a === null && fi(e, t, r, vn, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else fi(e, t, r, null, n);
		}
	}
	var vn = null;
	function yn(e, t, n, r) {
		if (vn = null, e = Re(r), e = Bi(e), e !== null) {
			if (t = ot(e), t === null) e = null;
			else if (n = t.tag, n === 13) {
				if (e = st(t), e !== null) return e;
				e = null;
			} else if (n === 3) {
				if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
				e = null;
			} else t !== e && (e = null);
		}
		return vn = e, null;
	}
	function bn(e) {
		switch (e) {
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "resize":
			case "seeked":
			case "submit":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 1;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "scroll":
			case "toggle":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 4;
			case "message": switch (_t()) {
				case vt: return 1;
				case yt: return 4;
				case bt:
				case xt: return 16;
				case St: return 536870912;
				default: return 16;
			}
			default: return 16;
		}
	}
	var xn = null, Sn = null, Cn = null;
	function wn() {
		if (Cn) return Cn;
		var e, t = Sn, n = t.length, r, i = "value" in xn ? xn.value : xn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return Cn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function Tn(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function En() {
		return !0;
	}
	function Dn() {
		return !1;
	}
	function On(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? En : Dn, this.isPropagationStopped = Dn, this;
		}
		return F(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = En);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = En);
			},
			persist: function() {},
			isPersistent: En
		}), t;
	}
	var kn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, An = On(kn), jn = F({}, kn, {
		view: 0,
		detail: 0
	}), Mn = On(jn), Nn, Pn, z, Fn = F({}, jn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: Kn,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== z && (z && e.type === "mousemove" ? (Nn = e.screenX - z.screenX, Pn = e.screenY - z.screenY) : Pn = Nn = 0, z = e), Nn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Pn;
		}
	}), In = On(Fn), Ln = On(F({}, Fn, { dataTransfer: 0 })), Rn = On(F({}, jn, { relatedTarget: 0 })), zn = On(F({}, kn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Bn = On(F({}, kn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Vn = On(F({}, kn, { data: 0 })), Hn = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, Un = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, Wn = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function Gn(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = Wn[e]) ? !!t[e] : !1;
	}
	function Kn() {
		return Gn;
	}
	var qn = On(F({}, jn, {
		key: function(e) {
			if (e.key) {
				var t = Hn[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = Tn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Un[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: Kn,
		charCode: function(e) {
			return e.type === "keypress" ? Tn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? Tn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), Jn = On(F({}, Fn, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), Yn = On(F({}, jn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: Kn
	})), Xn = On(F({}, kn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Zn = On(F({}, Fn, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), Qn = [
		9,
		13,
		27,
		32
	], $n = c && "CompositionEvent" in window, er = null;
	c && "documentMode" in document && (er = document.documentMode);
	var tr = c && "TextEvent" in window && !er, nr = c && (!$n || er && 8 < er && 11 >= er), rr = " ", ir = !1;
	function ar(e, t) {
		switch (e) {
			case "keyup": return Qn.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function or(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var sr = !1;
	function cr(e, t) {
		switch (e) {
			case "compositionend": return or(t);
			case "keypress": return t.which === 32 ? (ir = !0, rr) : null;
			case "textInput": return e = t.data, e === rr && ir ? null : e;
			default: return null;
		}
	}
	function lr(e, t) {
		if (sr) return e === "compositionend" || !$n && ar(e, t) ? (e = wn(), Cn = Sn = xn = null, sr = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return nr && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var ur = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function dr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!ur[e.type] : t === "textarea";
	}
	function fr(e, t, n, r) {
		Ue(r), t = mi(t, "onChange"), 0 < t.length && (n = new An("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var pr = null, mr = null;
	function hr(e) {
		oi(e, 0);
	}
	function gr(e) {
		if (de(Hi(e))) return e;
	}
	function _r(e, t) {
		if (e === "change") return t;
	}
	var vr = !1;
	if (c) {
		var yr;
		if (c) {
			var br = "oninput" in document;
			if (!br) {
				var xr = document.createElement("div");
				xr.setAttribute("oninput", "return;"), br = typeof xr.oninput == "function";
			}
			yr = br;
		} else yr = !1;
		vr = yr && (!document.documentMode || 9 < document.documentMode);
	}
	function Sr() {
		pr && (pr.detachEvent("onpropertychange", Cr), mr = pr = null);
	}
	function Cr(e) {
		if (e.propertyName === "value" && gr(mr)) {
			var t = [];
			fr(t, mr, e, Re(e)), Je(hr, t);
		}
	}
	function wr(e, t, n) {
		e === "focusin" ? (Sr(), pr = t, mr = n, pr.attachEvent("onpropertychange", Cr)) : e === "focusout" && Sr();
	}
	function Tr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return gr(mr);
	}
	function Er(e, t) {
		if (e === "click") return gr(t);
	}
	function Dr(e, t) {
		if (e === "input" || e === "change") return gr(t);
	}
	function Or(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var kr = typeof Object.is == "function" ? Object.is : Or;
	function Ar(e, t) {
		if (kr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!l.call(t, i) || !kr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function jr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Mr(e, t) {
		var n = jr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = jr(n);
		}
	}
	function Nr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Nr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Pr() {
		for (var e = window, t = fe(); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = fe(e.document);
		}
		return t;
	}
	function Fr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	function Ir(e) {
		var t = Pr(), n = e.focusedElem, r = e.selectionRange;
		if (t !== n && n && n.ownerDocument && Nr(n.ownerDocument.documentElement, n)) {
			if (r !== null && Fr(n)) {
				if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
				else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
					e = e.getSelection();
					var i = n.textContent.length, a = Math.min(r.start, i);
					r = r.end === void 0 ? a : Math.min(r.end, i), !e.extend && a > r && (i = r, r = a, a = i), i = Mr(n, a);
					var o = Mr(n, r);
					i && o && (e.rangeCount !== 1 || e.anchorNode !== i.node || e.anchorOffset !== i.offset || e.focusNode !== o.node || e.focusOffset !== o.offset) && (t = t.createRange(), t.setStart(i.node, i.offset), e.removeAllRanges(), a > r ? (e.addRange(t), e.extend(o.node, o.offset)) : (t.setEnd(o.node, o.offset), e.addRange(t)));
				}
			}
			for (t = [], e = n; e = e.parentNode;) e.nodeType === 1 && t.push({
				element: e,
				left: e.scrollLeft,
				top: e.scrollTop
			});
			for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
		}
	}
	var Lr = c && "documentMode" in document && 11 >= document.documentMode, Rr = null, zr = null, Br = null, Vr = !1;
	function Hr(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Vr || Rr == null || Rr !== fe(r) || (r = Rr, "selectionStart" in r && Fr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Br && Ar(Br, r) || (Br = r, r = mi(zr, "onSelect"), 0 < r.length && (t = new An("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Rr)));
	}
	function Ur(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var Wr = {
		animationend: Ur("Animation", "AnimationEnd"),
		animationiteration: Ur("Animation", "AnimationIteration"),
		animationstart: Ur("Animation", "AnimationStart"),
		transitionend: Ur("Transition", "TransitionEnd")
	}, Gr = {}, Kr = {};
	c && (Kr = document.createElement("div").style, "AnimationEvent" in window || (delete Wr.animationend.animation, delete Wr.animationiteration.animation, delete Wr.animationstart.animation), "TransitionEvent" in window || delete Wr.transitionend.transition);
	function qr(e) {
		if (Gr[e]) return Gr[e];
		if (!Wr[e]) return e;
		var t = Wr[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in Kr) return Gr[e] = t[n];
		return e;
	}
	var Jr = qr("animationend"), Yr = qr("animationiteration"), Xr = qr("animationstart"), Zr = qr("transitionend"), Qr = /* @__PURE__ */ new Map(), $r = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	function ei(e, t) {
		Qr.set(e, t), o(t, [e]);
	}
	for (var ti = 0; ti < $r.length; ti++) {
		var ni = $r[ti];
		ei(ni.toLowerCase(), "on" + (ni[0].toUpperCase() + ni.slice(1)));
	}
	ei(Jr, "onAnimationEnd"), ei(Yr, "onAnimationIteration"), ei(Xr, "onAnimationStart"), ei("dblclick", "onDoubleClick"), ei("focusin", "onFocus"), ei("focusout", "onBlur"), ei(Zr, "onTransitionEnd"), s("onMouseEnter", ["mouseout", "mouseover"]), s("onMouseLeave", ["mouseout", "mouseover"]), s("onPointerEnter", ["pointerout", "pointerover"]), s("onPointerLeave", ["pointerout", "pointerover"]), o("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), o("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), o("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), o("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), o("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), o("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var ri = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), ii = new Set("cancel close invalid load scroll toggle".split(" ").concat(ri));
	function ai(e, t, n) {
		var r = e.type || "unknown-event";
		e.currentTarget = n, at(r, t, void 0, e), e.currentTarget = null;
	}
	function oi(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					ai(i, s, l), a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					ai(i, s, l), a = c;
				}
			}
		}
		if (tt) throw e = nt, tt = !1, nt = null, e;
	}
	function si(e, t) {
		var n = t[Li];
		n === void 0 && (n = t[Li] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (di(t, e, 2, !1), n.add(r));
	}
	function ci(e, t, n) {
		var r = 0;
		t && (r |= 4), di(n, e, r, t);
	}
	var li = "_reactListening" + Math.random().toString(36).slice(2);
	function ui(e) {
		if (!e[li]) {
			e[li] = !0, i.forEach(function(t) {
				t !== "selectionchange" && (ii.has(t) || ci(t, !1, e), ci(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[li] || (t[li] = !0, ci("selectionchange", !1, t));
		}
	}
	function di(e, t, n, r) {
		switch (bn(t)) {
			case 1:
				var i = hn;
				break;
			case 4:
				i = gn;
				break;
			default: i = _n;
		}
		n = i.bind(null, t, n, e), i = void 0, !Xe || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function fi(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var o = r.tag;
			if (o === 3 || o === 4) {
				var s = r.stateNode.containerInfo;
				if (s === i || s.nodeType === 8 && s.parentNode === i) break;
				if (o === 4) for (o = r.return; o !== null;) {
					var c = o.tag;
					if ((c === 3 || c === 4) && (c = o.stateNode.containerInfo, c === i || c.nodeType === 8 && c.parentNode === i)) return;
					o = o.return;
				}
				for (; s !== null;) {
					if (o = Bi(s), o === null) return;
					if (c = o.tag, c === 5 || c === 6) {
						r = a = o;
						continue a;
					}
					s = s.parentNode;
				}
			}
			r = r.return;
		}
		Je(function() {
			var r = a, i = Re(n), o = [];
			a: {
				var s = Qr.get(e);
				if (s !== void 0) {
					var c = An, l = e;
					switch (e) {
						case "keypress": if (Tn(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = qn;
							break;
						case "focusin":
							l = "focus", c = Rn;
							break;
						case "focusout":
							l = "blur", c = Rn;
							break;
						case "beforeblur":
						case "afterblur":
							c = Rn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							c = In;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = Ln;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = Yn;
							break;
						case Jr:
						case Yr:
						case Xr:
							c = zn;
							break;
						case Zr:
							c = Xn;
							break;
						case "scroll":
							c = Mn;
							break;
						case "wheel":
							c = Zn;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = Bn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup": c = Jn;
					}
					var u = !!(t & 4), d = !u && e === "scroll", f = u ? s === null ? null : s + "Capture" : s;
					u = [];
					for (var p = r, m; p !== null;) {
						m = p;
						var h = m.stateNode;
						if (m.tag === 5 && h !== null && (m = h, f !== null && (h = Ye(p, f), h != null && u.push(pi(p, h, m)))), d) break;
						p = p.return;
					}
					0 < u.length && (s = new c(s, l, null, n, i), o.push({
						event: s,
						listeners: u
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (s = e === "mouseover" || e === "pointerover", c = e === "mouseout" || e === "pointerout", s && n !== Le && (l = n.relatedTarget || n.fromElement) && (Bi(l) || l[Ii])) break a;
					if ((c || s) && (s = i.window === i ? i : (s = i.ownerDocument) ? s.defaultView || s.parentWindow : window, c ? (l = n.relatedTarget || n.toElement, c = r, l = l ? Bi(l) : null, l !== null && (d = ot(l), l !== d || l.tag !== 5 && l.tag !== 6) && (l = null)) : (c = null, l = r), c !== l)) {
						if (u = In, h = "onMouseLeave", f = "onMouseEnter", p = "mouse", (e === "pointerout" || e === "pointerover") && (u = Jn, h = "onPointerLeave", f = "onPointerEnter", p = "pointer"), d = c == null ? s : Hi(c), m = l == null ? s : Hi(l), s = new u(h, p + "leave", c, n, i), s.target = d, s.relatedTarget = m, h = null, Bi(i) === r && (u = new u(f, p + "enter", l, n, i), u.target = m, u.relatedTarget = d, h = u), d = h, c && l) b: {
							for (u = c, f = l, p = 0, m = u; m; m = hi(m)) p++;
							for (m = 0, h = f; h; h = hi(h)) m++;
							for (; 0 < p - m;) u = hi(u), p--;
							for (; 0 < m - p;) f = hi(f), m--;
							for (; p--;) {
								if (u === f || f !== null && u === f.alternate) break b;
								u = hi(u), f = hi(f);
							}
							u = null;
						}
						else u = null;
						c !== null && gi(o, s, c, u, !1), l !== null && d !== null && gi(o, d, l, u, !0);
					}
				}
				a: {
					if (s = r ? Hi(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var g = _r;
					else if (dr(s)) {
						if (vr) g = Dr;
						else {
							g = Tr;
							var _ = wr;
						}
					} else (c = s.nodeName) && c.toLowerCase() === "input" && (s.type === "checkbox" || s.type === "radio") && (g = Er);
					if (g && (g = g(e, r))) {
						fr(o, g, n, i);
						break a;
					}
					_ && _(e, s, r), e === "focusout" && (_ = s._wrapperState) && _.controlled && s.type === "number" && ve(s, "number", s.value);
				}
				switch (_ = r ? Hi(r) : window, e) {
					case "focusin":
						(dr(_) || _.contentEditable === "true") && (Rr = _, zr = r, Br = null);
						break;
					case "focusout":
						Br = zr = Rr = null;
						break;
					case "mousedown":
						Vr = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Vr = !1, Hr(o, n, i);
						break;
					case "selectionchange": if (Lr) break;
					case "keydown":
					case "keyup": Hr(o, n, i);
				}
				var v;
				if ($n) b: {
					switch (e) {
						case "compositionstart":
							var y = "onCompositionStart";
							break b;
						case "compositionend":
							y = "onCompositionEnd";
							break b;
						case "compositionupdate":
							y = "onCompositionUpdate";
							break b;
					}
					y = void 0;
				}
				else sr ? ar(e, n) && (y = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (y = "onCompositionStart");
				y && (nr && n.locale !== "ko" && (sr || y !== "onCompositionStart" ? y === "onCompositionEnd" && sr && (v = wn()) : (xn = i, Sn = "value" in xn ? xn.value : xn.textContent, sr = !0)), _ = mi(r, y), 0 < _.length && (y = new Vn(y, e, null, n, i), o.push({
					event: y,
					listeners: _
				}), v ? y.data = v : (v = or(n), v !== null && (y.data = v)))), (v = tr ? cr(e, n) : lr(e, n)) && (r = mi(r, "onBeforeInput"), 0 < r.length && (i = new Vn("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: i,
					listeners: r
				}), i.data = v));
			}
			oi(o, t);
		});
	}
	function pi(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function mi(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			i.tag === 5 && a !== null && (i = a, a = Ye(e, n), a != null && r.unshift(pi(e, a, i)), a = Ye(e, t), a != null && r.push(pi(e, a, i))), e = e.return;
		}
		return r;
	}
	function hi(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5);
		return e || null;
	}
	function gi(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (c !== null && c === r) break;
			s.tag === 5 && l !== null && (s = l, i ? (c = Ye(n, a), c != null && o.unshift(pi(n, c, s))) : i || (c = Ye(n, a), c != null && o.push(pi(n, c, s)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var _i = /\r\n?/g, vi = /\u0000|\uFFFD/g;
	function yi(e) {
		return (typeof e == "string" ? e : "" + e).replace(_i, "\n").replace(vi, "");
	}
	function bi(e, t, n) {
		if (t = yi(t), yi(e) !== t && n) throw Error(r(425));
	}
	function xi() {}
	var Si = null, Ci = null;
	function wi(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var Ti = typeof setTimeout == "function" ? setTimeout : void 0, Ei = typeof clearTimeout == "function" ? clearTimeout : void 0, Di = typeof Promise == "function" ? Promise : void 0, Oi = typeof queueMicrotask == "function" ? queueMicrotask : Di === void 0 ? Ti : function(e) {
		return Di.resolve(null).then(e).catch(ki);
	};
	function ki(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Ai(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$") {
					if (r === 0) {
						e.removeChild(i), fn(t);
						return;
					}
					r--;
				} else n !== "$" && n !== "$?" && n !== "$!" || r++;
			}
			n = i;
		} while (n);
		fn(t);
	}
	function ji(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
				if (t === "/$") return null;
			}
		}
		return e;
	}
	function Mi(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?") {
					if (t === 0) return e;
					t--;
				} else n === "/$" && t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	var Ni = Math.random().toString(36).slice(2), Pi = "__reactFiber$" + Ni, Fi = "__reactProps$" + Ni, Ii = "__reactContainer$" + Ni, Li = "__reactEvents$" + Ni, Ri = "__reactListeners$" + Ni, zi = "__reactHandles$" + Ni;
	function Bi(e) {
		var t = e[Pi];
		if (t) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[Ii] || n[Pi]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = Mi(e); e !== null;) {
					if (n = e[Pi]) return n;
					e = Mi(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function Vi(e) {
		return e = e[Pi] || e[Ii], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
	}
	function Hi(e) {
		if (e.tag === 5 || e.tag === 6) return e.stateNode;
		throw Error(r(33));
	}
	function Ui(e) {
		return e[Fi] || null;
	}
	var Wi = [], Gi = -1;
	function Ki(e) {
		return { current: e };
	}
	function qi(e) {
		0 > Gi || (e.current = Wi[Gi], Wi[Gi] = null, Gi--);
	}
	function Ji(e, t) {
		Gi++, Wi[Gi] = e.current, e.current = t;
	}
	var Yi = {}, Xi = Ki(Yi), Zi = Ki(!1), Qi = Yi;
	function B(e, t) {
		var n = e.type.contextTypes;
		if (!n) return Yi;
		var r = e.stateNode;
		if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
		var i = {}, a;
		for (a in n) i[a] = t[a];
		return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = i), i;
	}
	function V(e) {
		return e = e.childContextTypes, e != null;
	}
	function $i() {
		qi(Zi), qi(Xi);
	}
	function ta(e, t, n) {
		if (Xi.current !== Yi) throw Error(r(168));
		Ji(Xi, t), Ji(Zi, n);
	}
	function na(e, t, n) {
		var i = e.stateNode;
		if (t = t.childContextTypes, typeof i.getChildContext != "function") return n;
		for (var a in i = i.getChildContext(), i) if (!(a in t)) throw Error(r(108, oe(e) || "Unknown", a));
		return F({}, n, i);
	}
	function ra(e) {
		return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Yi, Qi = Xi.current, Ji(Xi, e), Ji(Zi, Zi.current), !0;
	}
	function ia(e, t, n) {
		var i = e.stateNode;
		if (!i) throw Error(r(169));
		n ? (e = na(e, t, Qi), i.__reactInternalMemoizedMergedChildContext = e, qi(Zi), qi(Xi), Ji(Xi, e)) : qi(Zi), Ji(Zi, n);
	}
	var aa = null, oa = !1, sa = !1;
	function ca(e) {
		aa === null ? aa = [e] : aa.push(e);
	}
	function la(e) {
		oa = !0, ca(e);
	}
	function ua() {
		if (!sa && aa !== null) {
			sa = !0;
			var e = 0, t = Ht;
			try {
				var n = aa;
				for (Ht = 1; e < n.length; e++) {
					var r = n[e];
					do
						r = r(!0);
					while (r !== null);
				}
				aa = null, oa = !1;
			} catch (t) {
				throw aa !== null && (aa = aa.slice(e + 1)), ft(vt, ua), t;
			} finally {
				Ht = t, sa = !1;
			}
		}
		return null;
	}
	var da = [], fa = 0, pa = null, ma = 0, ha = [], ga = 0, _a = null, va = 1, ya = "";
	function ba(e, t) {
		da[fa++] = ma, da[fa++] = pa, pa = e, ma = t;
	}
	function xa(e, t, n) {
		ha[ga++] = va, ha[ga++] = ya, ha[ga++] = _a, _a = e;
		var r = va;
		e = ya;
		var i = 32 - Et(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - Et(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, va = 1 << 32 - Et(t) + i | n << i | r, ya = a + e;
		} else va = 1 << a | n << i | r, ya = e;
	}
	function Sa(e) {
		e.return !== null && (ba(e, 1), xa(e, 1, 0));
	}
	function Ca(e) {
		for (; e === pa;) pa = da[--fa], da[fa] = null, ma = da[--fa], da[fa] = null;
		for (; e === _a;) _a = ha[--ga], ha[ga] = null, ya = ha[--ga], ha[ga] = null, va = ha[--ga], ha[ga] = null;
	}
	var wa = null, Ta = null, Ea = !1, Da = null;
	function Oa(e, t) {
		var n = Xl(5, null, null, 0);
		n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
	}
	function ka(e, t) {
		switch (e.tag) {
			case 5:
				var n = e.type;
				return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null && (e.stateNode = t, wa = e, Ta = ji(t.firstChild), !0);
			case 6: return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null && (e.stateNode = t, wa = e, Ta = null, !0);
			case 13: return t = t.nodeType === 8 ? t : null, t !== null && (n = _a === null ? null : {
				id: va,
				overflow: ya
			}, e.memoizedState = {
				dehydrated: t,
				treeContext: n,
				retryLane: 1073741824
			}, n = Xl(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, wa = e, Ta = null, !0);
			default: return !1;
		}
	}
	function Aa(e) {
		return !!(e.mode & 1) && !(e.flags & 128);
	}
	function ja(e) {
		if (Ea) {
			var t = Ta;
			if (t) {
				var n = t;
				if (!ka(e, t)) {
					if (Aa(e)) throw Error(r(418));
					t = ji(n.nextSibling);
					var i = wa;
					t && ka(e, t) ? Oa(i, n) : (e.flags = e.flags & -4097 | 2, Ea = !1, wa = e);
				}
			} else {
				if (Aa(e)) throw Error(r(418));
				e.flags = e.flags & -4097 | 2, Ea = !1, wa = e;
			}
		}
	}
	function Ma(e) {
		for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13;) e = e.return;
		wa = e;
	}
	function Na(e) {
		if (e !== wa) return !1;
		if (!Ea) return Ma(e), Ea = !0, !1;
		var t;
		if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !wi(e.type, e.memoizedProps)), t && (t = Ta)) {
			if (Aa(e)) throw Pa(), Error(r(418));
			for (; t;) Oa(e, t), t = ji(t.nextSibling);
		}
		if (Ma(e), e.tag === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(r(317));
			a: {
				for (e = e.nextSibling, t = 0; e;) {
					if (e.nodeType === 8) {
						var n = e.data;
						if (n === "/$") {
							if (t === 0) {
								Ta = ji(e.nextSibling);
								break a;
							}
							t--;
						} else n !== "$" && n !== "$!" && n !== "$?" || t++;
					}
					e = e.nextSibling;
				}
				Ta = null;
			}
		} else Ta = wa ? ji(e.stateNode.nextSibling) : null;
		return !0;
	}
	function Pa() {
		for (var e = Ta; e;) e = ji(e.nextSibling);
	}
	function Fa() {
		Ta = wa = null, Ea = !1;
	}
	function Ia(e) {
		Da === null ? Da = [e] : Da.push(e);
	}
	var La = x.ReactCurrentBatchConfig;
	function Ra(e, t, n) {
		if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
			if (n._owner) {
				if (n = n._owner, n) {
					if (n.tag !== 1) throw Error(r(309));
					var i = n.stateNode;
				}
				if (!i) throw Error(r(147, e));
				var a = i, o = "" + e;
				return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === o ? t.ref : (t = function(e) {
					var t = a.refs;
					e === null ? delete t[o] : t[o] = e;
				}, t._stringRef = o, t);
			}
			if (typeof e != "string") throw Error(r(284));
			if (!n._owner) throw Error(r(290, e));
		}
		return e;
	}
	function za(e, t) {
		throw e = Object.prototype.toString.call(t), Error(r(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
	}
	function Ba(e) {
		var t = e._init;
		return t(e._payload);
	}
	function Va(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function i(e, t) {
			for (e = /* @__PURE__ */ new Map(); t !== null;) t.key === null ? e.set(t.index, t) : e.set(t.key, t), t = t.sibling;
			return e;
		}
		function a(e, t) {
			return e = $l(e, t), e.index = 0, e.sibling = null, e;
		}
		function o(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 2, n) : (r = r.index, r < n ? (t.flags |= 2, n) : r)) : (t.flags |= 1048576, n);
		}
		function s(t) {
			return e && t.alternate === null && (t.flags |= 2), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = ru(n, e.mode, r), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var i = n.type;
			return i === w ? d(e, t, n.props.children, r, n.key) : t !== null && (t.elementType === i || typeof i == "object" && i && i.$$typeof === N && Ba(i) === t.type) ? (r = a(t, n.props), r.ref = Ra(e, t, n), r.return = e, r) : (r = eu(n.type, n.key, n.props, null, e.mode, r), r.ref = Ra(e, t, n), r.return = e, r);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = iu(n, e.mode, r), t.return = e, t) : (t = a(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, i) {
			return t === null || t.tag !== 7 ? (t = tu(n, e.mode, r, i), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number") return t = ru("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case S: return n = eu(t.type, t.key, t.props, null, e.mode, n), n.ref = Ra(e, null, t), n.return = e, n;
					case C: return t = iu(t, e.mode, n), t.return = e, t;
					case N:
						var r = t._init;
						return f(e, r(t._payload), n);
				}
				if (ye(t) || te(t)) return t = tu(t, e.mode, n, null), t.return = e, t;
				za(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case S: return n.key === i ? l(e, t, n, r) : null;
					case C: return n.key === i ? u(e, t, n, r) : null;
					case N: return i = n._init, p(e, t, i(n._payload), r);
				}
				if (ye(n) || te(n)) return i === null ? d(e, t, n, r, null) : null;
				za(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case S: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case C: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case N:
						var a = r._init;
						return m(e, t, n, a(r._payload), i);
				}
				if (ye(r) || te(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				za(t, r);
			}
			return null;
		}
		function h(r, a, s, c) {
			for (var l = null, u = null, d = a, h = a = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(r, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(r, d), a = o(_, a, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(r, d), Ea && ba(r, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(r, s[h], c), d !== null && (a = o(d, a, h), u === null ? l = d : u.sibling = d, u = d);
				return Ea && ba(r, h), l;
			}
			for (d = i(r, d); h < s.length; h++) g = m(d, r, h, s[h], c), g !== null && (e && g.alternate !== null && d.delete(g.key === null ? h : g.key), a = o(g, a, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(r, e);
			}), Ea && ba(r, h), l;
		}
		function g(a, s, c, l) {
			var u = te(c);
			if (typeof u != "function") throw Error(r(150));
			if (c = u.call(c), c == null) throw Error(r(151));
			for (var d = u = null, h = s, g = s = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(a, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(a, h), s = o(y, s, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(a, h), Ea && ba(a, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(a, v.value, l), v !== null && (s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
				return Ea && ba(a, g), u;
			}
			for (h = i(a, h); !v.done; g++, v = c.next()) v = m(h, a, g, v.value, l), v !== null && (e && v.alternate !== null && h.delete(v.key === null ? g : v.key), s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(a, e);
			}), Ea && ba(a, g), u;
		}
		function _(e, r, i, o) {
			if (typeof i == "object" && i && i.type === w && i.key === null && (i = i.props.children), typeof i == "object" && i) {
				switch (i.$$typeof) {
					case S:
						a: {
							for (var c = i.key, l = r; l !== null;) {
								if (l.key === c) {
									if (c = i.type, c === w) {
										if (l.tag === 7) {
											n(e, l.sibling), r = a(l, i.props.children), r.return = e, e = r;
											break a;
										}
									} else if (l.elementType === c || typeof c == "object" && c && c.$$typeof === N && Ba(c) === l.type) {
										n(e, l.sibling), r = a(l, i.props), r.ref = Ra(e, l, i), r.return = e, e = r;
										break a;
									}
									n(e, l);
									break;
								}
								t(e, l), l = l.sibling;
							}
							i.type === w ? (r = tu(i.props.children, e.mode, o, i.key), r.return = e, e = r) : (o = eu(i.type, i.key, i.props, null, e.mode, o), o.ref = Ra(e, r, i), o.return = e, e = o);
						}
						return s(e);
					case C:
						a: {
							for (l = i.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === i.containerInfo && r.stateNode.implementation === i.implementation) {
										n(e, r.sibling), r = a(r, i.children || []), r.return = e, e = r;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							r = iu(i, e.mode, o), r.return = e, e = r;
						}
						return s(e);
					case N: return l = i._init, _(e, r, l(i._payload), o);
				}
				if (ye(i)) return h(e, r, i, o);
				if (te(i)) return g(e, r, i, o);
				za(e, i);
			}
			return typeof i == "string" && i !== "" || typeof i == "number" ? (i = "" + i, r !== null && r.tag === 6 ? (n(e, r.sibling), r = a(r, i), r.return = e, e = r) : (n(e, r), r = ru(i, e.mode, o), r.return = e, e = r), s(e)) : n(e, r);
		}
		return _;
	}
	var Ha = Va(!0), Ua = Va(!1), Wa = Ki(null), Ga = null, Ka = null, qa = null;
	function Ja() {
		qa = Ka = Ga = null;
	}
	function Ya(e) {
		var t = Wa.current;
		qi(Wa), e._currentValue = t;
	}
	function Xa(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Za(e, t) {
		Ga = e, qa = Ka = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (Rs = !0), e.firstContext = null);
	}
	function Qa(e) {
		var t = e._currentValue;
		if (qa !== e) {
			if (e = {
				context: e,
				memoizedValue: t,
				next: null
			}, Ka === null) {
				if (Ga === null) throw Error(r(308));
				Ka = e, Ga.dependencies = {
					lanes: 0,
					firstContext: e
				};
			} else Ka = Ka.next = e;
		}
		return t;
	}
	var $a = null;
	function eo(e) {
		$a === null ? $a = [e] : $a.push(e);
	}
	function to(e, t, n, r) {
		var i = t.interleaved;
		return i === null ? (n.next = n, eo(t)) : (n.next = i.next, i.next = n), t.interleaved = n, no(e, r);
	}
	function no(e, t) {
		e.lanes |= t;
		var n = e.alternate;
		for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null;) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
		return n.tag === 3 ? n.stateNode : null;
	}
	var ro = !1;
	function io(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				interleaved: null,
				lanes: 0
			},
			effects: null
		};
	}
	function ao(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			effects: e.effects
		});
	}
	function oo(e, t) {
		return {
			eventTime: e,
			lane: t,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function so(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, Wc & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, no(e, n);
		}
		return i = r.interleaved, i === null ? (t.next = t, eo(r)) : (t.next = i.next, i.next = t), r.interleaved = t, no(e, n);
	}
	function co(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194240)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, Vt(e, n);
		}
	}
	function lo(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						eventTime: n.eventTime,
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: n.callback,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				effects: r.effects
			}, e.updateQueue = n;
			return;
		}
		e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	function uo(e, t, n, r) {
		var i = e.updateQueue;
		ro = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane, p = s.eventTime;
				if ((r & f) === f) {
					u !== null && (u = u.next = {
						eventTime: p,
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: s.callback,
						next: null
					});
					a: {
						var m = e, h = s;
						switch (f = t, p = n, h.tag) {
							case 1:
								if (m = h.payload, typeof m == "function") {
									d = m.call(p, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = h.payload, f = typeof m == "function" ? m.call(p, d, f) : m, f == null) break a;
								d = F({}, d, f);
								break a;
							case 2: ro = !0;
						}
					}
					s.callback !== null && s.lane !== 0 && (e.flags |= 64, f = i.effects, f === null ? i.effects = [s] : f.push(s));
				} else p = {
					eventTime: p,
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					f = s, s = f.next, f.next = null, i.lastBaseUpdate = f, i.shared.pending = null;
				}
			} while (1);
			if (u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, t = i.shared.interleaved, t !== null) {
				i = t;
				do
					o |= i.lane, i = i.next;
				while (i !== t);
			} else a === null && (i.shared.lanes = 0);
			Qc |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function fo(e, t, n) {
		if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
			var i = e[t], a = i.callback;
			if (a !== null) {
				if (i.callback = null, i = n, typeof a != "function") throw Error(r(191, a));
				a.call(i);
			}
		}
	}
	var po = {}, mo = Ki(po), ho = Ki(po), go = Ki(po);
	function _o(e) {
		if (e === po) throw Error(r(174));
		return e;
	}
	function vo(e, t) {
		switch (Ji(go, t), Ji(ho, e), Ji(mo, po), e = t.nodeType, e) {
			case 9:
			case 11:
				t = (t = t.documentElement) ? t.namespaceURI : Ee(null, "");
				break;
			default: e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Ee(t, e);
		}
		qi(mo), Ji(mo, t);
	}
	function yo() {
		qi(mo), qi(ho), qi(go);
	}
	function bo(e) {
		_o(go.current);
		var t = _o(mo.current), n = Ee(t, e.type);
		t !== n && (Ji(ho, e), Ji(mo, n));
	}
	function xo(e) {
		ho.current === e && (qi(mo), qi(ho));
	}
	var So = Ki(0);
	function Co(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
			} else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var wo = [];
	function To() {
		for (var e = 0; e < wo.length; e++) wo[e]._workInProgressVersionPrimary = null;
		wo.length = 0;
	}
	var Eo = x.ReactCurrentDispatcher, Do = x.ReactCurrentBatchConfig, Oo = 0, ko = null, Ao = null, jo = null, Mo = !1, No = !1, Po = 0, Fo = 0;
	function Io() {
		throw Error(r(321));
	}
	function Lo(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!kr(e[n], t[n])) return !1;
		return !0;
	}
	function Ro(e, t, n, i, a, o) {
		if (Oo = o, ko = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Eo.current = e === null || e.memoizedState === null ? xs : Ss, e = n(i, a), No) {
			o = 0;
			do {
				if (No = !1, Po = 0, 25 <= o) throw Error(r(301));
				o += 1, jo = Ao = null, t.updateQueue = null, Eo.current = Cs, e = n(i, a);
			} while (No);
		}
		if (Eo.current = bs, t = Ao !== null && Ao.next !== null, Oo = 0, jo = Ao = ko = null, Mo = !1, t) throw Error(r(300));
		return e;
	}
	function zo() {
		var e = Po !== 0;
		return Po = 0, e;
	}
	function Bo() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return jo === null ? ko.memoizedState = jo = e : jo = jo.next = e, jo;
	}
	function Vo() {
		if (Ao === null) {
			var e = ko.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = Ao.next;
		var t = jo === null ? ko.memoizedState : jo.next;
		if (t !== null) jo = t, Ao = e;
		else {
			if (e === null) throw Error(r(310));
			Ao = e, e = {
				memoizedState: Ao.memoizedState,
				baseState: Ao.baseState,
				baseQueue: Ao.baseQueue,
				queue: Ao.queue,
				next: null
			}, jo === null ? ko.memoizedState = jo = e : jo = jo.next = e;
		}
		return jo;
	}
	function Ho(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function Uo(e) {
		var t = Vo(), n = t.queue;
		if (n === null) throw Error(r(311));
		n.lastRenderedReducer = e;
		var i = Ao, a = i.baseQueue, o = n.pending;
		if (o !== null) {
			if (a !== null) {
				var s = a.next;
				a.next = o.next, o.next = s;
			}
			i.baseQueue = a = o, n.pending = null;
		}
		if (a !== null) {
			o = a.next, i = i.baseState;
			var c = s = null, l = null, u = o;
			do {
				var d = u.lane;
				if ((Oo & d) === d) l !== null && (l = l.next = {
					lane: 0,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}), i = u.hasEagerState ? u.eagerState : e(i, u.action);
				else {
					var f = {
						lane: d,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					};
					l === null ? (c = l = f, s = i) : l = l.next = f, ko.lanes |= d, Qc |= d;
				}
				u = u.next;
			} while (u !== null && u !== o);
			l === null ? s = i : l.next = c, kr(i, t.memoizedState) || (Rs = !0), t.memoizedState = i, t.baseState = s, t.baseQueue = l, n.lastRenderedState = i;
		}
		if (e = n.interleaved, e !== null) {
			a = e;
			do
				o = a.lane, ko.lanes |= o, Qc |= o, a = a.next;
			while (a !== e);
		} else a === null && (n.lanes = 0);
		return [t.memoizedState, n.dispatch];
	}
	function Wo(e) {
		var t = Vo(), n = t.queue;
		if (n === null) throw Error(r(311));
		n.lastRenderedReducer = e;
		var i = n.dispatch, a = n.pending, o = t.memoizedState;
		if (a !== null) {
			n.pending = null;
			var s = a = a.next;
			do
				o = e(o, s.action), s = s.next;
			while (s !== a);
			kr(o, t.memoizedState) || (Rs = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
		}
		return [o, i];
	}
	function Go() {}
	function Ko(e, t) {
		var n = ko, i = Vo(), a = t(), o = !kr(i.memoizedState, a);
		if (o && (i.memoizedState = a, Rs = !0), i = i.queue, is(Yo.bind(null, n, i, e), [e]), i.getSnapshot !== t || o || jo !== null && jo.memoizedState.tag & 1) {
			if (n.flags |= 2048, $o(9, Jo.bind(null, n, i, a, t), void 0, null), Gc === null) throw Error(r(349));
			Oo & 30 || qo(n, t, a);
		}
		return a;
	}
	function qo(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = ko.updateQueue, t === null ? (t = {
			lastEffect: null,
			stores: null
		}, ko.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function Jo(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Xo(t) && Zo(e);
	}
	function Yo(e, t, n) {
		return n(function() {
			Xo(t) && Zo(e);
		});
	}
	function Xo(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !kr(e, n);
		} catch {
			return !0;
		}
	}
	function Zo(e) {
		var t = no(e, 1);
		t !== null && vl(t, e, 1, -1);
	}
	function Qo(e) {
		var t = Bo();
		return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = {
			pending: null,
			interleaved: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Ho,
			lastRenderedState: e
		}, t.queue = e, e = e.dispatch = gs.bind(null, ko, e), [t.memoizedState, e];
	}
	function $o(e, t, n, r) {
		return e = {
			tag: e,
			create: t,
			destroy: n,
			deps: r,
			next: null
		}, t = ko.updateQueue, t === null ? (t = {
			lastEffect: null,
			stores: null
		}, ko.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
	}
	function es() {
		return Vo().memoizedState;
	}
	function ts(e, t, n, r) {
		var i = Bo();
		ko.flags |= e, i.memoizedState = $o(1 | t, n, void 0, r === void 0 ? null : r);
	}
	function ns(e, t, n, r) {
		var i = Vo();
		r = r === void 0 ? null : r;
		var a = void 0;
		if (Ao !== null) {
			var o = Ao.memoizedState;
			if (a = o.destroy, r !== null && Lo(r, o.deps)) {
				i.memoizedState = $o(t, n, a, r);
				return;
			}
		}
		ko.flags |= e, i.memoizedState = $o(1 | t, n, a, r);
	}
	function rs(e, t) {
		return ts(8390656, 8, e, t);
	}
	function is(e, t) {
		return ns(2048, 8, e, t);
	}
	function as(e, t) {
		return ns(4, 2, e, t);
	}
	function os(e, t) {
		return ns(4, 4, e, t);
	}
	function ss(e, t) {
		if (typeof t == "function") return e = e(), t(e), function() {
			t(null);
		};
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function cs(e, t, n) {
		return n = n == null ? null : n.concat([e]), ns(4, 4, ss.bind(null, t, e), n);
	}
	function ls() {}
	function us(e, t) {
		var n = Vo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return r !== null && t !== null && Lo(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function ds(e, t) {
		var n = Vo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return r !== null && t !== null && Lo(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
	}
	function fs(e, t, n) {
		return Oo & 21 ? (kr(n, t) || (n = Lt(), ko.lanes |= n, Qc |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Rs = !0), e.memoizedState = n);
	}
	function ps(e, t) {
		var n = Ht;
		Ht = n !== 0 && 4 > n ? n : 4, e(!0);
		var r = Do.transition;
		Do.transition = {};
		try {
			e(!1), t();
		} finally {
			Ht = n, Do.transition = r;
		}
	}
	function ms() {
		return Vo().memoizedState;
	}
	function hs(e, t, n) {
		var r = _l(e);
		if (n = {
			lane: r,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, _s(e)) vs(t, n);
		else if (n = to(e, t, n, r), n !== null) {
			var i = gl();
			vl(n, e, r, i), ys(n, t, r);
		}
	}
	function gs(e, t, n) {
		var r = _l(e), i = {
			lane: r,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (_s(e)) vs(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, kr(s, o)) {
					var c = t.interleaved;
					c === null ? (i.next = i, eo(t)) : (i.next = c.next, c.next = i), t.interleaved = i;
					return;
				}
			} catch {}
			n = to(e, t, i, r), n !== null && (i = gl(), vl(n, e, r, i), ys(n, t, r));
		}
	}
	function _s(e) {
		var t = e.alternate;
		return e === ko || t !== null && t === ko;
	}
	function vs(e, t) {
		No = Mo = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function ys(e, t, n) {
		if (n & 4194240) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, Vt(e, n);
		}
	}
	var bs = {
		readContext: Qa,
		useCallback: Io,
		useContext: Io,
		useEffect: Io,
		useImperativeHandle: Io,
		useInsertionEffect: Io,
		useLayoutEffect: Io,
		useMemo: Io,
		useReducer: Io,
		useRef: Io,
		useState: Io,
		useDebugValue: Io,
		useDeferredValue: Io,
		useTransition: Io,
		useMutableSource: Io,
		useSyncExternalStore: Io,
		useId: Io,
		unstable_isNewReconciler: !1
	}, xs = {
		readContext: Qa,
		useCallback: function(e, t) {
			return Bo().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: Qa,
		useEffect: rs,
		useImperativeHandle: function(e, t, n) {
			return n = n == null ? null : n.concat([e]), ts(4194308, 4, ss.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return ts(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			return ts(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = Bo();
			return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
		},
		useReducer: function(e, t, n) {
			var r = Bo();
			return t = n === void 0 ? t : n(t), r.memoizedState = r.baseState = t, e = {
				pending: null,
				interleaved: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: t
			}, r.queue = e, e = e.dispatch = hs.bind(null, ko, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = Bo();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: Qo,
		useDebugValue: ls,
		useDeferredValue: function(e) {
			return Bo().memoizedState = e;
		},
		useTransition: function() {
			var e = Qo(!1), t = e[0];
			return e = ps.bind(null, e[1]), Bo().memoizedState = e, [t, e];
		},
		useMutableSource: function() {},
		useSyncExternalStore: function(e, t, n) {
			var i = ko, a = Bo();
			if (Ea) {
				if (n === void 0) throw Error(r(407));
				n = n();
			} else {
				if (n = t(), Gc === null) throw Error(r(349));
				Oo & 30 || qo(i, t, n);
			}
			a.memoizedState = n;
			var o = {
				value: n,
				getSnapshot: t
			};
			return a.queue = o, rs(Yo.bind(null, i, o, e), [e]), i.flags |= 2048, $o(9, Jo.bind(null, i, o, n, t), void 0, null), n;
		},
		useId: function() {
			var e = Bo(), t = Gc.identifierPrefix;
			if (Ea) {
				var n = ya, r = va;
				n = (r & ~(1 << 32 - Et(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Po++, 0 < n && (t += "H" + n.toString(32)), t += ":";
			} else n = Fo++, t = ":" + t + "r" + n.toString(32) + ":";
			return e.memoizedState = t;
		},
		unstable_isNewReconciler: !1
	}, Ss = {
		readContext: Qa,
		useCallback: us,
		useContext: Qa,
		useEffect: is,
		useImperativeHandle: cs,
		useInsertionEffect: as,
		useLayoutEffect: os,
		useMemo: ds,
		useReducer: Uo,
		useRef: es,
		useState: function() {
			return Uo(Ho);
		},
		useDebugValue: ls,
		useDeferredValue: function(e) {
			return fs(Vo(), Ao.memoizedState, e);
		},
		useTransition: function() {
			return [Uo(Ho)[0], Vo().memoizedState];
		},
		useMutableSource: Go,
		useSyncExternalStore: Ko,
		useId: ms,
		unstable_isNewReconciler: !1
	}, Cs = {
		readContext: Qa,
		useCallback: us,
		useContext: Qa,
		useEffect: is,
		useImperativeHandle: cs,
		useInsertionEffect: as,
		useLayoutEffect: os,
		useMemo: ds,
		useReducer: Wo,
		useRef: es,
		useState: function() {
			return Wo(Ho);
		},
		useDebugValue: ls,
		useDeferredValue: function(e) {
			var t = Vo();
			return Ao === null ? t.memoizedState = e : fs(t, Ao.memoizedState, e);
		},
		useTransition: function() {
			return [Wo(Ho)[0], Vo().memoizedState];
		},
		useMutableSource: Go,
		useSyncExternalStore: Ko,
		useId: ms,
		unstable_isNewReconciler: !1
	};
	function ws(e, t) {
		if (e && e.defaultProps) {
			for (var n in t = F({}, t), e = e.defaultProps, e) t[n] === void 0 && (t[n] = e[n]);
			return t;
		}
		return t;
	}
	function H(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : F({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var U = {
		isMounted: function(e) {
			return (e = e._reactInternals) ? ot(e) === e : !1;
		},
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = gl(), i = _l(e), a = oo(r, i);
			a.payload = t, n != null && (a.callback = n), t = so(e, a, i), t !== null && (vl(t, e, i, r), co(t, e, i));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = gl(), i = _l(e), a = oo(r, i);
			a.tag = 1, a.payload = t, n != null && (a.callback = n), t = so(e, a, i), t !== null && (vl(t, e, i, r), co(t, e, i));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = gl(), r = _l(e), i = oo(n, r);
			i.tag = 2, t != null && (i.callback = t), t = so(e, i, r), t !== null && (vl(t, e, r, n), co(t, e, r));
		}
	};
	function Ts(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Ar(n, r) || !Ar(i, a) : !0;
	}
	function Es(e, t, n) {
		var r = !1, i = Yi, a = t.contextType;
		return typeof a == "object" && a ? a = Qa(a) : (i = V(t) ? Qi : Xi.current, r = t.contextTypes, a = (r = r != null) ? B(e, i) : Yi), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = U, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = a), t;
	}
	function Ds(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && U.enqueueReplaceState(t, t.state, null);
	}
	function Os(e, t, n, r) {
		var i = e.stateNode;
		i.props = n, i.state = e.memoizedState, i.refs = {}, io(e);
		var a = t.contextType;
		typeof a == "object" && a ? i.context = Qa(a) : (a = V(t) ? Qi : Xi.current, i.context = B(e, a)), i.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (H(e, t, a, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && U.enqueueReplaceState(i, i.state, null), uo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
	}
	function ks(e, t) {
		try {
			var n = "", r = t;
			do
				n += ie(r), r = r.return;
			while (r);
			var i = n;
		} catch (e) {
			i = "\nError generating stack: " + e.message + "\n" + e.stack;
		}
		return {
			value: e,
			source: t,
			stack: i,
			digest: null
		};
	}
	function As(e, t, n) {
		return {
			value: e,
			source: null,
			stack: n == null ? null : n,
			digest: t == null ? null : t
		};
	}
	function js(e, t) {
		try {
			console.error(t.value);
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	var W = typeof WeakMap == "function" ? WeakMap : Map;
	function Ms(e, t, n) {
		n = oo(-1, n), n.tag = 3, n.payload = { element: null };
		var r = t.value;
		return n.callback = function() {
			ol || (ol = !0, sl = r), js(e, t);
		}, n;
	}
	function Ns(e, t, n) {
		n = oo(-1, n), n.tag = 3;
		var r = e.type.getDerivedStateFromError;
		if (typeof r == "function") {
			var i = t.value;
			n.payload = function() {
				return r(i);
			}, n.callback = function() {
				js(e, t);
			};
		}
		var a = e.stateNode;
		return a !== null && typeof a.componentDidCatch == "function" && (n.callback = function() {
			js(e, t), typeof r != "function" && (cl === null ? cl = /* @__PURE__ */ new Set([this]) : cl.add(this));
			var n = t.stack;
			this.componentDidCatch(t.value, { componentStack: n === null ? "" : n });
		}), n;
	}
	function Ps(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new W();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (i.add(n), e = Ul.bind(null, e, t, n), t.then(e, e));
	}
	function Fs(e) {
		do {
			var t;
			if ((t = e.tag === 13) && (t = e.memoizedState, t = t === null || t.dehydrated !== null), t) return e;
			e = e.return;
		} while (e !== null);
		return null;
	}
	function Is(e, t, n, r, i) {
		return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = oo(-1, 1), t.tag = 2, so(n, t, 1))), n.lanes |= 1), e);
	}
	var Ls = x.ReactCurrentOwner, Rs = !1;
	function zs(e, t, n, r) {
		t.child = e === null ? Ua(t, null, n, r) : Ha(t, e.child, n, r);
	}
	function Bs(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		return Za(t, i), r = Ro(e, t, n, r, a, i), n = zo(), e !== null && !Rs ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ac(e, t, i)) : (Ea && n && Sa(t), t.flags |= 1, zs(e, t, r, i), t.child);
	}
	function Vs(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !Zl(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, Hs(e, t, a, r, i)) : (e = eu(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, (e.lanes & i) === 0) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Ar : n, n(o, r) && e.ref === t.ref) return ac(e, t, i);
		}
		return t.flags |= 1, e = $l(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function Hs(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Ar(a, r) && e.ref === t.ref) {
				if (Rs = !1, t.pendingProps = r = a, (e.lanes & i) !== 0) e.flags & 131072 && (Rs = !0);
				else return t.lanes = e.lanes, ac(e, t, i);
			}
		}
		return Gs(e, t, n, r, i);
	}
	function Us(e, t, n) {
		var r = t.pendingProps, i = r.children, a = e === null ? null : e.memoizedState;
		if (r.mode === "hidden") {
			if (!(t.mode & 1)) t.memoizedState = {
				baseLanes: 0,
				cachePool: null,
				transitions: null
			}, Ji(Yc, Jc), Jc |= n;
			else {
				if (!(n & 1073741824)) return e = a === null ? n : a.baseLanes | n, t.lanes = t.childLanes = 1073741824, t.memoizedState = {
					baseLanes: e,
					cachePool: null,
					transitions: null
				}, t.updateQueue = null, Ji(Yc, Jc), Jc |= e, null;
				t.memoizedState = {
					baseLanes: 0,
					cachePool: null,
					transitions: null
				}, r = a === null ? n : a.baseLanes, Ji(Yc, Jc), Jc |= r;
			}
		} else a === null ? r = n : (r = a.baseLanes | n, t.memoizedState = null), Ji(Yc, Jc), Jc |= r;
		return zs(e, t, i, n), t.child;
	}
	function Ws(e, t) {
		var n = t.ref;
		(e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
	}
	function Gs(e, t, n, r, i) {
		var a = V(n) ? Qi : Xi.current;
		return a = B(t, a), Za(t, i), n = Ro(e, t, n, r, a, i), r = zo(), e !== null && !Rs ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ac(e, t, i)) : (Ea && r && Sa(t), t.flags |= 1, zs(e, t, n, i), t.child);
	}
	function Ks(e, t, n, r, i) {
		if (V(n)) {
			var a = !0;
			ra(t);
		} else a = !1;
		if (Za(t, i), t.stateNode === null) ic(e, t), Es(t, n, r), Os(t, n, r, i), r = !0;
		else if (e === null) {
			var o = t.stateNode, s = t.memoizedProps;
			o.props = s;
			var c = o.context, l = n.contextType;
			typeof l == "object" && l ? l = Qa(l) : (l = V(n) ? Qi : Xi.current, l = B(t, l));
			var u = n.getDerivedStateFromProps, d = typeof u == "function" || typeof o.getSnapshotBeforeUpdate == "function";
			d || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== r || c !== l) && Ds(t, o, r, l), ro = !1;
			var f = t.memoizedState;
			o.state = f, uo(t, r, o, i), c = t.memoizedState, s !== r || f !== c || Zi.current || ro ? (typeof u == "function" && (H(t, n, u, r), c = t.memoizedState), (s = ro || Ts(t, n, s, r, f, c, l)) ? (d || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = c), o.props = r, o.state = c, o.context = l, r = s) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			o = t.stateNode, ao(e, t), s = t.memoizedProps, l = t.type === t.elementType ? s : ws(t.type, s), o.props = l, d = t.pendingProps, f = o.context, c = n.contextType, typeof c == "object" && c ? c = Qa(c) : (c = V(n) ? Qi : Xi.current, c = B(t, c));
			var p = n.getDerivedStateFromProps;
			(u = typeof p == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== d || f !== c) && Ds(t, o, r, c), ro = !1, f = t.memoizedState, o.state = f, uo(t, r, o, i);
			var m = t.memoizedState;
			s !== d || f !== m || Zi.current || ro ? (typeof p == "function" && (H(t, n, p, r), m = t.memoizedState), (l = ro || Ts(t, n, l, r, f, m, c) || !1) ? (u || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, m, c), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, m, c)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = m), o.props = r, o.state = m, o.context = c, r = l) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return qs(e, t, n, r, a, i);
	}
	function qs(e, t, n, r, i, a) {
		Ws(e, t);
		var o = !!(t.flags & 128);
		if (!r && !o) return i && ia(t, n, !1), ac(e, t, a);
		r = t.stateNode, Ls.current = t;
		var s = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
		return t.flags |= 1, e !== null && o ? (t.child = Ha(t, e.child, null, a), t.child = Ha(t, null, s, a)) : zs(e, t, s, a), t.memoizedState = r.state, i && ia(t, n, !0), t.child;
	}
	function Js(e) {
		var t = e.stateNode;
		t.pendingContext ? ta(e, t.pendingContext, t.pendingContext !== t.context) : t.context && ta(e, t.context, !1), vo(e, t.containerInfo);
	}
	function Ys(e, t, n, r, i) {
		return Fa(), Ia(i), t.flags |= 256, zs(e, t, n, r), t.child;
	}
	var Xs = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0
	};
	function Zs(e) {
		return {
			baseLanes: e,
			cachePool: null,
			transitions: null
		};
	}
	function Qs(e, t, n) {
		var r = t.pendingProps, i = So.current, a = !1, o = !!(t.flags & 128), s;
		if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : !!(i & 2)), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), Ji(So, i & 1), e === null) return ja(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.lanes = t.mode & 1 ? e.data === "$!" ? 8 : 1073741824 : 1, null) : (o = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, o = {
			mode: "hidden",
			children: o
		}, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = o) : a = nu(o, r, 0, null), e = tu(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = Zs(n), t.memoizedState = Xs, e) : $s(t, o));
		if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null)) return ec(e, t, o, r, s, i, n);
		if (a) {
			a = r.fallback, o = t.mode, i = e.child, s = i.sibling;
			var c = {
				mode: "hidden",
				children: r.children
			};
			return !(o & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = c, t.deletions = null) : (r = $l(i, c), r.subtreeFlags = i.subtreeFlags & 14680064), s === null ? (a = tu(a, o, n, null), a.flags |= 2) : a = $l(s, a), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, o = e.child.memoizedState, o = o === null ? Zs(n) : {
				baseLanes: o.baseLanes | n,
				cachePool: null,
				transitions: o.transitions
			}, a.memoizedState = o, a.childLanes = e.childLanes & ~n, t.memoizedState = Xs, r;
		}
		return a = e.child, e = a.sibling, r = $l(a, {
			mode: "visible",
			children: r.children
		}), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
	}
	function $s(e, t) {
		return t = nu({
			mode: "visible",
			children: t
		}, e.mode, 0, null), t.return = e, e.child = t;
	}
	function G(e, t, n, r) {
		return r !== null && Ia(r), Ha(t, e.child, null, n), e = $s(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function ec(e, t, n, i, a, o, s) {
		if (n) return t.flags & 256 ? (t.flags &= -257, i = As(Error(r(422))), G(e, t, s, i)) : t.memoizedState === null ? (o = i.fallback, a = t.mode, i = nu({
			mode: "visible",
			children: i.children
		}, a, 0, null), o = tu(o, a, s, null), o.flags |= 2, i.return = t, o.return = t, i.sibling = o, t.child = i, t.mode & 1 && Ha(t, e.child, null, s), t.child.memoizedState = Zs(s), t.memoizedState = Xs, o) : (t.child = e.child, t.flags |= 128, null);
		if (!(t.mode & 1)) return G(e, t, s, null);
		if (a.data === "$!") {
			if (i = a.nextSibling && a.nextSibling.dataset, i) var c = i.dgst;
			return i = c, o = Error(r(419)), i = As(o, i, void 0), G(e, t, s, i);
		}
		if (c = (s & e.childLanes) !== 0, Rs || c) {
			if (i = Gc, i !== null) {
				switch (s & -s) {
					case 4:
						a = 2;
						break;
					case 16:
						a = 8;
						break;
					case 64:
					case 128:
					case 256:
					case 512:
					case 1024:
					case 2048:
					case 4096:
					case 8192:
					case 16384:
					case 32768:
					case 65536:
					case 131072:
					case 262144:
					case 524288:
					case 1048576:
					case 2097152:
					case 4194304:
					case 8388608:
					case 16777216:
					case 33554432:
					case 67108864:
						a = 32;
						break;
					case 536870912:
						a = 268435456;
						break;
					default: a = 0;
				}
				a = (a & (i.suspendedLanes | s)) === 0 ? a : 0, a !== 0 && a !== o.retryLane && (o.retryLane = a, no(e, a), vl(i, e, a, -1));
			}
			return Ml(), i = As(Error(r(421))), G(e, t, s, i);
		}
		return a.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Gl.bind(null, e), a._reactRetry = t, null) : (e = o.treeContext, Ta = ji(a.nextSibling), wa = t, Ea = !0, Da = null, e !== null && (ha[ga++] = va, ha[ga++] = ya, ha[ga++] = _a, va = e.id, ya = e.overflow, _a = t), t = $s(t, i.children), t.flags |= 4096, t);
	}
	function tc(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), Xa(e.return, t, n);
	}
	function nc(e, t, n, r, i) {
		var a = e.memoizedState;
		a === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i
		} : (a.isBackwards = t, a.rendering = null, a.renderingStartTime = 0, a.last = r, a.tail = n, a.tailMode = i);
	}
	function rc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		if (zs(e, t, r.children, n), r = So.current, r & 2) r = r & 1 | 2, t.flags |= 128;
		else {
			if (e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
				if (e.tag === 13) e.memoizedState !== null && tc(e, n, t);
				else if (e.tag === 19) tc(e, n, t);
				else if (e.child !== null) {
					e.child.return = e, e = e.child;
					continue;
				}
				if (e === t) break a;
				for (; e.sibling === null;) {
					if (e.return === null || e.return === t) break a;
					e = e.return;
				}
				e.sibling.return = e.return, e = e.sibling;
			}
			r &= 1;
		}
		if (Ji(So, r), !(t.mode & 1)) t.memoizedState = null;
		else switch (i) {
			case "forwards":
				for (n = t.child, i = null; n !== null;) e = n.alternate, e !== null && Co(e) === null && (i = n), n = n.sibling;
				n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), nc(t, !1, i, n, a);
				break;
			case "backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && Co(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				nc(t, !0, n, null, a);
				break;
			case "together":
				nc(t, !1, null, null, void 0);
				break;
			default: t.memoizedState = null;
		}
		return t.child;
	}
	function ic(e, t) {
		!(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
	}
	function ac(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), Qc |= t.lanes, (n & t.childLanes) === 0) return null;
		if (e !== null && t.child !== e.child) throw Error(r(153));
		if (t.child !== null) {
			for (e = t.child, n = $l(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = $l(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function oc(e, t, n) {
		switch (t.tag) {
			case 3:
				Js(t), Fa();
				break;
			case 5:
				bo(t);
				break;
			case 1:
				V(t.type) && ra(t);
				break;
			case 4:
				vo(t, t.stateNode.containerInfo);
				break;
			case 10:
				var r = t.type._context, i = t.memoizedProps.value;
				Ji(Wa, r._currentValue), r._currentValue = i;
				break;
			case 13:
				if (r = t.memoizedState, r !== null) return r.dehydrated === null ? (n & t.child.childLanes) === 0 ? (Ji(So, So.current & 1), e = ac(e, t, n), e === null ? null : e.sibling) : Qs(e, t, n) : (Ji(So, So.current & 1), t.flags |= 128, null);
				Ji(So, So.current & 1);
				break;
			case 19:
				if (r = (n & t.childLanes) !== 0, e.flags & 128) {
					if (r) return rc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), Ji(So, So.current), r) break;
				return null;
			case 22:
			case 23: return t.lanes = 0, Us(e, t, n);
		}
		return ac(e, t, n);
	}
	var sc = function(e, t) {
		for (var n = t.child; n !== null;) {
			if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
			else if (n.tag !== 4 && n.child !== null) {
				n.child.return = n, n = n.child;
				continue;
			}
			if (n === t) break;
			for (; n.sibling === null;) {
				if (n.return === null || n.return === t) return;
				n = n.return;
			}
			n.sibling.return = n.return, n = n.sibling;
		}
	}, cc = function(e, t, n, r) {
		var i = e.memoizedProps;
		if (i !== r) {
			e = t.stateNode, _o(mo.current);
			var o = null;
			switch (n) {
				case "input":
					i = pe(e, i), r = pe(e, r), o = [];
					break;
				case "select":
					i = F({}, i, { value: void 0 }), r = F({}, r, { value: void 0 }), o = [];
					break;
				case "textarea":
					i = xe(e, i), r = xe(e, r), o = [];
					break;
				default: typeof i.onClick != "function" && typeof r.onClick == "function" && (e.onclick = xi);
			}
			Fe(n, r);
			var s;
			for (u in n = null, i) if (!r.hasOwnProperty(u) && i.hasOwnProperty(u) && i[u] != null) {
				if (u === "style") {
					var c = i[u];
					for (s in c) c.hasOwnProperty(s) && (n || (n = {}), n[s] = "");
				} else u !== "dangerouslySetInnerHTML" && u !== "children" && u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (a.hasOwnProperty(u) ? o || (o = []) : (o = o || []).push(u, null));
			}
			for (u in r) {
				var l = r[u];
				if (c = i == null ? void 0 : i[u], r.hasOwnProperty(u) && l !== c && (l != null || c != null)) {
					if (u === "style") {
						if (c) {
							for (s in c) !c.hasOwnProperty(s) || l && l.hasOwnProperty(s) || (n || (n = {}), n[s] = "");
							for (s in l) l.hasOwnProperty(s) && c[s] !== l[s] && (n || (n = {}), n[s] = l[s]);
						} else n || (o || (o = []), o.push(u, n)), n = l;
					} else u === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, c = c ? c.__html : void 0, l != null && c !== l && (o = o || []).push(u, l)) : u === "children" ? typeof l != "string" && typeof l != "number" || (o = o || []).push(u, "" + l) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (a.hasOwnProperty(u) ? (l != null && u === "onScroll" && si("scroll", e), o || c === l || (o = [])) : (o = o || []).push(u, l));
				}
			}
			n && (o = o || []).push("style", n);
			var u = o;
			(t.updateQueue = u) && (t.flags |= 4);
		}
	}, lc = function(e, t, n, r) {
		n !== r && (t.flags |= 4);
	};
	function uc(e, t) {
		if (!Ea) switch (e.tailMode) {
			case "hidden":
				t = e.tail;
				for (var n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
				break;
			case "collapsed":
				n = e.tail;
				for (var r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
		}
	}
	function dc(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 14680064, r |= i.flags & 14680064, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function fc(e, t, n) {
		var i = t.pendingProps;
		switch (Ca(t), t.tag) {
			case 2:
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return dc(t), null;
			case 1: return V(t.type) && $i(), dc(t), null;
			case 3: return i = t.stateNode, yo(), qi(Zi), qi(Xi), To(), i.pendingContext && (i.context = i.pendingContext, i.pendingContext = null), (e === null || e.child === null) && (Na(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Da !== null && (Sl(Da), Da = null))), dc(t), null;
			case 5:
				xo(t);
				var o = _o(go.current);
				if (n = t.type, e !== null && t.stateNode != null) cc(e, t, n, i, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
				else {
					if (!i) {
						if (t.stateNode === null) throw Error(r(166));
						return dc(t), null;
					}
					if (e = _o(mo.current), Na(t)) {
						i = t.stateNode, n = t.type;
						var s = t.memoizedProps;
						switch (i[Pi] = t, i[Fi] = s, e = !!(t.mode & 1), n) {
							case "dialog":
								si("cancel", i), si("close", i);
								break;
							case "iframe":
							case "object":
							case "embed":
								si("load", i);
								break;
							case "video":
							case "audio":
								for (o = 0; o < ri.length; o++) si(ri[o], i);
								break;
							case "source":
								si("error", i);
								break;
							case "img":
							case "image":
							case "link":
								si("error", i), si("load", i);
								break;
							case "details":
								si("toggle", i);
								break;
							case "input":
								me(i, s), si("invalid", i);
								break;
							case "select":
								i._wrapperState = { wasMultiple: !!s.multiple }, si("invalid", i);
								break;
							case "textarea": Se(i, s), si("invalid", i);
						}
						for (var c in Fe(n, s), o = null, s) if (s.hasOwnProperty(c)) {
							var l = s[c];
							c === "children" ? typeof l == "string" ? i.textContent !== l && (!0 !== s.suppressHydrationWarning && bi(i.textContent, l, e), o = ["children", l]) : typeof l == "number" && i.textContent !== "" + l && (!0 !== s.suppressHydrationWarning && bi(i.textContent, l, e), o = ["children", "" + l]) : a.hasOwnProperty(c) && l != null && c === "onScroll" && si("scroll", i);
						}
						switch (n) {
							case "input":
								ue(i), _e(i, s, !0);
								break;
							case "textarea":
								ue(i), we(i);
								break;
							case "select":
							case "option": break;
							default: typeof s.onClick == "function" && (i.onclick = xi);
						}
						i = o, t.updateQueue = i, i !== null && (t.flags |= 4);
					} else {
						c = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Te(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = c.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof i.is == "string" ? e = c.createElement(n, { is: i.is }) : (e = c.createElement(n), n === "select" && (c = e, i.multiple ? c.multiple = !0 : i.size && (c.size = i.size))) : e = c.createElementNS(e, n), e[Pi] = t, e[Fi] = i, sc(e, t, !1, !1), t.stateNode = e;
						a: {
							switch (c = Ie(n, i), n) {
								case "dialog":
									si("cancel", e), si("close", e), o = i;
									break;
								case "iframe":
								case "object":
								case "embed":
									si("load", e), o = i;
									break;
								case "video":
								case "audio":
									for (o = 0; o < ri.length; o++) si(ri[o], e);
									o = i;
									break;
								case "source":
									si("error", e), o = i;
									break;
								case "img":
								case "image":
								case "link":
									si("error", e), si("load", e), o = i;
									break;
								case "details":
									si("toggle", e), o = i;
									break;
								case "input":
									me(e, i), o = pe(e, i), si("invalid", e);
									break;
								case "option":
									o = i;
									break;
								case "select":
									e._wrapperState = { wasMultiple: !!i.multiple }, o = F({}, i, { value: void 0 }), si("invalid", e);
									break;
								case "textarea":
									Se(e, i), o = xe(e, i), si("invalid", e);
									break;
								default: o = i;
							}
							for (s in Fe(n, o), l = o, l) if (l.hasOwnProperty(s)) {
								var u = l[s];
								s === "style" ? Ne(e, u) : s === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, u != null && Oe(e, u)) : s === "children" ? typeof u == "string" ? (n !== "textarea" || u !== "") && ke(e, u) : typeof u == "number" && ke(e, "" + u) : s !== "suppressContentEditableWarning" && s !== "suppressHydrationWarning" && s !== "autoFocus" && (a.hasOwnProperty(s) ? u != null && s === "onScroll" && si("scroll", e) : u != null && b(e, s, u, c));
							}
							switch (n) {
								case "input":
									ue(e), _e(e, i, !1);
									break;
								case "textarea":
									ue(e), we(e);
									break;
								case "option":
									i.value != null && e.setAttribute("value", "" + se(i.value));
									break;
								case "select":
									e.multiple = !!i.multiple, s = i.value, s == null ? i.defaultValue != null && be(e, !!i.multiple, i.defaultValue, !0) : be(e, !!i.multiple, s, !1);
									break;
								default: typeof o.onClick == "function" && (e.onclick = xi);
							}
							switch (n) {
								case "button":
								case "input":
								case "select":
								case "textarea":
									i = !!i.autoFocus;
									break a;
								case "img":
									i = !0;
									break a;
								default: i = !1;
							}
						}
						i && (t.flags |= 4);
					}
					t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
				}
				return dc(t), null;
			case 6:
				if (e && t.stateNode != null) lc(e, t, e.memoizedProps, i);
				else {
					if (typeof i != "string" && t.stateNode === null) throw Error(r(166));
					if (n = _o(go.current), _o(mo.current), Na(t)) {
						if (i = t.stateNode, n = t.memoizedProps, i[Pi] = t, (s = i.nodeValue !== n) && (e = wa, e !== null)) switch (e.tag) {
							case 3:
								bi(i.nodeValue, n, !!(e.mode & 1));
								break;
							case 5: !0 !== e.memoizedProps.suppressHydrationWarning && bi(i.nodeValue, n, !!(e.mode & 1));
						}
						s && (t.flags |= 4);
					} else i = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(i), i[Pi] = t, t.stateNode = i;
				}
				return dc(t), null;
			case 13:
				if (qi(So), i = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (Ea && Ta !== null && t.mode & 1 && !(t.flags & 128)) Pa(), Fa(), t.flags |= 98560, s = !1;
					else if (s = Na(t), i !== null && i.dehydrated !== null) {
						if (e === null) {
							if (!s) throw Error(r(318));
							if (s = t.memoizedState, s = s === null ? null : s.dehydrated, !s) throw Error(r(317));
							s[Pi] = t;
						} else Fa(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						dc(t), s = !1;
					} else Da !== null && (Sl(Da), Da = null), s = !0;
					if (!s) return t.flags & 65536 ? t : null;
				}
				return t.flags & 128 ? (t.lanes = n, t) : (i = i !== null, i !== (e !== null && e.memoizedState !== null) && i && (t.child.flags |= 8192, t.mode & 1 && (e === null || So.current & 1 ? Xc === 0 && (Xc = 3) : Ml())), t.updateQueue !== null && (t.flags |= 4), dc(t), null);
			case 4: return yo(), e === null && ui(t.stateNode.containerInfo), dc(t), null;
			case 10: return Ya(t.type._context), dc(t), null;
			case 17: return V(t.type) && $i(), dc(t), null;
			case 19:
				if (qi(So), s = t.memoizedState, s === null) return dc(t), null;
				if (i = !!(t.flags & 128), c = s.rendering, c === null) {
					if (i) uc(s, !1);
					else {
						if (Xc !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (c = Co(e), c !== null) {
								for (t.flags |= 128, uc(s, !1), i = c.updateQueue, i !== null && (t.updateQueue = i, t.flags |= 4), t.subtreeFlags = 0, i = n, n = t.child; n !== null;) s = n, e = i, s.flags &= 14680066, c = s.alternate, c === null ? (s.childLanes = 0, s.lanes = e, s.child = null, s.subtreeFlags = 0, s.memoizedProps = null, s.memoizedState = null, s.updateQueue = null, s.dependencies = null, s.stateNode = null) : (s.childLanes = c.childLanes, s.lanes = c.lanes, s.child = c.child, s.subtreeFlags = 0, s.deletions = null, s.memoizedProps = c.memoizedProps, s.memoizedState = c.memoizedState, s.updateQueue = c.updateQueue, s.type = c.type, e = c.dependencies, s.dependencies = e === null ? null : {
									lanes: e.lanes,
									firstContext: e.firstContext
								}), n = n.sibling;
								return Ji(So, So.current & 1 | 2), t.child;
							}
							e = e.sibling;
						}
						s.tail !== null && gt() > il && (t.flags |= 128, i = !0, uc(s, !1), t.lanes = 4194304);
					}
				} else {
					if (!i) {
						if (e = Co(c), e !== null) {
							if (t.flags |= 128, i = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), uc(s, !0), s.tail === null && s.tailMode === "hidden" && !c.alternate && !Ea) return dc(t), null;
						} else 2 * gt() - s.renderingStartTime > il && n !== 1073741824 && (t.flags |= 128, i = !0, uc(s, !1), t.lanes = 4194304);
					}
					s.isBackwards ? (c.sibling = t.child, t.child = c) : (n = s.last, n === null ? t.child = c : n.sibling = c, s.last = c);
				}
				return s.tail === null ? (dc(t), null) : (t = s.tail, s.rendering = t, s.tail = t.sibling, s.renderingStartTime = gt(), t.sibling = null, n = So.current, Ji(So, i ? n & 1 | 2 : n & 1), t);
			case 22:
			case 23: return Ol(), i = t.memoizedState !== null, e !== null && e.memoizedState !== null !== i && (t.flags |= 8192), i && t.mode & 1 ? Jc & 1073741824 && (dc(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : dc(t), null;
			case 24: return null;
			case 25: return null;
		}
		throw Error(r(156, t.tag));
	}
	function pc(e, t) {
		switch (Ca(t), t.tag) {
			case 1: return V(t.type) && $i(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return yo(), qi(Zi), qi(Xi), To(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 5: return xo(t), null;
			case 13:
				if (qi(So), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(r(340));
					Fa();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return qi(So), null;
			case 4: return yo(), null;
			case 10: return Ya(t.type._context), null;
			case 22:
			case 23: return Ol(), null;
			case 24: return null;
			default: return null;
		}
	}
	var mc = !1, K = !1, hc = typeof WeakSet == "function" ? WeakSet : Set, q = null;
	function gc(e, t) {
		var n = e.ref;
		if (n !== null) {
			if (typeof n == "function") try {
				n(null);
			} catch (n) {
				Hl(e, t, n);
			}
			else n.current = null;
		}
	}
	function _c(e, t, n) {
		try {
			n();
		} catch (n) {
			Hl(e, t, n);
		}
	}
	var vc = !1;
	function yc(e, t) {
		if (Si = mn, e = Pr(), Fr(e)) {
			if ("selectionStart" in e) var n = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				n = (n = e.ownerDocument) && n.defaultView || window;
				var i = n.getSelection && n.getSelection();
				if (i && i.rangeCount !== 0) {
					n = i.anchorNode;
					var a = i.anchorOffset, o = i.focusNode;
					i = i.focusOffset;
					try {
						n.nodeType, o.nodeType;
					} catch {
						n = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== n || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || i !== 0 && f.nodeType !== 3 || (l = s + i), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === n && ++u === a && (c = s), p === o && ++d === i && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					n = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else n = null;
			}
			n = n || {
				start: 0,
				end: 0
			};
		} else n = null;
		for (Ci = {
			focusedElem: e,
			selectionRange: n
		}, mn = !1, q = t; q !== null;) if (t = q, e = t.child, t.subtreeFlags & 1028 && e !== null) e.return = t, q = e;
		else for (; q !== null;) {
			t = q;
			try {
				var h = t.alternate;
				if (t.flags & 1024) switch (t.tag) {
					case 0:
					case 11:
					case 15: break;
					case 1:
						if (h !== null) {
							var g = h.memoizedProps, _ = h.memoizedState, v = t.stateNode;
							v.__reactInternalSnapshotBeforeUpdate = v.getSnapshotBeforeUpdate(t.elementType === t.type ? g : ws(t.type, g), _);
						}
						break;
					case 3:
						var y = t.stateNode.containerInfo;
						y.nodeType === 1 ? y.textContent = "" : y.nodeType === 9 && y.documentElement && y.removeChild(y.documentElement);
						break;
					case 5:
					case 6:
					case 4:
					case 17: break;
					default: throw Error(r(163));
				}
			} catch (e) {
				Hl(t, t.return, e);
			}
			if (e = t.sibling, e !== null) {
				e.return = t.return, q = e;
				break;
			}
			q = t.return;
		}
		return h = vc, vc = !1, h;
	}
	function bc(e, t, n) {
		var r = t.updateQueue;
		if (r = r === null ? null : r.lastEffect, r !== null) {
			var i = r = r.next;
			do {
				if ((i.tag & e) === e) {
					var a = i.destroy;
					i.destroy = void 0, a !== void 0 && _c(t, n, a);
				}
				i = i.next;
			} while (i !== r);
		}
	}
	function xc(e, t) {
		if (t = t.updateQueue, t = t === null ? null : t.lastEffect, t !== null) {
			var n = t = t.next;
			do {
				if ((n.tag & e) === e) {
					var r = n.create;
					n.destroy = r();
				}
				n = n.next;
			} while (n !== t);
		}
	}
	function Sc(e) {
		var t = e.ref;
		if (t !== null) {
			var n = e.stateNode;
			switch (e.tag) {
				case 5:
					e = n;
					break;
				default: e = n;
			}
			typeof t == "function" ? t(e) : t.current = e;
		}
	}
	function Cc(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, Cc(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Pi], delete t[Fi], delete t[Li], delete t[Ri], delete t[zi])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	function wc(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 4;
	}
	function Tc(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || wc(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Ec(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = xi));
		else if (r !== 4 && (e = e.child, e !== null)) for (Ec(e, t, n), e = e.sibling; e !== null;) Ec(e, t, n), e = e.sibling;
	}
	function Dc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (r !== 4 && (e = e.child, e !== null)) for (Dc(e, t, n), e = e.sibling; e !== null;) Dc(e, t, n), e = e.sibling;
	}
	var Oc = null, kc = !1;
	function Ac(e, t, n) {
		for (n = n.child; n !== null;) jc(e, t, n), n = n.sibling;
	}
	function jc(e, t, n) {
		if (wt && typeof wt.onCommitFiberUnmount == "function") try {
			wt.onCommitFiberUnmount(Ct, n);
		} catch {}
		switch (n.tag) {
			case 5: K || gc(n, t);
			case 6:
				var r = Oc, i = kc;
				Oc = null, Ac(e, t, n), Oc = r, kc = i, Oc !== null && (kc ? (e = Oc, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Oc.removeChild(n.stateNode));
				break;
			case 18:
				Oc !== null && (kc ? (e = Oc, n = n.stateNode, e.nodeType === 8 ? Ai(e.parentNode, n) : e.nodeType === 1 && Ai(e, n), fn(e)) : Ai(Oc, n.stateNode));
				break;
			case 4:
				r = Oc, i = kc, Oc = n.stateNode.containerInfo, kc = !0, Ac(e, t, n), Oc = r, kc = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				if (!K && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
					i = r = r.next;
					do {
						var a = i, o = a.destroy;
						a = a.tag, o !== void 0 && (a & 2 || a & 4) && _c(n, t, o), i = i.next;
					} while (i !== r);
				}
				Ac(e, t, n);
				break;
			case 1:
				if (!K && (gc(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
					r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
				} catch (e) {
					Hl(n, t, e);
				}
				Ac(e, t, n);
				break;
			case 21:
				Ac(e, t, n);
				break;
			case 22:
				n.mode & 1 ? (K = (r = K) || n.memoizedState !== null, Ac(e, t, n), K = r) : Ac(e, t, n);
				break;
			default: Ac(e, t, n);
		}
	}
	function Mc(e) {
		var t = e.updateQueue;
		if (t !== null) {
			e.updateQueue = null;
			var n = e.stateNode;
			n === null && (n = e.stateNode = new hc()), t.forEach(function(t) {
				var r = Kl.bind(null, e, t);
				n.has(t) || (n.add(t), t.then(r, r));
			});
		}
	}
	function J(e, t) {
		var n = t.deletions;
		if (n !== null) for (var i = 0; i < n.length; i++) {
			var a = n[i];
			try {
				var o = e, s = t, c = s;
				a: for (; c !== null;) {
					switch (c.tag) {
						case 5:
							Oc = c.stateNode, kc = !1;
							break a;
						case 3:
							Oc = c.stateNode.containerInfo, kc = !0;
							break a;
						case 4:
							Oc = c.stateNode.containerInfo, kc = !0;
							break a;
					}
					c = c.return;
				}
				if (Oc === null) throw Error(r(160));
				jc(o, s, a), Oc = null, kc = !1;
				var l = a.alternate;
				l !== null && (l.return = null), a.return = null;
			} catch (e) {
				Hl(a, t, e);
			}
		}
		if (t.subtreeFlags & 12854) for (t = t.child; t !== null;) Nc(t, e), t = t.sibling;
	}
	function Nc(e, t) {
		var n = e.alternate, i = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (J(t, e), Pc(e), i & 4) {
					try {
						bc(3, e, e.return), xc(3, e);
					} catch (t) {
						Hl(e, e.return, t);
					}
					try {
						bc(5, e, e.return);
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				break;
			case 1:
				J(t, e), Pc(e), i & 512 && n !== null && gc(n, n.return);
				break;
			case 5:
				if (J(t, e), Pc(e), i & 512 && n !== null && gc(n, n.return), e.flags & 32) {
					var a = e.stateNode;
					try {
						ke(a, "");
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				if (i & 4 && (a = e.stateNode, a != null)) {
					var o = e.memoizedProps, s = n === null ? o : n.memoizedProps, c = e.type, l = e.updateQueue;
					if (e.updateQueue = null, l !== null) try {
						c === "input" && o.type === "radio" && o.name != null && he(a, o), Ie(c, s);
						var u = Ie(c, o);
						for (s = 0; s < l.length; s += 2) {
							var d = l[s], f = l[s + 1];
							d === "style" ? Ne(a, f) : d === "dangerouslySetInnerHTML" ? Oe(a, f) : d === "children" ? ke(a, f) : b(a, d, f, u);
						}
						switch (c) {
							case "input":
								ge(a, o);
								break;
							case "textarea":
								Ce(a, o);
								break;
							case "select":
								var p = a._wrapperState.wasMultiple;
								a._wrapperState.wasMultiple = !!o.multiple;
								var m = o.value;
								m == null ? p !== !!o.multiple && (o.defaultValue == null ? be(a, !!o.multiple, o.multiple ? [] : "", !1) : be(a, !!o.multiple, o.defaultValue, !0)) : be(a, !!o.multiple, m, !1);
						}
						a[Fi] = o;
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				break;
			case 6:
				if (J(t, e), Pc(e), i & 4) {
					if (e.stateNode === null) throw Error(r(162));
					a = e.stateNode, o = e.memoizedProps;
					try {
						a.nodeValue = o;
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				break;
			case 3:
				if (J(t, e), Pc(e), i & 4 && n !== null && n.memoizedState.isDehydrated) try {
					fn(t.containerInfo);
				} catch (t) {
					Hl(e, e.return, t);
				}
				break;
			case 4:
				J(t, e), Pc(e);
				break;
			case 13:
				J(t, e), Pc(e), a = e.child, a.flags & 8192 && (o = a.memoizedState !== null, a.stateNode.isHidden = o, !o || a.alternate !== null && a.alternate.memoizedState !== null || (rl = gt())), i & 4 && Mc(e);
				break;
			case 22:
				if (d = n !== null && n.memoizedState !== null, e.mode & 1 ? (K = (u = K) || d, J(t, e), K = u) : J(t, e), Pc(e), i & 8192) {
					if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !d && e.mode & 1) for (q = e, d = e.child; d !== null;) {
						for (f = q = d; q !== null;) {
							switch (p = q, m = p.child, p.tag) {
								case 0:
								case 11:
								case 14:
								case 15:
									bc(4, p, p.return);
									break;
								case 1:
									gc(p, p.return);
									var h = p.stateNode;
									if (typeof h.componentWillUnmount == "function") {
										i = p, n = p.return;
										try {
											t = i, h.props = t.memoizedProps, h.state = t.memoizedState, h.componentWillUnmount();
										} catch (e) {
											Hl(i, n, e);
										}
									}
									break;
								case 5:
									gc(p, p.return);
									break;
								case 22: if (p.memoizedState !== null) {
									Rc(f);
									continue;
								}
							}
							m === null ? Rc(f) : (m.return = p, q = m);
						}
						d = d.sibling;
					}
					a: for (d = null, f = e;;) {
						if (f.tag === 5) {
							if (d === null) {
								d = f;
								try {
									a = f.stateNode, u ? (o = a.style, typeof o.setProperty == "function" ? o.setProperty("display", "none", "important") : o.display = "none") : (c = f.stateNode, l = f.memoizedProps.style, s = l != null && l.hasOwnProperty("display") ? l.display : null, c.style.display = Me("display", s));
								} catch (t) {
									Hl(e, e.return, t);
								}
							}
						} else if (f.tag === 6) {
							if (d === null) try {
								f.stateNode.nodeValue = u ? "" : f.memoizedProps;
							} catch (t) {
								Hl(e, e.return, t);
							}
						} else if ((f.tag !== 22 && f.tag !== 23 || f.memoizedState === null || f === e) && f.child !== null) {
							f.child.return = f, f = f.child;
							continue;
						}
						if (f === e) break a;
						for (; f.sibling === null;) {
							if (f.return === null || f.return === e) break a;
							d === f && (d = null), f = f.return;
						}
						d === f && (d = null), f.sibling.return = f.return, f = f.sibling;
					}
				}
				break;
			case 19:
				J(t, e), Pc(e), i & 4 && Mc(e);
				break;
			case 21: break;
			default: J(t, e), Pc(e);
		}
	}
	function Pc(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				a: {
					for (var n = e.return; n !== null;) {
						if (wc(n)) {
							var i = n;
							break a;
						}
						n = n.return;
					}
					throw Error(r(160));
				}
				switch (i.tag) {
					case 5:
						var a = i.stateNode;
						i.flags & 32 && (ke(a, ""), i.flags &= -33), Dc(e, Tc(e), a);
						break;
					case 3:
					case 4:
						var o = i.stateNode.containerInfo;
						Ec(e, Tc(e), o);
						break;
					default: throw Error(r(161));
				}
			} catch (t) {
				Hl(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function Fc(e, t, n) {
		q = e, Ic(e, t, n);
	}
	function Ic(e, t, n) {
		for (var r = !!(e.mode & 1); q !== null;) {
			var i = q, a = i.child;
			if (i.tag === 22 && r) {
				var o = i.memoizedState !== null || mc;
				if (!o) {
					var s = i.alternate, c = s !== null && s.memoizedState !== null || K;
					s = mc;
					var l = K;
					if (mc = o, (K = c) && !l) for (q = i; q !== null;) o = q, c = o.child, o.tag === 22 && o.memoizedState !== null || c === null ? zc(i) : (c.return = o, q = c);
					for (; a !== null;) q = a, Ic(a, t, n), a = a.sibling;
					q = i, mc = s, K = l;
				}
				Lc(e, t, n);
			} else i.subtreeFlags & 8772 && a !== null ? (a.return = i, q = a) : Lc(e, t, n);
		}
	}
	function Lc(e) {
		for (; q !== null;) {
			var t = q;
			if (t.flags & 8772) {
				var n = t.alternate;
				try {
					if (t.flags & 8772) switch (t.tag) {
						case 0:
						case 11:
						case 15:
							K || xc(5, t);
							break;
						case 1:
							var i = t.stateNode;
							if (t.flags & 4 && !K) {
								if (n === null) i.componentDidMount();
								else {
									var a = t.elementType === t.type ? n.memoizedProps : ws(t.type, n.memoizedProps);
									i.componentDidUpdate(a, n.memoizedState, i.__reactInternalSnapshotBeforeUpdate);
								}
							}
							var o = t.updateQueue;
							o !== null && fo(t, o, i);
							break;
						case 3:
							var s = t.updateQueue;
							if (s !== null) {
								if (n = null, t.child !== null) switch (t.child.tag) {
									case 5:
										n = t.child.stateNode;
										break;
									case 1: n = t.child.stateNode;
								}
								fo(t, s, n);
							}
							break;
						case 5:
							var c = t.stateNode;
							if (n === null && t.flags & 4) {
								n = c;
								var l = t.memoizedProps;
								switch (t.type) {
									case "button":
									case "input":
									case "select":
									case "textarea":
										l.autoFocus && n.focus();
										break;
									case "img": l.src && (n.src = l.src);
								}
							}
							break;
						case 6: break;
						case 4: break;
						case 12: break;
						case 13:
							if (t.memoizedState === null) {
								var u = t.alternate;
								if (u !== null) {
									var d = u.memoizedState;
									if (d !== null) {
										var f = d.dehydrated;
										f !== null && fn(f);
									}
								}
							}
							break;
						case 19:
						case 17:
						case 21:
						case 22:
						case 23:
						case 25: break;
						default: throw Error(r(163));
					}
					K || t.flags & 512 && Sc(t);
				} catch (e) {
					Hl(t, t.return, e);
				}
			}
			if (t === e) {
				q = null;
				break;
			}
			if (n = t.sibling, n !== null) {
				n.return = t.return, q = n;
				break;
			}
			q = t.return;
		}
	}
	function Rc(e) {
		for (; q !== null;) {
			var t = q;
			if (t === e) {
				q = null;
				break;
			}
			var n = t.sibling;
			if (n !== null) {
				n.return = t.return, q = n;
				break;
			}
			q = t.return;
		}
	}
	function zc(e) {
		for (; q !== null;) {
			var t = q;
			try {
				switch (t.tag) {
					case 0:
					case 11:
					case 15:
						var n = t.return;
						try {
							xc(4, t);
						} catch (e) {
							Hl(t, n, e);
						}
						break;
					case 1:
						var r = t.stateNode;
						if (typeof r.componentDidMount == "function") {
							var i = t.return;
							try {
								r.componentDidMount();
							} catch (e) {
								Hl(t, i, e);
							}
						}
						var a = t.return;
						try {
							Sc(t);
						} catch (e) {
							Hl(t, a, e);
						}
						break;
					case 5:
						var o = t.return;
						try {
							Sc(t);
						} catch (e) {
							Hl(t, o, e);
						}
				}
			} catch (e) {
				Hl(t, t.return, e);
			}
			if (t === e) {
				q = null;
				break;
			}
			var s = t.sibling;
			if (s !== null) {
				s.return = t.return, q = s;
				break;
			}
			q = t.return;
		}
	}
	var Bc = Math.ceil, Vc = x.ReactCurrentDispatcher, Hc = x.ReactCurrentOwner, Uc = x.ReactCurrentBatchConfig, Wc = 0, Gc = null, Kc = null, qc = 0, Jc = 0, Yc = Ki(0), Xc = 0, Zc = null, Qc = 0, $c = 0, el = 0, tl = null, nl = null, rl = 0, il = Infinity, al = null, ol = !1, sl = null, cl = null, ll = !1, ul = null, dl = 0, fl = 0, pl = null, ml = -1, hl = 0;
	function gl() {
		return Wc & 6 ? gt() : ml === -1 ? ml = gt() : ml;
	}
	function _l(e) {
		return e.mode & 1 ? Wc & 2 && qc !== 0 ? qc & -qc : La.transition === null ? (e = Ht, e === 0 ? (e = window.event, e = e === void 0 ? 16 : bn(e.type), e) : e) : (hl === 0 && (hl = Lt()), hl) : 1;
	}
	function vl(e, t, n, i) {
		if (50 < fl) throw fl = 0, pl = null, Error(r(185));
		zt(e, n, i), (!(Wc & 2) || e !== Gc) && (e === Gc && (!(Wc & 2) && ($c |= n), Xc === 4 && wl(e, qc)), yl(e, i), n === 1 && Wc === 0 && !(t.mode & 1) && (il = gt() + 500, oa && ua()));
	}
	function yl(e, t) {
		var n = e.callbackNode;
		Ft(e, t);
		var r = Nt(e, e === Gc ? qc : 0);
		if (r === 0) n !== null && pt(n), e.callbackNode = null, e.callbackPriority = 0;
		else if (t = r & -r, e.callbackPriority !== t) {
			if (n != null && pt(n), t === 1) e.tag === 0 ? la(Tl.bind(null, e)) : ca(Tl.bind(null, e)), Oi(function() {
				!(Wc & 6) && ua();
			}), n = null;
			else {
				switch (Ut(r)) {
					case 1:
						n = vt;
						break;
					case 4:
						n = yt;
						break;
					case 16:
						n = bt;
						break;
					case 536870912:
						n = St;
						break;
					default: n = bt;
				}
				n = Jl(n, bl.bind(null, e));
			}
			e.callbackPriority = t, e.callbackNode = n;
		}
	}
	function bl(e, t) {
		if (ml = -1, hl = 0, Wc & 6) throw Error(r(327));
		var n = e.callbackNode;
		if (Bl() && e.callbackNode !== n) return null;
		var i = Nt(e, e === Gc ? qc : 0);
		if (i === 0) return null;
		if (i & 30 || (i & e.expiredLanes) !== 0 || t) t = Nl(e, i);
		else {
			t = i;
			var a = Wc;
			Wc |= 2;
			var o = jl();
			(Gc !== e || qc !== t) && (al = null, il = gt() + 500, kl(e, t));
			do
				try {
					Fl();
					break;
				} catch (t) {
					Al(e, t);
				}
			while (1);
			Ja(), Vc.current = o, Wc = a, Kc === null ? (Gc = null, qc = 0, t = Xc) : t = 0;
		}
		if (t !== 0) {
			if (t === 2 && (a = It(e), a !== 0 && (i = a, t = xl(e, a))), t === 1) throw n = Zc, kl(e, 0), wl(e, i), yl(e, gt()), n;
			if (t === 6) wl(e, i);
			else {
				if (a = e.current.alternate, !(i & 30) && !Cl(a) && (t = Nl(e, i), t === 2 && (o = It(e), o !== 0 && (i = o, t = xl(e, o))), t === 1)) throw n = Zc, kl(e, 0), wl(e, i), yl(e, gt()), n;
				switch (e.finishedWork = a, e.finishedLanes = i, t) {
					case 0:
					case 1: throw Error(r(345));
					case 2:
						Rl(e, nl, al);
						break;
					case 3:
						if (wl(e, i), (i & 130023424) === i && (t = rl + 500 - gt(), 10 < t)) {
							if (Nt(e, 0) !== 0) break;
							if (a = e.suspendedLanes, (a & i) !== i) {
								gl(), e.pingedLanes |= e.suspendedLanes & a;
								break;
							}
							e.timeoutHandle = Ti(Rl.bind(null, e, nl, al), t);
							break;
						}
						Rl(e, nl, al);
						break;
					case 4:
						if (wl(e, i), (i & 4194240) === i) break;
						for (t = e.eventTimes, a = -1; 0 < i;) {
							var s = 31 - Et(i);
							o = 1 << s, s = t[s], s > a && (a = s), i &= ~o;
						}
						if (i = a, i = gt() - i, i = (120 > i ? 120 : 480 > i ? 480 : 1080 > i ? 1080 : 1920 > i ? 1920 : 3e3 > i ? 3e3 : 4320 > i ? 4320 : 1960 * Bc(i / 1960)) - i, 10 < i) {
							e.timeoutHandle = Ti(Rl.bind(null, e, nl, al), i);
							break;
						}
						Rl(e, nl, al);
						break;
					case 5:
						Rl(e, nl, al);
						break;
					default: throw Error(r(329));
				}
			}
		}
		return yl(e, gt()), e.callbackNode === n ? bl.bind(null, e) : null;
	}
	function xl(e, t) {
		var n = tl;
		return e.current.memoizedState.isDehydrated && (kl(e, t).flags |= 256), e = Nl(e, t), e !== 2 && (t = nl, nl = n, t !== null && Sl(t)), e;
	}
	function Sl(e) {
		nl === null ? nl = e : nl.push.apply(nl, e);
	}
	function Cl(e) {
		for (var t = e;;) {
			if (t.flags & 16384) {
				var n = t.updateQueue;
				if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
					var i = n[r], a = i.getSnapshot;
					i = i.value;
					try {
						if (!kr(a(), i)) return !1;
					} catch {
						return !1;
					}
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function wl(e, t) {
		for (t &= ~el, t &= ~$c, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t;) {
			var n = 31 - Et(t), r = 1 << n;
			e[n] = -1, t &= ~r;
		}
	}
	function Tl(e) {
		if (Wc & 6) throw Error(r(327));
		Bl();
		var t = Nt(e, 0);
		if (!(t & 1)) return yl(e, gt()), null;
		var n = Nl(e, t);
		if (e.tag !== 0 && n === 2) {
			var i = It(e);
			i !== 0 && (t = i, n = xl(e, i));
		}
		if (n === 1) throw n = Zc, kl(e, 0), wl(e, t), yl(e, gt()), n;
		if (n === 6) throw Error(r(345));
		return e.finishedWork = e.current.alternate, e.finishedLanes = t, Rl(e, nl, al), yl(e, gt()), null;
	}
	function El(e, t) {
		var n = Wc;
		Wc |= 1;
		try {
			return e(t);
		} finally {
			Wc = n, Wc === 0 && (il = gt() + 500, oa && ua());
		}
	}
	function Dl(e) {
		ul !== null && ul.tag === 0 && !(Wc & 6) && Bl();
		var t = Wc;
		Wc |= 1;
		var n = Uc.transition, r = Ht;
		try {
			if (Uc.transition = null, Ht = 1, e) return e();
		} finally {
			Ht = r, Uc.transition = n, Wc = t, !(Wc & 6) && ua();
		}
	}
	function Ol() {
		Jc = Yc.current, qi(Yc);
	}
	function kl(e, t) {
		e.finishedWork = null, e.finishedLanes = 0;
		var n = e.timeoutHandle;
		if (n !== -1 && (e.timeoutHandle = -1, Ei(n)), Kc !== null) for (n = Kc.return; n !== null;) {
			var r = n;
			switch (Ca(r), r.tag) {
				case 1:
					r = r.type.childContextTypes, r != null && $i();
					break;
				case 3:
					yo(), qi(Zi), qi(Xi), To();
					break;
				case 5:
					xo(r);
					break;
				case 4:
					yo();
					break;
				case 13:
					qi(So);
					break;
				case 19:
					qi(So);
					break;
				case 10:
					Ya(r.type._context);
					break;
				case 22:
				case 23: Ol();
			}
			n = n.return;
		}
		if (Gc = e, Kc = e = $l(e.current, null), qc = Jc = t, Xc = 0, Zc = null, el = $c = Qc = 0, nl = tl = null, $a !== null) {
			for (t = 0; t < $a.length; t++) if (n = $a[t], r = n.interleaved, r !== null) {
				n.interleaved = null;
				var i = r.next, a = n.pending;
				if (a !== null) {
					var o = a.next;
					a.next = i, r.next = o;
				}
				n.pending = r;
			}
			$a = null;
		}
		return e;
	}
	function Al(e, t) {
		do {
			var n = Kc;
			try {
				if (Ja(), Eo.current = bs, Mo) {
					for (var i = ko.memoizedState; i !== null;) {
						var a = i.queue;
						a !== null && (a.pending = null), i = i.next;
					}
					Mo = !1;
				}
				if (Oo = 0, jo = Ao = ko = null, No = !1, Po = 0, Hc.current = null, n === null || n.return === null) {
					Xc = 1, Zc = t, Kc = null;
					break;
				}
				a: {
					var o = e, s = n.return, c = n, l = t;
					if (t = qc, c.flags |= 32768, typeof l == "object" && l && typeof l.then == "function") {
						var u = l, d = c, f = d.tag;
						if (!(d.mode & 1) && (f === 0 || f === 11 || f === 15)) {
							var p = d.alternate;
							p ? (d.updateQueue = p.updateQueue, d.memoizedState = p.memoizedState, d.lanes = p.lanes) : (d.updateQueue = null, d.memoizedState = null);
						}
						var m = Fs(s);
						if (m !== null) {
							m.flags &= -257, Is(m, s, c, o, t), m.mode & 1 && Ps(o, u, t), t = m, l = u;
							var h = t.updateQueue;
							if (h === null) {
								var g = /* @__PURE__ */ new Set();
								g.add(l), t.updateQueue = g;
							} else h.add(l);
							break a;
						}
						if (!(t & 1)) {
							Ps(o, u, t), Ml();
							break a;
						}
						l = Error(r(426));
					} else if (Ea && c.mode & 1) {
						var _ = Fs(s);
						if (_ !== null) {
							!(_.flags & 65536) && (_.flags |= 256), Is(_, s, c, o, t), Ia(ks(l, c));
							break a;
						}
					}
					o = l = ks(l, c), Xc !== 4 && (Xc = 2), tl === null ? tl = [o] : tl.push(o), o = s;
					do {
						switch (o.tag) {
							case 3:
								o.flags |= 65536, t &= -t, o.lanes |= t;
								var v = Ms(o, l, t);
								lo(o, v);
								break a;
							case 1:
								c = l;
								var y = o.type, b = o.stateNode;
								if (!(o.flags & 128) && (typeof y.getDerivedStateFromError == "function" || b !== null && typeof b.componentDidCatch == "function" && (cl === null || !cl.has(b)))) {
									o.flags |= 65536, t &= -t, o.lanes |= t;
									var x = Ns(o, c, t);
									lo(o, x);
									break a;
								}
						}
						o = o.return;
					} while (o !== null);
				}
				Ll(n);
			} catch (e) {
				t = e, Kc === n && n !== null && (Kc = n = n.return);
				continue;
			}
			break;
		} while (1);
	}
	function jl() {
		var e = Vc.current;
		return Vc.current = bs, e === null ? bs : e;
	}
	function Ml() {
		(Xc === 0 || Xc === 3 || Xc === 2) && (Xc = 4), Gc === null || !(Qc & 268435455) && !($c & 268435455) || wl(Gc, qc);
	}
	function Nl(e, t) {
		var n = Wc;
		Wc |= 2;
		var i = jl();
		(Gc !== e || qc !== t) && (al = null, kl(e, t));
		do
			try {
				Pl();
				break;
			} catch (t) {
				Al(e, t);
			}
		while (1);
		if (Ja(), Wc = n, Vc.current = i, Kc !== null) throw Error(r(261));
		return Gc = null, qc = 0, Xc;
	}
	function Pl() {
		for (; Kc !== null;) Il(Kc);
	}
	function Fl() {
		for (; Kc !== null && !mt();) Il(Kc);
	}
	function Il(e) {
		var t = ql(e.alternate, e, Jc);
		e.memoizedProps = e.pendingProps, t === null ? Ll(e) : Kc = t, Hc.current = null;
	}
	function Ll(e) {
		var t = e;
		do {
			var n = t.alternate;
			if (e = t.return, t.flags & 32768) {
				if (n = pc(n, t), n !== null) {
					n.flags &= 32767, Kc = n;
					return;
				}
				if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
				else {
					Xc = 6, Kc = null;
					return;
				}
			} else if (n = fc(n, t, Jc), n !== null) {
				Kc = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				Kc = t;
				return;
			}
			Kc = t = e;
		} while (t !== null);
		Xc === 0 && (Xc = 5);
	}
	function Rl(e, t, n) {
		var r = Ht, i = Uc.transition;
		try {
			Uc.transition = null, Ht = 1, zl(e, t, n, r);
		} finally {
			Uc.transition = i, Ht = r;
		}
		return null;
	}
	function zl(e, t, n, i) {
		do
			Bl();
		while (ul !== null);
		if (Wc & 6) throw Error(r(327));
		n = e.finishedWork;
		var a = e.finishedLanes;
		if (n === null) return null;
		if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(r(177));
		e.callbackNode = null, e.callbackPriority = 0;
		var o = n.lanes | n.childLanes;
		if (Bt(e, o), e === Gc && (Kc = Gc = null, qc = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || ll || (ll = !0, Jl(bt, function() {
			return Bl(), null;
		})), o = !!(n.flags & 15990), n.subtreeFlags & 15990 || o) {
			o = Uc.transition, Uc.transition = null;
			var s = Ht;
			Ht = 1;
			var c = Wc;
			Wc |= 4, Hc.current = null, yc(e, n), Nc(n, e), Ir(Ci), mn = !!Si, Ci = Si = null, e.current = n, Fc(n, e, a), ht(), Wc = c, Ht = s, Uc.transition = o;
		} else e.current = n;
		if (ll && (ll = !1, ul = e, dl = a), o = e.pendingLanes, o === 0 && (cl = null), Tt(n.stateNode, i), yl(e, gt()), t !== null) for (i = e.onRecoverableError, n = 0; n < t.length; n++) a = t[n], i(a.value, {
			componentStack: a.stack,
			digest: a.digest
		});
		if (ol) throw ol = !1, e = sl, sl = null, e;
		return dl & 1 && e.tag !== 0 && Bl(), o = e.pendingLanes, o & 1 ? e === pl ? fl++ : (fl = 0, pl = e) : fl = 0, ua(), null;
	}
	function Bl() {
		if (ul !== null) {
			var e = Ut(dl), t = Uc.transition, n = Ht;
			try {
				if (Uc.transition = null, Ht = 16 > e ? 16 : e, ul === null) var i = !1;
				else {
					if (e = ul, ul = null, dl = 0, Wc & 6) throw Error(r(331));
					var a = Wc;
					for (Wc |= 4, q = e.current; q !== null;) {
						var o = q, s = o.child;
						if (q.flags & 16) {
							var c = o.deletions;
							if (c !== null) {
								for (var l = 0; l < c.length; l++) {
									var u = c[l];
									for (q = u; q !== null;) {
										var d = q;
										switch (d.tag) {
											case 0:
											case 11:
											case 15: bc(8, d, o);
										}
										var f = d.child;
										if (f !== null) f.return = d, q = f;
										else for (; q !== null;) {
											d = q;
											var p = d.sibling, m = d.return;
											if (Cc(d), d === u) {
												q = null;
												break;
											}
											if (p !== null) {
												p.return = m, q = p;
												break;
											}
											q = m;
										}
									}
								}
								var h = o.alternate;
								if (h !== null) {
									var g = h.child;
									if (g !== null) {
										h.child = null;
										do {
											var _ = g.sibling;
											g.sibling = null, g = _;
										} while (g !== null);
									}
								}
								q = o;
							}
						}
						if (o.subtreeFlags & 2064 && s !== null) s.return = o, q = s;
						else b: for (; q !== null;) {
							if (o = q, o.flags & 2048) switch (o.tag) {
								case 0:
								case 11:
								case 15: bc(9, o, o.return);
							}
							var v = o.sibling;
							if (v !== null) {
								v.return = o.return, q = v;
								break b;
							}
							q = o.return;
						}
					}
					var y = e.current;
					for (q = y; q !== null;) {
						s = q;
						var b = s.child;
						if (s.subtreeFlags & 2064 && b !== null) b.return = s, q = b;
						else b: for (s = y; q !== null;) {
							if (c = q, c.flags & 2048) try {
								switch (c.tag) {
									case 0:
									case 11:
									case 15: xc(9, c);
								}
							} catch (e) {
								Hl(c, c.return, e);
							}
							if (c === s) {
								q = null;
								break b;
							}
							var x = c.sibling;
							if (x !== null) {
								x.return = c.return, q = x;
								break b;
							}
							q = c.return;
						}
					}
					if (Wc = a, ua(), wt && typeof wt.onPostCommitFiberRoot == "function") try {
						wt.onPostCommitFiberRoot(Ct, e);
					} catch {}
					i = !0;
				}
				return i;
			} finally {
				Ht = n, Uc.transition = t;
			}
		}
		return !1;
	}
	function Vl(e, t, n) {
		t = ks(n, t), t = Ms(e, t, 1), e = so(e, t, 1), t = gl(), e !== null && (zt(e, 1, t), yl(e, t));
	}
	function Hl(e, t, n) {
		if (e.tag === 3) Vl(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				Vl(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (cl === null || !cl.has(r))) {
					e = ks(n, e), e = Ns(t, e, 1), t = so(t, e, 1), e = gl(), t !== null && (zt(t, 1, e), yl(t, e));
					break;
				}
			}
			t = t.return;
		}
	}
	function Ul(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), t = gl(), e.pingedLanes |= e.suspendedLanes & n, Gc === e && (qc & n) === n && (Xc === 4 || Xc === 3 && (qc & 130023424) === qc && 500 > gt() - rl ? kl(e, 0) : el |= n), yl(e, t);
	}
	function Wl(e, t) {
		t === 0 && (e.mode & 1 ? (t = jt, jt <<= 1, !(jt & 130023424) && (jt = 4194304)) : t = 1);
		var n = gl();
		e = no(e, t), e !== null && (zt(e, t, n), yl(e, n));
	}
	function Gl(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), Wl(e, n);
	}
	function Kl(e, t) {
		var n = 0;
		switch (e.tag) {
			case 13:
				var i = e.stateNode, a = e.memoizedState;
				a !== null && (n = a.retryLane);
				break;
			case 19:
				i = e.stateNode;
				break;
			default: throw Error(r(314));
		}
		i !== null && i.delete(t), Wl(e, n);
	}
	var ql = function(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps || Zi.current) Rs = !0;
			else {
				if ((e.lanes & n) === 0 && !(t.flags & 128)) return Rs = !1, oc(e, t, n);
				Rs = !!(e.flags & 131072);
			}
		} else Rs = !1, Ea && t.flags & 1048576 && xa(t, ma, t.index);
		switch (t.lanes = 0, t.tag) {
			case 2:
				var i = t.type;
				ic(e, t), e = t.pendingProps;
				var a = B(t, Xi.current);
				Za(t, n), a = Ro(null, t, i, e, a, n);
				var o = zo();
				return t.flags |= 1, typeof a == "object" && a && typeof a.render == "function" && a.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, V(i) ? (o = !0, ra(t)) : o = !1, t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, io(t), a.updater = U, t.stateNode = a, a._reactInternals = t, Os(t, i, e, n), t = qs(null, t, i, !0, o, n)) : (t.tag = 0, Ea && o && Sa(t), zs(null, t, a, n), t = t.child), t;
			case 16:
				i = t.elementType;
				a: {
					switch (ic(e, t), e = t.pendingProps, a = i._init, i = a(i._payload), t.type = i, a = t.tag = Ql(i), e = ws(i, e), a) {
						case 0:
							t = Gs(null, t, i, e, n);
							break a;
						case 1:
							t = Ks(null, t, i, e, n);
							break a;
						case 11:
							t = Bs(null, t, i, e, n);
							break a;
						case 14:
							t = Vs(null, t, i, ws(i.type, e), n);
							break a;
					}
					throw Error(r(306, i, ""));
				}
				return t;
			case 0: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ws(i, a), Gs(e, t, i, a, n);
			case 1: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ws(i, a), Ks(e, t, i, a, n);
			case 3:
				a: {
					if (Js(t), e === null) throw Error(r(387));
					i = t.pendingProps, o = t.memoizedState, a = o.element, ao(e, t), uo(t, i, null, n);
					var s = t.memoizedState;
					if (i = s.element, o.isDehydrated) {
						if (o = {
							element: i,
							isDehydrated: !1,
							cache: s.cache,
							pendingSuspenseBoundaries: s.pendingSuspenseBoundaries,
							transitions: s.transitions
						}, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
							a = ks(Error(r(423)), t), t = Ys(e, t, i, n, a);
							break a;
						}
						if (i !== a) {
							a = ks(Error(r(424)), t), t = Ys(e, t, i, n, a);
							break a;
						}
						for (Ta = ji(t.stateNode.containerInfo.firstChild), wa = t, Ea = !0, Da = null, n = Ua(t, null, i, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling;
					} else {
						if (Fa(), i === a) {
							t = ac(e, t, n);
							break a;
						}
						zs(e, t, i, n);
					}
					t = t.child;
				}
				return t;
			case 5: return bo(t), e === null && ja(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, s = a.children, wi(i, a) ? s = null : o !== null && wi(i, o) && (t.flags |= 32), Ws(e, t), zs(e, t, s, n), t.child;
			case 6: return e === null && ja(t), null;
			case 13: return Qs(e, t, n);
			case 4: return vo(t, t.stateNode.containerInfo), i = t.pendingProps, e === null ? t.child = Ha(t, null, i, n) : zs(e, t, i, n), t.child;
			case 11: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ws(i, a), Bs(e, t, i, a, n);
			case 7: return zs(e, t, t.pendingProps, n), t.child;
			case 8: return zs(e, t, t.pendingProps.children, n), t.child;
			case 12: return zs(e, t, t.pendingProps.children, n), t.child;
			case 10:
				a: {
					if (i = t.type._context, a = t.pendingProps, o = t.memoizedProps, s = a.value, Ji(Wa, i._currentValue), i._currentValue = s, o !== null) {
						if (kr(o.value, s)) {
							if (o.children === a.children && !Zi.current) {
								t = ac(e, t, n);
								break a;
							}
						} else for (o = t.child, o !== null && (o.return = t); o !== null;) {
							var c = o.dependencies;
							if (c !== null) {
								s = o.child;
								for (var l = c.firstContext; l !== null;) {
									if (l.context === i) {
										if (o.tag === 1) {
											l = oo(-1, n & -n), l.tag = 2;
											var u = o.updateQueue;
											if (u !== null) {
												u = u.shared;
												var d = u.pending;
												d === null ? l.next = l : (l.next = d.next, d.next = l), u.pending = l;
											}
										}
										o.lanes |= n, l = o.alternate, l !== null && (l.lanes |= n), Xa(o.return, n, t), c.lanes |= n;
										break;
									}
									l = l.next;
								}
							} else if (o.tag === 10) s = o.type === t.type ? null : o.child;
							else if (o.tag === 18) {
								if (s = o.return, s === null) throw Error(r(341));
								s.lanes |= n, c = s.alternate, c !== null && (c.lanes |= n), Xa(s, n, t), s = o.sibling;
							} else s = o.child;
							if (s !== null) s.return = o;
							else for (s = o; s !== null;) {
								if (s === t) {
									s = null;
									break;
								}
								if (o = s.sibling, o !== null) {
									o.return = s.return, s = o;
									break;
								}
								s = s.return;
							}
							o = s;
						}
					}
					zs(e, t, a.children, n), t = t.child;
				}
				return t;
			case 9: return a = t.type, i = t.pendingProps.children, Za(t, n), a = Qa(a), i = i(a), t.flags |= 1, zs(e, t, i, n), t.child;
			case 14: return i = t.type, a = ws(i, t.pendingProps), a = ws(i.type, a), Vs(e, t, i, a, n);
			case 15: return Hs(e, t, t.type, t.pendingProps, n);
			case 17: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ws(i, a), ic(e, t), t.tag = 1, V(i) ? (e = !0, ra(t)) : e = !1, Za(t, n), Es(t, i, a), Os(t, i, a, n), qs(null, t, i, !0, e, n);
			case 19: return rc(e, t, n);
			case 22: return Us(e, t, n);
		}
		throw Error(r(156, t.tag));
	};
	function Jl(e, t) {
		return ft(e, t);
	}
	function Yl(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function Xl(e, t, n, r) {
		return new Yl(e, t, n, r);
	}
	function Zl(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function Ql(e) {
		if (typeof e == "function") return +!!Zl(e);
		if (e != null) {
			if (e = e.$$typeof, e === k) return 11;
			if (e === M) return 14;
		}
		return 2;
	}
	function $l(e, t) {
		var n = e.alternate;
		return n === null ? (n = Xl(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
	}
	function eu(e, t, n, i, a, o) {
		var s = 2;
		if (i = e, typeof e == "function") Zl(e) && (s = 1);
		else if (typeof e == "string") s = 5;
		else a: switch (e) {
			case w: return tu(n.children, a, o, t);
			case T:
				s = 8, a |= 8;
				break;
			case E: return e = Xl(12, n, t, a | 2), e.elementType = E, e.lanes = o, e;
			case A: return e = Xl(13, n, t, a), e.elementType = A, e.lanes = o, e;
			case j: return e = Xl(19, n, t, a), e.elementType = j, e.lanes = o, e;
			case P: return nu(n, a, o, t);
			default:
				if (typeof e == "object" && e) switch (e.$$typeof) {
					case D:
						s = 10;
						break a;
					case O:
						s = 9;
						break a;
					case k:
						s = 11;
						break a;
					case M:
						s = 14;
						break a;
					case N:
						s = 16, i = null;
						break a;
				}
				throw Error(r(130, e == null ? e : typeof e, ""));
		}
		return t = Xl(s, n, t, a), t.elementType = e, t.type = i, t.lanes = o, t;
	}
	function tu(e, t, n, r) {
		return e = Xl(7, e, r, t), e.lanes = n, e;
	}
	function nu(e, t, n, r) {
		return e = Xl(22, e, r, t), e.elementType = P, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
	}
	function ru(e, t, n) {
		return e = Xl(6, e, null, t), e.lanes = n, e;
	}
	function iu(e, t, n) {
		return t = Xl(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	function au(e, t, n, r, i) {
		this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Rt(0), this.expirationTimes = Rt(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Rt(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
	}
	function ou(e, t, n, r, i, a, o, s, c) {
		return e = new au(e, t, n, s, c), t === 1 ? (t = 1, !0 === a && (t |= 8)) : t = 0, a = Xl(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: null,
			transitions: null,
			pendingSuspenseBoundaries: null
		}, io(a), e;
	}
	function su(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: C,
			key: r == null ? null : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	function cu(e) {
		if (!e) return Yi;
		e = e._reactInternals;
		a: {
			if (ot(e) !== e || e.tag !== 1) throw Error(r(170));
			var t = e;
			do {
				switch (t.tag) {
					case 3:
						t = t.stateNode.context;
						break a;
					case 1: if (V(t.type)) {
						t = t.stateNode.__reactInternalMemoizedMergedChildContext;
						break a;
					}
				}
				t = t.return;
			} while (t !== null);
			throw Error(r(171));
		}
		if (e.tag === 1) {
			var n = e.type;
			if (V(n)) return na(e, n, t);
		}
		return t;
	}
	function lu(e, t, n, r, i, a, o, s, c) {
		return e = ou(n, r, !0, e, i, a, o, s, c), e.context = cu(null), n = e.current, r = gl(), i = _l(n), a = oo(r, i), a.callback = t == null ? null : t, so(n, a, i), e.current.lanes = i, zt(e, i, r), yl(e, r), e;
	}
	function uu(e, t, n, r) {
		var i = t.current, a = gl(), o = _l(i);
		return n = cu(n), t.context === null ? t.context = n : t.pendingContext = n, t = oo(a, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = so(i, t, o), e !== null && (vl(e, i, o, a), co(e, i, o)), o;
	}
	function du(e) {
		if (e = e.current, !e.child) return null;
		switch (e.child.tag) {
			case 5: return e.child.stateNode;
			default: return e.child.stateNode;
		}
	}
	function fu(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function pu(e, t) {
		fu(e, t), (e = e.alternate) && fu(e, t);
	}
	function mu() {
		return null;
	}
	var hu = typeof reportError == "function" ? reportError : function(e) {
		console.error(e);
	};
	function gu(e) {
		this._internalRoot = e;
	}
	_u.prototype.render = gu.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(r(409));
		uu(e, t, null, null);
	}, _u.prototype.unmount = gu.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			Dl(function() {
				uu(null, e, null, null);
			}), t[Ii] = null;
		}
	};
	function _u(e) {
		this._internalRoot = e;
	}
	_u.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = qt();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < nn.length && t !== 0 && t < nn[n].priority; n++);
			nn.splice(n, 0, e), n === 0 && R(e);
		}
	};
	function vu(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function yu(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
	}
	function bu() {}
	function xu(e, t, n, r, i) {
		if (i) {
			if (typeof r == "function") {
				var a = r;
				r = function() {
					var e = du(o);
					a.call(e);
				};
			}
			var o = lu(t, r, e, 0, null, !1, !1, "", bu);
			return e._reactRootContainer = o, e[Ii] = o.current, ui(e.nodeType === 8 ? e.parentNode : e), Dl(), o;
		}
		for (; i = e.lastChild;) e.removeChild(i);
		if (typeof r == "function") {
			var s = r;
			r = function() {
				var e = du(c);
				s.call(e);
			};
		}
		var c = ou(e, 0, !1, null, null, !1, !1, "", bu);
		return e._reactRootContainer = c, e[Ii] = c.current, ui(e.nodeType === 8 ? e.parentNode : e), Dl(function() {
			uu(t, c, n, r);
		}), c;
	}
	function Su(e, t, n, r, i) {
		var a = n._reactRootContainer;
		if (a) {
			var o = a;
			if (typeof i == "function") {
				var s = i;
				i = function() {
					var e = du(o);
					s.call(e);
				};
			}
			uu(t, o, e, i);
		} else o = xu(n, t, e, i, r);
		return du(o);
	}
	Wt = function(e) {
		switch (e.tag) {
			case 3:
				var t = e.stateNode;
				if (t.current.memoizedState.isDehydrated) {
					var n = Mt(t.pendingLanes);
					n !== 0 && (Vt(t, n | 1), yl(t, gt()), !(Wc & 6) && (il = gt() + 500, ua()));
				}
				break;
			case 13: Dl(function() {
				var t = no(e, 1);
				t !== null && vl(t, e, 1, gl());
			}), pu(e, 1);
		}
	}, Gt = function(e) {
		if (e.tag === 13) {
			var t = no(e, 134217728);
			t !== null && vl(t, e, 134217728, gl()), pu(e, 134217728);
		}
	}, Kt = function(e) {
		if (e.tag === 13) {
			var t = _l(e), n = no(e, t);
			n !== null && vl(n, e, t, gl()), pu(e, t);
		}
	}, qt = function() {
		return Ht;
	}, Jt = function(e, t) {
		var n = Ht;
		try {
			return Ht = e, t();
		} finally {
			Ht = n;
		}
	}, ze = function(e, t, n) {
		switch (t) {
			case "input":
				if (ge(e, n), t = n.name, n.type === "radio" && t != null) {
					for (n = e; n.parentNode;) n = n.parentNode;
					for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + "][type=\"radio\"]"), t = 0; t < n.length; t++) {
						var i = n[t];
						if (i !== e && i.form === e.form) {
							var a = Ui(i);
							if (!a) throw Error(r(90));
							de(i), ge(i, a);
						}
					}
				}
				break;
			case "textarea":
				Ce(e, n);
				break;
			case "select": t = n.value, t != null && be(e, !!n.multiple, t, !1);
		}
	}, Ge = El, Ke = Dl;
	var Cu = {
		usingClientEntryPoint: !1,
		Events: [
			Vi,
			Hi,
			Ui,
			Ue,
			We,
			El
		]
	}, wu = {
		findFiberByHostInstance: Bi,
		bundleType: 0,
		version: "18.3.1",
		rendererPackageName: "react-dom"
	}, Tu = {
		bundleType: wu.bundleType,
		version: wu.version,
		rendererPackageName: wu.rendererPackageName,
		rendererConfig: wu.rendererConfig,
		overrideHookState: null,
		overrideHookStateDeletePath: null,
		overrideHookStateRenamePath: null,
		overrideProps: null,
		overridePropsDeletePath: null,
		overridePropsRenamePath: null,
		setErrorHandler: null,
		setSuspenseHandler: null,
		scheduleUpdate: null,
		currentDispatcherRef: x.ReactCurrentDispatcher,
		findHostInstanceByFiber: function(e) {
			return e = ut(e), e === null ? null : e.stateNode;
		},
		findFiberByHostInstance: wu.findFiberByHostInstance || mu,
		findHostInstancesForRefresh: null,
		scheduleRefresh: null,
		scheduleRoot: null,
		setRefreshHandler: null,
		getCurrentFiber: null,
		reconcilerVersion: "18.3.1-next-f1338f8080-20240426"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var Eu = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!Eu.isDisabled && Eu.supportsFiber) try {
			Ct = Eu.inject(Tu), wt = Eu;
		} catch {}
	}
	e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Cu, e.createPortal = function(e, t) {
		var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!vu(t)) throw Error(r(200));
		return su(e, t, null, n);
	}, e.createRoot = function(e, t) {
		if (!vu(e)) throw Error(r(299));
		var n = !1, i = "", a = hu;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (i = t.identifierPrefix), t.onRecoverableError !== void 0 && (a = t.onRecoverableError)), t = ou(e, 1, !1, null, null, n, !1, i, a), e[Ii] = t.current, ui(e.nodeType === 8 ? e.parentNode : e), new gu(t);
	}, e.findDOMNode = function(e) {
		if (e == null) return null;
		if (e.nodeType === 1) return e;
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(r(188)) : (e = Object.keys(e).join(","), Error(r(268, e)));
		return e = ut(t), e = e === null ? null : e.stateNode, e;
	}, e.flushSync = function(e) {
		return Dl(e);
	}, e.hydrate = function(e, t, n) {
		if (!yu(t)) throw Error(r(200));
		return Su(null, e, t, !0, n);
	}, e.hydrateRoot = function(e, t, n) {
		if (!vu(e)) throw Error(r(405));
		var i = n != null && n.hydratedSources || null, a = !1, o = "", s = hu;
		if (n != null && (!0 === n.unstable_strictMode && (a = !0), n.identifierPrefix !== void 0 && (o = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = lu(t, null, e, 1, n == null ? null : n, a, !1, o, s), e[Ii] = t.current, ui(e), i) for (e = 0; e < i.length; e++) n = i[e], a = n._getVersion, a = a(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, a] : t.mutableSourceEagerHydrationData.push(n, a);
		return new _u(t);
	}, e.render = function(e, t, n) {
		if (!yu(t)) throw Error(r(200));
		return Su(null, e, t, !1, n);
	}, e.unmountComponentAtNode = function(e) {
		if (!yu(e)) throw Error(r(40));
		return e._reactRootContainer ? (Dl(function() {
			Su(null, null, e, !1, function() {
				e._reactRootContainer = null, e[Ii] = null;
			});
		}), !0) : !1;
	}, e.unstable_batchedUpdates = El, e.unstable_renderSubtreeIntoContainer = function(e, t, n, i) {
		if (!yu(n)) throw Error(r(200));
		if (e == null || e._reactInternals === void 0) throw Error(r(38));
		return Su(e, t, n, !1, i);
	}, e.version = "18.3.1-next-f1338f8080-20240426";
})), vg = /* @__PURE__ */ T(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = _g();
})), yg = { disabled: !1 }, bg = X.createContext(null), xg = function(e) {
	return e.scrollTop;
};
//#endregion
//#region node_modules/react-transition-group/esm/Transition.js
U();
var Sg = /* @__PURE__ */ O(vg()), Cg = "unmounted", wg = "exited", Tg = "entering", Eg = "entered", Dg = "exiting", Og = /*#__PURE__*/ function(e) {
	mg(t, e);
	function t(t, n) {
		var r = e.call(this, t, n) || this, i = n, a = i && !i.isMounting ? t.enter : t.appear, o;
		return r.appearStatus = null, t.in ? a ? (o = wg, r.appearStatus = Tg) : o = Eg : o = t.unmountOnExit || t.mountOnEnter ? Cg : wg, r.state = { status: o }, r.nextCallback = null, r;
	}
	t.getDerivedStateFromProps = function(e, t) {
		return e.in && t.status === "unmounted" ? { status: wg } : null;
	};
	var n = t.prototype;
	return n.componentDidMount = function() {
		this.updateStatus(!0, this.appearStatus);
	}, n.componentDidUpdate = function(e) {
		var t = null;
		if (e !== this.props) {
			var n = this.state.status;
			this.props.in ? n !== "entering" && n !== "entered" && (t = Tg) : (n === "entering" || n === "entered") && (t = Dg);
		}
		this.updateStatus(!1, t);
	}, n.componentWillUnmount = function() {
		this.cancelNextCallback();
	}, n.getTimeouts = function() {
		var e = this.props.timeout, t = n = r = e, n, r;
		return e != null && typeof e != "number" && (t = e.exit, n = e.enter, r = e.appear === void 0 ? n : e.appear), {
			exit: t,
			enter: n,
			appear: r
		};
	}, n.updateStatus = function(e, t) {
		if (e === void 0 && (e = !1), t !== null) {
			if (this.cancelNextCallback(), t === "entering") {
				if (this.props.unmountOnExit || this.props.mountOnEnter) {
					var n = this.props.nodeRef ? this.props.nodeRef.current : Sg.findDOMNode(this);
					n && xg(n);
				}
				this.performEnter(e);
			} else this.performExit();
		} else this.props.unmountOnExit && this.state.status === "exited" && this.setState({ status: Cg });
	}, n.performEnter = function(e) {
		var t = this, n = this.props.enter, r = this.context ? this.context.isMounting : e, i = this.props.nodeRef ? [r] : [Sg.findDOMNode(this), r], a = i[0], o = i[1], s = this.getTimeouts(), c = r ? s.appear : s.enter;
		if (!e && !n || yg.disabled) {
			this.safeSetState({ status: Eg }, function() {
				t.props.onEntered(a);
			});
			return;
		}
		this.props.onEnter(a, o), this.safeSetState({ status: Tg }, function() {
			t.props.onEntering(a, o), t.onTransitionEnd(c, function() {
				t.safeSetState({ status: Eg }, function() {
					t.props.onEntered(a, o);
				});
			});
		});
	}, n.performExit = function() {
		var e = this, t = this.props.exit, n = this.getTimeouts(), r = this.props.nodeRef ? void 0 : Sg.findDOMNode(this);
		if (!t || yg.disabled) {
			this.safeSetState({ status: wg }, function() {
				e.props.onExited(r);
			});
			return;
		}
		this.props.onExit(r), this.safeSetState({ status: Dg }, function() {
			e.props.onExiting(r), e.onTransitionEnd(n.exit, function() {
				e.safeSetState({ status: wg }, function() {
					e.props.onExited(r);
				});
			});
		});
	}, n.cancelNextCallback = function() {
		this.nextCallback !== null && (this.nextCallback.cancel(), this.nextCallback = null);
	}, n.safeSetState = function(e, t) {
		t = this.setNextCallback(t), this.setState(e, t);
	}, n.setNextCallback = function(e) {
		var t = this, n = !0;
		return this.nextCallback = function(r) {
			n && (n = !1, t.nextCallback = null, e(r));
		}, this.nextCallback.cancel = function() {
			n = !1;
		}, this.nextCallback;
	}, n.onTransitionEnd = function(e, t) {
		this.setNextCallback(t);
		var n = this.props.nodeRef ? this.props.nodeRef.current : Sg.findDOMNode(this), r = e == null && !this.props.addEndListener;
		if (!n || r) {
			setTimeout(this.nextCallback, 0);
			return;
		}
		if (this.props.addEndListener) {
			var i = this.props.nodeRef ? [this.nextCallback] : [n, this.nextCallback], a = i[0], o = i[1];
			this.props.addEndListener(a, o);
		}
		e != null && setTimeout(this.nextCallback, e);
	}, n.render = function() {
		var e = this.state.status;
		if (e === "unmounted") return null;
		var t = this.props, n = t.children;
		t.in, t.mountOnEnter, t.unmountOnExit, t.appear, t.enter, t.exit, t.timeout, t.addEndListener, t.onEnter, t.onEntering, t.onEntered, t.onExit, t.onExiting, t.onExited, t.nodeRef;
		var r = H(t, [
			"children",
			"in",
			"mountOnEnter",
			"unmountOnExit",
			"appear",
			"enter",
			"exit",
			"timeout",
			"addEndListener",
			"onEnter",
			"onEntering",
			"onEntered",
			"onExit",
			"onExiting",
			"onExited",
			"nodeRef"
		]);
		return /*#__PURE__*/ X.createElement(bg.Provider, { value: null }, typeof n == "function" ? n(e, r) : X.cloneElement(X.Children.only(n), r));
	}, t;
}(X.Component);
Og.contextType = bg, Og.propTypes = {};
function kg() {}
Og.defaultProps = {
	in: !1,
	mountOnEnter: !1,
	unmountOnExit: !1,
	appear: !1,
	enter: !0,
	exit: !0,
	onEnter: kg,
	onEntering: kg,
	onEntered: kg,
	onExit: kg,
	onExiting: kg,
	onExited: kg
}, Og.UNMOUNTED = Cg, Og.EXITED = wg, Og.ENTERING = Tg, Og.ENTERED = Eg, Og.EXITING = Dg;
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function Ag(e) {
	if (e === void 0) throw ReferenceError("this hasn't been initialised - super() hasn't been called");
	return e;
}
//#endregion
//#region node_modules/react-transition-group/esm/utils/ChildMapping.js
function jg(e, t) {
	var n = function(e) {
		return t && (0, X.isValidElement)(e) ? t(e) : e;
	}, r = Object.create(null);
	return e && X.Children.map(e, function(e) {
		return e;
	}).forEach(function(e) {
		r[e.key] = n(e);
	}), r;
}
function Mg(e, t) {
	e = e || {}, t = t || {};
	function n(n) {
		return n in t ? t[n] : e[n];
	}
	var r = Object.create(null), i = [];
	for (var a in e) a in t ? i.length && (r[a] = i, i = []) : i.push(a);
	var o, s = {};
	for (var c in t) {
		if (r[c]) for (o = 0; o < r[c].length; o++) {
			var l = r[c][o];
			s[r[c][o]] = n(l);
		}
		s[c] = n(c);
	}
	for (o = 0; o < i.length; o++) s[i[o]] = n(i[o]);
	return s;
}
function Ng(e, t, n) {
	return n[t] == null ? e.props[t] : n[t];
}
function Pg(e, t) {
	return jg(e.children, function(n) {
		return (0, X.cloneElement)(n, {
			onExited: t.bind(null, n),
			in: !0,
			appear: Ng(n, "appear", e),
			enter: Ng(n, "enter", e),
			exit: Ng(n, "exit", e)
		});
	});
}
function Fg(e, t, n) {
	var r = jg(e.children), i = Mg(t, r);
	return Object.keys(i).forEach(function(a) {
		var o = i[a];
		if ((0, X.isValidElement)(o)) {
			var s = a in t, c = a in r, l = t[a], u = (0, X.isValidElement)(l) && !l.props.in;
			c && (!s || u) ? i[a] = (0, X.cloneElement)(o, {
				onExited: n.bind(null, o),
				in: !0,
				exit: Ng(o, "exit", e),
				enter: Ng(o, "enter", e)
			}) : !c && s && !u ? i[a] = (0, X.cloneElement)(o, { in: !1 }) : c && s && (0, X.isValidElement)(l) && (i[a] = (0, X.cloneElement)(o, {
				onExited: n.bind(null, o),
				in: l.props.in,
				exit: Ng(o, "exit", e),
				enter: Ng(o, "enter", e)
			}));
		}
	}), i;
}
U(), V();
var Ig = Object.values || function(e) {
	return Object.keys(e).map(function(t) {
		return e[t];
	});
}, Lg = {
	component: "div",
	childFactory: function(e) {
		return e;
	}
}, Rg = /*#__PURE__*/ function(e) {
	mg(t, e);
	function t(t, n) {
		var r = e.call(this, t, n) || this;
		return r.state = {
			contextValue: { isMounting: !0 },
			handleExited: r.handleExited.bind(Ag(r)),
			firstRender: !0
		}, r;
	}
	var n = t.prototype;
	return n.componentDidMount = function() {
		this.mounted = !0, this.setState({ contextValue: { isMounting: !1 } });
	}, n.componentWillUnmount = function() {
		this.mounted = !1;
	}, t.getDerivedStateFromProps = function(e, t) {
		var n = t.children, r = t.handleExited;
		return {
			children: t.firstRender ? Pg(e, r) : Fg(e, n, r),
			firstRender: !1
		};
	}, n.handleExited = function(e, t) {
		var n = jg(this.props.children);
		e.key in n || (e.props.onExited && e.props.onExited(t), this.mounted && this.setState(function(t) {
			var n = B({}, t.children);
			return delete n[e.key], { children: n };
		}));
	}, n.render = function() {
		var e = this.props, t = e.component, n = e.childFactory, r = H(e, ["component", "childFactory"]), i = this.state.contextValue, a = Ig(this.state.children).map(n);
		return delete r.appear, delete r.enter, delete r.exit, t === null ? /*#__PURE__*/ X.createElement(bg.Provider, { value: i }, a) : /*#__PURE__*/ X.createElement(bg.Provider, { value: i }, /*#__PURE__*/ X.createElement(t, r, a));
	}, t;
}(X.Component);
Rg.propTypes = {}, Rg.defaultProps = Lg;
//#endregion
//#region node_modules/@mui/material/transitions/utils.js
var zg = (e) => e.scrollTop;
function Bg(e, t) {
	var n, r;
	let { timeout: i, easing: a, style: o = {} } = e;
	return {
		duration: (n = o.transitionDuration) == null ? typeof i == "number" ? i : i[t.mode] || 0 : n,
		easing: (r = o.transitionTimingFunction) == null ? typeof a == "object" ? a[t.mode] : a : r,
		delay: o.transitionDelay
	};
}
bs(), _s();
function Vg(e) {
	return ms("MuiPaper", e);
}
vs("MuiPaper", /* @__PURE__ */ "root.rounded.outlined.elevation.elevation0.elevation1.elevation2.elevation3.elevation4.elevation5.elevation6.elevation7.elevation8.elevation9.elevation10.elevation11.elevation12.elevation13.elevation14.elevation15.elevation16.elevation17.elevation18.elevation19.elevation20.elevation21.elevation22.elevation23.elevation24".split(".")), U(), V(), Ms(), cs();
var Hg = fp();
xm(), K();
var Ug = [
	"className",
	"component",
	"elevation",
	"square",
	"variant"
], Wg = (e) => {
	let { square: t, elevation: n, variant: r, classes: i } = e;
	return os({ root: [
		"root",
		r,
		!t && "rounded",
		r === "elevation" && `elevation${n}`
	] }, Vg, i);
}, Gg = Y("div", {
	name: "MuiPaper",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[n.variant],
			!n.square && t.rounded,
			n.variant === "elevation" && t[`elevation${n.elevation}`]
		];
	}
})(({ theme: e, ownerState: t }) => {
	var n;
	return B({
		backgroundColor: (e.vars || e).palette.background.paper,
		color: (e.vars || e).palette.text.primary,
		transition: e.transitions.create("box-shadow")
	}, !t.square && { borderRadius: e.shape.borderRadius }, t.variant === "outlined" && { border: `1px solid ${(e.vars || e).palette.divider}` }, t.variant === "elevation" && B({ boxShadow: (e.vars || e).shadows[t.elevation] }, !e.vars && e.palette.mode === "dark" && { backgroundImage: `linear-gradient(${(0, Hg.alpha)("#fff", fg(t.elevation))}, ${(0, Hg.alpha)("#fff", fg(t.elevation))})` }, e.vars && { backgroundImage: (n = e.vars.overlays) == null ? void 0 : n[t.elevation] }));
}), Kg = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiPaper"
	}), { className: r, component: i = "div", elevation: a = 1, square: o = !1, variant: s = "elevation" } = n, c = H(n, Ug), l = B({}, n, {
		component: i,
		elevation: a,
		square: o,
		variant: s
	}), u = Wg(l);
	return /*#__PURE__*/ (0, Z.jsx)(Gg, B({
		as: i,
		ownerState: l,
		className: W(u.root, r),
		ref: t
	}, c));
});
//#endregion
//#region node_modules/@mui/material/ButtonBase/Ripple.js
Ms();
function qg(e) {
	let { className: t, classes: n, pulsate: r = !1, rippleX: i, rippleY: a, rippleSize: o, in: s, onExited: c, timeout: l } = e, [u, d] = X.useState(!1), f = W(t, n.ripple, n.rippleVisible, r && n.ripplePulsate), p = {
		width: o,
		height: o,
		top: -(o / 2) + a,
		left: -(o / 2) + i
	}, m = W(n.child, u && n.childLeaving, r && n.childPulsate);
	return !s && !u && d(!0), X.useEffect(() => {
		if (!s && c != null) {
			let e = setTimeout(c, l);
			return () => {
				clearTimeout(e);
			};
		}
	}, [
		c,
		s,
		l
	]), /*#__PURE__*/ (0, Z.jsx)("span", {
		className: f,
		style: p,
		children: /*#__PURE__*/ (0, Z.jsx)("span", { className: m })
	});
}
//#endregion
//#region node_modules/@mui/material/ButtonBase/touchRippleClasses.js
bs();
var Jg = vs("MuiTouchRipple", [
	"root",
	"ripple",
	"rippleVisible",
	"ripplePulsate",
	"child",
	"childLeaving",
	"childPulsate"
]);
V(), U(), Ms(), Pu(), Io(), xm(), K();
var Yg = [
	"center",
	"classes",
	"className"
], Xg = (e) => e, Zg, Qg, $g, e_, t_ = 550, n_ = Au(Zg || (Zg = Xg`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`)), r_ = Au(Qg || (Qg = Xg`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`)), i_ = Au($g || ($g = Xg`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`)), a_ = Y("span", {
	name: "MuiTouchRipple",
	slot: "Root"
})({
	overflow: "hidden",
	pointerEvents: "none",
	position: "absolute",
	zIndex: 0,
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
	borderRadius: "inherit"
}), o_ = Y(qg, {
	name: "MuiTouchRipple",
	slot: "Ripple"
})(e_ || (e_ = Xg`
  opacity: 0;
  position: absolute;

  &.${0} {
    opacity: 0.3;
    transform: scale(1);
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  &.${0} {
    animation-duration: ${0}ms;
  }

  & .${0} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${0} {
    opacity: 0;
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  & .${0} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
    animation-name: ${0};
    animation-duration: 2500ms;
    animation-timing-function: ${0};
    animation-iteration-count: infinite;
    animation-delay: 200ms;
  }
`), Jg.rippleVisible, n_, t_, ({ theme: e }) => e.transitions.easing.easeInOut, Jg.ripplePulsate, ({ theme: e }) => e.transitions.duration.shorter, Jg.child, Jg.childLeaving, r_, t_, ({ theme: e }) => e.transitions.easing.easeInOut, Jg.childPulsate, i_, ({ theme: e }) => e.transitions.easing.easeInOut), s_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiTouchRipple"
	}), { center: r = !1, classes: i = {}, className: a } = n, o = H(n, Yg), [s, c] = X.useState([]), l = X.useRef(0), u = X.useRef(null);
	X.useEffect(() => {
		u.current && (u.current(), u.current = null);
	}, [s]);
	let d = X.useRef(!1), f = No(), p = X.useRef(null), m = X.useRef(null), h = X.useCallback((e) => {
		let { pulsate: t, rippleX: n, rippleY: r, rippleSize: a, cb: o } = e;
		c((e) => [...e, /*#__PURE__*/ (0, Z.jsx)(o_, {
			classes: {
				ripple: W(i.ripple, Jg.ripple),
				rippleVisible: W(i.rippleVisible, Jg.rippleVisible),
				ripplePulsate: W(i.ripplePulsate, Jg.ripplePulsate),
				child: W(i.child, Jg.child),
				childLeaving: W(i.childLeaving, Jg.childLeaving),
				childPulsate: W(i.childPulsate, Jg.childPulsate)
			},
			timeout: t_,
			pulsate: t,
			rippleX: n,
			rippleY: r,
			rippleSize: a
		}, l.current)]), l.current += 1, u.current = o;
	}, [i]), g = X.useCallback((e = {}, t = {}, n = () => {}) => {
		let { pulsate: i = !1, center: a = r || t.pulsate, fakeElement: o = !1 } = t;
		if ((e == null ? void 0 : e.type) === "mousedown" && d.current) {
			d.current = !1;
			return;
		}
		(e == null ? void 0 : e.type) === "touchstart" && (d.current = !0);
		let s = o ? null : m.current, c = s ? s.getBoundingClientRect() : {
			width: 0,
			height: 0,
			left: 0,
			top: 0
		}, l, u, g;
		if (a || e === void 0 || e.clientX === 0 && e.clientY === 0 || !e.clientX && !e.touches) l = Math.round(c.width / 2), u = Math.round(c.height / 2);
		else {
			let { clientX: t, clientY: n } = e.touches && e.touches.length > 0 ? e.touches[0] : e;
			l = Math.round(t - c.left), u = Math.round(n - c.top);
		}
		if (a) g = Math.sqrt((2 * c.width ** 2 + c.height ** 2) / 3), g % 2 == 0 && (g += 1);
		else {
			let e = Math.max(Math.abs((s ? s.clientWidth : 0) - l), l) * 2 + 2, t = Math.max(Math.abs((s ? s.clientHeight : 0) - u), u) * 2 + 2;
			g = Math.sqrt(e ** 2 + t ** 2);
		}
		e != null && e.touches ? p.current === null && (p.current = () => {
			h({
				pulsate: i,
				rippleX: l,
				rippleY: u,
				rippleSize: g,
				cb: n
			});
		}, f.start(80, () => {
			p.current && (p.current(), p.current = null);
		})) : h({
			pulsate: i,
			rippleX: l,
			rippleY: u,
			rippleSize: g,
			cb: n
		});
	}, [
		r,
		h,
		f
	]), _ = X.useCallback(() => {
		g({}, { pulsate: !0 });
	}, [g]), v = X.useCallback((e, t) => {
		if (f.clear(), (e == null ? void 0 : e.type) === "touchend" && p.current) {
			p.current(), p.current = null, f.start(0, () => {
				v(e, t);
			});
			return;
		}
		p.current = null, c((e) => e.length > 0 ? e.slice(1) : e), u.current = t;
	}, [f]);
	return X.useImperativeHandle(t, () => ({
		pulsate: _,
		start: g,
		stop: v
	}), [
		_,
		g,
		v
	]), /*#__PURE__*/ (0, Z.jsx)(a_, B({
		className: W(Jg.root, i.root, a),
		ref: m
	}, o, { children: /*#__PURE__*/ (0, Z.jsx)(Rg, {
		component: null,
		exit: !0,
		children: s
	}) }));
});
bs(), _s();
function c_(e) {
	return ms("MuiButtonBase", e);
}
var l_ = vs("MuiButtonBase", [
	"root",
	"disabled",
	"focusVisible"
]);
V(), U(), Ms(), cs(), xm(), K(), ch(), oh(), uh();
var u_ = /* @__PURE__ */ "action.centerRipple.children.className.component.disabled.disableRipple.disableTouchRipple.focusRipple.focusVisibleClassName.LinkComponent.onBlur.onClick.onContextMenu.onDragLeave.onFocus.onFocusVisible.onKeyDown.onKeyUp.onMouseDown.onMouseLeave.onMouseUp.onTouchEnd.onTouchMove.onTouchStart.tabIndex.TouchRippleProps.touchRippleRef.type".split("."), d_ = (e) => {
	let { disabled: t, focusVisible: n, focusVisibleClassName: r, classes: i } = e, a = os({ root: [
		"root",
		t && "disabled",
		n && "focusVisible"
	] }, c_, i);
	return n && r && (a.root += ` ${r}`), a;
}, f_ = Y("button", {
	name: "MuiButtonBase",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	position: "relative",
	boxSizing: "border-box",
	WebkitTapHighlightColor: "transparent",
	backgroundColor: "transparent",
	outline: 0,
	border: 0,
	margin: 0,
	borderRadius: 0,
	padding: 0,
	cursor: "pointer",
	userSelect: "none",
	verticalAlign: "middle",
	MozAppearance: "none",
	WebkitAppearance: "none",
	textDecoration: "none",
	color: "inherit",
	"&::-moz-focus-inner": { borderStyle: "none" },
	[`&.${l_.disabled}`]: {
		pointerEvents: "none",
		cursor: "default"
	},
	"@media print": { colorAdjust: "exact" }
}), p_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiButtonBase"
	}), { action: r, centerRipple: i = !1, children: a, className: o, component: s = "button", disabled: c = !1, disableRipple: l = !1, disableTouchRipple: u = !1, focusRipple: d = !1, LinkComponent: f = "a", onBlur: p, onClick: m, onContextMenu: h, onDragLeave: g, onFocus: _, onFocusVisible: v, onKeyDown: y, onKeyUp: b, onMouseDown: x, onMouseLeave: S, onMouseUp: C, onTouchEnd: w, onTouchMove: T, onTouchStart: E, tabIndex: D = 0, TouchRippleProps: O, touchRippleRef: k, type: A } = n, j = H(n, u_), M = X.useRef(null), N = X.useRef(null), P = sh(N, k), { isFocusVisibleRef: ee, onFocus: te, onBlur: F, ref: ne } = lh(), [I, L] = X.useState(!1);
	c && I && L(!1), X.useImperativeHandle(r, () => ({ focusVisible: () => {
		L(!0), M.current.focus();
	} }), []);
	let [re, ie] = X.useState(!1);
	X.useEffect(() => {
		ie(!0);
	}, []);
	let ae = re && !l && !c;
	X.useEffect(() => {
		I && d && !l && re && N.current.pulsate();
	}, [
		l,
		d,
		I,
		re
	]);
	function oe(e, t, n = u) {
		return ah((r) => (t && t(r), !n && N.current && N.current[e](r), !0));
	}
	let se = oe("start", x), ce = oe("stop", h), le = oe("stop", g), ue = oe("stop", C), de = oe("stop", (e) => {
		I && e.preventDefault(), S && S(e);
	}), fe = oe("start", E), pe = oe("stop", w), me = oe("stop", T), he = oe("stop", (e) => {
		F(e), ee.current === !1 && L(!1), p && p(e);
	}, !1), ge = ah((e) => {
		M.current || (M.current = e.currentTarget), te(e), ee.current === !0 && (L(!0), v && v(e)), _ && _(e);
	}), _e = () => {
		let e = M.current;
		return s && s !== "button" && !(e.tagName === "A" && e.href);
	}, ve = X.useRef(!1), ye = ah((e) => {
		d && !ve.current && I && N.current && e.key === " " && (ve.current = !0, N.current.stop(e, () => {
			N.current.start(e);
		})), e.target === e.currentTarget && _e() && e.key === " " && e.preventDefault(), y && y(e), e.target === e.currentTarget && _e() && e.key === "Enter" && !c && (e.preventDefault(), m && m(e));
	}), be = ah((e) => {
		d && e.key === " " && N.current && I && !e.defaultPrevented && (ve.current = !1, N.current.stop(e, () => {
			N.current.pulsate(e);
		})), b && b(e), m && e.target === e.currentTarget && _e() && e.key === " " && !e.defaultPrevented && m(e);
	}), xe = s;
	xe === "button" && (j.href || j.to) && (xe = f);
	let Se = {};
	xe === "button" ? (Se.type = A === void 0 ? "button" : A, Se.disabled = c) : (!j.href && !j.to && (Se.role = "button"), c && (Se["aria-disabled"] = c));
	let Ce = sh(t, ne, M), we = B({}, n, {
		centerRipple: i,
		component: s,
		disabled: c,
		disableRipple: l,
		disableTouchRipple: u,
		focusRipple: d,
		tabIndex: D,
		focusVisible: I
	}), Te = d_(we);
	return /*#__PURE__*/ (0, Z.jsxs)(f_, B({
		as: xe,
		className: W(Te.root, o),
		ownerState: we,
		onBlur: he,
		onClick: m,
		onContextMenu: ce,
		onFocus: ge,
		onKeyDown: ye,
		onKeyUp: be,
		onMouseDown: se,
		onMouseLeave: de,
		onMouseUp: ue,
		onDragLeave: le,
		onTouchEnd: pe,
		onTouchMove: me,
		onTouchStart: fe,
		ref: Ce,
		tabIndex: c ? -1 : D,
		type: A
	}, Se, j, { children: [a, ae ? /*#__PURE__*/ (0, Z.jsx)(s_, B({
		ref: P,
		center: i
	}, O)) : null] }));
});
bs(), _s();
function m_(e) {
	return ms("MuiIconButton", e);
}
var h_ = vs("MuiIconButton", [
	"root",
	"disabled",
	"colorInherit",
	"colorPrimary",
	"colorSecondary",
	"colorError",
	"colorInfo",
	"colorSuccess",
	"colorWarning",
	"edgeStart",
	"edgeEnd",
	"sizeSmall",
	"sizeMedium",
	"sizeLarge"
]);
U(), V(), Ms(), cs(), xm(), K(), ec();
var g_ = [
	"edge",
	"children",
	"className",
	"color",
	"disabled",
	"disableFocusRipple",
	"size"
], __ = (e) => {
	let { classes: t, disabled: n, color: r, edge: i, size: a } = e;
	return os({ root: [
		"root",
		n && "disabled",
		r !== "default" && `color${G(r)}`,
		i && `edge${G(i)}`,
		`size${G(a)}`
	] }, m_, t);
}, v_ = Y(p_, {
	name: "MuiIconButton",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.color !== "default" && t[`color${G(n.color)}`],
			n.edge && t[`edge${G(n.edge)}`],
			t[`size${G(n.size)}`]
		];
	}
})(({ theme: e, ownerState: t }) => B({
	textAlign: "center",
	flex: "0 0 auto",
	fontSize: e.typography.pxToRem(24),
	padding: 8,
	borderRadius: "50%",
	overflow: "visible",
	color: (e.vars || e).palette.action.active,
	transition: e.transitions.create("background-color", { duration: e.transitions.duration.shortest })
}, !t.disableRipple && { "&:hover": {
	backgroundColor: e.vars ? `rgba(${e.vars.palette.action.activeChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(e.palette.action.active, e.palette.action.hoverOpacity),
	"@media (hover: none)": { backgroundColor: "transparent" }
} }, t.edge === "start" && { marginLeft: t.size === "small" ? -3 : -12 }, t.edge === "end" && { marginRight: t.size === "small" ? -3 : -12 }), ({ theme: e, ownerState: t }) => {
	var n;
	let r = (n = (e.vars || e).palette) == null ? void 0 : n[t.color];
	return B({}, t.color === "inherit" && { color: "inherit" }, t.color !== "inherit" && t.color !== "default" && B({ color: r == null ? void 0 : r.main }, !t.disableRipple && { "&:hover": B({}, r && { backgroundColor: e.vars ? `rgba(${r.mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(r.main, e.palette.action.hoverOpacity) }, { "@media (hover: none)": { backgroundColor: "transparent" } }) }), t.size === "small" && {
		padding: 5,
		fontSize: e.typography.pxToRem(18)
	}, t.size === "large" && {
		padding: 12,
		fontSize: e.typography.pxToRem(28)
	}, { [`&.${h_.disabled}`]: {
		backgroundColor: "transparent",
		color: (e.vars || e).palette.action.disabled
	} });
}), y_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiIconButton"
	}), { edge: r = !1, children: i, className: a, color: o = "default", disabled: s = !1, disableFocusRipple: c = !1, size: l = "medium" } = n, u = H(n, g_), d = B({}, n, {
		edge: r,
		color: o,
		disabled: s,
		disableFocusRipple: c,
		size: l
	}), f = __(d);
	return /*#__PURE__*/ (0, Z.jsx)(v_, B({
		className: W(f.root, a),
		centerRipple: !0,
		focusRipple: !c,
		disabled: s,
		ref: t
	}, u, {
		ownerState: d,
		children: i
	}));
});
bs(), _s();
function b_(e) {
	return ms("MuiTypography", e);
}
vs("MuiTypography", [
	"root",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"subtitle1",
	"subtitle2",
	"body1",
	"body2",
	"inherit",
	"button",
	"caption",
	"overline",
	"alignLeft",
	"alignRight",
	"alignCenter",
	"alignJustify",
	"noWrap",
	"gutterBottom",
	"paragraph"
]), U(), V(), Ms(), cp(), cs(), xm(), K(), ec();
var x_ = [
	"align",
	"className",
	"component",
	"gutterBottom",
	"noWrap",
	"paragraph",
	"variant",
	"variantMapping"
], S_ = (e) => {
	let { align: t, gutterBottom: n, noWrap: r, paragraph: i, variant: a, classes: o } = e;
	return os({ root: [
		"root",
		a,
		e.align !== "inherit" && `align${G(t)}`,
		n && "gutterBottom",
		r && "noWrap",
		i && "paragraph"
	] }, b_, o);
}, C_ = Y("span", {
	name: "MuiTypography",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.variant && t[n.variant],
			n.align !== "inherit" && t[`align${G(n.align)}`],
			n.noWrap && t.noWrap,
			n.gutterBottom && t.gutterBottom,
			n.paragraph && t.paragraph
		];
	}
})(({ theme: e, ownerState: t }) => B({ margin: 0 }, t.variant === "inherit" && { font: "inherit" }, t.variant !== "inherit" && e.typography[t.variant], t.align !== "inherit" && { textAlign: t.align }, t.noWrap && {
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
}, t.gutterBottom && { marginBottom: "0.35em" }, t.paragraph && { marginBottom: 16 })), w_ = {
	h1: "h1",
	h2: "h2",
	h3: "h3",
	h4: "h4",
	h5: "h5",
	h6: "h6",
	subtitle1: "h6",
	subtitle2: "h6",
	body1: "p",
	body2: "p",
	inherit: "p"
}, T_ = {
	primary: "primary.main",
	textPrimary: "text.primary",
	secondary: "secondary.main",
	textSecondary: "text.secondary",
	error: "error.main"
}, E_ = (e) => T_[e] || e, Q = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiTypography"
	}), r = E_(n.color), i = rp(B({}, n, { color: r })), { align: a = "inherit", className: o, component: s, gutterBottom: c = !1, noWrap: l = !1, paragraph: u = !1, variant: d = "body1", variantMapping: f = w_ } = i, p = H(i, x_), m = B({}, i, {
		align: a,
		color: r,
		className: o,
		component: s,
		gutterBottom: c,
		noWrap: l,
		paragraph: u,
		variant: d,
		variantMapping: f
	}), h = s || (u ? "p" : f[d] || w_[d]) || "span", g = S_(m);
	return /*#__PURE__*/ (0, Z.jsx)(C_, B({
		as: h,
		ref: t,
		ownerState: m,
		className: W(g.root, o)
	}, p));
});
//#endregion
//#region node_modules/@mui/material/Portal/Portal.js
$s();
function D_(e) {
	return typeof e == "function" ? e() : e;
}
var O_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let { children: n, container: r, disablePortal: i = !1 } = e, [a, o] = X.useState(null), s = xo(/*#__PURE__*/ X.isValidElement(n) ? Ys(n) : null, t);
	if ($a(() => {
		i || o(D_(r) || document.body);
	}, [r, i]), $a(() => {
		if (a && !i) return Ya(t, a), () => {
			Ya(t, null);
		};
	}, [
		t,
		a,
		i
	]), i) {
		if (/*#__PURE__*/ X.isValidElement(n)) {
			let e = { ref: s };
			return /*#__PURE__*/ X.cloneElement(n, e);
		}
		return /*#__PURE__*/ (0, Z.jsx)(X.Fragment, { children: n });
	}
	return /*#__PURE__*/ (0, Z.jsx)(X.Fragment, { children: a && /*#__PURE__*/ Sg.createPortal(n, a) });
});
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/Cancel.js
Im();
var k_ = Nm(/*#__PURE__*/ (0, Z.jsx)("path", { d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" }), "Cancel");
bs(), _s();
function A_(e) {
	return ms("MuiChip", e);
}
var j_ = vs("MuiChip", /* @__PURE__ */ "root.sizeSmall.sizeMedium.colorError.colorInfo.colorPrimary.colorSecondary.colorSuccess.colorWarning.disabled.clickable.clickableColorPrimary.clickableColorSecondary.deletable.deletableColorPrimary.deletableColorSecondary.outlined.filled.outlinedPrimary.outlinedSecondary.filledPrimary.filledSecondary.avatar.avatarSmall.avatarMedium.avatarColorPrimary.avatarColorSecondary.icon.iconSmall.iconMedium.iconColorPrimary.iconColorSecondary.label.labelSmall.labelMedium.deleteIcon.deleteIconSmall.deleteIconMedium.deleteIconColorPrimary.deleteIconColorSecondary.deleteIconOutlinedColorPrimary.deleteIconOutlinedColorSecondary.deleteIconFilledColorPrimary.deleteIconFilledColorSecondary.focusVisible".split("."));
U(), V(), Ms(), cs(), ch(), ec(), K(), xm();
var M_ = [
	"avatar",
	"className",
	"clickable",
	"color",
	"component",
	"deleteIcon",
	"disabled",
	"icon",
	"label",
	"onClick",
	"onDelete",
	"onKeyDown",
	"onKeyUp",
	"size",
	"variant",
	"tabIndex",
	"skipFocusWhenDisabled"
], N_ = (e) => {
	let { classes: t, disabled: n, size: r, color: i, iconColor: a, onDelete: o, clickable: s, variant: c } = e;
	return os({
		root: [
			"root",
			c,
			n && "disabled",
			`size${G(r)}`,
			`color${G(i)}`,
			s && "clickable",
			s && `clickableColor${G(i)}`,
			o && "deletable",
			o && `deletableColor${G(i)}`,
			`${c}${G(i)}`
		],
		label: ["label", `label${G(r)}`],
		avatar: [
			"avatar",
			`avatar${G(r)}`,
			`avatarColor${G(i)}`
		],
		icon: [
			"icon",
			`icon${G(r)}`,
			`iconColor${G(a)}`
		],
		deleteIcon: [
			"deleteIcon",
			`deleteIcon${G(r)}`,
			`deleteIconColor${G(i)}`,
			`deleteIcon${G(c)}Color${G(i)}`
		]
	}, A_, t);
}, P_ = Y("div", {
	name: "MuiChip",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e, { color: r, iconColor: i, clickable: a, onDelete: o, size: s, variant: c } = n;
		return [
			{ [`& .${j_.avatar}`]: t.avatar },
			{ [`& .${j_.avatar}`]: t[`avatar${G(s)}`] },
			{ [`& .${j_.avatar}`]: t[`avatarColor${G(r)}`] },
			{ [`& .${j_.icon}`]: t.icon },
			{ [`& .${j_.icon}`]: t[`icon${G(s)}`] },
			{ [`& .${j_.icon}`]: t[`iconColor${G(i)}`] },
			{ [`& .${j_.deleteIcon}`]: t.deleteIcon },
			{ [`& .${j_.deleteIcon}`]: t[`deleteIcon${G(s)}`] },
			{ [`& .${j_.deleteIcon}`]: t[`deleteIconColor${G(r)}`] },
			{ [`& .${j_.deleteIcon}`]: t[`deleteIcon${G(c)}Color${G(r)}`] },
			t.root,
			t[`size${G(s)}`],
			t[`color${G(r)}`],
			a && t.clickable,
			a && r !== "default" && t[`clickableColor${G(r)})`],
			o && t.deletable,
			o && r !== "default" && t[`deletableColor${G(r)}`],
			t[c],
			t[`${c}${G(r)}`]
		];
	}
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? e.palette.grey[700] : e.palette.grey[300];
	return B({
		maxWidth: "100%",
		fontFamily: e.typography.fontFamily,
		fontSize: e.typography.pxToRem(13),
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		height: 32,
		color: (e.vars || e).palette.text.primary,
		backgroundColor: (e.vars || e).palette.action.selected,
		borderRadius: 16,
		whiteSpace: "nowrap",
		transition: e.transitions.create(["background-color", "box-shadow"]),
		cursor: "unset",
		outline: 0,
		textDecoration: "none",
		border: 0,
		padding: 0,
		verticalAlign: "middle",
		boxSizing: "border-box",
		[`&.${j_.disabled}`]: {
			opacity: (e.vars || e).palette.action.disabledOpacity,
			pointerEvents: "none"
		},
		[`& .${j_.avatar}`]: {
			marginLeft: 5,
			marginRight: -6,
			width: 24,
			height: 24,
			color: e.vars ? e.vars.palette.Chip.defaultAvatarColor : n,
			fontSize: e.typography.pxToRem(12)
		},
		[`& .${j_.avatarColorPrimary}`]: {
			color: (e.vars || e).palette.primary.contrastText,
			backgroundColor: (e.vars || e).palette.primary.dark
		},
		[`& .${j_.avatarColorSecondary}`]: {
			color: (e.vars || e).palette.secondary.contrastText,
			backgroundColor: (e.vars || e).palette.secondary.dark
		},
		[`& .${j_.avatarSmall}`]: {
			marginLeft: 4,
			marginRight: -4,
			width: 18,
			height: 18,
			fontSize: e.typography.pxToRem(10)
		},
		[`& .${j_.icon}`]: B({
			marginLeft: 5,
			marginRight: -6
		}, t.size === "small" && {
			fontSize: 18,
			marginLeft: 4,
			marginRight: -4
		}, t.iconColor === t.color && B({ color: e.vars ? e.vars.palette.Chip.defaultIconColor : n }, t.color !== "default" && { color: "inherit" })),
		[`& .${j_.deleteIcon}`]: B({
			WebkitTapHighlightColor: "transparent",
			color: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / 0.26)` : (0, Hg.alpha)(e.palette.text.primary, .26),
			fontSize: 22,
			cursor: "pointer",
			margin: "0 5px 0 -6px",
			"&:hover": { color: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / 0.4)` : (0, Hg.alpha)(e.palette.text.primary, .4) }
		}, t.size === "small" && {
			fontSize: 16,
			marginRight: 4,
			marginLeft: -4
		}, t.color !== "default" && {
			color: e.vars ? `rgba(${e.vars.palette[t.color].contrastTextChannel} / 0.7)` : (0, Hg.alpha)(e.palette[t.color].contrastText, .7),
			"&:hover, &:active": { color: (e.vars || e).palette[t.color].contrastText }
		})
	}, t.size === "small" && { height: 24 }, t.color !== "default" && {
		backgroundColor: (e.vars || e).palette[t.color].main,
		color: (e.vars || e).palette[t.color].contrastText
	}, t.onDelete && { [`&.${j_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.focusOpacity}))` : (0, Hg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.focusOpacity) } }, t.onDelete && t.color !== "default" && { [`&.${j_.focusVisible}`]: { backgroundColor: (e.vars || e).palette[t.color].dark } });
}, ({ theme: e, ownerState: t }) => B({}, t.clickable && {
	userSelect: "none",
	WebkitTapHighlightColor: "transparent",
	cursor: "pointer",
	"&:hover": { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.hoverOpacity}))` : (0, Hg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.hoverOpacity) },
	[`&.${j_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.focusOpacity}))` : (0, Hg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.focusOpacity) },
	"&:active": { boxShadow: (e.vars || e).shadows[1] }
}, t.clickable && t.color !== "default" && { [`&:hover, &.${j_.focusVisible}`]: { backgroundColor: (e.vars || e).palette[t.color].dark } }), ({ theme: e, ownerState: t }) => B({}, t.variant === "outlined" && {
	backgroundColor: "transparent",
	border: e.vars ? `1px solid ${e.vars.palette.Chip.defaultBorder}` : `1px solid ${e.palette.mode === "light" ? e.palette.grey[400] : e.palette.grey[700]}`,
	[`&.${j_.clickable}:hover`]: { backgroundColor: (e.vars || e).palette.action.hover },
	[`&.${j_.focusVisible}`]: { backgroundColor: (e.vars || e).palette.action.focus },
	[`& .${j_.avatar}`]: { marginLeft: 4 },
	[`& .${j_.avatarSmall}`]: { marginLeft: 2 },
	[`& .${j_.icon}`]: { marginLeft: 4 },
	[`& .${j_.iconSmall}`]: { marginLeft: 2 },
	[`& .${j_.deleteIcon}`]: { marginRight: 5 },
	[`& .${j_.deleteIconSmall}`]: { marginRight: 3 }
}, t.variant === "outlined" && t.color !== "default" && {
	color: (e.vars || e).palette[t.color].main,
	border: `1px solid ${e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / 0.7)` : (0, Hg.alpha)(e.palette[t.color].main, .7)}`,
	[`&.${j_.clickable}:hover`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity) },
	[`&.${j_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.focusOpacity})` : (0, Hg.alpha)(e.palette[t.color].main, e.palette.action.focusOpacity) },
	[`& .${j_.deleteIcon}`]: {
		color: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / 0.7)` : (0, Hg.alpha)(e.palette[t.color].main, .7),
		"&:hover, &:active": { color: (e.vars || e).palette[t.color].main }
	}
})), F_ = Y("span", {
	name: "MuiChip",
	slot: "Label",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e, { size: r } = n;
		return [t.label, t[`label${G(r)}`]];
	}
})(({ ownerState: e }) => B({
	overflow: "hidden",
	textOverflow: "ellipsis",
	paddingLeft: 12,
	paddingRight: 12,
	whiteSpace: "nowrap"
}, e.variant === "outlined" && {
	paddingLeft: 11,
	paddingRight: 11
}, e.size === "small" && {
	paddingLeft: 8,
	paddingRight: 8
}, e.size === "small" && e.variant === "outlined" && {
	paddingLeft: 7,
	paddingRight: 7
}));
function I_(e) {
	return e.key === "Backspace" || e.key === "Delete";
}
var L_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiChip"
	}), { avatar: r, className: i, clickable: a, color: o = "default", component: s, deleteIcon: c, disabled: l = !1, icon: u, label: d, onClick: f, onDelete: p, onKeyDown: m, onKeyUp: h, size: g = "medium", variant: _ = "filled", tabIndex: v, skipFocusWhenDisabled: y = !1 } = n, b = H(n, M_), x = X.useRef(null), S = sh(x, t), C = (e) => {
		e.stopPropagation(), p && p(e);
	}, w = (e) => {
		e.currentTarget === e.target && I_(e) && e.preventDefault(), m && m(e);
	}, T = (e) => {
		e.currentTarget === e.target && (p && I_(e) ? p(e) : e.key === "Escape" && x.current && x.current.blur()), h && h(e);
	}, E = a !== !1 && f ? !0 : a, D = E || p ? p_ : s || "div", O = B({}, n, {
		component: D,
		disabled: l,
		size: g,
		color: o,
		iconColor: /*#__PURE__*/ X.isValidElement(u) && u.props.color || o,
		onDelete: !!p,
		clickable: E,
		variant: _
	}), k = N_(O), A = D === p_ ? B({
		component: s || "div",
		focusVisibleClassName: k.focusVisible
	}, p && { disableRipple: !0 }) : {}, j = null;
	p && (j = c && /*#__PURE__*/ X.isValidElement(c) ? /*#__PURE__*/ X.cloneElement(c, {
		className: W(c.props.className, k.deleteIcon),
		onClick: C
	}) : /*#__PURE__*/ (0, Z.jsx)(k_, {
		className: W(k.deleteIcon),
		onClick: C
	}));
	let M = null;
	r && /*#__PURE__*/ X.isValidElement(r) && (M = /*#__PURE__*/ X.cloneElement(r, { className: W(k.avatar, r.props.className) }));
	let N = null;
	return u && /*#__PURE__*/ X.isValidElement(u) && (N = /*#__PURE__*/ X.cloneElement(u, { className: W(k.icon, u.props.className) })), /*#__PURE__*/ (0, Z.jsxs)(P_, B({
		as: D,
		className: W(k.root, i),
		disabled: E && l ? !0 : void 0,
		onClick: f,
		onKeyDown: w,
		onKeyUp: T,
		ref: S,
		tabIndex: y && l ? -1 : v,
		ownerState: O
	}, A, b, { children: [
		M || N,
		/*#__PURE__*/ (0, Z.jsx)(F_, {
			className: W(k.label),
			ownerState: O,
			children: d
		}),
		j
	] }));
});
V(), U(), $s();
var R_ = [
	"onChange",
	"maxRows",
	"minRows",
	"style",
	"value"
];
function z_(e) {
	return parseInt(e, 10) || 0;
}
var B_ = { shadow: {
	visibility: "hidden",
	position: "absolute",
	overflow: "hidden",
	height: 0,
	top: 0,
	left: 0,
	transform: "translateZ(0)"
} };
function V_(e) {
	for (let t in e) return !1;
	return !0;
}
function H_(e) {
	return V_(e) || e.outerHeightStyle === 0 && !e.overflowing;
}
var U_ = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let { onChange: n, maxRows: r, minRows: i = 1, style: a, value: o } = e, s = H(e, R_), { current: c } = X.useRef(o != null), l = X.useRef(null), u = xo(t, l), d = X.useRef(null), f = X.useRef(null), p = X.useCallback(() => {
		let t = l.current, n = f.current;
		if (!t || !n) return;
		let a = Ua(t).getComputedStyle(t);
		if (a.width === "0px") return {
			outerHeightStyle: 0,
			overflowing: !1
		};
		n.style.width = a.width, n.value = t.value || e.placeholder || "x", n.value.slice(-1) === "\n" && (n.value += " ");
		let o = a.boxSizing, s = z_(a.paddingBottom) + z_(a.paddingTop), c = z_(a.borderBottomWidth) + z_(a.borderTopWidth), u = n.scrollHeight;
		n.value = "x";
		let d = n.scrollHeight, p = u;
		return i && (p = Math.max(Number(i) * d, p)), r && (p = Math.min(Number(r) * d, p)), p = Math.max(p, d), {
			outerHeightStyle: p + (o === "border-box" ? s + c : 0),
			overflowing: Math.abs(p - u) <= 1
		};
	}, [
		r,
		i,
		e.placeholder
	]), m = _o(() => {
		let e = l.current, t = p();
		if (!e || !t || H_(t)) return !1;
		let n = t.outerHeightStyle;
		return d.current != null && d.current !== n;
	}), h = X.useCallback(() => {
		let e = l.current, t = p();
		if (!e || !t || H_(t)) return;
		let n = t.outerHeightStyle;
		d.current !== n && (d.current = n, e.style.height = `${n}px`), e.style.overflow = t.overflowing ? "hidden" : "";
	}, [p]), g = X.useRef(-1);
	return $a(() => {
		let e = Aa(h), t = l == null ? void 0 : l.current;
		if (!t) return;
		let n = Ua(t);
		n.addEventListener("resize", e);
		let r;
		return typeof ResizeObserver < "u" && (r = new ResizeObserver(() => {
			m() && (r.unobserve(t), cancelAnimationFrame(g.current), h(), g.current = requestAnimationFrame(() => {
				r.observe(t);
			}));
		}), r.observe(t)), () => {
			e.clear(), cancelAnimationFrame(g.current), n.removeEventListener("resize", e), r && r.disconnect();
		};
	}, [
		p,
		h,
		m
	]), $a(() => {
		h();
	}), /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [/*#__PURE__*/ (0, Z.jsx)("textarea", B({
		value: o,
		onChange: (e) => {
			c || h(), n && n(e);
		},
		ref: u,
		rows: i,
		style: a
	}, s)), /*#__PURE__*/ (0, Z.jsx)("textarea", {
		"aria-hidden": !0,
		className: e.className,
		readOnly: !0,
		ref: f,
		tabIndex: -1,
		style: B({}, B_.shadow, a, {
			paddingTop: 0,
			paddingBottom: 0
		})
	})] });
});
//#endregion
//#region node_modules/@mui/material/FormControl/formControlState.js
function W_({ props: e, states: t, muiFormControl: n }) {
	return t.reduce((t, r) => (t[r] = e[r], n && e[r] === void 0 && (t[r] = n[r]), t), {});
}
//#endregion
//#region node_modules/@mui/material/FormControl/FormControlContext.js
var G_ = /*#__PURE__*/ X.createContext(void 0);
//#endregion
//#region node_modules/@mui/material/FormControl/useFormControl.js
function K_() {
	return X.useContext(G_);
}
V(), pm(), hm();
function q_(e) {
	return /*#__PURE__*/ (0, Z.jsx)(kh, B({}, e, {
		defaultTheme: fm,
		themeId: mm
	}));
}
//#endregion
//#region node_modules/@mui/material/InputBase/utils.js
function J_(e) {
	return e != null && !(Array.isArray(e) && e.length === 0);
}
function Y_(e, t = !1) {
	return e && (J_(e.value) && e.value !== "" || t && J_(e.defaultValue) && e.defaultValue !== "");
}
function X_(e) {
	return e.startAdornment;
}
bs(), _s();
function Z_(e) {
	return ms("MuiInputBase", e);
}
var Q_ = vs("MuiInputBase", [
	"root",
	"formControl",
	"focused",
	"disabled",
	"adornedStart",
	"adornedEnd",
	"error",
	"sizeSmall",
	"multiline",
	"colorSecondary",
	"fullWidth",
	"hiddenLabel",
	"readOnly",
	"input",
	"inputSizeSmall",
	"inputMultiline",
	"inputTypeSearch",
	"inputAdornedStart",
	"inputAdornedEnd",
	"inputHiddenLabel"
]);
U(), V(), da(), Ms(), cs(), Ds(), xm(), K(), ec(), ch(), Qm();
var $_ = /* @__PURE__ */ "aria-describedby.autoComplete.autoFocus.className.color.components.componentsProps.defaultValue.disabled.disableInjectingGlobalStyles.endAdornment.error.fullWidth.id.inputComponent.inputProps.inputRef.margin.maxRows.minRows.multiline.name.onBlur.onChange.onClick.onFocus.onKeyDown.onKeyUp.placeholder.readOnly.renderSuffix.rows.size.slotProps.slots.startAdornment.type.value".split("."), ev = (e, t) => {
	let { ownerState: n } = e;
	return [
		t.root,
		n.formControl && t.formControl,
		n.startAdornment && t.adornedStart,
		n.endAdornment && t.adornedEnd,
		n.error && t.error,
		n.size === "small" && t.sizeSmall,
		n.multiline && t.multiline,
		n.color && t[`color${G(n.color)}`],
		n.fullWidth && t.fullWidth,
		n.hiddenLabel && t.hiddenLabel
	];
}, tv = (e, t) => {
	let { ownerState: n } = e;
	return [
		t.input,
		n.size === "small" && t.inputSizeSmall,
		n.multiline && t.inputMultiline,
		n.type === "search" && t.inputTypeSearch,
		n.startAdornment && t.inputAdornedStart,
		n.endAdornment && t.inputAdornedEnd,
		n.hiddenLabel && t.inputHiddenLabel
	];
}, nv = (e) => {
	let { classes: t, color: n, disabled: r, error: i, endAdornment: a, focused: o, formControl: s, fullWidth: c, hiddenLabel: l, multiline: u, readOnly: d, size: f, startAdornment: p, type: m } = e;
	return os({
		root: [
			"root",
			`color${G(n)}`,
			r && "disabled",
			i && "error",
			c && "fullWidth",
			o && "focused",
			s && "formControl",
			f && f !== "medium" && `size${G(f)}`,
			u && "multiline",
			p && "adornedStart",
			a && "adornedEnd",
			l && "hiddenLabel",
			d && "readOnly"
		],
		input: [
			"input",
			r && "disabled",
			m === "search" && "inputTypeSearch",
			u && "inputMultiline",
			f === "small" && "inputSizeSmall",
			l && "inputHiddenLabel",
			p && "inputAdornedStart",
			a && "inputAdornedEnd",
			d && "readOnly"
		]
	}, Z_, t);
}, rv = Y("div", {
	name: "MuiInputBase",
	slot: "Root",
	overridesResolver: ev
})(({ theme: e, ownerState: t }) => B({}, e.typography.body1, {
	color: (e.vars || e).palette.text.primary,
	lineHeight: "1.4375em",
	boxSizing: "border-box",
	position: "relative",
	cursor: "text",
	display: "inline-flex",
	alignItems: "center",
	[`&.${Q_.disabled}`]: {
		color: (e.vars || e).palette.text.disabled,
		cursor: "default"
	}
}, t.multiline && B({ padding: "4px 0 5px" }, t.size === "small" && { paddingTop: 1 }), t.fullWidth && { width: "100%" })), iv = Y("input", {
	name: "MuiInputBase",
	slot: "Input",
	overridesResolver: tv
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light", r = B({ color: "currentColor" }, e.vars ? { opacity: e.vars.opacity.inputPlaceholder } : { opacity: n ? .42 : .5 }, { transition: e.transitions.create("opacity", { duration: e.transitions.duration.shorter }) }), i = { opacity: "0 !important" }, a = e.vars ? { opacity: e.vars.opacity.inputPlaceholder } : { opacity: n ? .42 : .5 };
	return B({
		font: "inherit",
		letterSpacing: "inherit",
		color: "currentColor",
		padding: "4px 0 5px",
		border: 0,
		boxSizing: "content-box",
		background: "none",
		height: "1.4375em",
		margin: 0,
		WebkitTapHighlightColor: "transparent",
		display: "block",
		minWidth: 0,
		width: "100%",
		animationName: "mui-auto-fill-cancel",
		animationDuration: "10ms",
		"&::-webkit-input-placeholder": r,
		"&::-moz-placeholder": r,
		"&:-ms-input-placeholder": r,
		"&::-ms-input-placeholder": r,
		"&:focus": { outline: 0 },
		"&:invalid": { boxShadow: "none" },
		"&::-webkit-search-decoration": { WebkitAppearance: "none" },
		[`label[data-shrink=false] + .${Q_.formControl} &`]: {
			"&::-webkit-input-placeholder": i,
			"&::-moz-placeholder": i,
			"&:-ms-input-placeholder": i,
			"&::-ms-input-placeholder": i,
			"&:focus::-webkit-input-placeholder": a,
			"&:focus::-moz-placeholder": a,
			"&:focus:-ms-input-placeholder": a,
			"&:focus::-ms-input-placeholder": a
		},
		[`&.${Q_.disabled}`]: {
			opacity: 1,
			WebkitTextFillColor: (e.vars || e).palette.text.disabled
		},
		"&:-webkit-autofill": {
			animationDuration: "5000s",
			animationName: "mui-auto-fill"
		}
	}, t.size === "small" && { paddingTop: 1 }, t.multiline && {
		height: "auto",
		resize: "none",
		padding: 0,
		paddingTop: 0
	}, t.type === "search" && { MozAppearance: "textfield" });
}), av = /*#__PURE__*/ (0, Z.jsx)(q_, { styles: {
	"@keyframes mui-auto-fill": { from: { display: "block" } },
	"@keyframes mui-auto-fill-cancel": { from: { display: "block" } }
} }), ov = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n;
	let r = pc({
		props: e,
		name: "MuiInputBase"
	}), { "aria-describedby": i, autoComplete: a, autoFocus: o, className: s, components: c = {}, componentsProps: l = {}, defaultValue: u, disabled: d, disableInjectingGlobalStyles: f, endAdornment: p, fullWidth: m = !1, id: h, inputComponent: g = "input", inputProps: _ = {}, inputRef: v, maxRows: y, minRows: b, multiline: x = !1, name: S, onBlur: C, onChange: w, onClick: T, onFocus: E, onKeyDown: D, onKeyUp: O, placeholder: k, readOnly: A, renderSuffix: j, rows: M, slotProps: N = {}, slots: P = {}, startAdornment: ee, type: te = "text", value: F } = r, ne = H(r, $_), I = _.value == null ? F : _.value, { current: L } = X.useRef(I != null), re = X.useRef(), ie = X.useCallback((e) => {}, []), ae = sh(re, v, _.ref, ie), [oe, se] = X.useState(!1), ce = K_(), le = W_({
		props: r,
		muiFormControl: ce,
		states: [
			"color",
			"disabled",
			"error",
			"hiddenLabel",
			"size",
			"required",
			"filled"
		]
	});
	le.focused = ce ? ce.focused : oe, X.useEffect(() => {
		!ce && d && oe && (se(!1), C && C());
	}, [
		ce,
		d,
		oe,
		C
	]);
	let ue = ce && ce.onFilled, de = ce && ce.onEmpty, fe = X.useCallback((e) => {
		Y_(e) ? ue && ue() : de && de();
	}, [ue, de]);
	Zm(() => {
		L && fe({ value: I });
	}, [
		I,
		fe,
		L
	]);
	let pe = (e) => {
		if (le.disabled) {
			e.stopPropagation();
			return;
		}
		E && E(e), _.onFocus && _.onFocus(e), ce && ce.onFocus ? ce.onFocus(e) : se(!0);
	}, me = (e) => {
		C && C(e), _.onBlur && _.onBlur(e), ce && ce.onBlur ? ce.onBlur(e) : se(!1);
	}, he = (e, ...t) => {
		if (!L) {
			let t = e.target || re.current;
			if (t == null) throw Error(ca(1));
			fe({ value: t.value });
		}
		_.onChange && _.onChange(e, ...t), w && w(e, ...t);
	};
	X.useEffect(() => {
		fe(re.current);
	}, []);
	let ge = (e) => {
		re.current && e.currentTarget === e.target && re.current.focus(), T && T(e);
	}, _e = g, ve = _;
	x && _e === "input" && (ve = B(M ? {
		type: void 0,
		minRows: M,
		maxRows: M
	} : {
		type: void 0,
		maxRows: y,
		minRows: b
	}, ve), _e = U_);
	let ye = (e) => {
		fe(e.animationName === "mui-auto-fill-cancel" ? re.current : { value: "x" });
	};
	X.useEffect(() => {
		ce && ce.setAdornedStart(!!ee);
	}, [ce, ee]);
	let be = B({}, r, {
		color: le.color || "primary",
		disabled: le.disabled,
		endAdornment: p,
		error: le.error,
		focused: le.focused,
		formControl: ce,
		fullWidth: m,
		hiddenLabel: le.hiddenLabel,
		multiline: x,
		size: le.size,
		startAdornment: ee,
		type: te
	}), xe = nv(be), Se = P.root || c.Root || rv, Ce = N.root || l.root || {}, we = P.input || c.Input || iv;
	return ve = B({}, ve, (n = N.input) == null ? l.input : n), /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [!f && av, /*#__PURE__*/ (0, Z.jsxs)(Se, B({}, Ce, !Ts(Se) && { ownerState: B({}, be, Ce.ownerState) }, {
		ref: t,
		onClick: ge
	}, ne, {
		className: W(xe.root, Ce.className, s, A && "MuiInputBase-readOnly"),
		children: [
			ee,
			/*#__PURE__*/ (0, Z.jsx)(G_.Provider, {
				value: null,
				children: /*#__PURE__*/ (0, Z.jsx)(we, B({
					ownerState: be,
					"aria-invalid": le.error,
					"aria-describedby": i,
					autoComplete: a,
					autoFocus: o,
					defaultValue: u,
					disabled: le.disabled,
					id: h,
					onAnimationStart: ye,
					name: S,
					placeholder: k,
					readOnly: A,
					required: le.required,
					rows: M,
					value: I,
					onKeyDown: D,
					onKeyUp: O,
					type: te
				}, ve, !Ts(we) && {
					as: _e,
					ownerState: B({}, be, ve.ownerState)
				}, {
					ref: ae,
					className: W(xe.input, ve.className, A && "MuiInputBase-readOnly"),
					onBlur: me,
					onChange: he,
					onFocus: pe
				}))
			}),
			p,
			j ? j(B({}, le, { startAdornment: ee })) : null
		]
	}))] });
});
V(), bs(), _s();
function sv(e) {
	return ms("MuiInput", e);
}
var cv = B({}, Q_, vs("MuiInput", [
	"root",
	"underline",
	"input"
]));
V(), bs(), _s();
function lv(e) {
	return ms("MuiOutlinedInput", e);
}
var uv = B({}, Q_, vs("MuiOutlinedInput", [
	"root",
	"notchedOutline",
	"input"
]));
V(), bs(), _s();
function dv(e) {
	return ms("MuiFilledInput", e);
}
var fv = B({}, Q_, vs("MuiFilledInput", [
	"root",
	"underline",
	"input"
]));
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/ArrowDropDown.js
Im();
var pv = Nm(/*#__PURE__*/ (0, Z.jsx)("path", { d: "M7 10l5 5 5-5z" }), "ArrowDropDown");
V(), U(), Zs(), ch();
var mv = [
	"addEndListener",
	"appear",
	"children",
	"easing",
	"in",
	"onEnter",
	"onEntered",
	"onEntering",
	"onExit",
	"onExited",
	"onExiting",
	"style",
	"timeout",
	"TransitionComponent"
], hv = {
	entering: { opacity: 1 },
	entered: { opacity: 1 }
}, gv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = lg(), r = {
		enter: n.transitions.duration.enteringScreen,
		exit: n.transitions.duration.leavingScreen
	}, { addEndListener: i, appear: a = !0, children: o, easing: s, in: c, onEnter: l, onEntered: u, onEntering: d, onExit: f, onExited: p, onExiting: m, style: h, timeout: g = r, TransitionComponent: _ = Og } = e, v = H(e, mv), y = X.useRef(null), b = sh(y, Ys(o), t), x = (e) => (t) => {
		if (e) {
			let n = y.current;
			t === void 0 ? e(n) : e(n, t);
		}
	}, S = x(d), C = x((e, t) => {
		zg(e);
		let r = Bg({
			style: h,
			timeout: g,
			easing: s
		}, { mode: "enter" });
		e.style.webkitTransition = n.transitions.create("opacity", r), e.style.transition = n.transitions.create("opacity", r), l && l(e, t);
	}), w = x(u), T = x(m), E = x((e) => {
		let t = Bg({
			style: h,
			timeout: g,
			easing: s
		}, { mode: "exit" });
		e.style.webkitTransition = n.transitions.create("opacity", t), e.style.transition = n.transitions.create("opacity", t), f && f(e);
	}), D = x(p);
	return /*#__PURE__*/ (0, Z.jsx)(_, B({
		appear: a,
		in: c,
		nodeRef: y,
		onEnter: C,
		onEntered: w,
		onEntering: S,
		onExit: E,
		onExited: D,
		onExiting: T,
		addEndListener: (e) => {
			i && i(y.current, e);
		},
		timeout: g
	}, v, { children: (e, t) => /*#__PURE__*/ X.cloneElement(o, B({
		style: B({
			opacity: 0,
			visibility: e === "exited" && !c ? "hidden" : void 0
		}, hv[e], h, o.props.style),
		ref: b
	}, t)) }));
});
bs(), _s();
function _v(e) {
	return ms("MuiBackdrop", e);
}
vs("MuiBackdrop", ["root", "invisible"]), U(), V(), Ms(), cs(), xm(), K();
var vv = [
	"children",
	"className",
	"component",
	"components",
	"componentsProps",
	"invisible",
	"open",
	"slotProps",
	"slots",
	"TransitionComponent",
	"transitionDuration"
], yv = (e) => {
	let { classes: t, invisible: n } = e;
	return os({ root: ["root", n && "invisible"] }, _v, t);
}, bv = Y("div", {
	name: "MuiBackdrop",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.root, n.invisible && t.invisible];
	}
})(({ ownerState: e }) => B({
	position: "fixed",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	right: 0,
	bottom: 0,
	top: 0,
	left: 0,
	backgroundColor: "rgba(0, 0, 0, 0.5)",
	WebkitTapHighlightColor: "transparent"
}, e.invisible && { backgroundColor: "transparent" })), xv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i;
	let a = pc({
		props: e,
		name: "MuiBackdrop"
	}), { children: o, className: s, component: c = "div", components: l = {}, componentsProps: u = {}, invisible: d = !1, open: f, slotProps: p = {}, slots: m = {}, TransitionComponent: h = gv, transitionDuration: g } = a, _ = H(a, vv), v = B({}, a, {
		component: c,
		invisible: d
	}), y = yv(v), b = (n = p.root) == null ? u.root : n;
	return /*#__PURE__*/ (0, Z.jsx)(h, B({
		in: f,
		timeout: g
	}, _, { children: /*#__PURE__*/ (0, Z.jsx)(bv, B({ "aria-hidden": !0 }, b, {
		as: (r = (i = m.root) == null ? l.Root : i) == null ? c : r,
		className: W(y.root, s, b == null ? void 0 : b.className),
		ownerState: B({}, v, b == null ? void 0 : b.ownerState),
		classes: y,
		ref: t,
		children: o
	})) }));
});
//#endregion
//#region node_modules/@mui/material/Box/boxClasses.js
bs();
var Sv = vs("MuiBox", ["root"]);
fs(), dm(), hm();
var Cv = lm(), $ = jh({
	themeId: mm,
	defaultTheme: Cv,
	defaultClassName: Sv.root,
	generateClassName: ds.generate
});
bs(), _s();
function wv(e) {
	return ms("MuiButton", e);
}
var Tv = vs("MuiButton", /* @__PURE__ */ "root.text.textInherit.textPrimary.textSecondary.textSuccess.textError.textInfo.textWarning.outlined.outlinedInherit.outlinedPrimary.outlinedSecondary.outlinedSuccess.outlinedError.outlinedInfo.outlinedWarning.contained.containedInherit.containedPrimary.containedSecondary.containedSuccess.containedError.containedInfo.containedWarning.disableElevation.focusVisible.disabled.colorInherit.colorPrimary.colorSecondary.colorSuccess.colorError.colorInfo.colorWarning.textSizeSmall.textSizeMedium.textSizeLarge.outlinedSizeSmall.outlinedSizeMedium.outlinedSizeLarge.containedSizeSmall.containedSizeMedium.containedSizeLarge.sizeMedium.sizeSmall.sizeLarge.fullWidth.startIcon.endIcon.icon.iconSizeSmall.iconSizeMedium.iconSizeLarge".split(".")), Ev = /*#__PURE__*/ X.createContext({}), Dv = /*#__PURE__*/ X.createContext(void 0);
U(), V(), Ms(), as(), cs(), xm(), K(), ec();
var Ov = [
	"children",
	"color",
	"component",
	"className",
	"disabled",
	"disableElevation",
	"disableFocusRipple",
	"endIcon",
	"focusVisibleClassName",
	"fullWidth",
	"size",
	"startIcon",
	"type",
	"variant"
], kv = (e) => {
	let { color: t, disableElevation: n, fullWidth: r, size: i, variant: a, classes: o } = e, s = os({
		root: [
			"root",
			a,
			`${a}${G(t)}`,
			`size${G(i)}`,
			`${a}Size${G(i)}`,
			`color${G(t)}`,
			n && "disableElevation",
			r && "fullWidth"
		],
		label: ["label"],
		startIcon: [
			"icon",
			"startIcon",
			`iconSize${G(i)}`
		],
		endIcon: [
			"icon",
			"endIcon",
			`iconSize${G(i)}`
		]
	}, wv, o);
	return B({}, o, s);
}, Av = (e) => B({}, e.size === "small" && { "& > *:nth-of-type(1)": { fontSize: 18 } }, e.size === "medium" && { "& > *:nth-of-type(1)": { fontSize: 20 } }, e.size === "large" && { "& > *:nth-of-type(1)": { fontSize: 22 } }), jv = Y(p_, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiButton",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[n.variant],
			t[`${n.variant}${G(n.color)}`],
			t[`size${G(n.size)}`],
			t[`${n.variant}Size${G(n.size)}`],
			n.color === "inherit" && t.colorInherit,
			n.disableElevation && t.disableElevation,
			n.fullWidth && t.fullWidth
		];
	}
})(({ theme: e, ownerState: t }) => {
	var n, r;
	let i = e.palette.mode === "light" ? e.palette.grey[300] : e.palette.grey[800], a = e.palette.mode === "light" ? e.palette.grey.A100 : e.palette.grey[700];
	return B({}, e.typography.button, {
		minWidth: 64,
		padding: "6px 16px",
		borderRadius: (e.vars || e).shape.borderRadius,
		transition: e.transitions.create([
			"background-color",
			"box-shadow",
			"border-color",
			"color"
		], { duration: e.transitions.duration.short }),
		"&:hover": B({
			textDecoration: "none",
			backgroundColor: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(e.palette.text.primary, e.palette.action.hoverOpacity),
			"@media (hover: none)": { backgroundColor: "transparent" }
		}, t.variant === "text" && t.color !== "inherit" && {
			backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity),
			"@media (hover: none)": { backgroundColor: "transparent" }
		}, t.variant === "outlined" && t.color !== "inherit" && {
			border: `1px solid ${(e.vars || e).palette[t.color].main}`,
			backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, Hg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity),
			"@media (hover: none)": { backgroundColor: "transparent" }
		}, t.variant === "contained" && {
			backgroundColor: e.vars ? e.vars.palette.Button.inheritContainedHoverBg : a,
			boxShadow: (e.vars || e).shadows[4],
			"@media (hover: none)": {
				boxShadow: (e.vars || e).shadows[2],
				backgroundColor: (e.vars || e).palette.grey[300]
			}
		}, t.variant === "contained" && t.color !== "inherit" && {
			backgroundColor: (e.vars || e).palette[t.color].dark,
			"@media (hover: none)": { backgroundColor: (e.vars || e).palette[t.color].main }
		}),
		"&:active": B({}, t.variant === "contained" && { boxShadow: (e.vars || e).shadows[8] }),
		[`&.${Tv.focusVisible}`]: B({}, t.variant === "contained" && { boxShadow: (e.vars || e).shadows[6] }),
		[`&.${Tv.disabled}`]: B({ color: (e.vars || e).palette.action.disabled }, t.variant === "outlined" && { border: `1px solid ${(e.vars || e).palette.action.disabledBackground}` }, t.variant === "contained" && {
			color: (e.vars || e).palette.action.disabled,
			boxShadow: (e.vars || e).shadows[0],
			backgroundColor: (e.vars || e).palette.action.disabledBackground
		})
	}, t.variant === "text" && { padding: "6px 8px" }, t.variant === "text" && t.color !== "inherit" && { color: (e.vars || e).palette[t.color].main }, t.variant === "outlined" && {
		padding: "5px 15px",
		border: "1px solid currentColor"
	}, t.variant === "outlined" && t.color !== "inherit" && {
		color: (e.vars || e).palette[t.color].main,
		border: e.vars ? `1px solid rgba(${e.vars.palette[t.color].mainChannel} / 0.5)` : `1px solid ${(0, Hg.alpha)(e.palette[t.color].main, .5)}`
	}, t.variant === "contained" && {
		color: e.vars ? e.vars.palette.text.primary : (n = (r = e.palette).getContrastText) == null ? void 0 : n.call(r, e.palette.grey[300]),
		backgroundColor: e.vars ? e.vars.palette.Button.inheritContainedBg : i,
		boxShadow: (e.vars || e).shadows[2]
	}, t.variant === "contained" && t.color !== "inherit" && {
		color: (e.vars || e).palette[t.color].contrastText,
		backgroundColor: (e.vars || e).palette[t.color].main
	}, t.color === "inherit" && {
		color: "inherit",
		borderColor: "currentColor"
	}, t.size === "small" && t.variant === "text" && {
		padding: "4px 5px",
		fontSize: e.typography.pxToRem(13)
	}, t.size === "large" && t.variant === "text" && {
		padding: "8px 11px",
		fontSize: e.typography.pxToRem(15)
	}, t.size === "small" && t.variant === "outlined" && {
		padding: "3px 9px",
		fontSize: e.typography.pxToRem(13)
	}, t.size === "large" && t.variant === "outlined" && {
		padding: "7px 21px",
		fontSize: e.typography.pxToRem(15)
	}, t.size === "small" && t.variant === "contained" && {
		padding: "4px 10px",
		fontSize: e.typography.pxToRem(13)
	}, t.size === "large" && t.variant === "contained" && {
		padding: "8px 22px",
		fontSize: e.typography.pxToRem(15)
	}, t.fullWidth && { width: "100%" });
}, ({ ownerState: e }) => e.disableElevation && {
	boxShadow: "none",
	"&:hover": { boxShadow: "none" },
	[`&.${Tv.focusVisible}`]: { boxShadow: "none" },
	"&:active": { boxShadow: "none" },
	[`&.${Tv.disabled}`]: { boxShadow: "none" }
}), Mv = Y("span", {
	name: "MuiButton",
	slot: "StartIcon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.startIcon, t[`iconSize${G(n.size)}`]];
	}
})(({ ownerState: e }) => B({
	display: "inherit",
	marginRight: 8,
	marginLeft: -4
}, e.size === "small" && { marginLeft: -2 }, Av(e))), Nv = Y("span", {
	name: "MuiButton",
	slot: "EndIcon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.endIcon, t[`iconSize${G(n.size)}`]];
	}
})(({ ownerState: e }) => B({
	display: "inherit",
	marginRight: -4,
	marginLeft: 8
}, e.size === "small" && { marginRight: -2 }, Av(e))), Pv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = X.useContext(Ev), r = X.useContext(Dv), i = pc({
		props: rs(n, e),
		name: "MuiButton"
	}), { children: a, color: o = "primary", component: s = "button", className: c, disabled: l = !1, disableElevation: u = !1, disableFocusRipple: d = !1, endIcon: f, focusVisibleClassName: p, fullWidth: m = !1, size: h = "medium", startIcon: g, type: _, variant: v = "text" } = i, y = H(i, Ov), b = B({}, i, {
		color: o,
		component: s,
		disabled: l,
		disableElevation: u,
		disableFocusRipple: d,
		fullWidth: m,
		size: h,
		type: _,
		variant: v
	}), x = kv(b), S = g && /*#__PURE__*/ (0, Z.jsx)(Mv, {
		className: x.startIcon,
		ownerState: b,
		children: g
	}), C = f && /*#__PURE__*/ (0, Z.jsx)(Nv, {
		className: x.endIcon,
		ownerState: b,
		children: f
	}), w = r || "";
	return /*#__PURE__*/ (0, Z.jsxs)(jv, B({
		ownerState: b,
		className: W(n.className, x.root, c, w),
		component: s,
		disabled: l,
		focusRipple: !d,
		focusVisibleClassName: W(x.focusVisible, p),
		ref: t,
		type: _
	}, y, {
		classes: x,
		children: [
			S,
			a,
			C
		]
	}));
});
bs(), _s();
function Fv(e) {
	return ms("MuiCard", e);
}
vs("MuiCard", ["root"]), V(), U(), Ms(), cs(), xm(), K();
var Iv = ["className", "raised"], Lv = (e) => {
	let { classes: t } = e;
	return os({ root: ["root"] }, Fv, t);
}, Rv = Y(Kg, {
	name: "MuiCard",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(() => ({ overflow: "hidden" })), zv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiCard"
	}), { className: r, raised: i = !1 } = n, a = H(n, Iv), o = B({}, n, { raised: i }), s = Lv(o);
	return /*#__PURE__*/ (0, Z.jsx)(Rv, B({
		className: W(s.root, r),
		elevation: i ? 8 : void 0,
		ref: t,
		ownerState: o
	}, a));
});
bs(), _s();
function Bv(e) {
	return ms("MuiCardActionArea", e);
}
var Vv = vs("MuiCardActionArea", [
	"root",
	"focusVisible",
	"focusHighlight"
]);
V(), U(), Ms(), cs(), K(), xm();
var Hv = [
	"children",
	"className",
	"focusVisibleClassName"
], Uv = (e) => {
	let { classes: t } = e;
	return os({
		root: ["root"],
		focusHighlight: ["focusHighlight"]
	}, Bv, t);
}, Wv = Y(p_, {
	name: "MuiCardActionArea",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(({ theme: e }) => ({
	display: "block",
	textAlign: "inherit",
	borderRadius: "inherit",
	width: "100%",
	[`&:hover .${Vv.focusHighlight}`]: {
		opacity: (e.vars || e).palette.action.hoverOpacity,
		"@media (hover: none)": { opacity: 0 }
	},
	[`&.${Vv.focusVisible} .${Vv.focusHighlight}`]: { opacity: (e.vars || e).palette.action.focusOpacity }
})), Gv = Y("span", {
	name: "MuiCardActionArea",
	slot: "FocusHighlight",
	overridesResolver: (e, t) => t.focusHighlight
})(({ theme: e }) => ({
	overflow: "hidden",
	pointerEvents: "none",
	position: "absolute",
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
	borderRadius: "inherit",
	opacity: 0,
	backgroundColor: "currentcolor",
	transition: e.transitions.create("opacity", { duration: e.transitions.duration.short })
})), Kv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiCardActionArea"
	}), { children: r, className: i, focusVisibleClassName: a } = n, o = H(n, Hv), s = n, c = Uv(s);
	return /*#__PURE__*/ (0, Z.jsxs)(Wv, B({
		className: W(c.root, i),
		focusVisibleClassName: W(a, c.focusVisible),
		ref: t,
		ownerState: s
	}, o, { children: [r, /*#__PURE__*/ (0, Z.jsx)(Gv, {
		className: c.focusHighlight,
		ownerState: s
	})] }));
});
bs(), _s();
function qv(e) {
	return ms("MuiCardContent", e);
}
vs("MuiCardContent", ["root"]), V(), U(), Ms(), cs(), xm(), K();
var Jv = ["className", "component"], Yv = (e) => {
	let { classes: t } = e;
	return os({ root: ["root"] }, qv, t);
}, Xv = Y("div", {
	name: "MuiCardContent",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(() => ({
	padding: 16,
	"&:last-child": { paddingBottom: 24 }
})), Zv = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiCardContent"
	}), { className: r, component: i = "div" } = n, a = H(n, Jv), o = B({}, n, { component: i }), s = Yv(o);
	return /*#__PURE__*/ (0, Z.jsx)(Xv, B({
		as: i,
		className: W(s.root, r),
		ownerState: o,
		ref: t
	}, a));
});
bs(), _s();
function Qv(e) {
	return ms("MuiCircularProgress", e);
}
vs("MuiCircularProgress", [
	"root",
	"determinate",
	"indeterminate",
	"colorPrimary",
	"colorSecondary",
	"svg",
	"circle",
	"circleDeterminate",
	"circleIndeterminate",
	"circleDisableShrink"
]), U(), V(), Ms(), cs(), Pu(), ec(), K(), xm();
var $v = [
	"className",
	"color",
	"disableShrink",
	"size",
	"style",
	"thickness",
	"value",
	"variant"
], ey = (e) => e, ty, ny, ry, iy, ay = 44, oy = Au(ty || (ty = ey`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`)), sy = Au(ny || (ny = ey`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -125px;
  }
`)), cy = (e) => {
	let { classes: t, variant: n, color: r, disableShrink: i } = e;
	return os({
		root: [
			"root",
			n,
			`color${G(r)}`
		],
		svg: ["svg"],
		circle: [
			"circle",
			`circle${G(n)}`,
			i && "circleDisableShrink"
		]
	}, Qv, t);
}, ly = Y("span", {
	name: "MuiCircularProgress",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[n.variant],
			t[`color${G(n.color)}`]
		];
	}
})(({ ownerState: e, theme: t }) => B({ display: "inline-block" }, e.variant === "determinate" && { transition: t.transitions.create("transform") }, e.color !== "inherit" && { color: (t.vars || t).palette[e.color].main }), ({ ownerState: e }) => e.variant === "indeterminate" && ku(ry || (ry = ey`
      animation: ${0} 1.4s linear infinite;
    `), oy)), uy = Y("svg", {
	name: "MuiCircularProgress",
	slot: "Svg",
	overridesResolver: (e, t) => t.svg
})({ display: "block" }), dy = Y("circle", {
	name: "MuiCircularProgress",
	slot: "Circle",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.circle,
			t[`circle${G(n.variant)}`],
			n.disableShrink && t.circleDisableShrink
		];
	}
})(({ ownerState: e, theme: t }) => B({ stroke: "currentColor" }, e.variant === "determinate" && { transition: t.transitions.create("stroke-dashoffset") }, e.variant === "indeterminate" && {
	strokeDasharray: "80px, 200px",
	strokeDashoffset: 0
}), ({ ownerState: e }) => e.variant === "indeterminate" && !e.disableShrink && ku(iy || (iy = ey`
      animation: ${0} 1.4s ease-in-out infinite;
    `), sy)), fy = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiCircularProgress"
	}), { className: r, color: i = "primary", disableShrink: a = !1, size: o = 40, style: s, thickness: c = 3.6, value: l = 0, variant: u = "indeterminate" } = n, d = H(n, $v), f = B({}, n, {
		color: i,
		disableShrink: a,
		size: o,
		thickness: c,
		value: l,
		variant: u
	}), p = cy(f), m = {}, h = {}, g = {};
	if (u === "determinate") {
		let e = 2 * Math.PI * ((ay - c) / 2);
		m.strokeDasharray = e.toFixed(3), g["aria-valuenow"] = Math.round(l), m.strokeDashoffset = `${((100 - l) / 100 * e).toFixed(3)}px`, h.transform = "rotate(-90deg)";
	}
	return /*#__PURE__*/ (0, Z.jsx)(ly, B({
		className: W(p.root, r),
		style: B({
			width: o,
			height: o
		}, h, s),
		ownerState: f,
		ref: t,
		role: "progressbar"
	}, g, d, { children: /*#__PURE__*/ (0, Z.jsx)(uy, {
		className: p.svg,
		ownerState: f,
		viewBox: `${ay / 2} ${ay / 2} ${ay} ${ay}`,
		children: /*#__PURE__*/ (0, Z.jsx)(dy, {
			className: p.circle,
			style: m,
			ownerState: f,
			cx: ay,
			cy: ay,
			r: (ay - c) / 2,
			fill: "none",
			strokeWidth: c
		})
	}) }));
});
//#endregion
//#region node_modules/@mui/material/Modal/ModalManager.js
$s();
function py(e) {
	let t = Ba(e);
	return t.body === e ? Ua(e).innerWidth > t.documentElement.clientWidth : e.scrollHeight > e.clientHeight;
}
function my(e, t) {
	t ? e.setAttribute("aria-hidden", "true") : e.removeAttribute("aria-hidden");
}
function hy(e) {
	return parseInt(Ua(e).getComputedStyle(e).paddingRight, 10) || 0;
}
function gy(e) {
	let t = [
		"TEMPLATE",
		"SCRIPT",
		"STYLE",
		"LINK",
		"MAP",
		"META",
		"NOSCRIPT",
		"PICTURE",
		"COL",
		"COLGROUP",
		"PARAM",
		"SLOT",
		"SOURCE",
		"TRACK"
	].indexOf(e.tagName) !== -1, n = e.tagName === "INPUT" && e.getAttribute("type") === "hidden";
	return t || n;
}
function _y(e, t, n, r, i) {
	let a = [
		t,
		n,
		...r
	];
	[].forEach.call(e.children, (e) => {
		let t = a.indexOf(e) === -1, n = !gy(e);
		t && n && my(e, i);
	});
}
function vy(e, t) {
	let n = -1;
	return e.some((e, r) => t(e) ? (n = r, !0) : !1), n;
}
function yy(e, t) {
	let n = [], r = e.container;
	if (!t.disableScrollLock) {
		if (py(r)) {
			let e = Zo(Ba(r));
			n.push({
				value: r.style.paddingRight,
				property: "padding-right",
				el: r
			}), r.style.paddingRight = `${hy(r) + e}px`;
			let t = Ba(r).querySelectorAll(".mui-fixed");
			[].forEach.call(t, (t) => {
				n.push({
					value: t.style.paddingRight,
					property: "padding-right",
					el: t
				}), t.style.paddingRight = `${hy(t) + e}px`;
			});
		}
		let e;
		if (r.parentNode instanceof DocumentFragment) e = Ba(r).body;
		else {
			let t = r.parentElement, n = Ua(r);
			e = (t == null ? void 0 : t.nodeName) === "HTML" && n.getComputedStyle(t).overflowY === "scroll" ? t : r;
		}
		n.push({
			value: e.style.overflow,
			property: "overflow",
			el: e
		}, {
			value: e.style.overflowX,
			property: "overflow-x",
			el: e
		}, {
			value: e.style.overflowY,
			property: "overflow-y",
			el: e
		}), e.style.overflow = "hidden";
	}
	return () => {
		n.forEach(({ value: e, el: t, property: n }) => {
			e ? t.style.setProperty(n, e) : t.style.removeProperty(n);
		});
	};
}
function by(e) {
	let t = [];
	return [].forEach.call(e.children, (e) => {
		e.getAttribute("aria-hidden") === "true" && t.push(e);
	}), t;
}
var xy = class {
	constructor() {
		this.containers = void 0, this.modals = void 0, this.modals = [], this.containers = [];
	}
	add(e, t) {
		let n = this.modals.indexOf(e);
		if (n !== -1) return n;
		n = this.modals.length, this.modals.push(e), e.modalRef && my(e.modalRef, !1);
		let r = by(t);
		_y(t, e.mount, e.modalRef, r, !0);
		let i = vy(this.containers, (e) => e.container === t);
		return i === -1 ? (this.containers.push({
			modals: [e],
			container: t,
			restore: null,
			hiddenSiblings: r
		}), n) : (this.containers[i].modals.push(e), n);
	}
	mount(e, t) {
		let n = vy(this.containers, (t) => t.modals.indexOf(e) !== -1), r = this.containers[n];
		r.restore || (r.restore = yy(r, t));
	}
	remove(e, t = !0) {
		let n = this.modals.indexOf(e);
		if (n === -1) return n;
		let r = vy(this.containers, (t) => t.modals.indexOf(e) !== -1), i = this.containers[r];
		if (i.modals.splice(i.modals.indexOf(e), 1), this.modals.splice(n, 1), i.modals.length === 0) i.restore && i.restore(), e.modalRef && my(e.modalRef, t), _y(i.container, e.mount, e.modalRef, i.hiddenSiblings, !1), this.containers.splice(r, 1);
		else {
			let e = i.modals[i.modals.length - 1];
			e.modalRef && my(e.modalRef, !1);
		}
		return n;
	}
	isTopModal(e) {
		return this.modals.length > 0 && this.modals[this.modals.length - 1] === e;
	}
};
//#endregion
//#region node_modules/@mui/material/Unstable_TrapFocus/FocusTrap.js
$s();
var Sy = [
	"input",
	"select",
	"textarea",
	"a[href]",
	"button",
	"[tabindex]",
	"audio[controls]",
	"video[controls]",
	"[contenteditable]:not([contenteditable=\"false\"])"
].join(",");
function Cy(e) {
	let t = parseInt(e.getAttribute("tabindex") || "", 10);
	return Number.isNaN(t) ? e.contentEditable === "true" || (e.nodeName === "AUDIO" || e.nodeName === "VIDEO" || e.nodeName === "DETAILS") && e.getAttribute("tabindex") === null ? 0 : e.tabIndex : t;
}
function wy(e) {
	if (e.tagName !== "INPUT" || e.type !== "radio" || !e.name) return !1;
	let t = (t) => e.ownerDocument.querySelector(`input[type="radio"]${t}`), n = t(`[name="${e.name}"]:checked`);
	return n || (n = t(`[name="${e.name}"]`)), n !== e;
}
function Ty(e) {
	return !(e.disabled || e.tagName === "INPUT" && e.type === "hidden" || wy(e));
}
function Ey(e) {
	let t = [], n = [];
	return Array.from(e.querySelectorAll(Sy)).forEach((e, r) => {
		let i = Cy(e);
		i !== -1 && Ty(e) && (i === 0 ? t.push(e) : n.push({
			documentOrder: r,
			tabIndex: i,
			node: e
		}));
	}), n.sort((e, t) => e.tabIndex === t.tabIndex ? e.documentOrder - t.documentOrder : e.tabIndex - t.tabIndex).map((e) => e.node).concat(t);
}
function Dy() {
	return !0;
}
function Oy(e) {
	let { children: t, disableAutoFocus: n = !1, disableEnforceFocus: r = !1, disableRestoreFocus: i = !1, getTabbable: a = Ey, isEnabled: o = Dy, open: s } = e, c = X.useRef(!1), l = X.useRef(null), u = X.useRef(null), d = X.useRef(null), f = X.useRef(null), p = X.useRef(!1), m = X.useRef(null), h = xo(Ys(t), m), g = X.useRef(null);
	X.useEffect(() => {
		s && m.current && (p.current = !n);
	}, [n, s]), X.useEffect(() => {
		if (!s || !m.current) return;
		let e = Ba(m.current);
		return m.current.contains(e.activeElement) || (m.current.hasAttribute("tabIndex") || m.current.setAttribute("tabIndex", "-1"), p.current && m.current.focus()), () => {
			i || (d.current && d.current.focus && (c.current = !0, d.current.focus()), d.current = null);
		};
	}, [s]), X.useEffect(() => {
		if (!s || !m.current) return;
		let e = Ba(m.current), t = (t) => {
			g.current = t, !r && o() && t.key === "Tab" && e.activeElement === m.current && t.shiftKey && (c.current = !0, u.current && u.current.focus());
		}, n = () => {
			let t = m.current;
			if (t === null) return;
			if (!e.hasFocus() || !o() || c.current) {
				c.current = !1;
				return;
			}
			if (t.contains(e.activeElement) || r && e.activeElement !== l.current && e.activeElement !== u.current) return;
			if (e.activeElement !== f.current) f.current = null;
			else if (f.current !== null) return;
			if (!p.current) return;
			let n = [];
			if ((e.activeElement === l.current || e.activeElement === u.current) && (n = a(m.current)), n.length > 0) {
				var i, s;
				let e = !!((i = g.current) != null && i.shiftKey && ((s = g.current) == null ? void 0 : s.key) === "Tab"), t = n[0], r = n[n.length - 1];
				typeof t != "string" && typeof r != "string" && (e ? r.focus() : t.focus());
			} else t.focus();
		};
		e.addEventListener("focusin", n), e.addEventListener("keydown", t, !0);
		let i = setInterval(() => {
			e.activeElement && e.activeElement.tagName === "BODY" && n();
		}, 50);
		return () => {
			clearInterval(i), e.removeEventListener("focusin", n), e.removeEventListener("keydown", t, !0);
		};
	}, [
		n,
		r,
		i,
		o,
		s,
		a
	]);
	let _ = (e) => {
		d.current === null && (d.current = e.relatedTarget), p.current = !0, f.current = e.target;
		let n = t.props.onFocus;
		n && n(e);
	}, v = (e) => {
		d.current === null && (d.current = e.relatedTarget), p.current = !0;
	};
	return /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [
		/*#__PURE__*/ (0, Z.jsx)("div", {
			tabIndex: s ? 0 : -1,
			onFocus: v,
			ref: l,
			"data-testid": "sentinelStart"
		}),
		/*#__PURE__*/ X.cloneElement(t, {
			ref: h,
			onFocus: _
		}),
		/*#__PURE__*/ (0, Z.jsx)("div", {
			tabIndex: s ? 0 : -1,
			onFocus: v,
			ref: u,
			"data-testid": "sentinelEnd"
		})
	] });
}
V(), $s(), Fs();
function ky(e) {
	return typeof e == "function" ? e() : e;
}
function Ay(e) {
	return e ? e.props.hasOwnProperty("in") : !1;
}
var jy = new xy();
function My(e) {
	let { container: t, disableEscapeKeyDown: n = !1, disableScrollLock: r = !1, manager: i = jy, closeAfterTransition: a = !1, onTransitionEnter: o, onTransitionExited: s, children: c, onClose: l, open: u, rootRef: d } = e, f = X.useRef({}), p = X.useRef(null), m = X.useRef(null), h = xo(m, d), [g, _] = X.useState(!u), v = Ay(c), y = !0;
	(e["aria-hidden"] === "false" || e["aria-hidden"] === !1) && (y = !1);
	let b = () => Ba(p.current), x = () => (f.current.modalRef = m.current, f.current.mount = p.current, f.current), S = () => {
		i.mount(x(), { disableScrollLock: r }), m.current && (m.current.scrollTop = 0);
	}, C = _o(() => {
		let e = ky(t) || b().body;
		i.add(x(), e), m.current && S();
	}), w = X.useCallback(() => i.isTopModal(x()), [i]), T = _o((e) => {
		p.current = e, e && (u && w() ? S() : m.current && my(m.current, y));
	}), E = X.useCallback(() => {
		i.remove(x(), y);
	}, [y, i]);
	X.useEffect(() => () => {
		E();
	}, [E]), X.useEffect(() => {
		u ? C() : (!v || !a) && E();
	}, [
		u,
		E,
		v,
		a,
		C
	]);
	let D = (e) => (t) => {
		var r;
		(r = e.onKeyDown) == null || r.call(e, t), t.key === "Escape" && t.which !== 229 && w() && (n || (t.stopPropagation(), l && l(t, "escapeKeyDown")));
	}, O = (e) => (t) => {
		var n;
		(n = e.onClick) == null || n.call(e, t), t.target === t.currentTarget && l && l(t, "backdropClick");
	};
	return {
		getRootProps: (t = {}) => {
			let n = Ns(e);
			delete n.onTransitionEnter, delete n.onTransitionExited;
			let r = B({}, n, t);
			return B({ role: "presentation" }, r, {
				onKeyDown: D(r),
				ref: h
			});
		},
		getBackdropProps: (e = {}) => {
			let t = e;
			return B({ "aria-hidden": !0 }, t, {
				onClick: O(t),
				open: u
			});
		},
		getTransitionProps: () => ({
			onEnter: Da(() => {
				_(!1), o && o();
			}, c == null ? void 0 : c.props.onEnter),
			onExited: Da(() => {
				_(!0), s && s(), a && E();
			}, c == null ? void 0 : c.props.onExited)
		}),
		rootRef: h,
		portalRef: T,
		isTopModal: w,
		exited: g,
		hasTransition: v
	};
}
bs(), _s();
function Ny(e) {
	return ms("MuiModal", e);
}
vs("MuiModal", [
	"root",
	"hidden",
	"backdrop"
]), U(), V(), Ms(), cs(), Js(), xm(), K();
var Py = /* @__PURE__ */ "BackdropComponent.BackdropProps.classes.className.closeAfterTransition.children.container.component.components.componentsProps.disableAutoFocus.disableEnforceFocus.disableEscapeKeyDown.disablePortal.disableRestoreFocus.disableScrollLock.hideBackdrop.keepMounted.onBackdropClick.onClose.onTransitionEnter.onTransitionExited.open.slotProps.slots.theme".split("."), Fy = (e) => {
	let { open: t, exited: n, classes: r } = e;
	return os({
		root: ["root", !t && n && "hidden"],
		backdrop: ["backdrop"]
	}, Ny, r);
}, Iy = Y("div", {
	name: "MuiModal",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.root, !n.open && n.exited && t.hidden];
	}
})(({ theme: e, ownerState: t }) => B({
	position: "fixed",
	zIndex: (e.vars || e).zIndex.modal,
	right: 0,
	bottom: 0,
	top: 0,
	left: 0
}, !t.open && t.exited && { visibility: "hidden" })), Ly = Y(xv, {
	name: "MuiModal",
	slot: "Backdrop",
	overridesResolver: (e, t) => t.backdrop
})({ zIndex: -1 }), Ry = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i, a, o, s;
	let c = pc({
		name: "MuiModal",
		props: e
	}), { BackdropComponent: l = Ly, BackdropProps: u, className: d, closeAfterTransition: f = !1, children: p, container: m, component: h, components: g = {}, componentsProps: _ = {}, disableAutoFocus: v = !1, disableEnforceFocus: y = !1, disableEscapeKeyDown: b = !1, disablePortal: x = !1, disableRestoreFocus: S = !1, disableScrollLock: C = !1, hideBackdrop: w = !1, keepMounted: T = !1, onBackdropClick: E, open: D, slotProps: O, slots: k } = c, A = H(c, Py), j = B({}, c, {
		closeAfterTransition: f,
		disableAutoFocus: v,
		disableEnforceFocus: y,
		disableEscapeKeyDown: b,
		disablePortal: x,
		disableRestoreFocus: S,
		disableScrollLock: C,
		hideBackdrop: w,
		keepMounted: T
	}), { getRootProps: M, getBackdropProps: N, getTransitionProps: P, portalRef: ee, isTopModal: te, exited: F, hasTransition: ne } = My(B({}, j, { rootRef: t })), I = B({}, j, { exited: F }), L = Fy(I), re = {};
	if (p.props.tabIndex === void 0 && (re.tabIndex = "-1"), ne) {
		let { onEnter: e, onExited: t } = P();
		re.onEnter = e, re.onExited = t;
	}
	let ie = (n = (r = k == null ? void 0 : k.root) == null ? g.Root : r) == null ? Iy : n, ae = (i = (a = k == null ? void 0 : k.backdrop) == null ? g.Backdrop : a) == null ? l : i, oe = (o = O == null ? void 0 : O.root) == null ? _.root : o, se = (s = O == null ? void 0 : O.backdrop) == null ? _.backdrop : s, ce = Gs({
		elementType: ie,
		externalSlotProps: oe,
		externalForwardedProps: A,
		getSlotProps: M,
		additionalProps: {
			ref: t,
			as: h
		},
		ownerState: I,
		className: W(d, oe == null ? void 0 : oe.className, L == null ? void 0 : L.root, !I.open && I.exited && (L == null ? void 0 : L.hidden))
	}), le = Gs({
		elementType: ae,
		externalSlotProps: se,
		additionalProps: u,
		getSlotProps: (e) => N(B({}, e, { onClick: (t) => {
			E && E(t), e != null && e.onClick && e.onClick(t);
		} })),
		className: W(se == null ? void 0 : se.className, u == null ? void 0 : u.className, L == null ? void 0 : L.backdrop),
		ownerState: I
	});
	return !T && !D && (!ne || F) ? null : /*#__PURE__*/ (0, Z.jsx)(O_, {
		ref: ee,
		container: m,
		disablePortal: x,
		children: /*#__PURE__*/ (0, Z.jsxs)(ie, B({}, ce, { children: [!w && l ? /*#__PURE__*/ (0, Z.jsx)(ae, B({}, le)) : null, /*#__PURE__*/ (0, Z.jsx)(Oy, {
			disableEnforceFocus: y,
			disableAutoFocus: v,
			disableRestoreFocus: S,
			isEnabled: te,
			open: D,
			children: /*#__PURE__*/ X.cloneElement(p, re)
		})] }))
	});
});
bs(), _s();
function zy(e) {
	return ms("MuiDivider", e);
}
vs("MuiDivider", [
	"root",
	"absolute",
	"fullWidth",
	"inset",
	"middle",
	"flexItem",
	"light",
	"vertical",
	"withChildren",
	"withChildrenVertical",
	"textAlignRight",
	"textAlignLeft",
	"wrapper",
	"wrapperVertical"
]), U(), V(), Ms(), cs(), xm(), K();
var By = [
	"absolute",
	"children",
	"className",
	"component",
	"flexItem",
	"light",
	"orientation",
	"role",
	"textAlign",
	"variant"
], Vy = (e) => {
	let { absolute: t, children: n, classes: r, flexItem: i, light: a, orientation: o, textAlign: s, variant: c } = e;
	return os({
		root: [
			"root",
			t && "absolute",
			c,
			a && "light",
			o === "vertical" && "vertical",
			i && "flexItem",
			n && "withChildren",
			n && o === "vertical" && "withChildrenVertical",
			s === "right" && o !== "vertical" && "textAlignRight",
			s === "left" && o !== "vertical" && "textAlignLeft"
		],
		wrapper: ["wrapper", o === "vertical" && "wrapperVertical"]
	}, zy, r);
}, Hy = Y("div", {
	name: "MuiDivider",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.absolute && t.absolute,
			t[n.variant],
			n.light && t.light,
			n.orientation === "vertical" && t.vertical,
			n.flexItem && t.flexItem,
			n.children && t.withChildren,
			n.children && n.orientation === "vertical" && t.withChildrenVertical,
			n.textAlign === "right" && n.orientation !== "vertical" && t.textAlignRight,
			n.textAlign === "left" && n.orientation !== "vertical" && t.textAlignLeft
		];
	}
})(({ theme: e, ownerState: t }) => B({
	margin: 0,
	flexShrink: 0,
	borderWidth: 0,
	borderStyle: "solid",
	borderColor: (e.vars || e).palette.divider,
	borderBottomWidth: "thin"
}, t.absolute && {
	position: "absolute",
	bottom: 0,
	left: 0,
	width: "100%"
}, t.light && { borderColor: e.vars ? `rgba(${e.vars.palette.dividerChannel} / 0.08)` : (0, Hg.alpha)(e.palette.divider, .08) }, t.variant === "inset" && { marginLeft: 72 }, t.variant === "middle" && t.orientation === "horizontal" && {
	marginLeft: e.spacing(2),
	marginRight: e.spacing(2)
}, t.variant === "middle" && t.orientation === "vertical" && {
	marginTop: e.spacing(1),
	marginBottom: e.spacing(1)
}, t.orientation === "vertical" && {
	height: "100%",
	borderBottomWidth: 0,
	borderRightWidth: "thin"
}, t.flexItem && {
	alignSelf: "stretch",
	height: "auto"
}), ({ ownerState: e }) => B({}, e.children && {
	display: "flex",
	whiteSpace: "nowrap",
	textAlign: "center",
	border: 0,
	borderTopStyle: "solid",
	borderLeftStyle: "solid",
	"&::before, &::after": {
		content: "\"\"",
		alignSelf: "center"
	}
}), ({ theme: e, ownerState: t }) => B({}, t.children && t.orientation !== "vertical" && { "&::before, &::after": {
	width: "100%",
	borderTop: `thin solid ${(e.vars || e).palette.divider}`,
	borderTopStyle: "inherit"
} }), ({ theme: e, ownerState: t }) => B({}, t.children && t.orientation === "vertical" && {
	flexDirection: "column",
	"&::before, &::after": {
		height: "100%",
		borderLeft: `thin solid ${(e.vars || e).palette.divider}`,
		borderLeftStyle: "inherit"
	}
}), ({ ownerState: e }) => B({}, e.textAlign === "right" && e.orientation !== "vertical" && {
	"&::before": { width: "90%" },
	"&::after": { width: "10%" }
}, e.textAlign === "left" && e.orientation !== "vertical" && {
	"&::before": { width: "10%" },
	"&::after": { width: "90%" }
})), Uy = Y("span", {
	name: "MuiDivider",
	slot: "Wrapper",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.wrapper, n.orientation === "vertical" && t.wrapperVertical];
	}
})(({ theme: e, ownerState: t }) => B({
	display: "inline-block",
	paddingLeft: `calc(${e.spacing(1)} * 1.2)`,
	paddingRight: `calc(${e.spacing(1)} * 1.2)`
}, t.orientation === "vertical" && {
	paddingTop: `calc(${e.spacing(1)} * 1.2)`,
	paddingBottom: `calc(${e.spacing(1)} * 1.2)`
})), Wy = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiDivider"
	}), { absolute: r = !1, children: i, className: a, component: o = i ? "div" : "hr", flexItem: s = !1, light: c = !1, orientation: l = "horizontal", role: u = o === "hr" ? void 0 : "separator", textAlign: d = "center", variant: f = "fullWidth" } = n, p = H(n, By), m = B({}, n, {
		absolute: r,
		component: o,
		flexItem: s,
		light: c,
		orientation: l,
		role: u,
		textAlign: d,
		variant: f
	}), h = Vy(m);
	return /*#__PURE__*/ (0, Z.jsx)(Hy, B({
		as: o,
		className: W(h.root, a),
		role: u,
		ref: t,
		ownerState: m
	}, p, { children: i ? /*#__PURE__*/ (0, Z.jsx)(Uy, {
		className: h.wrapper,
		ownerState: m,
		children: i
	}) : null }));
});
Wy.muiSkipListHighlight = !0, U(), V(), sa(), cs(), xm(), K();
var Gy = [
	"disableUnderline",
	"components",
	"componentsProps",
	"fullWidth",
	"hiddenLabel",
	"inputComponent",
	"multiline",
	"slotProps",
	"slots",
	"type"
], Ky = (e) => {
	let { classes: t, disableUnderline: n } = e, r = os({
		root: ["root", !n && "underline"],
		input: ["input"]
	}, dv, t);
	return B({}, t, r);
}, qy = Y(rv, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiFilledInput",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [...ev(e, t), !n.disableUnderline && t.underline];
	}
})(({ theme: e, ownerState: t }) => {
	var n;
	let r = e.palette.mode === "light", i = r ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)", a = r ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.09)", o = r ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.13)", s = r ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
	return B({
		position: "relative",
		backgroundColor: e.vars ? e.vars.palette.FilledInput.bg : a,
		borderTopLeftRadius: (e.vars || e).shape.borderRadius,
		borderTopRightRadius: (e.vars || e).shape.borderRadius,
		transition: e.transitions.create("background-color", {
			duration: e.transitions.duration.shorter,
			easing: e.transitions.easing.easeOut
		}),
		"&:hover": {
			backgroundColor: e.vars ? e.vars.palette.FilledInput.hoverBg : o,
			"@media (hover: none)": { backgroundColor: e.vars ? e.vars.palette.FilledInput.bg : a }
		},
		[`&.${fv.focused}`]: { backgroundColor: e.vars ? e.vars.palette.FilledInput.bg : a },
		[`&.${fv.disabled}`]: { backgroundColor: e.vars ? e.vars.palette.FilledInput.disabledBg : s }
	}, !t.disableUnderline && {
		"&::after": {
			borderBottom: `2px solid ${(n = (e.vars || e).palette[t.color || "primary"]) == null ? void 0 : n.main}`,
			left: 0,
			bottom: 0,
			content: "\"\"",
			position: "absolute",
			right: 0,
			transform: "scaleX(0)",
			transition: e.transitions.create("transform", {
				duration: e.transitions.duration.shorter,
				easing: e.transitions.easing.easeOut
			}),
			pointerEvents: "none"
		},
		[`&.${fv.focused}:after`]: { transform: "scaleX(1) translateX(0)" },
		[`&.${fv.error}`]: { "&::before, &::after": { borderBottomColor: (e.vars || e).palette.error.main } },
		"&::before": {
			borderBottom: `1px solid ${e.vars ? `rgba(${e.vars.palette.common.onBackgroundChannel} / ${e.vars.opacity.inputUnderline})` : i}`,
			left: 0,
			bottom: 0,
			content: "\"\\00a0\"",
			position: "absolute",
			right: 0,
			transition: e.transitions.create("border-bottom-color", { duration: e.transitions.duration.shorter }),
			pointerEvents: "none"
		},
		[`&:hover:not(.${fv.disabled}, .${fv.error}):before`]: { borderBottom: `1px solid ${(e.vars || e).palette.text.primary}` },
		[`&.${fv.disabled}:before`]: { borderBottomStyle: "dotted" }
	}, t.startAdornment && { paddingLeft: 12 }, t.endAdornment && { paddingRight: 12 }, t.multiline && B({ padding: "25px 12px 8px" }, t.size === "small" && {
		paddingTop: 21,
		paddingBottom: 4
	}, t.hiddenLabel && {
		paddingTop: 16,
		paddingBottom: 17
	}, t.hiddenLabel && t.size === "small" && {
		paddingTop: 8,
		paddingBottom: 9
	}));
}), Jy = Y(iv, {
	name: "MuiFilledInput",
	slot: "Input",
	overridesResolver: tv
})(({ theme: e, ownerState: t }) => B({
	paddingTop: 25,
	paddingRight: 12,
	paddingBottom: 8,
	paddingLeft: 12
}, !e.vars && { "&:-webkit-autofill": {
	WebkitBoxShadow: e.palette.mode === "light" ? null : "0 0 0 100px #266798 inset",
	WebkitTextFillColor: e.palette.mode === "light" ? null : "#fff",
	caretColor: e.palette.mode === "light" ? null : "#fff",
	borderTopLeftRadius: "inherit",
	borderTopRightRadius: "inherit"
} }, e.vars && {
	"&:-webkit-autofill": {
		borderTopLeftRadius: "inherit",
		borderTopRightRadius: "inherit"
	},
	[e.getColorSchemeSelector("dark")]: { "&:-webkit-autofill": {
		WebkitBoxShadow: "0 0 0 100px #266798 inset",
		WebkitTextFillColor: "#fff",
		caretColor: "#fff"
	} }
}, t.size === "small" && {
	paddingTop: 21,
	paddingBottom: 4
}, t.hiddenLabel && {
	paddingTop: 16,
	paddingBottom: 17
}, t.startAdornment && { paddingLeft: 0 }, t.endAdornment && { paddingRight: 0 }, t.hiddenLabel && t.size === "small" && {
	paddingTop: 8,
	paddingBottom: 9
}, t.multiline && {
	paddingTop: 0,
	paddingBottom: 0,
	paddingLeft: 0,
	paddingRight: 0
})), Yy = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i, a;
	let o = pc({
		props: e,
		name: "MuiFilledInput"
	}), { components: s = {}, componentsProps: c, fullWidth: l = !1, inputComponent: u = "input", multiline: d = !1, slotProps: f, slots: p = {}, type: m = "text" } = o, h = H(o, Gy), g = B({}, o, {
		fullWidth: l,
		inputComponent: u,
		multiline: d,
		type: m
	}), _ = Ky(o), v = {
		root: { ownerState: g },
		input: { ownerState: g }
	}, y = (f == null ? c : f) ? ra(v, f == null ? c : f) : v, b = (n = (r = p.root) == null ? s.Root : r) == null ? qy : n, x = (i = (a = p.input) == null ? s.Input : a) == null ? Jy : i;
	return /*#__PURE__*/ (0, Z.jsx)(ov, B({
		slots: {
			root: b,
			input: x
		},
		componentsProps: y,
		fullWidth: l,
		inputComponent: u,
		multiline: d,
		ref: t,
		type: m
	}, h, { classes: _ }));
});
Yy.muiName = "Input", bs(), _s();
function Xy(e) {
	return ms("MuiFormControl", e);
}
vs("MuiFormControl", [
	"root",
	"marginNone",
	"marginNormal",
	"marginDense",
	"fullWidth",
	"disabled"
]), U(), V(), Ms(), cs(), K(), xm(), ec(), Hm();
var Zy = [
	"children",
	"className",
	"color",
	"component",
	"disabled",
	"error",
	"focused",
	"fullWidth",
	"hiddenLabel",
	"margin",
	"required",
	"size",
	"variant"
], Qy = (e) => {
	let { classes: t, margin: n, fullWidth: r } = e;
	return os({ root: [
		"root",
		n !== "none" && `margin${G(n)}`,
		r && "fullWidth"
	] }, Xy, t);
}, $y = Y("div", {
	name: "MuiFormControl",
	slot: "Root",
	overridesResolver: ({ ownerState: e }, t) => B({}, t.root, t[`margin${G(e.margin)}`], e.fullWidth && t.fullWidth)
})(({ ownerState: e }) => B({
	display: "inline-flex",
	flexDirection: "column",
	position: "relative",
	minWidth: 0,
	padding: 0,
	margin: 0,
	border: 0,
	verticalAlign: "top"
}, e.margin === "normal" && {
	marginTop: 16,
	marginBottom: 8
}, e.margin === "dense" && {
	marginTop: 8,
	marginBottom: 4
}, e.fullWidth && { width: "100%" })), eb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiFormControl"
	}), { children: r, className: i, color: a = "primary", component: o = "div", disabled: s = !1, error: c = !1, focused: l, fullWidth: u = !1, hiddenLabel: d = !1, margin: f = "none", required: p = !1, size: m = "medium", variant: h = "outlined" } = n, g = H(n, Zy), _ = B({}, n, {
		color: a,
		component: o,
		disabled: s,
		error: c,
		fullWidth: u,
		hiddenLabel: d,
		margin: f,
		required: p,
		size: m,
		variant: h
	}), v = Qy(_), [y, b] = X.useState(() => {
		let e = !1;
		return r && X.Children.forEach(r, (t) => {
			if (!Vm(t, ["Input", "Select"])) return;
			let n = Vm(t, ["Select"]) ? t.props.input : t;
			n && X_(n.props) && (e = !0);
		}), e;
	}), [x, S] = X.useState(() => {
		let e = !1;
		return r && X.Children.forEach(r, (t) => {
			Vm(t, ["Input", "Select"]) && (Y_(t.props, !0) || Y_(t.props.inputProps, !0)) && (e = !0);
		}), e;
	}), [C, w] = X.useState(!1);
	s && C && w(!1);
	let T = l !== void 0 && !s ? l : C, E, D = X.useMemo(() => ({
		adornedStart: y,
		setAdornedStart: b,
		color: a,
		disabled: s,
		error: c,
		filled: x,
		focused: T,
		fullWidth: u,
		hiddenLabel: d,
		size: m,
		onBlur: () => {
			w(!1);
		},
		onEmpty: () => {
			S(!1);
		},
		onFilled: () => {
			S(!0);
		},
		onFocus: () => {
			w(!0);
		},
		registerEffect: E,
		required: p,
		variant: h
	}), [
		y,
		a,
		s,
		c,
		x,
		T,
		u,
		d,
		E,
		p,
		m,
		h
	]);
	return /*#__PURE__*/ (0, Z.jsx)(G_.Provider, {
		value: D,
		children: /*#__PURE__*/ (0, Z.jsx)($y, B({
			as: o,
			ownerState: _,
			className: W(v.root, i),
			ref: t
		}, g, { children: r }))
	});
});
bs(), _s();
function tb(e) {
	return ms("MuiFormHelperText", e);
}
var nb = vs("MuiFormHelperText", [
	"root",
	"error",
	"disabled",
	"sizeSmall",
	"sizeMedium",
	"contained",
	"focused",
	"filled",
	"required"
]);
U(), V(), Ms(), cs(), xm(), ec(), K();
var rb, ib = [
	"children",
	"className",
	"component",
	"disabled",
	"error",
	"filled",
	"focused",
	"margin",
	"required",
	"variant"
], ab = (e) => {
	let { classes: t, contained: n, size: r, disabled: i, error: a, filled: o, focused: s, required: c } = e;
	return os({ root: [
		"root",
		i && "disabled",
		a && "error",
		r && `size${G(r)}`,
		n && "contained",
		s && "focused",
		o && "filled",
		c && "required"
	] }, tb, t);
}, ob = Y("p", {
	name: "MuiFormHelperText",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.size && t[`size${G(n.size)}`],
			n.contained && t.contained,
			n.filled && t.filled
		];
	}
})(({ theme: e, ownerState: t }) => B({ color: (e.vars || e).palette.text.secondary }, e.typography.caption, {
	textAlign: "left",
	marginTop: 3,
	marginRight: 0,
	marginBottom: 0,
	marginLeft: 0,
	[`&.${nb.disabled}`]: { color: (e.vars || e).palette.text.disabled },
	[`&.${nb.error}`]: { color: (e.vars || e).palette.error.main }
}, t.size === "small" && { marginTop: 4 }, t.contained && {
	marginLeft: 14,
	marginRight: 14
})), sb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiFormHelperText"
	}), { children: r, className: i, component: a = "p" } = n, o = H(n, ib), s = W_({
		props: n,
		muiFormControl: K_(),
		states: [
			"variant",
			"size",
			"disabled",
			"error",
			"filled",
			"focused",
			"required"
		]
	}), c = B({}, n, {
		component: a,
		contained: s.variant === "filled" || s.variant === "outlined",
		variant: s.variant,
		size: s.size,
		disabled: s.disabled,
		error: s.error,
		filled: s.filled,
		focused: s.focused,
		required: s.required
	}), l = ab(c);
	return /*#__PURE__*/ (0, Z.jsx)(ob, B({
		as: a,
		ownerState: c,
		className: W(l.root, i),
		ref: t
	}, o, { children: r === " " ? rb || (rb = /*#__PURE__*/ (0, Z.jsx)("span", {
		className: "notranslate",
		children: "​"
	})) : r }));
});
bs(), _s();
function cb(e) {
	return ms("MuiFormLabel", e);
}
var lb = vs("MuiFormLabel", [
	"root",
	"colorSecondary",
	"focused",
	"disabled",
	"error",
	"filled",
	"required",
	"asterisk"
]);
U(), V(), Ms(), cs(), ec(), K(), xm();
var ub = [
	"children",
	"className",
	"color",
	"component",
	"disabled",
	"error",
	"filled",
	"focused",
	"required"
], db = (e) => {
	let { classes: t, color: n, focused: r, disabled: i, error: a, filled: o, required: s } = e;
	return os({
		root: [
			"root",
			`color${G(n)}`,
			i && "disabled",
			a && "error",
			o && "filled",
			r && "focused",
			s && "required"
		],
		asterisk: ["asterisk", a && "error"]
	}, cb, t);
}, fb = Y("label", {
	name: "MuiFormLabel",
	slot: "Root",
	overridesResolver: ({ ownerState: e }, t) => B({}, t.root, e.color === "secondary" && t.colorSecondary, e.filled && t.filled)
})(({ theme: e, ownerState: t }) => B({ color: (e.vars || e).palette.text.secondary }, e.typography.body1, {
	lineHeight: "1.4375em",
	padding: 0,
	position: "relative",
	[`&.${lb.focused}`]: { color: (e.vars || e).palette[t.color].main },
	[`&.${lb.disabled}`]: { color: (e.vars || e).palette.text.disabled },
	[`&.${lb.error}`]: { color: (e.vars || e).palette.error.main }
})), pb = Y("span", {
	name: "MuiFormLabel",
	slot: "Asterisk",
	overridesResolver: (e, t) => t.asterisk
})(({ theme: e }) => ({ [`&.${lb.error}`]: { color: (e.vars || e).palette.error.main } })), mb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiFormLabel"
	}), { children: r, className: i, component: a = "label" } = n, o = H(n, ub), s = W_({
		props: n,
		muiFormControl: K_(),
		states: [
			"color",
			"required",
			"focused",
			"disabled",
			"error",
			"filled"
		]
	}), c = B({}, n, {
		color: s.color || "primary",
		component: a,
		disabled: s.disabled,
		error: s.error,
		filled: s.filled,
		focused: s.focused,
		required: s.required
	}), l = db(c);
	return /*#__PURE__*/ (0, Z.jsxs)(fb, B({
		as: a,
		ownerState: c,
		className: W(l.root, i),
		ref: t
	}, o, { children: [r, s.required && /*#__PURE__*/ (0, Z.jsxs)(pb, {
		ownerState: c,
		"aria-hidden": !0,
		className: l.asterisk,
		children: [" ", "*"]
	})] }));
});
V(), U(), Io(), Zs(), ch();
var hb = [
	"addEndListener",
	"appear",
	"children",
	"easing",
	"in",
	"onEnter",
	"onEntered",
	"onEntering",
	"onExit",
	"onExited",
	"onExiting",
	"style",
	"timeout",
	"TransitionComponent"
];
function gb(e) {
	return `scale(${e}, ${e ** 2})`;
}
var _b = {
	entering: {
		opacity: 1,
		transform: gb(1)
	},
	entered: {
		opacity: 1,
		transform: "none"
	}
}, vb = typeof navigator < "u" && /^((?!chrome|android).)*(safari|mobile)/i.test(navigator.userAgent) && /(os |version\/)15(.|_)4/i.test(navigator.userAgent), yb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let { addEndListener: n, appear: r = !0, children: i, easing: a, in: o, onEnter: s, onEntered: c, onEntering: l, onExit: u, onExited: d, onExiting: f, style: p, timeout: m = "auto", TransitionComponent: h = Og } = e, g = H(e, hb), _ = No(), v = X.useRef(), y = lg(), b = X.useRef(null), x = sh(b, Ys(i), t), S = (e) => (t) => {
		if (e) {
			let n = b.current;
			t === void 0 ? e(n) : e(n, t);
		}
	}, C = S(l), w = S((e, t) => {
		zg(e);
		let { duration: n, delay: r, easing: i } = Bg({
			style: p,
			timeout: m,
			easing: a
		}, { mode: "enter" }), o;
		m === "auto" ? (o = y.transitions.getAutoHeightDuration(e.clientHeight), v.current = o) : o = n, e.style.transition = [y.transitions.create("opacity", {
			duration: o,
			delay: r
		}), y.transitions.create("transform", {
			duration: vb ? o : o * .666,
			delay: r,
			easing: i
		})].join(","), s && s(e, t);
	}), T = S(c), E = S(f), D = S((e) => {
		let { duration: t, delay: n, easing: r } = Bg({
			style: p,
			timeout: m,
			easing: a
		}, { mode: "exit" }), i;
		m === "auto" ? (i = y.transitions.getAutoHeightDuration(e.clientHeight), v.current = i) : i = t, e.style.transition = [y.transitions.create("opacity", {
			duration: i,
			delay: n
		}), y.transitions.create("transform", {
			duration: vb ? i : i * .666,
			delay: vb ? n : n || i * .333,
			easing: r
		})].join(","), e.style.opacity = 0, e.style.transform = gb(.75), u && u(e);
	}), O = S(d);
	return /*#__PURE__*/ (0, Z.jsx)(h, B({
		appear: r,
		in: o,
		nodeRef: b,
		onEnter: w,
		onEntered: T,
		onEntering: C,
		onExit: D,
		onExited: O,
		onExiting: E,
		addEndListener: (e) => {
			m === "auto" && _.start(v.current || 0, e), n && n(b.current, e);
		},
		timeout: m === "auto" ? null : m
	}, g, { children: (e, t) => /*#__PURE__*/ X.cloneElement(i, B({
		style: B({
			opacity: 0,
			transform: gb(.75),
			visibility: e === "exited" && !o ? "hidden" : void 0
		}, _b[e], p, i.props.style),
		ref: x
	}, t)) }));
});
yb.muiSupportAuto = !0, U(), V(), cs(), sa(), xm(), K();
var bb = [
	"disableUnderline",
	"components",
	"componentsProps",
	"fullWidth",
	"inputComponent",
	"multiline",
	"slotProps",
	"slots",
	"type"
], xb = (e) => {
	let { classes: t, disableUnderline: n } = e, r = os({
		root: ["root", !n && "underline"],
		input: ["input"]
	}, sv, t);
	return B({}, t, r);
}, Sb = Y(rv, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiInput",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [...ev(e, t), !n.disableUnderline && t.underline];
	}
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)";
	return e.vars && (n = `rgba(${e.vars.palette.common.onBackgroundChannel} / ${e.vars.opacity.inputUnderline})`), B({ position: "relative" }, t.formControl && { "label + &": { marginTop: 16 } }, !t.disableUnderline && {
		"&::after": {
			borderBottom: `2px solid ${(e.vars || e).palette[t.color].main}`,
			left: 0,
			bottom: 0,
			content: "\"\"",
			position: "absolute",
			right: 0,
			transform: "scaleX(0)",
			transition: e.transitions.create("transform", {
				duration: e.transitions.duration.shorter,
				easing: e.transitions.easing.easeOut
			}),
			pointerEvents: "none"
		},
		[`&.${cv.focused}:after`]: { transform: "scaleX(1) translateX(0)" },
		[`&.${cv.error}`]: { "&::before, &::after": { borderBottomColor: (e.vars || e).palette.error.main } },
		"&::before": {
			borderBottom: `1px solid ${n}`,
			left: 0,
			bottom: 0,
			content: "\"\\00a0\"",
			position: "absolute",
			right: 0,
			transition: e.transitions.create("border-bottom-color", { duration: e.transitions.duration.shorter }),
			pointerEvents: "none"
		},
		[`&:hover:not(.${cv.disabled}, .${cv.error}):before`]: {
			borderBottom: `2px solid ${(e.vars || e).palette.text.primary}`,
			"@media (hover: none)": { borderBottom: `1px solid ${n}` }
		},
		[`&.${cv.disabled}:before`]: { borderBottomStyle: "dotted" }
	});
}), Cb = Y(iv, {
	name: "MuiInput",
	slot: "Input",
	overridesResolver: tv
})({}), wb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i, a;
	let o = pc({
		props: e,
		name: "MuiInput"
	}), { disableUnderline: s, components: c = {}, componentsProps: l, fullWidth: u = !1, inputComponent: d = "input", multiline: f = !1, slotProps: p, slots: m = {}, type: h = "text" } = o, g = H(o, bb), _ = xb(o), v = { root: { ownerState: { disableUnderline: s } } }, y = (p == null ? l : p) ? ra(p == null ? l : p, v) : v, b = (n = (r = m.root) == null ? c.Root : r) == null ? Sb : n, x = (i = (a = m.input) == null ? c.Input : a) == null ? Cb : i;
	return /*#__PURE__*/ (0, Z.jsx)(ov, B({
		slots: {
			root: b,
			input: x
		},
		slotProps: y,
		fullWidth: u,
		inputComponent: d,
		multiline: f,
		ref: t,
		type: h
	}, g, { classes: _ }));
});
wb.muiName = "Input", bs(), _s();
function Tb(e) {
	return ms("MuiInputLabel", e);
}
vs("MuiInputLabel", [
	"root",
	"focused",
	"disabled",
	"error",
	"required",
	"asterisk",
	"formControl",
	"sizeSmall",
	"shrink",
	"animated",
	"standard",
	"filled",
	"outlined"
]), U(), V(), cs(), Ms(), K(), ec(), xm();
var Eb = [
	"disableAnimation",
	"margin",
	"shrink",
	"variant",
	"className"
], Db = (e) => {
	let { classes: t, formControl: n, size: r, shrink: i, disableAnimation: a, variant: o, required: s } = e, c = os({
		root: [
			"root",
			n && "formControl",
			!a && "animated",
			i && "shrink",
			r && r !== "normal" && `size${G(r)}`,
			o
		],
		asterisk: [s && "asterisk"]
	}, Tb, t);
	return B({}, t, c);
}, Ob = Y(mb, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiInputLabel",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`& .${lb.asterisk}`]: t.asterisk },
			t.root,
			n.formControl && t.formControl,
			n.size === "small" && t.sizeSmall,
			n.shrink && t.shrink,
			!n.disableAnimation && t.animated,
			n.focused && t.focused,
			t[n.variant]
		];
	}
})(({ theme: e, ownerState: t }) => B({
	display: "block",
	transformOrigin: "top left",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	maxWidth: "100%"
}, t.formControl && {
	position: "absolute",
	left: 0,
	top: 0,
	transform: "translate(0, 20px) scale(1)"
}, t.size === "small" && { transform: "translate(0, 17px) scale(1)" }, t.shrink && {
	transform: "translate(0, -1.5px) scale(0.75)",
	transformOrigin: "top left",
	maxWidth: "133%"
}, !t.disableAnimation && { transition: e.transitions.create([
	"color",
	"transform",
	"max-width"
], {
	duration: e.transitions.duration.shorter,
	easing: e.transitions.easing.easeOut
}) }, t.variant === "filled" && B({
	zIndex: 1,
	pointerEvents: "none",
	transform: "translate(12px, 16px) scale(1)",
	maxWidth: "calc(100% - 24px)"
}, t.size === "small" && { transform: "translate(12px, 13px) scale(1)" }, t.shrink && B({
	userSelect: "none",
	pointerEvents: "auto",
	transform: "translate(12px, 7px) scale(0.75)",
	maxWidth: "calc(133% - 24px)"
}, t.size === "small" && { transform: "translate(12px, 4px) scale(0.75)" })), t.variant === "outlined" && B({
	zIndex: 1,
	pointerEvents: "none",
	transform: "translate(14px, 16px) scale(1)",
	maxWidth: "calc(100% - 24px)"
}, t.size === "small" && { transform: "translate(14px, 9px) scale(1)" }, t.shrink && {
	userSelect: "none",
	pointerEvents: "auto",
	maxWidth: "calc(133% - 32px)",
	transform: "translate(14px, -9px) scale(0.75)"
}))), kb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		name: "MuiInputLabel",
		props: e
	}), { disableAnimation: r = !1, shrink: i, className: a } = n, o = H(n, Eb), s = K_(), c = i;
	c === void 0 && s && (c = s.filled || s.focused || s.adornedStart);
	let l = W_({
		props: n,
		muiFormControl: s,
		states: [
			"size",
			"variant",
			"required",
			"focused"
		]
	}), u = B({}, n, {
		disableAnimation: r,
		formControl: s,
		shrink: c,
		size: l.size,
		variant: l.variant,
		required: l.required,
		focused: l.focused
	}), d = Db(u);
	return /*#__PURE__*/ (0, Z.jsx)(Ob, B({
		"data-shrink": c,
		ownerState: u,
		ref: t,
		className: W(d.root, a)
	}, o, { classes: d }));
});
bs(), _s();
function Ab(e) {
	return ms("MuiLinearProgress", e);
}
vs("MuiLinearProgress", [
	"root",
	"colorPrimary",
	"colorSecondary",
	"determinate",
	"indeterminate",
	"buffer",
	"query",
	"dashed",
	"dashedColorPrimary",
	"dashedColorSecondary",
	"bar",
	"barColorPrimary",
	"barColorSecondary",
	"bar1Indeterminate",
	"bar1Determinate",
	"bar1Buffer",
	"bar2Indeterminate",
	"bar2Buffer"
]), U(), V(), Ms(), cs(), Pu(), ec(), xm(), K();
var jb = [
	"className",
	"color",
	"value",
	"valueBuffer",
	"variant"
], Mb = (e) => e, Nb, Pb, Fb, Ib, Lb, Rb, zb = 4, Bb = Au(Nb || (Nb = Mb`
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
`)), Vb = Au(Pb || (Pb = Mb`
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
`)), Hb = Au(Fb || (Fb = Mb`
  0% {
    opacity: 1;
    background-position: 0 -23px;
  }

  60% {
    opacity: 0;
    background-position: 0 -23px;
  }

  100% {
    opacity: 1;
    background-position: -200px -23px;
  }
`)), Ub = (e) => {
	let { classes: t, variant: n, color: r } = e;
	return os({
		root: [
			"root",
			`color${G(r)}`,
			n
		],
		dashed: ["dashed", `dashedColor${G(r)}`],
		bar1: [
			"bar",
			`barColor${G(r)}`,
			(n === "indeterminate" || n === "query") && "bar1Indeterminate",
			n === "determinate" && "bar1Determinate",
			n === "buffer" && "bar1Buffer"
		],
		bar2: [
			"bar",
			n !== "buffer" && `barColor${G(r)}`,
			n === "buffer" && `color${G(r)}`,
			(n === "indeterminate" || n === "query") && "bar2Indeterminate",
			n === "buffer" && "bar2Buffer"
		]
	}, Ab, t);
}, Wb = (e, t) => t === "inherit" ? "currentColor" : e.vars ? e.vars.palette.LinearProgress[`${t}Bg`] : e.palette.mode === "light" ? (0, Hg.lighten)(e.palette[t].main, .62) : (0, Hg.darken)(e.palette[t].main, .5), Gb = Y("span", {
	name: "MuiLinearProgress",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[`color${G(n.color)}`],
			t[n.variant]
		];
	}
})(({ ownerState: e, theme: t }) => B({
	position: "relative",
	overflow: "hidden",
	display: "block",
	height: 4,
	zIndex: 0,
	"@media print": { colorAdjust: "exact" },
	backgroundColor: Wb(t, e.color)
}, e.color === "inherit" && e.variant !== "buffer" && {
	backgroundColor: "none",
	"&::before": {
		content: "\"\"",
		position: "absolute",
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "currentColor",
		opacity: .3
	}
}, e.variant === "buffer" && { backgroundColor: "transparent" }, e.variant === "query" && { transform: "rotate(180deg)" })), Kb = Y("span", {
	name: "MuiLinearProgress",
	slot: "Dashed",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.dashed, t[`dashedColor${G(n.color)}`]];
	}
})(({ ownerState: e, theme: t }) => {
	let n = Wb(t, e.color);
	return B({
		position: "absolute",
		marginTop: 0,
		height: "100%",
		width: "100%"
	}, e.color === "inherit" && { opacity: .3 }, {
		backgroundImage: `radial-gradient(${n} 0%, ${n} 16%, transparent 42%)`,
		backgroundSize: "10px 10px",
		backgroundPosition: "0 -23px"
	});
}, ku(Ib || (Ib = Mb`
    animation: ${0} 3s infinite linear;
  `), Hb)), qb = Y("span", {
	name: "MuiLinearProgress",
	slot: "Bar1",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.bar,
			t[`barColor${G(n.color)}`],
			(n.variant === "indeterminate" || n.variant === "query") && t.bar1Indeterminate,
			n.variant === "determinate" && t.bar1Determinate,
			n.variant === "buffer" && t.bar1Buffer
		];
	}
})(({ ownerState: e, theme: t }) => B({
	width: "100%",
	position: "absolute",
	left: 0,
	bottom: 0,
	top: 0,
	transition: "transform 0.2s linear",
	transformOrigin: "left",
	backgroundColor: e.color === "inherit" ? "currentColor" : (t.vars || t).palette[e.color].main
}, e.variant === "determinate" && { transition: `transform .${zb}s linear` }, e.variant === "buffer" && {
	zIndex: 1,
	transition: `transform .${zb}s linear`
}), ({ ownerState: e }) => (e.variant === "indeterminate" || e.variant === "query") && ku(Lb || (Lb = Mb`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    `), Bb)), Jb = Y("span", {
	name: "MuiLinearProgress",
	slot: "Bar2",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.bar,
			t[`barColor${G(n.color)}`],
			(n.variant === "indeterminate" || n.variant === "query") && t.bar2Indeterminate,
			n.variant === "buffer" && t.bar2Buffer
		];
	}
})(({ ownerState: e, theme: t }) => B({
	width: "100%",
	position: "absolute",
	left: 0,
	bottom: 0,
	top: 0,
	transition: "transform 0.2s linear",
	transformOrigin: "left"
}, e.variant !== "buffer" && { backgroundColor: e.color === "inherit" ? "currentColor" : (t.vars || t).palette[e.color].main }, e.color === "inherit" && { opacity: .3 }, e.variant === "buffer" && {
	backgroundColor: Wb(t, e.color),
	transition: `transform .${zb}s linear`
}), ({ ownerState: e }) => (e.variant === "indeterminate" || e.variant === "query") && ku(Rb || (Rb = Mb`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
    `), Vb)), Yb = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiLinearProgress"
	}), { className: r, color: i = "primary", value: a, valueBuffer: o, variant: s = "indeterminate" } = n, c = H(n, jb), l = B({}, n, {
		color: i,
		variant: s
	}), u = Ub(l), d = Xh(), f = {}, p = {
		bar1: {},
		bar2: {}
	};
	if ((s === "determinate" || s === "buffer") && a !== void 0) {
		f["aria-valuenow"] = Math.round(a), f["aria-valuemin"] = 0, f["aria-valuemax"] = 100;
		let e = a - 100;
		d && (e = -e), p.bar1.transform = `translateX(${e}%)`;
	}
	if (s === "buffer" && o !== void 0) {
		let e = (o || 0) - 100;
		d && (e = -e), p.bar2.transform = `translateX(${e}%)`;
	}
	return /*#__PURE__*/ (0, Z.jsxs)(Gb, B({
		className: W(u.root, r),
		ownerState: l,
		role: "progressbar"
	}, f, { ref: t }, c, { children: [
		s === "buffer" ? /*#__PURE__*/ (0, Z.jsx)(Kb, {
			className: u.dashed,
			ownerState: l
		}) : null,
		/*#__PURE__*/ (0, Z.jsx)(qb, {
			className: u.bar1,
			ownerState: l,
			style: p.bar1
		}),
		s === "determinate" ? null : /*#__PURE__*/ (0, Z.jsx)(Jb, {
			className: u.bar2,
			ownerState: l,
			style: p.bar2
		})
	] }));
}), Xb = /*#__PURE__*/ X.createContext({});
bs(), _s();
function Zb(e) {
	return ms("MuiList", e);
}
vs("MuiList", [
	"root",
	"padding",
	"dense",
	"subheader"
]), U(), V(), Ms(), cs(), xm(), K();
var Qb = [
	"children",
	"className",
	"component",
	"dense",
	"disablePadding",
	"subheader"
], $b = (e) => {
	let { classes: t, disablePadding: n, dense: r, subheader: i } = e;
	return os({ root: [
		"root",
		!n && "padding",
		r && "dense",
		i && "subheader"
	] }, Zb, t);
}, ex = Y("ul", {
	name: "MuiList",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			!n.disablePadding && t.padding,
			n.dense && t.dense,
			n.subheader && t.subheader
		];
	}
})(({ ownerState: e }) => B({
	listStyle: "none",
	margin: 0,
	padding: 0,
	position: "relative"
}, !e.disablePadding && {
	paddingTop: 8,
	paddingBottom: 8
}, e.subheader && { paddingTop: 0 })), tx = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiList"
	}), { children: r, className: i, component: a = "ul", dense: o = !1, disablePadding: s = !1, subheader: c } = n, l = H(n, Qb), u = X.useMemo(() => ({ dense: o }), [o]), d = B({}, n, {
		component: a,
		dense: o,
		disablePadding: s
	}), f = $b(d);
	return /*#__PURE__*/ (0, Z.jsx)(Xb.Provider, {
		value: u,
		children: /*#__PURE__*/ (0, Z.jsxs)(ex, B({
			as: a,
			className: W(f.root, i),
			ref: t,
			ownerState: d
		}, l, { children: [c, r] }))
	});
});
//#endregion
//#region node_modules/@mui/material/utils/getScrollbarSize.js
$o();
var nx = Zo;
V(), U(), Wm(), ch(), Qm();
var rx = [
	"actions",
	"autoFocus",
	"autoFocusItem",
	"children",
	"className",
	"disabledItemsFocusable",
	"disableListWrap",
	"onKeyDown",
	"variant"
];
function ix(e, t, n) {
	return e === t ? e.firstChild : t && t.nextElementSibling ? t.nextElementSibling : n ? null : e.firstChild;
}
function ax(e, t, n) {
	return e === t ? n ? e.firstChild : e.lastChild : t && t.previousElementSibling ? t.previousElementSibling : n ? null : e.lastChild;
}
function ox(e, t) {
	if (t === void 0) return !0;
	let n = e.innerText;
	return n === void 0 && (n = e.textContent), n = n.trim().toLowerCase(), n.length === 0 ? !1 : t.repeating ? n[0] === t.keys[0] : n.indexOf(t.keys.join("")) === 0;
}
function sx(e, t, n, r, i, a) {
	let o = !1, s = i(e, t, t ? n : !1);
	for (; s;) {
		if (s === e.firstChild) {
			if (o) return !1;
			o = !0;
		}
		let t = r ? !1 : s.disabled || s.getAttribute("aria-disabled") === "true";
		if (!s.hasAttribute("tabindex") || !ox(s, a) || t) s = i(e, s, n);
		else return s.focus(), !0;
	}
	return !1;
}
var cx = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let { actions: n, autoFocus: r = !1, autoFocusItem: i = !1, children: a, className: o, disabledItemsFocusable: s = !1, disableListWrap: c = !1, onKeyDown: l, variant: u = "selectedMenu" } = e, d = H(e, rx), f = X.useRef(null), p = X.useRef({
		keys: [],
		repeating: !0,
		previousKeyMatched: !0,
		lastTime: null
	});
	Zm(() => {
		r && f.current.focus();
	}, [r]), X.useImperativeHandle(n, () => ({ adjustStyleForScrollbar: (e, { direction: t }) => {
		let n = !f.current.style.width;
		if (e.clientHeight < f.current.clientHeight && n) {
			let n = `${nx(Um(e))}px`;
			f.current.style[t === "rtl" ? "paddingLeft" : "paddingRight"] = n, f.current.style.width = `calc(100% + ${n})`;
		}
		return f.current;
	} }), []);
	let m = (e) => {
		let t = f.current, n = e.key, r = Um(t).activeElement;
		if (n === "ArrowDown") e.preventDefault(), sx(t, r, c, s, ix);
		else if (n === "ArrowUp") e.preventDefault(), sx(t, r, c, s, ax);
		else if (n === "Home") e.preventDefault(), sx(t, null, c, s, ix);
		else if (n === "End") e.preventDefault(), sx(t, null, c, s, ax);
		else if (n.length === 1) {
			let i = p.current, a = n.toLowerCase(), o = performance.now();
			i.keys.length > 0 && (o - i.lastTime > 500 ? (i.keys = [], i.repeating = !0, i.previousKeyMatched = !0) : i.repeating && a !== i.keys[0] && (i.repeating = !1)), i.lastTime = o, i.keys.push(a);
			let c = r && !i.repeating && ox(r, i);
			i.previousKeyMatched && (c || sx(t, r, !1, s, ix, i)) ? e.preventDefault() : i.previousKeyMatched = !1;
		}
		l && l(e);
	}, h = sh(f, t), g = -1;
	X.Children.forEach(a, (e, t) => {
		if (!/*#__PURE__*/ X.isValidElement(e)) {
			g === t && (g += 1, g >= a.length && (g = -1));
			return;
		}
		e.props.disabled || (u === "selectedMenu" && e.props.selected || g === -1) && (g = t), g === t && (e.props.disabled || e.props.muiSkipListHighlight || e.type.muiSkipListHighlight) && (g += 1, g >= a.length && (g = -1));
	});
	let _ = X.Children.map(a, (e, t) => {
		if (t === g) {
			let t = {};
			return i && (t.autoFocus = !0), e.props.tabIndex === void 0 && u === "selectedMenu" && (t.tabIndex = 0), /*#__PURE__*/ X.cloneElement(e, t);
		}
		return e;
	});
	return /*#__PURE__*/ (0, Z.jsx)(tx, B({
		role: "menu",
		ref: h,
		className: o,
		onKeyDown: m,
		tabIndex: r ? 0 : -1
	}, d, { children: _ }));
});
bs(), _s();
function lx(e) {
	return ms("MuiPopover", e);
}
vs("MuiPopover", ["root", "paper"]), V(), U(), Ms(), cs(), Js(), Ds(), xm(), K(), Rm(), Wm(), Km(), ch();
var ux = ["onEntering"], dx = [
	"action",
	"anchorEl",
	"anchorOrigin",
	"anchorPosition",
	"anchorReference",
	"children",
	"className",
	"container",
	"elevation",
	"marginThreshold",
	"open",
	"PaperProps",
	"slots",
	"slotProps",
	"transformOrigin",
	"TransitionComponent",
	"transitionDuration",
	"TransitionProps",
	"disableScrollLock"
], fx = ["slotProps"];
function px(e, t) {
	let n = 0;
	return typeof t == "number" ? n = t : t === "center" ? n = e.height / 2 : t === "bottom" && (n = e.height), n;
}
function mx(e, t) {
	let n = 0;
	return typeof t == "number" ? n = t : t === "center" ? n = e.width / 2 : t === "right" && (n = e.width), n;
}
function hx(e) {
	return [e.horizontal, e.vertical].map((e) => typeof e == "number" ? `${e}px` : e).join(" ");
}
function gx(e) {
	return typeof e == "function" ? e() : e;
}
var _x = (e) => {
	let { classes: t } = e;
	return os({
		root: ["root"],
		paper: ["paper"]
	}, lx, t);
}, vx = Y(Ry, {
	name: "MuiPopover",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), yx = Y(Kg, {
	name: "MuiPopover",
	slot: "Paper",
	overridesResolver: (e, t) => t.paper
})({
	position: "absolute",
	overflowY: "auto",
	overflowX: "hidden",
	minWidth: 16,
	minHeight: 16,
	maxWidth: "calc(100% - 32px)",
	maxHeight: "calc(100% - 32px)",
	outline: 0
}), bx = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i;
	let a = pc({
		props: e,
		name: "MuiPopover"
	}), { action: o, anchorEl: s, anchorOrigin: c = {
		vertical: "top",
		horizontal: "left"
	}, anchorPosition: l, anchorReference: u = "anchorEl", children: d, className: f, container: p, elevation: m = 8, marginThreshold: h = 16, open: g, PaperProps: _ = {}, slots: v, slotProps: y, transformOrigin: b = {
		vertical: "top",
		horizontal: "left"
	}, TransitionComponent: x = yb, transitionDuration: S = "auto", TransitionProps: { onEntering: C } = {}, disableScrollLock: w = !1 } = a, T = H(a.TransitionProps, ux), E = H(a, dx), D = (n = y == null ? void 0 : y.paper) == null ? _ : n, O = X.useRef(), k = sh(O, D.ref), A = B({}, a, {
		anchorOrigin: c,
		anchorReference: u,
		elevation: m,
		marginThreshold: h,
		externalPaperSlotProps: D,
		transformOrigin: b,
		TransitionComponent: x,
		transitionDuration: S,
		TransitionProps: T
	}), j = _x(A), M = X.useCallback(() => {
		if (u === "anchorPosition") return l;
		let e = gx(s), t = (e && e.nodeType === 1 ? e : Um(O.current).body).getBoundingClientRect();
		return {
			top: t.top + px(t, c.vertical),
			left: t.left + mx(t, c.horizontal)
		};
	}, [
		s,
		c.horizontal,
		c.vertical,
		l,
		u
	]), N = X.useCallback((e) => ({
		vertical: px(e, b.vertical),
		horizontal: mx(e, b.horizontal)
	}), [b.horizontal, b.vertical]), P = X.useCallback((e) => {
		let t = {
			width: e.offsetWidth,
			height: e.offsetHeight
		}, n = N(t);
		if (u === "none") return {
			top: null,
			left: null,
			transformOrigin: hx(n)
		};
		let r = M(), i = r.top - n.vertical, a = r.left - n.horizontal, o = i + t.height, c = a + t.width, l = Gm(gx(s)), d = l.innerHeight - h, f = l.innerWidth - h;
		if (h !== null && i < h) {
			let e = i - h;
			i -= e, n.vertical += e;
		} else if (h !== null && o > d) {
			let e = o - d;
			i -= e, n.vertical += e;
		}
		if (h !== null && a < h) {
			let e = a - h;
			a -= e, n.horizontal += e;
		} else if (c > f) {
			let e = c - f;
			a -= e, n.horizontal += e;
		}
		return {
			top: `${Math.round(i)}px`,
			left: `${Math.round(a)}px`,
			transformOrigin: hx(n)
		};
	}, [
		s,
		u,
		M,
		N,
		h
	]), [ee, te] = X.useState(g), F = X.useCallback(() => {
		let e = O.current;
		if (!e) return;
		let t = P(e);
		t.top !== null && (e.style.top = t.top), t.left !== null && (e.style.left = t.left), e.style.transformOrigin = t.transformOrigin, te(!0);
	}, [P]);
	X.useEffect(() => (w && window.addEventListener("scroll", F), () => window.removeEventListener("scroll", F)), [
		s,
		w,
		F
	]);
	let ne = (e, t) => {
		C && C(e, t), F();
	}, I = () => {
		te(!1);
	};
	X.useEffect(() => {
		g && F();
	}), X.useImperativeHandle(o, () => g ? { updatePosition: () => {
		F();
	} } : null, [g, F]), X.useEffect(() => {
		if (!g) return;
		let e = Lm(() => {
			F();
		}), t = Gm(s);
		return t.addEventListener("resize", e), () => {
			e.clear(), t.removeEventListener("resize", e);
		};
	}, [
		s,
		g,
		F
	]);
	let L = S;
	S === "auto" && !x.muiSupportAuto && (L = void 0);
	let re = p || (s ? Um(gx(s)).body : void 0), ie = (r = v == null ? void 0 : v.root) == null ? vx : r, ae = (i = v == null ? void 0 : v.paper) == null ? yx : i, oe = Gs({
		elementType: ae,
		externalSlotProps: B({}, D, { style: ee ? D.style : B({}, D.style, { opacity: 0 }) }),
		additionalProps: {
			elevation: m,
			ref: k
		},
		ownerState: A,
		className: W(j.paper, D == null ? void 0 : D.className)
	}), se = Gs({
		elementType: ie,
		externalSlotProps: (y == null ? void 0 : y.root) || {},
		externalForwardedProps: E,
		additionalProps: {
			ref: t,
			slotProps: { backdrop: { invisible: !0 } },
			container: re,
			open: g
		},
		ownerState: A,
		className: W(j.root, f)
	}), { slotProps: ce } = se, le = H(se, fx);
	return /*#__PURE__*/ (0, Z.jsx)(ie, B({}, le, !Ts(ie) && {
		slotProps: ce,
		disableScrollLock: w
	}, { children: /*#__PURE__*/ (0, Z.jsx)(x, B({
		appear: !0,
		in: g,
		onEntering: ne,
		onExited: I,
		timeout: L
	}, T, { children: /*#__PURE__*/ (0, Z.jsx)(ae, B({}, oe, { children: d })) })) }));
});
bs(), _s();
function xx(e) {
	return ms("MuiMenu", e);
}
vs("MuiMenu", [
	"root",
	"paper",
	"list"
]), V(), U(), Ms(), cs(), Js(), xm(), K();
var Sx = ["onEntering"], Cx = [
	"autoFocus",
	"children",
	"className",
	"disableAutoFocusItem",
	"MenuListProps",
	"onClose",
	"open",
	"PaperProps",
	"PopoverClasses",
	"transitionDuration",
	"TransitionProps",
	"variant",
	"slots",
	"slotProps"
], wx = {
	vertical: "top",
	horizontal: "right"
}, Tx = {
	vertical: "top",
	horizontal: "left"
}, Ex = (e) => {
	let { classes: t } = e;
	return os({
		root: ["root"],
		paper: ["paper"],
		list: ["list"]
	}, xx, t);
}, Dx = Y(bx, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiMenu",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), Ox = Y(yx, {
	name: "MuiMenu",
	slot: "Paper",
	overridesResolver: (e, t) => t.paper
})({
	maxHeight: "calc(100% - 96px)",
	WebkitOverflowScrolling: "touch"
}), kx = Y(cx, {
	name: "MuiMenu",
	slot: "List",
	overridesResolver: (e, t) => t.list
})({ outline: 0 }), Ax = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r;
	let i = pc({
		props: e,
		name: "MuiMenu"
	}), { autoFocus: a = !0, children: o, className: s, disableAutoFocusItem: c = !1, MenuListProps: l = {}, onClose: u, open: d, PaperProps: f = {}, PopoverClasses: p, transitionDuration: m = "auto", TransitionProps: { onEntering: h } = {}, variant: g = "selectedMenu", slots: _ = {}, slotProps: v = {} } = i, y = H(i.TransitionProps, Sx), b = H(i, Cx), x = Xh(), S = B({}, i, {
		autoFocus: a,
		disableAutoFocusItem: c,
		MenuListProps: l,
		onEntering: h,
		PaperProps: f,
		transitionDuration: m,
		TransitionProps: y,
		variant: g
	}), C = Ex(S), w = a && !c && d, T = X.useRef(null), E = (e, t) => {
		T.current && T.current.adjustStyleForScrollbar(e, { direction: x ? "rtl" : "ltr" }), h && h(e, t);
	}, D = (e) => {
		e.key === "Tab" && (e.preventDefault(), u && u(e, "tabKeyDown"));
	}, O = -1;
	X.Children.map(o, (e, t) => {
		/*#__PURE__*/ X.isValidElement(e) && (e.props.disabled || (g === "selectedMenu" && e.props.selected || O === -1) && (O = t));
	});
	let k = (n = _.paper) == null ? Ox : n, A = (r = v.paper) == null ? f : r, j = Gs({
		elementType: _.root,
		externalSlotProps: v.root,
		ownerState: S,
		className: [C.root, s]
	}), M = Gs({
		elementType: k,
		externalSlotProps: A,
		ownerState: S,
		className: C.paper
	});
	return /*#__PURE__*/ (0, Z.jsx)(Dx, B({
		onClose: u,
		anchorOrigin: {
			vertical: "bottom",
			horizontal: x ? "right" : "left"
		},
		transformOrigin: x ? wx : Tx,
		slots: {
			paper: k,
			root: _.root
		},
		slotProps: {
			root: j,
			paper: M
		},
		open: d,
		ref: t,
		transitionDuration: m,
		TransitionProps: B({ onEntering: E }, y),
		ownerState: S
	}, b, {
		classes: p,
		children: /*#__PURE__*/ (0, Z.jsx)(kx, B({
			onKeyDown: D,
			actions: T,
			autoFocus: a && (O === -1 || c),
			autoFocusItem: w,
			variant: g
		}, l, {
			className: W(C.list, l.className),
			children: o
		}))
	}));
});
bs(), _s();
function jx(e) {
	return ms("MuiNativeSelect", e);
}
var Mx = vs("MuiNativeSelect", [
	"root",
	"select",
	"multiple",
	"filled",
	"outlined",
	"standard",
	"disabled",
	"icon",
	"iconOpen",
	"iconFilled",
	"iconOutlined",
	"iconStandard",
	"nativeInput",
	"error"
]);
U(), V(), Ms(), cs(), ec(), xm();
var Nx = [
	"className",
	"disabled",
	"error",
	"IconComponent",
	"inputRef",
	"variant"
], Px = (e) => {
	let { classes: t, variant: n, disabled: r, multiple: i, open: a, error: o } = e;
	return os({
		select: [
			"select",
			n,
			r && "disabled",
			i && "multiple",
			o && "error"
		],
		icon: [
			"icon",
			`icon${G(n)}`,
			a && "iconOpen",
			r && "disabled"
		]
	}, jx, t);
}, Fx = ({ ownerState: e, theme: t }) => B({
	MozAppearance: "none",
	WebkitAppearance: "none",
	userSelect: "none",
	borderRadius: 0,
	cursor: "pointer",
	"&:focus": B({}, t.vars ? { backgroundColor: `rgba(${t.vars.palette.common.onBackgroundChannel} / 0.05)` } : { backgroundColor: t.palette.mode === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" }, { borderRadius: 0 }),
	"&::-ms-expand": { display: "none" },
	[`&.${Mx.disabled}`]: { cursor: "default" },
	"&[multiple]": { height: "auto" },
	"&:not([multiple]) option, &:not([multiple]) optgroup": { backgroundColor: (t.vars || t).palette.background.paper },
	"&&&": {
		paddingRight: 24,
		minWidth: 16
	}
}, e.variant === "filled" && { "&&&": { paddingRight: 32 } }, e.variant === "outlined" && {
	borderRadius: (t.vars || t).shape.borderRadius,
	"&:focus": { borderRadius: (t.vars || t).shape.borderRadius },
	"&&&": { paddingRight: 32 }
}), Ix = Y("select", {
	name: "MuiNativeSelect",
	slot: "Select",
	shouldForwardProp: vm,
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.select,
			t[n.variant],
			n.error && t.error,
			{ [`&.${Mx.multiple}`]: t.multiple }
		];
	}
})(Fx), Lx = ({ ownerState: e, theme: t }) => B({
	position: "absolute",
	right: 0,
	top: "calc(50% - .5em)",
	pointerEvents: "none",
	color: (t.vars || t).palette.action.active,
	[`&.${Mx.disabled}`]: { color: (t.vars || t).palette.action.disabled }
}, e.open && { transform: "rotate(180deg)" }, e.variant === "filled" && { right: 7 }, e.variant === "outlined" && { right: 7 }), Rx = Y("svg", {
	name: "MuiNativeSelect",
	slot: "Icon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.icon,
			n.variant && t[`icon${G(n.variant)}`],
			n.open && t.iconOpen
		];
	}
})(Lx), zx = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let { className: n, disabled: r, error: i, IconComponent: a, inputRef: o, variant: s = "standard" } = e, c = H(e, Nx), l = B({}, e, {
		disabled: r,
		variant: s,
		error: i
	}), u = Px(l);
	return /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [/*#__PURE__*/ (0, Z.jsx)(Ix, B({
		ownerState: l,
		className: W(u.select, n),
		disabled: r,
		ref: o || t
	}, c)), e.multiple ? null : /*#__PURE__*/ (0, Z.jsx)(Rx, {
		as: a,
		ownerState: l,
		className: u.icon
	})] });
});
U(), V(), xm();
var Bx, Vx = [
	"children",
	"classes",
	"className",
	"label",
	"notched"
], Hx = Y("fieldset", {
	name: "MuiNotchedOutlined",
	shouldForwardProp: vm
})({
	textAlign: "left",
	position: "absolute",
	bottom: 0,
	right: 0,
	top: -5,
	left: 0,
	margin: 0,
	padding: "0 8px",
	pointerEvents: "none",
	borderRadius: "inherit",
	borderStyle: "solid",
	borderWidth: 1,
	overflow: "hidden",
	minWidth: "0%"
}), Ux = Y("legend", {
	name: "MuiNotchedOutlined",
	shouldForwardProp: vm
})(({ ownerState: e, theme: t }) => B({
	float: "unset",
	width: "auto",
	overflow: "hidden"
}, !e.withLabel && {
	padding: 0,
	lineHeight: "11px",
	transition: t.transitions.create("width", {
		duration: 150,
		easing: t.transitions.easing.easeOut
	})
}, e.withLabel && B({
	display: "block",
	padding: 0,
	height: 11,
	fontSize: "0.75em",
	visibility: "hidden",
	maxWidth: .01,
	transition: t.transitions.create("max-width", {
		duration: 50,
		easing: t.transitions.easing.easeOut
	}),
	whiteSpace: "nowrap",
	"& > span": {
		paddingLeft: 5,
		paddingRight: 5,
		display: "inline-block",
		opacity: 0,
		visibility: "visible"
	}
}, e.notched && {
	maxWidth: "100%",
	transition: t.transitions.create("max-width", {
		duration: 100,
		easing: t.transitions.easing.easeOut,
		delay: 50
	})
})));
function Wx(e) {
	let { className: t, label: n, notched: r } = e, i = H(e, Vx), a = n != null && n !== "", o = B({}, e, {
		notched: r,
		withLabel: a
	});
	return /*#__PURE__*/ (0, Z.jsx)(Hx, B({
		"aria-hidden": !0,
		className: t,
		ownerState: o
	}, i, { children: /*#__PURE__*/ (0, Z.jsx)(Ux, {
		ownerState: o,
		children: a ? /*#__PURE__*/ (0, Z.jsx)("span", { children: n }) : Bx || (Bx = /*#__PURE__*/ (0, Z.jsx)("span", {
			className: "notranslate",
			children: "​"
		}))
	}) }));
}
U(), V(), cs(), xm(), K();
var Gx = [
	"components",
	"fullWidth",
	"inputComponent",
	"label",
	"multiline",
	"notched",
	"slots",
	"type"
], Kx = (e) => {
	let { classes: t } = e, n = os({
		root: ["root"],
		notchedOutline: ["notchedOutline"],
		input: ["input"]
	}, lv, t);
	return B({}, t, n);
}, qx = Y(rv, {
	shouldForwardProp: (e) => vm(e) || e === "classes",
	name: "MuiOutlinedInput",
	slot: "Root",
	overridesResolver: ev
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
	return B({
		position: "relative",
		borderRadius: (e.vars || e).shape.borderRadius,
		[`&:hover .${uv.notchedOutline}`]: { borderColor: (e.vars || e).palette.text.primary },
		"@media (hover: none)": { [`&:hover .${uv.notchedOutline}`]: { borderColor: e.vars ? `rgba(${e.vars.palette.common.onBackgroundChannel} / 0.23)` : n } },
		[`&.${uv.focused} .${uv.notchedOutline}`]: {
			borderColor: (e.vars || e).palette[t.color].main,
			borderWidth: 2
		},
		[`&.${uv.error} .${uv.notchedOutline}`]: { borderColor: (e.vars || e).palette.error.main },
		[`&.${uv.disabled} .${uv.notchedOutline}`]: { borderColor: (e.vars || e).palette.action.disabled }
	}, t.startAdornment && { paddingLeft: 14 }, t.endAdornment && { paddingRight: 14 }, t.multiline && B({ padding: "16.5px 14px" }, t.size === "small" && { padding: "8.5px 14px" }));
}), Jx = Y(Wx, {
	name: "MuiOutlinedInput",
	slot: "NotchedOutline",
	overridesResolver: (e, t) => t.notchedOutline
})(({ theme: e }) => {
	let t = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
	return { borderColor: e.vars ? `rgba(${e.vars.palette.common.onBackgroundChannel} / 0.23)` : t };
}), Yx = Y(iv, {
	name: "MuiOutlinedInput",
	slot: "Input",
	overridesResolver: tv
})(({ theme: e, ownerState: t }) => B({ padding: "16.5px 14px" }, !e.vars && { "&:-webkit-autofill": {
	WebkitBoxShadow: e.palette.mode === "light" ? null : "0 0 0 100px #266798 inset",
	WebkitTextFillColor: e.palette.mode === "light" ? null : "#fff",
	caretColor: e.palette.mode === "light" ? null : "#fff",
	borderRadius: "inherit"
} }, e.vars && {
	"&:-webkit-autofill": { borderRadius: "inherit" },
	[e.getColorSchemeSelector("dark")]: { "&:-webkit-autofill": {
		WebkitBoxShadow: "0 0 0 100px #266798 inset",
		WebkitTextFillColor: "#fff",
		caretColor: "#fff"
	} }
}, t.size === "small" && { padding: "8.5px 14px" }, t.multiline && { padding: 0 }, t.startAdornment && { paddingLeft: 0 }, t.endAdornment && { paddingRight: 0 })), Xx = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n, r, i, a, o;
	let s = pc({
		props: e,
		name: "MuiOutlinedInput"
	}), { components: c = {}, fullWidth: l = !1, inputComponent: u = "input", label: d, multiline: f = !1, notched: p, slots: m = {}, type: h = "text" } = s, g = H(s, Gx), _ = Kx(s), v = K_(), y = W_({
		props: s,
		muiFormControl: v,
		states: [
			"color",
			"disabled",
			"error",
			"focused",
			"hiddenLabel",
			"size",
			"required"
		]
	}), b = B({}, s, {
		color: y.color || "primary",
		disabled: y.disabled,
		error: y.error,
		focused: y.focused,
		formControl: v,
		fullWidth: l,
		hiddenLabel: y.hiddenLabel,
		multiline: f,
		size: y.size,
		type: h
	}), x = (n = (r = m.root) == null ? c.Root : r) == null ? qx : n, S = (i = (a = m.input) == null ? c.Input : a) == null ? Yx : i;
	return /*#__PURE__*/ (0, Z.jsx)(ov, B({
		slots: {
			root: x,
			input: S
		},
		renderSuffix: (e) => /*#__PURE__*/ (0, Z.jsx)(Jx, {
			ownerState: b,
			className: _.notchedOutline,
			label: d != null && d !== "" && y.required ? o || (o = /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [
				d,
				" ",
				"*"
			] })) : d,
			notched: p === void 0 ? !!(e.startAdornment || e.filled || e.focused) : p
		}),
		fullWidth: l,
		inputComponent: u,
		multiline: f,
		ref: t,
		type: h
	}, g, { classes: B({}, _, { notchedOutline: null }) }));
});
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/Star.js
Xx.muiName = "Input", Im();
var Zx = Nm(/*#__PURE__*/ (0, Z.jsx)("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }), "Star");
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/StarBorder.js
Im();
var Qx = Nm(/*#__PURE__*/ (0, Z.jsx)("path", { d: "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" }), "StarBorder");
bs(), _s();
function $x(e) {
	return ms("MuiRating", e);
}
var eS = vs("MuiRating", [
	"root",
	"sizeSmall",
	"sizeMedium",
	"sizeLarge",
	"readOnly",
	"disabled",
	"focusVisible",
	"visuallyHidden",
	"pristine",
	"label",
	"labelEmptyValueActive",
	"icon",
	"iconEmpty",
	"iconFilled",
	"iconHover",
	"iconFocus",
	"iconActive",
	"decimal"
]);
U(), V(), Ms(), ws(), ns(), cs(), ph(), K(), xm();
var tS = ["value"], nS = [
	"className",
	"defaultValue",
	"disabled",
	"emptyIcon",
	"emptyLabelText",
	"getLabelText",
	"highlightSelectedOnly",
	"icon",
	"IconContainerComponent",
	"max",
	"name",
	"onChange",
	"onChangeActive",
	"onMouseLeave",
	"onMouseMove",
	"precision",
	"readOnly",
	"size",
	"value"
];
function rS(e) {
	let t = e.toString().split(".")[1];
	return t ? t.length : 0;
}
function iS(e, t) {
	if (e == null) return e;
	let n = Math.round(e / t) * t;
	return Number(n.toFixed(rS(t)));
}
var aS = (e) => {
	let { classes: t, size: n, readOnly: r, disabled: i, emptyValueFocused: a, focusVisible: o } = e;
	return os({
		root: [
			"root",
			`size${G(n)}`,
			i && "disabled",
			o && "focusVisible",
			r && "readOnly"
		],
		label: ["label", "pristine"],
		labelEmptyValue: [a && "labelEmptyValueActive"],
		icon: ["icon"],
		iconEmpty: ["iconEmpty"],
		iconFilled: ["iconFilled"],
		iconHover: ["iconHover"],
		iconFocus: ["iconFocus"],
		iconActive: ["iconActive"],
		decimal: ["decimal"],
		visuallyHidden: ["visuallyHidden"]
	}, $x, t);
}, oS = Y("span", {
	name: "MuiRating",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`& .${eS.visuallyHidden}`]: t.visuallyHidden },
			t.root,
			t[`size${G(n.size)}`],
			n.readOnly && t.readOnly
		];
	}
})(({ theme: e, ownerState: t }) => B({
	display: "inline-flex",
	position: "relative",
	fontSize: e.typography.pxToRem(24),
	color: "#faaf00",
	cursor: "pointer",
	textAlign: "left",
	width: "min-content",
	WebkitTapHighlightColor: "transparent",
	[`&.${eS.disabled}`]: {
		opacity: (e.vars || e).palette.action.disabledOpacity,
		pointerEvents: "none"
	},
	[`&.${eS.focusVisible} .${eS.iconActive}`]: { outline: "1px solid #999" },
	[`& .${eS.visuallyHidden}`]: es
}, t.size === "small" && { fontSize: e.typography.pxToRem(18) }, t.size === "large" && { fontSize: e.typography.pxToRem(30) }, t.readOnly && { pointerEvents: "none" })), sS = Y("label", {
	name: "MuiRating",
	slot: "Label",
	overridesResolver: ({ ownerState: e }, t) => [t.label, e.emptyValueFocused && t.labelEmptyValueActive]
})(({ ownerState: e }) => B({ cursor: "inherit" }, e.emptyValueFocused && {
	top: 0,
	bottom: 0,
	position: "absolute",
	outline: "1px solid #999",
	width: "100%"
})), cS = Y("span", {
	name: "MuiRating",
	slot: "Icon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.icon,
			n.iconEmpty && t.iconEmpty,
			n.iconFilled && t.iconFilled,
			n.iconHover && t.iconHover,
			n.iconFocus && t.iconFocus,
			n.iconActive && t.iconActive
		];
	}
})(({ theme: e, ownerState: t }) => B({
	display: "flex",
	transition: e.transitions.create("transform", { duration: e.transitions.duration.shortest }),
	pointerEvents: "none"
}, t.iconActive && { transform: "scale(1.2)" }, t.iconEmpty && { color: (e.vars || e).palette.action.disabled })), lS = Y("span", {
	name: "MuiRating",
	slot: "Decimal",
	shouldForwardProp: (e) => gm(e) && e !== "iconActive",
	overridesResolver: (e, t) => {
		let { iconActive: n } = e;
		return [t.decimal, n && t.iconActive];
	}
})(({ iconActive: e }) => B({ position: "relative" }, e && { transform: "scale(1.2)" }));
function uS(e) {
	let t = H(e, tS);
	return /*#__PURE__*/ (0, Z.jsx)("span", B({}, t));
}
function dS(e) {
	let { classes: t, disabled: n, emptyIcon: r, focus: i, getLabelText: a, highlightSelectedOnly: o, hover: s, icon: c, IconContainerComponent: l, isActive: u, itemValue: d, labelProps: f, name: p, onBlur: m, onChange: h, onClick: g, onFocus: _, readOnly: v, ownerState: y, ratingValue: b, ratingValueRounded: x } = e, S = o ? d === b : d <= b, C = d <= s, w = d <= i, T = d === x, E = $m(), D = /*#__PURE__*/ (0, Z.jsx)(cS, {
		as: l,
		value: d,
		className: W(t.icon, S ? t.iconFilled : t.iconEmpty, C && t.iconHover, w && t.iconFocus, u && t.iconActive),
		ownerState: B({}, y, {
			iconEmpty: !S,
			iconFilled: S,
			iconHover: C,
			iconFocus: w,
			iconActive: u
		}),
		children: r && !S ? r : c
	});
	return v ? /*#__PURE__*/ (0, Z.jsx)("span", B({}, f, { children: D })) : /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [/*#__PURE__*/ (0, Z.jsxs)(sS, B({
		ownerState: B({}, y, { emptyValueFocused: void 0 }),
		htmlFor: E
	}, f, { children: [D, /*#__PURE__*/ (0, Z.jsx)("span", {
		className: t.visuallyHidden,
		children: a(d)
	})] })), /*#__PURE__*/ (0, Z.jsx)("input", {
		className: t.visuallyHidden,
		onFocus: _,
		onBlur: m,
		onChange: h,
		onClick: g,
		disabled: n,
		value: d,
		id: E,
		type: "radio",
		name: p,
		checked: T
	})] });
}
var fS = /*#__PURE__*/ (0, Z.jsx)(Zx, { fontSize: "inherit" }), pS = /*#__PURE__*/ (0, Z.jsx)(Qx, { fontSize: "inherit" });
function mS(e) {
	return `${e} Star${e === 1 ? "" : "s"}`;
}
var hS = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		name: "MuiRating",
		props: e
	}), { className: r, defaultValue: i = null, disabled: a = !1, emptyIcon: o = pS, emptyLabelText: s = "Empty", getLabelText: c = mS, highlightSelectedOnly: l = !1, icon: u = fS, IconContainerComponent: d = uS, max: f = 5, name: p, onChange: m, onChangeActive: h, onMouseLeave: g, onMouseMove: _, precision: v = 1, readOnly: y = !1, size: b = "medium", value: x } = n, S = H(n, nS), C = $m(p), [w, T] = rh({
		controlled: x,
		default: i,
		name: "Rating"
	}), E = iS(w, v), D = Xh(), [{ hover: O, focus: k }, A] = X.useState({
		hover: -1,
		focus: -1
	}), j = E;
	O !== -1 && (j = O), k !== -1 && (j = k);
	let { isFocusVisibleRef: M, onBlur: N, onFocus: P, ref: ee } = lh(), [te, F] = X.useState(!1), ne = X.useRef(), I = sh(ee, ne, t), L = (e) => {
		_ && _(e);
		let { right: t, left: n, width: r } = ne.current.getBoundingClientRect(), i;
		i = D ? (t - e.clientX) / r : (e.clientX - n) / r;
		let a = iS(f * i + v / 2, v);
		a = xs(a, v, f), A((e) => e.hover === a && e.focus === a ? e : {
			hover: a,
			focus: a
		}), F(!1), h && O !== a && h(e, a);
	}, re = (e) => {
		g && g(e), A({
			hover: -1,
			focus: -1
		}), h && O !== -1 && h(e, -1);
	}, ie = (e) => {
		let t = e.target.value === "" ? null : parseFloat(e.target.value);
		O !== -1 && (t = O), T(t), m && m(e, t);
	}, ae = (e) => {
		(e.clientX !== 0 || e.clientY !== 0) && (A({
			hover: -1,
			focus: -1
		}), T(null), m && parseFloat(e.target.value) === E && m(e, null));
	}, oe = (e) => {
		P(e), M.current === !0 && F(!0);
		let t = parseFloat(e.target.value);
		A((e) => ({
			hover: e.hover,
			focus: t
		}));
	}, se = (e) => {
		O === -1 && (N(e), M.current === !1 && F(!1), A((e) => ({
			hover: e.hover,
			focus: -1
		})));
	}, [ce, le] = X.useState(!1), ue = B({}, n, {
		defaultValue: i,
		disabled: a,
		emptyIcon: o,
		emptyLabelText: s,
		emptyValueFocused: ce,
		focusVisible: te,
		getLabelText: c,
		icon: u,
		IconContainerComponent: d,
		max: f,
		precision: v,
		readOnly: y,
		size: b
	}), de = aS(ue);
	return /*#__PURE__*/ (0, Z.jsxs)(oS, B({
		ref: I,
		onMouseMove: L,
		onMouseLeave: re,
		className: W(de.root, r, y && "MuiRating-readOnly"),
		ownerState: ue,
		role: y ? "img" : null,
		"aria-label": y ? c(j) : null
	}, S, { children: [Array.from(Array(f)).map((e, t) => {
		let n = t + 1, r = {
			classes: de,
			disabled: a,
			emptyIcon: o,
			focus: k,
			getLabelText: c,
			highlightSelectedOnly: l,
			hover: O,
			icon: u,
			IconContainerComponent: d,
			name: C,
			onBlur: se,
			onChange: ie,
			onClick: ae,
			onFocus: oe,
			ratingValue: j,
			ratingValueRounded: E,
			readOnly: y,
			ownerState: ue
		}, i = n === Math.ceil(j) && (O !== -1 || k !== -1);
		if (v < 1) {
			let e = Array.from(Array(1 / v));
			return /*#__PURE__*/ (0, Z.jsx)(lS, {
				className: W(de.decimal, i && de.iconActive),
				ownerState: ue,
				iconActive: i,
				children: e.map((t, i) => {
					let a = iS(n - 1 + (i + 1) * v, v);
					return /*#__PURE__*/ (0, Z.jsx)(dS, B({}, r, {
						isActive: !1,
						itemValue: a,
						labelProps: { style: e.length - 1 === i ? {} : {
							width: a === j ? `${(i + 1) * v * 100}%` : "0%",
							overflow: "hidden",
							position: "absolute"
						} }
					}), a);
				})
			}, n);
		}
		return /*#__PURE__*/ (0, Z.jsx)(dS, B({}, r, {
			isActive: i,
			itemValue: n
		}), n);
	}), !y && !a && /*#__PURE__*/ (0, Z.jsxs)(sS, {
		className: W(de.label, de.labelEmptyValue),
		ownerState: ue,
		children: [/*#__PURE__*/ (0, Z.jsx)("input", {
			className: de.visuallyHidden,
			value: "",
			id: `${C}-empty`,
			type: "radio",
			name: C,
			checked: E == null,
			onFocus: () => le(!0),
			onBlur: () => le(!1),
			onChange: ie
		}), /*#__PURE__*/ (0, Z.jsx)("span", {
			className: de.visuallyHidden,
			children: s
		})]
	})] }));
});
bs(), _s();
function gS(e) {
	return ms("MuiSelect", e);
}
var _S = vs("MuiSelect", [
	"root",
	"select",
	"multiple",
	"filled",
	"outlined",
	"standard",
	"disabled",
	"focused",
	"icon",
	"iconOpen",
	"iconFilled",
	"iconOutlined",
	"iconStandard",
	"nativeInput",
	"error"
]);
V(), U(), da(), Ms(), cs(), co(), Wm(), ec(), xm(), ch(), ih();
var vS, yS = /* @__PURE__ */ "aria-describedby.aria-label.autoFocus.autoWidth.children.className.defaultOpen.defaultValue.disabled.displayEmpty.error.IconComponent.inputRef.labelId.MenuProps.multiple.name.onBlur.onChange.onClose.onFocus.onOpen.open.readOnly.renderValue.SelectDisplayProps.tabIndex.type.value.variant".split("."), bS = Y("div", {
	name: "MuiSelect",
	slot: "Select",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`&.${_S.select}`]: t.select },
			{ [`&.${_S.select}`]: t[n.variant] },
			{ [`&.${_S.error}`]: t.error },
			{ [`&.${_S.multiple}`]: t.multiple }
		];
	}
})(Fx, { [`&.${_S.select}`]: {
	height: "auto",
	minHeight: "1.4375em",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	overflow: "hidden"
} }), xS = Y("svg", {
	name: "MuiSelect",
	slot: "Icon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.icon,
			n.variant && t[`icon${G(n.variant)}`],
			n.open && t.iconOpen
		];
	}
})(Lx), SS = Y("input", {
	shouldForwardProp: (e) => gm(e) && e !== "classes",
	name: "MuiSelect",
	slot: "NativeInput",
	overridesResolver: (e, t) => t.nativeInput
})({
	bottom: 0,
	left: 0,
	position: "absolute",
	opacity: 0,
	pointerEvents: "none",
	width: "100%",
	boxSizing: "border-box"
});
function CS(e, t) {
	return typeof t == "object" && t ? e === t : String(e) === String(t);
}
function wS(e) {
	return e == null || typeof e == "string" && !e.trim();
}
var TS = (e) => {
	let { classes: t, variant: n, disabled: r, multiple: i, open: a, error: o } = e;
	return os({
		select: [
			"select",
			n,
			r && "disabled",
			i && "multiple",
			o && "error"
		],
		icon: [
			"icon",
			`icon${G(n)}`,
			a && "iconOpen",
			r && "disabled"
		],
		nativeInput: ["nativeInput"]
	}, gS, t);
}, ES = /*#__PURE__*/ X.forwardRef(function(e, t) {
	var n;
	let { "aria-describedby": r, "aria-label": i, autoFocus: a, autoWidth: o, children: s, className: c, defaultOpen: l, defaultValue: u, disabled: d, displayEmpty: f, error: p = !1, IconComponent: m, inputRef: h, labelId: g, MenuProps: _ = {}, multiple: v, name: y, onBlur: b, onChange: x, onClose: S, onFocus: C, onOpen: w, open: T, readOnly: E, renderValue: D, SelectDisplayProps: O = {}, tabIndex: k, value: A, variant: j = "standard" } = e, M = H(e, yS), [N, P] = rh({
		controlled: A,
		default: u,
		name: "Select"
	}), [ee, te] = rh({
		controlled: T,
		default: l,
		name: "Select"
	}), F = X.useRef(null), ne = X.useRef(null), [I, L] = X.useState(null), { current: re } = X.useRef(T != null), [ie, ae] = X.useState(), oe = sh(t, h), se = X.useCallback((e) => {
		ne.current = e, e && L(e);
	}, []), ce = I == null ? void 0 : I.parentNode;
	X.useImperativeHandle(oe, () => ({
		focus: () => {
			ne.current.focus();
		},
		node: F.current,
		value: N
	}), [N]), X.useEffect(() => {
		l && ee && I && !re && (ae(o ? null : ce.clientWidth), ne.current.focus());
	}, [I, o]), X.useEffect(() => {
		a && ne.current.focus();
	}, [a]), X.useEffect(() => {
		if (!g) return;
		let e = Um(ne.current).getElementById(g);
		if (e) {
			let t = () => {
				getSelection().isCollapsed && ne.current.focus();
			};
			return e.addEventListener("click", t), () => {
				e.removeEventListener("click", t);
			};
		}
	}, [g]);
	let le = (e, t) => {
		e ? w && w(t) : S && S(t), re || (ae(o ? null : ce.clientWidth), te(e));
	}, ue = (e) => {
		e.button === 0 && (e.preventDefault(), ne.current.focus(), le(!0, e));
	}, de = (e) => {
		le(!1, e);
	}, fe = X.Children.toArray(s), pe = (e) => {
		let t = fe.find((t) => t.props.value === e.target.value);
		t !== void 0 && (P(t.props.value), x && x(e, t));
	}, me = (e) => (t) => {
		let n;
		if (t.currentTarget.hasAttribute("tabindex")) {
			if (v) {
				n = Array.isArray(N) ? N.slice() : [];
				let t = N.indexOf(e.props.value);
				t === -1 ? n.push(e.props.value) : n.splice(t, 1);
			} else n = e.props.value;
			if (e.props.onClick && e.props.onClick(t), N !== n && (P(n), x)) {
				let r = t.nativeEvent || t, i = new r.constructor(r.type, r);
				Object.defineProperty(i, "target", {
					writable: !0,
					value: {
						value: n,
						name: y
					}
				}), x(i, e);
			}
			v || le(!1, t);
		}
	}, he = (e) => {
		E || [
			" ",
			"ArrowUp",
			"ArrowDown",
			"Enter"
		].indexOf(e.key) !== -1 && (e.preventDefault(), le(!0, e));
	}, ge = I !== null && ee, _e = (e) => {
		!ge && b && (Object.defineProperty(e, "target", {
			writable: !0,
			value: {
				value: N,
				name: y
			}
		}), b(e));
	};
	delete M["aria-invalid"];
	let ve, ye, be = [], xe = !1;
	(Y_({ value: N }) || f) && (D ? ve = D(N) : xe = !0);
	let Se = fe.map((e) => {
		if (!/*#__PURE__*/ X.isValidElement(e)) return null;
		let t;
		if (v) {
			if (!Array.isArray(N)) throw Error(ca(2));
			t = N.some((t) => CS(t, e.props.value)), t && xe && be.push(e.props.children);
		} else t = CS(N, e.props.value), t && xe && (ye = e.props.children);
		return /*#__PURE__*/ X.cloneElement(e, {
			"aria-selected": t ? "true" : "false",
			onClick: me(e),
			onKeyUp: (t) => {
				t.key === " " && t.preventDefault(), e.props.onKeyUp && e.props.onKeyUp(t);
			},
			role: "option",
			selected: t,
			value: void 0,
			"data-value": e.props.value
		});
	});
	xe && (ve = v ? be.length === 0 ? null : be.reduce((e, t, n) => (e.push(t), n < be.length - 1 && e.push(", "), e), []) : ye);
	let Ce = ie;
	!o && re && I && (Ce = ce.clientWidth);
	let we;
	we = k === void 0 ? d ? null : 0 : k;
	let Te = O.id || (y ? `mui-component-select-${y}` : void 0), Ee = B({}, e, {
		variant: j,
		value: N,
		open: ge,
		error: p
	}), De = TS(Ee), Oe = B({}, _.PaperProps, (n = _.slotProps) == null ? void 0 : n.paper), ke = ro();
	return /*#__PURE__*/ (0, Z.jsxs)(X.Fragment, { children: [
		/*#__PURE__*/ (0, Z.jsx)(bS, B({
			ref: se,
			tabIndex: we,
			role: "combobox",
			"aria-controls": ke,
			"aria-disabled": d ? "true" : void 0,
			"aria-expanded": ge ? "true" : "false",
			"aria-haspopup": "listbox",
			"aria-label": i,
			"aria-labelledby": [g, Te].filter(Boolean).join(" ") || void 0,
			"aria-describedby": r,
			onKeyDown: he,
			onMouseDown: d || E ? null : ue,
			onBlur: _e,
			onFocus: C
		}, O, {
			ownerState: Ee,
			className: W(O.className, De.select, c),
			id: Te,
			children: wS(ve) ? vS || (vS = /*#__PURE__*/ (0, Z.jsx)("span", {
				className: "notranslate",
				children: "​"
			})) : ve
		})),
		/*#__PURE__*/ (0, Z.jsx)(SS, B({
			"aria-invalid": p,
			value: Array.isArray(N) ? N.join(",") : N,
			name: y,
			ref: F,
			"aria-hidden": !0,
			onChange: pe,
			tabIndex: -1,
			disabled: d,
			className: De.nativeInput,
			autoFocus: a,
			ownerState: Ee
		}, M)),
		/*#__PURE__*/ (0, Z.jsx)(xS, {
			as: m,
			className: De.icon,
			ownerState: Ee
		}),
		/*#__PURE__*/ (0, Z.jsx)(Ax, B({
			id: `menu-${y || ""}`,
			anchorEl: ce,
			open: ge,
			onClose: de,
			anchorOrigin: {
				vertical: "bottom",
				horizontal: "center"
			},
			transformOrigin: {
				vertical: "top",
				horizontal: "center"
			}
		}, _, {
			MenuListProps: B({
				"aria-labelledby": g,
				role: "listbox",
				"aria-multiselectable": v ? "true" : void 0,
				disableListWrap: !0,
				id: ke
			}, _.MenuListProps),
			slotProps: B({}, _.slotProps, { paper: B({}, Oe, { style: B({ minWidth: Ce }, Oe == null ? null : Oe.style) }) }),
			children: Se
		}))
	] });
});
V(), U(), Ms(), sa(), Zs(), K(), ch(), xm();
var DS = [
	"autoWidth",
	"children",
	"classes",
	"className",
	"defaultOpen",
	"displayEmpty",
	"IconComponent",
	"id",
	"input",
	"inputProps",
	"label",
	"labelId",
	"MenuProps",
	"multiple",
	"native",
	"onClose",
	"onOpen",
	"open",
	"renderValue",
	"SelectDisplayProps",
	"variant"
], OS = ["root"], kS = (e) => {
	let { classes: t } = e;
	return t;
}, AS = {
	name: "MuiSelect",
	overridesResolver: (e, t) => t.root,
	shouldForwardProp: (e) => vm(e) && e !== "variant",
	slot: "Root"
}, jS = Y(wb, AS)(""), MS = Y(Xx, AS)(""), NS = Y(Yy, AS)(""), PS = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		name: "MuiSelect",
		props: e
	}), { autoWidth: r = !1, children: i, classes: a = {}, className: o, defaultOpen: s = !1, displayEmpty: c = !1, IconComponent: l = pv, id: u, input: d, inputProps: f, label: p, labelId: m, MenuProps: h, multiple: g = !1, native: _ = !1, onClose: v, onOpen: y, open: b, renderValue: x, SelectDisplayProps: S, variant: C = "outlined" } = n, w = H(n, DS), T = _ ? zx : ES, E = W_({
		props: n,
		muiFormControl: K_(),
		states: ["variant", "error"]
	}), D = E.variant || C, O = B({}, n, {
		variant: D,
		classes: a
	}), k = kS(O), A = H(k, OS), j = d || {
		standard: /*#__PURE__*/ (0, Z.jsx)(jS, { ownerState: O }),
		outlined: /*#__PURE__*/ (0, Z.jsx)(MS, {
			label: p,
			ownerState: O
		}),
		filled: /*#__PURE__*/ (0, Z.jsx)(NS, { ownerState: O })
	}[D], M = sh(t, Ys(j));
	return /*#__PURE__*/ (0, Z.jsx)(X.Fragment, { children: /*#__PURE__*/ X.cloneElement(j, B({
		inputComponent: T,
		inputProps: B({
			children: i,
			error: E.error,
			IconComponent: l,
			variant: D,
			type: void 0,
			multiple: g
		}, _ ? { id: u } : {
			autoWidth: r,
			defaultOpen: s,
			displayEmpty: c,
			labelId: m,
			MenuProps: h,
			onClose: v,
			onOpen: y,
			open: b,
			renderValue: x,
			SelectDisplayProps: B({ id: u }, S)
		}, f, { classes: f ? ra(A, f.classes) : A }, d ? d.props.inputProps : {})
	}, (g && _ || c) && D === "outlined" ? { notched: !0 } : {}, {
		ref: M,
		className: W(j.props.className, o, k.root)
	}, !d && { variant: D }, w)) });
});
PS.muiName = "Select", bs(), _s();
function FS(e) {
	return ms("MuiTextField", e);
}
vs("MuiTextField", ["root"]), V(), U(), Ms(), cs(), co(), xm(), K();
var IS = /* @__PURE__ */ "autoComplete.autoFocus.children.className.color.defaultValue.disabled.error.FormHelperTextProps.fullWidth.helperText.id.InputLabelProps.inputProps.InputProps.inputRef.label.maxRows.minRows.multiline.name.onBlur.onChange.onFocus.placeholder.required.rows.select.SelectProps.type.value.variant".split("."), LS = {
	standard: wb,
	filled: Yy,
	outlined: Xx
}, RS = (e) => {
	let { classes: t } = e;
	return os({ root: ["root"] }, FS, t);
}, zS = Y(eb, {
	name: "MuiTextField",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), BS = /*#__PURE__*/ X.forwardRef(function(e, t) {
	let n = pc({
		props: e,
		name: "MuiTextField"
	}), { autoComplete: r, autoFocus: i = !1, children: a, className: o, color: s = "primary", defaultValue: c, disabled: l = !1, error: u = !1, FormHelperTextProps: d, fullWidth: f = !1, helperText: p, id: m, InputLabelProps: h, inputProps: g, InputProps: _, inputRef: v, label: y, maxRows: b, minRows: x, multiline: S = !1, name: C, onBlur: w, onChange: T, onFocus: E, placeholder: D, required: O = !1, rows: k, select: A = !1, SelectProps: j, type: M, value: N, variant: P = "outlined" } = n, ee = H(n, IS), te = B({}, n, {
		autoFocus: i,
		color: s,
		disabled: l,
		error: u,
		fullWidth: f,
		multiline: S,
		required: O,
		select: A,
		variant: P
	}), F = RS(te), ne = {};
	P === "outlined" && (h && h.shrink !== void 0 && (ne.notched = h.shrink), ne.label = y), A && ((!j || !j.native) && (ne.id = void 0), ne["aria-describedby"] = void 0);
	let I = ro(m), L = p && I ? `${I}-helper-text` : void 0, re = y && I ? `${I}-label` : void 0, ie = LS[P], ae = /*#__PURE__*/ (0, Z.jsx)(ie, B({
		"aria-describedby": L,
		autoComplete: r,
		autoFocus: i,
		defaultValue: c,
		fullWidth: f,
		multiline: S,
		name: C,
		rows: k,
		maxRows: b,
		minRows: x,
		type: M,
		value: N,
		id: I,
		inputRef: v,
		onBlur: w,
		onChange: T,
		onFocus: E,
		placeholder: D,
		inputProps: g
	}, ne, _));
	return /*#__PURE__*/ (0, Z.jsxs)(zS, B({
		className: W(F.root, o),
		disabled: l,
		error: u,
		fullWidth: f,
		ref: t,
		required: O,
		color: s,
		variant: P,
		ownerState: te
	}, ee, { children: [
		y != null && y !== "" && /*#__PURE__*/ (0, Z.jsx)(kb, B({
			htmlFor: I,
			id: re
		}, h, { children: y })),
		A ? /*#__PURE__*/ (0, Z.jsx)(PS, B({
			"aria-describedby": L,
			id: I,
			labelId: re,
			value: N,
			input: ae
		}, j, { children: a })) : ae,
		p && /*#__PURE__*/ (0, Z.jsx)(sb, B({ id: L }, d, { children: p }))
	] }));
}), VS = /* @__PURE__ */ O(hh()), HS = /* @__PURE__ */ O(gh()), US = /* @__PURE__ */ O(_h()), WS = /* @__PURE__ */ O(vh()), GS = /* @__PURE__ */ O(yh()), KS = /* @__PURE__ */ O(bh()), qS = /* @__PURE__ */ O(xh()), JS = /* @__PURE__ */ O(Sh()), YS = /* @__PURE__ */ O(Ch());
function XS(e, t) {
	this.v = e, this.k = t;
}
function ZS(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function QS(e) {
	if (Array.isArray(e)) return e;
}
function $S(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function eC() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function tC(e, t) {
	return QS(e) || $S(e, t) || nC(e, t) || eC();
}
function nC(e, t) {
	if (e) {
		if (typeof e == "string") return ZS(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? ZS(e, t) : void 0;
	}
}
function rC(e) {
	var t, n;
	function r(t, n) {
		try {
			var a = e[t](n), o = a.value, s = o instanceof XS;
			Promise.resolve(s ? o.v : o).then(function(n) {
				if (s) {
					var c = t === "return" && o.k ? t : "next";
					if (!o.k || n.done) return r(c, n);
					n = e[c](n).value;
				}
				i(!!a.done, n);
			}, function(e) {
				r("throw", e);
			});
		} catch (e) {
			i(2, e);
		}
	}
	function i(e, i) {
		e === 2 ? t.reject(i) : t.resolve({
			value: i,
			done: e
		}), (t = t.next) ? r(t.key, t.arg) : n = null;
	}
	this._invoke = function(e, i) {
		return new Promise(function(a, o) {
			var s = {
				key: e,
				arg: i,
				resolve: a,
				reject: o,
				next: null
			};
			n ? n = n.next = s : (t = n = s, r(e, i));
		});
	}, typeof e.return != "function" && (this.return = void 0);
}
rC.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
	return this;
}, rC.prototype.next = function(e) {
	return this._invoke("next", e);
}, rC.prototype.throw = function(e) {
	return this._invoke("throw", e);
}, rC.prototype.return = function(e) {
	return this._invoke("return", e);
};
var iC = Object.entries, aC = Object.setPrototypeOf, oC = Object.isFrozen, sC = Object.getPrototypeOf, cC = Object.getOwnPropertyDescriptor, lC = Object.freeze, uC = Object.seal, dC = Object.create, fC = typeof Reflect < "u" && Reflect, pC = fC.apply, mC = fC.construct;
lC || (lC = function(e) {
	return e;
}), uC || (uC = function(e) {
	return e;
}), pC || (pC = function(e, t) {
	var n = [...arguments].slice(2);
	return e.apply(t, n);
}), mC || (mC = function(e) {
	return new e(...[...arguments].slice(1));
});
var hC = FC(Array.prototype.forEach);
Array.prototype.indexOf;
var gC = FC(Array.prototype.lastIndexOf), _C = FC(Array.prototype.pop), vC = FC(Array.prototype.push);
Array.prototype.slice;
var yC = FC(Array.prototype.splice), bC = Array.isArray, xC = FC(String.prototype.toLowerCase), SC = FC(String.prototype.toString), CC = FC(String.prototype.match), wC = FC(String.prototype.replace), TC = FC(String.prototype.indexOf), EC = FC(String.prototype.trim), DC = FC(Number.prototype.toString), OC = FC(Boolean.prototype.toString), kC = typeof BigInt > "u" ? null : FC(BigInt.prototype.toString), AC = typeof Symbol > "u" ? null : FC(Symbol.prototype.toString), jC = FC(Object.prototype.hasOwnProperty), MC = FC(Object.prototype.toString), NC = FC(RegExp.prototype.test), PC = IC(TypeError);
function FC(e) {
	return function(t) {
		t instanceof RegExp && (t.lastIndex = 0);
		var n = [...arguments].slice(1);
		return pC(e, t, n);
	};
}
function IC(e) {
	return function() {
		return mC(e, [...arguments]);
	};
}
function LC(e, t) {
	let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : xC;
	if (aC && aC(e, null), !bC(t)) return e;
	let r = t.length;
	for (; r--;) {
		let i = t[r];
		if (typeof i == "string") {
			let e = n(i);
			e !== i && (oC(t) || (t[r] = e), i = e);
		}
		e[i] = !0;
	}
	return e;
}
function RC(e) {
	for (let t = 0; t < e.length; t++) jC(e, t) || (e[t] = null);
	return e;
}
function zC(e) {
	let t = dC(null);
	for (let r of iC(e)) {
		var n = tC(r, 2);
		let i = n[0], a = n[1];
		jC(e, i) && (t[i] = bC(a) ? RC(a) : a && typeof a == "object" && a.constructor === Object ? zC(a) : a);
	}
	return t;
}
function BC(e) {
	switch (typeof e) {
		case "string": return e;
		case "number": return DC(e);
		case "boolean": return OC(e);
		case "bigint": return kC ? kC(e) : "0";
		case "symbol": return AC ? AC(e) : "Symbol()";
		case "undefined": return MC(e);
		case "function":
		case "object": {
			if (e === null) return MC(e);
			let t = e, n = VC(t, "toString");
			if (typeof n == "function") {
				let e = n(t);
				return typeof e == "string" ? e : MC(e);
			}
			return MC(e);
		}
		default: return MC(e);
	}
}
function VC(e, t) {
	for (; e !== null;) {
		let n = cC(e, t);
		if (n) {
			if (n.get) return FC(n.get);
			if (typeof n.value == "function") return FC(n.value);
		}
		e = sC(e);
	}
	function n() {
		return null;
	}
	return n;
}
function HC(e) {
	try {
		return NC(e, ""), !0;
	} catch {
		return !1;
	}
}
var UC = lC(/* @__PURE__ */ "a.abbr.acronym.address.area.article.aside.audio.b.bdi.bdo.big.blink.blockquote.body.br.button.canvas.caption.center.cite.code.col.colgroup.content.data.datalist.dd.decorator.del.details.dfn.dialog.dir.div.dl.dt.element.em.fieldset.figcaption.figure.font.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.img.input.ins.kbd.label.legend.li.main.map.mark.marquee.menu.menuitem.meter.nav.nobr.ol.optgroup.option.output.p.picture.pre.progress.q.rp.rt.ruby.s.samp.search.section.select.shadow.slot.small.source.spacer.span.strike.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.tr.track.tt.u.ul.var.video.wbr".split(".")), WC = lC(/* @__PURE__ */ "svg.a.altglyph.altglyphdef.altglyphitem.animatecolor.animatemotion.animatetransform.circle.clippath.defs.desc.ellipse.enterkeyhint.exportparts.filter.font.g.glyph.glyphref.hkern.image.inputmode.line.lineargradient.marker.mask.metadata.mpath.part.path.pattern.polygon.polyline.radialgradient.rect.stop.style.switch.symbol.text.textpath.title.tref.tspan.view.vkern".split(".")), GC = lC([
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feDropShadow",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence"
]), KC = lC([
	"animate",
	"color-profile",
	"cursor",
	"discard",
	"font-face",
	"font-face-format",
	"font-face-name",
	"font-face-src",
	"font-face-uri",
	"foreignobject",
	"hatch",
	"hatchpath",
	"mesh",
	"meshgradient",
	"meshpatch",
	"meshrow",
	"missing-glyph",
	"script",
	"set",
	"solidcolor",
	"unknown",
	"use"
]), qC = lC(/* @__PURE__ */ "math.menclose.merror.mfenced.mfrac.mglyph.mi.mlabeledtr.mmultiscripts.mn.mo.mover.mpadded.mphantom.mroot.mrow.ms.mspace.msqrt.mstyle.msub.msup.msubsup.mtable.mtd.mtext.mtr.munder.munderover.mprescripts".split(".")), JC = lC([
	"maction",
	"maligngroup",
	"malignmark",
	"mlongdiv",
	"mscarries",
	"mscarry",
	"msgroup",
	"mstack",
	"msline",
	"msrow",
	"semantics",
	"annotation",
	"annotation-xml",
	"mprescripts",
	"none"
]), YC = lC(["#text"]), XC = lC(/* @__PURE__ */ "accept.action.align.alt.autocapitalize.autocomplete.autopictureinpicture.autoplay.background.bgcolor.border.capture.cellpadding.cellspacing.checked.cite.class.clear.color.cols.colspan.command.commandfor.controls.controlslist.coords.crossorigin.datetime.decoding.default.dir.disabled.disablepictureinpicture.disableremoteplayback.download.draggable.enctype.enterkeyhint.exportparts.face.for.headers.height.hidden.high.href.hreflang.id.inert.inputmode.integrity.ismap.kind.label.lang.list.loading.loop.low.max.maxlength.media.method.min.minlength.multiple.muted.name.nonce.noshade.novalidate.nowrap.open.optimum.part.pattern.placeholder.playsinline.popover.popovertarget.popovertargetaction.poster.preload.pubdate.radiogroup.readonly.rel.required.rev.reversed.role.rows.rowspan.spellcheck.scope.selected.shape.size.sizes.slot.span.srclang.start.src.srcset.step.style.summary.tabindex.title.translate.type.usemap.valign.value.width.wrap.xmlns".split(".")), ZC = lC(/* @__PURE__ */ "accent-height.accumulate.additive.alignment-baseline.amplitude.ascent.attributename.attributetype.azimuth.basefrequency.baseline-shift.begin.bias.by.class.clip.clippathunits.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.cx.cy.d.dx.dy.diffuseconstant.direction.display.divisor.dominant-baseline.dur.edgemode.elevation.end.exponent.fill.fill-opacity.fill-rule.filter.filterunits.flood-color.flood-opacity.font-family.font-size.font-size-adjust.font-stretch.font-style.font-variant.font-weight.fx.fy.g1.g2.glyph-name.glyphref.gradientunits.gradienttransform.height.href.id.image-rendering.in.in2.intercept.k.k1.k2.k3.k4.kerning.keypoints.keysplines.keytimes.lang.lengthadjust.letter-spacing.kernelmatrix.kernelunitlength.lighting-color.local.marker-end.marker-mid.marker-start.markerheight.markerunits.markerwidth.maskcontentunits.maskunits.max.mask.mask-type.media.method.mode.min.name.numoctaves.offset.operator.opacity.order.orient.orientation.origin.overflow.paint-order.path.pathlength.patterncontentunits.patterntransform.patternunits.pointer-events.points.preservealpha.preserveaspectratio.primitiveunits.r.rx.ry.radius.refx.refy.repeatcount.repeatdur.restart.result.rotate.scale.seed.shape-rendering.slope.specularconstant.specularexponent.spreadmethod.startoffset.stddeviation.stitchtiles.stop-color.stop-opacity.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke.stroke-width.style.surfacescale.systemlanguage.tabindex.tablevalues.targetx.targety.transform.transform-origin.text-anchor.text-decoration.text-orientation.text-rendering.textlength.type.u1.u2.unicode.values.vector-effect.viewbox.visibility.version.vert-adv-y.vert-origin-x.vert-origin-y.width.word-spacing.wrap.writing-mode.xchannelselector.ychannelselector.x.x1.x2.xmlns.y.y1.y2.z.zoomandpan".split(".")), QC = lC(/* @__PURE__ */ "accent.accentunder.align.bevelled.close.columnalign.columnlines.columnspacing.columnspan.denomalign.depth.dir.display.displaystyle.encoding.fence.frame.height.href.id.largeop.length.linethickness.lquote.lspace.mathbackground.mathcolor.mathsize.mathvariant.maxsize.minsize.movablelimits.notation.numalign.open.rowalign.rowlines.rowspacing.rowspan.rspace.rquote.scriptlevel.scriptminsize.scriptsizemultiplier.selection.separator.separators.stretchy.subscriptshift.supscriptshift.symmetric.voffset.width.xmlns".split(".")), $C = lC([
	"xlink:href",
	"xml:id",
	"xlink:title",
	"xml:space",
	"xmlns:xlink"
]), ew = uC(/{{[\w\W]*|^[\w\W]*}}/g), tw = uC(/<%[\w\W]*|^[\w\W]*%>/g), nw = uC(/\${[\w\W]*/g), rw = uC(/^data-[\-\w.\u00B7-\uFFFF]+$/), iw = uC(/^aria-[\-\w]+$/), aw = uC(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i), ow = uC(/^(?:\w+script|data):/i), sw = uC(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g), cw = uC(/^html$/i), lw = uC(/^[a-z][.\w]*(-[.\w]+)+$/i), uw = uC(/<[/\w!]/g), dw = uC(/<[/\w]/g), fw = uC(/<\/no(script|embed|frames)/i), pw = uC(/\/>/i), mw = {
	element: 1,
	attribute: 2,
	text: 3,
	cdataSection: 4,
	entityReference: 5,
	entityNode: 6,
	processingInstruction: 7,
	comment: 8,
	document: 9,
	documentType: 10,
	documentFragment: 11,
	notation: 12
}, hw = [
	"style",
	"script",
	"xmp",
	"iframe",
	"noembed",
	"noframes",
	"plaintext",
	"noscript"
], gw = lC(LC({}, hw)), _w = function() {
	let e = {};
	return hC(hw, (t) => {
		e[t] = uC(RegExp("</" + t + "(?=[\\t\\n\\f\\r />])", "i"));
	}), lC(e);
}(), vw = function() {
	return typeof window > "u" ? null : window;
}, yw = function(e, t) {
	if (typeof e != "object" || typeof e.createPolicy != "function") return null;
	let n = null, r = "data-tt-policy-suffix";
	t && t.hasAttribute(r) && (n = t.getAttribute(r));
	let i = "dompurify" + (n ? "#" + n : "");
	try {
		return e.createPolicy(i, {
			createHTML(e) {
				return e;
			},
			createScriptURL(e) {
				return e;
			}
		});
	} catch {
		return console.warn("TrustedTypes policy " + i + " could not be created."), null;
	}
}, bw = function() {
	return {
		afterSanitizeAttributes: [],
		afterSanitizeElements: [],
		afterSanitizeShadowDOM: [],
		beforeSanitizeAttributes: [],
		beforeSanitizeElements: [],
		beforeSanitizeShadowDOM: [],
		uponSanitizeAttribute: [],
		uponSanitizeElement: [],
		uponSanitizeShadowNode: []
	};
}, xw = function(e, t, n, r) {
	return jC(e, t) && bC(e[t]) ? LC(r.base ? zC(r.base) : {}, e[t], r.transform) : n;
}, Sw = function(e, t, n) {
	let r = jC(e, t) ? e[t] : void 0;
	return r && typeof r == "object" ? zC(r) : n();
};
function Cw() {
	let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : vw(), t = (e) => Cw(e);
	if (t.version = "3.4.16", t.removed = [], !e || !e.document || e.document.nodeType !== mw.document || !e.Element) return t.isSupported = !1, t;
	let n = e.document, r = n, i = r.currentScript;
	e.DocumentFragment;
	let a = e.HTMLTemplateElement, o = e.Node, s = e.Element, c = e.NodeFilter;
	e.NamedNodeMap === void 0 && (e.NamedNodeMap || e.MozNamedAttrMap), e.HTMLFormElement;
	let l = e.DOMParser, u = e.trustedTypes, d = s.prototype, f = VC(d, "cloneNode"), p = VC(d, "remove"), m = VC(d, "removeAttributeNode"), h = VC(d, "nextSibling"), g = VC(d, "childNodes"), _ = VC(d, "parentNode"), v = VC(d, "shadowRoot"), y = VC(d, "attributes"), b = o && o.prototype ? VC(o.prototype, "nodeType") : null, x = o && o.prototype ? VC(o.prototype, "nodeName") : null, S = o && o.prototype ? VC(o.prototype, "ownerDocument") : null, C = function(e) {
		return b ? b(e) : e.nodeType;
	}, w = function(e) {
		return x ? x(e) : e.nodeName;
	};
	if (typeof a == "function") {
		let e = n.createElement("template");
		e.content && e.content.ownerDocument && (n = e.content.ownerDocument);
	}
	let T, E = "", D, O = !1, k = 0, A = function() {
		if (k > 0) throw PC("A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the \"DOMPurify and Trusted Types\" section of the README.");
	}, j = function(e) {
		A(), k++;
		try {
			return T.createHTML(e);
		} finally {
			k--;
		}
	}, M = function(e) {
		A(), k++;
		try {
			return T.createScriptURL(e);
		} finally {
			k--;
		}
	}, N = function() {
		return O || (D = yw(u, i), O = !0), D;
	}, P = n, ee = P.implementation, te = P.createNodeIterator, F = P.createDocumentFragment, ne = P.getElementsByTagName, I = r.importNode, L = bw();
	t.isSupported = typeof iC == "function" && typeof _ == "function" && ee && ee.createHTMLDocument !== void 0;
	let re = ew, ie = tw, ae = nw, oe = rw, se = iw, ce = ow, le = sw, ue = lw, de = aw, fe = null, pe = LC({}, [
		...UC,
		...WC,
		...GC,
		...qC,
		...YC
	]), me = null, he = LC({}, [
		...XC,
		...ZC,
		...QC,
		...$C
	]), ge = Object.seal(dC(null, {
		tagNameCheck: {
			writable: !0,
			configurable: !1,
			enumerable: !0,
			value: null
		},
		attributeNameCheck: {
			writable: !0,
			configurable: !1,
			enumerable: !0,
			value: null
		},
		allowCustomizedBuiltInElements: {
			writable: !0,
			configurable: !1,
			enumerable: !0,
			value: !1
		}
	})), _e = null, ve = null, ye = Object.seal(dC(null, {
		tagCheck: {
			writable: !0,
			configurable: !1,
			enumerable: !0,
			value: null
		},
		attributeCheck: {
			writable: !0,
			configurable: !1,
			enumerable: !0,
			value: null
		}
	})), be = !0, xe = !0, Se = !1, Ce = !0, we = !1, Te = !0, Ee = !1, De = !1, Oe = null, ke = null, Ae = !1, je = !1, Me = !1, Ne = !1, Pe = !0, Fe = !1, Ie = "user-content-", Le = !0, Re = !1, ze = {}, Be = null, Ve = LC({}, /* @__PURE__ */ "annotation-xml.audio.colgroup.desc.foreignobject.head.iframe.math.mi.mn.mo.ms.mtext.noembed.noframes.noscript.plaintext.script.selectedcontent.style.svg.template.thead.title.video.xmp".split(".")), He = null, Ue = LC({}, [
		"audio",
		"video",
		"img",
		"source",
		"image",
		"track"
	]), We = null, Ge = LC({}, [
		"alt",
		"class",
		"for",
		"id",
		"label",
		"name",
		"pattern",
		"placeholder",
		"role",
		"summary",
		"title",
		"value",
		"style",
		"xmlns"
	]), Ke = "http://www.w3.org/1998/Math/MathML", qe = "http://www.w3.org/2000/svg", Je = "http://www.w3.org/1999/xhtml", Ye = Je, Xe = !1, Ze = null, Qe = LC({}, [
		Ke,
		qe,
		Je
	], SC), $e = lC([
		"mi",
		"mo",
		"mn",
		"ms",
		"mtext"
	]), et = LC({}, $e), tt = lC(["annotation-xml"]), nt = LC({}, tt), rt = LC({}, [
		"title",
		"style",
		"font",
		"a",
		"script"
	]), it = null, at = ["application/xhtml+xml", "text/html"], ot = null, st = null, ct = n.createElement("form"), lt = function(e) {
		return e instanceof RegExp || e instanceof Function;
	}, ut = function() {
		let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		if (st && st === e) return;
		(!e || typeof e != "object") && (e = {}), e = zC(e), it = at.indexOf(e.PARSER_MEDIA_TYPE) === -1 ? "text/html" : e.PARSER_MEDIA_TYPE, ot = it === "application/xhtml+xml" ? SC : xC, fe = xw(e, "ALLOWED_TAGS", pe, { transform: ot }), me = xw(e, "ALLOWED_ATTR", he, { transform: ot }), Ze = xw(e, "ALLOWED_NAMESPACES", Qe, { transform: SC }), We = xw(e, "ADD_URI_SAFE_ATTR", Ge, {
			transform: ot,
			base: Ge
		}), He = xw(e, "ADD_DATA_URI_TAGS", Ue, {
			transform: ot,
			base: Ue
		}), Be = xw(e, "FORBID_CONTENTS", Ve, { transform: ot }), _e = xw(e, "FORBID_TAGS", zC({}), { transform: ot }), ve = xw(e, "FORBID_ATTR", zC({}), { transform: ot }), ze = jC(e, "USE_PROFILES") ? e.USE_PROFILES && typeof e.USE_PROFILES == "object" ? zC(e.USE_PROFILES) : e.USE_PROFILES : !1, be = e.ALLOW_ARIA_ATTR !== !1, xe = e.ALLOW_DATA_ATTR !== !1, Se = e.ALLOW_UNKNOWN_PROTOCOLS || !1, Ce = e.ALLOW_SELF_CLOSE_IN_ATTR !== !1, we = e.SAFE_FOR_TEMPLATES || !1, Te = e.SAFE_FOR_XML !== !1, Ee = e.WHOLE_DOCUMENT || !1, je = e.RETURN_DOM || !1, Me = e.RETURN_DOM_FRAGMENT || !1, Ne = e.RETURN_TRUSTED_TYPE || !1, Ae = e.FORCE_BODY || !1, Pe = e.SANITIZE_DOM !== !1, Fe = e.SANITIZE_NAMED_PROPS || !1, Le = e.KEEP_CONTENT !== !1, Re = e.IN_PLACE || !1, de = HC(e.ALLOWED_URI_REGEXP) ? e.ALLOWED_URI_REGEXP : aw, Ye = typeof e.NAMESPACE == "string" ? e.NAMESPACE : Je, et = Sw(e, "MATHML_TEXT_INTEGRATION_POINTS", () => LC({}, $e)), nt = Sw(e, "HTML_INTEGRATION_POINTS", () => LC({}, tt));
		let t = Sw(e, "CUSTOM_ELEMENT_HANDLING", () => dC(null));
		if (ge = dC(null), jC(t, "tagNameCheck") && lt(t.tagNameCheck) && (ge.tagNameCheck = t.tagNameCheck), jC(t, "attributeNameCheck") && lt(t.attributeNameCheck) && (ge.attributeNameCheck = t.attributeNameCheck), jC(t, "allowCustomizedBuiltInElements") && typeof t.allowCustomizedBuiltInElements == "boolean" && (ge.allowCustomizedBuiltInElements = t.allowCustomizedBuiltInElements), uC(ge), we && (xe = !1), Me && (je = !0), ze && (fe = LC({}, YC), me = dC(null), ze.html === !0 && (LC(fe, UC), LC(me, XC)), ze.svg === !0 && (LC(fe, WC), LC(me, ZC), LC(me, $C)), ze.svgFilters === !0 && (LC(fe, GC), LC(me, ZC), LC(me, $C)), ze.mathMl === !0 && (LC(fe, qC), LC(me, QC), LC(me, $C))), ye.tagCheck = null, ye.attributeCheck = null, jC(e, "ADD_TAGS") && (typeof e.ADD_TAGS == "function" ? ye.tagCheck = e.ADD_TAGS : bC(e.ADD_TAGS) && (fe === pe && (fe = zC(fe)), LC(fe, e.ADD_TAGS, ot))), jC(e, "ADD_ATTR") && (typeof e.ADD_ATTR == "function" ? ye.attributeCheck = e.ADD_ATTR : bC(e.ADD_ATTR) && (me === he && (me = zC(me)), LC(me, e.ADD_ATTR, ot))), jC(e, "ADD_FORBID_CONTENTS") && bC(e.ADD_FORBID_CONTENTS) && (Be === Ve && (Be = zC(Be)), LC(Be, e.ADD_FORBID_CONTENTS, ot)), Le && (fe["#text"] = !0), Ee && LC(fe, [
			"html",
			"head",
			"body"
		]), fe.table && (LC(fe, ["tbody"]), delete _e.tbody), e.TRUSTED_TYPES_POLICY) {
			if (typeof e.TRUSTED_TYPES_POLICY.createHTML != "function") throw PC("TRUSTED_TYPES_POLICY configuration option must provide a \"createHTML\" hook.");
			if (typeof e.TRUSTED_TYPES_POLICY.createScriptURL != "function") throw PC("TRUSTED_TYPES_POLICY configuration option must provide a \"createScriptURL\" hook.");
			let t = T;
			T = e.TRUSTED_TYPES_POLICY;
			try {
				E = j("");
			} catch (e) {
				throw T = t, e;
			}
		} else e.TRUSTED_TYPES_POLICY === null ? (T = void 0, E = "") : (T === void 0 && (T = N()), T && typeof E == "string" && (E = j("")));
		lC && lC(e), st = e;
	}, dt = LC({}, [
		...WC,
		...GC,
		...KC
	]), ft = LC({}, [...qC, ...JC]), pt = function(e, t, n) {
		return t.namespaceURI === Je ? e === "svg" : t.namespaceURI === Ke ? e === "svg" && (n === "annotation-xml" || et[n]) : !!dt[e];
	}, mt = function(e, t, n) {
		return t.namespaceURI === Je ? e === "math" : t.namespaceURI === qe ? e === "math" && nt[n] : !!ft[e];
	}, ht = function(e, t, n) {
		return t.namespaceURI === qe && !nt[n] || t.namespaceURI === Ke && !et[n] ? !1 : !ft[e] && (rt[e] || !dt[e]);
	}, gt = function(e) {
		let t = _(e);
		(!t || !t.tagName) && (t = {
			namespaceURI: Ye,
			tagName: "template"
		});
		let n = xC(e.tagName), r = xC(t.tagName);
		return Ze[e.namespaceURI] ? e.namespaceURI === qe ? pt(n, t, r) : e.namespaceURI === Ke ? mt(n, t, r) : e.namespaceURI === Je ? ht(n, t, r) : !!(it === "application/xhtml+xml" && Ze[e.namespaceURI]) : !1;
	}, _t = function(e) {
		vC(t.removed, { element: e });
		try {
			_(e).removeChild(e);
		} catch {
			if (p(e), !_(e)) throw PC("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
		}
	}, vt = function(e, t, n) {
		try {
			m(e, t);
		} catch {
			try {
				e.removeAttribute(n);
			} catch {}
		}
	}, yt = function(e) {
		St(e);
		let t = g(e);
		if (t) {
			let e = [];
			hC(t, (t) => {
				vC(e, t);
			}), hC(e, (e) => {
				try {
					p(e);
				} catch {}
			});
		}
		let n = y(e);
		if (n) for (let t = n.length - 1; t >= 0; --t) {
			let r = n[t], i = r && r.name;
			typeof i == "string" && vt(e, r, i);
		}
	}, bt = function(e, n, r) {
		if (!r) try {
			r = n.getAttributeNode(e);
		} catch {
			r = null;
		}
		vC(t.removed, {
			attribute: r || null,
			from: n
		});
		try {
			r ? m(n, r) : n.removeAttribute(e);
		} catch {
			try {
				n.removeAttribute(e);
			} catch {}
		}
		if (e === "is") {
			if (je || Me) try {
				_t(n);
			} catch {}
			else try {
				n.setAttribute(e, "");
			} catch {}
		}
	}, xt = function(e) {
		let t = y(e);
		if (t) for (let n = t.length - 1; n >= 0; --n) {
			let r = t[n], i = r && r.name;
			typeof i != "string" || me[ot(i)] || vt(e, r, i);
		}
	}, St = function(e) {
		let t = [e];
		for (; t.length > 0;) {
			let e = t.pop();
			C(e) === mw.element && xt(e);
			let n = g(e);
			if (n) for (let e = n.length - 1; e >= 0; --e) t.push(n[e]);
		}
	}, Ct = function(e, t) {
		return Te ? e === "patchsrc" || e === "for" && t !== "label" && t !== "output" : !1;
	}, wt = function(e) {
		if (!Te) return;
		let t = [e];
		for (; t.length > 0;) {
			let e = t.pop(), n = C(e);
			if (n === mw.processingInstruction || n === mw.comment && NC(dw, e.data)) {
				try {
					p(e);
				} catch {}
				continue;
			}
			if (n === mw.element) {
				let t = e, n = ot(w(e));
				try {
					t.hasAttribute && t.hasAttribute("patchsrc") && t.removeAttribute("patchsrc"), t.hasAttribute && t.hasAttribute("for") && Ct("for", n) && t.removeAttribute("for");
				} catch {}
			}
			let r = g(e);
			if (r) for (let e = r.length - 1; e >= 0; --e) t.push(r[e]);
		}
	}, Tt = function(e) {
		let t = null, r = null;
		if (Ae) e = "<remove></remove>" + e;
		else {
			let t = CC(e, /^[\r\n\t ]+/);
			r = t && t[0];
		}
		it === "application/xhtml+xml" && Ye === Je && (e = "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head></head><body>" + e + "</body></html>");
		let i = T ? j(e) : e;
		if (Ye === Je) try {
			t = new l().parseFromString(i, it);
		} catch {}
		if (!t || !t.documentElement) {
			t = ee.createDocument(Ye, "template", null);
			try {
				t.documentElement.innerHTML = Xe ? E : i;
			} catch {}
		}
		let a = t.body || t.documentElement;
		return e && r && a.insertBefore(n.createTextNode(r), a.childNodes[0] || null), Ye === Je ? ne.call(t, Ee ? "html" : "body")[0] : Ee ? t.documentElement : a;
	}, Et = function(e) {
		let t = S ? S(e) : e.ownerDocument;
		return te.call(t || e, e, c.SHOW_ELEMENT | c.SHOW_COMMENT | c.SHOW_TEXT | c.SHOW_PROCESSING_INSTRUCTION | c.SHOW_CDATA_SECTION, null);
	}, Dt = function(e) {
		return e = wC(e, re, " "), e = wC(e, ie, " "), e = wC(e, ae, " "), e;
	}, Ot = function(e) {
		var t;
		e.normalize();
		let n = S ? S(e) : e.ownerDocument, r = te.call(n || e, e, c.SHOW_TEXT | c.SHOW_COMMENT | c.SHOW_CDATA_SECTION | c.SHOW_PROCESSING_INSTRUCTION, null), i = r.nextNode();
		for (; i;) i.data = Dt(i.data), i = r.nextNode();
		let a = (t = e.querySelectorAll) == null ? void 0 : t.call(e, "template");
		a && hC(a, (e) => {
			At(e.content) && Ot(e.content);
		});
	}, kt = function(e) {
		let t = x ? x(e) : null;
		return typeof t != "string" || ot(t) !== "form" ? !1 : typeof e.nodeName != "string" || typeof e.textContent != "string" || typeof e.removeChild != "function" || e.attributes !== y(e) || typeof e.removeAttribute != "function" || typeof e.removeAttributeNode != "function" || typeof e.getAttributeNode != "function" || typeof e.setAttribute != "function" || typeof e.namespaceURI != "string" || typeof e.insertBefore != "function" || typeof e.hasChildNodes != "function" || e.nodeType !== b(e) || e.childNodes !== g(e);
	}, At = function(e) {
		if (!b || typeof e != "object" || !e) return !1;
		try {
			return b(e) === mw.documentFragment;
		} catch {
			return !1;
		}
	}, jt = function(e) {
		if (!b || typeof e != "object" || !e) return !1;
		try {
			return typeof b(e) == "number";
		} catch {
			return !1;
		}
	};
	function Mt(e, n, r) {
		e.length !== 0 && hC(e, (e) => {
			e.call(t, n, r, st);
		});
	}
	let Nt = function(e, t) {
		return !!(Te && e.hasChildNodes() && !jt(e.firstElementChild) && NC(uw, e.textContent) && NC(uw, e.innerHTML) || Te && e.namespaceURI === Je && gw[t] && (jt(e.firstElementChild) || typeof e.textContent == "string" && NC(_w[t], e.textContent)) || e.nodeType === mw.processingInstruction || Te && e.nodeType === mw.comment && NC(dw, e.data));
	}, Pt = function(e, t) {
		return e instanceof RegExp ? NC(e, t) : e instanceof Function && !!e(t, ...[...arguments].slice(2));
	}, Ft = function(e, t, n) {
		if (!_e[t] && Vt(t) && Pt(ge.tagNameCheck, t)) return !1;
		if (Le && !Be[t]) {
			let t = _(e), r = g(e);
			if (r && t) {
				let i = r.length;
				for (let a = i - 1; a >= 0; --a) {
					let i = e === n ? f(r[a], !0) : r[a];
					t.insertBefore(i, h(e));
				}
			}
		}
		return _t(e), !0;
	}, It = function(e, t, n, r) {
		return e.length === 0 ? t : t === n || t === r ? zC(t) : t;
	}, Lt = function(e, t) {
		return e === t || _(e) !== null ? !1 : (Re && St(e), !0);
	}, Rt = function(e, n) {
		if (Mt(L.beforeSanitizeElements, e, null), Lt(e, n)) return !0;
		if (kt(e)) return _t(e), !0;
		let r = ot(w(e));
		if (fe = It(L.uponSanitizeElement, fe, pe, Oe), Mt(L.uponSanitizeElement, e, {
			tagName: r,
			allowedTags: fe
		}), Lt(e, n)) return !0;
		if (Nt(e, r)) return _t(e), !0;
		if (_e[r] || !(ye.tagCheck instanceof Function && ye.tagCheck(r)) && !fe[r]) {
			let t = Ft(e, r, n);
			return t === !1 && (Mt(L.afterSanitizeElements, e, null), Lt(e, n)) ? !0 : t;
		}
		if (C(e) === mw.element && !gt(e) || (r === "noscript" || r === "noembed" || r === "noframes") && NC(fw, e.innerHTML)) return _t(e), !0;
		if (we && e.nodeType === mw.text) {
			let n = Dt(e.textContent);
			e.textContent !== n && (vC(t.removed, { element: e.cloneNode() }), e.textContent = n);
		}
		return Mt(L.afterSanitizeElements, e, null), Lt(e, n);
	}, zt = function(e, t, r) {
		if (ve[t] || Ct(t, e) || Pe && (t === "id" || t === "name") && (r in n || r in ct)) return !1;
		let i = me[t] || ye.attributeCheck instanceof Function && ye.attributeCheck(t, e);
		return xe && NC(oe, t) || be && NC(se, t) ? !0 : i ? We[t] || NC(de, wC(r, le, "")) || (t === "src" || t === "xlink:href" || t === "href") && e !== "script" && TC(r, "data:") === 0 && He[e] || Se && !NC(ce, wC(r, le, "")) ? !0 : !r : Vt(e) && Pt(ge.tagNameCheck, e) && Pt(ge.attributeNameCheck, t, e) || t === "is" && ge.allowCustomizedBuiltInElements && Pt(ge.tagNameCheck, r);
	}, Bt = LC({}, [
		"annotation-xml",
		"color-profile",
		"font-face",
		"font-face-format",
		"font-face-name",
		"font-face-src",
		"font-face-uri",
		"missing-glyph"
	]), Vt = function(e) {
		return !Bt[xC(e)] && NC(ue, e);
	}, Ht = function(e, t, n, r) {
		if (T && typeof u == "object" && typeof u.getAttributeType == "function" && !n) switch (u.getAttributeType(e, t)) {
			case "TrustedHTML": return j(r);
			case "TrustedScriptURL": return M(r);
		}
		return r;
	}, Ut = function(e, t, n, r) {
		try {
			return n ? e.setAttributeNS(n, t, r) : e.setAttribute(t, r), !kt(e) || (_t(e), !1);
		} catch {
			return bt(t, e), !1;
		}
	}, Wt = function(e, n) {
		if (Mt(L.beforeSanitizeAttributes, e, null), Lt(e, n)) return;
		let r = e.attributes;
		if (!r || kt(e)) return;
		me = It(L.uponSanitizeAttribute, me, he, ke);
		let i = {
			attrName: "",
			attrValue: "",
			keepAttr: !0,
			allowedAttributes: me,
			forceKeepAttr: void 0
		}, a = r.length, o = ot(e.nodeName);
		for (; a--;) {
			let n = r[a], s = n.name, c = n.namespaceURI, l = n.value, u = ot(s), d = l, f = s === "value" ? d : EC(d), p = !1;
			if (i.attrName = u, i.attrValue = f, i.keepAttr = !0, i.forceKeepAttr = void 0, Mt(L.uponSanitizeAttribute, e, i), f = i.attrValue, Fe && (u === "id" || u === "name") && TC(f, Ie) !== 0 && (bt(s, e, n), f = Ie + f, p = !0), Te && NC(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, f)) {
				bt(s, e, n);
				continue;
			}
			if (u === "attributename" && CC(f, "href")) {
				bt(s, e, n);
				continue;
			}
			if (!i.forceKeepAttr) {
				if (!i.keepAttr) {
					bt(s, e, n);
					continue;
				}
				if (!Ce && NC(pw, f)) {
					bt(s, e, n);
					continue;
				}
				if (we && (f = Dt(f)), !zt(o, u, f)) {
					bt(s, e, n);
					continue;
				}
				f = Ht(o, u, c, f), f !== d && Ut(e, s, c, f) && p && _C(t.removed);
			}
		}
		Mt(L.afterSanitizeAttributes, e, null), Lt(e, n);
	}, Gt = function(e) {
		let t = null, n = Et(e);
		for (Mt(L.beforeSanitizeShadowDOM, e, null); t = n.nextNode();) if (Mt(L.uponSanitizeShadowNode, t, null), Rt(t, e), Wt(t, e), At(t.content) && Gt(t.content), C(t) === mw.element) {
			let e = v(t);
			At(e) && (Kt(e), Gt(e));
		}
		Mt(L.afterSanitizeShadowDOM, e, null);
	}, Kt = function(e) {
		let t = [{
			node: e,
			shadow: null
		}];
		for (; t.length > 0;) {
			let e = t.pop();
			if (e.shadow) {
				Gt(e.shadow);
				continue;
			}
			let n = e.node, r = C(n) === mw.element, i = g(n);
			if (i) for (let e = i.length - 1; e >= 0; --e) t.push({
				node: i[e],
				shadow: null
			});
			if (r) {
				let e = x ? x(n) : null;
				if (typeof e == "string" && ot(e) === "template") {
					let e = n.content;
					At(e) && t.push({
						node: e,
						shadow: null
					});
				}
			}
			if (r) {
				let e = v(n);
				At(e) && t.push({
					node: null,
					shadow: e
				}, {
					node: e,
					shadow: null
				});
			}
		}
	};
	return t.sanitize = function(e) {
		let n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, i = null, a = null, o = null, s = null;
		if (Xe = !e, Xe && (e = "<!-->"), typeof e != "string" && !jt(e) && (e = BC(e), typeof e != "string")) throw PC("dirty is not a string, aborting");
		if (!t.isSupported) return e;
		De ? (fe = Oe, me = ke) : ut(n), (L.uponSanitizeElement.length > 0 || L.uponSanitizeAttribute.length > 0) && (fe = zC(fe)), L.uponSanitizeAttribute.length > 0 && (me = zC(me)), t.removed = [];
		let c = Re && typeof e != "string" && jt(e);
		if (c) {
			wt(e);
			let t = w(e);
			if (typeof t == "string") {
				let n = ot(t);
				if (!fe[n] || _e[n]) throw yt(e), PC("root node is forbidden and cannot be sanitized in-place");
			}
			if (kt(e)) throw yt(e), PC("root node is clobbered and cannot be sanitized in-place");
			try {
				Kt(e);
			} catch (t) {
				throw yt(e), t;
			}
		} else if (jt(e)) i = Tt("<!---->"), a = i.ownerDocument.importNode(e, !0), a.nodeType === mw.element && a.nodeName === "BODY" || a.nodeName === "HTML" ? i = a : i.appendChild(a), Kt(i);
		else {
			if (!je && !we && !Ee && e.indexOf("<") === -1) return T && Ne ? j(e) : e;
			if (i = Tt(e), !i) return je ? null : Ne ? E : "";
		}
		i && Ae && _t(i.firstChild);
		let l = c ? e : i;
		try {
			let e = Et(l);
			for (; o = e.nextNode();) Rt(o, l), Wt(o, l), At(o.content) && Gt(o.content);
		} catch (n) {
			throw c && (yt(e), hC(t.removed, (e) => {
				e.element && St(e.element);
			})), n;
		}
		if (c) {
			let n = !1;
			if (hC(t.removed, (t) => {
				t.element && (t.element === e && (n = !0), St(t.element));
			}), n) throw PC("a node selected for removal could not be safely returned; refusing to sanitize in place");
			return we && Ot(e), e;
		}
		if (je) {
			if (we && Ot(i), Me) for (s = F.call(i.ownerDocument); i.firstChild;) s.appendChild(i.firstChild);
			else s = i;
			return (me.shadowroot || me.shadowrootmode) && (s = I.call(r, s, !0)), s;
		}
		let u = Ee ? i.outerHTML : i.innerHTML;
		return Ee && fe["!doctype"] && i.ownerDocument && i.ownerDocument.doctype && i.ownerDocument.doctype.name && NC(cw, i.ownerDocument.doctype.name) && (u = "<!DOCTYPE " + i.ownerDocument.doctype.name + ">\n" + u), we && (u = Dt(u)), T && Ne ? j(u) : u;
	}, t.setConfig = function() {
		let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		ut(e), De = !0, Oe = fe, ke = me;
	}, t.clearConfig = function() {
		st = null, De = !1, Oe = null, ke = null, T = D, E = "";
	}, t.isValidAttribute = function(e, t, n) {
		st || ut({});
		let r = ot(e), i = ot(t);
		return zt(r, i, n);
	}, t.addHook = function(e, t) {
		typeof t == "function" && jC(L, e) && vC(L[e], t);
	}, t.removeHook = function(e, t) {
		if (jC(L, e)) {
			if (t !== void 0) {
				let n = gC(L[e], t);
				return n === -1 ? void 0 : yC(L[e], n, 1)[0];
			}
			return _C(L[e]);
		}
	}, t.removeHooks = function(e) {
		jC(L, e) && (L[e] = []);
	}, t.removeAllHooks = function() {
		L = bw();
	}, t;
}
var ww = Cw(), Tw = Object.defineProperty, Ew = Object.getOwnPropertySymbols, Dw = Object.prototype.hasOwnProperty, Ow = Object.prototype.propertyIsEnumerable, kw = (e, t, n) => t in e ? Tw(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Aw = (e, t) => {
	for (var n in t || (t = {})) Dw.call(t, n) && kw(e, n, t[n]);
	if (Ew) for (var n of Ew(t)) Ow.call(t, n) && kw(e, n, t[n]);
	return e;
}, jw = (e, t) => {
	var n = {};
	for (var r in e) Dw.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
	if (e != null && Ew) for (var r of Ew(e)) t.indexOf(r) < 0 && Ow.call(e, r) && (n[r] = e[r]);
	return n;
}, Mw;
((e) => {
	let t = class t {
		constructor(e, n, r, a) {
			if (this.version = e, this.errorCorrectionLevel = n, this.modules = [], this.isFunction = [], e < t.MIN_VERSION || e > t.MAX_VERSION) throw RangeError("Version value out of range");
			if (a < -1 || a > 7) throw RangeError("Mask value out of range");
			this.size = e * 4 + 17;
			let o = [];
			for (let e = 0; e < this.size; e++) o.push(!1);
			for (let e = 0; e < this.size; e++) this.modules.push(o.slice()), this.isFunction.push(o.slice());
			this.drawFunctionPatterns();
			let s = this.addEccAndInterleave(r);
			if (this.drawCodewords(s), a == -1) {
				let e = 1e9;
				for (let t = 0; t < 8; t++) {
					this.applyMask(t), this.drawFormatBits(t);
					let n = this.getPenaltyScore();
					n < e && (a = t, e = n), this.applyMask(t);
				}
			}
			i(0 <= a && a <= 7), this.mask = a, this.applyMask(a), this.drawFormatBits(a), this.isFunction = [];
		}
		static encodeText(n, r) {
			let i = e.QrSegment.makeSegments(n);
			return t.encodeSegments(i, r);
		}
		static encodeBinary(n, r) {
			let i = e.QrSegment.makeBytes(n);
			return t.encodeSegments([i], r);
		}
		static encodeSegments(e, r, a = 1, s = 40, c = -1, l = !0) {
			if (!(t.MIN_VERSION <= a && a <= s && s <= t.MAX_VERSION) || c < -1 || c > 7) throw RangeError("Invalid value");
			let u, d;
			for (u = a;; u++) {
				let n = t.getNumDataCodewords(u, r) * 8, i = o.getTotalBits(e, u);
				if (i <= n) {
					d = i;
					break;
				}
				if (u >= s) throw RangeError("Data too long");
			}
			for (let e of [
				t.Ecc.MEDIUM,
				t.Ecc.QUARTILE,
				t.Ecc.HIGH
			]) l && d <= t.getNumDataCodewords(u, e) * 8 && (r = e);
			let f = [];
			for (let t of e) {
				n(t.mode.modeBits, 4, f), n(t.numChars, t.mode.numCharCountBits(u), f);
				for (let e of t.getData()) f.push(e);
			}
			i(f.length == d);
			let p = t.getNumDataCodewords(u, r) * 8;
			i(f.length <= p), n(0, Math.min(4, p - f.length), f), n(0, (8 - f.length % 8) % 8, f), i(f.length % 8 == 0);
			for (let e = 236; f.length < p; e ^= 253) n(e, 8, f);
			let m = [];
			for (; m.length * 8 < f.length;) m.push(0);
			return f.forEach((e, t) => m[t >>> 3] |= e << 7 - (t & 7)), new t(u, r, m, c);
		}
		getModule(e, t) {
			return 0 <= e && e < this.size && 0 <= t && t < this.size && this.modules[t][e];
		}
		getModules() {
			return this.modules;
		}
		drawFunctionPatterns() {
			for (let e = 0; e < this.size; e++) this.setFunctionModule(6, e, e % 2 == 0), this.setFunctionModule(e, 6, e % 2 == 0);
			this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
			let e = this.getAlignmentPatternPositions(), t = e.length;
			for (let n = 0; n < t; n++) for (let r = 0; r < t; r++) n == 0 && r == 0 || n == 0 && r == t - 1 || n == t - 1 && r == 0 || this.drawAlignmentPattern(e[n], e[r]);
			this.drawFormatBits(0), this.drawVersion();
		}
		drawFormatBits(e) {
			let t = this.errorCorrectionLevel.formatBits << 3 | e, n = t;
			for (let e = 0; e < 10; e++) n = n << 1 ^ (n >>> 9) * 1335;
			let a = (t << 10 | n) ^ 21522;
			i(!(a >>> 15));
			for (let e = 0; e <= 5; e++) this.setFunctionModule(8, e, r(a, e));
			this.setFunctionModule(8, 7, r(a, 6)), this.setFunctionModule(8, 8, r(a, 7)), this.setFunctionModule(7, 8, r(a, 8));
			for (let e = 9; e < 15; e++) this.setFunctionModule(14 - e, 8, r(a, e));
			for (let e = 0; e < 8; e++) this.setFunctionModule(this.size - 1 - e, 8, r(a, e));
			for (let e = 8; e < 15; e++) this.setFunctionModule(8, this.size - 15 + e, r(a, e));
			this.setFunctionModule(8, this.size - 8, !0);
		}
		drawVersion() {
			if (this.version < 7) return;
			let e = this.version;
			for (let t = 0; t < 12; t++) e = e << 1 ^ (e >>> 11) * 7973;
			let t = this.version << 12 | e;
			i(!(t >>> 18));
			for (let e = 0; e < 18; e++) {
				let n = r(t, e), i = this.size - 11 + e % 3, a = Math.floor(e / 3);
				this.setFunctionModule(i, a, n), this.setFunctionModule(a, i, n);
			}
		}
		drawFinderPattern(e, t) {
			for (let n = -4; n <= 4; n++) for (let r = -4; r <= 4; r++) {
				let i = Math.max(Math.abs(r), Math.abs(n)), a = e + r, o = t + n;
				0 <= a && a < this.size && 0 <= o && o < this.size && this.setFunctionModule(a, o, i != 2 && i != 4);
			}
		}
		drawAlignmentPattern(e, t) {
			for (let n = -2; n <= 2; n++) for (let r = -2; r <= 2; r++) this.setFunctionModule(e + r, t + n, Math.max(Math.abs(r), Math.abs(n)) != 1);
		}
		setFunctionModule(e, t, n) {
			this.modules[t][e] = n, this.isFunction[t][e] = !0;
		}
		addEccAndInterleave(e) {
			let n = this.version, r = this.errorCorrectionLevel;
			if (e.length != t.getNumDataCodewords(n, r)) throw RangeError("Invalid argument");
			let a = t.NUM_ERROR_CORRECTION_BLOCKS[r.ordinal][n], o = t.ECC_CODEWORDS_PER_BLOCK[r.ordinal][n], s = Math.floor(t.getNumRawDataModules(n) / 8), c = a - s % a, l = Math.floor(s / a), u = [], d = t.reedSolomonComputeDivisor(o);
			for (let n = 0, r = 0; n < a; n++) {
				let i = e.slice(r, r + l - o + (n < c ? 0 : 1));
				r += i.length;
				let a = t.reedSolomonComputeRemainder(i, d);
				n < c && i.push(0), u.push(i.concat(a));
			}
			let f = [];
			for (let e = 0; e < u[0].length; e++) u.forEach((t, n) => {
				(e != l - o || n >= c) && f.push(t[e]);
			});
			return i(f.length == s), f;
		}
		drawCodewords(e) {
			if (e.length != Math.floor(t.getNumRawDataModules(this.version) / 8)) throw RangeError("Invalid argument");
			let n = 0;
			for (let t = this.size - 1; t >= 1; t -= 2) {
				t == 6 && (t = 5);
				for (let i = 0; i < this.size; i++) for (let a = 0; a < 2; a++) {
					let o = t - a, s = t + 1 & 2 ? i : this.size - 1 - i;
					!this.isFunction[s][o] && n < e.length * 8 && (this.modules[s][o] = r(e[n >>> 3], 7 - (n & 7)), n++);
				}
			}
			i(n == e.length * 8);
		}
		applyMask(e) {
			if (e < 0 || e > 7) throw RangeError("Mask value out of range");
			for (let t = 0; t < this.size; t++) for (let n = 0; n < this.size; n++) {
				let r;
				switch (e) {
					case 0:
						r = (n + t) % 2 == 0;
						break;
					case 1:
						r = t % 2 == 0;
						break;
					case 2:
						r = n % 3 == 0;
						break;
					case 3:
						r = (n + t) % 3 == 0;
						break;
					case 4:
						r = (Math.floor(n / 3) + Math.floor(t / 2)) % 2 == 0;
						break;
					case 5:
						r = n * t % 2 + n * t % 3 == 0;
						break;
					case 6:
						r = (n * t % 2 + n * t % 3) % 2 == 0;
						break;
					case 7:
						r = ((n + t) % 2 + n * t % 3) % 2 == 0;
						break;
					default: throw Error("Unreachable");
				}
				!this.isFunction[t][n] && r && (this.modules[t][n] = !this.modules[t][n]);
			}
		}
		getPenaltyScore() {
			let e = 0;
			for (let n = 0; n < this.size; n++) {
				let r = !1, i = 0, a = [
					0,
					0,
					0,
					0,
					0,
					0,
					0
				];
				for (let o = 0; o < this.size; o++) this.modules[n][o] == r ? (i++, i == 5 ? e += t.PENALTY_N1 : i > 5 && e++) : (this.finderPenaltyAddHistory(i, a), r || (e += this.finderPenaltyCountPatterns(a) * t.PENALTY_N3), r = this.modules[n][o], i = 1);
				e += this.finderPenaltyTerminateAndCount(r, i, a) * t.PENALTY_N3;
			}
			for (let n = 0; n < this.size; n++) {
				let r = !1, i = 0, a = [
					0,
					0,
					0,
					0,
					0,
					0,
					0
				];
				for (let o = 0; o < this.size; o++) this.modules[o][n] == r ? (i++, i == 5 ? e += t.PENALTY_N1 : i > 5 && e++) : (this.finderPenaltyAddHistory(i, a), r || (e += this.finderPenaltyCountPatterns(a) * t.PENALTY_N3), r = this.modules[o][n], i = 1);
				e += this.finderPenaltyTerminateAndCount(r, i, a) * t.PENALTY_N3;
			}
			for (let n = 0; n < this.size - 1; n++) for (let r = 0; r < this.size - 1; r++) {
				let i = this.modules[n][r];
				i == this.modules[n][r + 1] && i == this.modules[n + 1][r] && i == this.modules[n + 1][r + 1] && (e += t.PENALTY_N2);
			}
			let n = 0;
			for (let e of this.modules) n = e.reduce((e, t) => e + +!!t, n);
			let r = this.size * this.size, a = Math.ceil(Math.abs(n * 20 - r * 10) / r) - 1;
			return i(0 <= a && a <= 9), e += a * t.PENALTY_N4, i(0 <= e && e <= 2568888), e;
		}
		getAlignmentPatternPositions() {
			if (this.version == 1) return [];
			{
				let e = Math.floor(this.version / 7) + 2, t = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (e * 2 - 2)) * 2, n = [6];
				for (let r = this.size - 7; n.length < e; r -= t) n.splice(1, 0, r);
				return n;
			}
		}
		static getNumRawDataModules(e) {
			if (e < t.MIN_VERSION || e > t.MAX_VERSION) throw RangeError("Version number out of range");
			let n = (16 * e + 128) * e + 64;
			if (e >= 2) {
				let t = Math.floor(e / 7) + 2;
				n -= (25 * t - 10) * t - 55, e >= 7 && (n -= 36);
			}
			return i(208 <= n && n <= 29648), n;
		}
		static getNumDataCodewords(e, n) {
			return Math.floor(t.getNumRawDataModules(e) / 8) - t.ECC_CODEWORDS_PER_BLOCK[n.ordinal][e] * t.NUM_ERROR_CORRECTION_BLOCKS[n.ordinal][e];
		}
		static reedSolomonComputeDivisor(e) {
			if (e < 1 || e > 255) throw RangeError("Degree out of range");
			let n = [];
			for (let t = 0; t < e - 1; t++) n.push(0);
			n.push(1);
			let r = 1;
			for (let i = 0; i < e; i++) {
				for (let e = 0; e < n.length; e++) n[e] = t.reedSolomonMultiply(n[e], r), e + 1 < n.length && (n[e] ^= n[e + 1]);
				r = t.reedSolomonMultiply(r, 2);
			}
			return n;
		}
		static reedSolomonComputeRemainder(e, n) {
			let r = n.map((e) => 0);
			for (let i of e) {
				let e = i ^ r.shift();
				r.push(0), n.forEach((n, i) => r[i] ^= t.reedSolomonMultiply(n, e));
			}
			return r;
		}
		static reedSolomonMultiply(e, t) {
			if (e >>> 8 || t >>> 8) throw RangeError("Byte out of range");
			let n = 0;
			for (let r = 7; r >= 0; r--) n = n << 1 ^ (n >>> 7) * 285, n ^= (t >>> r & 1) * e;
			return i(!(n >>> 8)), n;
		}
		finderPenaltyCountPatterns(e) {
			let t = e[1];
			i(t <= this.size * 3);
			let n = t > 0 && e[2] == t && e[3] == t * 3 && e[4] == t && e[5] == t;
			return (n && e[0] >= t * 4 && e[6] >= t ? 1 : 0) + (n && e[6] >= t * 4 && e[0] >= t ? 1 : 0);
		}
		finderPenaltyTerminateAndCount(e, t, n) {
			return e && (this.finderPenaltyAddHistory(t, n), t = 0), t += this.size, this.finderPenaltyAddHistory(t, n), this.finderPenaltyCountPatterns(n);
		}
		finderPenaltyAddHistory(e, t) {
			t[0] == 0 && (e += this.size), t.pop(), t.unshift(e);
		}
	};
	t.MIN_VERSION = 1, t.MAX_VERSION = 40, t.PENALTY_N1 = 3, t.PENALTY_N2 = 3, t.PENALTY_N3 = 40, t.PENALTY_N4 = 10, t.ECC_CODEWORDS_PER_BLOCK = [
		[
			-1,
			7,
			10,
			15,
			20,
			26,
			18,
			20,
			24,
			30,
			18,
			20,
			24,
			26,
			30,
			22,
			24,
			28,
			30,
			28,
			28,
			28,
			28,
			30,
			30,
			26,
			28,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30
		],
		[
			-1,
			10,
			16,
			26,
			18,
			24,
			16,
			18,
			22,
			22,
			26,
			30,
			22,
			22,
			24,
			24,
			28,
			28,
			26,
			26,
			26,
			26,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28,
			28
		],
		[
			-1,
			13,
			22,
			18,
			26,
			18,
			24,
			18,
			22,
			20,
			24,
			28,
			26,
			24,
			20,
			30,
			24,
			28,
			28,
			26,
			30,
			28,
			30,
			30,
			30,
			30,
			28,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30
		],
		[
			-1,
			17,
			28,
			22,
			16,
			22,
			28,
			26,
			26,
			24,
			28,
			24,
			28,
			22,
			24,
			24,
			30,
			28,
			28,
			26,
			28,
			30,
			24,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30,
			30
		]
	], t.NUM_ERROR_CORRECTION_BLOCKS = [
		[
			-1,
			1,
			1,
			1,
			1,
			1,
			2,
			2,
			2,
			2,
			4,
			4,
			4,
			4,
			4,
			6,
			6,
			6,
			6,
			7,
			8,
			8,
			9,
			9,
			10,
			12,
			12,
			12,
			13,
			14,
			15,
			16,
			17,
			18,
			19,
			19,
			20,
			21,
			22,
			24,
			25
		],
		[
			-1,
			1,
			1,
			1,
			2,
			2,
			4,
			4,
			4,
			5,
			5,
			5,
			8,
			9,
			9,
			10,
			10,
			11,
			13,
			14,
			16,
			17,
			17,
			18,
			20,
			21,
			23,
			25,
			26,
			28,
			29,
			31,
			33,
			35,
			37,
			38,
			40,
			43,
			45,
			47,
			49
		],
		[
			-1,
			1,
			1,
			2,
			2,
			4,
			4,
			6,
			6,
			8,
			8,
			8,
			10,
			12,
			16,
			12,
			17,
			16,
			18,
			21,
			20,
			23,
			23,
			25,
			27,
			29,
			34,
			34,
			35,
			38,
			40,
			43,
			45,
			48,
			51,
			53,
			56,
			59,
			62,
			65,
			68
		],
		[
			-1,
			1,
			1,
			2,
			4,
			4,
			4,
			5,
			6,
			8,
			8,
			11,
			11,
			16,
			16,
			18,
			16,
			19,
			21,
			25,
			25,
			25,
			34,
			30,
			32,
			35,
			37,
			40,
			42,
			45,
			48,
			51,
			54,
			57,
			60,
			63,
			66,
			70,
			74,
			77,
			81
		]
	], e.QrCode = t;
	function n(e, t, n) {
		if (t < 0 || t > 31 || e >>> t) throw RangeError("Value out of range");
		for (let r = t - 1; r >= 0; r--) n.push(e >>> r & 1);
	}
	function r(e, t) {
		return !!(e >>> t & 1);
	}
	function i(e) {
		if (!e) throw Error("Assertion error");
	}
	let a = class e {
		constructor(e, t, n) {
			if (this.mode = e, this.numChars = t, this.bitData = n, t < 0) throw RangeError("Invalid argument");
			this.bitData = n.slice();
		}
		static makeBytes(t) {
			let r = [];
			for (let e of t) n(e, 8, r);
			return new e(e.Mode.BYTE, t.length, r);
		}
		static makeNumeric(t) {
			if (!e.isNumeric(t)) throw RangeError("String contains non-numeric characters");
			let r = [];
			for (let e = 0; e < t.length;) {
				let i = Math.min(t.length - e, 3);
				n(parseInt(t.substring(e, e + i), 10), i * 3 + 1, r), e += i;
			}
			return new e(e.Mode.NUMERIC, t.length, r);
		}
		static makeAlphanumeric(t) {
			if (!e.isAlphanumeric(t)) throw RangeError("String contains unencodable characters in alphanumeric mode");
			let r = [], i = 0;
			for (; i + 2 <= t.length; i += 2) {
				let a = e.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i)) * 45;
				a += e.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i + 1)), n(a, 11, r);
			}
			return i < t.length && n(e.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i)), 6, r), new e(e.Mode.ALPHANUMERIC, t.length, r);
		}
		static makeSegments(t) {
			return t == "" ? [] : e.isNumeric(t) ? [e.makeNumeric(t)] : e.isAlphanumeric(t) ? [e.makeAlphanumeric(t)] : [e.makeBytes(e.toUtf8ByteArray(t))];
		}
		static makeEci(t) {
			let r = [];
			if (t < 0) throw RangeError("ECI assignment value out of range");
			if (t < 128) n(t, 8, r);
			else if (t < 16384) n(2, 2, r), n(t, 14, r);
			else if (t < 1e6) n(6, 3, r), n(t, 21, r);
			else throw RangeError("ECI assignment value out of range");
			return new e(e.Mode.ECI, 0, r);
		}
		static isNumeric(t) {
			return e.NUMERIC_REGEX.test(t);
		}
		static isAlphanumeric(t) {
			return e.ALPHANUMERIC_REGEX.test(t);
		}
		getData() {
			return this.bitData.slice();
		}
		static getTotalBits(e, t) {
			let n = 0;
			for (let r of e) {
				let e = r.mode.numCharCountBits(t);
				if (r.numChars >= 1 << e) return Infinity;
				n += 4 + e + r.bitData.length;
			}
			return n;
		}
		static toUtf8ByteArray(e) {
			e = encodeURI(e);
			let t = [];
			for (let n = 0; n < e.length; n++) e.charAt(n) == "%" ? (t.push(parseInt(e.substring(n + 1, n + 3), 16)), n += 2) : t.push(e.charCodeAt(n));
			return t;
		}
	};
	a.NUMERIC_REGEX = /^[0-9]*$/, a.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, a.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
	let o = a;
	e.QrSegment = a;
})(Mw || (Mw = {})), ((e) => {
	((e) => {
		let t = class {
			constructor(e, t) {
				this.ordinal = e, this.formatBits = t;
			}
		};
		t.LOW = new t(0, 1), t.MEDIUM = new t(1, 0), t.QUARTILE = new t(2, 3), t.HIGH = new t(3, 2), e.Ecc = t;
	})(e.QrCode || (e.QrCode = {}));
})(Mw || (Mw = {})), ((e) => {
	((e) => {
		let t = class {
			constructor(e, t) {
				this.modeBits = e, this.numBitsCharCount = t;
			}
			numCharCountBits(e) {
				return this.numBitsCharCount[Math.floor((e + 7) / 17)];
			}
		};
		t.NUMERIC = new t(1, [
			10,
			12,
			14
		]), t.ALPHANUMERIC = new t(2, [
			9,
			11,
			13
		]), t.BYTE = new t(4, [
			8,
			16,
			16
		]), t.KANJI = new t(8, [
			8,
			10,
			12
		]), t.ECI = new t(7, [
			0,
			0,
			0
		]), e.Mode = t;
	})(e.QrSegment || (e.QrSegment = {}));
})(Mw || (Mw = {}));
var Nw = Mw, Pw = {
	L: Nw.QrCode.Ecc.LOW,
	M: Nw.QrCode.Ecc.MEDIUM,
	Q: Nw.QrCode.Ecc.QUARTILE,
	H: Nw.QrCode.Ecc.HIGH
}, Fw = 128, Iw = "L", Lw = "#FFFFFF", Rw = "#000000", zw = !1, Bw = 1, Vw = 4, Hw = 0, Uw = .1;
function Ww(e, t = 0) {
	let n = [];
	return e.forEach(function(e, r) {
		let i = null;
		e.forEach(function(a, o) {
			if (!a && i !== null) {
				n.push(`M${i + t} ${r + t}h${o - i}v1H${i + t}z`), i = null;
				return;
			}
			if (o === e.length - 1) {
				if (!a) return;
				i === null ? n.push(`M${o + t},${r + t} h1v1H${o + t}z`) : n.push(`M${i + t},${r + t} h${o + 1 - i}v1H${i + t}z`);
				return;
			}
			a && i === null && (i = o);
		});
	}), n.join("");
}
function Gw(e, t) {
	return e.slice().map((e, n) => n < t.y || n >= t.y + t.h ? e : e.map((e, n) => n < t.x || n >= t.x + t.w ? e : !1));
}
function Kw(e, t, n, r) {
	if (r == null) return null;
	let i = e.length + n * 2, a = Math.floor(t * Uw), o = i / t, s = (r.width || a) * o, c = (r.height || a) * o, l = r.x == null ? e.length / 2 - s / 2 : r.x * o, u = r.y == null ? e.length / 2 - c / 2 : r.y * o, d = r.opacity == null ? 1 : r.opacity, f = null;
	if (r.excavate) {
		let e = Math.floor(l), t = Math.floor(u);
		f = {
			x: e,
			y: t,
			w: Math.ceil(s + l - e),
			h: Math.ceil(c + u - t)
		};
	}
	let p = r.crossOrigin;
	return {
		x: l,
		y: u,
		h: c,
		w: s,
		excavation: f,
		opacity: d,
		crossOrigin: p
	};
}
function qw(e, t) {
	return t == null ? e ? Vw : Hw : Math.max(Math.floor(t), 0);
}
function Jw({ value: e, level: t, minVersion: n, includeMargin: r, marginSize: i, imageSettings: a, size: o, boostLevel: s }) {
	let c = X.useMemo(() => {
		let r = (Array.isArray(e) ? e : [e]).reduce((e, t) => (e.push(...Nw.QrSegment.makeSegments(t)), e), []);
		return Nw.QrCode.encodeSegments(r, Pw[t], n, void 0, void 0, s);
	}, [
		e,
		t,
		n,
		s
	]), { cells: l, margin: u, numCells: d, calculatedImageSettings: f } = X.useMemo(() => {
		let e = c.getModules(), t = qw(r, i);
		return {
			cells: e,
			margin: t,
			numCells: e.length + t * 2,
			calculatedImageSettings: Kw(e, o, t, a)
		};
	}, [
		c,
		o,
		a,
		r,
		i
	]);
	return {
		qrcode: c,
		margin: u,
		cells: l,
		numCells: d,
		calculatedImageSettings: f
	};
}
var Yw = function() {
	try {
		new Path2D().addPath(new Path2D());
	} catch {
		return !1;
	}
	return !0;
}(), Xw = X.forwardRef(function(e, t) {
	let n = e, { value: r, size: i = Fw, level: a = Iw, bgColor: o = Lw, fgColor: s = Rw, includeMargin: c = zw, minVersion: l = Bw, boostLevel: u, marginSize: d, imageSettings: f } = n, p = jw(n, [
		"value",
		"size",
		"level",
		"bgColor",
		"fgColor",
		"includeMargin",
		"minVersion",
		"boostLevel",
		"marginSize",
		"imageSettings"
	]), { style: m } = p, h = jw(p, ["style"]), g = f == null ? void 0 : f.src, _ = X.useRef(null), v = X.useRef(null), y = X.useCallback((e) => {
		_.current = e, typeof t == "function" ? t(e) : t && (t.current = e);
	}, [t]), [b, x] = X.useState(!1), { margin: S, cells: C, numCells: w, calculatedImageSettings: T } = Jw({
		value: r,
		level: a,
		minVersion: l,
		boostLevel: u,
		includeMargin: c,
		marginSize: d,
		imageSettings: f,
		size: i
	});
	X.useEffect(() => {
		if (_.current != null) {
			let e = _.current, t = e.getContext("2d");
			if (!t) return;
			let n = C, r = v.current, a = T != null && r !== null && r.complete && r.naturalHeight !== 0 && r.naturalWidth !== 0;
			a && T.excavation != null && (n = Gw(C, T.excavation));
			let c = window.devicePixelRatio || 1;
			e.height = e.width = i * c;
			let l = i / w * c;
			t.scale(l, l), t.fillStyle = o, t.fillRect(0, 0, w, w), t.fillStyle = s, Yw ? t.fill(new Path2D(Ww(n, S))) : C.forEach(function(e, n) {
				e.forEach(function(e, r) {
					e && t.fillRect(r + S, n + S, 1, 1);
				});
			}), T && (t.globalAlpha = T.opacity), a && t.drawImage(r, T.x + S, T.y + S, T.w, T.h);
		}
	}), X.useEffect(() => {
		x(!1);
	}, [g]);
	let E = Aw({
		height: i,
		width: i
	}, m), D = null;
	return g != null && (D = /* @__PURE__ */ X.createElement("img", {
		src: g,
		key: g,
		style: { display: "none" },
		onLoad: () => {
			x(!0);
		},
		ref: v,
		crossOrigin: T == null ? void 0 : T.crossOrigin
	})), /* @__PURE__ */ X.createElement(X.Fragment, null, /* @__PURE__ */ X.createElement("canvas", Aw({
		style: E,
		height: i,
		width: i,
		ref: y,
		role: "img"
	}, h)), D);
});
Xw.displayName = "QRCodeCanvas";
var Zw = X.forwardRef(function(e, t) {
	let n = e, { value: r, size: i = Fw, level: a = Iw, bgColor: o = Lw, fgColor: s = Rw, includeMargin: c = zw, minVersion: l = Bw, boostLevel: u, title: d, marginSize: f, imageSettings: p } = n, m = jw(n, [
		"value",
		"size",
		"level",
		"bgColor",
		"fgColor",
		"includeMargin",
		"minVersion",
		"boostLevel",
		"title",
		"marginSize",
		"imageSettings"
	]), { margin: h, cells: g, numCells: _, calculatedImageSettings: v } = Jw({
		value: r,
		level: a,
		minVersion: l,
		boostLevel: u,
		includeMargin: c,
		marginSize: f,
		imageSettings: p,
		size: i
	}), y = g, b = null;
	p != null && v != null && (v.excavation != null && (y = Gw(g, v.excavation)), b = /* @__PURE__ */ X.createElement("image", {
		href: p.src,
		height: v.h,
		width: v.w,
		x: v.x + h,
		y: v.y + h,
		preserveAspectRatio: "none",
		opacity: v.opacity,
		crossOrigin: v.crossOrigin
	}));
	let x = Ww(y, h);
	return /* @__PURE__ */ X.createElement("svg", Aw({
		height: i,
		width: i,
		viewBox: `0 0 ${_} ${_}`,
		ref: t,
		role: "img"
	}, m), !!d && /* @__PURE__ */ X.createElement("title", null, d), /* @__PURE__ */ X.createElement("path", {
		fill: o,
		d: `M0,0 h${_}v${_}H0z`,
		shapeRendering: "crispEdges"
	}), /* @__PURE__ */ X.createElement("path", {
		fill: s,
		d: x,
		shapeRendering: "crispEdges"
	}), b);
});
Zw.displayName = "QRCodeSVG";
//#endregion
//#region src/components/AgentOverlay/AgentOverlay.jsx
var Qw = 3, $w = 15e3, eT = /* @__PURE__ */ new Set([
	"checkout",
	"approval",
	"form",
	"meet_copilot",
	"consent.request",
	"qr_pair"
]), tT = {
	...o,
	color: "#fff"
}, nT = "var(--hart-accent, #6C63FF)", rT = "var(--hart-accent-strong, #5A52E0)", iT = "#64C8FF", aT = "#2ECC71", oT = "#FF6B6B", sT = 0, cT = (e) => typeof e == "string" && /^[A-Z]{3}$/.test(e), lT = (t, n) => cT(n) ? e(t, n) : t;
function uT(e) {
	let [t, n] = (0, X.useState)({
		phase: "idle",
		error: null
	});
	return [t, (0, X.useCallback)(async (t, r) => {
		if (!e) return null;
		n({
			phase: "busy",
			error: null
		});
		let i;
		try {
			i = await e(t, r);
		} catch (e) {
			i = {
				ok: !1,
				error: e && e.message || "Something went wrong"
			};
		}
		let a = !i || i.ok !== !1;
		return n({
			phase: a ? "done" : "error",
			error: a ? null : i.error || "Something went wrong"
		}), i || { ok: !0 };
	}, [e])];
}
function dT({ state: e }) {
	return e.phase !== "error" || !e.error ? null : /* @__PURE__ */ (0, Z.jsx)(Q, {
		role: "alert",
		variant: "caption",
		sx: {
			color: oT,
			display: "block",
			mt: .75
		},
		children: e.error
	});
}
function fT({ data: e, navigate: t, onDismiss: n }) {
	let r = {
		info: iT,
		success: aT,
		error: oT,
		warning: "#F39C12"
	}[e.severity] || iT, i = Array.isArray(e.actions) ? e.actions : [];
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		/* @__PURE__ */ (0, Z.jsx)($, { sx: {
			width: 4,
			height: "100%",
			position: "absolute",
			left: 0,
			top: 0,
			borderRadius: "16px 0 0 16px",
			background: r
		} }),
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: .5
			},
			children: e.title || "Notification"
		}),
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "body2",
			sx: {
				color: "rgba(255,255,255,0.7)",
				whiteSpace: "pre-line"
			},
			children: e.message || e.content
		}),
		i.length > 0 && /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				display: "flex",
				flexWrap: "wrap",
				gap: .5,
				mt: 1
			},
			children: i.map((e, i) => {
				let a = typeof e == "string" ? e : e.label, o = typeof e == "object" ? e.kind : null, s = typeof e == "object" ? e.target : null;
				return /* @__PURE__ */ (0, Z.jsx)(Pv, {
					size: "small",
					variant: i === 0 ? "contained" : "outlined",
					onClick: () => {
						o === "navigate" && t && s ? (t(s), n && n()) : o === "external" && s ? (window.open(s, "_blank", "noopener,noreferrer"), n && n()) : console.warn("NotificationCard: unhandled action", e);
					},
					sx: {
						fontSize: "0.7rem",
						textTransform: "none",
						background: i === 0 ? r : "transparent",
						borderColor: r,
						color: i === 0 ? "#fff" : r,
						"&:hover": { background: i === 0 ? r : "rgba(255,255,255,0.05)" }
					},
					children: a
				}, i);
			})
		})
	] });
}
function pT({ data: t, onAction: n }) {
	let [r, i] = uT(n), a = t.image || t.image_url, o = {
		idle: "Add to cart",
		busy: "Adding…",
		done: "Added ✓ · Add another",
		error: "Try again"
	}[r.phase];
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		a && /* @__PURE__ */ (0, Z.jsx)($, {
			component: "img",
			src: a,
			alt: t.name,
			sx: {
				width: "100%",
				height: 120,
				objectFit: "cover",
				borderRadius: "8px",
				mb: 1
			}
		}),
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: t.name
		}),
		t.description && /* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "caption",
			sx: {
				color: "rgba(255,255,255,0.6)",
				display: "block",
				mb: .5
			},
			children: t.description
		}),
		/* @__PURE__ */ (0, Z.jsxs)($, {
			sx: {
				display: "flex",
				alignItems: "center",
				gap: 1,
				mt: .5
			},
			children: [t.price != null && /* @__PURE__ */ (0, Z.jsx)(Q, {
				sx: {
					fontWeight: 700,
					color: nT
				},
				children: cT(t.currency) ? e(t.price, t.currency) : `${t.currency || "$"}${t.price}`
			}), t.rating != null && /* @__PURE__ */ (0, Z.jsx)(hS, {
				value: t.rating,
				precision: .5,
				size: "small",
				readOnly: !0
			})]
		}),
		t.buy_action && n && /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)(Pv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			disabled: r.phase === "busy",
			"aria-label": `${o}: ${t.name}`,
			sx: {
				mt: 1,
				minHeight: 44,
				background: nT,
				"&:hover": { background: rT }
			},
			onClick: () => i("cart.add", {
				sku: t.sku,
				product_id: t.product_id,
				category_id: t.category_id,
				name: t.name,
				price: t.price,
				currency: t.currency,
				qty: 1
			}),
			children: o
		}), /* @__PURE__ */ (0, Z.jsx)(dT, { state: r })] }),
		t.buy_action && !n && /* @__PURE__ */ (0, Z.jsx)(Pv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			sx: {
				mt: 1,
				background: nT,
				"&:hover": { background: rT }
			},
			onClick: () => window.open(t.buy_action, "_blank"),
			children: "Buy"
		})
	] });
}
function mT({ data: e, onAction: t }) {
	let [n, r] = uT(t), i = e.items || [], a = !!(t && e.superseded);
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: a ? { opacity: .62 } : void 0,
		children: [
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: 1
				},
				children: [/* @__PURE__ */ (0, Z.jsx)(KS.default, { sx: {
					fontSize: 20,
					color: nT
				} }), /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "subtitle2",
					sx: { fontWeight: 600 },
					children: "Cart"
				})]
			}),
			t && i.length === 0 && /* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "body2",
				sx: { color: "rgba(255,255,255,0.7)" },
				children: "Your cart is empty."
			}),
			i.map((t, n) => /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					justifyContent: "space-between",
					gap: 1,
					py: .3
				},
				children: [/* @__PURE__ */ (0, Z.jsxs)(Q, {
					variant: "body2",
					sx: {
						color: "rgba(255,255,255,0.8)",
						minWidth: 0,
						overflowWrap: "anywhere"
					},
					children: [t.qty ? `${t.qty} × ` : "", t.name]
				}), /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: {
						color: nT,
						whiteSpace: "nowrap"
					},
					children: typeof t.price == "number" ? lT(t.price, e.currency) : t.price
				})]
			}, n)),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					borderTop: "1px solid rgba(255,255,255,0.1)",
					mt: 1,
					pt: 1,
					display: "flex",
					justifyContent: "space-between"
				},
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: "Total"
				}), /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: {
						fontWeight: 700,
						color: nT
					},
					children: lT(e.total, e.currency)
				})]
			}),
			a && /* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "caption",
				sx: {
					display: "block",
					mt: 1,
					color: "rgba(255,255,255,0.85)"
				},
				children: e.ordered ? "Ordered ✓" : "Updated — see the latest cart below"
			}),
			e.checkout_action && !a && /* @__PURE__ */ (0, Z.jsx)(Pv, {
				variant: "contained",
				size: "small",
				fullWidth: !0,
				disabled: t ? n.phase === "busy" || i.length === 0 : void 0,
				onClick: t ? () => r("checkout.start", {
					items: i,
					total: e.total,
					currency: e.currency
				}) : void 0,
				sx: {
					mt: 1,
					minHeight: t ? 44 : void 0,
					background: nT,
					"&:hover": { background: rT }
				},
				children: t && n.phase === "busy" ? "Opening checkout…" : "Checkout"
			}),
			/* @__PURE__ */ (0, Z.jsx)(dT, { state: n })
		]
	});
}
function hT({ data: e, onAction: t }) {
	let [n, r] = uT(t), i = e.items_count || (Array.isArray(e.items) ? e.items.length : 0), a = lT(e.total || e.amount, e.currency);
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: "Confirm Payment"
		}),
		/* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "body2",
			sx: {
				color: "rgba(255,255,255,0.7)",
				mb: 1
			},
			children: [
				i,
				" items · ",
				a
			]
		}),
		e.payment_methods && /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				display: "flex",
				gap: .5,
				flexWrap: "wrap",
				mb: 1
			},
			children: e.payment_methods.map((e, t) => /* @__PURE__ */ (0, Z.jsx)(L_, {
				label: e,
				size: "small",
				sx: {
					color: "#fff",
					borderColor: "rgba(255,255,255,0.2)"
				},
				variant: "outlined"
			}, t))
		}),
		t && (e.paid || e.cancelled) ? /* @__PURE__ */ (0, Z.jsx)(Q, {
			role: "status",
			variant: "body2",
			sx: {
				fontWeight: 600,
				color: e.paid ? aT : "rgba(255,255,255,0.7)"
			},
			children: e.paid ? `Paid ✓${e.order_id ? ` · Order ${e.order_id}` : ""}` : "Payment cancelled"
		}) : t && e.approval_action ? /* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "body2",
			sx: { color: "rgba(255,255,255,0.78)" },
			children: "Waiting for your approval to pay."
		}) : t ? /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)(Pv, {
			variant: "contained",
			fullWidth: !0,
			disabled: n.phase === "busy" || n.phase === "done",
			onClick: () => r("checkout.confirm", e),
			sx: {
				minHeight: 44,
				background: aT,
				"&:hover": { background: "#27AE60" }
			},
			children: {
				idle: `Pay ${a}`,
				busy: "Waiting for approval…",
				done: "Paid ✓",
				error: `Try again · Pay ${a}`
			}[n.phase]
		}), /* @__PURE__ */ (0, Z.jsx)(dT, { state: n })] }) : /* @__PURE__ */ (0, Z.jsx)(Pv, {
			variant: "contained",
			fullWidth: !0,
			sx: {
				background: aT,
				"&:hover": { background: "#27AE60" }
			},
			onClick: () => e.confirm_action && fetch(e.confirm_action, { method: "POST" }),
			children: "Confirm Payment"
		})
	] });
}
function gT({ data: e }) {
	let t = {
		success: /* @__PURE__ */ (0, Z.jsx)(VS.default, { sx: {
			fontSize: 40,
			color: aT
		} }),
		pending: /* @__PURE__ */ (0, Z.jsx)(WS.default, { sx: {
			fontSize: 40,
			color: "#F39C12"
		} }),
		error: /* @__PURE__ */ (0, Z.jsx)(US.default, { sx: {
			fontSize: 40,
			color: oT
		} })
	};
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: { textAlign: "center" },
		children: [
			t[e.status] || t.pending,
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "subtitle2",
				sx: {
					fontWeight: 600,
					mt: 1,
					textTransform: "capitalize"
				},
				children: e.status
			}),
			e.amount && /* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "h6",
				sx: {
					fontWeight: 700,
					color: nT
				},
				children: e.amount
			}),
			e.method && /* @__PURE__ */ (0, Z.jsxs)(Q, {
				variant: "caption",
				sx: { color: "rgba(255,255,255,0.5)" },
				children: ["via ", e.method]
			})
		]
	});
}
function _T({ data: e }) {
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		/* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: ["Order ", e.order_id || ""]
		}),
		(e.steps || []).map((e, t) => /* @__PURE__ */ (0, Z.jsxs)($, {
			sx: {
				display: "flex",
				alignItems: "center",
				gap: 1,
				py: .3
			},
			children: [e.completed ? /* @__PURE__ */ (0, Z.jsx)(VS.default, { sx: {
				fontSize: 16,
				color: aT
			} }) : /* @__PURE__ */ (0, Z.jsx)($, { sx: {
				width: 16,
				height: 16,
				borderRadius: "50%",
				border: "2px solid rgba(255,255,255,0.3)"
			} }), /* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "body2",
				"aria-current": e.current ? "step" : void 0,
				sx: {
					color: e.completed ? "#fff" : "rgba(255,255,255,0.6)",
					fontWeight: e.current ? 700 : void 0
				},
				children: e.label || e.name
			})]
		}, t)),
		e.eta && /* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "caption",
			sx: {
				color: iT,
				mt: 1,
				display: "block"
			},
			children: ["ETA: ", e.eta]
		})
	] });
}
function vT({ data: e }) {
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: "Comparison"
		}),
		/* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				display: "flex",
				gap: 1
			},
			children: (e.apps || []).map((e, t) => /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					flex: 1,
					p: 1,
					borderRadius: "8px",
					background: "rgba(255,255,255,0.05)",
					textAlign: "center"
				},
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: e.name
				}), e.rating != null && /* @__PURE__ */ (0, Z.jsx)(hS, {
					value: e.rating,
					precision: .5,
					size: "small",
					readOnly: !0
				})]
			}, t))
		}),
		e.winner && /* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "caption",
			sx: {
				color: aT,
				mt: 1,
				display: "block"
			},
			children: ["Winner: ", e.winner]
		})
	] });
}
function yT({ data: e }) {
	var t, n;
	let r = (t = (n = e.percent) == null ? e.value : n) == null ? 0 : t;
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [/* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			display: "flex",
			justifyContent: "space-between",
			mb: .5
		},
		children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "body2",
			children: e.label || e.title || "Progress"
		}), /* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "body2",
			sx: { color: nT },
			children: [Math.round(r), "%"]
		})]
	}), /* @__PURE__ */ (0, Z.jsx)(Yb, {
		variant: "determinate",
		value: r,
		sx: {
			height: 6,
			borderRadius: 3,
			backgroundColor: "rgba(108,99,255,0.15)",
			"& .MuiLinearProgress-bar": {
				borderRadius: 3,
				background: `linear-gradient(90deg, ${nT}, #9B59B6)`
			}
		}
	})] });
}
function bT({ data: e }) {
	let t = {
		running: /* @__PURE__ */ (0, Z.jsx)(GS.default, { sx: { color: iT } }),
		completed: /* @__PURE__ */ (0, Z.jsx)(VS.default, { sx: { color: aT } }),
		error: /* @__PURE__ */ (0, Z.jsx)(US.default, { sx: { color: oT } })
	};
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			display: "flex",
			gap: 1.5,
			alignItems: "flex-start"
		},
		children: [t[e.status] || t.running, /* @__PURE__ */ (0, Z.jsxs)($, {
			sx: { flex: 1 },
			children: [
				/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: e.action || e.title || "Agent Action"
				}),
				/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: { color: "rgba(255,255,255,0.6)" },
					children: e.description
				}),
				e.result && /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: {
						color: aT,
						display: "block",
						mt: .5
					},
					children: e.result
				})
			]
		})]
	});
}
function xT(e) {
	let t = e && e.response && e.response.data || e && e.body || {};
	return String(t.reason || t.error || e && e.message || "Your answer did not reach this computer; try again.");
}
function ST({ text: e }) {
	return /* @__PURE__ */ (0, Z.jsx)(Q, {
		variant: "caption",
		role: "alert",
		sx: {
			display: "block",
			color: oT,
			mb: 1
		},
		children: e
	});
}
function CT({ data: e, onDismiss: t, onAction: n }) {
	let [r, i] = uT(n), [a, o] = (0, X.useState)(null), [s, c] = (0, X.useState)(null), l = (t) => {
		let n = String(e.action || "").toLowerCase();
		if (n.includes("camera") || n.includes("video")) try {
			window.dispatchEvent(new CustomEvent(pe, { detail: {
				approved: t === "approve",
				user_id: e.user_id || e.agent_id
			} }));
		} catch {}
	}, u = async (r) => {
		if (n) {
			let n = await i("approval.decide", {
				...e,
				decision: r
			});
			(!n || n.ok !== !1) && t();
			return;
		}
		if (!a) {
			o(r), c(null);
			try {
				let t = await fetch(`${h}/api/agent/approval`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						agent_id: e.agent_id,
						action: e.action,
						decision: r
					})
				});
				if (!t.ok) {
					let e = {};
					try {
						e = await t.json();
					} catch {}
					throw Object.assign(/* @__PURE__ */ Error(`The answer was refused (HTTP ${t.status})`), { body: e });
				}
			} catch (e) {
				console.error("[approval] decision not recorded", e), c(xT(e)), o(null);
				return;
			}
			l(r), o(null), t();
		}
	}, d = (t, n) => {
		let r = Array.isArray(e.options) ? e.options[t] : null;
		return typeof r == "string" && r ? r : n;
	};
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: .5
			},
			children: e.title || "Approval Required"
		}),
		/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "body2",
			sx: {
				color: "rgba(255,255,255,0.7)",
				mb: 1.5
			},
			children: e.description
		}),
		s && /* @__PURE__ */ (0, Z.jsx)(ST, { text: s }),
		/* @__PURE__ */ (0, Z.jsxs)($, {
			sx: {
				display: "flex",
				gap: 1,
				flexWrap: n ? "wrap" : void 0
			},
			children: [
				/* @__PURE__ */ (0, Z.jsx)(Pv, {
					variant: "contained",
					size: "small",
					disabled: !!a || r.phase === "busy",
					"aria-busy": a === "approve",
					sx: {
						background: aT,
						flex: 1,
						minHeight: n ? 44 : void 0,
						"&:hover": { background: "#27AE60" }
					},
					onClick: () => u("approve"),
					children: r.phase === "busy" ? "Working…" : d(0, "Approve")
				}),
				/* @__PURE__ */ (0, Z.jsx)(Pv, {
					variant: "outlined",
					size: "small",
					disabled: !!a || r.phase === "busy",
					"aria-busy": a === "deny",
					sx: {
						color: oT,
						borderColor: oT,
						flex: 1,
						minHeight: n ? 44 : void 0
					},
					onClick: () => u("deny"),
					children: d(1, "Deny")
				}),
				/* @__PURE__ */ (0, Z.jsx)(Pv, {
					variant: "outlined",
					size: "small",
					disabled: !!a || r.phase === "busy",
					sx: {
						color: n ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)",
						borderColor: "rgba(255,255,255,0.2)",
						minHeight: n ? 44 : void 0
					},
					onClick: n ? () => u("later") : t,
					children: d(2, "Later")
				})
			]
		}),
		/* @__PURE__ */ (0, Z.jsx)(dT, { state: r })
	] });
}
function wT({ data: e }) {
	let t = e.data || e.items || [], n = Math.max(...t.map((e) => e.value || 0), 1);
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [e.title && /* @__PURE__ */ (0, Z.jsx)(Q, {
		variant: "subtitle2",
		sx: {
			fontWeight: 600,
			mb: 1
		},
		children: e.title
	}), t.map((e, t) => /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			display: "flex",
			alignItems: "center",
			gap: 1,
			mb: .5
		},
		children: [
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "caption",
				sx: {
					width: 60,
					textAlign: "right",
					color: "rgba(255,255,255,0.6)"
				},
				children: e.label
			}),
			/* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					flex: 1,
					height: 12,
					borderRadius: 6,
					background: "rgba(255,255,255,0.05)"
				},
				children: /* @__PURE__ */ (0, Z.jsx)($, { sx: {
					width: `${e.value / n * 100}%`,
					height: "100%",
					borderRadius: 6,
					background: `linear-gradient(90deg, ${nT}, #9B59B6)`
				} })
			}),
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "caption",
				sx: {
					width: 30,
					color: nT
				},
				children: e.value
			})
		]
	}, t))] });
}
function TT({ data: e }) {
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [e.filename && /* @__PURE__ */ (0, Z.jsx)(Q, {
		variant: "caption",
		sx: {
			color: nT,
			mb: .5,
			display: "block"
		},
		children: e.filename
	}), /* @__PURE__ */ (0, Z.jsx)($, {
		component: "pre",
		sx: {
			background: "#1a1a2e",
			p: 1.5,
			borderRadius: "8px",
			overflowX: "auto",
			fontSize: "0.75rem",
			fontFamily: "monospace",
			color: "#e0e0e0",
			m: 0,
			maxHeight: 200
		},
		children: /* @__PURE__ */ (0, Z.jsx)("code", { children: e.code || e.content })
	})] });
}
function ET({ data: e }) {
	let t = (e.content || e.text || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[(.+?)\]\((.+?)\)/g, "<a href=\"$2\" target=\"_blank\" style=\"color:#64C8FF\">$1</a>").replace(/^- (.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>").replace(/\n/g, "<br/>");
	return /* @__PURE__ */ (0, Z.jsx)(Q, {
		variant: "body2",
		sx: { color: "rgba(255,255,255,0.85)" },
		dangerouslySetInnerHTML: { __html: ww.sanitize(t) }
	});
}
function DT({ data: e }) {
	var t, n;
	let r = e.media_type || ((t = e.url) != null && t.match(/\.(mp4|webm)/) ? "video" : (n = e.url) != null && n.match(/\.(mp3|wav|ogg)/) ? "audio" : "image");
	return r === "video" ? /* @__PURE__ */ (0, Z.jsx)($, {
		component: "video",
		controls: !0,
		src: e.url,
		sx: {
			width: "100%",
			borderRadius: "8px"
		}
	}) : r === "audio" ? /* @__PURE__ */ (0, Z.jsx)($, {
		component: "audio",
		controls: !0,
		src: e.url,
		sx: { width: "100%" }
	}) : /* @__PURE__ */ (0, Z.jsx)($, {
		component: "img",
		src: e.url,
		alt: e.alt || "",
		sx: {
			width: "100%",
			borderRadius: "8px"
		}
	});
}
function OT({ data: e }) {
	let t = {
		up: /* @__PURE__ */ (0, Z.jsx)(YS.default, { sx: { color: aT } }),
		down: /* @__PURE__ */ (0, Z.jsx)(qS.default, { sx: { color: oT } }),
		flat: /* @__PURE__ */ (0, Z.jsx)(JS.default, { sx: { color: "rgba(255,255,255,0.4)" } })
	};
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: { textAlign: "center" },
		children: [
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				sx: {
					fontSize: 32,
					fontWeight: 700,
					color: nT
				},
				children: e.value
			}),
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "body2",
				sx: { color: "rgba(255,255,255,0.6)" },
				children: e.label
			}),
			e.trend && /* @__PURE__ */ (0, Z.jsx)($, {
				sx: { mt: .5 },
				children: t[e.trend] || t.flat
			})
		]
	});
}
var kT = { copy_invite_url: (e) => navigator.clipboard.writeText(e.invite_url || "") };
function AT({ data: e, onDismiss: t, onAction: n }) {
	let [r, i] = (0, X.useState)(() => Object.fromEntries((e.fields || []).filter((e) => e && e.name && (e.value != null || e.default != null)).map((e) => [e.name, e.value == null ? e.default : e.value]))), [a, o] = (0, X.useState)({}), [s, c] = uT(n), [l, u] = (0, X.useState)(!1), [d, f] = (0, X.useState)(null);
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [
		e.title && /* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: e.title
		}),
		(e.fields || []).map((e, t) => /* @__PURE__ */ (0, Z.jsx)(BS, {
			label: e.label || e.name,
			size: "small",
			fullWidth: !0,
			type: e.secret ? "password" : e.type === "textarea" ? "text" : e.type || "text",
			required: e.required,
			multiline: e.type === "textarea" || void 0,
			minRows: e.type === "textarea" ? 3 : void 0,
			placeholder: e.placeholder,
			inputProps: e.inputMode ? { inputMode: e.inputMode } : void 0,
			InputProps: { readOnly: !!e.readonly },
			disabled: n ? s.phase === "done" : void 0,
			error: !!a[e.name],
			helperText: a[e.name] || e.help || void 0,
			InputLabelProps: e.type === "date" ? { shrink: !0 } : void 0,
			value: r[e.name] || "",
			onChange: (t) => {
				f(null), i((n) => ({
					...n,
					[e.name]: t.target.value
				}));
			},
			sx: {
				mb: 1,
				"& .MuiInputBase-root": {
					color: "#fff",
					background: "rgba(255,255,255,0.05)"
				},
				"& .MuiInputLabel-root": { color: n ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.5)" },
				"& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.45)" },
				"& .MuiFormHelperText-root.Mui-error": { color: oT }
			}
		}, t)),
		d && /* @__PURE__ */ (0, Z.jsx)(ST, { text: d }),
		/* @__PURE__ */ (0, Z.jsx)(Pv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			disabled: n ? s.phase === "busy" || s.phase === "done" : l,
			"aria-busy": n ? s.phase === "busy" : l,
			sx: {
				minHeight: n ? 44 : void 0,
				background: nT,
				"&:hover": { background: rT }
			},
			onClick: async () => {
				if (n) {
					let n = await c("form.submit", {
						action: e.action,
						values: r,
						form: e
					});
					o(n && n.fieldErrors || {}), n && n.ok !== !1 && t();
					return;
				}
				if (l) return;
				let i = kT[e.submit_action];
				if (!e.action && !i) {
					console.error("[form] card has no action; values not sent", e), f("This form cannot be submitted (no destination). Please report it.");
					return;
				}
				u(!0), f(null);
				try {
					e.action ? await Gi.submit(e.action, r) : await i(r);
				} catch (e) {
					console.error("[form] submit failed", e), f(xT(e)), u(!1);
					return;
				}
				u(!1), t();
			},
			children: n && s.phase === "busy" ? "Submitting…" : n && s.phase === "done" ? "Done ✓" : e.submit_label || "Submit"
		}),
		/* @__PURE__ */ (0, Z.jsx)(dT, { state: s })
	] });
}
function jT({ data: e }) {
	let t = e.ordered ? "ol" : "ul";
	return /* @__PURE__ */ (0, Z.jsxs)($, { children: [e.title && /* @__PURE__ */ (0, Z.jsx)(Q, {
		variant: "subtitle2",
		sx: {
			fontWeight: 600,
			mb: .5
		},
		children: e.title
	}), /* @__PURE__ */ (0, Z.jsx)($, {
		component: t,
		sx: {
			pl: 2,
			m: 0,
			color: "rgba(255,255,255,0.8)",
			"& li": {
				mb: .3,
				fontSize: "0.85rem"
			}
		},
		children: (e.items || []).map((e, t) => /* @__PURE__ */ (0, Z.jsx)("li", { children: typeof e == "string" ? e : e.text || e.label }, t))
	})] });
}
function MT({ data: e, navigate: t, onDismiss: n, onAction: r }) {
	return /* @__PURE__ */ (0, Z.jsx)($, {
		sx: {
			display: "flex",
			flexDirection: e.direction || "column",
			gap: e.gap || 1
		},
		children: (e.children || []).map((e, i) => /* @__PURE__ */ (0, Z.jsx)($, { children: /* @__PURE__ */ (0, Z.jsx)(LT, {
			data: e,
			navigate: t,
			onDismiss: n,
			onAction: r
		}) }, i))
	});
}
function NT({ data: e, onDismiss: t }) {
	let n = {
		live: aT,
		paused: "#F39C12",
		ended: "rgba(255,255,255,0.4)"
	}[e.state] || iT, r = Array.isArray(e.transcript_lines) ? e.transcript_lines : [], i = Array.isArray(e.decisions) ? e.decisions : [], a = Array.isArray(e.action_items) ? e.action_items : [], o = Array.isArray(e.participants) ? e.participants : [];
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: { minWidth: 280 },
		children: [
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: .75
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)($, { sx: {
						width: 8,
						height: 8,
						borderRadius: "50%",
						background: n,
						boxShadow: e.state === "live" ? `0 0 8px ${n}` : "none"
					} }),
					/* @__PURE__ */ (0, Z.jsxs)(Q, {
						variant: "subtitle2",
						sx: {
							fontWeight: 600,
							flex: 1
						},
						children: [e.platform || "meet", e.room_id ? ` · ${e.room_id}` : ""]
					}),
					/* @__PURE__ */ (0, Z.jsx)(L_, {
						size: "small",
						label: e.agent_role || "co-pilot",
						sx: {
							background: "rgba(108,99,255,0.2)",
							color: nT,
							fontSize: "0.65rem"
						}
					})
				]
			}),
			o.length > 0 && /* @__PURE__ */ (0, Z.jsxs)(Q, {
				variant: "caption",
				sx: {
					color: "rgba(255,255,255,0.5)",
					display: "block",
					mb: .5
				},
				children: [
					o.length,
					" participant",
					o.length === 1 ? "" : "s"
				]
			}),
			r.length > 0 && /* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					mb: 1,
					maxHeight: 140,
					overflowY: "auto",
					background: "rgba(0,0,0,0.25)",
					borderRadius: "8px",
					p: 1,
					fontSize: "0.8rem"
				},
				children: r.slice(-10).map((e, t) => /* @__PURE__ */ (0, Z.jsxs)($, {
					sx: {
						mb: .4,
						color: "rgba(255,255,255,0.85)"
					},
					children: [e.speaker && /* @__PURE__ */ (0, Z.jsxs)(Q, {
						component: "span",
						sx: {
							fontWeight: 600,
							color: nT,
							mr: .5,
							fontSize: "0.75rem"
						},
						children: [e.speaker, ":"]
					}), /* @__PURE__ */ (0, Z.jsx)(Q, {
						component: "span",
						sx: { fontSize: "0.8rem" },
						children: e.text || e
					})]
				}, t))
			}),
			i.length > 0 && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: { mb: 1 },
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: {
						color: aT,
						fontWeight: 600,
						display: "block",
						mb: .25
					},
					children: "Decisions"
				}), /* @__PURE__ */ (0, Z.jsx)($, {
					component: "ul",
					sx: {
						pl: 2,
						m: 0,
						"& li": {
							fontSize: "0.78rem",
							mb: .2,
							color: "rgba(255,255,255,0.85)"
						}
					},
					children: i.map((e, t) => /* @__PURE__ */ (0, Z.jsx)("li", { children: typeof e == "string" ? e : e.text }, t))
				})]
			}),
			a.length > 0 && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: { mb: 1 },
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: {
						color: iT,
						fontWeight: 600,
						display: "block",
						mb: .25
					},
					children: "Action items"
				}), /* @__PURE__ */ (0, Z.jsx)($, {
					component: "ul",
					sx: {
						pl: 2,
						m: 0,
						"& li": {
							fontSize: "0.78rem",
							mb: .2,
							color: "rgba(255,255,255,0.85)"
						}
					},
					children: a.map((e, t) => /* @__PURE__ */ (0, Z.jsx)("li", { children: typeof e == "string" ? e : e.text }, t))
				})]
			}),
			/* @__PURE__ */ (0, Z.jsx)(Pv, {
				size: "small",
				fullWidth: !0,
				variant: "outlined",
				sx: {
					borderColor: oT,
					color: oT,
					"&:hover": {
						borderColor: oT,
						background: "rgba(255,107,107,0.08)"
					}
				},
				onClick: () => {
					e.call_id && fetch(`${h}/api/social/agent/leave-room`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ call_id: e.call_id })
					}).catch(() => {}), t && t();
				},
				children: "Leave meet"
			})
		]
	});
}
function PT({ data: e, onDismiss: t }) {
	let n = e && e.qr || "", r = e && e.title || "Scan to connect", i = e && e.help || "Open the app on your phone, find \"Linked devices\" or \"Devices\", and scan this code.", a = e && e.pair_code_action, [o, s] = (0, X.useState)(!1), [c, l] = (0, X.useState)(""), [u, d] = (0, X.useState)(!1), [f, p] = (0, X.useState)(null);
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			p: 2,
			textAlign: "center"
		},
		children: [
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "subtitle2",
				sx: {
					fontWeight: 600,
					mb: 1.25
				},
				children: r
			}),
			n ? /* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					display: "inline-block",
					p: 2,
					bgcolor: "#fff",
					borderRadius: 2,
					boxShadow: "0 4px 18px rgba(0,0,0,0.4)"
				},
				children: /* @__PURE__ */ (0, Z.jsx)(Zw, {
					value: n,
					size: 220,
					level: "M",
					includeMargin: !1
				})
			}) : /* @__PURE__ */ (0, Z.jsx)($, {
				sx: { py: 4 },
				children: /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: { color: "rgba(255,255,255,0.7)" },
					children: "Generating QR code…"
				})
			}),
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "body2",
				sx: {
					color: "rgba(255,255,255,0.7)",
					mt: 2,
					lineHeight: 1.4
				},
				children: i
			}),
			a && o && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					mt: 1.5,
					textAlign: "left"
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)(BS, {
						label: "Your phone number",
						size: "small",
						fullWidth: !0,
						type: "tel",
						value: c,
						onChange: (e) => {
							p(null), l(e.target.value);
						},
						placeholder: "+91 90000 00000",
						sx: {
							mb: 1,
							"& .MuiInputBase-root": {
								color: "#fff",
								background: "rgba(255,255,255,0.05)"
							},
							"& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" }
						}
					}),
					f && /* @__PURE__ */ (0, Z.jsx)(ST, { text: f }),
					/* @__PURE__ */ (0, Z.jsx)(Pv, {
						variant: "contained",
						size: "small",
						fullWidth: !0,
						disabled: u || !c.trim(),
						"aria-busy": u,
						onClick: async () => {
							if (!u && c.trim()) {
								d(!0), p(null);
								try {
									await Gi.submit(a, { phone: c });
								} catch (e) {
									console.error("[qr_pair] pair-code request failed", e), p(xT(e)), d(!1);
									return;
								}
								d(!1), t && t();
							}
						},
						sx: {
							background: nT,
							"&:hover": { background: "#5A52E0" }
						},
						children: "Send me a code"
					})
				]
			}),
			a && !o && /* @__PURE__ */ (0, Z.jsx)(Pv, {
				size: "small",
				variant: "text",
				onClick: () => s(!0),
				sx: {
					mt: 1,
					color: iT,
					textTransform: "none"
				},
				children: "Can't scan? Link with phone number"
			}),
			t && /* @__PURE__ */ (0, Z.jsx)(Pv, {
				size: "small",
				variant: "text",
				onClick: t,
				sx: {
					mt: 1.5,
					color: "rgba(255,255,255,0.5)"
				},
				children: "Cancel"
			})
		]
	});
}
function FT({ data: e, onDismiss: t }) {
	let n = e && e.code || "", r = e && e.display_name || e && e.channel || "channel", i = e && e.color || "#25D366", a = Math.max(0, parseInt(e && e.expires_in || 60, 10)), o = e && e.instructions || `Open ${r} on your phone → Settings → Linked Devices → Link a Device → Link with phone number → paste this code.`, s = e && e.deeplink, c = e && e.notification_id, [l, u] = (0, X.useState)(a), [d, f] = (0, X.useState)(!1), p = (0, X.useRef)(!1);
	return (0, X.useEffect)(() => {
		if (n) try {
			navigator.clipboard.writeText(n).then(() => f(!0), () => {});
		} catch {}
		let e = setInterval(() => u((e) => e > 0 ? e - 1 : 0), 1e3);
		return () => clearInterval(e);
	}, [n]), (0, X.useEffect)(() => {
		if (l === 0 && c && !p.current) {
			p.current = !0;
			try {
				Vi.markRead([c]).catch(() => {});
			} catch {}
		}
	}, [l, c]), /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: { p: 2 },
		children: [
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: 1
				},
				children: [/* @__PURE__ */ (0, Z.jsx)($, { sx: {
					width: 10,
					height: 10,
					bgcolor: i,
					borderRadius: "50%",
					boxShadow: `0 0 10px ${i}80`
				} }), /* @__PURE__ */ (0, Z.jsxs)(Q, {
					variant: "subtitle2",
					sx: { fontWeight: 600 },
					children: ["Connect ", r]
				})]
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					my: 1.5,
					p: 2,
					textAlign: "center",
					bgcolor: "rgba(255,255,255,0.04)",
					border: "1px dashed rgba(255,255,255,0.18)",
					borderRadius: 2
				},
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					sx: {
						fontFamily: "monospace",
						fontSize: 28,
						letterSpacing: 6,
						fontWeight: 700,
						color: i
					},
					children: n || "••••••••"
				}), /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: { color: "rgba(255,255,255,0.5)" },
					children: l > 0 ? `Expires in ${l}s` : "Expired — request a new code"
				})]
			}),
			/* @__PURE__ */ (0, Z.jsxs)(Q, {
				variant: "body2",
				sx: {
					color: "rgba(255,255,255,0.75)",
					lineHeight: 1.45
				},
				children: [o, d && /* @__PURE__ */ (0, Z.jsx)(Q, {
					component: "span",
					sx: {
						color: i,
						ml: .5,
						fontWeight: 600
					},
					children: "(copied to clipboard)"
				})]
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					gap: 1,
					mt: 1.5,
					justifyContent: "flex-end"
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)(Pv, {
						size: "small",
						variant: "outlined",
						onClick: () => {
							try {
								navigator.clipboard.writeText(n).then(() => f(!0));
							} catch {}
						},
						sx: {
							borderColor: i,
							color: i
						},
						children: d ? "Copied" : "Copy code"
					}),
					s && /* @__PURE__ */ (0, Z.jsx)(Pv, {
						size: "small",
						variant: "contained",
						onClick: () => {
							try {
								window.open(s, "_blank");
							} catch {}
						},
						sx: {
							bgcolor: i,
							"&:hover": {
								bgcolor: i,
								filter: "brightness(1.1)"
							}
						},
						children: "Open on phone"
					}),
					t && /* @__PURE__ */ (0, Z.jsx)(Pv, {
						size: "small",
						variant: "text",
						onClick: t,
						sx: { color: "rgba(255,255,255,0.5)" },
						children: "Dismiss"
					})
				]
			})
		]
	});
}
function IT({ data: e, onDismiss: t }) {
	let n = e && e.display_name || e && e.channel || "channel", r = e && e.color || "#00e89d";
	return (0, X.useEffect)(() => {
		let e = setTimeout(() => {
			t && t();
		}, 6e3);
		return () => clearTimeout(e);
	}, [t]), /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			p: 2,
			display: "flex",
			alignItems: "center",
			gap: 1.25
		},
		children: [/* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				width: 28,
				height: 28,
				borderRadius: "50%",
				bgcolor: r,
				color: "#000",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontWeight: 700,
				fontSize: 18
			},
			children: "✓"
		}), /* @__PURE__ */ (0, Z.jsxs)($, { children: [/* @__PURE__ */ (0, Z.jsxs)(Q, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: [n, " connected"]
		}), /* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "caption",
			sx: { color: "rgba(255,255,255,0.6)" },
			children: e && e.message || "Ready to send and receive."
		})] })]
	});
}
function LT({ data: e, onDismiss: t, navigate: n, onAction: r }) {
	let i = e.type || e.component_type || "notification";
	switch (i) {
		case "notification": return /* @__PURE__ */ (0, Z.jsx)(fT, {
			data: e,
			navigate: n,
			onDismiss: t
		});
		case "toast": {
			let r = {
				...e,
				severity: e.severity || "info"
			};
			return /* @__PURE__ */ (0, Z.jsx)(fT, {
				data: r,
				navigate: n,
				onDismiss: t
			});
		}
		case "oauth_link": {
			let r = {
				title: e.title || `Sign in to ${e.provider || "service"}`,
				message: e.description || `Authorize ${e.provider || "this service"} to continue.`,
				severity: e.severity || "info",
				actions: e.authorize_url ? [{
					label: `Open ${e.provider || "sign-in"}`,
					kind: "external",
					target: e.authorize_url
				}] : []
			};
			return /* @__PURE__ */ (0, Z.jsx)(fT, {
				data: r,
				navigate: n,
				onDismiss: t
			});
		}
		case "product_card": return /* @__PURE__ */ (0, Z.jsx)(pT, {
			data: e,
			onAction: r
		});
		case "cart": return /* @__PURE__ */ (0, Z.jsx)(mT, {
			data: e,
			onAction: r
		});
		case "checkout": return /* @__PURE__ */ (0, Z.jsx)(hT, {
			data: e,
			onAction: r
		});
		case "payment_status": return /* @__PURE__ */ (0, Z.jsx)(gT, { data: e });
		case "order_tracking": return /* @__PURE__ */ (0, Z.jsx)(_T, { data: e });
		case "comparison": return /* @__PURE__ */ (0, Z.jsx)(vT, { data: e });
		case "progress": return /* @__PURE__ */ (0, Z.jsx)(yT, { data: e });
		case "agent_action": return /* @__PURE__ */ (0, Z.jsx)(bT, { data: e });
		case "approval": return /* @__PURE__ */ (0, Z.jsx)(CT, {
			data: e,
			onDismiss: t,
			onAction: r
		});
		case "chart": return /* @__PURE__ */ (0, Z.jsx)(wT, { data: e });
		case "code": return /* @__PURE__ */ (0, Z.jsx)(TT, { data: e });
		case "markdown": return /* @__PURE__ */ (0, Z.jsx)(ET, { data: e });
		case "media": return /* @__PURE__ */ (0, Z.jsx)(DT, { data: e });
		case "metric": return /* @__PURE__ */ (0, Z.jsx)(OT, { data: e });
		case "form": return /* @__PURE__ */ (0, Z.jsx)(AT, {
			data: e,
			onDismiss: t,
			onAction: r
		});
		case "qr_pair": return /* @__PURE__ */ (0, Z.jsx)(PT, {
			data: e,
			onDismiss: t
		});
		case "pair_code": return /* @__PURE__ */ (0, Z.jsx)(FT, {
			data: e,
			onDismiss: t
		});
		case "channel_connected": return /* @__PURE__ */ (0, Z.jsx)(IT, {
			data: e,
			onDismiss: t
		});
		case "list": return /* @__PURE__ */ (0, Z.jsx)(jT, { data: e });
		case "layout": return /* @__PURE__ */ (0, Z.jsx)(MT, {
			data: e,
			navigate: n,
			onDismiss: t,
			onAction: r
		});
		case "meet_copilot": return /* @__PURE__ */ (0, Z.jsx)(NT, {
			data: e,
			onDismiss: t
		});
		case "consent_prompt": return /* @__PURE__ */ (0, Z.jsx)(zT, {
			data: e,
			onDismiss: t
		});
		case "consent.request": return /* @__PURE__ */ (0, Z.jsx)(zT, {
			data: e,
			onDismiss: t
		});
		case "post_preview": return /* @__PURE__ */ (0, Z.jsx)(BT, {
			data: e,
			onDismiss: t
		});
		default: return /* @__PURE__ */ (0, Z.jsxs)($, { children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: e.title || i
		}), /* @__PURE__ */ (0, Z.jsx)(Q, {
			variant: "body2",
			sx: { color: "rgba(255,255,255,0.7)" },
			children: e.message || e.content || JSON.stringify(e)
		})] });
	}
}
function RT(e) {
	if (e.type === "consent.request") {
		let t = e.consent_type;
		return L(t) ? {
			consentType: t,
			scope: e.scope || "*",
			agentId: e.agent_id || null,
			title: ie(t, e.requester_name),
			text: `This phone asks to ${I(t)}.`,
			fingerprint: e.requester_fingerprint || te(e.scope),
			caption: F,
			grantLabel: se(t),
			declineLabel: ce(t) ? ue(t, e.agent_id) : null
		} : {
			consentType: t,
			scope: e.scope || "*",
			agentId: e.agent_id || null,
			secretKey: M(t) ? N(e.scope) : null,
			title: ie(t),
			text: e.reason || `${re(e.agent_name)} asks to ${I(t)}.`,
			grantLabel: se(t),
			declineLabel: ce(t) ? ue(t, e.agent_id, e.agent_name) : null
		};
	}
	let t = e.platform || e.scope || "platform", n = e.scope || `web_research:${t}`;
	return {
		consentType: "cloud_capability",
		scope: n,
		agentId: null,
		title: `Grant ${t} research access`,
		text: e.description || `The agent wants to use your logged-in ${t} session to research. Cookies stay on your machine.`,
		grantLabel: `Grant ${n}`,
		declineLabel: null
	};
}
function zT({ data: e, onDismiss: t }) {
	let n = RT(e || {}), [r, i] = (0, X.useState)(""), [a, o] = (0, X.useState)(null), [s, c] = (0, X.useState)(null), l = (t) => {
		if (n.consentType === "camera_capture") try {
			window.dispatchEvent(new CustomEvent(pe, { detail: {
				approved: t,
				user_id: (e == null ? void 0 : e.user_id) || (e == null ? void 0 : e.agent_id)
			} }));
		} catch {}
	}, u = async () => {
		if (!s) {
			if (c("grant"), n.secretKey) {
				let e = null;
				try {
					e = await Zi.vaultStore({
						key_type: "tool_key",
						key_name: n.secretKey,
						value: r
					});
				} catch (t) {
					e = {
						success: !1,
						error: t == null ? void 0 : t.message
					};
				}
				if (!(e != null && e.success)) {
					o((e == null ? void 0 : e.error) || "Could not store it on this computer"), c(null);
					return;
				}
			}
			await f("grant", () => Hi.grant({
				consent_type: n.consentType,
				scope: n.scope
			}), !0);
		}
	}, d = async () => {
		s || (c("decline"), await f("decline", () => Hi.decline({
			consent_type: n.consentType,
			scope: n.scope,
			agent_id: n.agentId
		}), !1));
	}, f = async (e, n, r) => {
		try {
			await n();
		} catch (t) {
			console.error(`[consent_prompt] ${e} failed`, t), o(xT(t)), c(null);
			return;
		}
		l(r), c(null), t && t();
	};
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		"data-testid": "liquid-consent-prompt",
		sx: { p: 1.5 },
		children: [
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "subtitle1",
				sx: {
					fontWeight: 700,
					mb: .5
				},
				children: n.title
			}),
			/* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "body2",
				sx: {
					opacity: .8,
					mb: 1.5
				},
				children: n.text
			}),
			n.fingerprint && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: { mb: 1.5 },
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					component: "code",
					"data-testid": "liquid-consent-fingerprint",
					sx: {
						display: "block",
						fontFamily: "monospace",
						fontSize: "1.15rem",
						letterSpacing: "0.08em",
						color: "#fff"
					},
					children: n.fingerprint
				}), /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					sx: {
						display: "block",
						opacity: .7
					},
					children: n.caption
				})]
			}),
			n.secretKey && /* @__PURE__ */ (0, Z.jsx)($, {
				sx: { mb: 1.5 },
				children: /* @__PURE__ */ (0, Z.jsx)(BS, {
					type: "password",
					size: "small",
					fullWidth: !0,
					autoComplete: "off",
					value: r,
					onChange: (e) => {
						i(e.target.value), o(null);
					},
					inputProps: {
						"data-testid": "liquid-consent-secret",
						"aria-label": "Password or key"
					},
					sx: { "& .MuiInputBase-root": {
						color: "#fff",
						background: "rgba(255,255,255,0.05)"
					} }
				})
			}),
			a && /* @__PURE__ */ (0, Z.jsx)(ST, { text: a }),
			n.declineLabel && /* @__PURE__ */ (0, Z.jsx)(Q, {
				variant: "caption",
				sx: {
					display: "block",
					opacity: .6,
					mb: 1
				},
				children: le(n.consentType, n.declineLabel)
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					flexWrap: "wrap",
					gap: 1,
					justifyContent: "flex-end"
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)("button", {
						className: "btn-feedback",
						onClick: t,
						disabled: !!s,
						style: {
							padding: "6px 14px",
							borderRadius: 8,
							border: "1px solid #555",
							background: "transparent",
							color: "#ccc",
							cursor: "pointer"
						},
						children: "Not now"
					}),
					n.declineLabel && /* @__PURE__ */ (0, Z.jsx)("button", {
						className: "btn-feedback",
						onClick: d,
						disabled: !!s,
						"aria-busy": s === "decline",
						style: {
							padding: "6px 14px",
							borderRadius: 8,
							border: "1px solid #FF6B6B",
							background: "transparent",
							color: "#FF6B6B",
							cursor: "pointer"
						},
						children: n.declineLabel
					}),
					/* @__PURE__ */ (0, Z.jsx)("button", {
						className: "btn-feedback",
						"data-testid": "liquid-consent-grant",
						onClick: u,
						disabled: !!s || !!n.secretKey && !r,
						"aria-busy": s === "grant",
						style: {
							padding: "6px 14px",
							borderRadius: 8,
							border: "none",
							background: "#10b981",
							color: "#fff",
							fontWeight: 600,
							cursor: "pointer"
						},
						children: n.grantLabel
					})
				]
			})
		]
	});
}
function BT({ data: e, onDismiss: t }) {
	let n = (e == null ? void 0 : e.platform) || "platform", r = (e == null ? void 0 : e.content) || "", [i, a] = (0, X.useState)(!1);
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		"data-testid": "liquid-post-preview",
		sx: { p: 1.5 },
		children: [
			/* @__PURE__ */ (0, Z.jsxs)(Q, {
				variant: "subtitle1",
				sx: {
					fontWeight: 700,
					mb: .5
				},
				children: ["Preview: post to ", n]
			}),
			/* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					p: 1.5,
					mb: 1.5,
					borderRadius: 1,
					bgcolor: "rgba(255,255,255,0.06)",
					border: "1px solid rgba(255,255,255,0.12)"
				},
				children: /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					sx: {
						whiteSpace: "pre-wrap",
						color: "rgba(255,255,255,0.92)"
					},
					children: r
				})
			}),
			/* @__PURE__ */ (0, Z.jsxs)(Q, {
				variant: "caption",
				sx: {
					display: "block",
					opacity: .65,
					mb: 1
				},
				children: ["Posting as ", (e == null ? void 0 : e.handle) || "your saved session"]
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					gap: 1,
					justifyContent: "flex-end"
				},
				children: [/* @__PURE__ */ (0, Z.jsx)("button", {
					className: "btn-feedback",
					onClick: t,
					disabled: i,
					style: {
						padding: "6px 14px",
						borderRadius: 8,
						border: "1px solid #555",
						background: "transparent",
						color: "#ccc",
						cursor: "pointer"
					},
					children: (e == null ? void 0 : e.cancel_label) || "Cancel"
				}), /* @__PURE__ */ (0, Z.jsx)("button", {
					className: "btn-feedback",
					"data-testid": "liquid-post-confirm",
					onClick: async () => {
						if (!i) {
							a(!0);
							try {
								let t = (e == null ? void 0 : e.confirm_args) || {};
								await fetch("/chat", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										input_text: "confirm post",
										tool_call: {
											name: (e == null ? void 0 : e.confirm_tool) || "Post_As_User",
											args: t
										}
									})
								});
							} catch (e) {
								console.error("[post_preview] confirm failed", e);
							} finally {
								a(!1), t && t();
							}
						}
					},
					disabled: i,
					"aria-busy": i,
					style: {
						padding: "6px 14px",
						borderRadius: 8,
						border: "none",
						background: "#6C63FF",
						color: "#fff",
						fontWeight: 600,
						cursor: "pointer"
					},
					children: (e == null ? void 0 : e.confirm_label) || `Post to ${n}`
				})]
			})
		]
	});
}
function VT({ navigate: e, onInlineChatCard: t, subscribe: n, onAction: r, containerSx: i, cardSx: a, cardTransition: o = yb }) {
	let [s, c] = (0, X.useState)([]), l = (0, X.useRef)({}), u = (0, X.useRef)(/* @__PURE__ */ new Map()), d = (0, X.useCallback)((e) => {
		for (let [t, n] of u.current) n === e && u.current.delete(t);
	}, []), f = (0, X.useCallback)((e) => {
		clearTimeout(l.current[e]), delete l.current[e], d(e), c((t) => t.filter((t) => t._id !== e));
	}, [d]), p = (0, X.useCallback)((e) => {
		c((t) => {
			let n = t.filter((t) => t._type === "consent.request" && fe(e, t));
			return n.length === 0 ? t : (n.forEach((e) => {
				clearTimeout(l.current[e._id]), delete l.current[e._id], d(e._id);
			}), t.filter((e) => !n.includes(e)));
		});
	}, [d]), m = (0, X.useCallback)((n) => {
		if (!n) return;
		let r = n.type || n.component_type || "notification";
		if (de.includes(r)) return;
		if (r === "navigate" && e && n.target) {
			e(n.target);
			return;
		}
		let i = n.msg_id;
		if (i && u.current.has(i)) return;
		t && [
			"product_card",
			"cart",
			"checkout",
			"comparison"
		].includes(r) && t(n);
		let a = ++sT, o = {
			...n,
			_id: a,
			_type: r
		};
		i && u.current.set(i, a);
		let s = (e) => (e._type === "qr_pair" || e._type === "pair_code") && n.channel && e.channel === n.channel;
		c((e) => {
			if (r === "qr_pair") {
				let t = e.findIndex((e) => e._type === "qr_pair" && s(e));
				if (t >= 0) {
					let n = [...e];
					return d(e[t]._id), i && u.current.set(i, e[t]._id), n[t] = {
						...o,
						_id: e[t]._id
					}, n;
				}
			}
			(r === "channel_connected" || r === "toast" && n.severity === "error") && (e.filter(s).forEach((e) => {
				clearTimeout(l.current[e._id]), delete l.current[e._id], d(e._id);
			}), e = e.filter((e) => !s(e)));
			let t = [...e, o];
			for (; t.length > Qw;) {
				let e = t.shift();
				clearTimeout(l.current[e._id]), delete l.current[e._id], d(e._id);
			}
			return t;
		}), eT.has(r) || (l.current[a] = setTimeout(() => f(a), $w));
	}, [
		e,
		t,
		f,
		d
	]);
	return (0, X.useEffect)(() => {
		let e = n ? n(m) : _.on("agent.ui.update", m), t = de.map((e) => _.on(e, p));
		return () => {
			e(), t.forEach((e) => e && e()), Object.values(l.current).forEach(clearTimeout);
		};
	}, [
		m,
		p,
		n
	]), s.length === 0 ? null : /* @__PURE__ */ (0, Z.jsx)($, {
		sx: {
			position: "fixed",
			bottom: {
				xs: 16,
				md: 80
			},
			right: {
				xs: 8,
				md: 16
			},
			zIndex: 9998,
			display: "flex",
			flexDirection: "column-reverse",
			gap: 1.5,
			width: {
				xs: "calc(100% - 16px)",
				sm: 340
			},
			maxHeight: "80vh",
			pointerEvents: "none",
			...i
		},
		children: s.map((t) => /* @__PURE__ */ (0, Z.jsx)(o, {
			in: !0,
			timeout: 300,
			children: /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					...tT,
					p: 2,
					position: "relative",
					pointerEvents: "auto",
					animation: "agentSlideUp 0.3s ease",
					"@keyframes agentSlideUp": {
						from: {
							opacity: 0,
							transform: "translateY(20px)"
						},
						to: {
							opacity: 1,
							transform: "translateY(0)"
						}
					},
					...a
				},
				children: [
					t.agent_name && /* @__PURE__ */ (0, Z.jsx)(L_, {
						label: t.agent_name,
						size: "small",
						sx: {
							position: "absolute",
							top: 8,
							left: 12,
							fontSize: "0.65rem",
							height: 20,
							background: "rgba(108,99,255,0.2)",
							color: nT,
							border: "1px solid rgba(108,99,255,0.3)"
						}
					}),
					/* @__PURE__ */ (0, Z.jsx)(y_, {
						size: "small",
						"aria-label": "Dismiss",
						onClick: () => f(t._id),
						sx: {
							position: "absolute",
							top: 4,
							right: 4,
							color: "rgba(255,255,255,0.4)",
							"&:hover": { color: "#fff" }
						},
						children: /* @__PURE__ */ (0, Z.jsx)(HS.default, { sx: { fontSize: 16 } })
					}),
					/* @__PURE__ */ (0, Z.jsx)($, {
						sx: { mt: t.agent_name ? 2.5 : 0 },
						children: /* @__PURE__ */ (0, Z.jsx)(LT, {
							data: t,
							onDismiss: () => f(t._id),
							navigate: e,
							onAction: r
						})
					})
				]
			})
		}, t._id))
	});
}
//#endregion
//#region src/hooks/useMicAmplitude.js
function HT(e = 1) {
	let [t, n] = (0, X.useState)(0), [r, i] = (0, X.useState)(-160), [a, o] = (0, X.useState)(!1), s = (0, X.useRef)(!0), c = (0, X.useRef)(e), l = (0, X.useRef)(null), u = (0, X.useRef)(null), d = (0, X.useRef)(null), f = (0, X.useRef)(null), p = (0, X.useRef)(null), m = (0, X.useRef)(null);
	c.current = e;
	let h = (0, X.useCallback)(() => {
		if (!s.current || !u.current || !m.current) return;
		u.current.getByteFrequencyData(m.current);
		let e = m.current, t = 0;
		for (let n = 0; n < e.length; n++) {
			let r = e[n] / 255;
			t += r * r;
		}
		let r = Math.sqrt(t / e.length), a = Math.min(r * c.current, 1), o = r > 0 ? 20 * Math.log10(r) : -160;
		s.current && (n(a), i(Math.max(o, -160))), p.current = requestAnimationFrame(h);
	}, []), g = (0, X.useCallback)(async () => {
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			console.warn("useMicAmplitude: getUserMedia not available");
			return;
		}
		try {
			let e = await navigator.mediaDevices.getUserMedia({ audio: !0 });
			if (!s.current) {
				e.getTracks().forEach((e) => e.stop());
				return;
			}
			let t = new (window.AudioContext || window.webkitAudioContext)(), n = t.createAnalyser();
			n.fftSize = 256, n.smoothingTimeConstant = .8;
			let r = t.createMediaStreamSource(e);
			r.connect(n);
			let i = n.frequencyBinCount, a = new Uint8Array(i);
			l.current = t, u.current = n, d.current = r, f.current = e, m.current = a, s.current && (o(!0), p.current = requestAnimationFrame(h));
		} catch (e) {
			console.warn("useMicAmplitude: failed to start:", e.message);
		}
	}, [h]), _ = (0, X.useCallback)(() => {
		if (p.current && (cancelAnimationFrame(p.current), p.current = null), d.current) {
			try {
				d.current.disconnect();
			} catch {}
			d.current = null;
		}
		if (f.current && (f.current.getTracks().forEach((e) => e.stop()), f.current = null), l.current) {
			try {
				l.current.close();
			} catch {}
			l.current = null;
		}
		u.current = null, m.current = null, s.current && (o(!1), n(0), i(-160));
	}, []);
	return (0, X.useEffect)(() => (s.current = !0, () => {
		if (s.current = !1, p.current && cancelAnimationFrame(p.current), d.current) try {
			d.current.disconnect();
		} catch {}
		if (f.current && f.current.getTracks().forEach((e) => e.stop()), l.current) try {
			l.current.close();
		} catch {}
	}), []), {
		amplitude: t,
		decibels: r,
		isListening: a,
		startListening: g,
		stopListening: _
	};
}
//#endregion
//#region src/hooks/useSpeechRecognition.js
var UT = "ws://127.0.0.1:8005";
function WT(e, t) {
	return !e || t === "https:" && /^ws:\/\//i.test(e) ? null : e;
}
var GT = typeof window < "u" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
function KT(e) {
	return e ? {
		type: "config",
		language: e
	} : { type: "config" };
}
function qT(e = {}) {
	let { language: t = null, onResult: n, onPartialResult: r, onError: i, sttUrl: a = UT } = e, o = (0, X.useRef)(a);
	o.current = a;
	let [s, c] = (0, X.useState)(""), [l, u] = (0, X.useState)(!1), [d, f] = (0, X.useState)(-1), [p, m] = (0, X.useState)(null), [h, g] = (0, X.useState)(null), _ = (0, X.useRef)(!0), v = (0, X.useRef)(null), y = (0, X.useRef)(null), b = (0, X.useRef)(null), x = (0, X.useRef)(null), S = (0, X.useRef)(null), C = (0, X.useRef)(null), w = (0, X.useRef)(n), T = (0, X.useRef)(r), E = (0, X.useRef)(i);
	w.current = n, T.current = r, E.current = i;
	let D = (0, X.useCallback)(async (e) => {
		let t = WT(o.current, typeof window < "u" ? window.location.protocol : "");
		if (!t) return !1;
		try {
			let n = await navigator.mediaDevices.getUserMedia({ audio: !0 });
			if (!_.current) return n.getTracks().forEach((e) => e.stop()), !1;
			b.current = n;
			let r = new WebSocket(t);
			return v.current = r, new Promise((t) => {
				let i = setTimeout(() => {
					r.close(), t(!1);
				}, 3e3);
				r.onopen = () => {
					clearTimeout(i), r.send(JSON.stringify(KT(e)));
					let a = 16e3, o = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: a }), s = o.sampleRate, c = s !== a, l = o.createMediaStreamSource(n), d = o.createScriptProcessor(4096, 1, 1);
					d.onaudioprocess = (e) => {
						if (r.readyState === WebSocket.OPEN) {
							let t = e.inputBuffer.getChannelData(0);
							if (c) {
								let e = s / a, n = Math.round(t.length / e), r = new Float32Array(n);
								for (let i = 0; i < n; i++) r[i] = t[Math.round(i * e)];
								t = r;
							}
							let n = new Int16Array(t.length);
							for (let e = 0; e < t.length; e++) {
								let r = Math.max(-1, Math.min(1, t[e]));
								n[e] = r < 0 ? r * 32768 : r * 32767;
							}
							r.send(n.buffer);
						}
					}, l.connect(d), d.connect(o.destination), x.current = o, S.current = d, _.current && (C.current = "ws", g("ws"), u(!0)), t(!0);
				}, r.onmessage = (e) => {
					if (_.current) try {
						var t;
						let n = JSON.parse(e.data), r = (n.text || n.transcript || "").trim(), i = (t = n.confidence) == null ? -1 : t;
						r && (c(r), f(i), n.is_final || n.isFinal ? w.current && w.current(r) : T.current && T.current(r));
					} catch {}
				}, r.onerror = () => {
					clearTimeout(i), t(!1);
				}, r.onclose = () => {
					_.current && C.current === "ws" && u(!1);
				};
			});
		} catch {
			return !1;
		}
	}, []), O = (0, X.useCallback)((e) => {
		if (!GT) {
			let e = "Speech recognition not supported in this browser";
			_.current && m(e), E.current && E.current(e);
			return;
		}
		let t = new GT();
		t.lang = e, t.interimResults = !0, t.continuous = !0, t.maxAlternatives = 1, t.onstart = () => {
			_.current && (C.current = "browser", g("browser"), u(!0), m(null));
		}, t.onresult = (e) => {
			if (!_.current) return;
			let t = "", n = "";
			for (let i = e.resultIndex; i < e.results.length; i++) {
				let a = e.results[i], o = a[0].transcript;
				if (a.isFinal) {
					var r;
					n += o, f((r = a[0].confidence) == null ? -1 : r);
				} else t += o;
			}
			n ? (c(n.trim()), w.current && w.current(n.trim())) : t && (c(t.trim()), T.current && T.current(t.trim()));
		}, t.onerror = (e) => {
			if (!_.current || e.error === "no-speech") return;
			let t = e.error || "Speech recognition error";
			m(t), E.current && E.current(t);
		}, t.onend = () => {
			_.current && u(!1);
		}, y.current = t, t.start();
	}, []), k = (0, X.useCallback)(async (e = {}) => {
		if (!_.current) return;
		let n = e.language || t || null;
		if (m(null), c(""), f(-1), await D(n)) return;
		let r = n || e.preferredLanguage || typeof navigator < "u" && navigator.language || "en";
		O(r);
	}, [
		t,
		D,
		O
	]), A = (0, X.useCallback)(() => {
		if (S.current) {
			try {
				S.current.disconnect();
			} catch {}
			S.current = null;
		}
		if (x.current) {
			try {
				x.current.close();
			} catch {}
			x.current = null;
		}
		b.current && (b.current.getTracks().forEach((e) => e.stop()), b.current = null);
		let e = v.current;
		if (v.current = null, e) try {
			e.readyState === WebSocket.OPEN ? (e.send(JSON.stringify({ control: "final" })), setTimeout(() => {
				try {
					e.close();
				} catch {}
			}, 600)) : e.close();
		} catch {
			try {
				e.close();
			} catch {}
		}
		if (y.current) {
			try {
				y.current.stop();
			} catch {}
			y.current = null;
		}
		C.current = null, _.current && (g(null), u(!1));
	}, []), j = (0, X.useCallback)(() => {
		_.current && (c(""), f(-1), m(null));
	}, []);
	return (0, X.useEffect)(() => (_.current = !0, () => {
		if (_.current = !1, v.current) try {
			v.current.close();
		} catch {}
		if (S.current) try {
			S.current.disconnect();
		} catch {}
		if (x.current) try {
			x.current.close();
		} catch {}
		if (b.current && b.current.getTracks().forEach((e) => e.stop()), y.current) try {
			y.current.stop();
		} catch {}
	}), []), {
		transcript: s,
		isListening: l,
		confidence: d,
		startListening: k,
		stopListening: A,
		resetTranscript: j,
		error: p,
		activeMethod: h,
		usingFallback: h === "browser"
	};
}
//#endregion
//#region src/embed/ui/shared.jsx
function JT(e) {
	return (0, X.useSyncExternalStore)(e.subscribe, e.getState, e.getState);
}
var YT = {
	"@keyframes hartIn": {
		from: {
			opacity: 0,
			transform: "translateY(12px) scale(0.97)"
		},
		to: {
			opacity: 1,
			transform: "none"
		}
	},
	animation: `hartIn ${l}ms ${s} both`,
	"@media (prefers-reduced-motion: reduce)": { animation: "none" }
}, XT = {
	background: u,
	backdropFilter: "var(--hart-glass-filter)",
	WebkitBackdropFilter: "var(--hart-glass-filter)",
	border: "var(--hart-glass-border)",
	boxShadow: "var(--hart-glass-shadow)",
	borderRadius: "var(--hart-radius)",
	color: "#fff"
};
function ZT({ children: e }) {
	return e;
}
function QT({ fragment: e, onAction: t, onNavigate: n }) {
	return /* @__PURE__ */ (0, Z.jsx)($, {
		"data-fragment-type": e.type,
		sx: {
			...XT,
			...YT,
			p: 2,
			position: "relative",
			boxShadow: "0 10px 30px rgba(0,0,0,0.28)"
		},
		children: /* @__PURE__ */ (0, Z.jsx)(LT, {
			data: e,
			onAction: t,
			onDismiss: () => {},
			navigate: (e) => n({ path: e })
		})
	});
}
function $T() {
	return /* @__PURE__ */ (0, Z.jsxs)($, {
		role: "presentation",
		sx: {
			display: "flex",
			gap: "6px",
			py: .5,
			"@keyframes hartDot": {
				"0%, 100%": {
					opacity: .3,
					transform: "translateY(0)"
				},
				"50%": {
					opacity: 1,
					transform: "translateY(-3px)"
				}
			},
			"& span": {
				width: 8,
				height: 8,
				borderRadius: "50%",
				background: "var(--hart-accent)",
				animation: "hartDot 1s ease-in-out infinite",
				"@media (prefers-reduced-motion: reduce)": {
					animation: "none",
					opacity: .7
				}
			},
			"& span:nth-of-type(2)": { animationDelay: "150ms" },
			"& span:nth-of-type(3)": { animationDelay: "300ms" }
		},
		children: [
			/* @__PURE__ */ (0, Z.jsx)("span", {}),
			/* @__PURE__ */ (0, Z.jsx)("span", {}),
			/* @__PURE__ */ (0, Z.jsx)("span", {})
		]
	});
}
function eE({ items: e, onPick: t, disabled: n }) {
	return !e || !e.length ? null : /* @__PURE__ */ (0, Z.jsx)($, {
		role: "group",
		"aria-label": "Suggestions",
		sx: {
			display: "flex",
			flexWrap: "wrap",
			gap: 1,
			mt: 1
		},
		children: e.map((e) => /* @__PURE__ */ (0, Z.jsx)($, {
			component: "button",
			type: "button",
			disabled: n,
			onClick: () => t(e),
			sx: {
				minHeight: 36,
				px: 1.5,
				py: .75,
				borderRadius: "999px",
				cursor: "pointer",
				border: "1px solid rgba(255,255,255,0.22)",
				background: "rgba(255,255,255,0.08)",
				color: "#fff",
				font: "inherit",
				fontSize: 13,
				fontWeight: 500,
				textAlign: "left",
				transition: `transform ${l}ms ${s}, background 150ms ease`,
				"&:hover": { background: "rgba(255,255,255,0.14)" },
				"&:active": { transform: "scale(0.96)" },
				"&:focus-visible": {
					outline: "2px solid var(--hart-accent)",
					outlineOffset: 2
				},
				"&:disabled": {
					opacity: .5,
					cursor: "default"
				}
			},
			children: e
		}, e))
	});
}
function tE({ msg: e, onRetry: t }) {
	let n = e.role === "user", r = e.tone === "error";
	return /* @__PURE__ */ (0, Z.jsx)($, {
		sx: {
			display: "flex",
			justifyContent: n ? "flex-end" : "flex-start",
			...YT
		},
		children: /* @__PURE__ */ (0, Z.jsxs)($, {
			sx: {
				maxWidth: "85%",
				px: 1.75,
				py: 1.1,
				borderRadius: "18px",
				borderBottomRightRadius: n ? "6px" : "18px",
				borderBottomLeftRadius: n ? "18px" : "6px",
				overflowWrap: "anywhere",
				...n ? {
					background: "var(--hart-accent)",
					color: "var(--hart-ink)"
				} : {
					background: r ? "rgba(255,92,128,0.14)" : "rgba(255,255,255,0.08)",
					border: e.isDraft ? "1px dashed var(--hart-accent)" : `1px solid ${r ? "rgba(255,92,128,0.5)" : "rgba(255,255,255,0.12)"}`,
					color: "#fff",
					opacity: e.isDraft ? .88 : 1
				}
			},
			children: [
				/* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "body2",
					component: "p",
					sx: {
						m: 0,
						fontSize: 14,
						lineHeight: 1.5,
						whiteSpace: "pre-line"
					},
					children: e.text
				}),
				e.isDraft && /* @__PURE__ */ (0, Z.jsx)(Q, {
					variant: "caption",
					component: "p",
					sx: {
						m: 0,
						mt: .5,
						color: "var(--hart-accent)",
						fontStyle: "italic"
					},
					children: "draft · refining…"
				}),
				r && e.retryText && /* @__PURE__ */ (0, Z.jsx)(Pv, {
					size: "small",
					onClick: () => t(e.retryText),
					sx: {
						mt: .75,
						minHeight: 36,
						color: "#fff",
						borderColor: "rgba(255,255,255,0.4)"
					},
					variant: "outlined",
					children: "Try again"
				})
			]
		})
	});
}
function nE({ state: e, session: t, onNavigate: n, onSend: r, compact: i }) {
	let a = i ? e.timeline.slice(-4) : e.timeline, o = -1;
	return a.forEach((e, t) => {
		e.kind === "msg" && e.role === "assistant" && !e.isDraft && (o = t);
	}), /* @__PURE__ */ (0, Z.jsxs)($, {
		sx: {
			display: "flex",
			flexDirection: "column",
			gap: 1.25
		},
		children: [a.map((i, a) => i.kind === "fragment" ? /* @__PURE__ */ (0, Z.jsx)(QT, {
			fragment: i.fragment,
			onAction: t.act,
			onNavigate: n
		}, i.id) : /* @__PURE__ */ (0, Z.jsxs)($, { children: [/* @__PURE__ */ (0, Z.jsx)(tE, {
			msg: i,
			onRetry: r
		}), a === o && !e.thinking && /* @__PURE__ */ (0, Z.jsx)(eE, {
			items: i.suggestions,
			onPick: r
		})] }, i.id)), e.thinking && !a.some((e) => e.isDraft) && /* @__PURE__ */ (0, Z.jsxs)($, {
			sx: {
				alignSelf: "flex-start",
				px: 1.75,
				py: 1,
				borderRadius: "18px",
				background: "rgba(255,255,255,0.08)"
			},
			children: [/* @__PURE__ */ (0, Z.jsx)($T, {}), /* @__PURE__ */ (0, Z.jsx)("span", {
				className: "hart-sr",
				children: "Thinking"
			})]
		})]
	});
}
var rE = typeof window < "u" ? window.SpeechRecognition || window.webkitSpeechRecognition : null, iE = {
	"not-allowed": "Microphone access is blocked. Allow it in your browser settings, or type instead.",
	"service-not-allowed": "Voice input is not allowed on this page. Type instead.",
	"audio-capture": "No microphone found. Type instead.",
	network: "Voice needs a connection right now. Type instead."
};
function aE({ sttUrl: e, locale: t, onFinal: n, onListening: r }) {
	let [i, a] = (0, X.useState)(""), [o, s] = (0, X.useState)(null), c = HT(2.2), l = (0, X.useRef)(!1), u = (0, X.useRef)(() => {}), d = qT({
		sttUrl: e || null,
		onPartialResult: (e) => a(e),
		onResult: (e) => {
			l.current || (l.current = !0, a(e), u.current(), n(e));
		},
		onError: (e) => s(iE[e] || "I couldn't hear that. Tap the mic and try again.")
	}), f = !!rE || !!e, p = (0, X.useCallback)(() => {
		d.stopListening(), c.stopListening();
	}, [d, c]);
	u.current = p;
	let m = (0, X.useCallback)(async () => {
		if (l.current = !1, s(null), a(""), !f) {
			s("Voice isn't available in this browser. Type your request instead.");
			return;
		}
		c.startListening(), await d.startListening({ preferredLanguage: t || "en-IN" });
	}, [
		c,
		d,
		t,
		f
	]), h = d.isListening;
	return (0, X.useEffect)(() => {
		r && r(h);
	}, [h, r]), (0, X.useEffect)(() => () => {
		r && r(!1);
	}, [r]), {
		start: m,
		stop: p,
		listening: h,
		partial: i,
		supported: f,
		amplitude: c.amplitude,
		error: o || null,
		method: d.activeMethod
	};
}
var oE = [
	.45,
	.8,
	1,
	.75,
	.5,
	.85,
	.6
];
function sE({ amplitude: e, active: t, height: n = 36 }) {
	let [r, i] = (0, X.useState)(0);
	(0, X.useEffect)(() => {
		if (!t || typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let e = requestAnimationFrame(function t(n) {
			i(n / 180), e = requestAnimationFrame(t);
		});
		return () => cancelAnimationFrame(e);
	}, [t]);
	let a = t ? Math.max(.12, Math.min(1, e * 1.4)) : .1;
	return /* @__PURE__ */ (0, Z.jsx)($, {
		"aria-hidden": "true",
		sx: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			gap: "5px",
			height: n
		},
		children: oE.map((e, i) => {
			let o = t ? .65 + .35 * Math.sin(r + i * .9) : 1, s = Math.max(.12, Math.min(1, a * e * o));
			return /* @__PURE__ */ (0, Z.jsx)($, { sx: {
				width: 5,
				height: n,
				borderRadius: 3,
				background: "linear-gradient(180deg, var(--hart-accent), var(--hart-accent-2))",
				transform: `scaleY(${s})`,
				transformOrigin: "center",
				transition: "transform 90ms linear",
				opacity: t ? 1 : .5
			} }, i);
		})
	});
}
//#endregion
//#region src/embed/ui/surfaceConfig.js
function cE(e, t, n, r) {
	return {
		type: "column",
		style: {
			alignItems: "center",
			textAlign: "center",
			gap: "8px",
			padding: "8px 4px 4px"
		},
		children: [
			{
				type: "box",
				style: {
					width: "64px",
					height: "64px",
					borderRadius: "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--hart-accent-soft, rgba(155,148,255,0.16))",
					border: "1px solid rgba(255,255,255,0.14)"
				},
				children: [{
					type: "icon",
					props: {
						name: e,
						size: 32,
						color: "var(--hart-accent, #9b94ff)"
					}
				}]
			},
			{
				type: "text",
				props: {
					text: t,
					variant: "h6",
					component: "h2"
				},
				style: {
					fontWeight: 700,
					color: "#fff",
					lineHeight: 1.3
				}
			},
			{
				type: "text",
				props: {
					text: n,
					variant: "body2",
					component: "p"
				},
				style: {
					color: "rgba(255,255,255,0.78)",
					maxWidth: "300px"
				}
			},
			r ? {
				type: "text",
				props: {
					text: r,
					variant: "caption",
					component: "p"
				},
				style: { color: "rgba(255,255,255,0.72)" }
			} : null
		].filter(Boolean)
	};
}
function lE(e, t) {
	switch (e) {
		case "merchant-onboarding": return {
			title: "Store setup",
			subtitle: "Onboard your store and products",
			placeholder: "e.g. onboard my store …",
			suggestions: ["Onboard my store Sri Balaji Stores in 600078", "Add SKU Amul Butter 100g ₹56"],
			welcome: cE("Storefront", "Get your store on McGroce", "Tell me your store name and pincode, then list products by just typing them.", "You review everything before it goes live.")
		};
		case "marketing": return {
			title: "Marketing",
			subtitle: "Campaigns for your customers",
			placeholder: "e.g. draft a Diwali campaign",
			suggestions: ["Draft a Diwali campaign for my customers", "Draft a Pongal campaign for my customers"],
			welcome: cE("Campaign", "Reach your regulars", "I draft festive offers and messages for your customers. You edit and approve.", "Nothing is sent without your approval.")
		};
		case "voice": return {
			title: t,
			subtitle: "Voice shopping",
			placeholder: "Type instead…",
			suggestions: [
				"Add 2 milk",
				"What's in my cart?",
				"Checkout"
			],
			welcome: null
		};
		default: return {
			title: t,
			subtitle: "Your shopping assistant",
			placeholder: `Ask ${t}…`,
			suggestions: [
				"Add 2 milk",
				"Find paneer",
				"What's in my cart?",
				"Track my order"
			],
			welcome: cE("AutoAwesome", "What can I get you today?", "I find products, fill your cart, pay with your approval and track your order.", "Nothing is bought without your approval.")
		};
	}
}
//#endregion
//#region node_modules/@mui/icons-material/AddShoppingCart.js
var uE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M11 9h2V6h3V4h-3V1h-2v3H8v2h3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2m10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2m-9.83-3.25.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25" }), "AddShoppingCart");
})), dE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z" }), "AutoAwesome");
})), fE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M18 11v2h4v-2zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61M20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4M4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34" }), "Campaign");
})), pE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4" }), "HelpOutline");
})), mE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4h16z" }), "Inventory2");
})), hE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m21.41 11.58-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42M5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7" }), "LocalOffer");
})), gE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m13.5-9 1.96 2.5H17V9.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5" }), "LocalShipping");
})), _E = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3m5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72z" }), "Mic");
})), vE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2m-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3m13-6v11c0 1.1-.9 2-2 2H4v-2h17V7z" }), "Payments");
})), yE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" }), "Search");
})), bE = /* @__PURE__ */ T(((e) => {
	var t = Qi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(mh()), r = ic();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m21.9 8.89-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89m-2.99-3.9 1.05 4.37c.1.42.01.84-.25 1.17-.14.18-.44.47-.94.47-.61 0-1.14-.49-1.21-1.14L16.98 5zM13 5h1.96l.54 4.52c.05.39-.07.78-.33 1.07-.22.26-.54.41-.95.41-.67 0-1.22-.59-1.22-1.31zM8.49 9.52 9.04 5H11v4.69c0 .72-.55 1.31-1.29 1.31-.34 0-.65-.15-.89-.41-.25-.29-.37-.68-.33-1.07m-4.45-.16L5.05 5h1.97l-.58 4.86c-.08.65-.6 1.14-1.21 1.14-.49 0-.8-.29-.93-.47-.27-.32-.36-.75-.26-1.17M5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19z" }), "Storefront");
})), xE = /* @__PURE__ */ E({
	AddShoppingCart: () => SE.default,
	AutoAwesome: () => CE.default,
	Campaign: () => wE.default,
	CheckCircle: () => VS.default,
	HelpOutline: () => TE.default,
	Inventory2: () => EE.default,
	LocalOffer: () => DE.default,
	LocalShipping: () => OE.default,
	Mic: () => kE.default,
	Payments: () => AE.default,
	Search: () => jE.default,
	ShoppingCart: () => KS.default,
	Storefront: () => ME.default
}), SE = /* @__PURE__ */ O(uE()), CE = /* @__PURE__ */ O(dE()), wE = /* @__PURE__ */ O(fE()), TE = /* @__PURE__ */ O(pE()), EE = /* @__PURE__ */ O(mE()), DE = /* @__PURE__ */ O(hE()), OE = /* @__PURE__ */ O(gE()), kE = /* @__PURE__ */ O(_E()), AE = /* @__PURE__ */ O(vE()), jE = /* @__PURE__ */ O(yE()), ME = /* @__PURE__ */ O(bE()), NE = (0, X.createContext)(null), PE = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]), FE = (e, t) => {
	if (!t || !e) return;
	let n = t.split(".");
	if (n.length > 10) return;
	let r = e;
	for (let e of n) {
		if (PE.has(e) || r == null) return;
		r = r[e];
	}
	return r;
}, IE = (e, t) => !e || typeof e != "string" ? e : e.replace(/\{\{([^}]+)\}\}/g, (e, n) => {
	let r = FE(t, n.trim());
	return r == null ? "" : String(r);
});
function LE(e) {
	let { colors: t, spacing: n, borderRadius: r, fontSizes: i, fontWeights: a, shadows: o } = e;
	return {
		title: {
			fontSize: i.xl,
			fontWeight: a.extrabold,
			color: t.textPrimary
		},
		subtitle: {
			fontSize: i.lg,
			fontWeight: a.bold,
			color: t.textPrimary
		},
		body: {
			fontSize: i.md,
			color: t.textPrimary
		},
		caption: {
			fontSize: i.sm,
			color: t.textSecondary
		},
		muted: {
			fontSize: i.xs,
			color: t.textMuted
		},
		instruction: {
			fontSize: i.md,
			fontWeight: a.medium,
			color: t.textSecondary,
			textAlign: "center"
		},
		display: {
			fontSize: i.display,
			fontWeight: a.extrabold,
			color: t.accent,
			textAlign: "center"
		},
		correct: {
			fontSize: i.lg,
			fontWeight: a.bold,
			color: t.correct
		},
		incorrect: {
			fontSize: i.lg,
			fontWeight: a.bold,
			color: t.incorrect
		},
		hero: {
			fontSize: i.xxl,
			fontWeight: a.extrabold,
			color: t.textPrimary,
			textAlign: "center",
			lineHeight: 1.2
		},
		centered: {
			display: "flex",
			justifyContent: "center",
			alignItems: "center"
		},
		padded: { p: `${n.md}px` },
		paddedLg: { p: `${n.lg}px` },
		row: {
			display: "flex",
			flexDirection: "row",
			alignItems: "center"
		},
		rowSpaced: {
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between"
		},
		column: {
			display: "flex",
			flexDirection: "column"
		},
		wrap: {
			display: "flex",
			flexDirection: "row",
			flexWrap: "wrap"
		},
		flex1: { flex: 1 },
		gap: { gap: `${n.md}px` },
		gapSm: { gap: `${n.sm}px` },
		gapLg: { gap: `${n.lg}px` },
		card: {
			backgroundColor: t.card,
			borderRadius: `${r.lg}px`,
			p: `${n.md}px`,
			boxShadow: o.card
		},
		cardAccent: {
			backgroundColor: t.card,
			borderRadius: `${r.lg}px`,
			p: `${n.md}px`,
			border: `2px solid ${t.accent}`,
			boxShadow: o.card
		},
		chip: {
			backgroundColor: t.card,
			borderRadius: `${r.full}px`,
			px: `${n.md}px`,
			py: `${n.sm}px`,
			border: `1px solid ${t.border}`
		},
		banner: {
			backgroundColor: t.hintBg,
			borderRadius: `${r.md}px`,
			p: `${n.md}px`
		},
		primaryBtn: {
			backgroundColor: t.accent,
			borderRadius: `${r.lg}px`,
			px: `${n.lg}px`,
			py: `${n.md}px`,
			boxShadow: o.button,
			color: t.textOnDark,
			"&:hover": {
				backgroundColor: t.accentLight,
				boxShadow: o.buttonHover
			}
		},
		secondaryBtn: {
			backgroundColor: t.accentSecondary,
			borderRadius: `${r.lg}px`,
			px: `${n.lg}px`,
			py: `${n.md}px`,
			color: t.textOnDark
		},
		outlineBtn: {
			border: `2px solid ${t.accent}`,
			borderRadius: `${r.lg}px`,
			px: `${n.lg}px`,
			py: `${n.md}px`,
			color: t.accent,
			backgroundColor: "transparent"
		},
		dangerBtn: {
			backgroundColor: t.incorrect,
			borderRadius: `${r.lg}px`,
			px: `${n.lg}px`,
			py: `${n.md}px`,
			color: t.textOnDark
		},
		btnText: {
			fontSize: i.md,
			fontWeight: a.bold,
			color: t.textOnDark,
			textAlign: "center"
		},
		btnTextDark: {
			fontSize: i.md,
			fontWeight: a.bold,
			color: t.accent,
			textAlign: "center"
		},
		questionCard: {
			backgroundColor: t.card,
			borderRadius: `${r.xl}px`,
			p: `${n.lg}px`,
			mx: `${n.md}px`,
			boxShadow: o.float
		},
		optionGrid: {
			display: "flex",
			flexDirection: "row",
			flexWrap: "wrap",
			gap: `${n.md}px`,
			justifyContent: "center",
			px: `${n.md}px`
		},
		hintBanner: {
			backgroundColor: t.hintBg,
			borderRadius: `${r.md}px`,
			p: `${n.sm}px`,
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			gap: `${n.xs}px`
		},
		screenBg: {
			flex: 1,
			backgroundColor: t.background,
			minHeight: "100%"
		},
		screenBgSecondary: {
			flex: 1,
			backgroundColor: t.backgroundSecondary,
			minHeight: "100%"
		}
	};
}
function RE(e) {
	let { colors: t, spacing: n, borderRadius: r, fontSizes: i, fontWeights: a, shadows: o } = e;
	return {
		container: {
			width: "100%",
			minHeight: "100%"
		},
		defaultText: {
			fontSize: i.md,
			color: t.textPrimary,
			fontFamily: "\"Nunito\", \"Roboto\", \"Helvetica\", \"Arial\", sans-serif"
		},
		defaultButton: {
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: `${n.sm}px`,
			backgroundColor: t.accent,
			px: `${n.lg}px`,
			py: `${n.md}px`,
			borderRadius: `${r.lg}px`,
			boxShadow: o.button,
			color: t.textOnDark,
			textTransform: "none",
			fontWeight: a.bold,
			fontSize: i.md,
			cursor: "pointer",
			border: "none",
			transition: "all 0.2s ease",
			"&:hover": {
				transform: "translateY(-2px)",
				boxShadow: o.buttonHover
			},
			"&:active": { transform: "translateY(0)" }
		},
		defaultButtonText: {
			fontSize: i.md,
			fontWeight: a.bold,
			color: t.textOnDark
		},
		defaultInput: {
			fontSize: i.md,
			"& .MuiInputBase-input": {
				fontSize: i.md,
				color: t.textPrimary
			},
			"& .MuiOutlinedInput-root": {
				borderRadius: `${r.md}px`,
				backgroundColor: t.card
			}
		},
		defaultCard: {
			backgroundColor: t.card,
			borderRadius: `${r.lg}px`,
			p: `${n.md}px`,
			boxShadow: o.card,
			cursor: "default",
			transition: "all 0.2s ease"
		}
	};
}
function zE(e, t) {
	let n = (r, i) => {
		if (r) {
			if (typeof r == "string") {
				let t = r.split(" ").filter(Boolean), n = {};
				for (let r of t) {
					let t = e[r];
					t && Object.assign(n, t);
				}
				return Object.keys(n).length > 0 ? n : void 0;
			}
			if (Array.isArray(r)) {
				let e = {};
				for (let t of r) {
					let r = n(t, i);
					r && Object.assign(e, r);
				}
				return Object.keys(e).length > 0 ? e : void 0;
			}
			if (typeof r == "object" && r) {
				let e = { ...r };
				for (let n of Object.keys(e)) if (typeof e[n] == "string") {
					if (e[n].startsWith("$")) {
						let r = e[n].slice(1);
						!PE.has(r) && Object.prototype.hasOwnProperty.call(t, r) && (e[n] = t[r]);
					}
					i && e[n].includes("{{") && (e[n] = IE(e[n], i));
				}
				return e;
			}
			return r;
		}
	};
	return n;
}
var BE = (e) => {
	if (!e || typeof e != "string") return null;
	let t = [
		e,
		e.charAt(0).toUpperCase() + e.slice(1),
		e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()).replace(/^./, (e) => e.toUpperCase())
	];
	for (let e of t) if (xE[e]) return xE[e];
	return TE.default || null;
}, VE = {
	fadeIn: "fadeIn 0.5s ease-out forwards",
	fadeInUp: "fadeInUp 0.5s ease-out forwards",
	fadeInDown: "fadeInDown 0.5s ease-out forwards",
	fadeInScale: "fadeInScale 0.4s ease-out forwards",
	bounceIn: "bounceIn 0.6s ease-out forwards",
	pulse: "pulse 1.5s ease-in-out infinite",
	wiggle: "wiggle 0.6s ease-in-out",
	float: "float 3s ease-in-out infinite",
	slideInLeft: "slideInLeft 0.4s ease-out forwards",
	slideInRight: "slideInRight 0.4s ease-out forwards"
}, HE = "sdui-keyframes";
function UE(e) {
	if (typeof document > "u" || (e || document).getElementById(HE)) return;
	let t = document.createElement("style");
	t.id = HE, t.textContent = "\n    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }\n    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }\n    @keyframes fadeInScale { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }\n    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }\n    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }\n    @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }\n    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }\n    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }\n    @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }\n  ", (e || document.head).appendChild(t);
}
var WE = 100, GE = ({ node: e, data: t, onAction: n, depth: r = 0, resolveStyle: i, defaultStyles: a, tokens: o }) => {
	if (!e || r > 20 || typeof e != "object" || e.type && typeof e.type != "string") return null;
	let s = o.colors, c = o.spacing, l = o.borderRadius;
	o.fontSizes;
	let u = o.shadows;
	if (e.visible !== void 0 && !(typeof e.visible == "string" ? FE(t, e.visible) : e.visible) || e.show !== void 0 && !(typeof e.show == "string" ? FE(t, e.show) : e.show) || e.if !== void 0 && !(typeof e.if == "string" ? FE(t, e.if) : e.if)) return null;
	if (e.type === "loop" || e.type === "repeat") {
		var d;
		let s = FE(t, e.bind) || [];
		if (!Array.isArray(s)) return null;
		let c = s.length > WE ? s.slice(0, WE) : s, l = (d = e.children) == null ? void 0 : d[0];
		return l ? /* @__PURE__ */ (0, Z.jsx)(Z.Fragment, { children: c.map((s, c) => /* @__PURE__ */ (0, Z.jsx)(GE, {
			node: {
				...l,
				key: `loop-${c}`
			},
			data: {
				...t,
				item: s,
				index: c
			},
			onAction: n,
			depth: r + 1,
			resolveStyle: i,
			defaultStyles: a,
			tokens: o
		}, e.key ? `${e.key}-${c}` : `loop-${c}`)) }) : null;
	}
	if (e.type === "conditional") {
		var f, p;
		let s = FE(t, e.bind) ? (f = e.children) == null ? void 0 : f[0] : (p = e.children) == null ? void 0 : p[1];
		return s ? /* @__PURE__ */ (0, Z.jsx)(GE, {
			node: s,
			data: t,
			onAction: n,
			depth: r + 1,
			resolveStyle: i,
			defaultStyles: a,
			tokens: o
		}) : null;
	}
	let m = e.bind ? FE(t, e.bind) : void 0, h = i(e.style, t), g = e.props || {}, _ = (e) => !e || !Array.isArray(e) ? null : e.map((e, s) => /* @__PURE__ */ (0, Z.jsx)(GE, {
		node: e,
		data: t,
		onAction: n,
		depth: r + 1,
		resolveStyle: i,
		defaultStyles: a,
		tokens: o
	}, e.key || `child-${s}`)), v = () => {
		e.action && n && n(e.action, {
			node: e,
			boundValue: m,
			...g
		});
	}, y = () => {
		g.navigate && n && n("navigate", {
			path: g.navigate,
			...g
		});
	}, b = () => {
		g.setState && n && n("setState", g.setState);
	}, x = () => {
		v(), g.navigate && y(), g.setState && b();
	}, S = (e) => e == null ? "" : IE(String(e), t), C = e.animation ? { animation: VE[e.animation] || `${e.animation} 0.5s ease-out forwards` } : {};
	switch (e.type) {
		case "view":
		case "box":
		case "column": return /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				display: "flex",
				flexDirection: "column",
				...h,
				...C
			},
			children: _(e.children)
		});
		case "row": return /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				...h,
				...C
			},
			children: _(e.children)
		});
		case "grid": {
			let t = g.columns || 2;
			return /* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					display: "grid",
					gridTemplateColumns: `repeat(${t}, 1fr)`,
					gap: `${c.sm}px`,
					...h,
					...C
				},
				children: _(e.children)
			});
		}
		case "scroll": return /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				overflowY: "auto",
				overflowX: "hidden",
				maxHeight: g.maxHeight || "100%",
				WebkitOverflowScrolling: "touch",
				"&::-webkit-scrollbar": { width: 6 },
				"&::-webkit-scrollbar-thumb": {
					backgroundColor: s.border,
					borderRadius: 3
				},
				...h,
				...C
			},
			children: _(e.children)
		});
		case "list": return /* @__PURE__ */ (0, Z.jsx)($, {
			component: "ul",
			sx: {
				listStyle: g.listStyle || "none",
				m: 0,
				p: 0,
				display: "flex",
				flexDirection: "column",
				gap: `${c.sm}px`,
				...h,
				...C
			},
			children: (e.children || []).map((e, s) => /* @__PURE__ */ (0, Z.jsx)($, {
				component: "li",
				sx: { listStyle: "inherit" },
				children: /* @__PURE__ */ (0, Z.jsx)(GE, {
					node: e,
					data: t,
					onAction: n,
					depth: r + 1,
					resolveStyle: i,
					defaultStyles: a,
					tokens: o
				})
			}, e.key || `list-${s}`))
		});
		case "text": return /* @__PURE__ */ (0, Z.jsx)(Q, {
			sx: {
				...a.defaultText,
				...h,
				...C
			},
			variant: g.variant || "body1",
			component: g.component || "span",
			noWrap: g.noWrap || !1,
			children: S(m === void 0 ? g.text || "" : String(m))
		});
		case "button": return /* @__PURE__ */ (0, Z.jsxs)(Pv, {
			onClick: x,
			disabled: g.disabled,
			variant: g.variant || "contained",
			size: g.size || "medium",
			sx: {
				...a.defaultButton,
				...h,
				...C
			},
			startIcon: g.icon ? (() => {
				let e = BE(g.icon);
				return e ? /* @__PURE__ */ (0, Z.jsx)(e, { sx: {
					fontSize: g.iconSize || 20,
					color: g.iconColor || "inherit"
				} }) : null;
			})() : void 0,
			children: [g.text ? S(g.text) : null, _(e.children)]
		});
		case "icon": {
			let t = BE(m || g.name || "HelpOutline");
			if (!t) return null;
			let n = g.color ? g.color.startsWith("$") ? s[g.color.slice(1)] : g.color : s.accent;
			return e.action ? /* @__PURE__ */ (0, Z.jsx)(y_, {
				onClick: x,
				sx: {
					...h,
					...C
				},
				children: /* @__PURE__ */ (0, Z.jsx)(t, { sx: {
					fontSize: g.size || 24,
					color: n
				} })
			}) : /* @__PURE__ */ (0, Z.jsx)(t, { sx: {
				fontSize: g.size || 24,
				color: n,
				...h,
				...C
			} });
		}
		case "image": {
			let e = m || g.uri || g.src || "";
			return /* @__PURE__ */ (0, Z.jsx)($, {
				component: "img",
				src: e,
				alt: g.alt || "",
				loading: "lazy",
				draggable: !1,
				sx: {
					width: g.width || 100,
					height: g.height || 100,
					borderRadius: g.borderRadius == null ? 0 : `${g.borderRadius}px`,
					objectFit: g.resizeMode || g.objectFit || "contain",
					display: "block",
					...h,
					...C
				}
			});
		}
		case "input": return /* @__PURE__ */ (0, Z.jsx)(BS, {
			sx: {
				...a.defaultInput,
				...h,
				...C
			},
			placeholder: g.placeholder || "",
			value: m === void 0 ? void 0 : String(m),
			onChange: (t) => n && n(e.action || "inputChange", {
				text: t.target.value,
				field: e.bind
			}),
			onKeyDown: (t) => {
				t.key === "Enter" && e.action && n && n(e.action, { field: e.bind });
			},
			type: g.type || "text",
			multiline: g.multiline || !1,
			rows: g.rows || (g.multiline ? 3 : void 0),
			variant: g.variant || "outlined",
			size: "small",
			fullWidth: g.fullWidth !== !1
		});
		case "spacer": return /* @__PURE__ */ (0, Z.jsx)($, { sx: {
			height: g.size || c.md,
			width: g.horizontal ? g.size || c.md : "auto",
			flexShrink: 0,
			...h
		} });
		case "divider": return /* @__PURE__ */ (0, Z.jsx)(Wy, {
			sx: {
				my: `${c.sm}px`,
				borderColor: s.border,
				...h
			},
			orientation: g.orientation || "horizontal"
		});
		case "card": return e.action ? /* @__PURE__ */ (0, Z.jsx)(zv, {
			sx: {
				...a.defaultCard,
				cursor: "pointer",
				"&:hover": {
					transform: "translateY(-4px)",
					boxShadow: u.cardHover
				},
				...h,
				...C
			},
			children: /* @__PURE__ */ (0, Z.jsx)(Kv, {
				onClick: x,
				sx: { p: `${c.md}px` },
				children: _(e.children)
			})
		}) : /* @__PURE__ */ (0, Z.jsx)(zv, {
			sx: {
				...a.defaultCard,
				...h,
				...C
			},
			elevation: 0,
			children: /* @__PURE__ */ (0, Z.jsx)(Zv, {
				sx: {
					p: `${c.md}px`,
					"&:last-child": { pb: `${c.md}px` }
				},
				children: _(e.children)
			})
		});
		case "chip": return /* @__PURE__ */ (0, Z.jsx)(L_, {
			label: S(m === void 0 ? g.label || "" : String(m)),
			icon: g.icon ? (() => {
				let e = BE(g.icon);
				return e ? /* @__PURE__ */ (0, Z.jsx)(e, {}) : void 0;
			})() : void 0,
			color: g.color || "default",
			variant: g.variant || "filled",
			size: g.size || "medium",
			onClick: e.action ? x : void 0,
			onDelete: g.onDelete ? () => n && n("chipDelete", g) : void 0,
			sx: {
				...h,
				...C
			}
		});
		case "progress": {
			let e = m === void 0 ? g.value || 0 : Number(m);
			return g.circular ? /* @__PURE__ */ (0, Z.jsx)(fy, {
				variant: g.indeterminate ? "indeterminate" : "determinate",
				value: e,
				size: g.size || 40,
				thickness: g.thickness || 4,
				sx: {
					color: g.color || s.accent,
					...h,
					...C
				}
			}) : /* @__PURE__ */ (0, Z.jsx)(Yb, {
				variant: g.indeterminate ? "indeterminate" : "determinate",
				value: e,
				sx: {
					height: g.height || 8,
					borderRadius: `${l.full}px`,
					backgroundColor: s.border,
					"& .MuiLinearProgress-bar": {
						backgroundColor: g.color || s.accent,
						borderRadius: `${l.full}px`
					},
					...h,
					...C
				}
			});
		}
		case "animated": {
			let t = g.animation || "fadeIn", n = g.duration || 500, r = g.delay || 0, i = g.loop ? "infinite" : 1;
			return /* @__PURE__ */ (0, Z.jsx)($, {
				sx: {
					animation: `${t} ${n}ms ease-out ${r}ms ${i} forwards`,
					...h
				},
				children: _(e.children)
			});
		}
		default: return /* @__PURE__ */ (0, Z.jsx)($, {
			sx: {
				...h,
				...C
			},
			children: _(e.children)
		});
	}
}, KE = ({ themeTokens: e, layout: t, data: n = {}, onAction: r, sx: i, style: a, keyframesRoot: o }) => {
	let s = (0, X.useContext)(NE), c = e || s, l = (0, X.useMemo)(() => c ? LE(c) : {}, [c]), u = (0, X.useMemo)(() => c ? RE(c) : {}, [c]), d = (0, X.useMemo)(() => c ? zE(l, c.colors) : () => void 0, [l, c]);
	return (0, X.useEffect)(() => {
		UE(o);
	}, [o]), !t || !c ? null : /* @__PURE__ */ (0, Z.jsx)($, {
		sx: {
			...u.container,
			...i
		},
		style: a,
		children: /* @__PURE__ */ (0, Z.jsx)(GE, {
			node: t,
			data: n,
			onAction: r,
			resolveStyle: d,
			defaultStyles: u,
			tokens: c
		})
	});
}, qE = {
	community: "#FF6B6B",
	environment: "#2ECC71",
	education: "#6C63FF",
	health: "#00B8D9",
	equity: "#FFAB00",
	technology: "#7C4DFF"
}, JE = {
	primary: "linear-gradient(135deg, #6C63FF, #9B94FF)",
	primaryHover: "linear-gradient(135deg, #5A52E0, #8A83F0)",
	accent: "linear-gradient(135deg, #FF6B6B, #FF9494)",
	growth: "linear-gradient(135deg, #2ECC71, #A8E6CF)",
	brand: "linear-gradient(135deg, #6C63FF 0%, #FF6B6B 50%, #2ECC71 100%)",
	brandWide: "linear-gradient(90deg, #6C63FF, #FF6B6B, #2ECC71)",
	hart: "linear-gradient(135deg, #FF6B6B, #6C63FF)",
	hartActive: "linear-gradient(135deg, #FF6B6B 0%, #E855A0 50%, #6C63FF 100%)",
	surface: "linear-gradient(180deg, rgba(108,99,255,0.05), transparent)",
	shimmer: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
	intentCommunity: "linear-gradient(135deg, #FF6B6B, #FF9494)",
	intentEnvironment: "linear-gradient(135deg, #2ECC71, #A8E6CF)",
	intentEducation: "linear-gradient(135deg, #6C63FF, #9B94FF)",
	intentHealth: "linear-gradient(135deg, #00B8D9, #79E2F2)",
	intentEquity: "linear-gradient(135deg, #FFAB00, #FFD740)",
	intentTechnology: "linear-gradient(135deg, #7C4DFF, #B388FF)"
};
JE.intentCommunity, JE.intentEnvironment, JE.intentEducation, JE.intentHealth, JE.intentEquity, JE.intentTechnology;
var YE = {
	sm: "8px",
	md: "12px",
	lg: "16px",
	xl: "24px",
	pill: "9999px"
}, XE = {
	card: "0 4px 24px rgba(108, 99, 255, 0.08)",
	cardHover: "0 12px 40px rgba(108, 99, 255, 0.15), 0 0 0 1px rgba(108,99,255,0.08)",
	fab: "0 8px 32px rgba(108, 99, 255, 0.3)",
	float: "0 8px 32px rgba(0,0,0,0.2)",
	glow: "0 0 24px rgba(108, 99, 255, 0.4)",
	inset: "inset 0 1px 0 rgba(255,255,255,0.05)"
}, ZE = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48
};
`${n.fast}${c.smooth}${n.fast}${c.smooth}`, XE.cardHover, `${n.instant}${c.snappy}`;
//#endregion
//#region src/components/shared/LiquidUI/SocialLiquidUI.jsx
function QE(e) {
	return {
		colors: {
			background: e.palette.background.default,
			backgroundSecondary: e.palette.background.paper,
			card: e.custom.surface.elevated,
			border: e.palette.divider,
			textPrimary: e.palette.text.primary,
			textSecondary: e.palette.text.secondary,
			textMuted: "rgba(255,255,254,0.45)",
			textOnDark: "#FFFFFF",
			accent: e.palette.primary.main,
			accentLight: e.palette.primary.light,
			accentSecondary: e.palette.secondary.main,
			correct: e.palette.success.main,
			incorrect: e.palette.error.main,
			hintBg: "rgba(108, 99, 255, 0.08)",
			...qE
		},
		spacing: e.custom.spacing || ZE,
		borderRadius: e.custom.radius || YE,
		fontSizes: {
			xs: 12,
			sm: 14,
			md: 16,
			lg: 20,
			xl: 24,
			xxl: 32,
			display: 40
		},
		fontWeights: {
			normal: 400,
			medium: 500,
			semibold: 600,
			bold: 700,
			extrabold: 800
		},
		shadows: e.custom.shadows || XE
	};
}
function $E({ layout: e, data: t, onAction: n, ...r }) {
	let i = lg(), a = (0, X.useMemo)(() => QE(i), [i]);
	return /* @__PURE__ */ (0, Z.jsx)(KE, {
		themeTokens: a,
		layout: e,
		data: t,
		onAction: n,
		...r
	});
}
//#endregion
//#region src/embed/ui/LiquidSheet.jsx
var eD = 420;
function tD() {
	return /* @__PURE__ */ (0, Z.jsx)("svg", {
		width: "20",
		height: "20",
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, Z.jsx)("path", {
			fill: "currentColor",
			d: "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"
		})
	});
}
function nD() {
	return /* @__PURE__ */ (0, Z.jsx)("svg", {
		width: "20",
		height: "20",
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, Z.jsx)("path", {
			fill: "currentColor",
			d: "M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"
		})
	});
}
function rD({ size: e = 20 }) {
	return /* @__PURE__ */ (0, Z.jsx)("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, Z.jsx)("path", {
			fill: "currentColor",
			d: "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"
		})
	});
}
function iD(e, t) {
	(0, X.useEffect)(() => {
		if (!t || !e.current) return;
		let n = e.current, r = (e) => {
			if (e.key !== "Tab") return;
			let t = Array.from(n.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])")).filter((e) => e.offsetParent !== null || e === document.activeElement);
			if (!t.length) return;
			let r = n.getRootNode().activeElement;
			e.shiftKey && r === t[0] ? (e.preventDefault(), t[t.length - 1].focus()) : !e.shiftKey && r === t[t.length - 1] && (e.preventDefault(), t[0].focus());
		};
		return n.addEventListener("keydown", r), () => n.removeEventListener("keydown", r);
	}, [e, t]);
}
function aD({ open: e, onClose: t, session: n, state: r, surface: i, agentName: a, isDesktop: o, onNavigate: c, sttUrl: u, locale: d, onListening: f, position: p, shadowRoot: m }) {
	let h = lE(i, a), [g, _] = (0, X.useState)(""), [v, y] = (0, X.useState)(0), b = (0, X.useRef)(null), x = (0, X.useRef)(null), S = (0, X.useRef)(null), C = (0, X.useRef)(null), [w, T] = (0, X.useState)(typeof navigator > "u" || navigator.onLine !== !1), E = p === "bottom-left", D = (0, X.useCallback)((e) => {
		let t = String(e || "").trim();
		t && (_(""), n.send(t));
	}, [n]), O = aE({
		sttUrl: u,
		locale: d,
		onFinal: D,
		onListening: f
	});
	(0, X.useEffect)(() => {
		if (!e) {
			O.listening && O.stop();
			return;
		}
		let t = setTimeout(() => {
			o && S.current ? S.current.focus() : b.current && b.current.focus();
		}, 60);
		return () => clearTimeout(t);
	}, [e, o]), iD(b, e && !o), (0, X.useEffect)(() => {
		let e = () => T(!0), t = () => T(!1);
		return window.addEventListener("online", e), window.addEventListener("offline", t), () => {
			window.removeEventListener("online", e), window.removeEventListener("offline", t);
		};
	}, []);
	let k = r.timeline.length;
	(0, X.useEffect)(() => {
		let t = x.current;
		if (!t || !e) return;
		let n = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		requestAnimationFrame(() => {
			try {
				t.scrollTo({
					top: t.scrollHeight,
					behavior: n ? "auto" : "smooth"
				});
			} catch {
				t.scrollTop = t.scrollHeight;
			}
		});
	}, [
		k,
		r.thinking,
		e
	]);
	let A = (e) => {
		e.key === "Escape" && (e.stopPropagation(), t());
	}, j = (e) => {
		o || e.target.closest && e.target.closest("button") || (C.current = {
			y: e.clientY,
			t: performance.now(),
			id: e.pointerId,
			el: e.currentTarget,
			captured: !1
		});
	}, M = (e) => {
		let t = C.current;
		if (!t) return;
		let n = e.clientY - t.y;
		if (!t.captured && n > 6) {
			t.captured = !0;
			try {
				t.el.setPointerCapture(t.id);
			} catch {}
		}
		t.captured && y(Math.max(0, n));
	}, N = (e) => {
		if (!C.current) return;
		let n = e.clientY - C.current.y, r = n / Math.max(1, performance.now() - C.current.t);
		C.current = null, y(0), (n > 110 || r > .9) && t();
	}, P = o ? "translateY(14px) scale(0.96)" : "translateY(105%)", ee = v ? `translateY(${v}px)` : "none", te = r.timeline.length === 0, F = r.transportKind === "demo";
	return /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [!o && /* @__PURE__ */ (0, Z.jsx)($, {
		"aria-hidden": "true",
		onClick: t,
		sx: {
			position: "fixed",
			inset: 0,
			zIndex: 2147482999,
			background: "rgba(8,10,14,0.55)",
			opacity: +!!e,
			pointerEvents: e ? "auto" : "none",
			transition: `opacity ${l}ms ease`
		}
	}), /* @__PURE__ */ (0, Z.jsxs)($, {
		ref: b,
		role: "dialog",
		"aria-modal": o ? "false" : "true",
		"aria-label": `${h.title} — ${h.subtitle}`,
		"aria-hidden": e ? void 0 : "true",
		inert: e ? void 0 : "",
		tabIndex: -1,
		onKeyDown: A,
		"data-testid": "hart-sheet",
		"data-open": e ? "true" : "false",
		sx: {
			...XT,
			position: "fixed",
			zIndex: 2147483e3,
			outline: "none",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			visibility: e ? "visible" : "hidden",
			transform: e ? ee : P,
			opacity: o && !e ? 0 : 1,
			transformOrigin: E ? "bottom left" : "bottom right",
			transition: v ? "none" : `transform ${l + 60}ms ${s}, opacity ${l}ms ease, visibility 0s linear ${e ? "0s" : `${l + 60}ms`}`,
			"@media (prefers-reduced-motion: reduce)": { transition: "none" },
			...o ? {
				bottom: "calc(84px + var(--hart-offset-bottom, 0px))",
				height: "min(720px, calc(100vh - 100px - var(--hart-offset-bottom, 0px)))",
				width: eD,
				maxWidth: "calc(100vw - 32px)",
				[E ? "left" : "right"]: 16
			} : {
				left: 0,
				right: 0,
				bottom: 0,
				height: "85vh",
				maxHeight: "85dvh",
				borderRadius: "20px 20px 0 0",
				borderBottom: "none"
			}
		},
		children: [
			/* @__PURE__ */ (0, Z.jsxs)($, {
				onPointerDown: j,
				onPointerMove: M,
				onPointerUp: N,
				onPointerCancel: N,
				sx: {
					px: 2,
					pt: o ? 1.5 : 1,
					pb: 1.25,
					touchAction: o ? "auto" : "none",
					flexShrink: 0,
					borderBottom: "1px solid rgba(255,255,255,0.08)"
				},
				children: [!o && /* @__PURE__ */ (0, Z.jsx)($, {
					"aria-hidden": "true",
					sx: {
						width: 40,
						height: 4,
						borderRadius: 2,
						background: "rgba(255,255,255,0.35)",
						mx: "auto",
						mb: 1
					}
				}), /* @__PURE__ */ (0, Z.jsxs)($, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 1.25
					},
					children: [
						/* @__PURE__ */ (0, Z.jsx)($, {
							"aria-hidden": "true",
							sx: {
								width: 40,
								height: 40,
								borderRadius: "50%",
								flexShrink: 0,
								display: "grid",
								placeItems: "center",
								background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.7), transparent 40%), var(--hart-accent)",
								color: "var(--hart-ink)",
								fontWeight: 800,
								fontSize: 17
							},
							children: (a || "N").charAt(0).toUpperCase()
						}),
						/* @__PURE__ */ (0, Z.jsxs)($, {
							sx: {
								flex: 1,
								minWidth: 0
							},
							children: [/* @__PURE__ */ (0, Z.jsxs)($, {
								sx: {
									display: "flex",
									alignItems: "center",
									gap: .75,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
									component: "h2",
									sx: {
										m: 0,
										fontSize: 16,
										fontWeight: 700,
										color: "#fff",
										lineHeight: 1.3,
										minWidth: 0
									},
									noWrap: !0,
									children: h.title
								}), F && /* @__PURE__ */ (0, Z.jsx)($, {
									component: "span",
									sx: {
										flexShrink: 0,
										fontSize: 11,
										fontWeight: 700,
										px: .75,
										py: "1px",
										borderRadius: "999px",
										color: "var(--hart-ink)",
										background: "var(--hart-accent-2)",
										whiteSpace: "nowrap"
									},
									children: r.transportLabel
								})]
							}), /* @__PURE__ */ (0, Z.jsx)(Q, {
								component: "p",
								sx: {
									m: 0,
									fontSize: 13,
									color: "rgba(255,255,255,0.72)",
									lineHeight: 1.35
								},
								children: h.subtitle
							})]
						}),
						/* @__PURE__ */ (0, Z.jsx)(y_, {
							onClick: t,
							"aria-label": `Close ${h.title}`,
							sx: {
								width: 44,
								height: 44,
								color: "#fff",
								background: "rgba(255,255,255,0.08)",
								"&:hover": { background: "rgba(255,255,255,0.16)" },
								"&:focus-visible": {
									outline: "2px solid var(--hart-accent)",
									outlineOffset: 2
								}
							},
							children: /* @__PURE__ */ (0, Z.jsx)(tD, {})
						})
					]
				})]
			}),
			!w && r.transportKind === "gateway" && /* @__PURE__ */ (0, Z.jsx)($, {
				role: "status",
				sx: {
					px: 2,
					py: .75,
					fontSize: 13,
					background: "rgba(255,171,0,0.16)",
					color: "#ffe3a3",
					flexShrink: 0
				},
				children: "You’re offline. I’ll be back when your connection is."
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				ref: x,
				"data-testid": "hart-timeline",
				sx: {
					flex: 1,
					overflowY: "auto",
					overscrollBehavior: "contain",
					px: 2,
					py: 1.5,
					display: "flex",
					flexDirection: "column",
					gap: 1.25
				},
				children: [
					r.layout && /* @__PURE__ */ (0, Z.jsx)($, {
						sx: {
							...XT,
							p: 1.5,
							boxShadow: "none"
						},
						children: /* @__PURE__ */ (0, Z.jsx)($E, {
							layout: r.layout,
							data: r.layoutData,
							keyframesRoot: m,
							onAction: (e, t) => {
								e === "navigate" && t && t.path ? c({ path: t.path }) : n.act(e, t);
							}
						})
					}),
					te && !r.layout && /* @__PURE__ */ (0, Z.jsxs)($, {
						sx: {
							m: "auto",
							py: 2,
							width: "100%"
						},
						children: [h.welcome && /* @__PURE__ */ (0, Z.jsx)($E, {
							layout: h.welcome,
							data: {},
							keyframesRoot: m,
							sx: {
								background: "transparent",
								p: 0
							}
						}), /* @__PURE__ */ (0, Z.jsx)($, {
							sx: {
								display: "flex",
								justifyContent: "center"
							},
							children: /* @__PURE__ */ (0, Z.jsx)(eE, {
								items: h.suggestions,
								onPick: D
							})
						})]
					}),
					!te && /* @__PURE__ */ (0, Z.jsx)(nE, {
						state: r,
						session: n,
						onNavigate: c,
						onSend: D
					})
				]
			}),
			/* @__PURE__ */ (0, Z.jsxs)($, {
				component: "form",
				onSubmit: (e) => {
					e.preventDefault(), D(g);
				},
				sx: {
					flexShrink: 0,
					px: 1.5,
					pt: 1,
					pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
					borderTop: "1px solid rgba(255,255,255,0.08)"
				},
				children: [O.error && /* @__PURE__ */ (0, Z.jsx)(Q, {
					role: "alert",
					sx: {
						fontSize: 12.5,
						color: "#ffb3c4",
						px: .5,
						pb: .75
					},
					children: O.error
				}), /* @__PURE__ */ (0, Z.jsxs)($, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 1
					},
					children: [
						/* @__PURE__ */ (0, Z.jsx)(y_, {
							type: "button",
							onClick: () => O.listening ? O.stop() : O.start(),
							"aria-label": O.listening ? "Stop listening" : "Speak your request",
							"aria-pressed": O.listening ? "true" : "false",
							sx: {
								width: 44,
								height: 44,
								flexShrink: 0,
								color: O.listening ? "var(--hart-ink)" : "#fff",
								background: O.listening ? "var(--hart-accent)" : "rgba(255,255,255,0.08)",
								"&:hover": { background: O.listening ? "var(--hart-accent-strong)" : "rgba(255,255,255,0.16)" },
								"&:focus-visible": {
									outline: "2px solid var(--hart-accent)",
									outlineOffset: 2
								}
							},
							children: /* @__PURE__ */ (0, Z.jsx)(rD, {})
						}),
						/* @__PURE__ */ (0, Z.jsx)($, {
							sx: {
								flex: 1,
								minWidth: 0,
								height: 44,
								display: "flex",
								alignItems: "center",
								px: 2,
								borderRadius: "999px",
								background: "rgba(255,255,255,0.08)",
								border: "1px solid rgba(255,255,255,0.16)",
								"&:focus-within": {
									borderColor: "var(--hart-accent)",
									boxShadow: "0 0 0 3px color-mix(in srgb, var(--hart-accent) 30%, transparent)"
								}
							},
							children: O.listening ? /* @__PURE__ */ (0, Z.jsxs)($, {
								sx: {
									display: "flex",
									alignItems: "center",
									gap: 1,
									minWidth: 0,
									width: "100%"
								},
								children: [/* @__PURE__ */ (0, Z.jsx)(sE, {
									amplitude: O.amplitude,
									active: !0,
									height: 22
								}), /* @__PURE__ */ (0, Z.jsx)(Q, {
									noWrap: !0,
									sx: {
										fontSize: 14,
										color: "rgba(255,255,255,0.85)"
									},
									children: O.partial || "Listening…"
								})]
							}) : /* @__PURE__ */ (0, Z.jsx)(ov, {
								inputRef: S,
								value: g,
								onChange: (e) => _(e.target.value),
								placeholder: h.placeholder,
								fullWidth: !0,
								inputProps: {
									"aria-label": `Message ${a}`,
									enterKeyHint: "send",
									autoComplete: "off"
								},
								sx: {
									color: "#fff",
									fontSize: 15,
									"& input::placeholder": {
										color: "rgba(255,255,255,0.6)",
										opacity: 1
									}
								}
							})
						}),
						/* @__PURE__ */ (0, Z.jsx)(y_, {
							type: "submit",
							"aria-label": "Send",
							disabled: !g.trim() || O.listening,
							sx: {
								width: 44,
								height: 44,
								flexShrink: 0,
								color: "var(--hart-ink)",
								background: "var(--hart-accent)",
								transition: `transform ${l}ms ${s}, opacity 150ms ease`,
								"&:hover": { background: "var(--hart-accent-strong)" },
								"&:active": { transform: "scale(0.92)" },
								"&.Mui-disabled": {
									background: "rgba(255,255,255,0.12)",
									color: "rgba(255,255,255,0.45)"
								},
								"&:focus-visible": {
									outline: "2px solid #fff",
									outlineOffset: 2
								}
							},
							children: /* @__PURE__ */ (0, Z.jsx)(nD, {})
						})
					]
				})]
			})
		]
	})] });
}
//#endregion
//#region src/embed/ui/VoiceCapsule.jsx
function oD({ open: e, onClose: t, session: n, state: r, agentName: i, onNavigate: a, sttUrl: o, locale: s, onListening: c, position: l }) {
	let [u, d] = (0, X.useState)(!1), [f, p] = (0, X.useState)(""), [m, h] = (0, X.useState)(0), g = (0, X.useRef)(null), _ = l === "bottom-left", v = (0, X.useCallback)((e) => {
		let t = String(e || "").trim();
		t && (p(""), h(n.getState().timeline.length), n.send(t));
	}, [n]), y = aE({
		sttUrl: o,
		locale: s,
		onFinal: v,
		onListening: c
	});
	(0, X.useEffect)(() => {
		if (!e) {
			y.stop();
			return;
		}
		y.supported && !u ? y.start() : d(!0);
	}, [e]), (0, X.useEffect)(() => {
		u && g.current && g.current.focus();
	}, [u]);
	let b = r.timeline.slice(m), x = [...b].reverse().find((e) => e.kind === "msg" && e.role === "assistant"), S = [...b].reverse().find((e) => e.kind === "fragment"), C = [...b].find((e) => e.kind === "msg" && e.role === "user"), w = "Tap the mic and speak";
	return y.listening ? w = "Listening…" : r.thinking ? w = "Working on it…" : u && (w = "Type your request"), e ? /* @__PURE__ */ (0, Z.jsxs)($, {
		role: "dialog",
		"aria-label": `Voice — ${i}`,
		"data-testid": "hart-voice",
		onKeyDown: (e) => {
			e.key === "Escape" && t();
		},
		sx: {
			...XT,
			...YT,
			position: "fixed",
			zIndex: 2147483e3,
			bottom: "calc(84px + var(--hart-offset-bottom, 0px) + env(safe-area-inset-bottom, 0px))",
			[_ ? "left" : "right"]: 16,
			width: "min(360px, calc(100vw - 32px))",
			maxHeight: "calc(100vh - 120px)",
			overflowY: "auto",
			p: 2,
			display: "flex",
			flexDirection: "column",
			gap: 1.25,
			transformOrigin: _ ? "bottom left" : "bottom right"
		},
		children: [
			/* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)(Q, {
						component: "h2",
						sx: {
							m: 0,
							flex: 1,
							fontSize: 15,
							fontWeight: 700,
							color: "#fff"
						},
						children: w
					}),
					r.transportKind === "demo" && /* @__PURE__ */ (0, Z.jsx)($, {
						component: "span",
						sx: {
							fontSize: 11,
							fontWeight: 600,
							px: .75,
							py: "1px",
							borderRadius: "999px",
							color: "var(--hart-ink)",
							background: "var(--hart-accent-2)"
						},
						children: r.transportLabel
					}),
					y.method === "browser" && /* @__PURE__ */ (0, Z.jsx)($, {
						component: "span",
						title: "Your browser's speech service turns speech into text",
						sx: {
							fontSize: 11,
							px: .75,
							py: "1px",
							borderRadius: "999px",
							border: "1px solid rgba(255,255,255,0.3)",
							color: "rgba(255,255,255,0.85)"
						},
						children: "Browser speech"
					})
				]
			}),
			!u && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: { py: .5 },
				children: [/* @__PURE__ */ (0, Z.jsx)(sE, {
					amplitude: y.amplitude,
					active: y.listening,
					height: 40
				}), /* @__PURE__ */ (0, Z.jsx)(Q, {
					"aria-live": "off",
					sx: {
						mt: 1,
						minHeight: 22,
						textAlign: "center",
						fontSize: 15,
						color: y.partial ? "#fff" : "rgba(255,255,255,0.72)"
					},
					children: y.partial || (C ? `“${C.text}”` : "Try “add 2 milk”")
				})]
			}),
			y.error && /* @__PURE__ */ (0, Z.jsx)(Q, {
				role: "alert",
				sx: {
					fontSize: 13,
					color: "#ffb3c4"
				},
				children: y.error
			}),
			r.thinking && !x && /* @__PURE__ */ (0, Z.jsx)($T, {}),
			x && /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: { ...YT },
				children: [/* @__PURE__ */ (0, Z.jsx)(Q, {
					component: "p",
					sx: {
						m: 0,
						fontSize: 14,
						color: "#fff",
						lineHeight: 1.5
					},
					children: x.text
				}), !r.thinking && /* @__PURE__ */ (0, Z.jsx)(eE, {
					items: x.suggestions,
					onPick: v
				})]
			}),
			S && /* @__PURE__ */ (0, Z.jsx)(QT, {
				fragment: S.fragment,
				onAction: n.act,
				onNavigate: a
			}),
			u ? /* @__PURE__ */ (0, Z.jsxs)($, {
				component: "form",
				onSubmit: (e) => {
					e.preventDefault(), v(f);
				},
				sx: {
					display: "flex",
					gap: 1,
					alignItems: "center"
				},
				children: [/* @__PURE__ */ (0, Z.jsx)($, {
					sx: {
						flex: 1,
						height: 44,
						display: "flex",
						alignItems: "center",
						px: 2,
						borderRadius: "999px",
						background: "rgba(255,255,255,0.08)",
						border: "1px solid rgba(255,255,255,0.16)",
						"&:focus-within": { borderColor: "var(--hart-accent)" }
					},
					children: /* @__PURE__ */ (0, Z.jsx)(ov, {
						inputRef: g,
						value: f,
						onChange: (e) => p(e.target.value),
						fullWidth: !0,
						placeholder: "e.g. add 2 milk",
						inputProps: {
							"aria-label": `Message ${i}`,
							enterKeyHint: "send"
						},
						sx: {
							color: "#fff",
							fontSize: 15,
							"& input::placeholder": {
								color: "rgba(255,255,255,0.6)",
								opacity: 1
							}
						}
					})
				}), y.supported && /* @__PURE__ */ (0, Z.jsx)(y_, {
					type: "button",
					"aria-label": "Speak instead",
					onClick: () => {
						d(!1), y.start();
					},
					sx: {
						width: 44,
						height: 44,
						color: "#fff",
						background: "rgba(255,255,255,0.08)"
					},
					children: /* @__PURE__ */ (0, Z.jsx)(rD, {})
				})]
			}) : /* @__PURE__ */ (0, Z.jsxs)($, {
				sx: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1
				},
				children: [/* @__PURE__ */ (0, Z.jsx)($, {
					component: "button",
					type: "button",
					onClick: () => {
						y.stop(), d(!0);
					},
					sx: {
						minHeight: 44,
						px: 1.5,
						border: 0,
						background: "transparent",
						color: "rgba(255,255,255,0.85)",
						font: "inherit",
						fontSize: 13,
						textDecoration: "underline",
						cursor: "pointer",
						borderRadius: 2,
						"&:focus-visible": { outline: "2px solid var(--hart-accent)" }
					},
					children: "Type instead"
				}), /* @__PURE__ */ (0, Z.jsx)(y_, {
					onClick: () => y.listening ? y.stop() : y.start(),
					"aria-label": y.listening ? "Stop listening" : "Speak again",
					"aria-pressed": y.listening ? "true" : "false",
					sx: {
						width: 56,
						height: 56,
						color: "var(--hart-ink)",
						background: "var(--hart-accent)",
						"&:hover": { background: "var(--hart-accent-strong)" },
						"&:focus-visible": {
							outline: "2px solid #fff",
							outlineOffset: 2
						}
					},
					children: /* @__PURE__ */ (0, Z.jsx)(rD, { size: 26 })
				})]
			})
		]
	}) : null;
}
//#endregion
//#region src/theme/themeBuilder.js
dm();
function sD(e, t) {
	if (e <= 0) return 0;
	let n = .5 + (1 - e / 100) * 1.5;
	return Math.round(t * n);
}
function cD(e, t) {
	return e / 100 * t;
}
function lD(e) {
	var t, r, a, o, s;
	let l = e || i, u = l.colors || i.colors, d = l.glass || i.glass, f = l.animations || i.animations, p = l.font || i.font, m = l.shell || i.shell, h = ((t = f.liquid_motion) == null ? void 0 : t.enabled) !== !1, g = (r = (a = f.liquid_motion) == null ? void 0 : a.intensity) == null ? 60 : r, _ = ((o = f.gradients) == null ? void 0 : o.enabled) !== !1, v = ((s = f.glassmorphism) == null ? void 0 : s.enabled) !== !1, y = {
		primary: `linear-gradient(135deg, ${u.primary}, ${u.primary_light || u.primary})`,
		primaryHover: `linear-gradient(135deg, ${u.primary_dark || u.primary}, ${u.primary})`,
		accent: `linear-gradient(135deg, ${u.secondary}, ${u.secondary_light || u.secondary})`,
		growth: `linear-gradient(135deg, ${u.accent}, ${u.accent_light || u.accent})`,
		brand: `linear-gradient(135deg, ${u.primary} 0%, ${u.secondary} 50%, ${u.accent} 100%)`,
		shimmer: JE.shimmer,
		surface: `linear-gradient(180deg, ${Vh(u.primary, .05)}, transparent)`
	}, b = h ? `all ${sD(g, n.fast)}ms ${c.snappy}` : "none";
	h && `${sD(g, n.fast)}${c.smooth}`;
	let x = h ? `translateY(-${cD(g, 2)}px)` : "none", S = h ? `scale(${1 + cD(g, .1)})` : "none", C = h ? "scale(0.97)" : "none", w = lm({
		palette: {
			mode: "dark",
			background: {
				default: u.background,
				paper: u.paper
			},
			primary: {
				main: u.primary,
				light: u.primary_light || u.primary,
				dark: u.primary_dark || u.primary,
				contrastText: "#FFFFFF"
			},
			secondary: {
				main: u.secondary,
				light: u.secondary_light || u.secondary,
				dark: u.secondary_dark || u.secondary,
				contrastText: "#FFFFFF"
			},
			success: {
				main: u.success || "#2ECC71",
				light: u.accent_light || "#A8E6CF",
				dark: "#27AE60"
			},
			error: {
				main: u.error || "#e74c3c",
				light: "#FF7675"
			},
			warning: {
				main: u.warning || "#FFAB00",
				light: "#FFD740"
			},
			info: {
				main: u.info || "#00B8D9",
				light: "#79E2F2"
			},
			text: {
				primary: u.text_primary,
				secondary: u.text_secondary
			},
			divider: u.divider,
			action: {
				hover: Vh(u.primary, .08),
				selected: Vh(u.primary, .12)
			}
		},
		shape: { borderRadius: 8 },
		typography: {
			fontFamily: `"${p.family || "Inter"}", "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
			fontSize: p.size || 13,
			h1: {
				fontWeight: 800,
				lineHeight: 1.1,
				letterSpacing: "-0.02em"
			},
			h2: {
				fontWeight: 700,
				lineHeight: 1.2,
				letterSpacing: "-0.01em"
			},
			h3: {
				fontWeight: 700,
				lineHeight: 1.3
			},
			h4: {
				fontWeight: 600,
				lineHeight: 1.35
			},
			h5: {
				fontWeight: 600,
				lineHeight: 1.4
			},
			h6: {
				fontWeight: 600,
				lineHeight: 1.4
			},
			body1: {
				fontSize: "1rem",
				lineHeight: 1.6
			},
			body2: {
				fontSize: "0.875rem",
				lineHeight: 1.5
			},
			caption: {
				fontSize: "0.75rem",
				fontWeight: 500,
				lineHeight: 1.4,
				letterSpacing: "0.03em"
			},
			button: { fontWeight: 600 },
			overline: {
				fontWeight: 600,
				letterSpacing: "0.08em",
				fontSize: "0.68rem"
			}
		},
		custom: {
			spacing: ZE,
			radius: YE,
			shadows: XE,
			gradients: {
				...JE,
				...y
			},
			easings: c,
			durations: n,
			intent: qE,
			surface: {
				base: u.paper,
				elevated: u.surface_elevated || "#232148",
				overlay: u.surface_overlay || "#2D2B55"
			},
			glass: {
				...d,
				enabled: v
			},
			animations: f,
			shell: m,
			themeConfig: l
		},
		components: {
			MuiButton: { styleOverrides: {
				root: {
					textTransform: "none",
					borderRadius: YE.md,
					transition: b,
					"&:active": { transform: C }
				},
				containedPrimary: {
					background: y.primary,
					color: "#fff",
					"&:hover": { background: y.primaryHover }
				}
			} },
			MuiCard: { styleOverrides: { root: {
				backgroundImage: "none",
				borderRadius: YE.lg,
				transition: h ? `transform ${sD(g, 250)}ms ${c.smooth}, box-shadow ${sD(g, 250)}ms ${c.smooth}` : "none",
				willChange: h ? "transform" : "auto",
				"&:hover": {
					transform: x,
					boxShadow: h ? XE.cardHover : void 0
				}
			} } },
			MuiIconButton: { styleOverrides: { root: {
				transition: h ? `transform 150ms ${c.smooth}` : "none",
				"&:hover": { transform: S },
				"&:active": { transform: h ? "scale(0.9)" : "none" }
			} } },
			MuiOutlinedInput: { styleOverrides: { root: {
				borderRadius: YE.md,
				transition: h ? `box-shadow ${n.fast}ms ${c.smooth}` : "none",
				"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
					borderColor: u.primary,
					boxShadow: `0 0 0 3px ${Vh(u.primary, .15)}`
				}
			} } },
			MuiDialog: { styleOverrides: { paper: {
				borderRadius: YE.xl,
				...h ? {
					"@keyframes dialogScaleIn": {
						"0%": {
							opacity: 0,
							transform: "scale(0.9)"
						},
						"100%": {
							opacity: 1,
							transform: "scale(1)"
						}
					},
					animation: `dialogScaleIn 250ms ${c.bounce}`
				} : {}
			} } },
			MuiListItemButton: { styleOverrides: { root: {
				borderRadius: YE.sm,
				transition: h ? `background-color 150ms ${c.smooth}, padding-left 150ms ${c.smooth}` : "none",
				"&.Mui-selected": {
					paddingLeft: 20,
					backgroundColor: Vh(u.primary, .08)
				}
			} } },
			MuiFab: { styleOverrides: { root: {
				borderRadius: YE.lg,
				...h ? {
					"@keyframes fabScaleIn": {
						"0%": {
							opacity: 0,
							transform: "scale(0.5)"
						},
						"100%": {
							opacity: 1,
							transform: "scale(1)"
						}
					},
					animation: `fabScaleIn 300ms ${c.bounce}`
				} : {},
				transition: h ? `transform ${n.fast}ms ${c.smooth}, box-shadow ${n.fast}ms ${c.smooth}` : "none",
				"&:hover": { transform: h ? "scale(1.08)" : "none" },
				"&:active": { transform: h ? "scale(0.95)" : "none" }
			} } },
			MuiChip: { styleOverrides: { root: h ? {
				"@keyframes chipPopIn": {
					"0%": {
						opacity: 0,
						transform: "scale(0.8)"
					},
					"100%": {
						opacity: 1,
						transform: "scale(1)"
					}
				},
				animation: `chipPopIn ${n.fast}ms ${c.bounce} both`
			} : {} } },
			MuiTab: { styleOverrides: { root: {
				textTransform: "none",
				fontWeight: 600,
				transition: h ? `color ${n.fast}ms ${c.smooth}` : "none"
			} } },
			MuiBadge: { styleOverrides: { badge: h ? {
				"@keyframes badgePop": {
					"0%": { transform: "scale(0) translate(50%, -50%)" },
					"60%": { transform: "scale(1.15) translate(50%, -50%)" },
					"100%": { transform: "scale(1) translate(50%, -50%)" }
				},
				animation: `badgePop 300ms ${c.bounce}`
			} : {} } },
			MuiSnackbar: { styleOverrides: { root: h ? {
				"@keyframes snackSlideUp": {
					"0%": {
						opacity: 0,
						transform: "translateY(16px)"
					},
					"100%": {
						opacity: 1,
						transform: "translateY(0)"
					}
				},
				animation: `snackSlideUp 300ms ${c.bounce}`
			} : {} } },
			MuiTooltip: { styleOverrides: { tooltip: {
				borderRadius: YE.sm,
				...h ? {
					"@keyframes tooltipFade": {
						"0%": {
							opacity: 0,
							transform: "scale(0.95)"
						},
						"100%": {
							opacity: 1,
							transform: "scale(1)"
						}
					},
					animation: `tooltipFade 150ms ${c.smooth}`
				} : {}
			} } },
			MuiSkeleton: { styleOverrides: { root: {
				backgroundColor: Vh(u.text_primary, .06),
				borderRadius: YE.sm,
				"&::after": { background: _ ? JE.shimmer : "none" }
			} } },
			MuiStepLabel: { styleOverrides: { label: {
				fontWeight: 600,
				"&.Mui-active": { fontWeight: 700 }
			} } },
			MuiDrawer: { styleOverrides: { paper: {
				borderRight: `1px solid ${Vh(u.text_primary, .06)}`,
				backgroundImage: "none"
			} } }
		}
	});
	return w = cg(w), w;
}
//#endregion
//#region node_modules/react-dom/client.js
var uD = /* @__PURE__ */ T(((e) => {
	var t = vg();
	e.createRoot = t.createRoot, e.hydrateRoot = t.hydrateRoot;
}));
zl(), Pu(), dm();
var dD = uD(), fD = /* @__PURE__ */ new Set([
	"assistant",
	"merchant-onboarding",
	"marketing"
]);
function pD(e, t) {
	return lm(lD(e.config), {
		palette: { primary: {
			main: e.accent,
			contrastText: a
		} },
		components: {
			MuiButton: { styleOverrides: { containedPrimary: { color: a } } },
			MuiPopover: { defaultProps: { container: t } },
			MuiPopper: { defaultProps: { container: t } },
			MuiModal: { defaultProps: { container: t } }
		}
	});
}
function mD({ session: e, state: n, hasOrb: i, position: a, isDesktop: o, onNavigate: s }) {
	let c = a === "bottom-left", l = n.openSheets.length > 0, u = (0, X.useCallback)((t) => e.subscribeStack((n) => {
		n._summaryOf && e.getState().openSheets.length > 0 || t(n);
	}), [e]), d = (0, X.useCallback)((e) => s({ path: e }), [s]), f = c ? "left" : "right", p = l && !o, m = {
		visibility: (0, X.useSyncExternalStore)(t.subscribe, t.getSnapshot, t.getSnapshot).some((t) => t !== e.uid) && !o ? "hidden" : "visible",
		zIndex: 2147483002,
		top: "auto",
		bottom: p ? "calc(72px + env(safe-area-inset-bottom, 0px))" : `calc(${i ? 84 : 16}px + var(--hart-offset-bottom, 0px) + env(safe-area-inset-bottom, 0px))`,
		right: "auto",
		left: "auto",
		[f]: l && o ? 452 : 16,
		width: {
			xs: "calc(100% - 32px)",
			sm: 340
		},
		maxHeight: p ? "60vh" : "80vh",
		overflowY: "auto",
		flexDirection: "column-reverse"
	};
	return /* @__PURE__ */ (0, Z.jsx)(VT, {
		subscribe: u,
		onAction: e.act,
		navigate: d,
		containerSx: m,
		cardSx: {
			...XT,
			...YT,
			...p ? { background: r } : {}
		},
		cardTransition: ZT
	});
}
function hD(e) {
	let { session: t, surface: n, open: r, agentName: i, position: a, onClose: o, onNavigate: s, elementId: c, sttUrl: l, locale: u, onListening: d, shadowRoot: f } = e, p = JT(t), m = Ih("(min-width: 768px)", { noSsr: !0 }), h = p.floatingOwner === c, g = {
		session: t,
		state: p,
		agentName: i,
		onNavigate: s,
		sttUrl: l,
		locale: u,
		onListening: d,
		position: a,
		shadowRoot: f,
		onClose: o,
		isDesktop: m
	};
	return /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [
		fD.has(n) && /* @__PURE__ */ (0, Z.jsx)(aD, {
			...g,
			open: r,
			surface: n
		}),
		n === "voice" && /* @__PURE__ */ (0, Z.jsx)(oD, {
			...g,
			open: r
		}),
		h && /* @__PURE__ */ (0, Z.jsx)(mD, {
			session: t,
			state: p,
			hasOrb: n !== "overlay" || t.orbCount() > 0,
			position: a,
			isDesktop: m,
			onNavigate: s
		})
	] });
}
function gD({ props: e, cache: t }) {
	let { theme: n, container: r } = e, i = (0, X.useMemo)(() => pD(n, r), [n, r]);
	return /* @__PURE__ */ (0, Z.jsx)(bu, {
		value: t,
		children: /* @__PURE__ */ (0, Z.jsx)(dg, {
			theme: i,
			children: /* @__PURE__ */ (0, Z.jsx)(hD, { ...e })
		})
	});
}
function _D(e) {
	let t = Rl({
		key: "hart",
		container: e.shadowRoot,
		prepend: !0
	}), n = (0, dD.createRoot)(e.container), r = e, i = () => n.render(/* @__PURE__ */ (0, Z.jsx)(gD, {
		props: r,
		cache: t
	}));
	return i(), {
		update(e) {
			r = e, i();
		},
		unmount() {
			n.unmount();
		}
	};
}
//#endregion
export { _D as mountEmbed };
