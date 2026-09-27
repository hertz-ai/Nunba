import { a as e } from "./hart-embed-liquidFragments-BE7blpJr.js";
import { _ as t, a as n, c as r, f as i, l as a, m as o, n as s, o as c, r as l, s as u } from "./hart-embed-launcherStyles-CXgNY9Bj.js";
import { a as d, i as f, n as p, o as m, r as h, s as g, t as _ } from "./hart-embed-realtimeService-CuKUvH0I.js";
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
	}
}), j = "device:", ee = /^[0-9a-f]{64}$/;
function M(e) {
	if (typeof e != "string") return null;
	let t = e.toLowerCase();
	return t.startsWith(j) && (t = t.slice(7)), ee.test(t) ? [
		0,
		4,
		8,
		12
	].map((e) => t.slice(e, e + 4)).join(" ") : null;
}
var te = "Check the code matches on the phone", ne = Object.freeze(Object.keys(A).filter((e) => A[e].privacyCard));
function re(e) {
	return A[e] ? A[e].asks : `use ${String(e || "this permission").replace(/_/g, " ")}`;
}
function N(e) {
	return !!(A[e] && A[e].perRequester);
}
function ie(e) {
	return String(e || "").trim() || "An agent";
}
function P(e, t) {
	if (!N(e)) return "Permission needed";
	let n = String(t || "").trim();
	return n ? `A phone calling itself "${n}"` : "An unnamed phone";
}
function ae(e) {
	return `Allow ALL agents to ${re(e)}`;
}
function F(e) {
	return N(e) ? "Always allow this phone" : ae(e);
}
function oe(e) {
	return ne.includes(e);
}
function se(e, t, n) {
	if (N(e) || !t) return "Don't allow";
	let r = String(n || "").trim();
	return r ? `Don't allow ${r}` : "Don't allow this agent";
}
var ce = Object.freeze(["consent.granted", "consent.revoked"]);
function le(e, t) {
	if (!e || !t || !e.consent_type || e.consent_type !== t.consent_type) return !1;
	let n = e.scope || "*", r = t.scope || "*", i = e.agent_id == null ? t.agent_id == null : String(e.agent_id) === String(t.agent_id);
	return n === r && i ? !0 : t.agent_id == null || n !== "*" ? !1 : e.agent_id == null || String(e.agent_id) === String(t.agent_id);
}
//#endregion
//#region src/constants/events.js
var ue = "nunba-camera-consent", de = 6e4, fe = [
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
], pe = [
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
], me = [
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
], he = 3e5, ge = /* @__PURE__ */ new Map(), _e = /* @__PURE__ */ new Map(), ve = /* @__PURE__ */ new Map(), ye = 500, be = 200;
function xe() {
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
function Se(e) {
	return `${e._publicScope ? "pub" : xe()}:${(e.method || "get").toUpperCase()}:${e.url || ""}:${e.params ? JSON.stringify(e.params, Object.keys(e.params).sort()) : ""}`;
}
function Ce(e) {
	for (let t of fe) if (t.pattern.test(e)) return t.ttl;
	return de;
}
function we(e) {
	for (let t of me) if (t.pattern.test(e)) return t.ttl;
	return he;
}
function Te(e) {
	return Date.now() - e.timestamp < e.ttl;
}
function Ee(e) {
	return Date.now() - e.timestamp < e.ttl * 2;
}
function De(e, t, n) {
	if (ge.size >= ye) {
		let e = null, t = Infinity;
		for (let [n, r] of ge) r.timestamp < t && (t = r.timestamp, e = n);
		e && ge.delete(e);
	}
	ge.set(e, {
		data: t,
		timestamp: Date.now(),
		ttl: Ce(n)
	});
}
function Oe(e) {
	let t = ge.get(e);
	return t ? Te(t) ? {
		data: t.data,
		stale: !1
	} : Ee(t) ? {
		data: t.data,
		stale: !0
	} : (ge.delete(e), null) : null;
}
function ke(e, t, n) {
	if (_e.size >= be) {
		let e = null, t = Infinity;
		for (let [n, r] of _e) r.expiresAt < t && (t = r.expiresAt, e = n);
		e && _e.delete(e);
	}
	_e.set(e, {
		value: t,
		expiresAt: Date.now() + n
	});
}
function Ae(e) {
	let t = _e.get(e);
	return t ? Date.now() < t.expiresAt ? t.value : (_e.delete(e), null) : null;
}
function je() {
	_e.clear();
}
function Me(e) {
	for (let t of pe) if (t.mutation.test(e)) {
		for (let [e] of ge) for (let n of t.invalidate) if (n.test(e)) {
			ge.delete(e);
			break;
		}
	}
}
function Ne(e, t) {
	if (ve.has(e)) return ve.get(e);
	let n = t().finally(() => {
		ve.delete(e);
	});
	return ve.set(e, n), n;
}
function Pe() {
	ge.clear(), ve.clear();
}
function Fe() {
	let e = 0, t = 0;
	for (let [, n] of ge) Te(n) ? e++ : t++;
	let n = 0, r = 0, i = Date.now();
	for (let [, e] of _e) i < e.expiresAt ? n++ : r++;
	return {
		total: ge.size,
		fresh: e,
		stale: t,
		inFlight: ve.size,
		publicTotal: _e.size,
		publicFresh: n,
		publicExpired: r
	};
}
typeof window < "u" && window.addEventListener("auth:expired", Pe);
var Ie = {
	buildKey: Se,
	get: Oe,
	set: De,
	getPublic: Ae,
	setPublic: ke,
	clearPublic: je,
	getPublicTTL: we,
	invalidateOnMutation: Me,
	dedupFetch: Ne,
	clearAll: Pe,
	getStats: Fe,
	getTTL: Ce
};
//#endregion
//#region node_modules/axios/lib/helpers/bind.js
function Le(e, t) {
	return function() {
		return e.apply(t, arguments);
	};
}
//#endregion
//#region node_modules/axios/lib/utils.js
var { toString: Re } = Object.prototype, { getPrototypeOf: ze } = Object, { iterator: Be, toStringTag: Ve } = Symbol, He = ((e) => (t) => {
	let n = Re.call(t);
	return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
})(Object.create(null)), Ue = (e) => (e = e.toLowerCase(), (t) => He(t) === e), We = (e) => (t) => typeof t === e, { isArray: Ge } = Array, Ke = We("undefined");
function qe(e) {
	return e !== null && !Ke(e) && e.constructor !== null && !Ke(e.constructor) && Ze(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
var Je = Ue("ArrayBuffer");
function Ye(e) {
	let t;
	return t = typeof ArrayBuffer < "u" && ArrayBuffer.isView ? ArrayBuffer.isView(e) : e && e.buffer && Je(e.buffer), t;
}
var Xe = We("string"), Ze = We("function"), Qe = We("number"), $e = (e) => typeof e == "object" && !!e, et = (e) => e === !0 || e === !1, tt = (e) => {
	if (He(e) !== "object") return !1;
	let t = ze(e);
	return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Ve in e) && !(Be in e);
}, nt = (e) => {
	if (!$e(e) || qe(e)) return !1;
	try {
		return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
	} catch {
		return !1;
	}
}, rt = Ue("Date"), it = Ue("File"), at = (e) => !!(e && e.uri !== void 0), ot = (e) => e && e.getParts !== void 0, st = Ue("Blob"), ct = Ue("FileList"), lt = (e) => $e(e) && Ze(e.pipe);
function ut() {
	return typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
}
var dt = ut(), ft = dt.FormData === void 0 ? void 0 : dt.FormData, pt = (e) => {
	let t;
	return e && (ft && e instanceof ft || Ze(e.append) && ((t = He(e)) === "formdata" || t === "object" && Ze(e.toString) && e.toString() === "[object FormData]"));
}, mt = Ue("URLSearchParams"), [ht, gt, _t, vt] = [
	"ReadableStream",
	"Request",
	"Response",
	"Headers"
].map(Ue), yt = (e) => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function bt(e, t, { allOwnKeys: n = !1 } = {}) {
	if (e == null) return;
	let r, i;
	if (typeof e != "object" && (e = [e]), Ge(e)) for (r = 0, i = e.length; r < i; r++) t.call(null, e[r], r, e);
	else {
		if (qe(e)) return;
		let i = n ? Object.getOwnPropertyNames(e) : Object.keys(e), a = i.length, o;
		for (r = 0; r < a; r++) o = i[r], t.call(null, e[o], o, e);
	}
}
function xt(e, t) {
	if (qe(e)) return null;
	t = t.toLowerCase();
	let n = Object.keys(e), r = n.length, i;
	for (; r-- > 0;) if (i = n[r], t === i.toLowerCase()) return i;
	return null;
}
var St = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Ct = (e) => !Ke(e) && e !== St;
function wt() {
	let { caseless: e, skipUndefined: t } = Ct(this) && this || {}, n = {}, r = (r, i) => {
		if (i === "__proto__" || i === "constructor" || i === "prototype") return;
		let a = e && xt(n, i) || i;
		tt(n[a]) && tt(r) ? n[a] = wt(n[a], r) : tt(r) ? n[a] = wt({}, r) : Ge(r) ? n[a] = r.slice() : (!t || !Ke(r)) && (n[a] = r);
	};
	for (let e = 0, t = arguments.length; e < t; e++) arguments[e] && bt(arguments[e], r);
	return n;
}
var Tt = (e, t, n, { allOwnKeys: r } = {}) => (bt(t, (t, r) => {
	n && Ze(t) ? Object.defineProperty(e, r, {
		value: Le(t, n),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : Object.defineProperty(e, r, {
		value: t,
		writable: !0,
		enumerable: !0,
		configurable: !0
	});
}, { allOwnKeys: r }), e), Et = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e), Dt = (e, t, n, r) => {
	e.prototype = Object.create(t.prototype, r), Object.defineProperty(e.prototype, "constructor", {
		value: e,
		writable: !0,
		enumerable: !1,
		configurable: !0
	}), Object.defineProperty(e, "super", { value: t.prototype }), n && Object.assign(e.prototype, n);
}, Ot = (e, t, n, r) => {
	let i, a, o, s = {};
	if (t = t || {}, e == null) return t;
	do {
		for (i = Object.getOwnPropertyNames(e), a = i.length; a-- > 0;) o = i[a], (!r || r(o, e, t)) && !s[o] && (t[o] = e[o], s[o] = !0);
		e = n !== !1 && ze(e);
	} while (e && (!n || n(e, t)) && e !== Object.prototype);
	return t;
}, kt = (e, t, n) => {
	e = String(e), (n === void 0 || n > e.length) && (n = e.length), n -= t.length;
	let r = e.indexOf(t, n);
	return r !== -1 && r === n;
}, At = (e) => {
	if (!e) return null;
	if (Ge(e)) return e;
	let t = e.length;
	if (!Qe(t)) return null;
	let n = Array(t);
	for (; t-- > 0;) n[t] = e[t];
	return n;
}, jt = ((e) => (t) => e && t instanceof e)(typeof Uint8Array < "u" && ze(Uint8Array)), Mt = (e, t) => {
	let n = (e && e[Be]).call(e), r;
	for (; (r = n.next()) && !r.done;) {
		let n = r.value;
		t.call(e, n[0], n[1]);
	}
}, Nt = (e, t) => {
	let n, r = [];
	for (; (n = e.exec(t)) !== null;) r.push(n);
	return r;
}, Pt = Ue("HTMLFormElement"), Ft = (e) => e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(e, t, n) {
	return t.toUpperCase() + n;
}), It = (({ hasOwnProperty: e }) => (t, n) => e.call(t, n))(Object.prototype), Lt = Ue("RegExp"), Rt = (e, t) => {
	let n = Object.getOwnPropertyDescriptors(e), r = {};
	bt(n, (n, i) => {
		let a;
		(a = t(n, i, e)) !== !1 && (r[i] = a || n);
	}), Object.defineProperties(e, r);
}, zt = (e) => {
	Rt(e, (t, n) => {
		if (Ze(e) && [
			"arguments",
			"caller",
			"callee"
		].indexOf(n) !== -1) return !1;
		let r = e[n];
		if (Ze(r)) {
			if (t.enumerable = !1, "writable" in t) {
				t.writable = !1;
				return;
			}
			t.set || (t.set = () => {
				throw Error("Can not rewrite read-only method '" + n + "'");
			});
		}
	});
}, Bt = (e, t) => {
	let n = {}, r = (e) => {
		e.forEach((e) => {
			n[e] = !0;
		});
	};
	return Ge(e) ? r(e) : r(String(e).split(t)), n;
}, Vt = () => {}, Ht = (e, t) => e != null && Number.isFinite(e = +e) ? e : t;
function Ut(e) {
	return !!(e && Ze(e.append) && e[Ve] === "FormData" && e[Be]);
}
var Wt = (e) => {
	let t = Array(10), n = (e, r) => {
		if ($e(e)) {
			if (t.indexOf(e) >= 0) return;
			if (qe(e)) return e;
			if (!("toJSON" in e)) {
				t[r] = e;
				let i = Ge(e) ? [] : {};
				return bt(e, (e, t) => {
					let a = n(e, r + 1);
					!Ke(a) && (i[t] = a);
				}), t[r] = void 0, i;
			}
		}
		return e;
	};
	return n(e, 0);
}, Gt = Ue("AsyncFunction"), Kt = (e) => e && ($e(e) || Ze(e)) && Ze(e.then) && Ze(e.catch), qt = ((e, t) => e ? setImmediate : t ? ((e, t) => (St.addEventListener("message", ({ source: n, data: r }) => {
	n === St && r === e && t.length && t.shift()();
}, !1), (n) => {
	t.push(n), St.postMessage(e, "*");
}))(`axios@${Math.random()}`, []) : (e) => setTimeout(e))(typeof setImmediate == "function", Ze(St.postMessage)), I = {
	isArray: Ge,
	isArrayBuffer: Je,
	isBuffer: qe,
	isFormData: pt,
	isArrayBufferView: Ye,
	isString: Xe,
	isNumber: Qe,
	isBoolean: et,
	isObject: $e,
	isPlainObject: tt,
	isEmptyObject: nt,
	isReadableStream: ht,
	isRequest: gt,
	isResponse: _t,
	isHeaders: vt,
	isUndefined: Ke,
	isDate: rt,
	isFile: it,
	isReactNativeBlob: at,
	isReactNative: ot,
	isBlob: st,
	isRegExp: Lt,
	isFunction: Ze,
	isStream: lt,
	isURLSearchParams: mt,
	isTypedArray: jt,
	isFileList: ct,
	forEach: bt,
	merge: wt,
	extend: Tt,
	trim: yt,
	stripBOM: Et,
	inherits: Dt,
	toFlatObject: Ot,
	kindOf: He,
	kindOfTest: Ue,
	endsWith: kt,
	toArray: At,
	forEachEntry: Mt,
	matchAll: Nt,
	isHTMLForm: Pt,
	hasOwnProperty: It,
	hasOwnProp: It,
	reduceDescriptors: Rt,
	freezeMethods: zt,
	toObjectSet: Bt,
	toCamelCase: Ft,
	noop: Vt,
	toFiniteNumber: Ht,
	findKey: xt,
	global: St,
	isContextDefined: Ct,
	isSpecCompliantForm: Ut,
	toJSONObject: Wt,
	isAsyncFn: Gt,
	isThenable: Kt,
	setImmediate: qt,
	asap: typeof queueMicrotask < "u" ? queueMicrotask.bind(St) : typeof process < "u" && process.nextTick || qt,
	isIterable: (e) => e != null && Ze(e[Be])
}, L = class e extends Error {
	static from(t, n, r, i, a, o) {
		let s = new e(t.message, n || t.code, r, i, a);
		return s.cause = t, s.name = t.name, t.status != null && s.status == null && (s.status = t.status), o && Object.assign(s, o), s;
	}
	constructor(e, t, n, r, i) {
		super(e), Object.defineProperty(this, "message", {
			value: e,
			enumerable: !0,
			writable: !0,
			configurable: !0
		}), this.name = "AxiosError", this.isAxiosError = !0, t && (this.code = t), n && (this.config = n), r && (this.request = r), i && (this.response = i, this.status = i.status);
	}
	toJSON() {
		return {
			message: this.message,
			name: this.name,
			description: this.description,
			number: this.number,
			fileName: this.fileName,
			lineNumber: this.lineNumber,
			columnNumber: this.columnNumber,
			stack: this.stack,
			config: I.toJSONObject(this.config),
			code: this.code,
			status: this.status
		};
	}
};
L.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE", L.ERR_BAD_OPTION = "ERR_BAD_OPTION", L.ECONNABORTED = "ECONNABORTED", L.ETIMEDOUT = "ETIMEDOUT", L.ERR_NETWORK = "ERR_NETWORK", L.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS", L.ERR_DEPRECATED = "ERR_DEPRECATED", L.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE", L.ERR_BAD_REQUEST = "ERR_BAD_REQUEST", L.ERR_CANCELED = "ERR_CANCELED", L.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT", L.ERR_INVALID_URL = "ERR_INVALID_URL";
//#endregion
//#region node_modules/axios/lib/helpers/toFormData.js
function Jt(e) {
	return I.isPlainObject(e) || I.isArray(e);
}
function Yt(e) {
	return I.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
function Xt(e, t, n) {
	return e ? e.concat(t).map(function(e, t) {
		return e = Yt(e), !n && t ? "[" + e + "]" : e;
	}).join(n ? "." : "") : t;
}
function Zt(e) {
	return I.isArray(e) && !e.some(Jt);
}
var Qt = I.toFlatObject(I, {}, null, function(e) {
	return /^is[A-Z]/.test(e);
});
function $t(e, t, n) {
	if (!I.isObject(e)) throw TypeError("target must be an object");
	t = t || new FormData(), n = I.toFlatObject(n, {
		metaTokens: !0,
		dots: !1,
		indexes: !1
	}, !1, function(e, t) {
		return !I.isUndefined(t[e]);
	});
	let r = n.metaTokens, i = n.visitor || l, a = n.dots, o = n.indexes, s = (n.Blob || typeof Blob < "u" && Blob) && I.isSpecCompliantForm(t);
	if (!I.isFunction(i)) throw TypeError("visitor must be a function");
	function c(e) {
		if (e === null) return "";
		if (I.isDate(e)) return e.toISOString();
		if (I.isBoolean(e)) return e.toString();
		if (!s && I.isBlob(e)) throw new L("Blob is not supported. Use a Buffer instead.");
		return I.isArrayBuffer(e) || I.isTypedArray(e) ? s && typeof Blob == "function" ? new Blob([e]) : Buffer.from(e) : e;
	}
	function l(e, n, i) {
		let s = e;
		if (I.isReactNative(t) && I.isReactNativeBlob(e)) return t.append(Xt(i, n, a), c(e)), !1;
		if (e && !i && typeof e == "object") {
			if (I.endsWith(n, "{}")) n = r ? n : n.slice(0, -2), e = JSON.stringify(e);
			else if (I.isArray(e) && Zt(e) || (I.isFileList(e) || I.endsWith(n, "[]")) && (s = I.toArray(e))) return n = Yt(n), s.forEach(function(e, r) {
				!(I.isUndefined(e) || e === null) && t.append(o === !0 ? Xt([n], r, a) : o === null ? n : n + "[]", c(e));
			}), !1;
		}
		return Jt(e) ? !0 : (t.append(Xt(i, n, a), c(e)), !1);
	}
	let u = [], d = Object.assign(Qt, {
		defaultVisitor: l,
		convertValue: c,
		isVisitable: Jt
	});
	function f(e, n) {
		if (!I.isUndefined(e)) {
			if (u.indexOf(e) !== -1) throw Error("Circular reference detected in " + n.join("."));
			u.push(e), I.forEach(e, function(e, r) {
				(!(I.isUndefined(e) || e === null) && i.call(t, e, I.isString(r) ? r.trim() : r, n, d)) === !0 && f(e, n ? n.concat(r) : [r]);
			}), u.pop();
		}
	}
	if (!I.isObject(e)) throw TypeError("data must be an object");
	return f(e), t;
}
//#endregion
//#region node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function en(e) {
	let t = {
		"!": "%21",
		"'": "%27",
		"(": "%28",
		")": "%29",
		"~": "%7E",
		"%20": "+",
		"%00": "\0"
	};
	return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g, function(e) {
		return t[e];
	});
}
function tn(e, t) {
	this._pairs = [], e && $t(e, this, t);
}
var nn = tn.prototype;
nn.append = function(e, t) {
	this._pairs.push([e, t]);
}, nn.toString = function(e) {
	let t = e ? function(t) {
		return e.call(this, t, en);
	} : en;
	return this._pairs.map(function(e) {
		return t(e[0]) + "=" + t(e[1]);
	}, "").join("&");
};
//#endregion
//#region node_modules/axios/lib/helpers/buildURL.js
function rn(e) {
	return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function an(e, t, n) {
	if (!t) return e;
	let r = n && n.encode || rn, i = I.isFunction(n) ? { serialize: n } : n, a = i && i.serialize, o;
	if (o = a ? a(t, i) : I.isURLSearchParams(t) ? t.toString() : new tn(t, i).toString(r), o) {
		let t = e.indexOf("#");
		t !== -1 && (e = e.slice(0, t)), e += (e.indexOf("?") === -1 ? "?" : "&") + o;
	}
	return e;
}
//#endregion
//#region node_modules/axios/lib/core/InterceptorManager.js
var on = class {
	constructor() {
		this.handlers = [];
	}
	use(e, t, n) {
		return this.handlers.push({
			fulfilled: e,
			rejected: t,
			synchronous: n ? n.synchronous : !1,
			runWhen: n ? n.runWhen : null
		}), this.handlers.length - 1;
	}
	eject(e) {
		this.handlers[e] && (this.handlers[e] = null);
	}
	clear() {
		this.handlers && (this.handlers = []);
	}
	forEach(e) {
		I.forEach(this.handlers, function(t) {
			t !== null && e(t);
		});
	}
}, sn = {
	silentJSONParsing: !0,
	forcedJSONParsing: !0,
	clarifyTimeoutError: !1,
	legacyInterceptorReqResOrdering: !0
}, cn = {
	isBrowser: !0,
	classes: {
		URLSearchParams: typeof URLSearchParams < "u" ? URLSearchParams : tn,
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
}, ln = /* @__PURE__ */ E({
	hasBrowserEnv: () => un,
	hasStandardBrowserEnv: () => fn,
	hasStandardBrowserWebWorkerEnv: () => pn,
	navigator: () => dn,
	origin: () => mn
}), un = typeof window < "u" && typeof document < "u", dn = typeof navigator == "object" && navigator || void 0, fn = un && (!dn || [
	"ReactNative",
	"NativeScript",
	"NS"
].indexOf(dn.product) < 0), pn = typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope && typeof self.importScripts == "function", mn = un && window.location.href || "http://localhost", hn = {
	...ln,
	...cn
};
//#endregion
//#region node_modules/axios/lib/helpers/toURLEncodedForm.js
function gn(e, t) {
	return $t(e, new hn.classes.URLSearchParams(), {
		visitor: function(e, t, n, r) {
			return hn.isNode && I.isBuffer(e) ? (this.append(t, e.toString("base64")), !1) : r.defaultVisitor.apply(this, arguments);
		},
		...t
	});
}
//#endregion
//#region node_modules/axios/lib/helpers/formDataToJSON.js
function _n(e) {
	return I.matchAll(/\w+|\[(\w*)]/g, e).map((e) => e[0] === "[]" ? "" : e[1] || e[0]);
}
function vn(e) {
	let t = {}, n = Object.keys(e), r, i = n.length, a;
	for (r = 0; r < i; r++) a = n[r], t[a] = e[a];
	return t;
}
function yn(e) {
	function t(e, n, r, i) {
		let a = e[i++];
		if (a === "__proto__") return !0;
		let o = Number.isFinite(+a), s = i >= e.length;
		return a = !a && I.isArray(r) ? r.length : a, s ? (I.hasOwnProp(r, a) ? r[a] = [r[a], n] : r[a] = n, !o) : ((!r[a] || !I.isObject(r[a])) && (r[a] = []), t(e, n, r[a], i) && I.isArray(r[a]) && (r[a] = vn(r[a])), !o);
	}
	if (I.isFormData(e) && I.isFunction(e.entries)) {
		let n = {};
		return I.forEachEntry(e, (e, r) => {
			t(_n(e), r, n, 0);
		}), n;
	}
	return null;
}
//#endregion
//#region node_modules/axios/lib/defaults/index.js
function bn(e, t, n) {
	if (I.isString(e)) try {
		return (t || JSON.parse)(e), I.trim(e);
	} catch (e) {
		if (e.name !== "SyntaxError") throw e;
	}
	return (n || JSON.stringify)(e);
}
var xn = {
	transitional: sn,
	adapter: [
		"xhr",
		"http",
		"fetch"
	],
	transformRequest: [function(e, t) {
		let n = t.getContentType() || "", r = n.indexOf("application/json") > -1, i = I.isObject(e);
		if (i && I.isHTMLForm(e) && (e = new FormData(e)), I.isFormData(e)) return r ? JSON.stringify(yn(e)) : e;
		if (I.isArrayBuffer(e) || I.isBuffer(e) || I.isStream(e) || I.isFile(e) || I.isBlob(e) || I.isReadableStream(e)) return e;
		if (I.isArrayBufferView(e)) return e.buffer;
		if (I.isURLSearchParams(e)) return t.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
		let a;
		if (i) {
			if (n.indexOf("application/x-www-form-urlencoded") > -1) return gn(e, this.formSerializer).toString();
			if ((a = I.isFileList(e)) || n.indexOf("multipart/form-data") > -1) {
				let t = this.env && this.env.FormData;
				return $t(a ? { "files[]": e } : e, t && new t(), this.formSerializer);
			}
		}
		return i || r ? (t.setContentType("application/json", !1), bn(e)) : e;
	}],
	transformResponse: [function(e) {
		let t = this.transitional || xn.transitional, n = t && t.forcedJSONParsing, r = this.responseType === "json";
		if (I.isResponse(e) || I.isReadableStream(e)) return e;
		if (e && I.isString(e) && (n && !this.responseType || r)) {
			let n = !(t && t.silentJSONParsing) && r;
			try {
				return JSON.parse(e, this.parseReviver);
			} catch (e) {
				if (n) throw e.name === "SyntaxError" ? L.from(e, L.ERR_BAD_RESPONSE, this, null, this.response) : e;
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
		FormData: hn.classes.FormData,
		Blob: hn.classes.Blob
	},
	validateStatus: function(e) {
		return e >= 200 && e < 300;
	},
	headers: { common: {
		Accept: "application/json, text/plain, */*",
		"Content-Type": void 0
	} }
};
I.forEach([
	"delete",
	"get",
	"head",
	"post",
	"put",
	"patch"
], (e) => {
	xn.headers[e] = {};
});
//#endregion
//#region node_modules/axios/lib/helpers/parseHeaders.js
var Sn = I.toObjectSet([
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
]), Cn = (e) => {
	let t = {}, n, r, i;
	return e && e.split("\n").forEach(function(e) {
		i = e.indexOf(":"), n = e.substring(0, i).trim().toLowerCase(), r = e.substring(i + 1).trim(), !(!n || t[n] && Sn[n]) && (n === "set-cookie" ? t[n] ? t[n].push(r) : t[n] = [r] : t[n] = t[n] ? t[n] + ", " + r : r);
	}), t;
}, wn = Symbol("internals");
function Tn(e) {
	return e && String(e).trim().toLowerCase();
}
function En(e) {
	return e === !1 || e == null ? e : I.isArray(e) ? e.map(En) : String(e);
}
function Dn(e) {
	let t = Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g, r;
	for (; r = n.exec(e);) t[r[1]] = r[2];
	return t;
}
var On = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function kn(e, t, n, r, i) {
	if (I.isFunction(r)) return r.call(this, t, n);
	if (i && (t = n), I.isString(t)) {
		if (I.isString(r)) return t.indexOf(r) !== -1;
		if (I.isRegExp(r)) return r.test(t);
	}
}
function An(e) {
	return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, t, n) => t.toUpperCase() + n);
}
function jn(e, t) {
	let n = I.toCamelCase(" " + t);
	[
		"get",
		"set",
		"has"
	].forEach((r) => {
		Object.defineProperty(e, r + n, {
			value: function(e, n, i) {
				return this[r].call(this, t, e, n, i);
			},
			configurable: !0
		});
	});
}
var Mn = class {
	constructor(e) {
		e && this.set(e);
	}
	set(e, t, n) {
		let r = this;
		function i(e, t, n) {
			let i = Tn(t);
			if (!i) throw Error("header name must be a non-empty string");
			let a = I.findKey(r, i);
			(!a || r[a] === void 0 || n === !0 || n === void 0 && r[a] !== !1) && (r[a || t] = En(e));
		}
		let a = (e, t) => I.forEach(e, (e, n) => i(e, n, t));
		if (I.isPlainObject(e) || e instanceof this.constructor) a(e, t);
		else if (I.isString(e) && (e = e.trim()) && !On(e)) a(Cn(e), t);
		else if (I.isObject(e) && I.isIterable(e)) {
			let n = {}, r, i;
			for (let t of e) {
				if (!I.isArray(t)) throw TypeError("Object iterator must return a key-value pair");
				n[i = t[0]] = (r = n[i]) ? I.isArray(r) ? [...r, t[1]] : [r, t[1]] : t[1];
			}
			a(n, t);
		} else e != null && i(t, e, n);
		return this;
	}
	get(e, t) {
		if (e = Tn(e), e) {
			let n = I.findKey(this, e);
			if (n) {
				let e = this[n];
				if (!t) return e;
				if (t === !0) return Dn(e);
				if (I.isFunction(t)) return t.call(this, e, n);
				if (I.isRegExp(t)) return t.exec(e);
				throw TypeError("parser must be boolean|regexp|function");
			}
		}
	}
	has(e, t) {
		if (e = Tn(e), e) {
			let n = I.findKey(this, e);
			return !(!n || this[n] === void 0 || t && !kn(this, this[n], n, t));
		}
		return !1;
	}
	delete(e, t) {
		let n = this, r = !1;
		function i(e) {
			if (e = Tn(e), e) {
				let i = I.findKey(n, e);
				i && (!t || kn(n, n[i], i, t)) && (delete n[i], r = !0);
			}
		}
		return I.isArray(e) ? e.forEach(i) : i(e), r;
	}
	clear(e) {
		let t = Object.keys(this), n = t.length, r = !1;
		for (; n--;) {
			let i = t[n];
			(!e || kn(this, this[i], i, e, !0)) && (delete this[i], r = !0);
		}
		return r;
	}
	normalize(e) {
		let t = this, n = {};
		return I.forEach(this, (r, i) => {
			let a = I.findKey(n, i);
			if (a) {
				t[a] = En(r), delete t[i];
				return;
			}
			let o = e ? An(i) : String(i).trim();
			o !== i && delete t[i], t[o] = En(r), n[o] = !0;
		}), this;
	}
	concat(...e) {
		return this.constructor.concat(this, ...e);
	}
	toJSON(e) {
		let t = Object.create(null);
		return I.forEach(this, (n, r) => {
			n != null && n !== !1 && (t[r] = e && I.isArray(n) ? n.join(", ") : n);
		}), t;
	}
	[Symbol.iterator]() {
		return Object.entries(this.toJSON())[Symbol.iterator]();
	}
	toString() {
		return Object.entries(this.toJSON()).map(([e, t]) => e + ": " + t).join("\n");
	}
	getSetCookie() {
		return this.get("set-cookie") || [];
	}
	get [Symbol.toStringTag]() {
		return "AxiosHeaders";
	}
	static from(e) {
		return e instanceof this ? e : new this(e);
	}
	static concat(e, ...t) {
		let n = new this(e);
		return t.forEach((e) => n.set(e)), n;
	}
	static accessor(e) {
		let t = (this[wn] = this[wn] = { accessors: {} }).accessors, n = this.prototype;
		function r(e) {
			let r = Tn(e);
			t[r] || (jn(n, e), t[r] = !0);
		}
		return I.isArray(e) ? e.forEach(r) : r(e), this;
	}
};
Mn.accessor([
	"Content-Type",
	"Content-Length",
	"Accept",
	"Accept-Encoding",
	"User-Agent",
	"Authorization"
]), I.reduceDescriptors(Mn.prototype, ({ value: e }, t) => {
	let n = t[0].toUpperCase() + t.slice(1);
	return {
		get: () => e,
		set(e) {
			this[n] = e;
		}
	};
}), I.freezeMethods(Mn);
//#endregion
//#region node_modules/axios/lib/core/transformData.js
function Nn(e, t) {
	let n = this || xn, r = t || n, i = Mn.from(r.headers), a = r.data;
	return I.forEach(e, function(e) {
		a = e.call(n, a, i.normalize(), t ? t.status : void 0);
	}), i.normalize(), a;
}
//#endregion
//#region node_modules/axios/lib/cancel/isCancel.js
function Pn(e) {
	return !!(e && e.__CANCEL__);
}
//#endregion
//#region node_modules/axios/lib/cancel/CanceledError.js
var Fn = class extends L {
	constructor(e, t, n) {
		super(e == null ? "canceled" : e, L.ERR_CANCELED, t, n), this.name = "CanceledError", this.__CANCEL__ = !0;
	}
};
//#endregion
//#region node_modules/axios/lib/core/settle.js
function In(e, t, n) {
	let r = n.config.validateStatus;
	!n.status || !r || r(n.status) ? e(n) : t(new L("Request failed with status code " + n.status, [L.ERR_BAD_REQUEST, L.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4], n.config, n.request, n));
}
//#endregion
//#region node_modules/axios/lib/helpers/parseProtocol.js
function Ln(e) {
	let t = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
	return t && t[1] || "";
}
//#endregion
//#region node_modules/axios/lib/helpers/speedometer.js
function Rn(e, t) {
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
function zn(e, t) {
	let n = 0, r = 1e3 / t, i, a, o = (t, r = Date.now()) => {
		n = r, i = null, a && (clearTimeout(a), a = null), e(...t);
	};
	return [(...e) => {
		let t = Date.now(), s = t - n;
		s >= r ? o(e, t) : (i = e, a || (a = setTimeout(() => {
			a = null, o(i);
		}, r - s)));
	}, () => i && o(i)];
}
//#endregion
//#region node_modules/axios/lib/helpers/progressEventReducer.js
var Bn = (e, t, n = 3) => {
	let r = 0, i = Rn(50, 250);
	return zn((n) => {
		let a = n.loaded, o = n.lengthComputable ? n.total : void 0, s = a - r, c = i(s), l = a <= o;
		r = a, e({
			loaded: a,
			total: o,
			progress: o ? a / o : void 0,
			bytes: s,
			rate: c || void 0,
			estimated: c && o && l ? (o - a) / c : void 0,
			event: n,
			lengthComputable: o != null,
			[t ? "download" : "upload"]: !0
		});
	}, n);
}, Vn = (e, t) => {
	let n = e != null;
	return [(r) => t[0]({
		lengthComputable: n,
		total: e,
		loaded: r
	}), t[1]];
}, Hn = (e) => (...t) => I.asap(() => e(...t)), Un = hn.hasStandardBrowserEnv ? ((e, t) => (n) => (n = new URL(n, hn.origin), e.protocol === n.protocol && e.host === n.host && (t || e.port === n.port)))(new URL(hn.origin), hn.navigator && /(msie|trident)/i.test(hn.navigator.userAgent)) : () => !0, Wn = hn.hasStandardBrowserEnv ? {
	write(e, t, n, r, i, a, o) {
		if (typeof document > "u") return;
		let s = [`${e}=${encodeURIComponent(t)}`];
		I.isNumber(n) && s.push(`expires=${new Date(n).toUTCString()}`), I.isString(r) && s.push(`path=${r}`), I.isString(i) && s.push(`domain=${i}`), a === !0 && s.push("secure"), I.isString(o) && s.push(`SameSite=${o}`), document.cookie = s.join("; ");
	},
	read(e) {
		if (typeof document > "u") return null;
		let t = document.cookie.match(RegExp("(?:^|; )" + e + "=([^;]*)"));
		return t ? decodeURIComponent(t[1]) : null;
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
function Gn(e) {
	return typeof e == "string" && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
//#endregion
//#region node_modules/axios/lib/helpers/combineURLs.js
function Kn(e, t) {
	return t ? e.replace(/\/?\/$/, "") + "/" + t.replace(/^\/+/, "") : e;
}
//#endregion
//#region node_modules/axios/lib/core/buildFullPath.js
function qn(e, t, n) {
	let r = !Gn(t);
	return e && (r || n == 0) ? Kn(e, t) : t;
}
//#endregion
//#region node_modules/axios/lib/core/mergeConfig.js
var Jn = (e) => e instanceof Mn ? { ...e } : e;
function Yn(e, t) {
	t = t || {};
	let n = {};
	function r(e, t, n, r) {
		return I.isPlainObject(e) && I.isPlainObject(t) ? I.merge.call({ caseless: r }, e, t) : I.isPlainObject(t) ? I.merge({}, t) : I.isArray(t) ? t.slice() : t;
	}
	function i(e, t, n, i) {
		if (!I.isUndefined(t)) return r(e, t, n, i);
		if (!I.isUndefined(e)) return r(void 0, e, n, i);
	}
	function a(e, t) {
		if (!I.isUndefined(t)) return r(void 0, t);
	}
	function o(e, t) {
		if (!I.isUndefined(t)) return r(void 0, t);
		if (!I.isUndefined(e)) return r(void 0, e);
	}
	function s(n, i, a) {
		if (a in t) return r(n, i);
		if (a in e) return r(void 0, n);
	}
	let c = {
		url: a,
		method: a,
		data: a,
		baseURL: o,
		transformRequest: o,
		transformResponse: o,
		paramsSerializer: o,
		timeout: o,
		timeoutMessage: o,
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
		responseEncoding: o,
		validateStatus: s,
		headers: (e, t, n) => i(Jn(e), Jn(t), n, !0)
	};
	return I.forEach(Object.keys({
		...e,
		...t
	}), function(r) {
		if (r === "__proto__" || r === "constructor" || r === "prototype") return;
		let a = I.hasOwnProp(c, r) ? c[r] : i, o = a(e[r], t[r], r);
		I.isUndefined(o) && a !== s || (n[r] = o);
	}), n;
}
//#endregion
//#region node_modules/axios/lib/helpers/resolveConfig.js
var Xn = (e) => {
	let t = Yn({}, e), { data: n, withXSRFToken: r, xsrfHeaderName: i, xsrfCookieName: a, headers: o, auth: s } = t;
	if (t.headers = o = Mn.from(o), t.url = an(qn(t.baseURL, t.url, t.allowAbsoluteUrls), e.params, e.paramsSerializer), s && o.set("Authorization", "Basic " + btoa((s.username || "") + ":" + (s.password ? unescape(encodeURIComponent(s.password)) : ""))), I.isFormData(n)) {
		if (hn.hasStandardBrowserEnv || hn.hasStandardBrowserWebWorkerEnv) o.setContentType(void 0);
		else if (I.isFunction(n.getHeaders)) {
			let e = n.getHeaders(), t = ["content-type", "content-length"];
			Object.entries(e).forEach(([e, n]) => {
				t.includes(e.toLowerCase()) && o.set(e, n);
			});
		}
	}
	if (hn.hasStandardBrowserEnv && (r && I.isFunction(r) && (r = r(t)), r || r !== !1 && Un(t.url))) {
		let e = i && a && Wn.read(a);
		e && o.set(i, e);
	}
	return t;
}, Zn = typeof XMLHttpRequest < "u" && function(e) {
	return new Promise(function(t, n) {
		let r = Xn(e), i = r.data, a = Mn.from(r.headers).normalize(), { responseType: o, onUploadProgress: s, onDownloadProgress: c } = r, l, u, d, f, p;
		function m() {
			f && f(), p && p(), r.cancelToken && r.cancelToken.unsubscribe(l), r.signal && r.signal.removeEventListener("abort", l);
		}
		let h = new XMLHttpRequest();
		h.open(r.method.toUpperCase(), r.url, !0), h.timeout = r.timeout;
		function g() {
			if (!h) return;
			let r = Mn.from("getAllResponseHeaders" in h && h.getAllResponseHeaders());
			In(function(e) {
				t(e), m();
			}, function(e) {
				n(e), m();
			}, {
				data: !o || o === "text" || o === "json" ? h.responseText : h.response,
				status: h.status,
				statusText: h.statusText,
				headers: r,
				config: e,
				request: h
			}), h = null;
		}
		"onloadend" in h ? h.onloadend = g : h.onreadystatechange = function() {
			h && h.readyState === 4 && (h.status !== 0 || h.responseURL && h.responseURL.indexOf("file:") === 0) && setTimeout(g);
		}, h.onabort = function() {
			h && (n(new L("Request aborted", L.ECONNABORTED, e, h)), h = null);
		}, h.onerror = function(t) {
			let r = new L(t && t.message ? t.message : "Network Error", L.ERR_NETWORK, e, h);
			r.event = t || null, n(r), h = null;
		}, h.ontimeout = function() {
			let t = r.timeout ? "timeout of " + r.timeout + "ms exceeded" : "timeout exceeded", i = r.transitional || sn;
			r.timeoutErrorMessage && (t = r.timeoutErrorMessage), n(new L(t, i.clarifyTimeoutError ? L.ETIMEDOUT : L.ECONNABORTED, e, h)), h = null;
		}, i === void 0 && a.setContentType(null), "setRequestHeader" in h && I.forEach(a.toJSON(), function(e, t) {
			h.setRequestHeader(t, e);
		}), I.isUndefined(r.withCredentials) || (h.withCredentials = !!r.withCredentials), o && o !== "json" && (h.responseType = r.responseType), c && ([d, p] = Bn(c, !0), h.addEventListener("progress", d)), s && h.upload && ([u, f] = Bn(s), h.upload.addEventListener("progress", u), h.upload.addEventListener("loadend", f)), (r.cancelToken || r.signal) && (l = (t) => {
			h && (n(!t || t.type ? new Fn(null, e, h) : t), h.abort(), h = null);
		}, r.cancelToken && r.cancelToken.subscribe(l), r.signal && (r.signal.aborted ? l() : r.signal.addEventListener("abort", l)));
		let _ = Ln(r.url);
		if (_ && hn.protocols.indexOf(_) === -1) {
			n(new L("Unsupported protocol " + _ + ":", L.ERR_BAD_REQUEST, e));
			return;
		}
		h.send(i || null);
	});
}, Qn = (e, t) => {
	let { length: n } = e = e ? e.filter(Boolean) : [];
	if (t || n) {
		let n = new AbortController(), r, i = function(e) {
			if (!r) {
				r = !0, o();
				let t = e instanceof Error ? e : this.reason;
				n.abort(t instanceof L ? t : new Fn(t instanceof Error ? t.message : t));
			}
		}, a = t && setTimeout(() => {
			a = null, i(new L(`timeout of ${t}ms exceeded`, L.ETIMEDOUT));
		}, t), o = () => {
			e && (a && clearTimeout(a), a = null, e.forEach((e) => {
				e.unsubscribe ? e.unsubscribe(i) : e.removeEventListener("abort", i);
			}), e = null);
		};
		e.forEach((e) => e.addEventListener("abort", i));
		let { signal: s } = n;
		return s.unsubscribe = () => I.asap(o), s;
	}
}, $n = function* (e, t) {
	let n = e.byteLength;
	if (!t || n < t) {
		yield e;
		return;
	}
	let r = 0, i;
	for (; r < n;) i = r + t, yield e.slice(r, i), r = i;
}, er = async function* (e, t) {
	for await (let n of tr(e)) yield* $n(n, t);
}, tr = async function* (e) {
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
}, nr = (e, t, n, r) => {
	let i = er(e, t), a = 0, o, s = (e) => {
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
}, rr = 65536, { isFunction: ir } = I, ar = (({ Request: e, Response: t }) => ({
	Request: e,
	Response: t
}))(I.global), { ReadableStream: or, TextEncoder: sr } = I.global, cr = (e, ...t) => {
	try {
		return !!e(...t);
	} catch {
		return !1;
	}
}, lr = (e) => {
	e = I.merge.call({ skipUndefined: !0 }, ar, e);
	let { fetch: t, Request: n, Response: r } = e, i = t ? ir(t) : typeof fetch == "function", a = ir(n), o = ir(r);
	if (!i) return !1;
	let s = i && ir(or), c = i && (typeof sr == "function" ? ((e) => (t) => e.encode(t))(new sr()) : async (e) => new Uint8Array(await new n(e).arrayBuffer())), l = a && s && cr(() => {
		let e = !1, t = new n(hn.origin, {
			body: new or(),
			method: "POST",
			get duplex() {
				return e = !0, "half";
			}
		}).headers.has("Content-Type");
		return e && !t;
	}), u = o && s && cr(() => I.isReadableStream(new r("").body)), d = { stream: u && ((e) => e.body) };
	i && [
		"text",
		"arrayBuffer",
		"blob",
		"formData",
		"stream"
	].forEach((e) => {
		!d[e] && (d[e] = (t, n) => {
			let r = t && t[e];
			if (r) return r.call(t);
			throw new L(`Response type '${e}' is not supported`, L.ERR_NOT_SUPPORT, n);
		});
	});
	let f = async (e) => {
		if (e == null) return 0;
		if (I.isBlob(e)) return e.size;
		if (I.isSpecCompliantForm(e)) return (await new n(hn.origin, {
			method: "POST",
			body: e
		}).arrayBuffer()).byteLength;
		if (I.isArrayBufferView(e) || I.isArrayBuffer(e)) return e.byteLength;
		if (I.isURLSearchParams(e) && (e += ""), I.isString(e)) return (await c(e)).byteLength;
	}, p = async (e, t) => {
		let n = I.toFiniteNumber(e.getContentLength());
		return n == null ? f(t) : n;
	};
	return async (e) => {
		let { url: i, method: o, data: s, signal: c, cancelToken: f, timeout: m, onDownloadProgress: h, onUploadProgress: g, responseType: _, headers: v, withCredentials: y = "same-origin", fetchOptions: b } = Xn(e), x = t || fetch;
		_ = _ ? (_ + "").toLowerCase() : "text";
		let S = Qn([c, f && f.toAbortSignal()], m), C = null, w = S && S.unsubscribe && (() => {
			S.unsubscribe();
		}), T;
		try {
			if (g && l && o !== "get" && o !== "head" && (T = await p(v, s)) !== 0) {
				let e = new n(i, {
					method: "POST",
					body: s,
					duplex: "half"
				}), t;
				if (I.isFormData(s) && (t = e.headers.get("content-type")) && v.setContentType(t), e.body) {
					let [t, n] = Vn(T, Bn(Hn(g)));
					s = nr(e.body, rr, t, n);
				}
			}
			I.isString(y) || (y = y ? "include" : "omit");
			let t = a && "credentials" in n.prototype, c = {
				...b,
				signal: S,
				method: o.toUpperCase(),
				headers: v.normalize().toJSON(),
				body: s,
				duplex: "half",
				credentials: t ? y : void 0
			};
			C = a && new n(i, c);
			let f = await (a ? x(C, b) : x(i, c)), m = u && (_ === "stream" || _ === "response");
			if (u && (h || m && w)) {
				let e = {};
				[
					"status",
					"statusText",
					"headers"
				].forEach((t) => {
					e[t] = f[t];
				});
				let t = I.toFiniteNumber(f.headers.get("content-length")), [n, i] = h && Vn(t, Bn(Hn(h), !0)) || [];
				f = new r(nr(f.body, rr, n, () => {
					i && i(), w && w();
				}), e);
			}
			_ = _ || "text";
			let E = await d[I.findKey(d, _) || "text"](f, e);
			return !m && w && w(), await new Promise((t, n) => {
				In(t, n, {
					data: E,
					headers: Mn.from(f.headers),
					status: f.status,
					statusText: f.statusText,
					config: e,
					request: C
				});
			});
		} catch (t) {
			throw w && w(), t && t.name === "TypeError" && /Load failed|fetch/i.test(t.message) ? Object.assign(new L("Network Error", L.ERR_NETWORK, e, C, t && t.response), { cause: t.cause || t }) : L.from(t, t && t.code, e, C, t && t.response);
		}
	};
}, ur = /* @__PURE__ */ new Map(), dr = (e) => {
	let t = e && e.env || {}, { fetch: n, Request: r, Response: i } = t, a = [
		r,
		i,
		n
	], o = a.length, s, c, l = ur;
	for (; o--;) s = a[o], c = l.get(s), c === void 0 && l.set(s, c = o ? /* @__PURE__ */ new Map() : lr(t)), l = c;
	return c;
};
dr();
//#endregion
//#region node_modules/axios/lib/adapters/adapters.js
var fr = {
	http: null,
	xhr: Zn,
	fetch: { get: dr }
};
I.forEach(fr, (e, t) => {
	if (e) {
		try {
			Object.defineProperty(e, "name", { value: t });
		} catch {}
		Object.defineProperty(e, "adapterName", { value: t });
	}
});
var pr = (e) => `- ${e}`, mr = (e) => I.isFunction(e) || e === null || e === !1;
function hr(e, t) {
	e = I.isArray(e) ? e : [e];
	let { length: n } = e, r, i, a = {};
	for (let o = 0; o < n; o++) {
		r = e[o];
		let n;
		if (i = r, !mr(r) && (i = fr[(n = String(r)).toLowerCase()], i === void 0)) throw new L(`Unknown adapter '${n}'`);
		if (i && (I.isFunction(i) || (i = i.get(t)))) break;
		a[n || "#" + o] = i;
	}
	if (!i) {
		let e = Object.entries(a).map(([e, t]) => `adapter ${e} ` + (t === !1 ? "is not supported by the environment" : "is not available in the build"));
		throw new L("There is no suitable adapter to dispatch the request " + (n ? e.length > 1 ? "since :\n" + e.map(pr).join("\n") : " " + pr(e[0]) : "as no adapter specified"), "ERR_NOT_SUPPORT");
	}
	return i;
}
var gr = {
	getAdapter: hr,
	adapters: fr
};
//#endregion
//#region node_modules/axios/lib/core/dispatchRequest.js
function _r(e) {
	if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted) throw new Fn(null, e);
}
function vr(e) {
	return _r(e), e.headers = Mn.from(e.headers), e.data = Nn.call(e, e.transformRequest), [
		"post",
		"put",
		"patch"
	].indexOf(e.method) !== -1 && e.headers.setContentType("application/x-www-form-urlencoded", !1), gr.getAdapter(e.adapter || xn.adapter, e)(e).then(function(t) {
		return _r(e), t.data = Nn.call(e, e.transformResponse, t), t.headers = Mn.from(t.headers), t;
	}, function(t) {
		return Pn(t) || (_r(e), t && t.response && (t.response.data = Nn.call(e, e.transformResponse, t.response), t.response.headers = Mn.from(t.response.headers))), Promise.reject(t);
	});
}
//#endregion
//#region node_modules/axios/lib/env/data.js
var yr = "1.13.6", br = {};
[
	"object",
	"boolean",
	"number",
	"function",
	"string",
	"symbol"
].forEach((e, t) => {
	br[e] = function(n) {
		return typeof n === e || "a" + (t < 1 ? "n " : " ") + e;
	};
});
var xr = {};
br.transitional = function(e, t, n) {
	function r(e, t) {
		return "[Axios v" + yr + "] Transitional option '" + e + "'" + t + (n ? ". " + n : "");
	}
	return (n, i, a) => {
		if (e === !1) throw new L(r(i, " has been removed" + (t ? " in " + t : "")), L.ERR_DEPRECATED);
		return t && !xr[i] && (xr[i] = !0, console.warn(r(i, " has been deprecated since v" + t + " and will be removed in the near future"))), !e || e(n, i, a);
	};
}, br.spelling = function(e) {
	return (t, n) => (console.warn(`${n} is likely a misspelling of ${e}`), !0);
};
function Sr(e, t, n) {
	if (typeof e != "object") throw new L("options must be an object", L.ERR_BAD_OPTION_VALUE);
	let r = Object.keys(e), i = r.length;
	for (; i-- > 0;) {
		let a = r[i], o = t[a];
		if (o) {
			let t = e[a], n = t === void 0 || o(t, a, e);
			if (n !== !0) throw new L("option " + a + " must be " + n, L.ERR_BAD_OPTION_VALUE);
			continue;
		}
		if (n !== !0) throw new L("Unknown option " + a, L.ERR_BAD_OPTION);
	}
}
var Cr = {
	assertOptions: Sr,
	validators: br
}, wr = Cr.validators, Tr = class {
	constructor(e) {
		this.defaults = e || {}, this.interceptors = {
			request: new on(),
			response: new on()
		};
	}
	async request(e, t) {
		try {
			return await this._request(e, t);
		} catch (e) {
			if (e instanceof Error) {
				let t = {};
				Error.captureStackTrace ? Error.captureStackTrace(t) : t = /* @__PURE__ */ Error();
				let n = t.stack ? t.stack.replace(/^.+\n/, "") : "";
				try {
					e.stack ? n && !String(e.stack).endsWith(n.replace(/^.+\n.+\n/, "")) && (e.stack += "\n" + n) : e.stack = n;
				} catch {}
			}
			throw e;
		}
	}
	_request(e, t) {
		typeof e == "string" ? (t = t || {}, t.url = e) : t = e || {}, t = Yn(this.defaults, t);
		let { transitional: n, paramsSerializer: r, headers: i } = t;
		n !== void 0 && Cr.assertOptions(n, {
			silentJSONParsing: wr.transitional(wr.boolean),
			forcedJSONParsing: wr.transitional(wr.boolean),
			clarifyTimeoutError: wr.transitional(wr.boolean),
			legacyInterceptorReqResOrdering: wr.transitional(wr.boolean)
		}, !1), r != null && (I.isFunction(r) ? t.paramsSerializer = { serialize: r } : Cr.assertOptions(r, {
			encode: wr.function,
			serialize: wr.function
		}, !0)), t.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls === void 0 ? t.allowAbsoluteUrls = !0 : t.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls), Cr.assertOptions(t, {
			baseUrl: wr.spelling("baseURL"),
			withXsrfToken: wr.spelling("withXSRFToken")
		}, !0), t.method = (t.method || this.defaults.method || "get").toLowerCase();
		let a = i && I.merge(i.common, i[t.method]);
		i && I.forEach([
			"delete",
			"get",
			"head",
			"post",
			"put",
			"patch",
			"common"
		], (e) => {
			delete i[e];
		}), t.headers = Mn.concat(a, i);
		let o = [], s = !0;
		this.interceptors.request.forEach(function(e) {
			if (typeof e.runWhen == "function" && e.runWhen(t) === !1) return;
			s = s && e.synchronous;
			let n = t.transitional || sn;
			n && n.legacyInterceptorReqResOrdering ? o.unshift(e.fulfilled, e.rejected) : o.push(e.fulfilled, e.rejected);
		});
		let c = [];
		this.interceptors.response.forEach(function(e) {
			c.push(e.fulfilled, e.rejected);
		});
		let l, u = 0, d;
		if (!s) {
			let e = [vr.bind(this), void 0];
			for (e.unshift(...o), e.push(...c), d = e.length, l = Promise.resolve(t); u < d;) l = l.then(e[u++], e[u++]);
			return l;
		}
		d = o.length;
		let f = t;
		for (; u < d;) {
			let e = o[u++], t = o[u++];
			try {
				f = e(f);
			} catch (e) {
				t.call(this, e);
				break;
			}
		}
		try {
			l = vr.call(this, f);
		} catch (e) {
			return Promise.reject(e);
		}
		for (u = 0, d = c.length; u < d;) l = l.then(c[u++], c[u++]);
		return l;
	}
	getUri(e) {
		return e = Yn(this.defaults, e), an(qn(e.baseURL, e.url, e.allowAbsoluteUrls), e.params, e.paramsSerializer);
	}
};
I.forEach([
	"delete",
	"get",
	"head",
	"options"
], function(e) {
	Tr.prototype[e] = function(t, n) {
		return this.request(Yn(n || {}, {
			method: e,
			url: t,
			data: (n || {}).data
		}));
	};
}), I.forEach([
	"post",
	"put",
	"patch"
], function(e) {
	function t(t) {
		return function(n, r, i) {
			return this.request(Yn(i || {}, {
				method: e,
				headers: t ? { "Content-Type": "multipart/form-data" } : {},
				url: n,
				data: r
			}));
		};
	}
	Tr.prototype[e] = t(), Tr.prototype[e + "Form"] = t(!0);
});
//#endregion
//#region node_modules/axios/lib/cancel/CancelToken.js
var Er = class e {
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
			n.reason || (n.reason = new Fn(e, r, i), t(n.reason));
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
function Dr(e) {
	return function(t) {
		return e.apply(null, t);
	};
}
//#endregion
//#region node_modules/axios/lib/helpers/isAxiosError.js
function Or(e) {
	return I.isObject(e) && e.isAxiosError === !0;
}
//#endregion
//#region node_modules/axios/lib/helpers/HttpStatusCode.js
var kr = {
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
	UriTooLong: 414,
	UnsupportedMediaType: 415,
	RangeNotSatisfiable: 416,
	ExpectationFailed: 417,
	ImATeapot: 418,
	MisdirectedRequest: 421,
	UnprocessableEntity: 422,
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
	WebServerIsDown: 521,
	ConnectionTimedOut: 522,
	OriginIsUnreachable: 523,
	TimeoutOccurred: 524,
	SslHandshakeFailed: 525,
	InvalidSslCertificate: 526
};
Object.entries(kr).forEach(([e, t]) => {
	kr[t] = e;
});
//#endregion
//#region node_modules/axios/lib/axios.js
function Ar(e) {
	let t = new Tr(e), n = Le(Tr.prototype.request, t);
	return I.extend(n, Tr.prototype, t, { allOwnKeys: !0 }), I.extend(n, t, null, { allOwnKeys: !0 }), n.create = function(t) {
		return Ar(Yn(e, t));
	}, n;
}
var jr = Ar(xn);
jr.Axios = Tr, jr.CanceledError = Fn, jr.CancelToken = Er, jr.isCancel = Pn, jr.VERSION = yr, jr.toFormData = $t, jr.AxiosError = L, jr.Cancel = jr.CanceledError, jr.all = function(e) {
	return Promise.all(e);
}, jr.spread = Dr, jr.isAxiosError = Or, jr.mergeConfig = Yn, jr.AxiosHeaders = Mn, jr.formToJSON = (e) => yn(I.isHTMLForm(e) ? new FormData(e) : e), jr.getAdapter = gr.getAdapter, jr.HttpStatusCode = kr, jr.default = jr;
//#endregion
//#region \0hart-embed:no-app-session
var Mr = /* @__PURE__ */ T((() => {
	throw Error("hart-embed: the app auth session is not bundled");
})), Nr = null;
function Pr() {
	if (Nr) return Nr;
	try {
		Nr = Mr().clearAccessTokenForExpiry;
	} catch {
		Nr = () => {
			localStorage.removeItem("access_token");
			try {
				window.dispatchEvent(new Event("auth:expired"));
			} catch {}
		};
	}
	return Nr;
}
function Fr(e, { timeout: t = 15e3, handle401: n = !0, cache: r = !0 } = {}) {
	let i = jr.create({
		baseURL: e,
		headers: { "Content-Type": "application/json" },
		timeout: t
	});
	if (i.interceptors.request.use((e) => {
		let t = localStorage.getItem("access_token");
		return t && (e.headers.Authorization = `Bearer ${t}`), e;
	}), r && i.interceptors.request.use((e) => {
		if ((e.method || "get").toLowerCase() !== "get" || e.cache === !1) return e;
		let t = Ie.buildKey({
			...e,
			_publicScope: !0
		}), n = Ie.getPublic(t);
		if (n !== null) return e.adapter = () => Promise.resolve({
			data: n,
			status: 200,
			statusText: "OK (public cache)",
			headers: {},
			config: e
		}), e;
		let r = Ie.buildKey(e), i = Ie.get(r);
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
				let i = r._cacheKey || Ie.buildKey(r), a = (r.baseURL || "") + (r.url || "");
				Ie.set(i, t, a);
				let o = ((n = e.headers) == null ? void 0 : n["x-cache-scope"]) === "public", s = (t == null ? void 0 : t._public) === !0;
				if (o || s) {
					let e = Ie.buildKey({
						...r,
						_publicScope: !0
					}), n = Ie.getPublicTTL(a);
					Ie.setPublic(e, t, n);
				}
			} else if ([
				"post",
				"put",
				"patch",
				"delete"
			].includes(i)) {
				let e = (r.baseURL || "") + (r.url || "");
				Ie.invalidateOnMutation(e);
			}
		}
		return t;
	}, (e) => {
		var t, i;
		n && ((t = e.response) == null ? void 0 : t.status) === 401 && Pr()();
		try {
			if (typeof window < "u" && e != null && e.config && !e.config.silentError) {
				var a;
				let t = Number((a = e.response) == null ? void 0 : a.status) || 0, n = (e.config.baseURL || "") + (e.config.url || ""), r = String(e.config.method || "get").toUpperCase();
				window.dispatchEvent(new CustomEvent("hevolve:api-error", { detail: {
					status: t,
					path: n,
					method: r
				} }));
			}
		} catch {}
		return r && ((i = e.config) == null ? void 0 : i._staleData) !== void 0 ? e.config._staleData : Promise.reject(e.response ? e.response.data : e);
	}), r) {
		let e = i.request.bind(i);
		i.request = function(t) {
			if ((t.method || "get").toLowerCase() === "get" && t.cache !== !1) {
				let n = Ie.buildKey(t);
				return Ie.dedupFetch(n, () => e(t));
			}
			return e(t);
		};
		let t = i.get.bind(i);
		i.get = function(e, n = {}) {
			let r = {
				...n,
				url: e,
				method: "get"
			}, i = Ie.buildKey(r);
			return Ie.dedupFetch(i, () => t(e, n));
		};
	}
	return i;
}
//#endregion
//#region src/services/socialApi.js
var Ir = Fr(g);
Fr(p, { handle401: !1 });
var Lr = {
	list: (e) => Ir.get("/notifications", { params: e }),
	markRead: (e) => Ir.post("/notifications/read", { ids: e }),
	markAllRead: () => Ir.post("/notifications/read-all")
}, Rr = {
	grant: ({ consent_type: e, scope: t, agent_id: n, metadata: r }) => Ir.post("/consent", {
		consent_type: e,
		scope: t,
		agent_id: n,
		metadata: r
	}),
	revoke: ({ consent_type: e, scope: t, agent_id: n }) => Ir.post("/consent/revoke", {
		consent_type: e,
		scope: t,
		agent_id: n
	}),
	decline: ({ consent_type: e, scope: t, agent_id: n }) => Ir.post("/consent/decline", {
		consent_type: e,
		scope: t,
		agent_id: n
	}),
	list: ({ consent_type: e, active_only: t } = {}) => {
		let n = {};
		return e !== void 0 && (n.consent_type = e), t !== void 0 && (n.active_only = t ? "true" : "false"), Ir.get("/consent", { params: n });
	}
};
Fr(g.replace(/\/social$/, "")), Fr(f, {
	timeout: 18e4,
	cache: !1
}), Fr(d, {
	handle401: !1,
	cache: !1
}), Fr(m, {
	handle401: !1,
	cache: !1
});
//#endregion
//#region node_modules/react/cjs/react.production.min.js
var zr = /* @__PURE__ */ T(((e) => {
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
	function ee(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return j(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function M(e) {
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
	var te = { current: null }, ne = { transition: null }, re = {
		ReactCurrentDispatcher: te,
		ReactCurrentBatchConfig: ne,
		ReactCurrentOwner: C
	};
	function N() {
		throw Error("act(...) is not supported in production builds of React.");
	}
	e.Children = {
		map: ee,
		forEach: function(e, t, n) {
			ee(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return ee(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return ee(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!D(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	}, e.Component = _, e.Fragment = r, e.Profiler = a, e.PureComponent = y, e.StrictMode = i, e.Suspense = l, e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = re, e.act = N, e.cloneElement = function(e, n, r) {
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
			_init: M
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = function(e) {
		var t = ne.transition;
		ne.transition = {};
		try {
			e();
		} finally {
			ne.transition = t;
		}
	}, e.unstable_act = N, e.useCallback = function(e, t) {
		return te.current.useCallback(e, t);
	}, e.useContext = function(e) {
		return te.current.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e) {
		return te.current.useDeferredValue(e);
	}, e.useEffect = function(e, t) {
		return te.current.useEffect(e, t);
	}, e.useId = function() {
		return te.current.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return te.current.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return te.current.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return te.current.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return te.current.useMemo(e, t);
	}, e.useReducer = function(e, t, n) {
		return te.current.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return te.current.useRef(e);
	}, e.useState = function(e) {
		return te.current.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return te.current.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return te.current.useTransition();
	}, e.version = "18.3.1";
})), Br = /* @__PURE__ */ T(((e, t) => {
	t.exports = zr();
})), R = /* @__PURE__ */ O(Br()), Vr = Object.defineProperty, Hr = Object.getOwnPropertySymbols, Ur = Object.prototype.hasOwnProperty, Wr = Object.prototype.propertyIsEnumerable, Gr = (e, t, n) => t in e ? Vr(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Kr = (e, t) => {
	for (var n in t || (t = {})) Ur.call(t, n) && Gr(e, n, t[n]);
	if (Hr) for (var n of Hr(t)) Wr.call(t, n) && Gr(e, n, t[n]);
	return e;
}, qr = (e, t) => {
	var n = {};
	for (var r in e) Ur.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
	if (e != null && Hr) for (var r of Hr(e)) t.indexOf(r) < 0 && Wr.call(e, r) && (n[r] = e[r]);
	return n;
}, Jr;
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
})(Jr || (Jr = {})), ((e) => {
	((e) => {
		let t = class {
			constructor(e, t) {
				this.ordinal = e, this.formatBits = t;
			}
		};
		t.LOW = new t(0, 1), t.MEDIUM = new t(1, 0), t.QUARTILE = new t(2, 3), t.HIGH = new t(3, 2), e.Ecc = t;
	})(e.QrCode || (e.QrCode = {}));
})(Jr || (Jr = {})), ((e) => {
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
})(Jr || (Jr = {}));
var Yr = Jr, Xr = {
	L: Yr.QrCode.Ecc.LOW,
	M: Yr.QrCode.Ecc.MEDIUM,
	Q: Yr.QrCode.Ecc.QUARTILE,
	H: Yr.QrCode.Ecc.HIGH
}, Zr = 128, Qr = "L", $r = "#FFFFFF", ei = "#000000", ti = !1, ni = 1, ri = 4, ii = 0, ai = .1;
function oi(e, t = 0) {
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
function si(e, t) {
	return e.slice().map((e, n) => n < t.y || n >= t.y + t.h ? e : e.map((e, n) => n < t.x || n >= t.x + t.w ? e : !1));
}
function ci(e, t, n, r) {
	if (r == null) return null;
	let i = e.length + n * 2, a = Math.floor(t * ai), o = i / t, s = (r.width || a) * o, c = (r.height || a) * o, l = r.x == null ? e.length / 2 - s / 2 : r.x * o, u = r.y == null ? e.length / 2 - c / 2 : r.y * o, d = r.opacity == null ? 1 : r.opacity, f = null;
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
function li(e, t) {
	return t == null ? e ? ri : ii : Math.max(Math.floor(t), 0);
}
function ui({ value: e, level: t, minVersion: n, includeMargin: r, marginSize: i, imageSettings: a, size: o, boostLevel: s }) {
	let c = R.useMemo(() => {
		let r = (Array.isArray(e) ? e : [e]).reduce((e, t) => (e.push(...Yr.QrSegment.makeSegments(t)), e), []);
		return Yr.QrCode.encodeSegments(r, Xr[t], n, void 0, void 0, s);
	}, [
		e,
		t,
		n,
		s
	]), { cells: l, margin: u, numCells: d, calculatedImageSettings: f } = R.useMemo(() => {
		let e = c.getModules(), t = li(r, i);
		return {
			cells: e,
			margin: t,
			numCells: e.length + t * 2,
			calculatedImageSettings: ci(e, o, t, a)
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
var di = function() {
	try {
		new Path2D().addPath(new Path2D());
	} catch {
		return !1;
	}
	return !0;
}(), fi = R.forwardRef(function(e, t) {
	let n = e, { value: r, size: i = Zr, level: a = Qr, bgColor: o = $r, fgColor: s = ei, includeMargin: c = ti, minVersion: l = ni, boostLevel: u, marginSize: d, imageSettings: f } = n, p = qr(n, [
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
	]), { style: m } = p, h = qr(p, ["style"]), g = f == null ? void 0 : f.src, _ = R.useRef(null), v = R.useRef(null), y = R.useCallback((e) => {
		_.current = e, typeof t == "function" ? t(e) : t && (t.current = e);
	}, [t]), [b, x] = R.useState(!1), { margin: S, cells: C, numCells: w, calculatedImageSettings: T } = ui({
		value: r,
		level: a,
		minVersion: l,
		boostLevel: u,
		includeMargin: c,
		marginSize: d,
		imageSettings: f,
		size: i
	});
	R.useEffect(() => {
		if (_.current != null) {
			let e = _.current, t = e.getContext("2d");
			if (!t) return;
			let n = C, r = v.current, a = T != null && r !== null && r.complete && r.naturalHeight !== 0 && r.naturalWidth !== 0;
			a && T.excavation != null && (n = si(C, T.excavation));
			let c = window.devicePixelRatio || 1;
			e.height = e.width = i * c;
			let l = i / w * c;
			t.scale(l, l), t.fillStyle = o, t.fillRect(0, 0, w, w), t.fillStyle = s, di ? t.fill(new Path2D(oi(n, S))) : C.forEach(function(e, n) {
				e.forEach(function(e, r) {
					e && t.fillRect(r + S, n + S, 1, 1);
				});
			}), T && (t.globalAlpha = T.opacity), a && t.drawImage(r, T.x + S, T.y + S, T.w, T.h);
		}
	}), R.useEffect(() => {
		x(!1);
	}, [g]);
	let E = Kr({
		height: i,
		width: i
	}, m), D = null;
	return g != null && (D = /* @__PURE__ */ R.createElement("img", {
		src: g,
		key: g,
		style: { display: "none" },
		onLoad: () => {
			x(!0);
		},
		ref: v,
		crossOrigin: T == null ? void 0 : T.crossOrigin
	})), /* @__PURE__ */ R.createElement(R.Fragment, null, /* @__PURE__ */ R.createElement("canvas", Kr({
		style: E,
		height: i,
		width: i,
		ref: y,
		role: "img"
	}, h)), D);
});
fi.displayName = "QRCodeCanvas";
var pi = R.forwardRef(function(e, t) {
	let n = e, { value: r, size: i = Zr, level: a = Qr, bgColor: o = $r, fgColor: s = ei, includeMargin: c = ti, minVersion: l = ni, boostLevel: u, title: d, marginSize: f, imageSettings: p } = n, m = qr(n, [
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
	]), { margin: h, cells: g, numCells: _, calculatedImageSettings: v } = ui({
		value: r,
		level: a,
		minVersion: l,
		boostLevel: u,
		includeMargin: c,
		marginSize: f,
		imageSettings: p,
		size: i
	}), y = g, b = null;
	p != null && v != null && (v.excavation != null && (y = si(g, v.excavation)), b = /* @__PURE__ */ R.createElement("image", {
		href: p.src,
		height: v.h,
		width: v.w,
		x: v.x + h,
		y: v.y + h,
		preserveAspectRatio: "none",
		opacity: v.opacity,
		crossOrigin: v.crossOrigin
	}));
	let x = oi(y, h);
	return /* @__PURE__ */ R.createElement("svg", Kr({
		height: i,
		width: i,
		viewBox: `0 0 ${_} ${_}`,
		ref: t,
		role: "img"
	}, m), !!d && /* @__PURE__ */ R.createElement("title", null, d), /* @__PURE__ */ R.createElement("path", {
		fill: o,
		d: `M0,0 h${_}v${_}H0z`,
		shapeRendering: "crispEdges"
	}), /* @__PURE__ */ R.createElement("path", {
		fill: s,
		d: x,
		shapeRendering: "crispEdges"
	}), b);
});
pi.displayName = "QRCodeSVG";
//#endregion
//#region node_modules/@babel/runtime/helpers/interopRequireDefault.js
var mi = /* @__PURE__ */ T(((e, t) => {
	function n(e) {
		return e && e.__esModule ? e : { default: e };
	}
	t.exports = n, t.exports.__esModule = !0, t.exports.default = t.exports;
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/extends.js
function z() {
	return z = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, z.apply(null, arguments);
}
var B = w((() => {}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/deepmerge/deepmerge.js
function hi(e) {
	if (typeof e != "object" || !e) return !1;
	let t = Object.getPrototypeOf(e);
	return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Symbol.toStringTag in e) && !(Symbol.iterator in e);
}
function gi(e) {
	if (/*#__PURE__*/ vi.isValidElement(e) || !hi(e)) return e;
	let t = {};
	return Object.keys(e).forEach((n) => {
		t[n] = gi(e[n]);
	}), t;
}
function _i(e, t, n = { clone: !0 }) {
	let r = n.clone ? z({}, e) : e;
	return hi(e) && hi(t) && Object.keys(t).forEach((i) => {
		/*#__PURE__*/ vi.isValidElement(t[i]) ? r[i] = t[i] : hi(t[i]) && Object.prototype.hasOwnProperty.call(e, i) && hi(e[i]) ? r[i] = _i(e[i], t[i], n) : n.clone ? r[i] = hi(t[i]) ? gi(t[i]) : t[i] : r[i] = t[i];
	}), r;
}
var vi, yi = w((() => {
	B(), vi = /* @__PURE__ */ O(Br());
})), bi = w((() => {
	yi(), yi();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/formatMuiErrorMessage/formatMuiErrorMessage.js
function xi(e) {
	let t = "https://mui.com/production-error/?code=" + e;
	for (let e = 1; e < arguments.length; e += 1) t += "&args[]=" + encodeURIComponent(arguments[e]);
	return "Minified MUI error #" + e + "; visit " + t + " for the full message.";
}
var Si = w((() => {})), Ci = w((() => {
	Si();
})), wi = /* @__PURE__ */ T(((e) => {
	var t = Symbol.for("react.forward_ref"), n = Symbol.for("react.memo");
	e.ForwardRef = t, e.Memo = n;
})), Ti = /* @__PURE__ */ T(((e, t) => {
	t.exports = wi();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/capitalize/capitalize.js
function Ei(e) {
	if (typeof e != "string") throw Error(xi(7));
	return e.charAt(0).toUpperCase() + e.slice(1);
}
var Di = w((() => {
	Ci();
})), Oi = w((() => {
	Di();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/createChainedFunction/createChainedFunction.js
function ki(...e) {
	return e.reduce((e, t) => t == null ? e : function(...n) {
		e.apply(this, n), t.apply(this, n);
	}, () => {});
}
var Ai = w((() => {})), ji = w((() => {
	Ai();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/debounce/debounce.js
function Mi(e, t = 166) {
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
var Ni = w((() => {})), Pi = w((() => {
	Ni(), Ni();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/deprecatedPropType/deprecatedPropType.js
function Fi(e, t) {
	return () => null;
}
var Ii = w((() => {})), Li = w((() => {
	Ii();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/isMuiElement/isMuiElement.js
function Ri(e, t) {
	var n, r;
	return /*#__PURE__*/ zi.isValidElement(e) && t.indexOf((n = e.type.muiName) == null ? (r = e.type) == null || (r = r._payload) == null || (r = r.value) == null ? void 0 : r.muiName : n) !== -1;
}
var zi, Bi = w((() => {
	zi = /* @__PURE__ */ O(Br());
})), Vi = w((() => {
	Bi();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/ownerDocument/ownerDocument.js
function Hi(e) {
	return e && e.ownerDocument || document;
}
var Ui = w((() => {})), Wi = w((() => {
	Ui();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/ownerWindow/ownerWindow.js
function Gi(e) {
	return Hi(e).defaultView || window;
}
var Ki = w((() => {
	Wi();
})), qi = w((() => {
	Ki();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/requirePropFactory/requirePropFactory.js
function Ji(e, t) {
	return () => null;
}
var Yi = w((() => {})), Xi = w((() => {
	Yi();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/setRef/setRef.js
function Zi(e, t) {
	typeof e == "function" ? e(t) : e && (e.current = t);
}
var Qi = w((() => {})), $i = w((() => {
	Qi();
})), ea, ta, na = w((() => {
	ea = /* @__PURE__ */ O(Br()), ta = typeof window < "u" ? ea.useLayoutEffect : ea.useEffect;
})), ra = w((() => {
	na();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useId/useId.js
function ia(e) {
	let [t, n] = oa.useState(e), r = e || t;
	return oa.useEffect(() => {
		t == null && (sa += 1, n(`mui-${sa}`));
	}, [t]), r;
}
function aa(e) {
	if (ca !== void 0) {
		let t = ca();
		return e == null ? t : e;
	}
	return ia(e);
}
var oa, sa, ca, la = w((() => {
	oa = /* @__PURE__ */ O(Br()), sa = 0, ca = oa.useId;
})), ua = w((() => {
	la();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/unsupportedProp/unsupportedProp.js
function da(e, t, n, r, i) {
	return null;
}
var fa = w((() => {})), pa = w((() => {
	fa();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useControlled/useControlled.js
function ma({ controlled: e, default: t, name: n, state: r = "value" }) {
	let { current: i } = ha.useRef(e !== void 0), [a, o] = ha.useState(t);
	return [i ? e : a, ha.useCallback((e) => {
		i || o(e);
	}, [])];
}
var ha, ga = w((() => {
	ha = /* @__PURE__ */ O(Br());
})), _a = w((() => {
	ga();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useEventCallback/useEventCallback.js
function va(e) {
	let t = ya.useRef(e);
	return ta(() => {
		t.current = e;
	}), ya.useRef((...e) => (0, t.current)(...e)).current;
}
var ya, ba = w((() => {
	ya = /* @__PURE__ */ O(Br()), ra();
})), xa = w((() => {
	ba();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useForkRef/useForkRef.js
function Sa(...e) {
	return Ca.useMemo(() => e.every((e) => e == null) ? null : (t) => {
		e.forEach((e) => {
			Zi(e, t);
		});
	}, e);
}
var Ca, wa = w((() => {
	Ca = /* @__PURE__ */ O(Br()), $i();
})), Ta = w((() => {
	wa();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useLazyRef/useLazyRef.js
function Ea(e, t) {
	let n = Da.useRef(Oa);
	return n.current === Oa && (n.current = e(t)), n;
}
var Da, Oa, ka = w((() => {
	Da = /* @__PURE__ */ O(Br()), Oa = {};
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useOnMount/useOnMount.js
function Aa(e) {
	ja.useEffect(e, Ma);
}
var ja, Ma, Na = w((() => {
	ja = /* @__PURE__ */ O(Br()), Ma = [];
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useTimeout/useTimeout.js
function Pa() {
	let e = Ea(Fa.create).current;
	return Aa(e.disposeEffect), e;
}
var Fa, Ia = w((() => {
	ka(), Na(), Fa = class e {
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
})), La = w((() => {
	Ia();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useIsFocusVisible/useIsFocusVisible.js
function Ra(e) {
	let { type: t, tagName: n } = e;
	return !!(n === "INPUT" && Ya[t] && !e.readOnly || n === "TEXTAREA" && !e.readOnly || e.isContentEditable);
}
function za(e) {
	e.metaKey || e.altKey || e.ctrlKey || (Ka = !0);
}
function Ba() {
	Ka = !1;
}
function Va() {
	this.visibilityState === "hidden" && qa && (Ka = !0);
}
function Ha(e) {
	e.addEventListener("keydown", za, !0), e.addEventListener("mousedown", Ba, !0), e.addEventListener("pointerdown", Ba, !0), e.addEventListener("touchstart", Ba, !0), e.addEventListener("visibilitychange", Va, !0);
}
function Ua(e) {
	let { target: t } = e;
	try {
		return t.matches(":focus-visible");
	} catch {}
	return Ka || Ra(t);
}
function Wa() {
	let e = Ga.useCallback((e) => {
		e != null && Ha(e.ownerDocument);
	}, []), t = Ga.useRef(!1);
	function n() {
		return t.current ? (qa = !0, Ja.start(100, () => {
			qa = !1;
		}), t.current = !1, !0) : !1;
	}
	function r(e) {
		return Ua(e) ? (t.current = !0, !0) : !1;
	}
	return {
		isFocusVisibleRef: t,
		onFocus: r,
		onBlur: n,
		ref: e
	};
}
var Ga, Ka, qa, Ja, Ya, Xa = w((() => {
	Ga = /* @__PURE__ */ O(Br()), Ia(), Ka = !0, qa = !1, Ja = new Fa(), Ya = {
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
})), Za = w((() => {
	Xa(), Xa();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/getScrollbarSize/getScrollbarSize.js
function Qa(e) {
	let t = e.documentElement.clientWidth;
	return Math.abs(window.innerWidth - t);
}
var $a = w((() => {})), eo = w((() => {
	$a();
})), to, no = w((() => {
	to = {
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
})), ro = w((() => {
	no();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/resolveProps/resolveProps.js
function io(e, t) {
	let n = z({}, t);
	return Object.keys(e).forEach((r) => {
		if (r.toString().match(/^(components|slots)$/)) n[r] = z({}, e[r], n[r]);
		else if (r.toString().match(/^(componentsProps|slotProps)$/)) {
			let i = e[r] || {}, a = t[r];
			n[r] = {}, !a || !Object.keys(a) ? n[r] = i : !i || !Object.keys(i) ? n[r] = a : (n[r] = z({}, a), Object.keys(i).forEach((e) => {
				n[r][e] = io(i[e], a[e]);
			}));
		} else n[r] === void 0 && (n[r] = e[r]);
	}), n;
}
var ao = w((() => {
	B();
})), oo = w((() => {
	ao();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/composeClasses/composeClasses.js
function V(e, t, n = void 0) {
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
var so = w((() => {})), co = w((() => {
	so();
})), lo, uo, fo, po = w((() => {
	lo = (e) => e, uo = () => {
		let e = lo;
		return {
			configure(t) {
				e = t;
			},
			generate(t) {
				return e(t);
			},
			reset() {
				e = lo;
			}
		};
	}, fo = uo();
})), mo = w((() => {
	po();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/generateUtilityClass/generateUtilityClass.js
function ho(e, t, n = "Mui") {
	let r = go[t];
	return r ? `${n}-${r}` : `${fo.generate(e)}-${t}`;
}
var go, _o = w((() => {
	mo(), go = {
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
})), vo = w((() => {
	_o(), _o();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/generateUtilityClasses/generateUtilityClasses.js
function H(e, t, n = "Mui") {
	let r = {};
	return t.forEach((t) => {
		r[t] = ho(e, t, n);
	}), r;
}
var yo = w((() => {
	vo();
})), bo = w((() => {
	yo();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/clamp/clamp.js
function xo(e, t = -(2 ** 53 - 1), n = 2 ** 53 - 1) {
	return Math.max(t, Math.min(e, n));
}
var So = w((() => {})), Co = w((() => {
	So();
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function U(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var W = w((() => {}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/isHostComponent/isHostComponent.js
function wo(e) {
	return typeof e == "string";
}
var To = w((() => {})), Eo = w((() => {
	To();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/appendOwnerState/appendOwnerState.js
function Do(e, t, n) {
	return e === void 0 || wo(e) ? t : z({}, t, { ownerState: z({}, t.ownerState, n) });
}
var Oo = w((() => {
	B(), Eo();
})), ko = w((() => {
	Oo();
}));
//#endregion
//#region node_modules/clsx/dist/clsx.mjs
function Ao(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = Ao(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function G() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = Ao(e)) && (r && (r += " "), r += t);
	return r;
}
var jo = w((() => {}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/extractEventHandlers/extractEventHandlers.js
function Mo(e, t = []) {
	if (e === void 0) return {};
	let n = {};
	return Object.keys(e).filter((n) => n.match(/^on[A-Z]/) && typeof e[n] == "function" && !t.includes(n)).forEach((t) => {
		n[t] = e[t];
	}), n;
}
var No = w((() => {})), Po = w((() => {
	No();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/omitEventHandlers/omitEventHandlers.js
function Fo(e) {
	if (e === void 0) return {};
	let t = {};
	return Object.keys(e).filter((t) => !(t.match(/^on[A-Z]/) && typeof e[t] == "function")).forEach((n) => {
		t[n] = e[n];
	}), t;
}
var Io = w((() => {})), Lo = w((() => {
	Io();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/mergeSlotProps/mergeSlotProps.js
function Ro(e) {
	let { getSlotProps: t, additionalProps: n, externalSlotProps: r, externalForwardedProps: i, className: a } = e;
	if (!t) {
		let e = G(n == null ? void 0 : n.className, a, i == null ? void 0 : i.className, r == null ? void 0 : r.className), t = z({}, n == null ? void 0 : n.style, i == null ? void 0 : i.style, r == null ? void 0 : r.style), o = z({}, n, i, r);
		return e.length > 0 && (o.className = e), Object.keys(t).length > 0 && (o.style = t), {
			props: o,
			internalRef: void 0
		};
	}
	let o = Mo(z({}, i, r)), s = Fo(r), c = Fo(i), l = t(o), u = G(l == null ? void 0 : l.className, n == null ? void 0 : n.className, a, i == null ? void 0 : i.className, r == null ? void 0 : r.className), d = z({}, l == null ? void 0 : l.style, n == null ? void 0 : n.style, i == null ? void 0 : i.style, r == null ? void 0 : r.style), f = z({}, l, n, c, s);
	return u.length > 0 && (f.className = u), Object.keys(d).length > 0 && (f.style = d), {
		props: f,
		internalRef: l.ref
	};
}
var zo = w((() => {
	B(), jo(), Po(), Lo();
})), Bo = w((() => {
	zo();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/resolveComponentProps/resolveComponentProps.js
function Vo(e, t, n) {
	return typeof e == "function" ? e(t, n) : e;
}
var Ho = w((() => {})), Uo = w((() => {
	Ho();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/useSlotProps/useSlotProps.js
function Wo(e) {
	var t;
	let { elementType: n, externalSlotProps: r, ownerState: i, skipResolvingSlotProps: a = !1 } = e, o = U(e, Go), s = a ? {} : Vo(r, i), { props: c, internalRef: l } = Ro(z({}, o, { externalSlotProps: s })), u = Sa(l, s == null ? void 0 : s.ref, (t = e.additionalProps) == null ? void 0 : t.ref);
	return Do(n, z({}, c, { ref: u }), i);
}
var Go, Ko = w((() => {
	B(), W(), Ta(), ko(), Bo(), Uo(), Go = [
		"elementType",
		"externalSlotProps",
		"ownerState",
		"skipResolvingSlotProps"
	];
})), qo = w((() => {
	Ko();
}));
//#endregion
//#region node_modules/@mui/material/node_modules/@mui/utils/esm/getReactElementRef/getReactElementRef.js
function Jo(e) {
	return (e == null ? void 0 : e.ref) || null;
}
var Yo = w((() => {
	Br();
})), Xo = w((() => {
	Yo();
})), Zo = w((() => {})), Qo = w((() => {
	bi(), Ci(), Oi(), ji(), Pi(), Li(), Vi(), Wi(), qi(), Xi(), $i(), ra(), ua(), pa(), _a(), xa(), Ta(), ka(), La(), Na(), Za(), eo(), ro(), oo(), co(), vo(), vo(), bo(), mo(), Co(), qo(), Uo(), Po(), Xo(), Zo();
})), K, $o = w((() => {
	Oi(), K = Ei;
})), es, ts = w((() => {
	ji(), es = ki;
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/resolveProps/resolveProps.js
function ns(e, t) {
	let n = z({}, t);
	return Object.keys(e).forEach((r) => {
		if (r.toString().match(/^(components|slots)$/)) n[r] = z({}, e[r], n[r]);
		else if (r.toString().match(/^(componentsProps|slotProps)$/)) {
			let i = e[r] || {}, a = t[r];
			n[r] = {}, !a || !Object.keys(a) ? n[r] = i : !i || !Object.keys(i) ? n[r] = a : (n[r] = z({}, a), Object.keys(i).forEach((e) => {
				n[r][e] = ns(i[e], a[e]);
			}));
		} else n[r] === void 0 && (n[r] = e[r]);
	}), n;
}
var rs = w((() => {
	B();
})), is = w((() => {
	rs();
})), as = /* @__PURE__ */ T(((e) => {
	var t = Br(), n = Symbol.for("react.element"), r = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, o = {
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
})), os = /* @__PURE__ */ T(((e, t) => {
	t.exports = as();
}));
//#endregion
//#region node_modules/@mui/system/esm/DefaultPropsProvider/DefaultPropsProvider.js
function ss({ value: e, children: t }) {
	return /*#__PURE__*/ (0, ds.jsx)(fs.Provider, {
		value: e,
		children: t
	});
}
function cs(e) {
	let { theme: t, name: n, props: r } = e;
	if (!t || !t.components || !t.components[n]) return r;
	let i = t.components[n];
	return i.defaultProps ? ns(i.defaultProps, r) : !i.styleOverrides && !i.variants ? ns(i, r) : r;
}
function ls({ props: e, name: t }) {
	return cs({
		props: e,
		name: t,
		theme: { components: us.useContext(fs) }
	});
}
var us, ds, fs, ps = w((() => {
	us = /* @__PURE__ */ O(Br()), is(), ds = os(), fs = /*#__PURE__*/ us.createContext(void 0);
})), ms = w((() => {
	ps();
}));
//#endregion
//#region node_modules/@mui/material/DefaultPropsProvider/DefaultPropsProvider.js
function hs(e) {
	return ls(e);
}
var gs = w((() => {
	Br(), ms(), os();
})), _s = w((() => {
	gs();
})), vs = /* @__PURE__ */ T(((e, t) => {
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
})), ys = /* @__PURE__ */ T(((e, t) => {
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
function bs(e) {
	if (e.sheet) return e.sheet;
	/* istanbul ignore next */
	for (var t = 0; t < document.styleSheets.length; t++) if (document.styleSheets[t].ownerNode === e) return document.styleSheets[t];
}
function xs(e) {
	var t = document.createElement("style");
	return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var Ss, Cs = w((() => {
	Ss = /*#__PURE__*/ function() {
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
			this.ctr % (this.isSpeedy ? 65e3 : 1) == 0 && this._insertTag(xs(this));
			var t = this.tags[this.tags.length - 1];
			if (this.isSpeedy) {
				var n = bs(t);
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
})), ws, Ts, Es, Ds, Os, ks, As, js, Ms, Ns = w((() => {
	ws = "-ms-", Ts = "-moz-", Es = "-webkit-", Ds = "comm", Os = "rule", ks = "decl", As = "@import", js = "@keyframes", Ms = "@layer";
}));
//#endregion
//#region node_modules/stylis/src/Utility.js
function Ps(e, t) {
	return Rs(e, 0) ^ 45 ? (((t << 2 ^ Rs(e, 0)) << 2 ^ Rs(e, 1)) << 2 ^ Rs(e, 2)) << 2 ^ Rs(e, 3) : 0;
}
function Fs(e) {
	return e.trim();
}
function Is(e, t) {
	return (e = t.exec(e)) ? e[0] : e;
}
function q(e, t, n) {
	return e.replace(t, n);
}
function Ls(e, t) {
	return e.indexOf(t);
}
function Rs(e, t) {
	return e.charCodeAt(t) | 0;
}
function zs(e, t, n) {
	return e.slice(t, n);
}
function Bs(e) {
	return e.length;
}
function Vs(e) {
	return e.length;
}
function Hs(e, t) {
	return t.push(e), e;
}
function Us(e, t) {
	return e.map(t).join("");
}
var Ws, Gs, Ks, qs = w((() => {
	Ws = Math.abs, Gs = String.fromCharCode, Ks = Object.assign;
}));
//#endregion
//#region node_modules/stylis/src/Tokenizer.js
function Js(e, t, n, r, i, a, o) {
	return {
		value: e,
		root: t,
		parent: n,
		type: r,
		props: i,
		children: a,
		line: dc,
		column: fc,
		length: o,
		return: ""
	};
}
function Ys(e, t) {
	return Ks(Js("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function Xs() {
	return J;
}
function Zs() {
	return J = mc > 0 ? Rs(hc, --mc) : 0, fc--, J === 10 && (fc = 1, dc--), J;
}
function Qs() {
	return J = mc < pc ? Rs(hc, mc++) : 0, fc++, J === 10 && (fc = 1, dc++), J;
}
function $s() {
	return Rs(hc, mc);
}
function ec() {
	return mc;
}
function tc(e, t) {
	return zs(hc, e, t);
}
function nc(e) {
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
function rc(e) {
	return dc = fc = 1, pc = Bs(hc = e), mc = 0, [];
}
function ic(e) {
	return hc = "", e;
}
function ac(e) {
	return Fs(tc(mc - 1, cc(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function oc(e) {
	for (; (J = $s()) && J < 33;) Qs();
	return nc(e) > 2 || nc(J) > 3 ? "" : " ";
}
function sc(e, t) {
	for (; --t && Qs() && !(J < 48 || J > 102 || J > 57 && J < 65 || J > 70 && J < 97););
	return tc(e, ec() + (t < 6 && $s() == 32 && Qs() == 32));
}
function cc(e) {
	for (; Qs();) switch (J) {
		case e: return mc;
		case 34:
		case 39:
			e !== 34 && e !== 39 && cc(J);
			break;
		case 40:
			e === 41 && cc(e);
			break;
		case 92: Qs();
	}
	return mc;
}
function lc(e, t) {
	for (; Qs() && e + J !== 57 && (e + J !== 84 || $s() !== 47););
	return "/*" + tc(t, mc - 1) + "*" + Gs(e === 47 ? e : Qs());
}
function uc(e) {
	for (; !nc($s());) Qs();
	return tc(e, mc);
}
var dc, fc, pc, mc, J, hc, gc = w((() => {
	qs(), dc = 1, fc = 1, pc = 0, mc = 0, J = 0, hc = "";
}));
//#endregion
//#region node_modules/stylis/src/Parser.js
function _c(e) {
	return ic(vc("", null, null, null, [""], e = rc(e), 0, [0], e));
}
function vc(e, t, n, r, i, a, o, s, c) {
	for (var l = 0, u = 0, d = o, f = 0, p = 0, m = 0, h = 1, g = 1, _ = 1, v = 0, y = "", b = i, x = a, S = r, C = y; g;) switch (m = v, v = Qs()) {
		case 40: if (m != 108 && Rs(C, d - 1) == 58) {
			Ls(C += q(ac(v), "&", "&\f"), "&\f") != -1 && (_ = -1);
			break;
		}
		case 34:
		case 39:
		case 91:
			C += ac(v);
			break;
		case 9:
		case 10:
		case 13:
		case 32:
			C += oc(m);
			break;
		case 92:
			C += sc(ec() - 1, 7);
			continue;
		case 47:
			switch ($s()) {
				case 42:
				case 47:
					Hs(bc(lc(Qs(), ec()), t, n), c);
					break;
				default: C += "/";
			}
			break;
		case 123 * h: s[l++] = Bs(C) * _;
		case 125 * h:
		case 59:
		case 0:
			switch (v) {
				case 0:
				case 125: g = 0;
				case 59 + u:
					_ == -1 && (C = q(C, /\f/g, "")), p > 0 && Bs(C) - d && Hs(p > 32 ? xc(C + ";", r, n, d - 1) : xc(q(C, " ", "") + ";", r, n, d - 2), c);
					break;
				case 59: C += ";";
				default: if (Hs(S = yc(C, t, n, l, u, i, s, y, b = [], x = [], d), a), v === 123) {
					if (u === 0) vc(C, t, S, S, b, a, d, s, x);
					else switch (f === 99 && Rs(C, 3) === 110 ? 100 : f) {
						case 100:
						case 108:
						case 109:
						case 115:
							vc(e, S, S, r && Hs(yc(e, S, S, 0, 0, i, s, y, i, b = [], d), x), i, x, d, s, r ? b : x);
							break;
						default: vc(C, S, S, S, [""], x, 0, s, x);
					}
				}
			}
			l = u = p = 0, h = _ = 1, y = C = "", d = o;
			break;
		case 58: d = 1 + Bs(C), p = m;
		default:
			if (h < 1) {
				if (v == 123) --h;
				else if (v == 125 && h++ == 0 && Zs() == 125) continue;
			}
			switch (C += Gs(v), v * h) {
				case 38:
					_ = u > 0 ? 1 : (C += "\f", -1);
					break;
				case 44:
					s[l++] = (Bs(C) - 1) * _, _ = 1;
					break;
				case 64:
					$s() === 45 && (C += ac(Qs())), f = $s(), u = d = Bs(y = C += uc(ec())), v++;
					break;
				case 45: m === 45 && Bs(C) == 2 && (h = 0);
			}
	}
	return a;
}
function yc(e, t, n, r, i, a, o, s, c, l, u) {
	for (var d = i - 1, f = i === 0 ? a : [""], p = Vs(f), m = 0, h = 0, g = 0; m < r; ++m) for (var _ = 0, v = zs(e, d + 1, d = Ws(h = o[m])), y = e; _ < p; ++_) (y = Fs(h > 0 ? f[_] + " " + v : q(v, /&\f/g, f[_]))) && (c[g++] = y);
	return Js(e, t, n, i === 0 ? Os : s, c, l, u);
}
function bc(e, t, n) {
	return Js(e, t, n, Ds, Gs(Xs()), zs(e, 2, -2), 0);
}
function xc(e, t, n, r) {
	return Js(e, t, n, ks, zs(e, 0, r), zs(e, r + 1, -1), r);
}
var Sc = w((() => {
	Ns(), qs(), gc();
})), Cc = w((() => {}));
//#endregion
//#region node_modules/stylis/src/Serializer.js
function wc(e, t) {
	for (var n = "", r = Vs(e), i = 0; i < r; i++) n += t(e[i], i, e, t) || "";
	return n;
}
function Tc(e, t, n, r) {
	switch (e.type) {
		case Ms: if (e.children.length) break;
		case As:
		case ks: return e.return = e.return || e.value;
		case Ds: return "";
		case js: return e.return = e.value + "{" + wc(e.children, r) + "}";
		case Os: e.value = e.props.join(",");
	}
	return Bs(n = wc(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
var Ec = w((() => {
	Ns(), qs();
}));
//#endregion
//#region node_modules/stylis/src/Middleware.js
function Dc(e) {
	var t = Vs(e);
	return function(n, r, i, a) {
		for (var o = "", s = 0; s < t; s++) o += e[s](n, r, i, a) || "";
		return o;
	};
}
function Oc(e) {
	return function(t) {
		t.root || (t = t.return) && e(t);
	};
}
var kc = w((() => {
	qs();
})), Ac = w((() => {
	Ns(), qs(), Sc(), Cc(), gc(), Ec(), kc();
}));
//#endregion
//#region node_modules/@emotion/memoize/dist/emotion-memoize.esm.js
function jc(e) {
	var t = Object.create(null);
	return function(n) {
		return t[n] === void 0 && (t[n] = e(n)), t[n];
	};
}
var Mc = w((() => {}));
//#endregion
//#region node_modules/@emotion/cache/dist/emotion-cache.browser.esm.js
function Nc(e, t) {
	switch (Ps(e, t)) {
		case 5103: return Es + "print-" + e + e;
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
		case 3829: return Es + e + e;
		case 5349:
		case 4246:
		case 4810:
		case 6968:
		case 2756: return Es + e + Ts + e + ws + e + e;
		case 6828:
		case 4268: return Es + e + ws + e + e;
		case 6165: return Es + e + ws + "flex-" + e + e;
		case 5187: return Es + e + q(e, /(\w+).+(:[^]+)/, Es + "box-$1$2" + ws + "flex-$1$2") + e;
		case 5443: return Es + e + ws + "flex-item-" + q(e, /flex-|-self/, "") + e;
		case 4675: return Es + e + ws + "flex-line-pack" + q(e, /align-content|flex-|-self/, "") + e;
		case 5548: return Es + e + ws + q(e, "shrink", "negative") + e;
		case 5292: return Es + e + ws + q(e, "basis", "preferred-size") + e;
		case 6060: return Es + "box-" + q(e, "-grow", "") + Es + e + ws + q(e, "grow", "positive") + e;
		case 4554: return Es + q(e, /([^-])(transform)/g, "$1" + Es + "$2") + e;
		case 6187: return q(q(q(e, /(zoom-|grab)/, Es + "$1"), /(image-set)/, Es + "$1"), e, "") + e;
		case 5495:
		case 3959: return q(e, /(image-set\([^]*)/, Es + "$1$`$1");
		case 4968: return q(q(e, /(.+:)(flex-)?(.*)/, Es + "box-pack:$3" + ws + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + Es + e + e;
		case 4095:
		case 3583:
		case 4068:
		case 2532: return q(e, /(.+)-inline(.+)/, Es + "$1$2") + e;
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
			if (Bs(e) - 1 - t > 6) switch (Rs(e, t + 1)) {
				case 109: if (Rs(e, t + 4) !== 45) break;
				case 102: return q(e, /(.+:)(.+)-([^]+)/, "$1" + Es + "$2-$3$1" + Ts + (Rs(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
				case 115: return ~Ls(e, "stretch") ? Nc(q(e, "stretch", "fill-available"), t) + e : e;
			}
			break;
		case 4949: if (Rs(e, t + 1) !== 115) break;
		case 6444:
			switch (Rs(e, Bs(e) - 3 - (~Ls(e, "!important") && 10))) {
				case 107: return q(e, ":", ":" + Es) + e;
				case 101: return q(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + Es + (Rs(e, 14) === 45 ? "inline-" : "") + "box$3$1" + Es + "$2$3$1" + ws + "$2box$3") + e;
			}
			break;
		case 5936:
			switch (Rs(e, t + 11)) {
				case 114: return Es + e + ws + q(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
				case 108: return Es + e + ws + q(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
				case 45: return Es + e + ws + q(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
			}
			return Es + e + ws + e + e;
	}
	return e;
}
var Pc, Fc, Ic, Lc, Rc, zc, Bc, Vc, Hc = w((() => {
	Cs(), Ac(), Pc = function(e, t, n) {
		for (var r = 0, i = 0; r = i, i = $s(), r === 38 && i === 12 && (t[n] = 1), !nc(i);) Qs();
		return tc(e, mc);
	}, Fc = function(e, t) {
		var n = -1, r = 44;
		do
			switch (nc(r)) {
				case 0:
					r === 38 && $s() === 12 && (t[n] = 1), e[n] += Pc(mc - 1, t, n);
					break;
				case 2:
					e[n] += ac(r);
					break;
				case 4: if (r === 44) {
					e[++n] = $s() === 58 ? "&\f" : "", t[n] = e[n].length;
					break;
				}
				default: e[n] += Gs(r);
			}
		while (r = Qs());
		return e;
	}, Ic = function(e, t) {
		return ic(Fc(rc(e), t));
	}, Lc = /* #__PURE__ */ new WeakMap(), Rc = function(e) {
		if (!(e.type !== "rule" || !e.parent || e.length < 1)) {
			for (var t = e.value, n = e.parent, r = e.column === n.column && e.line === n.line; n.type !== "rule";) if (n = n.parent, !n) return;
			if ((e.props.length !== 1 || t.charCodeAt(0) === 58 || Lc.get(n)) && !r) {
				Lc.set(e, !0);
				for (var i = [], a = Ic(t, i), o = n.props, s = 0, c = 0; s < a.length; s++) for (var l = 0; l < o.length; l++, c++) e.props[c] = i[s] ? a[s].replace(/&\f/g, o[l]) : o[l] + " " + a[s];
			}
		}
	}, zc = function(e) {
		if (e.type === "decl") {
			var t = e.value;
			t.charCodeAt(0) === 108 && t.charCodeAt(2) === 98 && (e.return = "", e.value = "");
		}
	}, Bc = [function(e, t, n, r) {
		if (e.length > -1 && !e.return) switch (e.type) {
			case ks:
				e.return = Nc(e.value, e.length);
				break;
			case js: return wc([Ys(e, { value: q(e.value, "@", "@" + Es) })], r);
			case Os: if (e.length) return Us(e.props, function(t) {
				switch (Is(t, /(::plac\w+|:read-\w+)/)) {
					case ":read-only":
					case ":read-write": return wc([Ys(e, { props: [q(t, /:(read-\w+)/, ":" + Ts + "$1")] })], r);
					case "::placeholder": return wc([
						Ys(e, { props: [q(t, /:(plac\w+)/, ":" + Es + "input-$1")] }),
						Ys(e, { props: [q(t, /:(plac\w+)/, ":" + Ts + "$1")] }),
						Ys(e, { props: [q(t, /:(plac\w+)/, ws + "input-$1")] })
					], r);
				}
				return "";
			});
		}
	}], Vc = function(e) {
		var t = e.key;
		if (t === "css") {
			var n = document.querySelectorAll("style[data-emotion]:not([data-s])");
			Array.prototype.forEach.call(n, function(e) {
				e.getAttribute("data-emotion").indexOf(" ") !== -1 && (document.head.appendChild(e), e.setAttribute("data-s", ""));
			});
		}
		var r = e.stylisPlugins || Bc, i = {}, a, o = [];
		a = e.container || document.head, Array.prototype.forEach.call(document.querySelectorAll("style[data-emotion^=\"" + t + " \"]"), function(e) {
			for (var t = e.getAttribute("data-emotion").split(" "), n = 1; n < t.length; n++) i[t[n]] = !0;
			o.push(e);
		});
		var s, c = [Rc, zc], l, u = [Tc, Oc(function(e) {
			l.insert(e);
		})], d = Dc(c.concat(r, u)), f = function(e) {
			return wc(_c(e), d);
		};
		s = function(e, t, n, r) {
			l = n, f(e ? e + "{" + t.styles + "}" : t.styles), r && (p.inserted[t.name] = !0);
		};
		var p = {
			key: t,
			sheet: new Ss({
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
})), Uc = /* @__PURE__ */ T(((e) => {
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
})), Wc = /* @__PURE__ */ T(((e, t) => {
	t.exports = Uc();
})), Gc = /* @__PURE__ */ T(((e, t) => {
	var n = Wc(), r = {
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
function Kc(e, t, n) {
	var r = "";
	return n.split(" ").forEach(function(n) {
		e[n] === void 0 ? n && (r += n + " ") : t.push(e[n] + ";");
	}), r;
}
var qc, Jc, Yc = w((() => {
	qc = function(e, t, n) {
		var r = e.key + "-" + t.name;
		n === !1 && e.registered[r] === void 0 && (e.registered[r] = t.styles);
	}, Jc = function(e, t, n) {
		qc(e, t, n);
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
function Xc(e) {
	for (var t = 0, n, r = 0, i = e.length; i >= 4; ++r, i -= 4) n = e.charCodeAt(r) & 255 | (e.charCodeAt(++r) & 255) << 8 | (e.charCodeAt(++r) & 255) << 16 | (e.charCodeAt(++r) & 255) << 24, n = (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16), n ^= n >>> 24, t = (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16) ^ (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
	switch (i) {
		case 3: t ^= (e.charCodeAt(r + 2) & 255) << 16;
		case 2: t ^= (e.charCodeAt(r + 1) & 255) << 8;
		case 1: t ^= e.charCodeAt(r) & 255, t = (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
	}
	return t ^= t >>> 13, t = (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16), ((t ^ t >>> 15) >>> 0).toString(36);
}
var Zc = w((() => {})), Qc, $c = w((() => {
	Qc = {
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
function el(e, t, n) {
	if (n == null) return "";
	var r = n;
	if (r.__emotion_styles !== void 0) return r;
	switch (typeof n) {
		case "boolean": return "";
		case "object":
			var i = n;
			if (i.anim === 1) return fl = {
				name: i.name,
				styles: i.styles,
				next: fl
			}, i.name;
			var a = n;
			if (a.styles !== void 0) {
				var o = a.next;
				if (o !== void 0) for (; o !== void 0;) fl = {
					name: o.name,
					styles: o.styles,
					next: fl
				}, o = o.next;
				return a.styles + ";";
			}
			return tl(e, t, n);
		case "function": if (e !== void 0) {
			var s = fl, c = n(e);
			return fl = s, el(e, t, c);
		}
	}
	var l = n;
	if (t == null) return l;
	var u = t[l];
	return u === void 0 ? l : u;
}
function tl(e, t, n) {
	var r = "";
	if (Array.isArray(n)) for (var i = 0; i < n.length; i++) r += el(e, t, n[i]) + ";";
	else for (var a in n) {
		var o = n[a];
		if (typeof o != "object") {
			var s = o;
			t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : sl(s) && (r += cl(a) + ":" + ll(a, s) + ";");
		} else {
			if (a === "NO_COMPONENT_SELECTOR" && rl) throw Error(ul);
			if (Array.isArray(o) && typeof o[0] == "string" && (t == null || t[o[0]] === void 0)) for (var c = 0; c < o.length; c++) sl(o[c]) && (r += cl(a) + ":" + ll(a, o[c]) + ";");
			else {
				var l = el(e, t, o);
				switch (a) {
					case "animation":
					case "animationName":
						r += cl(a) + ":" + l + ";";
						break;
					default: r += a + "{" + l + "}";
				}
			}
		}
	}
	return r;
}
function nl(e, t, n) {
	if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0) return e[0];
	var r = !0, i = "";
	fl = void 0;
	var a = e[0];
	a == null || a.raw === void 0 ? (r = !1, i += el(n, t, a)) : i += a[0];
	for (var o = 1; o < e.length; o++) i += el(n, t, e[o]), r && (i += a[o]);
	dl.lastIndex = 0;
	for (var s = "", c; (c = dl.exec(i)) !== null;) s += "-" + c[1];
	return {
		name: Xc(i) + s,
		styles: i,
		next: fl
	};
}
var rl, il, al, ol, sl, cl, ll, ul, dl, fl, pl = w((() => {
	Zc(), $c(), Mc(), rl = !1, il = /[A-Z]|^ms/g, al = /_EMO_([^_]+?)_([^]*?)_EMO_/g, ol = function(e) {
		return e.charCodeAt(1) === 45;
	}, sl = function(e) {
		return e != null && typeof e != "boolean";
	}, cl = /* #__PURE__ */ jc(function(e) {
		return ol(e) ? e : e.replace(il, "-$&").toLowerCase();
	}), ll = function(e, t) {
		switch (e) {
			case "animation":
			case "animationName": if (typeof t == "string") return t.replace(al, function(e, t, n) {
				return fl = {
					name: t,
					styles: n,
					next: fl
				}, t;
			});
		}
		return Qc[e] !== 1 && !ol(e) && typeof t == "number" && t !== 0 ? t + "px" : t;
	}, ul = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.", dl = /label:\s*([^\s;{]+)\s*(;|$)/g;
})), ml, hl, gl, _l, vl, yl = w((() => {
	ml = /* @__PURE__ */ O(Br()), hl = function(e) {
		return e();
	}, gl = ml.useInsertionEffect ? ml.useInsertionEffect : !1, _l = gl || hl, vl = gl || ml.useLayoutEffect;
})), bl, xl, Sl, Cl, wl, Tl, El, Dl, Ol, kl, Al, jl = w((() => {
	bl = /* @__PURE__ */ O(Br()), xl = /* @__PURE__ */ O(Br()), Hc(), Yc(), pl(), yl(), Sl = /* #__PURE__ */ bl.createContext(typeof HTMLElement < "u" ? /* #__PURE__ */ Vc({ key: "css" }) : null), Cl = Sl.Provider, wl = function(e) {
		return /*#__PURE__*/ (0, xl.forwardRef)(function(t, n) {
			return e(t, (0, xl.useContext)(Sl), n);
		});
	}, Tl = /* #__PURE__ */ bl.createContext({}), El = {}.hasOwnProperty, Dl = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", Ol = function(e, t) {
		var n = {};
		for (var r in t) El.call(t, r) && (n[r] = t[r]);
		return n[Dl] = e, n;
	}, kl = function(e) {
		var t = e.cache, n = e.serialized, r = e.isStringTag;
		return qc(t, n, r), _l(function() {
			return Jc(t, n, r);
		}), null;
	}, Al = /* @__PURE__ */ wl(function(e, t, n) {
		var r = e.css;
		typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
		var i = e[Dl], a = [r], o = "";
		typeof e.className == "string" ? o = Kc(t.registered, a, e.className) : e.className != null && (o = e.className + " ");
		var s = nl(a, void 0, bl.useContext(Tl));
		o += t.key + "-" + s.name;
		var c = {};
		for (var l in e) El.call(e, l) && l !== "css" && l !== Dl && (c[l] = e[l]);
		return c.className = o, n && (c.ref = n), /*#__PURE__*/ bl.createElement(bl.Fragment, null, /*#__PURE__*/ bl.createElement(kl, {
			cache: t,
			serialized: s,
			isStringTag: typeof i == "string"
		}), /*#__PURE__*/ bl.createElement(i, c));
	});
}));
//#endregion
//#region node_modules/@emotion/react/dist/emotion-react.browser.esm.js
function Ml() {
	return nl([...arguments]);
}
function Nl() {
	var e = Ml.apply(void 0, arguments), t = "animation-" + e.name;
	return {
		name: t,
		styles: "@keyframes " + t + "{" + e.styles + "}",
		anim: 1,
		toString: function() {
			return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
		}
	};
}
var Pl, Fl, Il, Ll = w((() => {
	jl(), Pl = /* @__PURE__ */ O(Br()), Yc(), yl(), pl(), Gc(), Fl = function(e, t) {
		var n = arguments;
		if (t == null || !El.call(t, "css")) return Pl.createElement.apply(void 0, n);
		var r = n.length, i = Array(r);
		i[0] = Al, i[1] = Ol(e, t);
		for (var a = 2; a < r; a++) i[a] = n[a];
		return Pl.createElement.apply(null, i);
	}, (function(e) {
		var t;
		t || (t = e.JSX || (e.JSX = {}));
	})(Fl || (Fl = {})), Il = /* #__PURE__ */ wl(function(e, t) {
		var n = e.styles, r = nl([n], void 0, Pl.useContext(Tl)), i = Pl.useRef();
		return vl(function() {
			var e = t.key + "-global", n = new t.sheet.constructor({
				key: e,
				nonce: t.sheet.nonce,
				container: t.sheet.container,
				speedy: t.sheet.isSpeedy
			}), a = !1, o = document.querySelector("style[data-emotion=\"" + e + " " + r.name + "\"]");
			return t.sheet.tags.length && (n.before = t.sheet.tags[0]), o !== null && (a = !0, o.setAttribute("data-emotion", e), n.hydrate([o])), i.current = [n, a], function() {
				n.flush();
			};
		}, [t]), vl(function() {
			var e = i.current, n = e[0];
			if (e[1]) {
				e[1] = !1;
				return;
			}
			r.next !== void 0 && Jc(t, r.next, !0), n.tags.length && (n.before = n.tags[n.tags.length - 1].nextElementSibling, n.flush()), t.insert("", r, n, !1);
		}, [t, r.name]), null;
	});
})), Rl, zl, Bl = w((() => {
	Mc(), Rl = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|popover|popoverTarget|popoverTargetAction|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, zl = /* #__PURE__ */ jc(function(e) {
		return Rl.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
	});
})), Vl, Hl, Ul, Wl, Gl, Kl, ql, Jl, Yl = w((() => {
	B(), Ll(), pl(), yl(), Yc(), Vl = /* @__PURE__ */ O(Br()), Bl(), Hl = !1, Ul = zl, Wl = function(e) {
		return e !== "theme";
	}, Gl = function(e) {
		return typeof e == "string" && e.charCodeAt(0) > 96 ? Ul : Wl;
	}, Kl = function(e, t, n) {
		var r;
		if (t) {
			var i = t.shouldForwardProp;
			r = e.__emotion_forwardProp && i ? function(t) {
				return e.__emotion_forwardProp(t) && i(t);
			} : i;
		}
		return typeof r != "function" && n && (r = e.__emotion_forwardProp), r;
	}, ql = function(e) {
		var t = e.cache, n = e.serialized, r = e.isStringTag;
		return qc(t, n, r), _l(function() {
			return Jc(t, n, r);
		}), null;
	}, Jl = function e(t, n) {
		var r = t.__emotion_real === t, i = r && t.__emotion_base || t, a, o;
		n !== void 0 && (a = n.label, o = n.target);
		var s = Kl(t, n, r), c = s || Gl(i), l = !c("as");
		return function() {
			var u = arguments, d = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
			if (a !== void 0 && d.push("label:" + a + ";"), u[0] == null || u[0].raw === void 0) d.push.apply(d, u);
			else {
				var f = u[0];
				d.push(f[0]);
				for (var p = u.length, m = 1; m < p; m++) d.push(u[m], f[m]);
			}
			var h = wl(function(e, t, n) {
				var r = l && e.as || i, a = "", u = [], f = e;
				if (e.theme == null) {
					for (var p in f = {}, e) f[p] = e[p];
					f.theme = Vl.useContext(Tl);
				}
				typeof e.className == "string" ? a = Kc(t.registered, u, e.className) : e.className != null && (a = e.className + " ");
				var m = nl(d.concat(u), t.registered, f);
				a += t.key + "-" + m.name, o !== void 0 && (a += " " + o);
				var h = l && s === void 0 ? Gl(r) : c, g = {};
				for (var _ in e) l && _ === "as" || h(_) && (g[_] = e[_]);
				return g.className = a, n && (g.ref = n), /*#__PURE__*/ Vl.createElement(Vl.Fragment, null, /*#__PURE__*/ Vl.createElement(ql, {
					cache: t,
					serialized: m,
					isStringTag: typeof r == "string"
				}), /*#__PURE__*/ Vl.createElement(r, g));
			});
			return h.displayName = a === void 0 ? "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")" : a, h.defaultProps = t.defaultProps, h.__emotion_real = h, h.__emotion_base = i, h.__emotion_styles = d, h.__emotion_forwardProp = s, Object.defineProperty(h, "toString", { value: function() {
				return o === void 0 && Hl ? "NO_COMPONENT_SELECTOR" : "." + o;
			} }), h.withComponent = function(t, r) {
				return e(t, z({}, n, r, { shouldForwardProp: Kl(h, r, !0) })).apply(void 0, d);
			}, h;
		};
	};
})), Xl, Zl, Ql = w((() => {
	Yl(), yl(), Br(), Xl = /* @__PURE__ */ "a.abbr.address.area.article.aside.audio.b.base.bdi.bdo.big.blockquote.body.br.button.canvas.caption.cite.code.col.colgroup.data.datalist.dd.del.details.dfn.dialog.div.dl.dt.em.embed.fieldset.figcaption.figure.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.iframe.img.input.ins.kbd.keygen.label.legend.li.link.main.map.mark.marquee.menu.menuitem.meta.meter.nav.noscript.object.ol.optgroup.option.output.p.param.picture.pre.progress.q.rp.rt.ruby.s.samp.script.section.select.small.source.span.strong.style.sub.summary.sup.table.tbody.td.textarea.tfoot.th.thead.time.title.tr.track.u.ul.var.video.wbr.circle.clipPath.defs.ellipse.foreignObject.g.image.line.linearGradient.mask.path.pattern.polygon.polyline.radialGradient.rect.stop.svg.text.tspan".split("."), Zl = Jl.bind(null), Xl.forEach(function(e) {
		Zl[e] = Zl(e);
	});
}));
//#endregion
//#region node_modules/@mui/styled-engine/StyledEngineProvider/StyledEngineProvider.js
function $l(e, t) {
	let n = Vc({
		key: "css",
		prepend: e
	});
	if (t) {
		let e = n.insert;
		n.insert = (...t) => (t[1].styles.match(/^@layer\s+[^{]*$/) || (t[1].styles = `@layer mui {${t[1].styles}}`), e(...t));
	}
	return n;
}
function eu(e) {
	let { injectFirst: t, enableCssLayer: n, children: r } = e, i = tu.useMemo(() => {
		let e = `${t}-${n}`;
		if (typeof document == "object" && ru.has(e)) return ru.get(e);
		let r = $l(t, n);
		return ru.set(e, r), r;
	}, [t, n]);
	return t || n ? /*#__PURE__*/ (0, nu.jsx)(Cl, {
		value: i,
		children: r
	}) : r;
}
var tu, nu, ru, iu = w((() => {
	tu = /* @__PURE__ */ O(Br()), Ll(), Hc(), nu = os(), ru = /* @__PURE__ */ new Map();
})), au = w((() => {
	iu();
}));
//#endregion
//#region node_modules/@mui/styled-engine/GlobalStyles/GlobalStyles.js
function ou(e) {
	return e == null || Object.keys(e).length === 0;
}
function su(e) {
	let { styles: t, defaultTheme: n = {} } = e;
	return /*#__PURE__*/ (0, cu.jsx)(Il, { styles: typeof t == "function" ? (e) => t(ou(e) ? n : e) : t });
}
var cu, lu = w((() => {
	Br(), Ll(), cu = os();
})), uu = w((() => {
	lu();
})), du = /* @__PURE__ */ E({
	GlobalStyles: () => su,
	StyledEngineProvider: () => eu,
	ThemeContext: () => Tl,
	css: () => Ml,
	default: () => fu,
	internal_processStyles: () => mu,
	internal_serializeStyles: () => pu,
	keyframes: () => Nl
});
function fu(e, t) {
	return Zl(e, t);
}
function pu(e) {
	return hu[0] = e, nl(hu);
}
var mu, hu, gu = w((() => {
	Ql(), pl(), Ll(), au(), uu(), mu = (e, t) => {
		Array.isArray(e.__emotion_styles) && (e.__emotion_styles = t(e.__emotion_styles));
	}, hu = [];
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/deepmerge/deepmerge.js
function _u(e) {
	if (typeof e != "object" || !e) return !1;
	let t = Object.getPrototypeOf(e);
	return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Symbol.toStringTag in e) && !(Symbol.iterator in e);
}
function vu(e) {
	if (/*#__PURE__*/ bu.isValidElement(e) || !_u(e)) return e;
	let t = {};
	return Object.keys(e).forEach((n) => {
		t[n] = vu(e[n]);
	}), t;
}
function yu(e, t, n = { clone: !0 }) {
	let r = n.clone ? z({}, e) : e;
	return _u(e) && _u(t) && Object.keys(t).forEach((i) => {
		/*#__PURE__*/ bu.isValidElement(t[i]) ? r[i] = t[i] : _u(t[i]) && Object.prototype.hasOwnProperty.call(e, i) && _u(e[i]) ? r[i] = yu(e[i], t[i], n) : n.clone ? r[i] = _u(t[i]) ? vu(t[i]) : t[i] : r[i] = t[i];
	}), r;
}
var bu, xu = w((() => {
	B(), bu = /* @__PURE__ */ O(Br());
})), Su = /* @__PURE__ */ E({
	default: () => yu,
	isPlainObject: () => _u
}), Cu = w((() => {
	xu(), xu();
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/formatMuiErrorMessage/formatMuiErrorMessage.js
function wu(e) {
	let t = "https://mui.com/production-error/?code=" + e;
	for (let e = 1; e < arguments.length; e += 1) t += "&args[]=" + encodeURIComponent(arguments[e]);
	return "Minified MUI error #" + e + "; visit " + t + " for the full message.";
}
var Tu = w((() => {})), Eu = /* @__PURE__ */ E({ default: () => wu }), Du = w((() => {
	Tu();
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/capitalize/capitalize.js
function Ou(e) {
	if (typeof e != "string") throw Error(wu(7));
	return e.charAt(0).toUpperCase() + e.slice(1);
}
var ku = w((() => {
	Du();
})), Au = /* @__PURE__ */ E({ default: () => Ou }), ju = w((() => {
	ku();
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/getDisplayName/getDisplayName.js
function Mu(e) {
	let t = `${e}`.match(Lu);
	return t && t[1] || "";
}
function Nu(e, t = "") {
	return e.displayName || e.name || Mu(e) || t;
}
function Pu(e, t, n) {
	let r = Nu(t);
	return e.displayName || (r === "" ? n : `${n}(${r})`);
}
function Fu(e) {
	if (e != null) {
		if (typeof e == "string") return e;
		if (typeof e == "function") return Nu(e, "Component");
		if (typeof e == "object") switch (e.$$typeof) {
			case Iu.ForwardRef: return Pu(e, e.render, "ForwardRef");
			case Iu.Memo: return Pu(e, e.type, "memo");
			default: return;
		}
	}
}
var Iu, Lu, Ru = w((() => {
	Iu = Ti(), Lu = /^\s*function(?:\s|\s*\/\*.*\*\/\s*)+([^(\s/]*)\s*/;
})), zu = /* @__PURE__ */ E({
	default: () => Fu,
	getFunctionName: () => Mu
}), Bu = w((() => {
	Ru(), Ru();
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createBreakpoints.js
function Vu(e) {
	let { values: t = {
		xs: 0,
		sm: 600,
		md: 900,
		lg: 1200,
		xl: 1536
	}, unit: n = "px", step: r = 5 } = e, i = U(e, Hu), a = Uu(t), o = Object.keys(a);
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
	return z({
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
var Hu, Uu, Wu = w((() => {
	W(), B(), Hu = [
		"values",
		"unit",
		"step"
	], Uu = (e) => {
		let t = Object.keys(e).map((t) => ({
			key: t,
			val: e[t]
		})) || [];
		return t.sort((e, t) => e.val - t.val), t.reduce((e, t) => z({}, e, { [t.key]: t.val }), {});
	};
})), Gu, Ku = w((() => {
	Gu = { borderRadius: 4 };
}));
//#endregion
//#region node_modules/@mui/system/esm/merge.js
function qu(e, t) {
	return t ? yu(e, t, { clone: !1 }) : e;
}
var Ju = w((() => {
	Cu();
}));
//#endregion
//#region node_modules/@mui/system/esm/breakpoints.js
function Yu(e, t, n) {
	let r = e.theme || {};
	if (Array.isArray(t)) {
		let e = r.breakpoints || $u;
		return t.reduce((r, i, a) => (r[e.up(e.keys[a])] = n(t[a]), r), {});
	}
	if (typeof t == "object") {
		let e = r.breakpoints || $u;
		return Object.keys(t).reduce((r, i) => {
			if (Object.keys(e.values || Qu).indexOf(i) !== -1) {
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
function Xu(e = {}) {
	var t;
	return ((t = e.keys) == null ? void 0 : t.reduce((t, n) => {
		let r = e.up(n);
		return t[r] = {}, t;
	}, {})) || {};
}
function Zu(e, t) {
	return e.reduce((e, t) => {
		let n = e[t];
		return (!n || Object.keys(n).length === 0) && delete e[t], e;
	}, t);
}
var Qu, $u, ed = w((() => {
	Qu = {
		xs: 0,
		sm: 600,
		md: 900,
		lg: 1200,
		xl: 1536
	}, $u = {
		keys: [
			"xs",
			"sm",
			"md",
			"lg",
			"xl"
		],
		up: (e) => `@media (min-width:${Qu[e]}px)`
	};
}));
//#endregion
//#region node_modules/@mui/system/esm/style.js
function td(e, t, n = !0) {
	if (!t || typeof t != "string") return null;
	if (e && e.vars && n) {
		let n = `vars.${t}`.split(".").reduce((e, t) => e && e[t] ? e[t] : null, e);
		if (n != null) return n;
	}
	return t.split(".").reduce((e, t) => e && e[t] != null ? e[t] : null, e);
}
function nd(e, t, n, r = n) {
	let i;
	return i = typeof e == "function" ? e(n) : Array.isArray(e) ? e[n] || r : td(e, n) || r, t && (i = t(i, r, e)), i;
}
function rd(e) {
	let { prop: t, cssProperty: n = e.prop, themeKey: r, transform: i } = e, a = (e) => {
		if (e[t] == null) return null;
		let a = e[t], o = e.theme, s = td(o, r) || {};
		return Yu(e, a, (e) => {
			let r = nd(s, i, e);
			return e === r && typeof e == "string" && (r = nd(s, i, `${t}${e === "default" ? "" : Ou(e)}`, e)), n === !1 ? r : { [n]: r };
		});
	};
	return a.propTypes = {}, a.filterProps = [t], a;
}
var id = w((() => {
	ju(), ed();
}));
//#endregion
//#region node_modules/@mui/system/esm/memoize.js
function ad(e) {
	let t = {};
	return (n) => (t[n] === void 0 && (t[n] = e(n)), t[n]);
}
var od = w((() => {}));
//#endregion
//#region node_modules/@mui/system/esm/spacing.js
function sd(e, t, n, r) {
	var i;
	let a = (i = td(e, t, !1)) == null ? n : i;
	return typeof a == "number" ? (e) => typeof e == "string" ? e : a * e : Array.isArray(a) ? (e) => typeof e == "string" ? e : a[e] : typeof a == "function" ? a : () => void 0;
}
function cd(e) {
	return sd(e, "spacing", 8, "spacing");
}
function ld(e, t) {
	if (typeof t == "string" || t == null) return t;
	let n = e(Math.abs(t));
	return t >= 0 ? n : typeof n == "number" ? -n : `-${n}`;
}
function ud(e, t) {
	return (n) => e.reduce((e, r) => (e[r] = ld(t, n), e), {});
}
function dd(e, t, n, r) {
	if (t.indexOf(n) === -1) return null;
	let i = ud(vd(n), r), a = e[n];
	return Yu(e, a, i);
}
function fd(e, t) {
	let n = cd(e.theme);
	return Object.keys(e).map((r) => dd(e, t, r, n)).reduce(qu, {});
}
function pd(e) {
	return fd(e, yd);
}
function md(e) {
	return fd(e, bd);
}
var hd, gd, _d, vd, yd, bd, xd = w((() => {
	ed(), id(), Ju(), od(), hd = {
		m: "margin",
		p: "padding"
	}, gd = {
		t: "Top",
		r: "Right",
		b: "Bottom",
		l: "Left",
		x: ["Left", "Right"],
		y: ["Top", "Bottom"]
	}, _d = {
		marginX: "mx",
		marginY: "my",
		paddingX: "px",
		paddingY: "py"
	}, vd = ad((e) => {
		if (e.length > 2) {
			if (_d[e]) e = _d[e];
			else return [e];
		}
		let [t, n] = e.split(""), r = hd[t], i = gd[n] || "";
		return Array.isArray(i) ? i.map((e) => r + e) : [r + i];
	}), yd = [
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
	], bd = [
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
	], [...yd, ...bd], pd.propTypes = {}, pd.filterProps = yd, md.propTypes = {}, md.filterProps = bd;
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createSpacing.js
function Sd(e = 8) {
	if (e.mui) return e;
	let t = cd({ spacing: e }), n = (...e) => (e.length === 0 ? [1] : e).map((e) => {
		let n = t(e);
		return typeof n == "number" ? `${n}px` : n;
	}).join(" ");
	return n.mui = !0, n;
}
var Cd = w((() => {
	xd();
}));
//#endregion
//#region node_modules/@mui/system/esm/compose.js
function wd(...e) {
	let t = e.reduce((e, t) => (t.filterProps.forEach((n) => {
		e[n] = t;
	}), e), {}), n = (e) => Object.keys(e).reduce((n, r) => t[r] ? qu(n, t[r](e)) : n, {});
	return n.propTypes = {}, n.filterProps = e.reduce((e, t) => e.concat(t.filterProps), []), n;
}
var Td = w((() => {
	Ju();
}));
//#endregion
//#region node_modules/@mui/system/esm/borders.js
function Ed(e) {
	return typeof e == "number" ? `${e}px solid` : e;
}
function Dd(e, t) {
	return rd({
		prop: e,
		themeKey: "borders",
		transform: t
	});
}
var Od, kd, Ad, jd, Md, Nd, Pd, Fd, Id, Ld, Rd, zd, Bd, Vd = w((() => {
	id(), Td(), xd(), ed(), Od = Dd("border", Ed), kd = Dd("borderTop", Ed), Ad = Dd("borderRight", Ed), jd = Dd("borderBottom", Ed), Md = Dd("borderLeft", Ed), Nd = Dd("borderColor"), Pd = Dd("borderTopColor"), Fd = Dd("borderRightColor"), Id = Dd("borderBottomColor"), Ld = Dd("borderLeftColor"), Rd = Dd("outline", Ed), zd = Dd("outlineColor"), Bd = (e) => {
		if (e.borderRadius !== void 0 && e.borderRadius !== null) {
			let t = sd(e.theme, "shape.borderRadius", 4, "borderRadius");
			return Yu(e, e.borderRadius, (e) => ({ borderRadius: ld(t, e) }));
		}
		return null;
	}, Bd.propTypes = {}, Bd.filterProps = ["borderRadius"], wd(Od, kd, Ad, jd, Md, Nd, Pd, Fd, Id, Ld, Bd, Rd, zd);
})), Hd, Ud, Wd, Gd, Kd, qd, Jd, Yd, Xd, Zd, Qd, $d, ef = w((() => {
	id(), Td(), xd(), ed(), Hd = (e) => {
		if (e.gap !== void 0 && e.gap !== null) {
			let t = sd(e.theme, "spacing", 8, "gap");
			return Yu(e, e.gap, (e) => ({ gap: ld(t, e) }));
		}
		return null;
	}, Hd.propTypes = {}, Hd.filterProps = ["gap"], Ud = (e) => {
		if (e.columnGap !== void 0 && e.columnGap !== null) {
			let t = sd(e.theme, "spacing", 8, "columnGap");
			return Yu(e, e.columnGap, (e) => ({ columnGap: ld(t, e) }));
		}
		return null;
	}, Ud.propTypes = {}, Ud.filterProps = ["columnGap"], Wd = (e) => {
		if (e.rowGap !== void 0 && e.rowGap !== null) {
			let t = sd(e.theme, "spacing", 8, "rowGap");
			return Yu(e, e.rowGap, (e) => ({ rowGap: ld(t, e) }));
		}
		return null;
	}, Wd.propTypes = {}, Wd.filterProps = ["rowGap"], Gd = rd({ prop: "gridColumn" }), Kd = rd({ prop: "gridRow" }), qd = rd({ prop: "gridAutoFlow" }), Jd = rd({ prop: "gridAutoColumns" }), Yd = rd({ prop: "gridAutoRows" }), Xd = rd({ prop: "gridTemplateColumns" }), Zd = rd({ prop: "gridTemplateRows" }), Qd = rd({ prop: "gridTemplateAreas" }), $d = rd({ prop: "gridArea" }), wd(Hd, Ud, Wd, Gd, Kd, qd, Jd, Yd, Xd, Zd, Qd, $d);
}));
//#endregion
//#region node_modules/@mui/system/esm/palette.js
function tf(e, t) {
	return t === "grey" ? t : e;
}
var nf, rf, af, of = w((() => {
	id(), Td(), nf = rd({
		prop: "color",
		themeKey: "palette",
		transform: tf
	}), rf = rd({
		prop: "bgcolor",
		cssProperty: "backgroundColor",
		themeKey: "palette",
		transform: tf
	}), af = rd({
		prop: "backgroundColor",
		themeKey: "palette",
		transform: tf
	}), wd(nf, rf, af);
}));
//#endregion
//#region node_modules/@mui/system/esm/sizing.js
function sf(e) {
	return e <= 1 && e !== 0 ? `${e * 100}%` : e;
}
var cf, lf, uf, df, ff, pf, mf, hf = w((() => {
	id(), Td(), ed(), cf = rd({
		prop: "width",
		transform: sf
	}), lf = (e) => e.maxWidth !== void 0 && e.maxWidth !== null ? Yu(e, e.maxWidth, (t) => {
		var n, r;
		let i = ((n = e.theme) == null || (n = n.breakpoints) == null || (n = n.values) == null ? void 0 : n[t]) || Qu[t];
		return i ? ((r = e.theme) == null || (r = r.breakpoints) == null ? void 0 : r.unit) === "px" ? { maxWidth: i } : { maxWidth: `${i}${e.theme.breakpoints.unit}` } : { maxWidth: sf(t) };
	}) : null, lf.filterProps = ["maxWidth"], uf = rd({
		prop: "minWidth",
		transform: sf
	}), df = rd({
		prop: "height",
		transform: sf
	}), ff = rd({
		prop: "maxHeight",
		transform: sf
	}), pf = rd({
		prop: "minHeight",
		transform: sf
	}), rd({
		prop: "size",
		cssProperty: "width",
		transform: sf
	}), rd({
		prop: "size",
		cssProperty: "height",
		transform: sf
	}), mf = rd({ prop: "boxSizing" }), wd(cf, lf, uf, df, ff, pf, mf);
})), gf, _f = w((() => {
	xd(), Vd(), ef(), of(), hf(), gf = {
		border: {
			themeKey: "borders",
			transform: Ed
		},
		borderTop: {
			themeKey: "borders",
			transform: Ed
		},
		borderRight: {
			themeKey: "borders",
			transform: Ed
		},
		borderBottom: {
			themeKey: "borders",
			transform: Ed
		},
		borderLeft: {
			themeKey: "borders",
			transform: Ed
		},
		borderColor: { themeKey: "palette" },
		borderTopColor: { themeKey: "palette" },
		borderRightColor: { themeKey: "palette" },
		borderBottomColor: { themeKey: "palette" },
		borderLeftColor: { themeKey: "palette" },
		outline: {
			themeKey: "borders",
			transform: Ed
		},
		outlineColor: { themeKey: "palette" },
		borderRadius: {
			themeKey: "shape.borderRadius",
			style: Bd
		},
		color: {
			themeKey: "palette",
			transform: tf
		},
		bgcolor: {
			themeKey: "palette",
			cssProperty: "backgroundColor",
			transform: tf
		},
		backgroundColor: {
			themeKey: "palette",
			transform: tf
		},
		p: { style: md },
		pt: { style: md },
		pr: { style: md },
		pb: { style: md },
		pl: { style: md },
		px: { style: md },
		py: { style: md },
		padding: { style: md },
		paddingTop: { style: md },
		paddingRight: { style: md },
		paddingBottom: { style: md },
		paddingLeft: { style: md },
		paddingX: { style: md },
		paddingY: { style: md },
		paddingInline: { style: md },
		paddingInlineStart: { style: md },
		paddingInlineEnd: { style: md },
		paddingBlock: { style: md },
		paddingBlockStart: { style: md },
		paddingBlockEnd: { style: md },
		m: { style: pd },
		mt: { style: pd },
		mr: { style: pd },
		mb: { style: pd },
		ml: { style: pd },
		mx: { style: pd },
		my: { style: pd },
		margin: { style: pd },
		marginTop: { style: pd },
		marginRight: { style: pd },
		marginBottom: { style: pd },
		marginLeft: { style: pd },
		marginX: { style: pd },
		marginY: { style: pd },
		marginInline: { style: pd },
		marginInlineStart: { style: pd },
		marginInlineEnd: { style: pd },
		marginBlock: { style: pd },
		marginBlockStart: { style: pd },
		marginBlockEnd: { style: pd },
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
		gap: { style: Hd },
		rowGap: { style: Wd },
		columnGap: { style: Ud },
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
		width: { transform: sf },
		maxWidth: { style: lf },
		minWidth: { transform: sf },
		height: { transform: sf },
		maxHeight: { transform: sf },
		minHeight: { transform: sf },
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
function vf(...e) {
	let t = e.reduce((e, t) => e.concat(Object.keys(t)), []), n = new Set(t);
	return e.every((e) => n.size === Object.keys(e).length);
}
function yf(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function bf() {
	function e(e, t, n, r) {
		let i = {
			[e]: t,
			theme: n
		}, a = r[e];
		if (!a) return { [e]: t };
		let { cssProperty: o = e, themeKey: s, transform: c, style: l } = a;
		if (t == null) return null;
		if (s === "typography" && t === "inherit") return { [e]: t };
		let u = td(n, s) || {};
		return l ? l(i) : Yu(i, t, (t) => {
			let n = nd(u, c, t);
			return t === n && typeof t == "string" && (n = nd(u, c, `${e}${t === "default" ? "" : Ou(t)}`, t)), o === !1 ? n : { [o]: n };
		});
	}
	function t(n) {
		var r;
		let { sx: i, theme: a = {}, nested: o } = n || {};
		if (!i) return null;
		let s = (r = a.unstable_sxConfig) == null ? gf : r;
		function c(n) {
			let r = n;
			if (typeof n == "function") r = n(a);
			else if (typeof n != "object") return n;
			if (!r) return null;
			let i = Xu(a.breakpoints), c = Object.keys(i), l = i;
			return Object.keys(r).forEach((n) => {
				let i = yf(r[n], a);
				if (i != null) {
					if (typeof i == "object") {
						if (s[n]) l = qu(l, e(n, i, a, s));
						else {
							let e = Yu({ theme: a }, i, (e) => ({ [n]: e }));
							vf(e, i) ? l[n] = t({
								sx: i,
								theme: a,
								nested: !0
							}) : l = qu(l, e);
						}
					} else l = qu(l, e(n, i, a, s));
				}
			}), !o && a.modularCssLayers ? { "@layer sx": Zu(c, l) } : Zu(c, l);
		}
		return Array.isArray(i) ? i.map(c) : c(i);
	}
	return t;
}
var xf, Sf = w((() => {
	ju(), Ju(), id(), ed(), _f(), xf = bf(), xf.filterProps = ["sx"];
}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/applyStyles.js
function Cf(e, t) {
	let n = this;
	return n.vars && typeof n.getColorSchemeSelector == "function" ? { [n.getColorSchemeSelector(e).replace(/(\[[^\]]+\])/, "*:where($1)")]: t } : n.palette.mode === e ? t : {};
}
var wf = w((() => {}));
//#endregion
//#region node_modules/@mui/system/esm/createTheme/createTheme.js
function Tf(e = {}, ...t) {
	let { breakpoints: n = {}, palette: r = {}, spacing: i, shape: a = {} } = e, o = U(e, Ef), s = Vu(n), c = Sd(i), l = yu({
		breakpoints: s,
		direction: "ltr",
		components: {},
		palette: z({ mode: "light" }, r),
		spacing: c,
		shape: z({}, Gu, a)
	}, o);
	return l.applyStyles = Cf, l = t.reduce((e, t) => yu(e, t), l), l.unstable_sxConfig = z({}, gf, o == null ? void 0 : o.unstable_sxConfig), l.unstable_sx = function(e) {
		return xf({
			sx: e,
			theme: this
		});
	}, l;
}
var Ef, Df = w((() => {
	B(), W(), Cu(), Wu(), Ku(), Cd(), Sf(), _f(), wf(), Ef = [
		"breakpoints",
		"palette",
		"spacing",
		"shape"
	];
})), Of = /* @__PURE__ */ E({
	default: () => Tf,
	private_createBreakpoints: () => Vu,
	unstable_applyStyles: () => Cf
}), kf = w((() => {
	Df(), Wu(), wf();
}));
//#endregion
//#region node_modules/@mui/system/esm/styleFunctionSx/extendSxProp.js
function Af(e) {
	let { sx: t } = e, n = U(e, jf), { systemProps: r, otherProps: i } = Mf(n), a;
	return a = Array.isArray(t) ? [r, ...t] : typeof t == "function" ? (...e) => {
		let n = t(...e);
		return _u(n) ? z({}, r, n) : r;
	} : z({}, r, t), z({}, i, { sx: a });
}
var jf, Mf, Nf = w((() => {
	B(), W(), Cu(), _f(), jf = ["sx"], Mf = (e) => {
		var t, n;
		let r = {
			systemProps: {},
			otherProps: {}
		}, i = (t = e == null || (n = e.theme) == null ? void 0 : n.unstable_sxConfig) == null ? gf : t;
		return Object.keys(e).forEach((t) => {
			i[t] ? r.systemProps[t] = e[t] : r.otherProps[t] = e[t];
		}), r;
	};
})), Pf = /* @__PURE__ */ E({
	default: () => xf,
	extendSxProp: () => Af,
	unstable_createStyleFunctionSx: () => bf,
	unstable_defaultSxConfig: () => gf
}), Ff = w((() => {
	Sf(), Nf(), _f();
})), If = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = S, e.shouldForwardProp = h, e.systemDefaultTheme = void 0;
	var n = t(vs()), r = t(ys()), i = f((gu(), k(du))), a = (Cu(), k(Su));
	t((ju(), k(Au))), t((Bu(), k(zu)));
	var o = t((kf(), k(Of))), s = t((Ff(), k(Pf))), c = ["ownerState"], l = ["variants"], u = [
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
function Lf(e, t) {
	return z({ toolbar: {
		minHeight: 56,
		[e.up("xs")]: { "@media (orientation: landscape)": { minHeight: 48 } },
		[e.up("sm")]: { minHeight: 64 }
	} }, t);
}
var Rf = w((() => {
	B();
}));
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/clamp/clamp.js
function zf(e, t = -(2 ** 53 - 1), n = 2 ** 53 - 1) {
	return Math.max(t, Math.min(e, n));
}
var Bf = w((() => {})), Vf = /* @__PURE__ */ E({ default: () => zf }), Hf = w((() => {
	Bf();
})), Uf = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.alpha = f, e.colorChannel = void 0, e.darken = p, e.getContrastRatio = d, e.lighten = m, e.private_safeColorChannel = void 0;
	var n = t((Du(), k(Eu))), r = t((Hf(), k(Vf)));
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
})), Wf, Gf = w((() => {
	Wf = {
		black: "#000",
		white: "#fff"
	};
})), Kf, qf = w((() => {
	Kf = {
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
})), Jf, Yf = w((() => {
	Jf = {
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
})), Xf, Zf = w((() => {
	Xf = {
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
})), Qf, $f = w((() => {
	Qf = {
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
})), ep, tp = w((() => {
	ep = {
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
})), np, rp = w((() => {
	np = {
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
})), ip, ap = w((() => {
	ip = {
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
function op(e, t, n, r) {
	let i = r.light || r, a = r.dark || r * 1.5;
	e[t] || (e.hasOwnProperty(n) ? e[t] = e[n] : t === "light" ? e.light = (0, mp.lighten)(e.main, i) : t === "dark" && (e.dark = (0, mp.darken)(e.main, a)));
}
function sp(e = "light") {
	return e === "dark" ? {
		main: ep[200],
		light: ep[50],
		dark: ep[400]
	} : {
		main: ep[700],
		light: ep[400],
		dark: ep[800]
	};
}
function cp(e = "light") {
	return e === "dark" ? {
		main: Jf[200],
		light: Jf[50],
		dark: Jf[400]
	} : {
		main: Jf[500],
		light: Jf[300],
		dark: Jf[700]
	};
}
function lp(e = "light") {
	return e === "dark" ? {
		main: Xf[500],
		light: Xf[300],
		dark: Xf[700]
	} : {
		main: Xf[700],
		light: Xf[400],
		dark: Xf[800]
	};
}
function up(e = "light") {
	return e === "dark" ? {
		main: np[400],
		light: np[300],
		dark: np[700]
	} : {
		main: np[700],
		light: np[500],
		dark: np[900]
	};
}
function dp(e = "light") {
	return e === "dark" ? {
		main: ip[400],
		light: ip[300],
		dark: ip[700]
	} : {
		main: ip[800],
		light: ip[500],
		dark: ip[900]
	};
}
function fp(e = "light") {
	return e === "dark" ? {
		main: Qf[400],
		light: Qf[300],
		dark: Qf[700]
	} : {
		main: "#ed6c02",
		light: Qf[500],
		dark: Qf[900]
	};
}
function pp(e) {
	let { mode: t = "light", contrastThreshold: n = 3, tonalOffset: r = .2 } = e, i = U(e, hp), a = e.primary || sp(t), o = e.secondary || cp(t), s = e.error || lp(t), c = e.info || up(t), l = e.success || dp(t), u = e.warning || fp(t);
	function d(e) {
		return (0, mp.getContrastRatio)(e, _p.text.primary) >= n ? _p.text.primary : gp.text.primary;
	}
	let f = ({ color: e, name: t, mainShade: n = 500, lightShade: i = 300, darkShade: a = 700 }) => {
		if (e = z({}, e), !e.main && e[n] && (e.main = e[n]), !e.hasOwnProperty("main")) throw Error(xi(11, t ? ` (${t})` : "", n));
		if (typeof e.main != "string") throw Error(xi(12, t ? ` (${t})` : "", JSON.stringify(e.main)));
		return op(e, "light", i, r), op(e, "dark", a, r), e.contrastText || (e.contrastText = d(e.main)), e;
	}, p = {
		dark: _p,
		light: gp
	};
	return _i(z({
		common: z({}, Wf),
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
		grey: Kf,
		contrastThreshold: n,
		getContrastText: d,
		augmentColor: f,
		tonalOffset: r
	}, p[t]), i);
}
var mp, hp, gp, _p, vp = w((() => {
	B(), W(), Ci(), bi(), mp = Uf(), Gf(), qf(), Yf(), Zf(), $f(), tp(), rp(), ap(), hp = [
		"mode",
		"contrastThreshold",
		"tonalOffset"
	], gp = {
		text: {
			primary: "rgba(0, 0, 0, 0.87)",
			secondary: "rgba(0, 0, 0, 0.6)",
			disabled: "rgba(0, 0, 0, 0.38)"
		},
		divider: "rgba(0, 0, 0, 0.12)",
		background: {
			paper: Wf.white,
			default: Wf.white
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
	}, _p = {
		text: {
			primary: Wf.white,
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
			active: Wf.white,
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
function yp(e) {
	return Math.round(e * 1e5) / 1e5;
}
function bp(e, t) {
	let n = typeof t == "function" ? t(e) : t, { fontFamily: r = Cp, fontSize: i = 14, fontWeightLight: a = 300, fontWeightRegular: o = 400, fontWeightMedium: s = 500, fontWeightBold: c = 700, htmlFontSize: l = 16, allVariants: u, pxToRem: d } = n, f = U(n, xp), p = i / 14, m = d || ((e) => `${e / l * p}rem`), h = (e, t, n, i, a) => z({
		fontFamily: r,
		fontWeight: e,
		fontSize: m(t),
		lineHeight: n
	}, r === Cp ? { letterSpacing: `${yp(i / t)}em` } : {}, a, u), g = {
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
		button: h(s, 14, 1.75, .4, Sp),
		caption: h(o, 12, 1.66, .4),
		overline: h(o, 12, 2.66, 1, Sp),
		inherit: {
			fontFamily: "inherit",
			fontWeight: "inherit",
			fontSize: "inherit",
			lineHeight: "inherit",
			letterSpacing: "inherit"
		}
	};
	return _i(z({
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
var xp, Sp, Cp, wp = w((() => {
	B(), W(), bi(), xp = [
		"fontFamily",
		"fontSize",
		"fontWeightLight",
		"fontWeightRegular",
		"fontWeightMedium",
		"fontWeightBold",
		"htmlFontSize",
		"allVariants",
		"pxToRem"
	], Sp = { textTransform: "uppercase" }, Cp = "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif";
}));
//#endregion
//#region node_modules/@mui/material/styles/shadows.js
function Tp(...e) {
	return [
		`${e[0]}px ${e[1]}px ${e[2]}px ${e[3]}px rgba(0,0,0,${Ep})`,
		`${e[4]}px ${e[5]}px ${e[6]}px ${e[7]}px rgba(0,0,0,${Dp})`,
		`${e[8]}px ${e[9]}px ${e[10]}px ${e[11]}px rgba(0,0,0,${Op})`
	].join(",");
}
var Ep, Dp, Op, kp, Ap = w((() => {
	Ep = .2, Dp = .14, Op = .12, kp = [
		"none",
		Tp(0, 2, 1, -1, 0, 1, 1, 0, 0, 1, 3, 0),
		Tp(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0),
		Tp(0, 3, 3, -2, 0, 3, 4, 0, 0, 1, 8, 0),
		Tp(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0),
		Tp(0, 3, 5, -1, 0, 5, 8, 0, 0, 1, 14, 0),
		Tp(0, 3, 5, -1, 0, 6, 10, 0, 0, 1, 18, 0),
		Tp(0, 4, 5, -2, 0, 7, 10, 1, 0, 2, 16, 1),
		Tp(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2),
		Tp(0, 5, 6, -3, 0, 9, 12, 1, 0, 3, 16, 2),
		Tp(0, 6, 6, -3, 0, 10, 14, 1, 0, 4, 18, 3),
		Tp(0, 6, 7, -4, 0, 11, 15, 1, 0, 4, 20, 3),
		Tp(0, 7, 8, -4, 0, 12, 17, 2, 0, 5, 22, 4),
		Tp(0, 7, 8, -4, 0, 13, 19, 2, 0, 5, 24, 4),
		Tp(0, 7, 9, -4, 0, 14, 21, 2, 0, 5, 26, 4),
		Tp(0, 8, 9, -5, 0, 15, 22, 2, 0, 6, 28, 5),
		Tp(0, 8, 10, -5, 0, 16, 24, 2, 0, 6, 30, 5),
		Tp(0, 8, 11, -5, 0, 17, 26, 2, 0, 6, 32, 5),
		Tp(0, 9, 11, -5, 0, 18, 28, 2, 0, 7, 34, 6),
		Tp(0, 9, 12, -6, 0, 19, 29, 2, 0, 7, 36, 6),
		Tp(0, 10, 13, -6, 0, 20, 31, 3, 0, 8, 38, 7),
		Tp(0, 10, 13, -6, 0, 21, 33, 3, 0, 8, 40, 7),
		Tp(0, 10, 14, -6, 0, 22, 35, 3, 0, 8, 42, 7),
		Tp(0, 11, 14, -7, 0, 23, 36, 3, 0, 9, 44, 8),
		Tp(0, 11, 15, -7, 0, 24, 38, 3, 0, 9, 46, 8)
	];
}));
//#endregion
//#region node_modules/@mui/material/styles/createTransitions.js
function jp(e) {
	return `${Math.round(e)}ms`;
}
function Mp(e) {
	if (!e) return 0;
	let t = e / 36;
	return Math.round((4 + 15 * t ** .25 + t / 5) * 10);
}
function Np(e) {
	let t = z({}, Fp, e.easing), n = z({}, Ip, e.duration);
	return z({
		getAutoHeightDuration: Mp,
		create: (e = ["all"], r = {}) => {
			let { duration: i = n.standard, easing: a = t.easeInOut, delay: o = 0 } = r;
			return U(r, Pp), (Array.isArray(e) ? e : [e]).map((e) => `${e} ${typeof i == "string" ? i : jp(i)} ${a} ${typeof o == "string" ? o : jp(o)}`).join(",");
		}
	}, e, {
		easing: t,
		duration: n
	});
}
var Pp, Fp, Ip, Lp = w((() => {
	W(), B(), Pp = [
		"duration",
		"easing",
		"delay"
	], Fp = {
		easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
		easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
		easeIn: "cubic-bezier(0.4, 0, 1, 1)",
		sharp: "cubic-bezier(0.4, 0, 0.6, 1)"
	}, Ip = {
		shortest: 150,
		shorter: 200,
		short: 250,
		standard: 300,
		complex: 375,
		enteringScreen: 225,
		leavingScreen: 195
	};
})), Rp, zp = w((() => {
	Rp = {
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
function Bp(e = {}, ...t) {
	let { mixins: n = {}, palette: r = {}, transitions: i = {}, typography: a = {} } = e, o = U(e, Vp);
	if (e.vars && e.generateCssVars === void 0) throw Error(xi(18));
	let s = pp(r), c = Tf(e), l = _i(c, {
		mixins: Lf(c.breakpoints, n),
		palette: s,
		shadows: kp.slice(),
		typography: bp(s, a),
		transitions: Np(i),
		zIndex: z({}, Rp)
	});
	return l = _i(l, o), l = t.reduce((e, t) => _i(e, t), l), l.unstable_sxConfig = z({}, gf, o == null ? void 0 : o.unstable_sxConfig), l.unstable_sx = function(e) {
		return xf({
			sx: e,
			theme: this
		});
	}, l;
}
var Vp, Hp = w((() => {
	B(), W(), Ci(), bi(), Ff(), kf(), Rf(), vp(), wp(), Ap(), Lp(), zp(), Vp = [
		"breakpoints",
		"mixins",
		"spacing",
		"palette",
		"transitions",
		"typography",
		"shape"
	];
})), Up, Wp = w((() => {
	Hp(), Up = Bp();
})), Gp, Kp = w((() => {
	Gp = "$$material";
}));
//#endregion
//#region node_modules/@mui/material/styles/slotShouldForwardProp.js
function qp(e) {
	return e !== "ownerState" && e !== "theme" && e !== "sx" && e !== "as";
}
var Jp = w((() => {})), Yp, Xp = w((() => {
	Jp(), Yp = (e) => qp(e) && e !== "classes";
})), Zp, Y, Qp = w((() => {
	Zp = /* @__PURE__ */ O(If()), Wp(), Kp(), Xp(), Jp(), Y = (0, Zp.default)({
		themeId: Gp,
		defaultTheme: Up,
		rootShouldForwardProp: Yp
	});
}));
//#endregion
//#region node_modules/@mui/material/SvgIcon/svgIconClasses.js
function $p(e) {
	return ho("MuiSvgIcon", e);
}
var em = w((() => {
	bo(), vo(), H("MuiSvgIcon", [
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
})), tm, nm, rm, im, am, om, sm, cm = w((() => {
	B(), W(), tm = /* @__PURE__ */ O(Br()), jo(), co(), $o(), _s(), Qp(), em(), nm = os(), rm = os(), im = [
		"children",
		"className",
		"color",
		"component",
		"fontSize",
		"htmlColor",
		"inheritViewBox",
		"titleAccess",
		"viewBox"
	], am = (e) => {
		let { color: t, fontSize: n, classes: r } = e;
		return V({ root: [
			"root",
			t !== "inherit" && `color${K(t)}`,
			`fontSize${K(n)}`
		] }, $p, r);
	}, om = Y("svg", {
		name: "MuiSvgIcon",
		slot: "Root",
		overridesResolver: (e, t) => {
			let { ownerState: n } = e;
			return [
				t.root,
				n.color !== "inherit" && t[`color${K(n.color)}`],
				t[`fontSize${K(n.fontSize)}`]
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
	}), sm = /*#__PURE__*/ tm.forwardRef(function(e, t) {
		let n = hs({
			props: e,
			name: "MuiSvgIcon"
		}), { children: r, className: i, color: a = "inherit", component: o = "svg", fontSize: s = "medium", htmlColor: c, inheritViewBox: l = !1, titleAccess: u, viewBox: d = "0 0 24 24" } = n, f = U(n, im), p = /*#__PURE__*/ tm.isValidElement(r) && r.type === "svg", m = z({}, n, {
			color: a,
			component: o,
			fontSize: s,
			instanceFontSize: e.fontSize,
			inheritViewBox: l,
			viewBox: d,
			hasSvgAsChild: p
		}), h = {};
		l || (h.viewBox = d);
		let g = am(m);
		return /*#__PURE__*/ (0, rm.jsxs)(om, z({
			as: o,
			className: G(g.root, i),
			focusable: "false",
			color: c,
			"aria-hidden": !u || void 0,
			role: u ? "img" : void 0,
			ref: t
		}, h, f, p && r.props, {
			ownerState: m,
			children: [p ? r.props.children : r, u ? /*#__PURE__*/ (0, nm.jsx)("title", { children: u }) : null]
		}));
	}), sm.muiName = "SvgIcon";
})), lm = w((() => {
	cm(), em(), em();
}));
//#endregion
//#region node_modules/@mui/material/utils/createSvgIcon.js
function um(e, t) {
	function n(n, r) {
		return /*#__PURE__*/ (0, fm.jsx)(sm, z({
			"data-testid": `${t}Icon`,
			ref: r
		}, n, { children: e }));
	}
	return n.muiName = sm.muiName, /*#__PURE__*/ dm.memo(/*#__PURE__*/ dm.forwardRef(n));
}
var dm, fm, pm = w((() => {
	B(), dm = /* @__PURE__ */ O(Br()), lm(), fm = os();
})), mm, hm = w((() => {
	Pi(), mm = Mi;
})), gm, _m = w((() => {
	Li(), gm = Fi;
})), vm, ym = w((() => {
	Vi(), vm = Ri;
})), bm, xm = w((() => {
	Wi(), bm = Hi;
})), Sm, Cm = w((() => {
	qi(), Sm = Gi;
})), wm, Tm = w((() => {
	Xi(), wm = Ji;
})), Em, Dm = w((() => {
	$i(), Em = Zi;
})), Om, km = w((() => {
	ra(), Om = ta;
})), Am, jm = w((() => {
	ua(), Am = aa;
})), Mm, Nm = w((() => {
	pa(), Mm = da;
})), Pm, Fm = w((() => {
	_a(), Pm = ma;
})), Im, Lm = w((() => {
	xa(), Im = va;
})), Rm, zm = w((() => {
	Ta(), Rm = Sa;
})), Bm, Vm = w((() => {
	Za(), Bm = Wa;
})), Hm = /* @__PURE__ */ E({
	capitalize: () => K,
	createChainedFunction: () => es,
	createSvgIcon: () => um,
	debounce: () => mm,
	deprecatedPropType: () => gm,
	isMuiElement: () => vm,
	ownerDocument: () => bm,
	ownerWindow: () => Sm,
	requirePropFactory: () => wm,
	setRef: () => Em,
	unstable_ClassNameGenerator: () => Um,
	unstable_useEnhancedEffect: () => Om,
	unstable_useId: () => Am,
	unsupportedProp: () => Mm,
	useControlled: () => Pm,
	useEventCallback: () => Im,
	useForkRef: () => Rm,
	useIsFocusVisible: () => Bm
}), Um, Wm = w((() => {
	Qo(), $o(), ts(), pm(), hm(), _m(), ym(), xm(), Cm(), Tm(), Dm(), km(), jm(), Nm(), Fm(), Lm(), zm(), Vm(), Um = { configure: (e) => {
		fo.configure(e);
	} };
})), Gm = /* @__PURE__ */ T(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), Object.defineProperty(e, "default", {
		enumerable: !0,
		get: function() {
			return t.createSvgIcon;
		}
	});
	var t = (Wm(), k(Hm));
})), Km = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" }), "CheckCircle");
})), qm = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" }), "Close");
})), Jm = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z" }), "Error");
})), Ym = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2zm10 14.5V20H8v-3.5l4-4zm-4-5-4-4V4h8v3.5z" }), "HourglassEmpty");
})), Xm = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2M9.5 16.5v-9l7 4.5z" }), "PlayCircle");
})), Zm = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2M1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2" }), "ShoppingCart");
})), Qm = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m16 18 2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" }), "TrendingDown");
})), $m = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m22 12-4-4v3H3v2h15v3z" }), "TrendingFlat");
})), eh = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" }), "TrendingUp");
}));
//#endregion
//#region node_modules/@mui/system/esm/useThemeWithoutDefault.js
gu();
function th(e) {
	return Object.keys(e).length === 0;
}
function nh(e = null) {
	let t = R.useContext(Tl);
	return !t || th(t) ? e : t;
}
//#endregion
//#region node_modules/@mui/system/esm/useTheme.js
kf();
var rh = Tf();
function ih(e = rh) {
	return nh(e);
}
//#endregion
//#region node_modules/@mui/system/esm/GlobalStyles/GlobalStyles.js
gu();
var X = os();
function ah(e) {
	let t = pu(e);
	return e !== t && t.styles ? (t.styles.match(/^@layer\s+[^{]*$/) || (t.styles = `@layer global{${t.styles}}`), t) : e;
}
function oh({ styles: e, themeId: t, defaultTheme: n = {} }) {
	let r = ih(n), i = t && r[t] || r, a = typeof e == "function" ? e(i) : e;
	return i.modularCssLayers && (a = Array.isArray(a) ? a.map((e) => ah(typeof e == "function" ? e(i) : e)) : ah(a)), /*#__PURE__*/ (0, X.jsx)(su, { styles: a });
}
B(), W(), jo(), gu(), Ff();
var sh = ["className", "component"];
function ch(e = {}) {
	let { themeId: t, defaultTheme: n, defaultClassName: r = "MuiBox-root", generateClassName: i } = e, a = fu("div", { shouldForwardProp: (e) => e !== "theme" && e !== "sx" && e !== "as" })(xf);
	return /* @__PURE__ */ R.forwardRef(function(e, o) {
		let s = ih(n), c = Af(e), { className: l, component: u = "div" } = c, d = U(c, sh);
		return /*#__PURE__*/ (0, X.jsx)(a, z({
			as: u,
			ref: o,
			className: G(l, i ? i(r) : r),
			theme: t && s[t] || s
		}, d));
	});
}
//#endregion
//#region node_modules/@mui/system/esm/useThemeProps/getThemeProps.js
is();
function lh(e) {
	let { theme: t, name: n, props: r } = e;
	return !t || !t.components || !t.components[n] || !t.components[n].defaultProps ? r : ns(t.components[n].defaultProps, r);
}
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/useEnhancedEffect/useEnhancedEffect.js
var uh = typeof window < "u" ? R.useLayoutEffect : R.useEffect;
//#endregion
//#region node_modules/@mui/system/esm/useMediaQuery/useMediaQuery.js
function dh(e, t, n, r, i) {
	let [a, o] = R.useState(() => i && n ? n(e).matches : r ? r(e).matches : t);
	return uh(() => {
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
var fh = R.useSyncExternalStore;
function ph(e, t, n, r, i) {
	let a = R.useCallback(() => t, [t]), o = R.useMemo(() => {
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
	]), [s, c] = R.useMemo(() => {
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
	return fh(c, s, o);
}
function mh(e, t = {}) {
	let n = nh(), r = typeof window < "u" && window.matchMedia !== void 0, { defaultMatches: i = !1, matchMedia: a = r ? window.matchMedia : null, ssrMatchMedia: o = null, noSsr: s = !1 } = lh({
		name: "MuiUseMediaQuery",
		props: t,
		theme: n
	}), c = typeof e == "function" ? e(n) : e;
	return c = c.replace(/^@media( ?)/m, ""), (fh === void 0 ? dh : ph)(c, i, a, o, s);
}
Du(), Hf();
function hh(e, t = 0, n = 1) {
	return zf(e, t, n);
}
function gh(e) {
	e = e.slice(1);
	let t = RegExp(`.{1,${e.length >= 6 ? 2 : 1}}`, "g"), n = e.match(t);
	return n && n[0].length === 1 && (n = n.map((e) => e + e)), n ? `rgb${n.length === 4 ? "a" : ""}(${n.map((e, t) => t < 3 ? parseInt(e, 16) : Math.round(parseInt(e, 16) / 255 * 1e3) / 1e3).join(", ")})` : "";
}
function _h(e) {
	if (e.type) return e;
	if (e.charAt(0) === "#") return _h(gh(e));
	let t = e.indexOf("("), n = e.substring(0, t);
	if ([
		"rgb",
		"rgba",
		"hsl",
		"hsla",
		"color"
	].indexOf(n) === -1) throw Error(wu(9, e));
	let r = e.substring(t + 1, e.length - 1), i;
	if (n === "color") {
		if (r = r.split(" "), i = r.shift(), r.length === 4 && r[3].charAt(0) === "/" && (r[3] = r[3].slice(1)), [
			"srgb",
			"display-p3",
			"a98-rgb",
			"prophoto-rgb",
			"rec-2020"
		].indexOf(i) === -1) throw Error(wu(10, i));
	} else r = r.split(",");
	return r = r.map((e) => parseFloat(e)), {
		type: n,
		values: r,
		colorSpace: i
	};
}
function vh(e) {
	let { type: t, colorSpace: n } = e, { values: r } = e;
	return t.indexOf("rgb") === -1 ? t.indexOf("hsl") !== -1 && (r[1] = `${r[1]}%`, r[2] = `${r[2]}%`) : r = r.map((e, t) => t < 3 ? parseInt(e, 10) : e), r = t.indexOf("color") === -1 ? `${r.join(", ")}` : `${n} ${r.join(" ")}`, `${t}(${r})`;
}
function yh(e, t) {
	return e = _h(e), t = hh(t), (e.type === "rgb" || e.type === "hsl") && (e.type += "a"), e.type === "color" ? e.values[3] = `/${t}` : e.values[3] = t, vh(e);
}
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/utils/esm/useId/useId.js
var bh = 0;
function xh(e) {
	let [t, n] = R.useState(e), r = e || t;
	return R.useEffect(() => {
		t == null && (bh += 1, n(`mui-${bh}`));
	}, [t]), r;
}
var Sh = R.useId;
function Ch(e) {
	if (Sh !== void 0) {
		let t = Sh();
		return e == null ? t : e;
	}
	return xh(e);
}
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/useTheme/ThemeContext.js
var wh = /*#__PURE__*/ R.createContext(null);
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/useTheme/useTheme.js
function Th() {
	return R.useContext(wh);
}
var Eh = typeof Symbol == "function" && Symbol.for ? Symbol.for("mui.nested") : "__THEME_NESTED__";
//#endregion
//#region node_modules/@mui/system/node_modules/@mui/private-theming/ThemeProvider/ThemeProvider.js
B();
function Dh(e, t) {
	return typeof t == "function" ? t(e) : z({}, e, t);
}
function Oh(e) {
	let { children: t, theme: n } = e, r = Th(), i = R.useMemo(() => {
		let e = r === null ? n : Dh(r, n);
		return e != null && (e[Eh] = r !== null), e;
	}, [n, r]);
	return /*#__PURE__*/ (0, X.jsx)(wh.Provider, {
		value: i,
		children: t
	});
}
B(), W();
var kh = ["value"], Ah = /*#__PURE__*/ R.createContext();
function jh(e) {
	let { value: t } = e, n = U(e, kh);
	return /*#__PURE__*/ (0, X.jsx)(Ah.Provider, z({ value: t == null || t }, n));
}
var Mh = () => {
	let e = R.useContext(Ah);
	return e != null && e;
};
//#endregion
//#region node_modules/@mui/system/esm/ThemeProvider/useLayerOrder.js
function Nh(e) {
	let t = nh(), n = Ch() || "", { modularCssLayers: r } = e, i = "mui.global, mui.components, mui.theme, mui.custom, mui.sx";
	return i = !r || t !== null ? "" : typeof r == "string" ? r.replace(/mui(?!\.)/g, i) : `@layer ${i};`, uh(() => {
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
	}, [i, n]), i ? /*#__PURE__*/ (0, X.jsx)(oh, { styles: i }) : null;
}
B(), gu(), ms();
var Ph = {};
function Fh(e, t, n, r = !1) {
	return R.useMemo(() => {
		let i = e && t[e] || t;
		if (typeof n == "function") {
			let a = n(i), o = e ? z({}, t, { [e]: a }) : a;
			return r ? () => o : o;
		}
		return e ? z({}, t, { [e]: n }) : z({}, t, n);
	}, [
		e,
		t,
		n,
		r
	]);
}
function Ih(e) {
	let { children: t, theme: n, themeId: r } = e, i = nh(Ph), a = Th() || Ph, o = Fh(r, i, n), s = Fh(r, a, n, !0), c = o.direction === "rtl", l = Nh(o);
	return /*#__PURE__*/ (0, X.jsx)(Oh, {
		theme: s,
		children: /*#__PURE__*/ (0, X.jsx)(Tl.Provider, {
			value: o,
			children: /*#__PURE__*/ (0, X.jsx)(jh, {
				value: c,
				children: /*#__PURE__*/ (0, X.jsxs)(ss, {
					value: o == null ? void 0 : o.components,
					children: [l, t]
				})
			})
		})
	});
}
//#endregion
//#region node_modules/@mui/material/styles/cssUtils.js
function Lh(e) {
	return String(parseFloat(e)).length === String(e).length;
}
function Rh(e) {
	return String(e).match(/[\d.\-+]*\s*(.*)/)[1] || "";
}
function zh(e) {
	return parseFloat(e);
}
function Bh(e) {
	return (t, n) => {
		let r = Rh(t);
		if (r === n) return t;
		let i = zh(t);
		r !== "px" && (r === "em" || r === "rem") && (i = zh(t) * zh(e));
		let a = i;
		if (n !== "px") {
			if (n === "em") a = i / zh(e);
			else if (n === "rem") a = i / zh(e);
			else return t;
		}
		return parseFloat(a.toFixed(5)) + n;
	};
}
function Vh({ size: e, grid: t }) {
	let n = e - e % t, r = n + t;
	return e - n < r - e ? n : r;
}
function Hh({ lineHeight: e, pixels: t, htmlFontSize: n }) {
	return t / (e * n);
}
function Uh({ cssProperty: e, min: t, max: n, unit: r = "rem", breakpoints: i = [
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
B(), Ci();
function Wh(e, t = {}) {
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
	] } = t, o = z({}, e);
	o.typography = z({}, o.typography);
	let s = o.typography, c = Bh(s.htmlFontSize), l = n.map((e) => o.breakpoints.values[e]);
	return a.forEach((e) => {
		let t = s[e];
		if (!t) return;
		let n = parseFloat(c(t.fontSize, "rem"));
		if (n <= 1) return;
		let a = n, o = 1 + (a - 1) / i, { lineHeight: u } = t;
		if (!Lh(u) && !r) throw Error(xi(6));
		Lh(u) || (u = parseFloat(c(u, "rem")) / parseFloat(n));
		let d = null;
		r || (d = (e) => Vh({
			size: e,
			grid: Hh({
				pixels: 4,
				lineHeight: u,
				htmlFontSize: s.htmlFontSize
			})
		})), s[e] = z({}, t, Uh({
			cssProperty: "fontSize",
			min: o,
			max: a,
			unit: "rem",
			breakpoints: l,
			transform: d
		}));
	}), o;
}
Wp(), Kp();
function Gh() {
	let e = ih(Up);
	return e.$$material || e;
}
B(), W(), Kp();
var Kh = ["theme"];
function qh(e) {
	let { theme: t } = e, n = U(e, Kh), r = t[Gp], i = r || t;
	return typeof t != "function" && (r && !r.vars ? i = z({}, r, { vars: null }) : t && !t.vars && (i = z({}, t, { vars: null }))), /*#__PURE__*/ (0, X.jsx)(Ih, z({}, n, {
		themeId: r ? Gp : void 0,
		theme: i
	}));
}
//#endregion
//#region node_modules/@mui/material/styles/getOverlayAlpha.js
var Jh = (e) => {
	let t;
	return t = e < 1 ? 5.11916 * e ** 2 : 4.5 * Math.log(e + 1) + 2, (t / 100).toFixed(2);
};
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function Yh(e, t) {
	return Yh = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(e, t) {
		return e.__proto__ = t, e;
	}, Yh(e, t);
}
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function Xh(e, t) {
	e.prototype = Object.create(t.prototype), e.prototype.constructor = e, Yh(e, t);
}
//#endregion
//#region node_modules/scheduler/cjs/scheduler.production.min.js
var Zh = /* @__PURE__ */ T(((e) => {
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
			if (n(c) !== null) m = !0, ee(x);
			else {
				var t = n(l);
				t !== null && M(b, t.startTime - e);
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
				g !== null && M(b, g.startTime - i), u = !1;
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
	function ee(e) {
		C = e, S || (S = !0, k());
	}
	function M(t, n) {
		w = g(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_continueExecution = function() {
		m || p || (m = !0, ee(x));
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
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (_(w), w = -1) : h = !0, M(b, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, ee(x))), r;
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
})), Qh = /* @__PURE__ */ T(((e, t) => {
	t.exports = Zh();
})), $h = /* @__PURE__ */ T(((e) => {
	var t = Br(), n = Qh();
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
	var x = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, S = Symbol.for("react.element"), C = Symbol.for("react.portal"), w = Symbol.for("react.fragment"), T = Symbol.for("react.strict_mode"), E = Symbol.for("react.profiler"), D = Symbol.for("react.provider"), O = Symbol.for("react.context"), k = Symbol.for("react.forward_ref"), A = Symbol.for("react.suspense"), j = Symbol.for("react.suspense_list"), ee = Symbol.for("react.memo"), M = Symbol.for("react.lazy"), te = Symbol.for("react.offscreen"), ne = Symbol.iterator;
	function re(e) {
		return typeof e != "object" || !e ? null : (e = ne && e[ne] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var N = Object.assign, ie;
	function P(e) {
		if (ie === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			ie = t && t[1] || "";
		}
		return "\n" + ie + e;
	}
	var ae = !1;
	function F(e, t) {
		if (!e || ae) return "";
		ae = !0;
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
			ae = !1, Error.prepareStackTrace = n;
		}
		return (e = e ? e.displayName || e.name : "") ? P(e) : "";
	}
	function oe(e) {
		switch (e.tag) {
			case 5: return P(e.type);
			case 16: return P("Lazy");
			case 13: return P("Suspense");
			case 19: return P("SuspenseList");
			case 0:
			case 2:
			case 15: return e = F(e.type, !1), e;
			case 11: return e = F(e.type.render, !1), e;
			case 1: return e = F(e.type, !0), e;
			default: return "";
		}
	}
	function se(e) {
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
			case ee: return t = e.displayName || null, t === null ? se(e.type) || "Memo" : t;
			case M:
				t = e._payload, e = e._init;
				try {
					return se(e(t));
				} catch {}
		}
		return null;
	}
	function ce(e) {
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
			case 16: return se(t);
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
	function le(e) {
		switch (typeof e) {
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function ue(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function de(e) {
		var t = ue(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
	function fe(e) {
		e._valueTracker || (e._valueTracker = de(e));
	}
	function pe(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = ue(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	function me(e) {
		if (e = e || (typeof document < "u" ? document : void 0), e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function he(e, t) {
		var n = t.checked;
		return N({}, t, {
			defaultChecked: void 0,
			defaultValue: void 0,
			value: void 0,
			checked: n == null ? e._wrapperState.initialChecked : n
		});
	}
	function ge(e, t) {
		var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked == null ? t.defaultChecked : t.checked;
		n = le(t.value == null ? n : t.value), e._wrapperState = {
			initialChecked: r,
			initialValue: n,
			controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null
		};
	}
	function _e(e, t) {
		t = t.checked, t != null && b(e, "checked", t, !1);
	}
	function ve(e, t) {
		_e(e, t);
		var n = le(t.value), r = t.type;
		if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
		else if (r === "submit" || r === "reset") {
			e.removeAttribute("value");
			return;
		}
		t.hasOwnProperty("value") ? be(e, t.type, n) : t.hasOwnProperty("defaultValue") && be(e, t.type, le(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
	}
	function ye(e, t, n) {
		if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
			var r = t.type;
			if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
			t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
		}
		n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
	}
	function be(e, t, n) {
		(t !== "number" || me(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
	}
	var xe = Array.isArray;
	function Se(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + le(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function Ce(e, t) {
		if (t.dangerouslySetInnerHTML != null) throw Error(r(91));
		return N({}, t, {
			value: void 0,
			defaultValue: void 0,
			children: "" + e._wrapperState.initialValue
		});
	}
	function we(e, t) {
		var n = t.value;
		if (n == null) {
			if (n = t.children, t = t.defaultValue, n != null) {
				if (t != null) throw Error(r(92));
				if (xe(n)) {
					if (1 < n.length) throw Error(r(93));
					n = n[0];
				}
				t = n;
			}
			t == null && (t = ""), n = t;
		}
		e._wrapperState = { initialValue: le(n) };
	}
	function Te(e, t) {
		var n = le(t.value), r = le(t.defaultValue);
		n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
	}
	function Ee(e) {
		var t = e.textContent;
		t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
	}
	function De(e) {
		switch (e) {
			case "svg": return "http://www.w3.org/2000/svg";
			case "math": return "http://www.w3.org/1998/Math/MathML";
			default: return "http://www.w3.org/1999/xhtml";
		}
	}
	function Oe(e, t) {
		return e == null || e === "http://www.w3.org/1999/xhtml" ? De(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
	}
	var ke, Ae = function(e) {
		return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, i) {
			MSApp.execUnsafeLocalFunction(function() {
				return e(t, n, r, i);
			});
		} : e;
	}(function(e, t) {
		if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
		else {
			for (ke = ke || document.createElement("div"), ke.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = ke.firstChild; e.firstChild;) e.removeChild(e.firstChild);
			for (; t.firstChild;) e.appendChild(t.firstChild);
		}
	});
	function je(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var Me = {
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
	}, Ne = [
		"Webkit",
		"ms",
		"Moz",
		"O"
	];
	Object.keys(Me).forEach(function(e) {
		Ne.forEach(function(t) {
			t = t + e.charAt(0).toUpperCase() + e.substring(1), Me[t] = Me[e];
		});
	});
	function Pe(e, t, n) {
		return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Me.hasOwnProperty(e) && Me[e] ? ("" + t).trim() : t + "px";
	}
	function Fe(e, t) {
		for (var n in e = e.style, t) if (t.hasOwnProperty(n)) {
			var r = n.indexOf("--") === 0, i = Pe(n, t[n], r);
			n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
		}
	}
	var Ie = N({ menuitem: !0 }, {
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
	function Le(e, t) {
		if (t) {
			if (Ie[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(r(137, e));
			if (t.dangerouslySetInnerHTML != null) {
				if (t.children != null) throw Error(r(60));
				if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(r(61));
			}
			if (t.style != null && typeof t.style != "object") throw Error(r(62));
		}
	}
	function Re(e, t) {
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
	var ze = null;
	function Be(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var Ve = null, He = null, Ue = null;
	function We(e) {
		if (e = Vi(e)) {
			if (typeof Ve != "function") throw Error(r(280));
			var t = e.stateNode;
			t && (t = Ui(t), Ve(e.stateNode, e.type, t));
		}
	}
	function Ge(e) {
		He ? Ue ? Ue.push(e) : Ue = [e] : He = e;
	}
	function Ke() {
		if (He) {
			var e = He, t = Ue;
			if (Ue = He = null, We(e), t) for (e = 0; e < t.length; e++) We(t[e]);
		}
	}
	function qe(e, t) {
		return e(t);
	}
	function Je() {}
	var Ye = !1;
	function Xe(e, t, n) {
		if (Ye) return e(t, n);
		Ye = !0;
		try {
			return qe(e, t, n);
		} finally {
			Ye = !1, (He !== null || Ue !== null) && (Je(), Ke());
		}
	}
	function Ze(e, t) {
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
	var Qe = !1;
	if (c) try {
		var $e = {};
		Object.defineProperty($e, "passive", { get: function() {
			Qe = !0;
		} }), window.addEventListener("test", $e, $e), window.removeEventListener("test", $e, $e);
	} catch {
		Qe = !1;
	}
	function et(e, t, n, r, i, a, o, s, c) {
		var l = Array.prototype.slice.call(arguments, 3);
		try {
			t.apply(n, l);
		} catch (e) {
			this.onError(e);
		}
	}
	var tt = !1, nt = null, rt = !1, it = null, at = { onError: function(e) {
		tt = !0, nt = e;
	} };
	function ot(e, t, n, r, i, a, o, s, c) {
		tt = !1, nt = null, et.apply(at, arguments);
	}
	function st(e, t, n, i, a, o, s, c, l) {
		if (ot.apply(this, arguments), tt) {
			if (tt) {
				var u = nt;
				tt = !1, nt = null;
			} else throw Error(r(198));
			rt || (rt = !0, it = u);
		}
	}
	function ct(e) {
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
	function lt(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function ut(e) {
		if (ct(e) !== e) throw Error(r(188));
	}
	function dt(e) {
		var t = e.alternate;
		if (!t) {
			if (t = ct(e), t === null) throw Error(r(188));
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
					if (o === n) return ut(a), e;
					if (o === i) return ut(a), t;
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
	function ft(e) {
		return e = dt(e), e === null ? null : pt(e);
	}
	function pt(e) {
		if (e.tag === 5 || e.tag === 6) return e;
		for (e = e.child; e !== null;) {
			var t = pt(e);
			if (t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	var mt = n.unstable_scheduleCallback, ht = n.unstable_cancelCallback, gt = n.unstable_shouldYield, _t = n.unstable_requestPaint, vt = n.unstable_now, yt = n.unstable_getCurrentPriorityLevel, bt = n.unstable_ImmediatePriority, xt = n.unstable_UserBlockingPriority, St = n.unstable_NormalPriority, Ct = n.unstable_LowPriority, wt = n.unstable_IdlePriority, Tt = null, Et = null;
	function Dt(e) {
		if (Et && typeof Et.onCommitFiberRoot == "function") try {
			Et.onCommitFiberRoot(Tt, e, void 0, (e.current.flags & 128) == 128);
		} catch {}
	}
	var Ot = Math.clz32 ? Math.clz32 : jt, kt = Math.log, At = Math.LN2;
	function jt(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (kt(e) / At | 0) | 0;
	}
	var Mt = 64, Nt = 4194304;
	function Pt(e) {
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
	function Ft(e, t) {
		var n = e.pendingLanes;
		if (n === 0) return 0;
		var r = 0, i = e.suspendedLanes, a = e.pingedLanes, o = n & 268435455;
		if (o !== 0) {
			var s = o & ~i;
			s === 0 ? (a &= o, a !== 0 && (r = Pt(a))) : r = Pt(s);
		} else o = n & ~i, o === 0 ? a !== 0 && (r = Pt(a)) : r = Pt(o);
		if (r === 0) return 0;
		if (t !== 0 && t !== r && (t & i) === 0 && (i = r & -r, a = t & -t, i >= a || i === 16 && a & 4194240)) return t;
		if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t;) n = 31 - Ot(t), i = 1 << n, r |= e[n], t &= ~i;
		return r;
	}
	function It(e, t) {
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
	function Lt(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes; 0 < a;) {
			var o = 31 - Ot(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = It(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
	}
	function Rt(e) {
		return e = e.pendingLanes & -1073741825, e === 0 ? e & 1073741824 ? 1073741824 : 0 : e;
	}
	function zt() {
		var e = Mt;
		return Mt <<= 1, !(Mt & 4194240) && (Mt = 64), e;
	}
	function Bt(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function Vt(e, t, n) {
		e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - Ot(t), e[t] = n;
	}
	function Ht(e, t) {
		var n = e.pendingLanes & ~t;
		e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
		var r = e.eventTimes;
		for (e = e.expirationTimes; 0 < n;) {
			var i = 31 - Ot(n), a = 1 << i;
			t[i] = 0, r[i] = -1, e[i] = -1, n &= ~a;
		}
	}
	function Ut(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - Ot(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	var Wt = 0;
	function Gt(e) {
		return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
	}
	var Kt, qt, I, L, Jt, Yt = !1, Xt = [], Zt = null, Qt = null, $t = null, en = /* @__PURE__ */ new Map(), tn = /* @__PURE__ */ new Map(), nn = [], rn = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
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
		}, t !== null && (t = Vi(t), t !== null && qt(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
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
	function cn(e) {
		var t = Bi(e.target);
		if (t !== null) {
			var n = ct(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = lt(n), t !== null) {
						e.blockedOn = t, Jt(e.priority, function() {
							I(n);
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
	function ln(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = bn(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				ze = r, n.target.dispatchEvent(r), ze = null;
			} else return t = Vi(n), t !== null && qt(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function un(e, t, n) {
		ln(e) && n.delete(t);
	}
	function dn() {
		Yt = !1, Zt !== null && ln(Zt) && (Zt = null), Qt !== null && ln(Qt) && (Qt = null), $t !== null && ln($t) && ($t = null), en.forEach(un), tn.forEach(un);
	}
	function fn(e, t) {
		e.blockedOn === t && (e.blockedOn = null, Yt || (Yt = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, dn)));
	}
	function pn(e) {
		function t(t) {
			return fn(t, e);
		}
		if (0 < Xt.length) {
			fn(Xt[0], e);
			for (var n = 1; n < Xt.length; n++) {
				var r = Xt[n];
				r.blockedOn === e && (r.blockedOn = null);
			}
		}
		for (Zt !== null && fn(Zt, e), Qt !== null && fn(Qt, e), $t !== null && fn($t, e), en.forEach(t), tn.forEach(t), n = 0; n < nn.length; n++) r = nn[n], r.blockedOn === e && (r.blockedOn = null);
		for (; 0 < nn.length && (n = nn[0], n.blockedOn === null);) cn(n), n.blockedOn === null && nn.shift();
	}
	var mn = x.ReactCurrentBatchConfig, hn = !0;
	function gn(e, t, n, r) {
		var i = Wt, a = mn.transition;
		mn.transition = null;
		try {
			Wt = 1, vn(e, t, n, r);
		} finally {
			Wt = i, mn.transition = a;
		}
	}
	function _n(e, t, n, r) {
		var i = Wt, a = mn.transition;
		mn.transition = null;
		try {
			Wt = 4, vn(e, t, n, r);
		} finally {
			Wt = i, mn.transition = a;
		}
	}
	function vn(e, t, n, r) {
		if (hn) {
			var i = bn(e, t, n, r);
			if (i === null) mi(e, t, r, yn, n), an(e, r);
			else if (sn(i, e, t, n, r)) r.stopPropagation();
			else if (an(e, r), t & 4 && -1 < rn.indexOf(e)) {
				for (; i !== null;) {
					var a = Vi(i);
					if (a !== null && Kt(a), a = bn(e, t, n, r), a === null && mi(e, t, r, yn, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else mi(e, t, r, null, n);
		}
	}
	var yn = null;
	function bn(e, t, n, r) {
		if (yn = null, e = Be(r), e = Bi(e), e !== null) {
			if (t = ct(e), t === null) e = null;
			else if (n = t.tag, n === 13) {
				if (e = lt(t), e !== null) return e;
				e = null;
			} else if (n === 3) {
				if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
				e = null;
			} else t !== e && (e = null);
		}
		return yn = e, null;
	}
	function xn(e) {
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
			case "message": switch (yt()) {
				case bt: return 1;
				case xt: return 4;
				case St:
				case Ct: return 16;
				case wt: return 536870912;
				default: return 16;
			}
			default: return 16;
		}
	}
	var Sn = null, Cn = null, wn = null;
	function Tn() {
		if (wn) return wn;
		var e, t = Cn, n = t.length, r, i = "value" in Sn ? Sn.value : Sn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return wn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function En(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function Dn() {
		return !0;
	}
	function On() {
		return !1;
	}
	function kn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? Dn : On, this.isPropagationStopped = On, this;
		}
		return N(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = Dn);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = Dn);
			},
			persist: function() {},
			isPersistent: Dn
		}), t;
	}
	var An = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, jn = kn(An), Mn = N({}, An, {
		view: 0,
		detail: 0
	}), Nn = kn(Mn), Pn, Fn, In, Ln = N({}, Mn, {
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
		getModifierState: Jn,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== In && (In && e.type === "mousemove" ? (Pn = e.screenX - In.screenX, Fn = e.screenY - In.screenY) : Fn = Pn = 0, In = e), Pn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Fn;
		}
	}), Rn = kn(Ln), zn = kn(N({}, Ln, { dataTransfer: 0 })), Bn = kn(N({}, Mn, { relatedTarget: 0 })), Vn = kn(N({}, An, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Hn = kn(N({}, An, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Un = kn(N({}, An, { data: 0 })), Wn = {
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
	}, Gn = {
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
	}, Kn = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function qn(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = Kn[e]) ? !!t[e] : !1;
	}
	function Jn() {
		return qn;
	}
	var Yn = kn(N({}, Mn, {
		key: function(e) {
			if (e.key) {
				var t = Wn[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = En(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Gn[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: Jn,
		charCode: function(e) {
			return e.type === "keypress" ? En(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? En(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), Xn = kn(N({}, Ln, {
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
	})), Zn = kn(N({}, Mn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: Jn
	})), Qn = kn(N({}, An, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), $n = kn(N({}, Ln, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), er = [
		9,
		13,
		27,
		32
	], tr = c && "CompositionEvent" in window, nr = null;
	c && "documentMode" in document && (nr = document.documentMode);
	var rr = c && "TextEvent" in window && !nr, ir = c && (!tr || nr && 8 < nr && 11 >= nr), ar = " ", or = !1;
	function sr(e, t) {
		switch (e) {
			case "keyup": return er.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function cr(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var lr = !1;
	function ur(e, t) {
		switch (e) {
			case "compositionend": return cr(t);
			case "keypress": return t.which === 32 ? (or = !0, ar) : null;
			case "textInput": return e = t.data, e === ar && or ? null : e;
			default: return null;
		}
	}
	function dr(e, t) {
		if (lr) return e === "compositionend" || !tr && sr(e, t) ? (e = Tn(), wn = Cn = Sn = null, lr = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return ir && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var fr = {
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
	function pr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!fr[e.type] : t === "textarea";
	}
	function mr(e, t, n, r) {
		Ge(r), t = B(t, "onChange"), 0 < t.length && (n = new jn("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var hr = null, gr = null;
	function _r(e) {
		ci(e, 0);
	}
	function vr(e) {
		if (pe(Hi(e))) return e;
	}
	function yr(e, t) {
		if (e === "change") return t;
	}
	var br = !1;
	if (c) {
		var xr;
		if (c) {
			var Sr = "oninput" in document;
			if (!Sr) {
				var Cr = document.createElement("div");
				Cr.setAttribute("oninput", "return;"), Sr = typeof Cr.oninput == "function";
			}
			xr = Sr;
		} else xr = !1;
		br = xr && (!document.documentMode || 9 < document.documentMode);
	}
	function wr() {
		hr && (hr.detachEvent("onpropertychange", Tr), gr = hr = null);
	}
	function Tr(e) {
		if (e.propertyName === "value" && vr(gr)) {
			var t = [];
			mr(t, gr, e, Be(e)), Xe(_r, t);
		}
	}
	function Er(e, t, n) {
		e === "focusin" ? (wr(), hr = t, gr = n, hr.attachEvent("onpropertychange", Tr)) : e === "focusout" && wr();
	}
	function Dr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return vr(gr);
	}
	function Or(e, t) {
		if (e === "click") return vr(t);
	}
	function kr(e, t) {
		if (e === "input" || e === "change") return vr(t);
	}
	function Ar(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var jr = typeof Object.is == "function" ? Object.is : Ar;
	function Mr(e, t) {
		if (jr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!l.call(t, i) || !jr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Nr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Pr(e, t) {
		var n = Nr(e);
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
			n = Nr(n);
		}
	}
	function Fr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Fr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Ir() {
		for (var e = window, t = me(); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = me(e.document);
		}
		return t;
	}
	function Lr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	function Rr(e) {
		var t = Ir(), n = e.focusedElem, r = e.selectionRange;
		if (t !== n && n && n.ownerDocument && Fr(n.ownerDocument.documentElement, n)) {
			if (r !== null && Lr(n)) {
				if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
				else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
					e = e.getSelection();
					var i = n.textContent.length, a = Math.min(r.start, i);
					r = r.end === void 0 ? a : Math.min(r.end, i), !e.extend && a > r && (i = r, r = a, a = i), i = Pr(n, a);
					var o = Pr(n, r);
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
	var zr = c && "documentMode" in document && 11 >= document.documentMode, R = null, Vr = null, Hr = null, Ur = !1;
	function Wr(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Ur || R == null || R !== me(r) || (r = R, "selectionStart" in r && Lr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Hr && Mr(Hr, r) || (Hr = r, r = B(Vr, "onSelect"), 0 < r.length && (t = new jn("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = R)));
	}
	function Gr(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var Kr = {
		animationend: Gr("Animation", "AnimationEnd"),
		animationiteration: Gr("Animation", "AnimationIteration"),
		animationstart: Gr("Animation", "AnimationStart"),
		transitionend: Gr("Transition", "TransitionEnd")
	}, qr = {}, Jr = {};
	c && (Jr = document.createElement("div").style, "AnimationEvent" in window || (delete Kr.animationend.animation, delete Kr.animationiteration.animation, delete Kr.animationstart.animation), "TransitionEvent" in window || delete Kr.transitionend.transition);
	function Yr(e) {
		if (qr[e]) return qr[e];
		if (!Kr[e]) return e;
		var t = Kr[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in Jr) return qr[e] = t[n];
		return e;
	}
	var Xr = Yr("animationend"), Zr = Yr("animationiteration"), Qr = Yr("animationstart"), $r = Yr("transitionend"), ei = /* @__PURE__ */ new Map(), ti = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	function ni(e, t) {
		ei.set(e, t), o(t, [e]);
	}
	for (var ri = 0; ri < ti.length; ri++) {
		var ii = ti[ri];
		ni(ii.toLowerCase(), "on" + (ii[0].toUpperCase() + ii.slice(1)));
	}
	ni(Xr, "onAnimationEnd"), ni(Zr, "onAnimationIteration"), ni(Qr, "onAnimationStart"), ni("dblclick", "onDoubleClick"), ni("focusin", "onFocus"), ni("focusout", "onBlur"), ni($r, "onTransitionEnd"), s("onMouseEnter", ["mouseout", "mouseover"]), s("onMouseLeave", ["mouseout", "mouseover"]), s("onPointerEnter", ["pointerout", "pointerover"]), s("onPointerLeave", ["pointerout", "pointerover"]), o("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), o("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), o("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), o("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), o("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), o("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var ai = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), oi = new Set("cancel close invalid load scroll toggle".split(" ").concat(ai));
	function si(e, t, n) {
		var r = e.type || "unknown-event";
		e.currentTarget = n, st(r, t, void 0, e), e.currentTarget = null;
	}
	function ci(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					si(i, s, l), a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					si(i, s, l), a = c;
				}
			}
		}
		if (rt) throw e = it, rt = !1, it = null, e;
	}
	function li(e, t) {
		var n = t[Li];
		n === void 0 && (n = t[Li] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (pi(t, e, 2, !1), n.add(r));
	}
	function ui(e, t, n) {
		var r = 0;
		t && (r |= 4), pi(n, e, r, t);
	}
	var di = "_reactListening" + Math.random().toString(36).slice(2);
	function fi(e) {
		if (!e[di]) {
			e[di] = !0, i.forEach(function(t) {
				t !== "selectionchange" && (oi.has(t) || ui(t, !1, e), ui(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[di] || (t[di] = !0, ui("selectionchange", !1, t));
		}
	}
	function pi(e, t, n, r) {
		switch (xn(t)) {
			case 1:
				var i = gn;
				break;
			case 4:
				i = _n;
				break;
			default: i = vn;
		}
		n = i.bind(null, t, n, e), i = void 0, !Qe || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function mi(e, t, n, r, i) {
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
		Xe(function() {
			var r = a, i = Be(n), o = [];
			a: {
				var s = ei.get(e);
				if (s !== void 0) {
					var c = jn, l = e;
					switch (e) {
						case "keypress": if (En(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = Yn;
							break;
						case "focusin":
							l = "focus", c = Bn;
							break;
						case "focusout":
							l = "blur", c = Bn;
							break;
						case "beforeblur":
						case "afterblur":
							c = Bn;
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
							c = Rn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = zn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = Zn;
							break;
						case Xr:
						case Zr:
						case Qr:
							c = Vn;
							break;
						case $r:
							c = Qn;
							break;
						case "scroll":
							c = Nn;
							break;
						case "wheel":
							c = $n;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = Hn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup": c = Xn;
					}
					var u = !!(t & 4), d = !u && e === "scroll", f = u ? s === null ? null : s + "Capture" : s;
					u = [];
					for (var p = r, m; p !== null;) {
						m = p;
						var h = m.stateNode;
						if (m.tag === 5 && h !== null && (m = h, f !== null && (h = Ze(p, f), h != null && u.push(z(p, h, m)))), d) break;
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
					if (s = e === "mouseover" || e === "pointerover", c = e === "mouseout" || e === "pointerout", s && n !== ze && (l = n.relatedTarget || n.fromElement) && (Bi(l) || l[Ii])) break a;
					if ((c || s) && (s = i.window === i ? i : (s = i.ownerDocument) ? s.defaultView || s.parentWindow : window, c ? (l = n.relatedTarget || n.toElement, c = r, l = l ? Bi(l) : null, l !== null && (d = ct(l), l !== d || l.tag !== 5 && l.tag !== 6) && (l = null)) : (c = null, l = r), c !== l)) {
						if (u = Rn, h = "onMouseLeave", f = "onMouseEnter", p = "mouse", (e === "pointerout" || e === "pointerover") && (u = Xn, h = "onPointerLeave", f = "onPointerEnter", p = "pointer"), d = c == null ? s : Hi(c), m = l == null ? s : Hi(l), s = new u(h, p + "leave", c, n, i), s.target = d, s.relatedTarget = m, h = null, Bi(i) === r && (u = new u(f, p + "enter", l, n, i), u.target = m, u.relatedTarget = d, h = u), d = h, c && l) b: {
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
					if (s = r ? Hi(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var g = yr;
					else if (pr(s)) {
						if (br) g = kr;
						else {
							g = Dr;
							var _ = Er;
						}
					} else (c = s.nodeName) && c.toLowerCase() === "input" && (s.type === "checkbox" || s.type === "radio") && (g = Or);
					if (g && (g = g(e, r))) {
						mr(o, g, n, i);
						break a;
					}
					_ && _(e, s, r), e === "focusout" && (_ = s._wrapperState) && _.controlled && s.type === "number" && be(s, "number", s.value);
				}
				switch (_ = r ? Hi(r) : window, e) {
					case "focusin":
						(pr(_) || _.contentEditable === "true") && (R = _, Vr = r, Hr = null);
						break;
					case "focusout":
						Hr = Vr = R = null;
						break;
					case "mousedown":
						Ur = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Ur = !1, Wr(o, n, i);
						break;
					case "selectionchange": if (zr) break;
					case "keydown":
					case "keyup": Wr(o, n, i);
				}
				var v;
				if (tr) b: {
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
				else lr ? sr(e, n) && (y = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (y = "onCompositionStart");
				y && (ir && n.locale !== "ko" && (lr || y !== "onCompositionStart" ? y === "onCompositionEnd" && lr && (v = Tn()) : (Sn = i, Cn = "value" in Sn ? Sn.value : Sn.textContent, lr = !0)), _ = B(r, y), 0 < _.length && (y = new Un(y, e, null, n, i), o.push({
					event: y,
					listeners: _
				}), v ? y.data = v : (v = cr(n), v !== null && (y.data = v)))), (v = rr ? ur(e, n) : dr(e, n)) && (r = B(r, "onBeforeInput"), 0 < r.length && (i = new Un("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: i,
					listeners: r
				}), i.data = v));
			}
			ci(o, t);
		});
	}
	function z(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function B(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			i.tag === 5 && a !== null && (i = a, a = Ze(e, n), a != null && r.unshift(z(e, a, i)), a = Ze(e, t), a != null && r.push(z(e, a, i))), e = e.return;
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
			s.tag === 5 && l !== null && (s = l, i ? (c = Ze(n, a), c != null && o.unshift(z(n, c, s))) : i || (c = Ze(n, a), c != null && o.push(z(n, c, s)))), n = n.return;
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
						e.removeChild(i), pn(t);
						return;
					}
					r--;
				} else n !== "$" && n !== "$?" && n !== "$!" || r++;
			}
			n = i;
		} while (n);
		pn(t);
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
	function $i(e, t) {
		var n = e.type.contextTypes;
		if (!n) return Yi;
		var r = e.stateNode;
		if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
		var i = {}, a;
		for (a in n) i[a] = t[a];
		return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = i), i;
	}
	function ea(e) {
		return e = e.childContextTypes, e != null;
	}
	function ta() {
		qi(Zi), qi(Xi);
	}
	function na(e, t, n) {
		if (Xi.current !== Yi) throw Error(r(168));
		Ji(Xi, t), Ji(Zi, n);
	}
	function ra(e, t, n) {
		var i = e.stateNode;
		if (t = t.childContextTypes, typeof i.getChildContext != "function") return n;
		for (var a in i = i.getChildContext(), i) if (!(a in t)) throw Error(r(108, ce(e) || "Unknown", a));
		return N({}, n, i);
	}
	function ia(e) {
		return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Yi, Qi = Xi.current, Ji(Xi, e), Ji(Zi, Zi.current), !0;
	}
	function aa(e, t, n) {
		var i = e.stateNode;
		if (!i) throw Error(r(169));
		n ? (e = ra(e, t, Qi), i.__reactInternalMemoizedMergedChildContext = e, qi(Zi), qi(Xi), Ji(Xi, e)) : qi(Zi), Ji(Zi, n);
	}
	var oa = null, sa = !1, ca = !1;
	function la(e) {
		oa === null ? oa = [e] : oa.push(e);
	}
	function ua(e) {
		sa = !0, la(e);
	}
	function da() {
		if (!ca && oa !== null) {
			ca = !0;
			var e = 0, t = Wt;
			try {
				var n = oa;
				for (Wt = 1; e < n.length; e++) {
					var r = n[e];
					do
						r = r(!0);
					while (r !== null);
				}
				oa = null, sa = !1;
			} catch (t) {
				throw oa !== null && (oa = oa.slice(e + 1)), mt(bt, da), t;
			} finally {
				Wt = t, ca = !1;
			}
		}
		return null;
	}
	var fa = [], pa = 0, ma = null, ha = 0, ga = [], _a = 0, va = null, ya = 1, ba = "";
	function xa(e, t) {
		fa[pa++] = ha, fa[pa++] = ma, ma = e, ha = t;
	}
	function Sa(e, t, n) {
		ga[_a++] = ya, ga[_a++] = ba, ga[_a++] = va, va = e;
		var r = ya;
		e = ba;
		var i = 32 - Ot(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - Ot(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, ya = 1 << 32 - Ot(t) + i | n << i | r, ba = a + e;
		} else ya = 1 << a | n << i | r, ba = e;
	}
	function Ca(e) {
		e.return !== null && (xa(e, 1), Sa(e, 1, 0));
	}
	function wa(e) {
		for (; e === ma;) ma = fa[--pa], fa[pa] = null, ha = fa[--pa], fa[pa] = null;
		for (; e === va;) va = ga[--_a], ga[_a] = null, ba = ga[--_a], ga[_a] = null, ya = ga[--_a], ga[_a] = null;
	}
	var Ta = null, Ea = null, Da = !1, Oa = null;
	function ka(e, t) {
		var n = Xl(5, null, null, 0);
		n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
	}
	function Aa(e, t) {
		switch (e.tag) {
			case 5:
				var n = e.type;
				return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null && (e.stateNode = t, Ta = e, Ea = ji(t.firstChild), !0);
			case 6: return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null && (e.stateNode = t, Ta = e, Ea = null, !0);
			case 13: return t = t.nodeType === 8 ? t : null, t !== null && (n = va === null ? null : {
				id: ya,
				overflow: ba
			}, e.memoizedState = {
				dehydrated: t,
				treeContext: n,
				retryLane: 1073741824
			}, n = Xl(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Ta = e, Ea = null, !0);
			default: return !1;
		}
	}
	function ja(e) {
		return !!(e.mode & 1) && !(e.flags & 128);
	}
	function Ma(e) {
		if (Da) {
			var t = Ea;
			if (t) {
				var n = t;
				if (!Aa(e, t)) {
					if (ja(e)) throw Error(r(418));
					t = ji(n.nextSibling);
					var i = Ta;
					t && Aa(e, t) ? ka(i, n) : (e.flags = e.flags & -4097 | 2, Da = !1, Ta = e);
				}
			} else {
				if (ja(e)) throw Error(r(418));
				e.flags = e.flags & -4097 | 2, Da = !1, Ta = e;
			}
		}
	}
	function Na(e) {
		for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13;) e = e.return;
		Ta = e;
	}
	function Pa(e) {
		if (e !== Ta) return !1;
		if (!Da) return Na(e), Da = !0, !1;
		var t;
		if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !wi(e.type, e.memoizedProps)), t && (t = Ea)) {
			if (ja(e)) throw Fa(), Error(r(418));
			for (; t;) ka(e, t), t = ji(t.nextSibling);
		}
		if (Na(e), e.tag === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(r(317));
			a: {
				for (e = e.nextSibling, t = 0; e;) {
					if (e.nodeType === 8) {
						var n = e.data;
						if (n === "/$") {
							if (t === 0) {
								Ea = ji(e.nextSibling);
								break a;
							}
							t--;
						} else n !== "$" && n !== "$!" && n !== "$?" || t++;
					}
					e = e.nextSibling;
				}
				Ea = null;
			}
		} else Ea = Ta ? ji(e.stateNode.nextSibling) : null;
		return !0;
	}
	function Fa() {
		for (var e = Ea; e;) e = ji(e.nextSibling);
	}
	function Ia() {
		Ea = Ta = null, Da = !1;
	}
	function La(e) {
		Oa === null ? Oa = [e] : Oa.push(e);
	}
	var Ra = x.ReactCurrentBatchConfig;
	function za(e, t, n) {
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
	function Ba(e, t) {
		throw e = Object.prototype.toString.call(t), Error(r(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
	}
	function Va(e) {
		var t = e._init;
		return t(e._payload);
	}
	function Ha(e) {
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
			return i === w ? d(e, t, n.props.children, r, n.key) : t !== null && (t.elementType === i || typeof i == "object" && i && i.$$typeof === M && Va(i) === t.type) ? (r = a(t, n.props), r.ref = za(e, t, n), r.return = e, r) : (r = eu(n.type, n.key, n.props, null, e.mode, r), r.ref = za(e, t, n), r.return = e, r);
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
					case S: return n = eu(t.type, t.key, t.props, null, e.mode, n), n.ref = za(e, null, t), n.return = e, n;
					case C: return t = iu(t, e.mode, n), t.return = e, t;
					case M:
						var r = t._init;
						return f(e, r(t._payload), n);
				}
				if (xe(t) || re(t)) return t = tu(t, e.mode, n, null), t.return = e, t;
				Ba(e, t);
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
					case M: return i = n._init, p(e, t, i(n._payload), r);
				}
				if (xe(n) || re(n)) return i === null ? d(e, t, n, r, null) : null;
				Ba(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case S: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case C: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case M:
						var a = r._init;
						return m(e, t, n, a(r._payload), i);
				}
				if (xe(r) || re(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				Ba(t, r);
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
			if (h === s.length) return n(r, d), Da && xa(r, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(r, s[h], c), d !== null && (a = o(d, a, h), u === null ? l = d : u.sibling = d, u = d);
				return Da && xa(r, h), l;
			}
			for (d = i(r, d); h < s.length; h++) g = m(d, r, h, s[h], c), g !== null && (e && g.alternate !== null && d.delete(g.key === null ? h : g.key), a = o(g, a, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(r, e);
			}), Da && xa(r, h), l;
		}
		function g(a, s, c, l) {
			var u = re(c);
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
			if (v.done) return n(a, h), Da && xa(a, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(a, v.value, l), v !== null && (s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
				return Da && xa(a, g), u;
			}
			for (h = i(a, h); !v.done; g++, v = c.next()) v = m(h, a, g, v.value, l), v !== null && (e && v.alternate !== null && h.delete(v.key === null ? g : v.key), s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(a, e);
			}), Da && xa(a, g), u;
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
									} else if (l.elementType === c || typeof c == "object" && c && c.$$typeof === M && Va(c) === l.type) {
										n(e, l.sibling), r = a(l, i.props), r.ref = za(e, l, i), r.return = e, e = r;
										break a;
									}
									n(e, l);
									break;
								}
								t(e, l), l = l.sibling;
							}
							i.type === w ? (r = tu(i.props.children, e.mode, o, i.key), r.return = e, e = r) : (o = eu(i.type, i.key, i.props, null, e.mode, o), o.ref = za(e, r, i), o.return = e, e = o);
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
					case M: return l = i._init, _(e, r, l(i._payload), o);
				}
				if (xe(i)) return h(e, r, i, o);
				if (re(i)) return g(e, r, i, o);
				Ba(e, i);
			}
			return typeof i == "string" && i !== "" || typeof i == "number" ? (i = "" + i, r !== null && r.tag === 6 ? (n(e, r.sibling), r = a(r, i), r.return = e, e = r) : (n(e, r), r = ru(i, e.mode, o), r.return = e, e = r), s(e)) : n(e, r);
		}
		return _;
	}
	var Ua = Ha(!0), Wa = Ha(!1), Ga = Ki(null), Ka = null, qa = null, Ja = null;
	function Ya() {
		Ja = qa = Ka = null;
	}
	function Xa(e) {
		var t = Ga.current;
		qi(Ga), e._currentValue = t;
	}
	function Za(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Qa(e, t) {
		Ka = e, Ja = qa = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (Is = !0), e.firstContext = null);
	}
	function $a(e) {
		var t = e._currentValue;
		if (Ja !== e) {
			if (e = {
				context: e,
				memoizedValue: t,
				next: null
			}, qa === null) {
				if (Ka === null) throw Error(r(308));
				qa = e, Ka.dependencies = {
					lanes: 0,
					firstContext: e
				};
			} else qa = qa.next = e;
		}
		return t;
	}
	var eo = null;
	function to(e) {
		eo === null ? eo = [e] : eo.push(e);
	}
	function no(e, t, n, r) {
		var i = t.interleaved;
		return i === null ? (n.next = n, to(t)) : (n.next = i.next, i.next = n), t.interleaved = n, ro(e, r);
	}
	function ro(e, t) {
		e.lanes |= t;
		var n = e.alternate;
		for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null;) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
		return n.tag === 3 ? n.stateNode : null;
	}
	var io = !1;
	function ao(e) {
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
	function oo(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			effects: e.effects
		});
	}
	function V(e, t) {
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
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, ro(e, n);
		}
		return i = r.interleaved, i === null ? (t.next = t, to(r)) : (t.next = i.next, i.next = t), r.interleaved = t, ro(e, n);
	}
	function co(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194240)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, Ut(e, n);
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
		io = !1;
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
								d = N({}, d, f);
								break a;
							case 2: io = !0;
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
				t = (t = t.documentElement) ? t.namespaceURI : Oe(null, "");
				break;
			default: e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Oe(t, e);
		}
		qi(mo), Ji(mo, t);
	}
	function H() {
		qi(mo), qi(ho), qi(go);
	}
	function yo(e) {
		_o(go.current);
		var t = _o(mo.current), n = Oe(t, e.type);
		t !== n && (Ji(ho, e), Ji(mo, n));
	}
	function bo(e) {
		ho.current === e && (qi(mo), qi(ho));
	}
	var xo = Ki(0);
	function So(e) {
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
	var Co = [];
	function U() {
		for (var e = 0; e < Co.length; e++) Co[e]._workInProgressVersionPrimary = null;
		Co.length = 0;
	}
	var W = x.ReactCurrentDispatcher, wo = x.ReactCurrentBatchConfig, To = 0, Eo = null, Do = null, Oo = null, ko = !1, Ao = !1, G = 0, jo = 0;
	function Mo() {
		throw Error(r(321));
	}
	function No(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!jr(e[n], t[n])) return !1;
		return !0;
	}
	function Po(e, t, n, i, a, o) {
		if (To = o, Eo = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, W.current = e === null || e.memoizedState === null ? gs : _s, e = n(i, a), Ao) {
			o = 0;
			do {
				if (Ao = !1, G = 0, 25 <= o) throw Error(r(301));
				o += 1, Oo = Do = null, t.updateQueue = null, W.current = vs, e = n(i, a);
			} while (Ao);
		}
		if (W.current = hs, t = Do !== null && Do.next !== null, To = 0, Oo = Do = Eo = null, ko = !1, t) throw Error(r(300));
		return e;
	}
	function Fo() {
		var e = G !== 0;
		return G = 0, e;
	}
	function Io() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return Oo === null ? Eo.memoizedState = Oo = e : Oo = Oo.next = e, Oo;
	}
	function Lo() {
		if (Do === null) {
			var e = Eo.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = Do.next;
		var t = Oo === null ? Eo.memoizedState : Oo.next;
		if (t !== null) Oo = t, Do = e;
		else {
			if (e === null) throw Error(r(310));
			Do = e, e = {
				memoizedState: Do.memoizedState,
				baseState: Do.baseState,
				baseQueue: Do.baseQueue,
				queue: Do.queue,
				next: null
			}, Oo === null ? Eo.memoizedState = Oo = e : Oo = Oo.next = e;
		}
		return Oo;
	}
	function Ro(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function zo(e) {
		var t = Lo(), n = t.queue;
		if (n === null) throw Error(r(311));
		n.lastRenderedReducer = e;
		var i = Do, a = i.baseQueue, o = n.pending;
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
				if ((To & d) === d) l !== null && (l = l.next = {
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
					l === null ? (c = l = f, s = i) : l = l.next = f, Eo.lanes |= d, Qc |= d;
				}
				u = u.next;
			} while (u !== null && u !== o);
			l === null ? s = i : l.next = c, jr(i, t.memoizedState) || (Is = !0), t.memoizedState = i, t.baseState = s, t.baseQueue = l, n.lastRenderedState = i;
		}
		if (e = n.interleaved, e !== null) {
			a = e;
			do
				o = a.lane, Eo.lanes |= o, Qc |= o, a = a.next;
			while (a !== e);
		} else a === null && (n.lanes = 0);
		return [t.memoizedState, n.dispatch];
	}
	function Bo(e) {
		var t = Lo(), n = t.queue;
		if (n === null) throw Error(r(311));
		n.lastRenderedReducer = e;
		var i = n.dispatch, a = n.pending, o = t.memoizedState;
		if (a !== null) {
			n.pending = null;
			var s = a = a.next;
			do
				o = e(o, s.action), s = s.next;
			while (s !== a);
			jr(o, t.memoizedState) || (Is = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
		}
		return [o, i];
	}
	function Vo() {}
	function Ho(e, t) {
		var n = Eo, i = Lo(), a = t(), o = !jr(i.memoizedState, a);
		if (o && (i.memoizedState = a, Is = !0), i = i.queue, $o(Go.bind(null, n, i, e), [e]), i.getSnapshot !== t || o || Oo !== null && Oo.memoizedState.tag & 1) {
			if (n.flags |= 2048, Yo(9, Wo.bind(null, n, i, a, t), void 0, null), Gc === null) throw Error(r(349));
			To & 30 || Uo(n, t, a);
		}
		return a;
	}
	function Uo(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = Eo.updateQueue, t === null ? (t = {
			lastEffect: null,
			stores: null
		}, Eo.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function Wo(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Ko(t) && qo(e);
	}
	function Go(e, t, n) {
		return n(function() {
			Ko(t) && qo(e);
		});
	}
	function Ko(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !jr(e, n);
		} catch {
			return !0;
		}
	}
	function qo(e) {
		var t = ro(e, 1);
		t !== null && vl(t, e, 1, -1);
	}
	function Jo(e) {
		var t = Io();
		return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = {
			pending: null,
			interleaved: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Ro,
			lastRenderedState: e
		}, t.queue = e, e = e.dispatch = ds.bind(null, Eo, e), [t.memoizedState, e];
	}
	function Yo(e, t, n, r) {
		return e = {
			tag: e,
			create: t,
			destroy: n,
			deps: r,
			next: null
		}, t = Eo.updateQueue, t === null ? (t = {
			lastEffect: null,
			stores: null
		}, Eo.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
	}
	function Xo() {
		return Lo().memoizedState;
	}
	function Zo(e, t, n, r) {
		var i = Io();
		Eo.flags |= e, i.memoizedState = Yo(1 | t, n, void 0, r === void 0 ? null : r);
	}
	function Qo(e, t, n, r) {
		var i = Lo();
		r = r === void 0 ? null : r;
		var a = void 0;
		if (Do !== null) {
			var o = Do.memoizedState;
			if (a = o.destroy, r !== null && No(r, o.deps)) {
				i.memoizedState = Yo(t, n, a, r);
				return;
			}
		}
		Eo.flags |= e, i.memoizedState = Yo(1 | t, n, a, r);
	}
	function K(e, t) {
		return Zo(8390656, 8, e, t);
	}
	function $o(e, t) {
		return Qo(2048, 8, e, t);
	}
	function es(e, t) {
		return Qo(4, 2, e, t);
	}
	function ts(e, t) {
		return Qo(4, 4, e, t);
	}
	function ns(e, t) {
		if (typeof t == "function") return e = e(), t(e), function() {
			t(null);
		};
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function rs(e, t, n) {
		return n = n == null ? null : n.concat([e]), Qo(4, 4, ns.bind(null, t, e), n);
	}
	function is() {}
	function as(e, t) {
		var n = Lo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return r !== null && t !== null && No(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function os(e, t) {
		var n = Lo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return r !== null && t !== null && No(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
	}
	function ss(e, t, n) {
		return To & 21 ? (jr(n, t) || (n = zt(), Eo.lanes |= n, Qc |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Is = !0), e.memoizedState = n);
	}
	function cs(e, t) {
		var n = Wt;
		Wt = n !== 0 && 4 > n ? n : 4, e(!0);
		var r = wo.transition;
		wo.transition = {};
		try {
			e(!1), t();
		} finally {
			Wt = n, wo.transition = r;
		}
	}
	function ls() {
		return Lo().memoizedState;
	}
	function us(e, t, n) {
		var r = _l(e);
		if (n = {
			lane: r,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, fs(e)) ps(t, n);
		else if (n = no(e, t, n, r), n !== null) {
			var i = gl();
			vl(n, e, r, i), ms(n, t, r);
		}
	}
	function ds(e, t, n) {
		var r = _l(e), i = {
			lane: r,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (fs(e)) ps(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, jr(s, o)) {
					var c = t.interleaved;
					c === null ? (i.next = i, to(t)) : (i.next = c.next, c.next = i), t.interleaved = i;
					return;
				}
			} catch {}
			n = no(e, t, i, r), n !== null && (i = gl(), vl(n, e, r, i), ms(n, t, r));
		}
	}
	function fs(e) {
		var t = e.alternate;
		return e === Eo || t !== null && t === Eo;
	}
	function ps(e, t) {
		Ao = ko = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function ms(e, t, n) {
		if (n & 4194240) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, Ut(e, n);
		}
	}
	var hs = {
		readContext: $a,
		useCallback: Mo,
		useContext: Mo,
		useEffect: Mo,
		useImperativeHandle: Mo,
		useInsertionEffect: Mo,
		useLayoutEffect: Mo,
		useMemo: Mo,
		useReducer: Mo,
		useRef: Mo,
		useState: Mo,
		useDebugValue: Mo,
		useDeferredValue: Mo,
		useTransition: Mo,
		useMutableSource: Mo,
		useSyncExternalStore: Mo,
		useId: Mo,
		unstable_isNewReconciler: !1
	}, gs = {
		readContext: $a,
		useCallback: function(e, t) {
			return Io().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: $a,
		useEffect: K,
		useImperativeHandle: function(e, t, n) {
			return n = n == null ? null : n.concat([e]), Zo(4194308, 4, ns.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return Zo(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			return Zo(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = Io();
			return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
		},
		useReducer: function(e, t, n) {
			var r = Io();
			return t = n === void 0 ? t : n(t), r.memoizedState = r.baseState = t, e = {
				pending: null,
				interleaved: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: t
			}, r.queue = e, e = e.dispatch = us.bind(null, Eo, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = Io();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: Jo,
		useDebugValue: is,
		useDeferredValue: function(e) {
			return Io().memoizedState = e;
		},
		useTransition: function() {
			var e = Jo(!1), t = e[0];
			return e = cs.bind(null, e[1]), Io().memoizedState = e, [t, e];
		},
		useMutableSource: function() {},
		useSyncExternalStore: function(e, t, n) {
			var i = Eo, a = Io();
			if (Da) {
				if (n === void 0) throw Error(r(407));
				n = n();
			} else {
				if (n = t(), Gc === null) throw Error(r(349));
				To & 30 || Uo(i, t, n);
			}
			a.memoizedState = n;
			var o = {
				value: n,
				getSnapshot: t
			};
			return a.queue = o, K(Go.bind(null, i, o, e), [e]), i.flags |= 2048, Yo(9, Wo.bind(null, i, o, n, t), void 0, null), n;
		},
		useId: function() {
			var e = Io(), t = Gc.identifierPrefix;
			if (Da) {
				var n = ba, r = ya;
				n = (r & ~(1 << 32 - Ot(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = G++, 0 < n && (t += "H" + n.toString(32)), t += ":";
			} else n = jo++, t = ":" + t + "r" + n.toString(32) + ":";
			return e.memoizedState = t;
		},
		unstable_isNewReconciler: !1
	}, _s = {
		readContext: $a,
		useCallback: as,
		useContext: $a,
		useEffect: $o,
		useImperativeHandle: rs,
		useInsertionEffect: es,
		useLayoutEffect: ts,
		useMemo: os,
		useReducer: zo,
		useRef: Xo,
		useState: function() {
			return zo(Ro);
		},
		useDebugValue: is,
		useDeferredValue: function(e) {
			return ss(Lo(), Do.memoizedState, e);
		},
		useTransition: function() {
			return [zo(Ro)[0], Lo().memoizedState];
		},
		useMutableSource: Vo,
		useSyncExternalStore: Ho,
		useId: ls,
		unstable_isNewReconciler: !1
	}, vs = {
		readContext: $a,
		useCallback: as,
		useContext: $a,
		useEffect: $o,
		useImperativeHandle: rs,
		useInsertionEffect: es,
		useLayoutEffect: ts,
		useMemo: os,
		useReducer: Bo,
		useRef: Xo,
		useState: function() {
			return Bo(Ro);
		},
		useDebugValue: is,
		useDeferredValue: function(e) {
			var t = Lo();
			return Do === null ? t.memoizedState = e : ss(t, Do.memoizedState, e);
		},
		useTransition: function() {
			return [Bo(Ro)[0], Lo().memoizedState];
		},
		useMutableSource: Vo,
		useSyncExternalStore: Ho,
		useId: ls,
		unstable_isNewReconciler: !1
	};
	function ys(e, t) {
		if (e && e.defaultProps) {
			for (var n in t = N({}, t), e = e.defaultProps, e) t[n] === void 0 && (t[n] = e[n]);
			return t;
		}
		return t;
	}
	function bs(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : N({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var xs = {
		isMounted: function(e) {
			return (e = e._reactInternals) ? ct(e) === e : !1;
		},
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = gl(), i = _l(e), a = V(r, i);
			a.payload = t, n != null && (a.callback = n), t = so(e, a, i), t !== null && (vl(t, e, i, r), co(t, e, i));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = gl(), i = _l(e), a = V(r, i);
			a.tag = 1, a.payload = t, n != null && (a.callback = n), t = so(e, a, i), t !== null && (vl(t, e, i, r), co(t, e, i));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = gl(), r = _l(e), i = V(n, r);
			i.tag = 2, t != null && (i.callback = t), t = so(e, i, r), t !== null && (vl(t, e, r, n), co(t, e, r));
		}
	};
	function Ss(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Mr(n, r) || !Mr(i, a) : !0;
	}
	function Cs(e, t, n) {
		var r = !1, i = Yi, a = t.contextType;
		return typeof a == "object" && a ? a = $a(a) : (i = ea(t) ? Qi : Xi.current, r = t.contextTypes, a = (r = r != null) ? $i(e, i) : Yi), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = xs, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = a), t;
	}
	function ws(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && xs.enqueueReplaceState(t, t.state, null);
	}
	function Ts(e, t, n, r) {
		var i = e.stateNode;
		i.props = n, i.state = e.memoizedState, i.refs = {}, ao(e);
		var a = t.contextType;
		typeof a == "object" && a ? i.context = $a(a) : (a = ea(t) ? Qi : Xi.current, i.context = $i(e, a)), i.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (bs(e, t, a, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && xs.enqueueReplaceState(i, i.state, null), uo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
	}
	function Es(e, t) {
		try {
			var n = "", r = t;
			do
				n += oe(r), r = r.return;
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
	function Ds(e, t, n) {
		return {
			value: e,
			source: null,
			stack: n == null ? null : n,
			digest: t == null ? null : t
		};
	}
	function Os(e, t) {
		try {
			console.error(t.value);
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	var ks = typeof WeakMap == "function" ? WeakMap : Map;
	function As(e, t, n) {
		n = V(-1, n), n.tag = 3, n.payload = { element: null };
		var r = t.value;
		return n.callback = function() {
			ol || (ol = !0, sl = r), Os(e, t);
		}, n;
	}
	function js(e, t, n) {
		n = V(-1, n), n.tag = 3;
		var r = e.type.getDerivedStateFromError;
		if (typeof r == "function") {
			var i = t.value;
			n.payload = function() {
				return r(i);
			}, n.callback = function() {
				Os(e, t);
			};
		}
		var a = e.stateNode;
		return a !== null && typeof a.componentDidCatch == "function" && (n.callback = function() {
			Os(e, t), typeof r != "function" && (cl === null ? cl = /* @__PURE__ */ new Set([this]) : cl.add(this));
			var n = t.stack;
			this.componentDidCatch(t.value, { componentStack: n === null ? "" : n });
		}), n;
	}
	function Ms(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new ks();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (i.add(n), e = Ul.bind(null, e, t, n), t.then(e, e));
	}
	function Ns(e) {
		do {
			var t;
			if ((t = e.tag === 13) && (t = e.memoizedState, t = t === null || t.dehydrated !== null), t) return e;
			e = e.return;
		} while (e !== null);
		return null;
	}
	function Ps(e, t, n, r, i) {
		return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = V(-1, 1), t.tag = 2, so(n, t, 1))), n.lanes |= 1), e);
	}
	var Fs = x.ReactCurrentOwner, Is = !1;
	function q(e, t, n, r) {
		t.child = e === null ? Wa(t, null, n, r) : Ua(t, e.child, n, r);
	}
	function Ls(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		return Qa(t, i), r = Po(e, t, n, r, a, i), n = Fo(), e !== null && !Is ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, rc(e, t, i)) : (Da && n && Ca(t), t.flags |= 1, q(e, t, r, i), t.child);
	}
	function Rs(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !Zl(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, zs(e, t, a, r, i)) : (e = eu(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, (e.lanes & i) === 0) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Mr : n, n(o, r) && e.ref === t.ref) return rc(e, t, i);
		}
		return t.flags |= 1, e = $l(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function zs(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Mr(a, r) && e.ref === t.ref) {
				if (Is = !1, t.pendingProps = r = a, (e.lanes & i) !== 0) e.flags & 131072 && (Is = !0);
				else return t.lanes = e.lanes, rc(e, t, i);
			}
		}
		return Hs(e, t, n, r, i);
	}
	function Bs(e, t, n) {
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
		return q(e, t, i, n), t.child;
	}
	function Vs(e, t) {
		var n = t.ref;
		(e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
	}
	function Hs(e, t, n, r, i) {
		var a = ea(n) ? Qi : Xi.current;
		return a = $i(t, a), Qa(t, i), n = Po(e, t, n, r, a, i), r = Fo(), e !== null && !Is ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, rc(e, t, i)) : (Da && r && Ca(t), t.flags |= 1, q(e, t, n, i), t.child);
	}
	function Us(e, t, n, r, i) {
		if (ea(n)) {
			var a = !0;
			ia(t);
		} else a = !1;
		if (Qa(t, i), t.stateNode === null) nc(e, t), Cs(t, n, r), Ts(t, n, r, i), r = !0;
		else if (e === null) {
			var o = t.stateNode, s = t.memoizedProps;
			o.props = s;
			var c = o.context, l = n.contextType;
			typeof l == "object" && l ? l = $a(l) : (l = ea(n) ? Qi : Xi.current, l = $i(t, l));
			var u = n.getDerivedStateFromProps, d = typeof u == "function" || typeof o.getSnapshotBeforeUpdate == "function";
			d || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== r || c !== l) && ws(t, o, r, l), io = !1;
			var f = t.memoizedState;
			o.state = f, uo(t, r, o, i), c = t.memoizedState, s !== r || f !== c || Zi.current || io ? (typeof u == "function" && (bs(t, n, u, r), c = t.memoizedState), (s = io || Ss(t, n, s, r, f, c, l)) ? (d || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = c), o.props = r, o.state = c, o.context = l, r = s) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			o = t.stateNode, oo(e, t), s = t.memoizedProps, l = t.type === t.elementType ? s : ys(t.type, s), o.props = l, d = t.pendingProps, f = o.context, c = n.contextType, typeof c == "object" && c ? c = $a(c) : (c = ea(n) ? Qi : Xi.current, c = $i(t, c));
			var p = n.getDerivedStateFromProps;
			(u = typeof p == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== d || f !== c) && ws(t, o, r, c), io = !1, f = t.memoizedState, o.state = f, uo(t, r, o, i);
			var m = t.memoizedState;
			s !== d || f !== m || Zi.current || io ? (typeof p == "function" && (bs(t, n, p, r), m = t.memoizedState), (l = io || Ss(t, n, l, r, f, m, c) || !1) ? (u || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, m, c), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, m, c)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = m), o.props = r, o.state = m, o.context = c, r = l) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return Ws(e, t, n, r, a, i);
	}
	function Ws(e, t, n, r, i, a) {
		Vs(e, t);
		var o = !!(t.flags & 128);
		if (!r && !o) return i && aa(t, n, !1), rc(e, t, a);
		r = t.stateNode, Fs.current = t;
		var s = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
		return t.flags |= 1, e !== null && o ? (t.child = Ua(t, e.child, null, a), t.child = Ua(t, null, s, a)) : q(e, t, s, a), t.memoizedState = r.state, i && aa(t, n, !0), t.child;
	}
	function Gs(e) {
		var t = e.stateNode;
		t.pendingContext ? na(e, t.pendingContext, t.pendingContext !== t.context) : t.context && na(e, t.context, !1), vo(e, t.containerInfo);
	}
	function Ks(e, t, n, r, i) {
		return Ia(), La(i), t.flags |= 256, q(e, t, n, r), t.child;
	}
	var qs = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0
	};
	function Js(e) {
		return {
			baseLanes: e,
			cachePool: null,
			transitions: null
		};
	}
	function Ys(e, t, n) {
		var r = t.pendingProps, i = xo.current, a = !1, o = !!(t.flags & 128), s;
		if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : !!(i & 2)), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), Ji(xo, i & 1), e === null) return Ma(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.lanes = t.mode & 1 ? e.data === "$!" ? 8 : 1073741824 : 1, null) : (o = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, o = {
			mode: "hidden",
			children: o
		}, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = o) : a = nu(o, r, 0, null), e = tu(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = Js(n), t.memoizedState = qs, e) : Xs(t, o));
		if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null)) return Qs(e, t, o, r, s, i, n);
		if (a) {
			a = r.fallback, o = t.mode, i = e.child, s = i.sibling;
			var c = {
				mode: "hidden",
				children: r.children
			};
			return !(o & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = c, t.deletions = null) : (r = $l(i, c), r.subtreeFlags = i.subtreeFlags & 14680064), s === null ? (a = tu(a, o, n, null), a.flags |= 2) : a = $l(s, a), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, o = e.child.memoizedState, o = o === null ? Js(n) : {
				baseLanes: o.baseLanes | n,
				cachePool: null,
				transitions: o.transitions
			}, a.memoizedState = o, a.childLanes = e.childLanes & ~n, t.memoizedState = qs, r;
		}
		return a = e.child, e = a.sibling, r = $l(a, {
			mode: "visible",
			children: r.children
		}), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
	}
	function Xs(e, t) {
		return t = nu({
			mode: "visible",
			children: t
		}, e.mode, 0, null), t.return = e, e.child = t;
	}
	function Zs(e, t, n, r) {
		return r !== null && La(r), Ua(t, e.child, null, n), e = Xs(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function Qs(e, t, n, i, a, o, s) {
		if (n) return t.flags & 256 ? (t.flags &= -257, i = Ds(Error(r(422))), Zs(e, t, s, i)) : t.memoizedState === null ? (o = i.fallback, a = t.mode, i = nu({
			mode: "visible",
			children: i.children
		}, a, 0, null), o = tu(o, a, s, null), o.flags |= 2, i.return = t, o.return = t, i.sibling = o, t.child = i, t.mode & 1 && Ua(t, e.child, null, s), t.child.memoizedState = Js(s), t.memoizedState = qs, o) : (t.child = e.child, t.flags |= 128, null);
		if (!(t.mode & 1)) return Zs(e, t, s, null);
		if (a.data === "$!") {
			if (i = a.nextSibling && a.nextSibling.dataset, i) var c = i.dgst;
			return i = c, o = Error(r(419)), i = Ds(o, i, void 0), Zs(e, t, s, i);
		}
		if (c = (s & e.childLanes) !== 0, Is || c) {
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
				a = (a & (i.suspendedLanes | s)) === 0 ? a : 0, a !== 0 && a !== o.retryLane && (o.retryLane = a, ro(e, a), vl(i, e, a, -1));
			}
			return Ml(), i = Ds(Error(r(421))), Zs(e, t, s, i);
		}
		return a.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Gl.bind(null, e), a._reactRetry = t, null) : (e = o.treeContext, Ea = ji(a.nextSibling), Ta = t, Da = !0, Oa = null, e !== null && (ga[_a++] = ya, ga[_a++] = ba, ga[_a++] = va, ya = e.id, ba = e.overflow, va = t), t = Xs(t, i.children), t.flags |= 4096, t);
	}
	function $s(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), Za(e.return, t, n);
	}
	function ec(e, t, n, r, i) {
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
	function tc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		if (q(e, t, r.children, n), r = xo.current, r & 2) r = r & 1 | 2, t.flags |= 128;
		else {
			if (e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
				if (e.tag === 13) e.memoizedState !== null && $s(e, n, t);
				else if (e.tag === 19) $s(e, n, t);
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
		if (Ji(xo, r), !(t.mode & 1)) t.memoizedState = null;
		else switch (i) {
			case "forwards":
				for (n = t.child, i = null; n !== null;) e = n.alternate, e !== null && So(e) === null && (i = n), n = n.sibling;
				n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), ec(t, !1, i, n, a);
				break;
			case "backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && So(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				ec(t, !0, n, null, a);
				break;
			case "together":
				ec(t, !1, null, null, void 0);
				break;
			default: t.memoizedState = null;
		}
		return t.child;
	}
	function nc(e, t) {
		!(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
	}
	function rc(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), Qc |= t.lanes, (n & t.childLanes) === 0) return null;
		if (e !== null && t.child !== e.child) throw Error(r(153));
		if (t.child !== null) {
			for (e = t.child, n = $l(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = $l(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function ic(e, t, n) {
		switch (t.tag) {
			case 3:
				Gs(t), Ia();
				break;
			case 5:
				yo(t);
				break;
			case 1:
				ea(t.type) && ia(t);
				break;
			case 4:
				vo(t, t.stateNode.containerInfo);
				break;
			case 10:
				var r = t.type._context, i = t.memoizedProps.value;
				Ji(Ga, r._currentValue), r._currentValue = i;
				break;
			case 13:
				if (r = t.memoizedState, r !== null) return r.dehydrated === null ? (n & t.child.childLanes) === 0 ? (Ji(xo, xo.current & 1), e = rc(e, t, n), e === null ? null : e.sibling) : Ys(e, t, n) : (Ji(xo, xo.current & 1), t.flags |= 128, null);
				Ji(xo, xo.current & 1);
				break;
			case 19:
				if (r = (n & t.childLanes) !== 0, e.flags & 128) {
					if (r) return tc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), Ji(xo, xo.current), r) break;
				return null;
			case 22:
			case 23: return t.lanes = 0, Bs(e, t, n);
		}
		return rc(e, t, n);
	}
	var ac = function(e, t) {
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
	}, oc = function(e, t, n, r) {
		var i = e.memoizedProps;
		if (i !== r) {
			e = t.stateNode, _o(mo.current);
			var o = null;
			switch (n) {
				case "input":
					i = he(e, i), r = he(e, r), o = [];
					break;
				case "select":
					i = N({}, i, { value: void 0 }), r = N({}, r, { value: void 0 }), o = [];
					break;
				case "textarea":
					i = Ce(e, i), r = Ce(e, r), o = [];
					break;
				default: typeof i.onClick != "function" && typeof r.onClick == "function" && (e.onclick = xi);
			}
			Le(n, r);
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
					} else u === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, c = c ? c.__html : void 0, l != null && c !== l && (o = o || []).push(u, l)) : u === "children" ? typeof l != "string" && typeof l != "number" || (o = o || []).push(u, "" + l) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (a.hasOwnProperty(u) ? (l != null && u === "onScroll" && li("scroll", e), o || c === l || (o = [])) : (o = o || []).push(u, l));
				}
			}
			n && (o = o || []).push("style", n);
			var u = o;
			(t.updateQueue = u) && (t.flags |= 4);
		}
	}, sc = function(e, t, n, r) {
		n !== r && (t.flags |= 4);
	};
	function cc(e, t) {
		if (!Da) switch (e.tailMode) {
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
	function lc(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 14680064, r |= i.flags & 14680064, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function uc(e, t, n) {
		var i = t.pendingProps;
		switch (wa(t), t.tag) {
			case 2:
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return lc(t), null;
			case 1: return ea(t.type) && ta(), lc(t), null;
			case 3: return i = t.stateNode, H(), qi(Zi), qi(Xi), U(), i.pendingContext && (i.context = i.pendingContext, i.pendingContext = null), (e === null || e.child === null) && (Pa(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Oa !== null && (Sl(Oa), Oa = null))), lc(t), null;
			case 5:
				bo(t);
				var o = _o(go.current);
				if (n = t.type, e !== null && t.stateNode != null) oc(e, t, n, i, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
				else {
					if (!i) {
						if (t.stateNode === null) throw Error(r(166));
						return lc(t), null;
					}
					if (e = _o(mo.current), Pa(t)) {
						i = t.stateNode, n = t.type;
						var s = t.memoizedProps;
						switch (i[Pi] = t, i[Fi] = s, e = !!(t.mode & 1), n) {
							case "dialog":
								li("cancel", i), li("close", i);
								break;
							case "iframe":
							case "object":
							case "embed":
								li("load", i);
								break;
							case "video":
							case "audio":
								for (o = 0; o < ai.length; o++) li(ai[o], i);
								break;
							case "source":
								li("error", i);
								break;
							case "img":
							case "image":
							case "link":
								li("error", i), li("load", i);
								break;
							case "details":
								li("toggle", i);
								break;
							case "input":
								ge(i, s), li("invalid", i);
								break;
							case "select":
								i._wrapperState = { wasMultiple: !!s.multiple }, li("invalid", i);
								break;
							case "textarea": we(i, s), li("invalid", i);
						}
						for (var c in Le(n, s), o = null, s) if (s.hasOwnProperty(c)) {
							var l = s[c];
							c === "children" ? typeof l == "string" ? i.textContent !== l && (!0 !== s.suppressHydrationWarning && bi(i.textContent, l, e), o = ["children", l]) : typeof l == "number" && i.textContent !== "" + l && (!0 !== s.suppressHydrationWarning && bi(i.textContent, l, e), o = ["children", "" + l]) : a.hasOwnProperty(c) && l != null && c === "onScroll" && li("scroll", i);
						}
						switch (n) {
							case "input":
								fe(i), ye(i, s, !0);
								break;
							case "textarea":
								fe(i), Ee(i);
								break;
							case "select":
							case "option": break;
							default: typeof s.onClick == "function" && (i.onclick = xi);
						}
						i = o, t.updateQueue = i, i !== null && (t.flags |= 4);
					} else {
						c = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = De(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = c.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof i.is == "string" ? e = c.createElement(n, { is: i.is }) : (e = c.createElement(n), n === "select" && (c = e, i.multiple ? c.multiple = !0 : i.size && (c.size = i.size))) : e = c.createElementNS(e, n), e[Pi] = t, e[Fi] = i, ac(e, t, !1, !1), t.stateNode = e;
						a: {
							switch (c = Re(n, i), n) {
								case "dialog":
									li("cancel", e), li("close", e), o = i;
									break;
								case "iframe":
								case "object":
								case "embed":
									li("load", e), o = i;
									break;
								case "video":
								case "audio":
									for (o = 0; o < ai.length; o++) li(ai[o], e);
									o = i;
									break;
								case "source":
									li("error", e), o = i;
									break;
								case "img":
								case "image":
								case "link":
									li("error", e), li("load", e), o = i;
									break;
								case "details":
									li("toggle", e), o = i;
									break;
								case "input":
									ge(e, i), o = he(e, i), li("invalid", e);
									break;
								case "option":
									o = i;
									break;
								case "select":
									e._wrapperState = { wasMultiple: !!i.multiple }, o = N({}, i, { value: void 0 }), li("invalid", e);
									break;
								case "textarea":
									we(e, i), o = Ce(e, i), li("invalid", e);
									break;
								default: o = i;
							}
							for (s in Le(n, o), l = o, l) if (l.hasOwnProperty(s)) {
								var u = l[s];
								s === "style" ? Fe(e, u) : s === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, u != null && Ae(e, u)) : s === "children" ? typeof u == "string" ? (n !== "textarea" || u !== "") && je(e, u) : typeof u == "number" && je(e, "" + u) : s !== "suppressContentEditableWarning" && s !== "suppressHydrationWarning" && s !== "autoFocus" && (a.hasOwnProperty(s) ? u != null && s === "onScroll" && li("scroll", e) : u != null && b(e, s, u, c));
							}
							switch (n) {
								case "input":
									fe(e), ye(e, i, !1);
									break;
								case "textarea":
									fe(e), Ee(e);
									break;
								case "option":
									i.value != null && e.setAttribute("value", "" + le(i.value));
									break;
								case "select":
									e.multiple = !!i.multiple, s = i.value, s == null ? i.defaultValue != null && Se(e, !!i.multiple, i.defaultValue, !0) : Se(e, !!i.multiple, s, !1);
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
				return lc(t), null;
			case 6:
				if (e && t.stateNode != null) sc(e, t, e.memoizedProps, i);
				else {
					if (typeof i != "string" && t.stateNode === null) throw Error(r(166));
					if (n = _o(go.current), _o(mo.current), Pa(t)) {
						if (i = t.stateNode, n = t.memoizedProps, i[Pi] = t, (s = i.nodeValue !== n) && (e = Ta, e !== null)) switch (e.tag) {
							case 3:
								bi(i.nodeValue, n, !!(e.mode & 1));
								break;
							case 5: !0 !== e.memoizedProps.suppressHydrationWarning && bi(i.nodeValue, n, !!(e.mode & 1));
						}
						s && (t.flags |= 4);
					} else i = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(i), i[Pi] = t, t.stateNode = i;
				}
				return lc(t), null;
			case 13:
				if (qi(xo), i = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (Da && Ea !== null && t.mode & 1 && !(t.flags & 128)) Fa(), Ia(), t.flags |= 98560, s = !1;
					else if (s = Pa(t), i !== null && i.dehydrated !== null) {
						if (e === null) {
							if (!s) throw Error(r(318));
							if (s = t.memoizedState, s = s === null ? null : s.dehydrated, !s) throw Error(r(317));
							s[Pi] = t;
						} else Ia(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						lc(t), s = !1;
					} else Oa !== null && (Sl(Oa), Oa = null), s = !0;
					if (!s) return t.flags & 65536 ? t : null;
				}
				return t.flags & 128 ? (t.lanes = n, t) : (i = i !== null, i !== (e !== null && e.memoizedState !== null) && i && (t.child.flags |= 8192, t.mode & 1 && (e === null || xo.current & 1 ? Xc === 0 && (Xc = 3) : Ml())), t.updateQueue !== null && (t.flags |= 4), lc(t), null);
			case 4: return H(), e === null && fi(t.stateNode.containerInfo), lc(t), null;
			case 10: return Xa(t.type._context), lc(t), null;
			case 17: return ea(t.type) && ta(), lc(t), null;
			case 19:
				if (qi(xo), s = t.memoizedState, s === null) return lc(t), null;
				if (i = !!(t.flags & 128), c = s.rendering, c === null) {
					if (i) cc(s, !1);
					else {
						if (Xc !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (c = So(e), c !== null) {
								for (t.flags |= 128, cc(s, !1), i = c.updateQueue, i !== null && (t.updateQueue = i, t.flags |= 4), t.subtreeFlags = 0, i = n, n = t.child; n !== null;) s = n, e = i, s.flags &= 14680066, c = s.alternate, c === null ? (s.childLanes = 0, s.lanes = e, s.child = null, s.subtreeFlags = 0, s.memoizedProps = null, s.memoizedState = null, s.updateQueue = null, s.dependencies = null, s.stateNode = null) : (s.childLanes = c.childLanes, s.lanes = c.lanes, s.child = c.child, s.subtreeFlags = 0, s.deletions = null, s.memoizedProps = c.memoizedProps, s.memoizedState = c.memoizedState, s.updateQueue = c.updateQueue, s.type = c.type, e = c.dependencies, s.dependencies = e === null ? null : {
									lanes: e.lanes,
									firstContext: e.firstContext
								}), n = n.sibling;
								return Ji(xo, xo.current & 1 | 2), t.child;
							}
							e = e.sibling;
						}
						s.tail !== null && vt() > il && (t.flags |= 128, i = !0, cc(s, !1), t.lanes = 4194304);
					}
				} else {
					if (!i) {
						if (e = So(c), e !== null) {
							if (t.flags |= 128, i = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), cc(s, !0), s.tail === null && s.tailMode === "hidden" && !c.alternate && !Da) return lc(t), null;
						} else 2 * vt() - s.renderingStartTime > il && n !== 1073741824 && (t.flags |= 128, i = !0, cc(s, !1), t.lanes = 4194304);
					}
					s.isBackwards ? (c.sibling = t.child, t.child = c) : (n = s.last, n === null ? t.child = c : n.sibling = c, s.last = c);
				}
				return s.tail === null ? (lc(t), null) : (t = s.tail, s.rendering = t, s.tail = t.sibling, s.renderingStartTime = vt(), t.sibling = null, n = xo.current, Ji(xo, i ? n & 1 | 2 : n & 1), t);
			case 22:
			case 23: return Ol(), i = t.memoizedState !== null, e !== null && e.memoizedState !== null !== i && (t.flags |= 8192), i && t.mode & 1 ? Jc & 1073741824 && (lc(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : lc(t), null;
			case 24: return null;
			case 25: return null;
		}
		throw Error(r(156, t.tag));
	}
	function dc(e, t) {
		switch (wa(t), t.tag) {
			case 1: return ea(t.type) && ta(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return H(), qi(Zi), qi(Xi), U(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 5: return bo(t), null;
			case 13:
				if (qi(xo), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(r(340));
					Ia();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return qi(xo), null;
			case 4: return H(), null;
			case 10: return Xa(t.type._context), null;
			case 22:
			case 23: return Ol(), null;
			case 24: return null;
			default: return null;
		}
	}
	var fc = !1, pc = !1, mc = typeof WeakSet == "function" ? WeakSet : Set, J = null;
	function hc(e, t) {
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
	function gc(e, t, n) {
		try {
			n();
		} catch (n) {
			Hl(e, t, n);
		}
	}
	var _c = !1;
	function vc(e, t) {
		if (Si = hn, e = Ir(), Lr(e)) {
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
		}, hn = !1, J = t; J !== null;) if (t = J, e = t.child, t.subtreeFlags & 1028 && e !== null) e.return = t, J = e;
		else for (; J !== null;) {
			t = J;
			try {
				var h = t.alternate;
				if (t.flags & 1024) switch (t.tag) {
					case 0:
					case 11:
					case 15: break;
					case 1:
						if (h !== null) {
							var g = h.memoizedProps, _ = h.memoizedState, v = t.stateNode;
							v.__reactInternalSnapshotBeforeUpdate = v.getSnapshotBeforeUpdate(t.elementType === t.type ? g : ys(t.type, g), _);
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
				e.return = t.return, J = e;
				break;
			}
			J = t.return;
		}
		return h = _c, _c = !1, h;
	}
	function yc(e, t, n) {
		var r = t.updateQueue;
		if (r = r === null ? null : r.lastEffect, r !== null) {
			var i = r = r.next;
			do {
				if ((i.tag & e) === e) {
					var a = i.destroy;
					i.destroy = void 0, a !== void 0 && gc(t, n, a);
				}
				i = i.next;
			} while (i !== r);
		}
	}
	function bc(e, t) {
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
	function xc(e) {
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
	function Sc(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, Sc(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Pi], delete t[Fi], delete t[Li], delete t[Ri], delete t[zi])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	function Cc(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 4;
	}
	function wc(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Cc(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Tc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = xi));
		else if (r !== 4 && (e = e.child, e !== null)) for (Tc(e, t, n), e = e.sibling; e !== null;) Tc(e, t, n), e = e.sibling;
	}
	function Ec(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (r !== 4 && (e = e.child, e !== null)) for (Ec(e, t, n), e = e.sibling; e !== null;) Ec(e, t, n), e = e.sibling;
	}
	var Dc = null, Oc = !1;
	function kc(e, t, n) {
		for (n = n.child; n !== null;) Ac(e, t, n), n = n.sibling;
	}
	function Ac(e, t, n) {
		if (Et && typeof Et.onCommitFiberUnmount == "function") try {
			Et.onCommitFiberUnmount(Tt, n);
		} catch {}
		switch (n.tag) {
			case 5: pc || hc(n, t);
			case 6:
				var r = Dc, i = Oc;
				Dc = null, kc(e, t, n), Dc = r, Oc = i, Dc !== null && (Oc ? (e = Dc, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Dc.removeChild(n.stateNode));
				break;
			case 18:
				Dc !== null && (Oc ? (e = Dc, n = n.stateNode, e.nodeType === 8 ? Ai(e.parentNode, n) : e.nodeType === 1 && Ai(e, n), pn(e)) : Ai(Dc, n.stateNode));
				break;
			case 4:
				r = Dc, i = Oc, Dc = n.stateNode.containerInfo, Oc = !0, kc(e, t, n), Dc = r, Oc = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				if (!pc && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
					i = r = r.next;
					do {
						var a = i, o = a.destroy;
						a = a.tag, o !== void 0 && (a & 2 || a & 4) && gc(n, t, o), i = i.next;
					} while (i !== r);
				}
				kc(e, t, n);
				break;
			case 1:
				if (!pc && (hc(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
					r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
				} catch (e) {
					Hl(n, t, e);
				}
				kc(e, t, n);
				break;
			case 21:
				kc(e, t, n);
				break;
			case 22:
				n.mode & 1 ? (pc = (r = pc) || n.memoizedState !== null, kc(e, t, n), pc = r) : kc(e, t, n);
				break;
			default: kc(e, t, n);
		}
	}
	function jc(e) {
		var t = e.updateQueue;
		if (t !== null) {
			e.updateQueue = null;
			var n = e.stateNode;
			n === null && (n = e.stateNode = new mc()), t.forEach(function(t) {
				var r = Kl.bind(null, e, t);
				n.has(t) || (n.add(t), t.then(r, r));
			});
		}
	}
	function Mc(e, t) {
		var n = t.deletions;
		if (n !== null) for (var i = 0; i < n.length; i++) {
			var a = n[i];
			try {
				var o = e, s = t, c = s;
				a: for (; c !== null;) {
					switch (c.tag) {
						case 5:
							Dc = c.stateNode, Oc = !1;
							break a;
						case 3:
							Dc = c.stateNode.containerInfo, Oc = !0;
							break a;
						case 4:
							Dc = c.stateNode.containerInfo, Oc = !0;
							break a;
					}
					c = c.return;
				}
				if (Dc === null) throw Error(r(160));
				Ac(o, s, a), Dc = null, Oc = !1;
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
				if (Mc(t, e), Pc(e), i & 4) {
					try {
						yc(3, e, e.return), bc(3, e);
					} catch (t) {
						Hl(e, e.return, t);
					}
					try {
						yc(5, e, e.return);
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				break;
			case 1:
				Mc(t, e), Pc(e), i & 512 && n !== null && hc(n, n.return);
				break;
			case 5:
				if (Mc(t, e), Pc(e), i & 512 && n !== null && hc(n, n.return), e.flags & 32) {
					var a = e.stateNode;
					try {
						je(a, "");
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				if (i & 4 && (a = e.stateNode, a != null)) {
					var o = e.memoizedProps, s = n === null ? o : n.memoizedProps, c = e.type, l = e.updateQueue;
					if (e.updateQueue = null, l !== null) try {
						c === "input" && o.type === "radio" && o.name != null && _e(a, o), Re(c, s);
						var u = Re(c, o);
						for (s = 0; s < l.length; s += 2) {
							var d = l[s], f = l[s + 1];
							d === "style" ? Fe(a, f) : d === "dangerouslySetInnerHTML" ? Ae(a, f) : d === "children" ? je(a, f) : b(a, d, f, u);
						}
						switch (c) {
							case "input":
								ve(a, o);
								break;
							case "textarea":
								Te(a, o);
								break;
							case "select":
								var p = a._wrapperState.wasMultiple;
								a._wrapperState.wasMultiple = !!o.multiple;
								var m = o.value;
								m == null ? p !== !!o.multiple && (o.defaultValue == null ? Se(a, !!o.multiple, o.multiple ? [] : "", !1) : Se(a, !!o.multiple, o.defaultValue, !0)) : Se(a, !!o.multiple, m, !1);
						}
						a[Fi] = o;
					} catch (t) {
						Hl(e, e.return, t);
					}
				}
				break;
			case 6:
				if (Mc(t, e), Pc(e), i & 4) {
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
				if (Mc(t, e), Pc(e), i & 4 && n !== null && n.memoizedState.isDehydrated) try {
					pn(t.containerInfo);
				} catch (t) {
					Hl(e, e.return, t);
				}
				break;
			case 4:
				Mc(t, e), Pc(e);
				break;
			case 13:
				Mc(t, e), Pc(e), a = e.child, a.flags & 8192 && (o = a.memoizedState !== null, a.stateNode.isHidden = o, !o || a.alternate !== null && a.alternate.memoizedState !== null || (rl = vt())), i & 4 && jc(e);
				break;
			case 22:
				if (d = n !== null && n.memoizedState !== null, e.mode & 1 ? (pc = (u = pc) || d, Mc(t, e), pc = u) : Mc(t, e), Pc(e), i & 8192) {
					if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !d && e.mode & 1) for (J = e, d = e.child; d !== null;) {
						for (f = J = d; J !== null;) {
							switch (p = J, m = p.child, p.tag) {
								case 0:
								case 11:
								case 14:
								case 15:
									yc(4, p, p.return);
									break;
								case 1:
									hc(p, p.return);
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
									hc(p, p.return);
									break;
								case 22: if (p.memoizedState !== null) {
									Rc(f);
									continue;
								}
							}
							m === null ? Rc(f) : (m.return = p, J = m);
						}
						d = d.sibling;
					}
					a: for (d = null, f = e;;) {
						if (f.tag === 5) {
							if (d === null) {
								d = f;
								try {
									a = f.stateNode, u ? (o = a.style, typeof o.setProperty == "function" ? o.setProperty("display", "none", "important") : o.display = "none") : (c = f.stateNode, l = f.memoizedProps.style, s = l != null && l.hasOwnProperty("display") ? l.display : null, c.style.display = Pe("display", s));
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
				Mc(t, e), Pc(e), i & 4 && jc(e);
				break;
			case 21: break;
			default: Mc(t, e), Pc(e);
		}
	}
	function Pc(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				a: {
					for (var n = e.return; n !== null;) {
						if (Cc(n)) {
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
						i.flags & 32 && (je(a, ""), i.flags &= -33), Ec(e, wc(e), a);
						break;
					case 3:
					case 4:
						var o = i.stateNode.containerInfo;
						Tc(e, wc(e), o);
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
		J = e, Ic(e, t, n);
	}
	function Ic(e, t, n) {
		for (var r = !!(e.mode & 1); J !== null;) {
			var i = J, a = i.child;
			if (i.tag === 22 && r) {
				var o = i.memoizedState !== null || fc;
				if (!o) {
					var s = i.alternate, c = s !== null && s.memoizedState !== null || pc;
					s = fc;
					var l = pc;
					if (fc = o, (pc = c) && !l) for (J = i; J !== null;) o = J, c = o.child, o.tag === 22 && o.memoizedState !== null || c === null ? zc(i) : (c.return = o, J = c);
					for (; a !== null;) J = a, Ic(a, t, n), a = a.sibling;
					J = i, fc = s, pc = l;
				}
				Lc(e, t, n);
			} else i.subtreeFlags & 8772 && a !== null ? (a.return = i, J = a) : Lc(e, t, n);
		}
	}
	function Lc(e) {
		for (; J !== null;) {
			var t = J;
			if (t.flags & 8772) {
				var n = t.alternate;
				try {
					if (t.flags & 8772) switch (t.tag) {
						case 0:
						case 11:
						case 15:
							pc || bc(5, t);
							break;
						case 1:
							var i = t.stateNode;
							if (t.flags & 4 && !pc) {
								if (n === null) i.componentDidMount();
								else {
									var a = t.elementType === t.type ? n.memoizedProps : ys(t.type, n.memoizedProps);
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
										f !== null && pn(f);
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
					pc || t.flags & 512 && xc(t);
				} catch (e) {
					Hl(t, t.return, e);
				}
			}
			if (t === e) {
				J = null;
				break;
			}
			if (n = t.sibling, n !== null) {
				n.return = t.return, J = n;
				break;
			}
			J = t.return;
		}
	}
	function Rc(e) {
		for (; J !== null;) {
			var t = J;
			if (t === e) {
				J = null;
				break;
			}
			var n = t.sibling;
			if (n !== null) {
				n.return = t.return, J = n;
				break;
			}
			J = t.return;
		}
	}
	function zc(e) {
		for (; J !== null;) {
			var t = J;
			try {
				switch (t.tag) {
					case 0:
					case 11:
					case 15:
						var n = t.return;
						try {
							bc(4, t);
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
							xc(t);
						} catch (e) {
							Hl(t, a, e);
						}
						break;
					case 5:
						var o = t.return;
						try {
							xc(t);
						} catch (e) {
							Hl(t, o, e);
						}
				}
			} catch (e) {
				Hl(t, t.return, e);
			}
			if (t === e) {
				J = null;
				break;
			}
			var s = t.sibling;
			if (s !== null) {
				s.return = t.return, J = s;
				break;
			}
			J = t.return;
		}
	}
	var Bc = Math.ceil, Vc = x.ReactCurrentDispatcher, Hc = x.ReactCurrentOwner, Uc = x.ReactCurrentBatchConfig, Wc = 0, Gc = null, Kc = null, qc = 0, Jc = 0, Yc = Ki(0), Xc = 0, Zc = null, Qc = 0, $c = 0, el = 0, tl = null, nl = null, rl = 0, il = Infinity, al = null, ol = !1, sl = null, cl = null, ll = !1, ul = null, dl = 0, fl = 0, pl = null, ml = -1, hl = 0;
	function gl() {
		return Wc & 6 ? vt() : ml === -1 ? ml = vt() : ml;
	}
	function _l(e) {
		return e.mode & 1 ? Wc & 2 && qc !== 0 ? qc & -qc : Ra.transition === null ? (e = Wt, e === 0 ? (e = window.event, e = e === void 0 ? 16 : xn(e.type), e) : e) : (hl === 0 && (hl = zt()), hl) : 1;
	}
	function vl(e, t, n, i) {
		if (50 < fl) throw fl = 0, pl = null, Error(r(185));
		Vt(e, n, i), (!(Wc & 2) || e !== Gc) && (e === Gc && (!(Wc & 2) && ($c |= n), Xc === 4 && wl(e, qc)), yl(e, i), n === 1 && Wc === 0 && !(t.mode & 1) && (il = vt() + 500, sa && da()));
	}
	function yl(e, t) {
		var n = e.callbackNode;
		Lt(e, t);
		var r = Ft(e, e === Gc ? qc : 0);
		if (r === 0) n !== null && ht(n), e.callbackNode = null, e.callbackPriority = 0;
		else if (t = r & -r, e.callbackPriority !== t) {
			if (n != null && ht(n), t === 1) e.tag === 0 ? ua(Tl.bind(null, e)) : la(Tl.bind(null, e)), Oi(function() {
				!(Wc & 6) && da();
			}), n = null;
			else {
				switch (Gt(r)) {
					case 1:
						n = bt;
						break;
					case 4:
						n = xt;
						break;
					case 16:
						n = St;
						break;
					case 536870912:
						n = wt;
						break;
					default: n = St;
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
		var i = Ft(e, e === Gc ? qc : 0);
		if (i === 0) return null;
		if (i & 30 || (i & e.expiredLanes) !== 0 || t) t = Nl(e, i);
		else {
			t = i;
			var a = Wc;
			Wc |= 2;
			var o = jl();
			(Gc !== e || qc !== t) && (al = null, il = vt() + 500, kl(e, t));
			do
				try {
					Fl();
					break;
				} catch (t) {
					Al(e, t);
				}
			while (1);
			Ya(), Vc.current = o, Wc = a, Kc === null ? (Gc = null, qc = 0, t = Xc) : t = 0;
		}
		if (t !== 0) {
			if (t === 2 && (a = Rt(e), a !== 0 && (i = a, t = xl(e, a))), t === 1) throw n = Zc, kl(e, 0), wl(e, i), yl(e, vt()), n;
			if (t === 6) wl(e, i);
			else {
				if (a = e.current.alternate, !(i & 30) && !Cl(a) && (t = Nl(e, i), t === 2 && (o = Rt(e), o !== 0 && (i = o, t = xl(e, o))), t === 1)) throw n = Zc, kl(e, 0), wl(e, i), yl(e, vt()), n;
				switch (e.finishedWork = a, e.finishedLanes = i, t) {
					case 0:
					case 1: throw Error(r(345));
					case 2:
						Rl(e, nl, al);
						break;
					case 3:
						if (wl(e, i), (i & 130023424) === i && (t = rl + 500 - vt(), 10 < t)) {
							if (Ft(e, 0) !== 0) break;
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
							var s = 31 - Ot(i);
							o = 1 << s, s = t[s], s > a && (a = s), i &= ~o;
						}
						if (i = a, i = vt() - i, i = (120 > i ? 120 : 480 > i ? 480 : 1080 > i ? 1080 : 1920 > i ? 1920 : 3e3 > i ? 3e3 : 4320 > i ? 4320 : 1960 * Bc(i / 1960)) - i, 10 < i) {
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
		return yl(e, vt()), e.callbackNode === n ? bl.bind(null, e) : null;
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
						if (!jr(a(), i)) return !1;
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
			var n = 31 - Ot(t), r = 1 << n;
			e[n] = -1, t &= ~r;
		}
	}
	function Tl(e) {
		if (Wc & 6) throw Error(r(327));
		Bl();
		var t = Ft(e, 0);
		if (!(t & 1)) return yl(e, vt()), null;
		var n = Nl(e, t);
		if (e.tag !== 0 && n === 2) {
			var i = Rt(e);
			i !== 0 && (t = i, n = xl(e, i));
		}
		if (n === 1) throw n = Zc, kl(e, 0), wl(e, t), yl(e, vt()), n;
		if (n === 6) throw Error(r(345));
		return e.finishedWork = e.current.alternate, e.finishedLanes = t, Rl(e, nl, al), yl(e, vt()), null;
	}
	function El(e, t) {
		var n = Wc;
		Wc |= 1;
		try {
			return e(t);
		} finally {
			Wc = n, Wc === 0 && (il = vt() + 500, sa && da());
		}
	}
	function Dl(e) {
		ul !== null && ul.tag === 0 && !(Wc & 6) && Bl();
		var t = Wc;
		Wc |= 1;
		var n = Uc.transition, r = Wt;
		try {
			if (Uc.transition = null, Wt = 1, e) return e();
		} finally {
			Wt = r, Uc.transition = n, Wc = t, !(Wc & 6) && da();
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
			switch (wa(r), r.tag) {
				case 1:
					r = r.type.childContextTypes, r != null && ta();
					break;
				case 3:
					H(), qi(Zi), qi(Xi), U();
					break;
				case 5:
					bo(r);
					break;
				case 4:
					H();
					break;
				case 13:
					qi(xo);
					break;
				case 19:
					qi(xo);
					break;
				case 10:
					Xa(r.type._context);
					break;
				case 22:
				case 23: Ol();
			}
			n = n.return;
		}
		if (Gc = e, Kc = e = $l(e.current, null), qc = Jc = t, Xc = 0, Zc = null, el = $c = Qc = 0, nl = tl = null, eo !== null) {
			for (t = 0; t < eo.length; t++) if (n = eo[t], r = n.interleaved, r !== null) {
				n.interleaved = null;
				var i = r.next, a = n.pending;
				if (a !== null) {
					var o = a.next;
					a.next = i, r.next = o;
				}
				n.pending = r;
			}
			eo = null;
		}
		return e;
	}
	function Al(e, t) {
		do {
			var n = Kc;
			try {
				if (Ya(), W.current = hs, ko) {
					for (var i = Eo.memoizedState; i !== null;) {
						var a = i.queue;
						a !== null && (a.pending = null), i = i.next;
					}
					ko = !1;
				}
				if (To = 0, Oo = Do = Eo = null, Ao = !1, G = 0, Hc.current = null, n === null || n.return === null) {
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
						var m = Ns(s);
						if (m !== null) {
							m.flags &= -257, Ps(m, s, c, o, t), m.mode & 1 && Ms(o, u, t), t = m, l = u;
							var h = t.updateQueue;
							if (h === null) {
								var g = /* @__PURE__ */ new Set();
								g.add(l), t.updateQueue = g;
							} else h.add(l);
							break a;
						}
						if (!(t & 1)) {
							Ms(o, u, t), Ml();
							break a;
						}
						l = Error(r(426));
					} else if (Da && c.mode & 1) {
						var _ = Ns(s);
						if (_ !== null) {
							!(_.flags & 65536) && (_.flags |= 256), Ps(_, s, c, o, t), La(Es(l, c));
							break a;
						}
					}
					o = l = Es(l, c), Xc !== 4 && (Xc = 2), tl === null ? tl = [o] : tl.push(o), o = s;
					do {
						switch (o.tag) {
							case 3:
								o.flags |= 65536, t &= -t, o.lanes |= t;
								var v = As(o, l, t);
								lo(o, v);
								break a;
							case 1:
								c = l;
								var y = o.type, b = o.stateNode;
								if (!(o.flags & 128) && (typeof y.getDerivedStateFromError == "function" || b !== null && typeof b.componentDidCatch == "function" && (cl === null || !cl.has(b)))) {
									o.flags |= 65536, t &= -t, o.lanes |= t;
									var x = js(o, c, t);
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
		return Vc.current = hs, e === null ? hs : e;
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
		if (Ya(), Wc = n, Vc.current = i, Kc !== null) throw Error(r(261));
		return Gc = null, qc = 0, Xc;
	}
	function Pl() {
		for (; Kc !== null;) Il(Kc);
	}
	function Fl() {
		for (; Kc !== null && !gt();) Il(Kc);
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
				if (n = dc(n, t), n !== null) {
					n.flags &= 32767, Kc = n;
					return;
				}
				if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
				else {
					Xc = 6, Kc = null;
					return;
				}
			} else if (n = uc(n, t, Jc), n !== null) {
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
		var r = Wt, i = Uc.transition;
		try {
			Uc.transition = null, Wt = 1, zl(e, t, n, r);
		} finally {
			Uc.transition = i, Wt = r;
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
		if (Ht(e, o), e === Gc && (Kc = Gc = null, qc = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || ll || (ll = !0, Jl(St, function() {
			return Bl(), null;
		})), o = !!(n.flags & 15990), n.subtreeFlags & 15990 || o) {
			o = Uc.transition, Uc.transition = null;
			var s = Wt;
			Wt = 1;
			var c = Wc;
			Wc |= 4, Hc.current = null, vc(e, n), Nc(n, e), Rr(Ci), hn = !!Si, Ci = Si = null, e.current = n, Fc(n, e, a), _t(), Wc = c, Wt = s, Uc.transition = o;
		} else e.current = n;
		if (ll && (ll = !1, ul = e, dl = a), o = e.pendingLanes, o === 0 && (cl = null), Dt(n.stateNode, i), yl(e, vt()), t !== null) for (i = e.onRecoverableError, n = 0; n < t.length; n++) a = t[n], i(a.value, {
			componentStack: a.stack,
			digest: a.digest
		});
		if (ol) throw ol = !1, e = sl, sl = null, e;
		return dl & 1 && e.tag !== 0 && Bl(), o = e.pendingLanes, o & 1 ? e === pl ? fl++ : (fl = 0, pl = e) : fl = 0, da(), null;
	}
	function Bl() {
		if (ul !== null) {
			var e = Gt(dl), t = Uc.transition, n = Wt;
			try {
				if (Uc.transition = null, Wt = 16 > e ? 16 : e, ul === null) var i = !1;
				else {
					if (e = ul, ul = null, dl = 0, Wc & 6) throw Error(r(331));
					var a = Wc;
					for (Wc |= 4, J = e.current; J !== null;) {
						var o = J, s = o.child;
						if (J.flags & 16) {
							var c = o.deletions;
							if (c !== null) {
								for (var l = 0; l < c.length; l++) {
									var u = c[l];
									for (J = u; J !== null;) {
										var d = J;
										switch (d.tag) {
											case 0:
											case 11:
											case 15: yc(8, d, o);
										}
										var f = d.child;
										if (f !== null) f.return = d, J = f;
										else for (; J !== null;) {
											d = J;
											var p = d.sibling, m = d.return;
											if (Sc(d), d === u) {
												J = null;
												break;
											}
											if (p !== null) {
												p.return = m, J = p;
												break;
											}
											J = m;
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
								J = o;
							}
						}
						if (o.subtreeFlags & 2064 && s !== null) s.return = o, J = s;
						else b: for (; J !== null;) {
							if (o = J, o.flags & 2048) switch (o.tag) {
								case 0:
								case 11:
								case 15: yc(9, o, o.return);
							}
							var v = o.sibling;
							if (v !== null) {
								v.return = o.return, J = v;
								break b;
							}
							J = o.return;
						}
					}
					var y = e.current;
					for (J = y; J !== null;) {
						s = J;
						var b = s.child;
						if (s.subtreeFlags & 2064 && b !== null) b.return = s, J = b;
						else b: for (s = y; J !== null;) {
							if (c = J, c.flags & 2048) try {
								switch (c.tag) {
									case 0:
									case 11:
									case 15: bc(9, c);
								}
							} catch (e) {
								Hl(c, c.return, e);
							}
							if (c === s) {
								J = null;
								break b;
							}
							var x = c.sibling;
							if (x !== null) {
								x.return = c.return, J = x;
								break b;
							}
							J = c.return;
						}
					}
					if (Wc = a, da(), Et && typeof Et.onPostCommitFiberRoot == "function") try {
						Et.onPostCommitFiberRoot(Tt, e);
					} catch {}
					i = !0;
				}
				return i;
			} finally {
				Wt = n, Uc.transition = t;
			}
		}
		return !1;
	}
	function Vl(e, t, n) {
		t = Es(n, t), t = As(e, t, 1), e = so(e, t, 1), t = gl(), e !== null && (Vt(e, 1, t), yl(e, t));
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
					e = Es(n, e), e = js(t, e, 1), t = so(t, e, 1), e = gl(), t !== null && (Vt(t, 1, e), yl(t, e));
					break;
				}
			}
			t = t.return;
		}
	}
	function Ul(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), t = gl(), e.pingedLanes |= e.suspendedLanes & n, Gc === e && (qc & n) === n && (Xc === 4 || Xc === 3 && (qc & 130023424) === qc && 500 > vt() - rl ? kl(e, 0) : el |= n), yl(e, t);
	}
	function Wl(e, t) {
		t === 0 && (e.mode & 1 ? (t = Nt, Nt <<= 1, !(Nt & 130023424) && (Nt = 4194304)) : t = 1);
		var n = gl();
		e = ro(e, t), e !== null && (Vt(e, t, n), yl(e, n));
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
			if (e.memoizedProps !== t.pendingProps || Zi.current) Is = !0;
			else {
				if ((e.lanes & n) === 0 && !(t.flags & 128)) return Is = !1, ic(e, t, n);
				Is = !!(e.flags & 131072);
			}
		} else Is = !1, Da && t.flags & 1048576 && Sa(t, ha, t.index);
		switch (t.lanes = 0, t.tag) {
			case 2:
				var i = t.type;
				nc(e, t), e = t.pendingProps;
				var a = $i(t, Xi.current);
				Qa(t, n), a = Po(null, t, i, e, a, n);
				var o = Fo();
				return t.flags |= 1, typeof a == "object" && a && typeof a.render == "function" && a.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, ea(i) ? (o = !0, ia(t)) : o = !1, t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, ao(t), a.updater = xs, t.stateNode = a, a._reactInternals = t, Ts(t, i, e, n), t = Ws(null, t, i, !0, o, n)) : (t.tag = 0, Da && o && Ca(t), q(null, t, a, n), t = t.child), t;
			case 16:
				i = t.elementType;
				a: {
					switch (nc(e, t), e = t.pendingProps, a = i._init, i = a(i._payload), t.type = i, a = t.tag = Ql(i), e = ys(i, e), a) {
						case 0:
							t = Hs(null, t, i, e, n);
							break a;
						case 1:
							t = Us(null, t, i, e, n);
							break a;
						case 11:
							t = Ls(null, t, i, e, n);
							break a;
						case 14:
							t = Rs(null, t, i, ys(i.type, e), n);
							break a;
					}
					throw Error(r(306, i, ""));
				}
				return t;
			case 0: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ys(i, a), Hs(e, t, i, a, n);
			case 1: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ys(i, a), Us(e, t, i, a, n);
			case 3:
				a: {
					if (Gs(t), e === null) throw Error(r(387));
					i = t.pendingProps, o = t.memoizedState, a = o.element, oo(e, t), uo(t, i, null, n);
					var s = t.memoizedState;
					if (i = s.element, o.isDehydrated) {
						if (o = {
							element: i,
							isDehydrated: !1,
							cache: s.cache,
							pendingSuspenseBoundaries: s.pendingSuspenseBoundaries,
							transitions: s.transitions
						}, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
							a = Es(Error(r(423)), t), t = Ks(e, t, i, n, a);
							break a;
						}
						if (i !== a) {
							a = Es(Error(r(424)), t), t = Ks(e, t, i, n, a);
							break a;
						}
						for (Ea = ji(t.stateNode.containerInfo.firstChild), Ta = t, Da = !0, Oa = null, n = Wa(t, null, i, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling;
					} else {
						if (Ia(), i === a) {
							t = rc(e, t, n);
							break a;
						}
						q(e, t, i, n);
					}
					t = t.child;
				}
				return t;
			case 5: return yo(t), e === null && Ma(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, s = a.children, wi(i, a) ? s = null : o !== null && wi(i, o) && (t.flags |= 32), Vs(e, t), q(e, t, s, n), t.child;
			case 6: return e === null && Ma(t), null;
			case 13: return Ys(e, t, n);
			case 4: return vo(t, t.stateNode.containerInfo), i = t.pendingProps, e === null ? t.child = Ua(t, null, i, n) : q(e, t, i, n), t.child;
			case 11: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ys(i, a), Ls(e, t, i, a, n);
			case 7: return q(e, t, t.pendingProps, n), t.child;
			case 8: return q(e, t, t.pendingProps.children, n), t.child;
			case 12: return q(e, t, t.pendingProps.children, n), t.child;
			case 10:
				a: {
					if (i = t.type._context, a = t.pendingProps, o = t.memoizedProps, s = a.value, Ji(Ga, i._currentValue), i._currentValue = s, o !== null) {
						if (jr(o.value, s)) {
							if (o.children === a.children && !Zi.current) {
								t = rc(e, t, n);
								break a;
							}
						} else for (o = t.child, o !== null && (o.return = t); o !== null;) {
							var c = o.dependencies;
							if (c !== null) {
								s = o.child;
								for (var l = c.firstContext; l !== null;) {
									if (l.context === i) {
										if (o.tag === 1) {
											l = V(-1, n & -n), l.tag = 2;
											var u = o.updateQueue;
											if (u !== null) {
												u = u.shared;
												var d = u.pending;
												d === null ? l.next = l : (l.next = d.next, d.next = l), u.pending = l;
											}
										}
										o.lanes |= n, l = o.alternate, l !== null && (l.lanes |= n), Za(o.return, n, t), c.lanes |= n;
										break;
									}
									l = l.next;
								}
							} else if (o.tag === 10) s = o.type === t.type ? null : o.child;
							else if (o.tag === 18) {
								if (s = o.return, s === null) throw Error(r(341));
								s.lanes |= n, c = s.alternate, c !== null && (c.lanes |= n), Za(s, n, t), s = o.sibling;
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
					q(e, t, a.children, n), t = t.child;
				}
				return t;
			case 9: return a = t.type, i = t.pendingProps.children, Qa(t, n), a = $a(a), i = i(a), t.flags |= 1, q(e, t, i, n), t.child;
			case 14: return i = t.type, a = ys(i, t.pendingProps), a = ys(i.type, a), Rs(e, t, i, a, n);
			case 15: return zs(e, t, t.type, t.pendingProps, n);
			case 17: return i = t.type, a = t.pendingProps, a = t.elementType === i ? a : ys(i, a), nc(e, t), t.tag = 1, ea(i) ? (e = !0, ia(t)) : e = !1, Qa(t, n), Cs(t, i, a), Ts(t, i, a, n), Ws(null, t, i, !0, e, n);
			case 19: return tc(e, t, n);
			case 22: return Bs(e, t, n);
		}
		throw Error(r(156, t.tag));
	};
	function Jl(e, t) {
		return mt(e, t);
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
			if (e === ee) return 14;
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
			case te: return nu(n, a, o, t);
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
					case ee:
						s = 14;
						break a;
					case M:
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
		return e = Xl(22, e, r, t), e.elementType = te, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
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
		this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Bt(0), this.expirationTimes = Bt(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Bt(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
	}
	function ou(e, t, n, r, i, a, o, s, c) {
		return e = new au(e, t, n, s, c), t === 1 ? (t = 1, !0 === a && (t |= 8)) : t = 0, a = Xl(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: null,
			transitions: null,
			pendingSuspenseBoundaries: null
		}, ao(a), e;
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
			if (ct(e) !== e || e.tag !== 1) throw Error(r(170));
			var t = e;
			do {
				switch (t.tag) {
					case 3:
						t = t.stateNode.context;
						break a;
					case 1: if (ea(t.type)) {
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
			if (ea(n)) return ra(e, n, t);
		}
		return t;
	}
	function lu(e, t, n, r, i, a, o, s, c) {
		return e = ou(n, r, !0, e, i, a, o, s, c), e.context = cu(null), n = e.current, r = gl(), i = _l(n), a = V(r, i), a.callback = t == null ? null : t, so(n, a, i), e.current.lanes = i, Vt(e, i, r), yl(e, r), e;
	}
	function uu(e, t, n, r) {
		var i = t.current, a = gl(), o = _l(i);
		return n = cu(n), t.context === null ? t.context = n : t.pendingContext = n, t = V(a, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = so(i, t, o), e !== null && (vl(e, i, o, a), co(e, i, o)), o;
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
			var t = L();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < nn.length && t !== 0 && t < nn[n].priority; n++);
			nn.splice(n, 0, e), n === 0 && cn(e);
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
			return e._reactRootContainer = o, e[Ii] = o.current, fi(e.nodeType === 8 ? e.parentNode : e), Dl(), o;
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
		return e._reactRootContainer = c, e[Ii] = c.current, fi(e.nodeType === 8 ? e.parentNode : e), Dl(function() {
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
	Kt = function(e) {
		switch (e.tag) {
			case 3:
				var t = e.stateNode;
				if (t.current.memoizedState.isDehydrated) {
					var n = Pt(t.pendingLanes);
					n !== 0 && (Ut(t, n | 1), yl(t, vt()), !(Wc & 6) && (il = vt() + 500, da()));
				}
				break;
			case 13: Dl(function() {
				var t = ro(e, 1);
				t !== null && vl(t, e, 1, gl());
			}), pu(e, 1);
		}
	}, qt = function(e) {
		if (e.tag === 13) {
			var t = ro(e, 134217728);
			t !== null && vl(t, e, 134217728, gl()), pu(e, 134217728);
		}
	}, I = function(e) {
		if (e.tag === 13) {
			var t = _l(e), n = ro(e, t);
			n !== null && vl(n, e, t, gl()), pu(e, t);
		}
	}, L = function() {
		return Wt;
	}, Jt = function(e, t) {
		var n = Wt;
		try {
			return Wt = e, t();
		} finally {
			Wt = n;
		}
	}, Ve = function(e, t, n) {
		switch (t) {
			case "input":
				if (ve(e, n), t = n.name, n.type === "radio" && t != null) {
					for (n = e; n.parentNode;) n = n.parentNode;
					for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + "][type=\"radio\"]"), t = 0; t < n.length; t++) {
						var i = n[t];
						if (i !== e && i.form === e.form) {
							var a = Ui(i);
							if (!a) throw Error(r(90));
							pe(i), ve(i, a);
						}
					}
				}
				break;
			case "textarea":
				Te(e, n);
				break;
			case "select": t = n.value, t != null && Se(e, !!n.multiple, t, !1);
		}
	}, qe = El, Je = Dl;
	var Cu = {
		usingClientEntryPoint: !1,
		Events: [
			Vi,
			Hi,
			Ui,
			Ge,
			Ke,
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
			return e = ft(e), e === null ? null : e.stateNode;
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
			Tt = Eu.inject(Tu), Et = Eu;
		} catch {}
	}
	e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Cu, e.createPortal = function(e, t) {
		var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!vu(t)) throw Error(r(200));
		return su(e, t, null, n);
	}, e.createRoot = function(e, t) {
		if (!vu(e)) throw Error(r(299));
		var n = !1, i = "", a = hu;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (i = t.identifierPrefix), t.onRecoverableError !== void 0 && (a = t.onRecoverableError)), t = ou(e, 1, !1, null, null, n, !1, i, a), e[Ii] = t.current, fi(e.nodeType === 8 ? e.parentNode : e), new gu(t);
	}, e.findDOMNode = function(e) {
		if (e == null) return null;
		if (e.nodeType === 1) return e;
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(r(188)) : (e = Object.keys(e).join(","), Error(r(268, e)));
		return e = ft(t), e = e === null ? null : e.stateNode, e;
	}, e.flushSync = function(e) {
		return Dl(e);
	}, e.hydrate = function(e, t, n) {
		if (!yu(t)) throw Error(r(200));
		return Su(null, e, t, !0, n);
	}, e.hydrateRoot = function(e, t, n) {
		if (!vu(e)) throw Error(r(405));
		var i = n != null && n.hydratedSources || null, a = !1, o = "", s = hu;
		if (n != null && (!0 === n.unstable_strictMode && (a = !0), n.identifierPrefix !== void 0 && (o = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = lu(t, null, e, 1, n == null ? null : n, a, !1, o, s), e[Ii] = t.current, fi(e), i) for (e = 0; e < i.length; e++) n = i[e], a = n._getVersion, a = a(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, a] : t.mutableSourceEagerHydrationData.push(n, a);
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
})), eg = /* @__PURE__ */ T(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = $h();
})), tg = { disabled: !1 }, ng = R.createContext(null), rg = function(e) {
	return e.scrollTop;
};
//#endregion
//#region node_modules/react-transition-group/esm/Transition.js
W();
var ig = /* @__PURE__ */ O(eg()), ag = "unmounted", og = "exited", sg = "entering", cg = "entered", lg = "exiting", ug = /*#__PURE__*/ function(e) {
	Xh(t, e);
	function t(t, n) {
		var r = e.call(this, t, n) || this, i = n, a = i && !i.isMounting ? t.enter : t.appear, o;
		return r.appearStatus = null, t.in ? a ? (o = og, r.appearStatus = sg) : o = cg : o = t.unmountOnExit || t.mountOnEnter ? ag : og, r.state = { status: o }, r.nextCallback = null, r;
	}
	t.getDerivedStateFromProps = function(e, t) {
		return e.in && t.status === "unmounted" ? { status: og } : null;
	};
	var n = t.prototype;
	return n.componentDidMount = function() {
		this.updateStatus(!0, this.appearStatus);
	}, n.componentDidUpdate = function(e) {
		var t = null;
		if (e !== this.props) {
			var n = this.state.status;
			this.props.in ? n !== "entering" && n !== "entered" && (t = sg) : (n === "entering" || n === "entered") && (t = lg);
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
					var n = this.props.nodeRef ? this.props.nodeRef.current : ig.findDOMNode(this);
					n && rg(n);
				}
				this.performEnter(e);
			} else this.performExit();
		} else this.props.unmountOnExit && this.state.status === "exited" && this.setState({ status: ag });
	}, n.performEnter = function(e) {
		var t = this, n = this.props.enter, r = this.context ? this.context.isMounting : e, i = this.props.nodeRef ? [r] : [ig.findDOMNode(this), r], a = i[0], o = i[1], s = this.getTimeouts(), c = r ? s.appear : s.enter;
		if (!e && !n || tg.disabled) {
			this.safeSetState({ status: cg }, function() {
				t.props.onEntered(a);
			});
			return;
		}
		this.props.onEnter(a, o), this.safeSetState({ status: sg }, function() {
			t.props.onEntering(a, o), t.onTransitionEnd(c, function() {
				t.safeSetState({ status: cg }, function() {
					t.props.onEntered(a, o);
				});
			});
		});
	}, n.performExit = function() {
		var e = this, t = this.props.exit, n = this.getTimeouts(), r = this.props.nodeRef ? void 0 : ig.findDOMNode(this);
		if (!t || tg.disabled) {
			this.safeSetState({ status: og }, function() {
				e.props.onExited(r);
			});
			return;
		}
		this.props.onExit(r), this.safeSetState({ status: lg }, function() {
			e.props.onExiting(r), e.onTransitionEnd(n.exit, function() {
				e.safeSetState({ status: og }, function() {
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
		var n = this.props.nodeRef ? this.props.nodeRef.current : ig.findDOMNode(this), r = e == null && !this.props.addEndListener;
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
		var r = U(t, [
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
		return /*#__PURE__*/ R.createElement(ng.Provider, { value: null }, typeof n == "function" ? n(e, r) : R.cloneElement(R.Children.only(n), r));
	}, t;
}(R.Component);
ug.contextType = ng, ug.propTypes = {};
function dg() {}
ug.defaultProps = {
	in: !1,
	mountOnEnter: !1,
	unmountOnExit: !1,
	appear: !1,
	enter: !0,
	exit: !0,
	onEnter: dg,
	onEntering: dg,
	onEntered: dg,
	onExit: dg,
	onExiting: dg,
	onExited: dg
}, ug.UNMOUNTED = ag, ug.EXITED = og, ug.ENTERING = sg, ug.ENTERED = cg, ug.EXITING = lg;
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function fg(e) {
	if (e === void 0) throw ReferenceError("this hasn't been initialised - super() hasn't been called");
	return e;
}
//#endregion
//#region node_modules/react-transition-group/esm/utils/ChildMapping.js
function pg(e, t) {
	var n = function(e) {
		return t && (0, R.isValidElement)(e) ? t(e) : e;
	}, r = Object.create(null);
	return e && R.Children.map(e, function(e) {
		return e;
	}).forEach(function(e) {
		r[e.key] = n(e);
	}), r;
}
function mg(e, t) {
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
function hg(e, t, n) {
	return n[t] == null ? e.props[t] : n[t];
}
function gg(e, t) {
	return pg(e.children, function(n) {
		return (0, R.cloneElement)(n, {
			onExited: t.bind(null, n),
			in: !0,
			appear: hg(n, "appear", e),
			enter: hg(n, "enter", e),
			exit: hg(n, "exit", e)
		});
	});
}
function _g(e, t, n) {
	var r = pg(e.children), i = mg(t, r);
	return Object.keys(i).forEach(function(a) {
		var o = i[a];
		if ((0, R.isValidElement)(o)) {
			var s = a in t, c = a in r, l = t[a], u = (0, R.isValidElement)(l) && !l.props.in;
			c && (!s || u) ? i[a] = (0, R.cloneElement)(o, {
				onExited: n.bind(null, o),
				in: !0,
				exit: hg(o, "exit", e),
				enter: hg(o, "enter", e)
			}) : !c && s && !u ? i[a] = (0, R.cloneElement)(o, { in: !1 }) : c && s && (0, R.isValidElement)(l) && (i[a] = (0, R.cloneElement)(o, {
				onExited: n.bind(null, o),
				in: l.props.in,
				exit: hg(o, "exit", e),
				enter: hg(o, "enter", e)
			}));
		}
	}), i;
}
W(), B();
var vg = Object.values || function(e) {
	return Object.keys(e).map(function(t) {
		return e[t];
	});
}, yg = {
	component: "div",
	childFactory: function(e) {
		return e;
	}
}, bg = /*#__PURE__*/ function(e) {
	Xh(t, e);
	function t(t, n) {
		var r = e.call(this, t, n) || this;
		return r.state = {
			contextValue: { isMounting: !0 },
			handleExited: r.handleExited.bind(fg(r)),
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
			children: t.firstRender ? gg(e, r) : _g(e, n, r),
			firstRender: !1
		};
	}, n.handleExited = function(e, t) {
		var n = pg(this.props.children);
		e.key in n || (e.props.onExited && e.props.onExited(t), this.mounted && this.setState(function(t) {
			var n = z({}, t.children);
			return delete n[e.key], { children: n };
		}));
	}, n.render = function() {
		var e = this.props, t = e.component, n = e.childFactory, r = U(e, ["component", "childFactory"]), i = this.state.contextValue, a = vg(this.state.children).map(n);
		return delete r.appear, delete r.enter, delete r.exit, t === null ? /*#__PURE__*/ R.createElement(ng.Provider, { value: i }, a) : /*#__PURE__*/ R.createElement(ng.Provider, { value: i }, /*#__PURE__*/ R.createElement(t, r, a));
	}, t;
}(R.Component);
bg.propTypes = {}, bg.defaultProps = yg;
//#endregion
//#region node_modules/@mui/material/transitions/utils.js
var xg = (e) => e.scrollTop;
function Sg(e, t) {
	var n, r;
	let { timeout: i, easing: a, style: o = {} } = e;
	return {
		duration: (n = o.transitionDuration) == null ? typeof i == "number" ? i : i[t.mode] || 0 : n,
		easing: (r = o.transitionTimingFunction) == null ? typeof a == "object" ? a[t.mode] : a : r,
		delay: o.transitionDelay
	};
}
bo(), vo();
function Cg(e) {
	return ho("MuiPaper", e);
}
H("MuiPaper", /* @__PURE__ */ "root.rounded.outlined.elevation.elevation0.elevation1.elevation2.elevation3.elevation4.elevation5.elevation6.elevation7.elevation8.elevation9.elevation10.elevation11.elevation12.elevation13.elevation14.elevation15.elevation16.elevation17.elevation18.elevation19.elevation20.elevation21.elevation22.elevation23.elevation24".split(".")), W(), B(), jo(), co();
var wg = Uf();
Qp(), _s();
var Tg = [
	"className",
	"component",
	"elevation",
	"square",
	"variant"
], Eg = (e) => {
	let { square: t, elevation: n, variant: r, classes: i } = e;
	return V({ root: [
		"root",
		r,
		!t && "rounded",
		r === "elevation" && `elevation${n}`
	] }, Cg, i);
}, Dg = Y("div", {
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
	return z({
		backgroundColor: (e.vars || e).palette.background.paper,
		color: (e.vars || e).palette.text.primary,
		transition: e.transitions.create("box-shadow")
	}, !t.square && { borderRadius: e.shape.borderRadius }, t.variant === "outlined" && { border: `1px solid ${(e.vars || e).palette.divider}` }, t.variant === "elevation" && z({ boxShadow: (e.vars || e).shadows[t.elevation] }, !e.vars && e.palette.mode === "dark" && { backgroundImage: `linear-gradient(${(0, wg.alpha)("#fff", Jh(t.elevation))}, ${(0, wg.alpha)("#fff", Jh(t.elevation))})` }, e.vars && { backgroundImage: (n = e.vars.overlays) == null ? void 0 : n[t.elevation] }));
}), Og = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiPaper"
	}), { className: r, component: i = "div", elevation: a = 1, square: o = !1, variant: s = "elevation" } = n, c = U(n, Tg), l = z({}, n, {
		component: i,
		elevation: a,
		square: o,
		variant: s
	}), u = Eg(l);
	return /*#__PURE__*/ (0, X.jsx)(Dg, z({
		as: i,
		ownerState: l,
		className: G(u.root, r),
		ref: t
	}, c));
});
//#endregion
//#region node_modules/@mui/material/ButtonBase/Ripple.js
jo();
function kg(e) {
	let { className: t, classes: n, pulsate: r = !1, rippleX: i, rippleY: a, rippleSize: o, in: s, onExited: c, timeout: l } = e, [u, d] = R.useState(!1), f = G(t, n.ripple, n.rippleVisible, r && n.ripplePulsate), p = {
		width: o,
		height: o,
		top: -(o / 2) + a,
		left: -(o / 2) + i
	}, m = G(n.child, u && n.childLeaving, r && n.childPulsate);
	return !s && !u && d(!0), R.useEffect(() => {
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
	]), /*#__PURE__*/ (0, X.jsx)("span", {
		className: f,
		style: p,
		children: /*#__PURE__*/ (0, X.jsx)("span", { className: m })
	});
}
//#endregion
//#region node_modules/@mui/material/ButtonBase/touchRippleClasses.js
bo();
var Ag = H("MuiTouchRipple", [
	"root",
	"ripple",
	"rippleVisible",
	"ripplePulsate",
	"child",
	"childLeaving",
	"childPulsate"
]);
B(), W(), jo(), Ll(), La(), Qp(), _s();
var jg = [
	"center",
	"classes",
	"className"
], Mg = (e) => e, Ng, Pg, Fg, Ig, Lg = 550, Rg = Nl(Ng || (Ng = Mg`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`)), zg = Nl(Pg || (Pg = Mg`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`)), Bg = Nl(Fg || (Fg = Mg`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`)), Vg = Y("span", {
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
}), Hg = Y(kg, {
	name: "MuiTouchRipple",
	slot: "Ripple"
})(Ig || (Ig = Mg`
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
`), Ag.rippleVisible, Rg, Lg, ({ theme: e }) => e.transitions.easing.easeInOut, Ag.ripplePulsate, ({ theme: e }) => e.transitions.duration.shorter, Ag.child, Ag.childLeaving, zg, Lg, ({ theme: e }) => e.transitions.easing.easeInOut, Ag.childPulsate, Bg, ({ theme: e }) => e.transitions.easing.easeInOut), Ug = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiTouchRipple"
	}), { center: r = !1, classes: i = {}, className: a } = n, o = U(n, jg), [s, c] = R.useState([]), l = R.useRef(0), u = R.useRef(null);
	R.useEffect(() => {
		u.current && (u.current(), u.current = null);
	}, [s]);
	let d = R.useRef(!1), f = Pa(), p = R.useRef(null), m = R.useRef(null), h = R.useCallback((e) => {
		let { pulsate: t, rippleX: n, rippleY: r, rippleSize: a, cb: o } = e;
		c((e) => [...e, /*#__PURE__*/ (0, X.jsx)(Hg, {
			classes: {
				ripple: G(i.ripple, Ag.ripple),
				rippleVisible: G(i.rippleVisible, Ag.rippleVisible),
				ripplePulsate: G(i.ripplePulsate, Ag.ripplePulsate),
				child: G(i.child, Ag.child),
				childLeaving: G(i.childLeaving, Ag.childLeaving),
				childPulsate: G(i.childPulsate, Ag.childPulsate)
			},
			timeout: Lg,
			pulsate: t,
			rippleX: n,
			rippleY: r,
			rippleSize: a
		}, l.current)]), l.current += 1, u.current = o;
	}, [i]), g = R.useCallback((e = {}, t = {}, n = () => {}) => {
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
	]), _ = R.useCallback(() => {
		g({}, { pulsate: !0 });
	}, [g]), v = R.useCallback((e, t) => {
		if (f.clear(), (e == null ? void 0 : e.type) === "touchend" && p.current) {
			p.current(), p.current = null, f.start(0, () => {
				v(e, t);
			});
			return;
		}
		p.current = null, c((e) => e.length > 0 ? e.slice(1) : e), u.current = t;
	}, [f]);
	return R.useImperativeHandle(t, () => ({
		pulsate: _,
		start: g,
		stop: v
	}), [
		_,
		g,
		v
	]), /*#__PURE__*/ (0, X.jsx)(Vg, z({
		className: G(Ag.root, i.root, a),
		ref: m
	}, o, { children: /*#__PURE__*/ (0, X.jsx)(bg, {
		component: null,
		exit: !0,
		children: s
	}) }));
});
bo(), vo();
function Wg(e) {
	return ho("MuiButtonBase", e);
}
var Gg = H("MuiButtonBase", [
	"root",
	"disabled",
	"focusVisible"
]);
B(), W(), jo(), co(), Qp(), _s(), zm(), Lm(), Vm();
var Kg = /* @__PURE__ */ "action.centerRipple.children.className.component.disabled.disableRipple.disableTouchRipple.focusRipple.focusVisibleClassName.LinkComponent.onBlur.onClick.onContextMenu.onDragLeave.onFocus.onFocusVisible.onKeyDown.onKeyUp.onMouseDown.onMouseLeave.onMouseUp.onTouchEnd.onTouchMove.onTouchStart.tabIndex.TouchRippleProps.touchRippleRef.type".split("."), qg = (e) => {
	let { disabled: t, focusVisible: n, focusVisibleClassName: r, classes: i } = e, a = V({ root: [
		"root",
		t && "disabled",
		n && "focusVisible"
	] }, Wg, i);
	return n && r && (a.root += ` ${r}`), a;
}, Jg = Y("button", {
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
	[`&.${Gg.disabled}`]: {
		pointerEvents: "none",
		cursor: "default"
	},
	"@media print": { colorAdjust: "exact" }
}), Yg = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiButtonBase"
	}), { action: r, centerRipple: i = !1, children: a, className: o, component: s = "button", disabled: c = !1, disableRipple: l = !1, disableTouchRipple: u = !1, focusRipple: d = !1, LinkComponent: f = "a", onBlur: p, onClick: m, onContextMenu: h, onDragLeave: g, onFocus: _, onFocusVisible: v, onKeyDown: y, onKeyUp: b, onMouseDown: x, onMouseLeave: S, onMouseUp: C, onTouchEnd: w, onTouchMove: T, onTouchStart: E, tabIndex: D = 0, TouchRippleProps: O, touchRippleRef: k, type: A } = n, j = U(n, Kg), ee = R.useRef(null), M = R.useRef(null), te = Rm(M, k), { isFocusVisibleRef: ne, onFocus: re, onBlur: N, ref: ie } = Bm(), [P, ae] = R.useState(!1);
	c && P && ae(!1), R.useImperativeHandle(r, () => ({ focusVisible: () => {
		ae(!0), ee.current.focus();
	} }), []);
	let [F, oe] = R.useState(!1);
	R.useEffect(() => {
		oe(!0);
	}, []);
	let se = F && !l && !c;
	R.useEffect(() => {
		P && d && !l && F && M.current.pulsate();
	}, [
		l,
		d,
		P,
		F
	]);
	function ce(e, t, n = u) {
		return Im((r) => (t && t(r), !n && M.current && M.current[e](r), !0));
	}
	let le = ce("start", x), ue = ce("stop", h), de = ce("stop", g), fe = ce("stop", C), pe = ce("stop", (e) => {
		P && e.preventDefault(), S && S(e);
	}), me = ce("start", E), he = ce("stop", w), ge = ce("stop", T), _e = ce("stop", (e) => {
		N(e), ne.current === !1 && ae(!1), p && p(e);
	}, !1), ve = Im((e) => {
		ee.current || (ee.current = e.currentTarget), re(e), ne.current === !0 && (ae(!0), v && v(e)), _ && _(e);
	}), ye = () => {
		let e = ee.current;
		return s && s !== "button" && !(e.tagName === "A" && e.href);
	}, be = R.useRef(!1), xe = Im((e) => {
		d && !be.current && P && M.current && e.key === " " && (be.current = !0, M.current.stop(e, () => {
			M.current.start(e);
		})), e.target === e.currentTarget && ye() && e.key === " " && e.preventDefault(), y && y(e), e.target === e.currentTarget && ye() && e.key === "Enter" && !c && (e.preventDefault(), m && m(e));
	}), Se = Im((e) => {
		d && e.key === " " && M.current && P && !e.defaultPrevented && (be.current = !1, M.current.stop(e, () => {
			M.current.pulsate(e);
		})), b && b(e), m && e.target === e.currentTarget && ye() && e.key === " " && !e.defaultPrevented && m(e);
	}), Ce = s;
	Ce === "button" && (j.href || j.to) && (Ce = f);
	let we = {};
	Ce === "button" ? (we.type = A === void 0 ? "button" : A, we.disabled = c) : (!j.href && !j.to && (we.role = "button"), c && (we["aria-disabled"] = c));
	let Te = Rm(t, ie, ee), Ee = z({}, n, {
		centerRipple: i,
		component: s,
		disabled: c,
		disableRipple: l,
		disableTouchRipple: u,
		focusRipple: d,
		tabIndex: D,
		focusVisible: P
	}), De = qg(Ee);
	return /*#__PURE__*/ (0, X.jsxs)(Jg, z({
		as: Ce,
		className: G(De.root, o),
		ownerState: Ee,
		onBlur: _e,
		onClick: m,
		onContextMenu: ue,
		onFocus: ve,
		onKeyDown: xe,
		onKeyUp: Se,
		onMouseDown: le,
		onMouseLeave: pe,
		onMouseUp: fe,
		onDragLeave: de,
		onTouchEnd: he,
		onTouchMove: ge,
		onTouchStart: me,
		ref: Te,
		tabIndex: c ? -1 : D,
		type: A
	}, we, j, { children: [a, se ? /*#__PURE__*/ (0, X.jsx)(Ug, z({
		ref: te,
		center: i
	}, O)) : null] }));
});
bo(), vo();
function Xg(e) {
	return ho("MuiIconButton", e);
}
var Zg = H("MuiIconButton", [
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
W(), B(), jo(), co(), Qp(), _s(), $o();
var Qg = [
	"edge",
	"children",
	"className",
	"color",
	"disabled",
	"disableFocusRipple",
	"size"
], $g = (e) => {
	let { classes: t, disabled: n, color: r, edge: i, size: a } = e;
	return V({ root: [
		"root",
		n && "disabled",
		r !== "default" && `color${K(r)}`,
		i && `edge${K(i)}`,
		`size${K(a)}`
	] }, Xg, t);
}, e_ = Y(Yg, {
	name: "MuiIconButton",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.color !== "default" && t[`color${K(n.color)}`],
			n.edge && t[`edge${K(n.edge)}`],
			t[`size${K(n.size)}`]
		];
	}
})(({ theme: e, ownerState: t }) => z({
	textAlign: "center",
	flex: "0 0 auto",
	fontSize: e.typography.pxToRem(24),
	padding: 8,
	borderRadius: "50%",
	overflow: "visible",
	color: (e.vars || e).palette.action.active,
	transition: e.transitions.create("background-color", { duration: e.transitions.duration.shortest })
}, !t.disableRipple && { "&:hover": {
	backgroundColor: e.vars ? `rgba(${e.vars.palette.action.activeChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(e.palette.action.active, e.palette.action.hoverOpacity),
	"@media (hover: none)": { backgroundColor: "transparent" }
} }, t.edge === "start" && { marginLeft: t.size === "small" ? -3 : -12 }, t.edge === "end" && { marginRight: t.size === "small" ? -3 : -12 }), ({ theme: e, ownerState: t }) => {
	var n;
	let r = (n = (e.vars || e).palette) == null ? void 0 : n[t.color];
	return z({}, t.color === "inherit" && { color: "inherit" }, t.color !== "inherit" && t.color !== "default" && z({ color: r == null ? void 0 : r.main }, !t.disableRipple && { "&:hover": z({}, r && { backgroundColor: e.vars ? `rgba(${r.mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(r.main, e.palette.action.hoverOpacity) }, { "@media (hover: none)": { backgroundColor: "transparent" } }) }), t.size === "small" && {
		padding: 5,
		fontSize: e.typography.pxToRem(18)
	}, t.size === "large" && {
		padding: 12,
		fontSize: e.typography.pxToRem(28)
	}, { [`&.${Zg.disabled}`]: {
		backgroundColor: "transparent",
		color: (e.vars || e).palette.action.disabled
	} });
}), t_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiIconButton"
	}), { edge: r = !1, children: i, className: a, color: o = "default", disabled: s = !1, disableFocusRipple: c = !1, size: l = "medium" } = n, u = U(n, Qg), d = z({}, n, {
		edge: r,
		color: o,
		disabled: s,
		disableFocusRipple: c,
		size: l
	}), f = $g(d);
	return /*#__PURE__*/ (0, X.jsx)(e_, z({
		className: G(f.root, a),
		centerRipple: !0,
		focusRipple: !c,
		disabled: s,
		ref: t
	}, u, {
		ownerState: d,
		children: i
	}));
});
bo(), vo();
function n_(e) {
	return ho("MuiTypography", e);
}
H("MuiTypography", [
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
]), W(), B(), jo(), Ff(), co(), Qp(), _s(), $o();
var r_ = [
	"align",
	"className",
	"component",
	"gutterBottom",
	"noWrap",
	"paragraph",
	"variant",
	"variantMapping"
], i_ = (e) => {
	let { align: t, gutterBottom: n, noWrap: r, paragraph: i, variant: a, classes: o } = e;
	return V({ root: [
		"root",
		a,
		e.align !== "inherit" && `align${K(t)}`,
		n && "gutterBottom",
		r && "noWrap",
		i && "paragraph"
	] }, n_, o);
}, a_ = Y("span", {
	name: "MuiTypography",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.variant && t[n.variant],
			n.align !== "inherit" && t[`align${K(n.align)}`],
			n.noWrap && t.noWrap,
			n.gutterBottom && t.gutterBottom,
			n.paragraph && t.paragraph
		];
	}
})(({ theme: e, ownerState: t }) => z({ margin: 0 }, t.variant === "inherit" && { font: "inherit" }, t.variant !== "inherit" && e.typography[t.variant], t.align !== "inherit" && { textAlign: t.align }, t.noWrap && {
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
}, t.gutterBottom && { marginBottom: "0.35em" }, t.paragraph && { marginBottom: 16 })), o_ = {
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
}, s_ = {
	primary: "primary.main",
	textPrimary: "text.primary",
	secondary: "secondary.main",
	textSecondary: "text.secondary",
	error: "error.main"
}, c_ = (e) => s_[e] || e, Z = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiTypography"
	}), r = c_(n.color), i = Af(z({}, n, { color: r })), { align: a = "inherit", className: o, component: s, gutterBottom: c = !1, noWrap: l = !1, paragraph: u = !1, variant: d = "body1", variantMapping: f = o_ } = i, p = U(i, r_), m = z({}, i, {
		align: a,
		color: r,
		className: o,
		component: s,
		gutterBottom: c,
		noWrap: l,
		paragraph: u,
		variant: d,
		variantMapping: f
	}), h = s || (u ? "p" : f[d] || o_[d]) || "span", g = i_(m);
	return /*#__PURE__*/ (0, X.jsx)(a_, z({
		as: h,
		ref: t,
		ownerState: m,
		className: G(g.root, o)
	}, p));
});
//#endregion
//#region node_modules/@mui/material/Portal/Portal.js
Qo();
function l_(e) {
	return typeof e == "function" ? e() : e;
}
var u_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let { children: n, container: r, disablePortal: i = !1 } = e, [a, o] = R.useState(null), s = Sa(/*#__PURE__*/ R.isValidElement(n) ? Jo(n) : null, t);
	if (ta(() => {
		i || o(l_(r) || document.body);
	}, [r, i]), ta(() => {
		if (a && !i) return Zi(t, a), () => {
			Zi(t, null);
		};
	}, [
		t,
		a,
		i
	]), i) {
		if (/*#__PURE__*/ R.isValidElement(n)) {
			let e = { ref: s };
			return /*#__PURE__*/ R.cloneElement(n, e);
		}
		return /*#__PURE__*/ (0, X.jsx)(R.Fragment, { children: n });
	}
	return /*#__PURE__*/ (0, X.jsx)(R.Fragment, { children: a && /*#__PURE__*/ ig.createPortal(n, a) });
});
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/Cancel.js
pm();
var d_ = um(/*#__PURE__*/ (0, X.jsx)("path", { d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" }), "Cancel");
bo(), vo();
function f_(e) {
	return ho("MuiChip", e);
}
var p_ = H("MuiChip", /* @__PURE__ */ "root.sizeSmall.sizeMedium.colorError.colorInfo.colorPrimary.colorSecondary.colorSuccess.colorWarning.disabled.clickable.clickableColorPrimary.clickableColorSecondary.deletable.deletableColorPrimary.deletableColorSecondary.outlined.filled.outlinedPrimary.outlinedSecondary.filledPrimary.filledSecondary.avatar.avatarSmall.avatarMedium.avatarColorPrimary.avatarColorSecondary.icon.iconSmall.iconMedium.iconColorPrimary.iconColorSecondary.label.labelSmall.labelMedium.deleteIcon.deleteIconSmall.deleteIconMedium.deleteIconColorPrimary.deleteIconColorSecondary.deleteIconOutlinedColorPrimary.deleteIconOutlinedColorSecondary.deleteIconFilledColorPrimary.deleteIconFilledColorSecondary.focusVisible".split("."));
W(), B(), jo(), co(), zm(), $o(), _s(), Qp();
var m_ = [
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
], h_ = (e) => {
	let { classes: t, disabled: n, size: r, color: i, iconColor: a, onDelete: o, clickable: s, variant: c } = e;
	return V({
		root: [
			"root",
			c,
			n && "disabled",
			`size${K(r)}`,
			`color${K(i)}`,
			s && "clickable",
			s && `clickableColor${K(i)}`,
			o && "deletable",
			o && `deletableColor${K(i)}`,
			`${c}${K(i)}`
		],
		label: ["label", `label${K(r)}`],
		avatar: [
			"avatar",
			`avatar${K(r)}`,
			`avatarColor${K(i)}`
		],
		icon: [
			"icon",
			`icon${K(r)}`,
			`iconColor${K(a)}`
		],
		deleteIcon: [
			"deleteIcon",
			`deleteIcon${K(r)}`,
			`deleteIconColor${K(i)}`,
			`deleteIcon${K(c)}Color${K(i)}`
		]
	}, f_, t);
}, g_ = Y("div", {
	name: "MuiChip",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e, { color: r, iconColor: i, clickable: a, onDelete: o, size: s, variant: c } = n;
		return [
			{ [`& .${p_.avatar}`]: t.avatar },
			{ [`& .${p_.avatar}`]: t[`avatar${K(s)}`] },
			{ [`& .${p_.avatar}`]: t[`avatarColor${K(r)}`] },
			{ [`& .${p_.icon}`]: t.icon },
			{ [`& .${p_.icon}`]: t[`icon${K(s)}`] },
			{ [`& .${p_.icon}`]: t[`iconColor${K(i)}`] },
			{ [`& .${p_.deleteIcon}`]: t.deleteIcon },
			{ [`& .${p_.deleteIcon}`]: t[`deleteIcon${K(s)}`] },
			{ [`& .${p_.deleteIcon}`]: t[`deleteIconColor${K(r)}`] },
			{ [`& .${p_.deleteIcon}`]: t[`deleteIcon${K(c)}Color${K(r)}`] },
			t.root,
			t[`size${K(s)}`],
			t[`color${K(r)}`],
			a && t.clickable,
			a && r !== "default" && t[`clickableColor${K(r)})`],
			o && t.deletable,
			o && r !== "default" && t[`deletableColor${K(r)}`],
			t[c],
			t[`${c}${K(r)}`]
		];
	}
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? e.palette.grey[700] : e.palette.grey[300];
	return z({
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
		[`&.${p_.disabled}`]: {
			opacity: (e.vars || e).palette.action.disabledOpacity,
			pointerEvents: "none"
		},
		[`& .${p_.avatar}`]: {
			marginLeft: 5,
			marginRight: -6,
			width: 24,
			height: 24,
			color: e.vars ? e.vars.palette.Chip.defaultAvatarColor : n,
			fontSize: e.typography.pxToRem(12)
		},
		[`& .${p_.avatarColorPrimary}`]: {
			color: (e.vars || e).palette.primary.contrastText,
			backgroundColor: (e.vars || e).palette.primary.dark
		},
		[`& .${p_.avatarColorSecondary}`]: {
			color: (e.vars || e).palette.secondary.contrastText,
			backgroundColor: (e.vars || e).palette.secondary.dark
		},
		[`& .${p_.avatarSmall}`]: {
			marginLeft: 4,
			marginRight: -4,
			width: 18,
			height: 18,
			fontSize: e.typography.pxToRem(10)
		},
		[`& .${p_.icon}`]: z({
			marginLeft: 5,
			marginRight: -6
		}, t.size === "small" && {
			fontSize: 18,
			marginLeft: 4,
			marginRight: -4
		}, t.iconColor === t.color && z({ color: e.vars ? e.vars.palette.Chip.defaultIconColor : n }, t.color !== "default" && { color: "inherit" })),
		[`& .${p_.deleteIcon}`]: z({
			WebkitTapHighlightColor: "transparent",
			color: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / 0.26)` : (0, wg.alpha)(e.palette.text.primary, .26),
			fontSize: 22,
			cursor: "pointer",
			margin: "0 5px 0 -6px",
			"&:hover": { color: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / 0.4)` : (0, wg.alpha)(e.palette.text.primary, .4) }
		}, t.size === "small" && {
			fontSize: 16,
			marginRight: 4,
			marginLeft: -4
		}, t.color !== "default" && {
			color: e.vars ? `rgba(${e.vars.palette[t.color].contrastTextChannel} / 0.7)` : (0, wg.alpha)(e.palette[t.color].contrastText, .7),
			"&:hover, &:active": { color: (e.vars || e).palette[t.color].contrastText }
		})
	}, t.size === "small" && { height: 24 }, t.color !== "default" && {
		backgroundColor: (e.vars || e).palette[t.color].main,
		color: (e.vars || e).palette[t.color].contrastText
	}, t.onDelete && { [`&.${p_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.focusOpacity}))` : (0, wg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.focusOpacity) } }, t.onDelete && t.color !== "default" && { [`&.${p_.focusVisible}`]: { backgroundColor: (e.vars || e).palette[t.color].dark } });
}, ({ theme: e, ownerState: t }) => z({}, t.clickable && {
	userSelect: "none",
	WebkitTapHighlightColor: "transparent",
	cursor: "pointer",
	"&:hover": { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.hoverOpacity}))` : (0, wg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.hoverOpacity) },
	[`&.${p_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette.action.selectedChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.focusOpacity}))` : (0, wg.alpha)(e.palette.action.selected, e.palette.action.selectedOpacity + e.palette.action.focusOpacity) },
	"&:active": { boxShadow: (e.vars || e).shadows[1] }
}, t.clickable && t.color !== "default" && { [`&:hover, &.${p_.focusVisible}`]: { backgroundColor: (e.vars || e).palette[t.color].dark } }), ({ theme: e, ownerState: t }) => z({}, t.variant === "outlined" && {
	backgroundColor: "transparent",
	border: e.vars ? `1px solid ${e.vars.palette.Chip.defaultBorder}` : `1px solid ${e.palette.mode === "light" ? e.palette.grey[400] : e.palette.grey[700]}`,
	[`&.${p_.clickable}:hover`]: { backgroundColor: (e.vars || e).palette.action.hover },
	[`&.${p_.focusVisible}`]: { backgroundColor: (e.vars || e).palette.action.focus },
	[`& .${p_.avatar}`]: { marginLeft: 4 },
	[`& .${p_.avatarSmall}`]: { marginLeft: 2 },
	[`& .${p_.icon}`]: { marginLeft: 4 },
	[`& .${p_.iconSmall}`]: { marginLeft: 2 },
	[`& .${p_.deleteIcon}`]: { marginRight: 5 },
	[`& .${p_.deleteIconSmall}`]: { marginRight: 3 }
}, t.variant === "outlined" && t.color !== "default" && {
	color: (e.vars || e).palette[t.color].main,
	border: `1px solid ${e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / 0.7)` : (0, wg.alpha)(e.palette[t.color].main, .7)}`,
	[`&.${p_.clickable}:hover`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity) },
	[`&.${p_.focusVisible}`]: { backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.focusOpacity})` : (0, wg.alpha)(e.palette[t.color].main, e.palette.action.focusOpacity) },
	[`& .${p_.deleteIcon}`]: {
		color: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / 0.7)` : (0, wg.alpha)(e.palette[t.color].main, .7),
		"&:hover, &:active": { color: (e.vars || e).palette[t.color].main }
	}
})), __ = Y("span", {
	name: "MuiChip",
	slot: "Label",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e, { size: r } = n;
		return [t.label, t[`label${K(r)}`]];
	}
})(({ ownerState: e }) => z({
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
function v_(e) {
	return e.key === "Backspace" || e.key === "Delete";
}
var y_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiChip"
	}), { avatar: r, className: i, clickable: a, color: o = "default", component: s, deleteIcon: c, disabled: l = !1, icon: u, label: d, onClick: f, onDelete: p, onKeyDown: m, onKeyUp: h, size: g = "medium", variant: _ = "filled", tabIndex: v, skipFocusWhenDisabled: y = !1 } = n, b = U(n, m_), x = R.useRef(null), S = Rm(x, t), C = (e) => {
		e.stopPropagation(), p && p(e);
	}, w = (e) => {
		e.currentTarget === e.target && v_(e) && e.preventDefault(), m && m(e);
	}, T = (e) => {
		e.currentTarget === e.target && (p && v_(e) ? p(e) : e.key === "Escape" && x.current && x.current.blur()), h && h(e);
	}, E = a !== !1 && f ? !0 : a, D = E || p ? Yg : s || "div", O = z({}, n, {
		component: D,
		disabled: l,
		size: g,
		color: o,
		iconColor: /*#__PURE__*/ R.isValidElement(u) && u.props.color || o,
		onDelete: !!p,
		clickable: E,
		variant: _
	}), k = h_(O), A = D === Yg ? z({
		component: s || "div",
		focusVisibleClassName: k.focusVisible
	}, p && { disableRipple: !0 }) : {}, j = null;
	p && (j = c && /*#__PURE__*/ R.isValidElement(c) ? /*#__PURE__*/ R.cloneElement(c, {
		className: G(c.props.className, k.deleteIcon),
		onClick: C
	}) : /*#__PURE__*/ (0, X.jsx)(d_, {
		className: G(k.deleteIcon),
		onClick: C
	}));
	let ee = null;
	r && /*#__PURE__*/ R.isValidElement(r) && (ee = /*#__PURE__*/ R.cloneElement(r, { className: G(k.avatar, r.props.className) }));
	let M = null;
	return u && /*#__PURE__*/ R.isValidElement(u) && (M = /*#__PURE__*/ R.cloneElement(u, { className: G(k.icon, u.props.className) })), /*#__PURE__*/ (0, X.jsxs)(g_, z({
		as: D,
		className: G(k.root, i),
		disabled: E && l ? !0 : void 0,
		onClick: f,
		onKeyDown: w,
		onKeyUp: T,
		ref: S,
		tabIndex: y && l ? -1 : v,
		ownerState: O
	}, A, b, { children: [
		ee || M,
		/*#__PURE__*/ (0, X.jsx)(__, {
			className: G(k.label),
			ownerState: O,
			children: d
		}),
		j
	] }));
});
B(), W(), Qo();
var b_ = [
	"onChange",
	"maxRows",
	"minRows",
	"style",
	"value"
];
function x_(e) {
	return parseInt(e, 10) || 0;
}
var S_ = { shadow: {
	visibility: "hidden",
	position: "absolute",
	overflow: "hidden",
	height: 0,
	top: 0,
	left: 0,
	transform: "translateZ(0)"
} };
function C_(e) {
	for (let t in e) return !1;
	return !0;
}
function w_(e) {
	return C_(e) || e.outerHeightStyle === 0 && !e.overflowing;
}
var T_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let { onChange: n, maxRows: r, minRows: i = 1, style: a, value: o } = e, s = U(e, b_), { current: c } = R.useRef(o != null), l = R.useRef(null), u = Sa(t, l), d = R.useRef(null), f = R.useRef(null), p = R.useCallback(() => {
		let t = l.current, n = f.current;
		if (!t || !n) return;
		let a = Gi(t).getComputedStyle(t);
		if (a.width === "0px") return {
			outerHeightStyle: 0,
			overflowing: !1
		};
		n.style.width = a.width, n.value = t.value || e.placeholder || "x", n.value.slice(-1) === "\n" && (n.value += " ");
		let o = a.boxSizing, s = x_(a.paddingBottom) + x_(a.paddingTop), c = x_(a.borderBottomWidth) + x_(a.borderTopWidth), u = n.scrollHeight;
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
	]), m = va(() => {
		let e = l.current, t = p();
		if (!e || !t || w_(t)) return !1;
		let n = t.outerHeightStyle;
		return d.current != null && d.current !== n;
	}), h = R.useCallback(() => {
		let e = l.current, t = p();
		if (!e || !t || w_(t)) return;
		let n = t.outerHeightStyle;
		d.current !== n && (d.current = n, e.style.height = `${n}px`), e.style.overflow = t.overflowing ? "hidden" : "";
	}, [p]), g = R.useRef(-1);
	return ta(() => {
		let e = Mi(h), t = l == null ? void 0 : l.current;
		if (!t) return;
		let n = Gi(t);
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
	]), ta(() => {
		h();
	}), /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [/*#__PURE__*/ (0, X.jsx)("textarea", z({
		value: o,
		onChange: (e) => {
			c || h(), n && n(e);
		},
		ref: u,
		rows: i,
		style: a
	}, s)), /*#__PURE__*/ (0, X.jsx)("textarea", {
		"aria-hidden": !0,
		className: e.className,
		readOnly: !0,
		ref: f,
		tabIndex: -1,
		style: z({}, S_.shadow, a, {
			paddingTop: 0,
			paddingBottom: 0
		})
	})] });
});
//#endregion
//#region node_modules/@mui/material/FormControl/formControlState.js
function E_({ props: e, states: t, muiFormControl: n }) {
	return t.reduce((t, r) => (t[r] = e[r], n && e[r] === void 0 && (t[r] = n[r]), t), {});
}
//#endregion
//#region node_modules/@mui/material/FormControl/FormControlContext.js
var D_ = /*#__PURE__*/ R.createContext(void 0);
//#endregion
//#region node_modules/@mui/material/FormControl/useFormControl.js
function O_() {
	return R.useContext(D_);
}
B(), Wp(), Kp();
function k_(e) {
	return /*#__PURE__*/ (0, X.jsx)(oh, z({}, e, {
		defaultTheme: Up,
		themeId: Gp
	}));
}
//#endregion
//#region node_modules/@mui/material/InputBase/utils.js
function A_(e) {
	return e != null && !(Array.isArray(e) && e.length === 0);
}
function j_(e, t = !1) {
	return e && (A_(e.value) && e.value !== "" || t && A_(e.defaultValue) && e.defaultValue !== "");
}
function M_(e) {
	return e.startAdornment;
}
bo(), vo();
function N_(e) {
	return ho("MuiInputBase", e);
}
var P_ = H("MuiInputBase", [
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
W(), B(), Ci(), jo(), co(), Eo(), Qp(), _s(), $o(), zm(), km();
var F_ = /* @__PURE__ */ "aria-describedby.autoComplete.autoFocus.className.color.components.componentsProps.defaultValue.disabled.disableInjectingGlobalStyles.endAdornment.error.fullWidth.id.inputComponent.inputProps.inputRef.margin.maxRows.minRows.multiline.name.onBlur.onChange.onClick.onFocus.onKeyDown.onKeyUp.placeholder.readOnly.renderSuffix.rows.size.slotProps.slots.startAdornment.type.value".split("."), I_ = (e, t) => {
	let { ownerState: n } = e;
	return [
		t.root,
		n.formControl && t.formControl,
		n.startAdornment && t.adornedStart,
		n.endAdornment && t.adornedEnd,
		n.error && t.error,
		n.size === "small" && t.sizeSmall,
		n.multiline && t.multiline,
		n.color && t[`color${K(n.color)}`],
		n.fullWidth && t.fullWidth,
		n.hiddenLabel && t.hiddenLabel
	];
}, L_ = (e, t) => {
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
}, R_ = (e) => {
	let { classes: t, color: n, disabled: r, error: i, endAdornment: a, focused: o, formControl: s, fullWidth: c, hiddenLabel: l, multiline: u, readOnly: d, size: f, startAdornment: p, type: m } = e;
	return V({
		root: [
			"root",
			`color${K(n)}`,
			r && "disabled",
			i && "error",
			c && "fullWidth",
			o && "focused",
			s && "formControl",
			f && f !== "medium" && `size${K(f)}`,
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
	}, N_, t);
}, z_ = Y("div", {
	name: "MuiInputBase",
	slot: "Root",
	overridesResolver: I_
})(({ theme: e, ownerState: t }) => z({}, e.typography.body1, {
	color: (e.vars || e).palette.text.primary,
	lineHeight: "1.4375em",
	boxSizing: "border-box",
	position: "relative",
	cursor: "text",
	display: "inline-flex",
	alignItems: "center",
	[`&.${P_.disabled}`]: {
		color: (e.vars || e).palette.text.disabled,
		cursor: "default"
	}
}, t.multiline && z({ padding: "4px 0 5px" }, t.size === "small" && { paddingTop: 1 }), t.fullWidth && { width: "100%" })), B_ = Y("input", {
	name: "MuiInputBase",
	slot: "Input",
	overridesResolver: L_
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light", r = z({ color: "currentColor" }, e.vars ? { opacity: e.vars.opacity.inputPlaceholder } : { opacity: n ? .42 : .5 }, { transition: e.transitions.create("opacity", { duration: e.transitions.duration.shorter }) }), i = { opacity: "0 !important" }, a = e.vars ? { opacity: e.vars.opacity.inputPlaceholder } : { opacity: n ? .42 : .5 };
	return z({
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
		[`label[data-shrink=false] + .${P_.formControl} &`]: {
			"&::-webkit-input-placeholder": i,
			"&::-moz-placeholder": i,
			"&:-ms-input-placeholder": i,
			"&::-ms-input-placeholder": i,
			"&:focus::-webkit-input-placeholder": a,
			"&:focus::-moz-placeholder": a,
			"&:focus:-ms-input-placeholder": a,
			"&:focus::-ms-input-placeholder": a
		},
		[`&.${P_.disabled}`]: {
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
}), V_ = /*#__PURE__*/ (0, X.jsx)(k_, { styles: {
	"@keyframes mui-auto-fill": { from: { display: "block" } },
	"@keyframes mui-auto-fill-cancel": { from: { display: "block" } }
} }), H_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n;
	let r = hs({
		props: e,
		name: "MuiInputBase"
	}), { "aria-describedby": i, autoComplete: a, autoFocus: o, className: s, components: c = {}, componentsProps: l = {}, defaultValue: u, disabled: d, disableInjectingGlobalStyles: f, endAdornment: p, fullWidth: m = !1, id: h, inputComponent: g = "input", inputProps: _ = {}, inputRef: v, maxRows: y, minRows: b, multiline: x = !1, name: S, onBlur: C, onChange: w, onClick: T, onFocus: E, onKeyDown: D, onKeyUp: O, placeholder: k, readOnly: A, renderSuffix: j, rows: ee, slotProps: M = {}, slots: te = {}, startAdornment: ne, type: re = "text", value: N } = r, ie = U(r, F_), P = _.value == null ? N : _.value, { current: ae } = R.useRef(P != null), F = R.useRef(), oe = R.useCallback((e) => {}, []), se = Rm(F, v, _.ref, oe), [ce, le] = R.useState(!1), ue = O_(), de = E_({
		props: r,
		muiFormControl: ue,
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
	de.focused = ue ? ue.focused : ce, R.useEffect(() => {
		!ue && d && ce && (le(!1), C && C());
	}, [
		ue,
		d,
		ce,
		C
	]);
	let fe = ue && ue.onFilled, pe = ue && ue.onEmpty, me = R.useCallback((e) => {
		j_(e) ? fe && fe() : pe && pe();
	}, [fe, pe]);
	Om(() => {
		ae && me({ value: P });
	}, [
		P,
		me,
		ae
	]);
	let he = (e) => {
		if (de.disabled) {
			e.stopPropagation();
			return;
		}
		E && E(e), _.onFocus && _.onFocus(e), ue && ue.onFocus ? ue.onFocus(e) : le(!0);
	}, ge = (e) => {
		C && C(e), _.onBlur && _.onBlur(e), ue && ue.onBlur ? ue.onBlur(e) : le(!1);
	}, _e = (e, ...t) => {
		if (!ae) {
			let t = e.target || F.current;
			if (t == null) throw Error(xi(1));
			me({ value: t.value });
		}
		_.onChange && _.onChange(e, ...t), w && w(e, ...t);
	};
	R.useEffect(() => {
		me(F.current);
	}, []);
	let ve = (e) => {
		F.current && e.currentTarget === e.target && F.current.focus(), T && T(e);
	}, ye = g, be = _;
	x && ye === "input" && (be = z(ee ? {
		type: void 0,
		minRows: ee,
		maxRows: ee
	} : {
		type: void 0,
		maxRows: y,
		minRows: b
	}, be), ye = T_);
	let xe = (e) => {
		me(e.animationName === "mui-auto-fill-cancel" ? F.current : { value: "x" });
	};
	R.useEffect(() => {
		ue && ue.setAdornedStart(!!ne);
	}, [ue, ne]);
	let Se = z({}, r, {
		color: de.color || "primary",
		disabled: de.disabled,
		endAdornment: p,
		error: de.error,
		focused: de.focused,
		formControl: ue,
		fullWidth: m,
		hiddenLabel: de.hiddenLabel,
		multiline: x,
		size: de.size,
		startAdornment: ne,
		type: re
	}), Ce = R_(Se), we = te.root || c.Root || z_, Te = M.root || l.root || {}, Ee = te.input || c.Input || B_;
	return be = z({}, be, (n = M.input) == null ? l.input : n), /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [!f && V_, /*#__PURE__*/ (0, X.jsxs)(we, z({}, Te, !wo(we) && { ownerState: z({}, Se, Te.ownerState) }, {
		ref: t,
		onClick: ve
	}, ie, {
		className: G(Ce.root, Te.className, s, A && "MuiInputBase-readOnly"),
		children: [
			ne,
			/*#__PURE__*/ (0, X.jsx)(D_.Provider, {
				value: null,
				children: /*#__PURE__*/ (0, X.jsx)(Ee, z({
					ownerState: Se,
					"aria-invalid": de.error,
					"aria-describedby": i,
					autoComplete: a,
					autoFocus: o,
					defaultValue: u,
					disabled: de.disabled,
					id: h,
					onAnimationStart: xe,
					name: S,
					placeholder: k,
					readOnly: A,
					required: de.required,
					rows: ee,
					value: P,
					onKeyDown: D,
					onKeyUp: O,
					type: re
				}, be, !wo(Ee) && {
					as: ye,
					ownerState: z({}, Se, be.ownerState)
				}, {
					ref: se,
					className: G(Ce.input, be.className, A && "MuiInputBase-readOnly"),
					onBlur: ge,
					onChange: _e,
					onFocus: he
				}))
			}),
			p,
			j ? j(z({}, de, { startAdornment: ne })) : null
		]
	}))] });
});
B(), bo(), vo();
function U_(e) {
	return ho("MuiInput", e);
}
var W_ = z({}, P_, H("MuiInput", [
	"root",
	"underline",
	"input"
]));
B(), bo(), vo();
function G_(e) {
	return ho("MuiOutlinedInput", e);
}
var K_ = z({}, P_, H("MuiOutlinedInput", [
	"root",
	"notchedOutline",
	"input"
]));
B(), bo(), vo();
function q_(e) {
	return ho("MuiFilledInput", e);
}
var J_ = z({}, P_, H("MuiFilledInput", [
	"root",
	"underline",
	"input"
]));
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/ArrowDropDown.js
pm();
var Y_ = um(/*#__PURE__*/ (0, X.jsx)("path", { d: "M7 10l5 5 5-5z" }), "ArrowDropDown");
B(), W(), Xo(), zm();
var X_ = [
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
], Z_ = {
	entering: { opacity: 1 },
	entered: { opacity: 1 }
}, Q_ = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = Gh(), r = {
		enter: n.transitions.duration.enteringScreen,
		exit: n.transitions.duration.leavingScreen
	}, { addEndListener: i, appear: a = !0, children: o, easing: s, in: c, onEnter: l, onEntered: u, onEntering: d, onExit: f, onExited: p, onExiting: m, style: h, timeout: g = r, TransitionComponent: _ = ug } = e, v = U(e, X_), y = R.useRef(null), b = Rm(y, Jo(o), t), x = (e) => (t) => {
		if (e) {
			let n = y.current;
			t === void 0 ? e(n) : e(n, t);
		}
	}, S = x(d), C = x((e, t) => {
		xg(e);
		let r = Sg({
			style: h,
			timeout: g,
			easing: s
		}, { mode: "enter" });
		e.style.webkitTransition = n.transitions.create("opacity", r), e.style.transition = n.transitions.create("opacity", r), l && l(e, t);
	}), w = x(u), T = x(m), E = x((e) => {
		let t = Sg({
			style: h,
			timeout: g,
			easing: s
		}, { mode: "exit" });
		e.style.webkitTransition = n.transitions.create("opacity", t), e.style.transition = n.transitions.create("opacity", t), f && f(e);
	}), D = x(p);
	return /*#__PURE__*/ (0, X.jsx)(_, z({
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
	}, v, { children: (e, t) => /*#__PURE__*/ R.cloneElement(o, z({
		style: z({
			opacity: 0,
			visibility: e === "exited" && !c ? "hidden" : void 0
		}, Z_[e], h, o.props.style),
		ref: b
	}, t)) }));
});
bo(), vo();
function $_(e) {
	return ho("MuiBackdrop", e);
}
H("MuiBackdrop", ["root", "invisible"]), W(), B(), jo(), co(), Qp(), _s();
var ev = [
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
], tv = (e) => {
	let { classes: t, invisible: n } = e;
	return V({ root: ["root", n && "invisible"] }, $_, t);
}, nv = Y("div", {
	name: "MuiBackdrop",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.root, n.invisible && t.invisible];
	}
})(({ ownerState: e }) => z({
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
}, e.invisible && { backgroundColor: "transparent" })), rv = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i;
	let a = hs({
		props: e,
		name: "MuiBackdrop"
	}), { children: o, className: s, component: c = "div", components: l = {}, componentsProps: u = {}, invisible: d = !1, open: f, slotProps: p = {}, slots: m = {}, TransitionComponent: h = Q_, transitionDuration: g } = a, _ = U(a, ev), v = z({}, a, {
		component: c,
		invisible: d
	}), y = tv(v), b = (n = p.root) == null ? u.root : n;
	return /*#__PURE__*/ (0, X.jsx)(h, z({
		in: f,
		timeout: g
	}, _, { children: /*#__PURE__*/ (0, X.jsx)(nv, z({ "aria-hidden": !0 }, b, {
		as: (r = (i = m.root) == null ? l.Root : i) == null ? c : r,
		className: G(y.root, s, b == null ? void 0 : b.className),
		ownerState: z({}, v, b == null ? void 0 : b.ownerState),
		classes: y,
		ref: t,
		children: o
	})) }));
});
//#endregion
//#region node_modules/@mui/material/Box/boxClasses.js
bo();
var iv = H("MuiBox", ["root"]);
po(), Hp(), Kp();
var av = Bp(), Q = ch({
	themeId: Gp,
	defaultTheme: av,
	defaultClassName: iv.root,
	generateClassName: fo.generate
});
bo(), vo();
function ov(e) {
	return ho("MuiButton", e);
}
var sv = H("MuiButton", /* @__PURE__ */ "root.text.textInherit.textPrimary.textSecondary.textSuccess.textError.textInfo.textWarning.outlined.outlinedInherit.outlinedPrimary.outlinedSecondary.outlinedSuccess.outlinedError.outlinedInfo.outlinedWarning.contained.containedInherit.containedPrimary.containedSecondary.containedSuccess.containedError.containedInfo.containedWarning.disableElevation.focusVisible.disabled.colorInherit.colorPrimary.colorSecondary.colorSuccess.colorError.colorInfo.colorWarning.textSizeSmall.textSizeMedium.textSizeLarge.outlinedSizeSmall.outlinedSizeMedium.outlinedSizeLarge.containedSizeSmall.containedSizeMedium.containedSizeLarge.sizeMedium.sizeSmall.sizeLarge.fullWidth.startIcon.endIcon.icon.iconSizeSmall.iconSizeMedium.iconSizeLarge".split(".")), cv = /*#__PURE__*/ R.createContext({}), lv = /*#__PURE__*/ R.createContext(void 0);
W(), B(), jo(), oo(), co(), Qp(), _s(), $o();
var uv = [
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
], dv = (e) => {
	let { color: t, disableElevation: n, fullWidth: r, size: i, variant: a, classes: o } = e, s = V({
		root: [
			"root",
			a,
			`${a}${K(t)}`,
			`size${K(i)}`,
			`${a}Size${K(i)}`,
			`color${K(t)}`,
			n && "disableElevation",
			r && "fullWidth"
		],
		label: ["label"],
		startIcon: [
			"icon",
			"startIcon",
			`iconSize${K(i)}`
		],
		endIcon: [
			"icon",
			"endIcon",
			`iconSize${K(i)}`
		]
	}, ov, o);
	return z({}, o, s);
}, fv = (e) => z({}, e.size === "small" && { "& > *:nth-of-type(1)": { fontSize: 18 } }, e.size === "medium" && { "& > *:nth-of-type(1)": { fontSize: 20 } }, e.size === "large" && { "& > *:nth-of-type(1)": { fontSize: 22 } }), pv = Y(Yg, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiButton",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[n.variant],
			t[`${n.variant}${K(n.color)}`],
			t[`size${K(n.size)}`],
			t[`${n.variant}Size${K(n.size)}`],
			n.color === "inherit" && t.colorInherit,
			n.disableElevation && t.disableElevation,
			n.fullWidth && t.fullWidth
		];
	}
})(({ theme: e, ownerState: t }) => {
	var n, r;
	let i = e.palette.mode === "light" ? e.palette.grey[300] : e.palette.grey[800], a = e.palette.mode === "light" ? e.palette.grey.A100 : e.palette.grey[700];
	return z({}, e.typography.button, {
		minWidth: 64,
		padding: "6px 16px",
		borderRadius: (e.vars || e).shape.borderRadius,
		transition: e.transitions.create([
			"background-color",
			"box-shadow",
			"border-color",
			"color"
		], { duration: e.transitions.duration.short }),
		"&:hover": z({
			textDecoration: "none",
			backgroundColor: e.vars ? `rgba(${e.vars.palette.text.primaryChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(e.palette.text.primary, e.palette.action.hoverOpacity),
			"@media (hover: none)": { backgroundColor: "transparent" }
		}, t.variant === "text" && t.color !== "inherit" && {
			backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity),
			"@media (hover: none)": { backgroundColor: "transparent" }
		}, t.variant === "outlined" && t.color !== "inherit" && {
			border: `1px solid ${(e.vars || e).palette[t.color].main}`,
			backgroundColor: e.vars ? `rgba(${e.vars.palette[t.color].mainChannel} / ${e.vars.palette.action.hoverOpacity})` : (0, wg.alpha)(e.palette[t.color].main, e.palette.action.hoverOpacity),
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
		"&:active": z({}, t.variant === "contained" && { boxShadow: (e.vars || e).shadows[8] }),
		[`&.${sv.focusVisible}`]: z({}, t.variant === "contained" && { boxShadow: (e.vars || e).shadows[6] }),
		[`&.${sv.disabled}`]: z({ color: (e.vars || e).palette.action.disabled }, t.variant === "outlined" && { border: `1px solid ${(e.vars || e).palette.action.disabledBackground}` }, t.variant === "contained" && {
			color: (e.vars || e).palette.action.disabled,
			boxShadow: (e.vars || e).shadows[0],
			backgroundColor: (e.vars || e).palette.action.disabledBackground
		})
	}, t.variant === "text" && { padding: "6px 8px" }, t.variant === "text" && t.color !== "inherit" && { color: (e.vars || e).palette[t.color].main }, t.variant === "outlined" && {
		padding: "5px 15px",
		border: "1px solid currentColor"
	}, t.variant === "outlined" && t.color !== "inherit" && {
		color: (e.vars || e).palette[t.color].main,
		border: e.vars ? `1px solid rgba(${e.vars.palette[t.color].mainChannel} / 0.5)` : `1px solid ${(0, wg.alpha)(e.palette[t.color].main, .5)}`
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
	[`&.${sv.focusVisible}`]: { boxShadow: "none" },
	"&:active": { boxShadow: "none" },
	[`&.${sv.disabled}`]: { boxShadow: "none" }
}), mv = Y("span", {
	name: "MuiButton",
	slot: "StartIcon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.startIcon, t[`iconSize${K(n.size)}`]];
	}
})(({ ownerState: e }) => z({
	display: "inherit",
	marginRight: 8,
	marginLeft: -4
}, e.size === "small" && { marginLeft: -2 }, fv(e))), hv = Y("span", {
	name: "MuiButton",
	slot: "EndIcon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.endIcon, t[`iconSize${K(n.size)}`]];
	}
})(({ ownerState: e }) => z({
	display: "inherit",
	marginRight: -4,
	marginLeft: 8
}, e.size === "small" && { marginRight: -2 }, fv(e))), gv = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = R.useContext(cv), r = R.useContext(lv), i = hs({
		props: io(n, e),
		name: "MuiButton"
	}), { children: a, color: o = "primary", component: s = "button", className: c, disabled: l = !1, disableElevation: u = !1, disableFocusRipple: d = !1, endIcon: f, focusVisibleClassName: p, fullWidth: m = !1, size: h = "medium", startIcon: g, type: _, variant: v = "text" } = i, y = U(i, uv), b = z({}, i, {
		color: o,
		component: s,
		disabled: l,
		disableElevation: u,
		disableFocusRipple: d,
		fullWidth: m,
		size: h,
		type: _,
		variant: v
	}), x = dv(b), S = g && /*#__PURE__*/ (0, X.jsx)(mv, {
		className: x.startIcon,
		ownerState: b,
		children: g
	}), C = f && /*#__PURE__*/ (0, X.jsx)(hv, {
		className: x.endIcon,
		ownerState: b,
		children: f
	}), w = r || "";
	return /*#__PURE__*/ (0, X.jsxs)(pv, z({
		ownerState: b,
		className: G(n.className, x.root, c, w),
		component: s,
		disabled: l,
		focusRipple: !d,
		focusVisibleClassName: G(x.focusVisible, p),
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
bo(), vo();
function _v(e) {
	return ho("MuiCard", e);
}
H("MuiCard", ["root"]), B(), W(), jo(), co(), Qp(), _s();
var vv = ["className", "raised"], yv = (e) => {
	let { classes: t } = e;
	return V({ root: ["root"] }, _v, t);
}, bv = Y(Og, {
	name: "MuiCard",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(() => ({ overflow: "hidden" })), xv = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiCard"
	}), { className: r, raised: i = !1 } = n, a = U(n, vv), o = z({}, n, { raised: i }), s = yv(o);
	return /*#__PURE__*/ (0, X.jsx)(bv, z({
		className: G(s.root, r),
		elevation: i ? 8 : void 0,
		ref: t,
		ownerState: o
	}, a));
});
bo(), vo();
function Sv(e) {
	return ho("MuiCardActionArea", e);
}
var Cv = H("MuiCardActionArea", [
	"root",
	"focusVisible",
	"focusHighlight"
]);
B(), W(), jo(), co(), _s(), Qp();
var wv = [
	"children",
	"className",
	"focusVisibleClassName"
], Tv = (e) => {
	let { classes: t } = e;
	return V({
		root: ["root"],
		focusHighlight: ["focusHighlight"]
	}, Sv, t);
}, Ev = Y(Yg, {
	name: "MuiCardActionArea",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(({ theme: e }) => ({
	display: "block",
	textAlign: "inherit",
	borderRadius: "inherit",
	width: "100%",
	[`&:hover .${Cv.focusHighlight}`]: {
		opacity: (e.vars || e).palette.action.hoverOpacity,
		"@media (hover: none)": { opacity: 0 }
	},
	[`&.${Cv.focusVisible} .${Cv.focusHighlight}`]: { opacity: (e.vars || e).palette.action.focusOpacity }
})), Dv = Y("span", {
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
})), Ov = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiCardActionArea"
	}), { children: r, className: i, focusVisibleClassName: a } = n, o = U(n, wv), s = n, c = Tv(s);
	return /*#__PURE__*/ (0, X.jsxs)(Ev, z({
		className: G(c.root, i),
		focusVisibleClassName: G(a, c.focusVisible),
		ref: t,
		ownerState: s
	}, o, { children: [r, /*#__PURE__*/ (0, X.jsx)(Dv, {
		className: c.focusHighlight,
		ownerState: s
	})] }));
});
bo(), vo();
function kv(e) {
	return ho("MuiCardContent", e);
}
H("MuiCardContent", ["root"]), B(), W(), jo(), co(), Qp(), _s();
var Av = ["className", "component"], jv = (e) => {
	let { classes: t } = e;
	return V({ root: ["root"] }, kv, t);
}, Mv = Y("div", {
	name: "MuiCardContent",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})(() => ({
	padding: 16,
	"&:last-child": { paddingBottom: 24 }
})), Nv = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiCardContent"
	}), { className: r, component: i = "div" } = n, a = U(n, Av), o = z({}, n, { component: i }), s = jv(o);
	return /*#__PURE__*/ (0, X.jsx)(Mv, z({
		as: i,
		className: G(s.root, r),
		ownerState: o,
		ref: t
	}, a));
});
bo(), vo();
function Pv(e) {
	return ho("MuiCircularProgress", e);
}
H("MuiCircularProgress", [
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
]), W(), B(), jo(), co(), Ll(), $o(), _s(), Qp();
var Fv = [
	"className",
	"color",
	"disableShrink",
	"size",
	"style",
	"thickness",
	"value",
	"variant"
], Iv = (e) => e, Lv, Rv, zv, Bv, Vv = 44, Hv = Nl(Lv || (Lv = Iv`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`)), Uv = Nl(Rv || (Rv = Iv`
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
`)), Wv = (e) => {
	let { classes: t, variant: n, color: r, disableShrink: i } = e;
	return V({
		root: [
			"root",
			n,
			`color${K(r)}`
		],
		svg: ["svg"],
		circle: [
			"circle",
			`circle${K(n)}`,
			i && "circleDisableShrink"
		]
	}, Pv, t);
}, Gv = Y("span", {
	name: "MuiCircularProgress",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[n.variant],
			t[`color${K(n.color)}`]
		];
	}
})(({ ownerState: e, theme: t }) => z({ display: "inline-block" }, e.variant === "determinate" && { transition: t.transitions.create("transform") }, e.color !== "inherit" && { color: (t.vars || t).palette[e.color].main }), ({ ownerState: e }) => e.variant === "indeterminate" && Ml(zv || (zv = Iv`
      animation: ${0} 1.4s linear infinite;
    `), Hv)), Kv = Y("svg", {
	name: "MuiCircularProgress",
	slot: "Svg",
	overridesResolver: (e, t) => t.svg
})({ display: "block" }), qv = Y("circle", {
	name: "MuiCircularProgress",
	slot: "Circle",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.circle,
			t[`circle${K(n.variant)}`],
			n.disableShrink && t.circleDisableShrink
		];
	}
})(({ ownerState: e, theme: t }) => z({ stroke: "currentColor" }, e.variant === "determinate" && { transition: t.transitions.create("stroke-dashoffset") }, e.variant === "indeterminate" && {
	strokeDasharray: "80px, 200px",
	strokeDashoffset: 0
}), ({ ownerState: e }) => e.variant === "indeterminate" && !e.disableShrink && Ml(Bv || (Bv = Iv`
      animation: ${0} 1.4s ease-in-out infinite;
    `), Uv)), Jv = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiCircularProgress"
	}), { className: r, color: i = "primary", disableShrink: a = !1, size: o = 40, style: s, thickness: c = 3.6, value: l = 0, variant: u = "indeterminate" } = n, d = U(n, Fv), f = z({}, n, {
		color: i,
		disableShrink: a,
		size: o,
		thickness: c,
		value: l,
		variant: u
	}), p = Wv(f), m = {}, h = {}, g = {};
	if (u === "determinate") {
		let e = 2 * Math.PI * ((Vv - c) / 2);
		m.strokeDasharray = e.toFixed(3), g["aria-valuenow"] = Math.round(l), m.strokeDashoffset = `${((100 - l) / 100 * e).toFixed(3)}px`, h.transform = "rotate(-90deg)";
	}
	return /*#__PURE__*/ (0, X.jsx)(Gv, z({
		className: G(p.root, r),
		style: z({
			width: o,
			height: o
		}, h, s),
		ownerState: f,
		ref: t,
		role: "progressbar"
	}, g, d, { children: /*#__PURE__*/ (0, X.jsx)(Kv, {
		className: p.svg,
		ownerState: f,
		viewBox: `${Vv / 2} ${Vv / 2} ${Vv} ${Vv}`,
		children: /*#__PURE__*/ (0, X.jsx)(qv, {
			className: p.circle,
			style: m,
			ownerState: f,
			cx: Vv,
			cy: Vv,
			r: (Vv - c) / 2,
			fill: "none",
			strokeWidth: c
		})
	}) }));
});
//#endregion
//#region node_modules/@mui/material/Modal/ModalManager.js
Qo();
function Yv(e) {
	let t = Hi(e);
	return t.body === e ? Gi(e).innerWidth > t.documentElement.clientWidth : e.scrollHeight > e.clientHeight;
}
function Xv(e, t) {
	t ? e.setAttribute("aria-hidden", "true") : e.removeAttribute("aria-hidden");
}
function Zv(e) {
	return parseInt(Gi(e).getComputedStyle(e).paddingRight, 10) || 0;
}
function Qv(e) {
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
function $v(e, t, n, r, i) {
	let a = [
		t,
		n,
		...r
	];
	[].forEach.call(e.children, (e) => {
		let t = a.indexOf(e) === -1, n = !Qv(e);
		t && n && Xv(e, i);
	});
}
function ey(e, t) {
	let n = -1;
	return e.some((e, r) => t(e) ? (n = r, !0) : !1), n;
}
function ty(e, t) {
	let n = [], r = e.container;
	if (!t.disableScrollLock) {
		if (Yv(r)) {
			let e = Qa(Hi(r));
			n.push({
				value: r.style.paddingRight,
				property: "padding-right",
				el: r
			}), r.style.paddingRight = `${Zv(r) + e}px`;
			let t = Hi(r).querySelectorAll(".mui-fixed");
			[].forEach.call(t, (t) => {
				n.push({
					value: t.style.paddingRight,
					property: "padding-right",
					el: t
				}), t.style.paddingRight = `${Zv(t) + e}px`;
			});
		}
		let e;
		if (r.parentNode instanceof DocumentFragment) e = Hi(r).body;
		else {
			let t = r.parentElement, n = Gi(r);
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
function ny(e) {
	let t = [];
	return [].forEach.call(e.children, (e) => {
		e.getAttribute("aria-hidden") === "true" && t.push(e);
	}), t;
}
var ry = class {
	constructor() {
		this.containers = void 0, this.modals = void 0, this.modals = [], this.containers = [];
	}
	add(e, t) {
		let n = this.modals.indexOf(e);
		if (n !== -1) return n;
		n = this.modals.length, this.modals.push(e), e.modalRef && Xv(e.modalRef, !1);
		let r = ny(t);
		$v(t, e.mount, e.modalRef, r, !0);
		let i = ey(this.containers, (e) => e.container === t);
		return i === -1 ? (this.containers.push({
			modals: [e],
			container: t,
			restore: null,
			hiddenSiblings: r
		}), n) : (this.containers[i].modals.push(e), n);
	}
	mount(e, t) {
		let n = ey(this.containers, (t) => t.modals.indexOf(e) !== -1), r = this.containers[n];
		r.restore || (r.restore = ty(r, t));
	}
	remove(e, t = !0) {
		let n = this.modals.indexOf(e);
		if (n === -1) return n;
		let r = ey(this.containers, (t) => t.modals.indexOf(e) !== -1), i = this.containers[r];
		if (i.modals.splice(i.modals.indexOf(e), 1), this.modals.splice(n, 1), i.modals.length === 0) i.restore && i.restore(), e.modalRef && Xv(e.modalRef, t), $v(i.container, e.mount, e.modalRef, i.hiddenSiblings, !1), this.containers.splice(r, 1);
		else {
			let e = i.modals[i.modals.length - 1];
			e.modalRef && Xv(e.modalRef, !1);
		}
		return n;
	}
	isTopModal(e) {
		return this.modals.length > 0 && this.modals[this.modals.length - 1] === e;
	}
};
//#endregion
//#region node_modules/@mui/material/Unstable_TrapFocus/FocusTrap.js
Qo();
var iy = [
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
function ay(e) {
	let t = parseInt(e.getAttribute("tabindex") || "", 10);
	return Number.isNaN(t) ? e.contentEditable === "true" || (e.nodeName === "AUDIO" || e.nodeName === "VIDEO" || e.nodeName === "DETAILS") && e.getAttribute("tabindex") === null ? 0 : e.tabIndex : t;
}
function oy(e) {
	if (e.tagName !== "INPUT" || e.type !== "radio" || !e.name) return !1;
	let t = (t) => e.ownerDocument.querySelector(`input[type="radio"]${t}`), n = t(`[name="${e.name}"]:checked`);
	return n || (n = t(`[name="${e.name}"]`)), n !== e;
}
function sy(e) {
	return !(e.disabled || e.tagName === "INPUT" && e.type === "hidden" || oy(e));
}
function cy(e) {
	let t = [], n = [];
	return Array.from(e.querySelectorAll(iy)).forEach((e, r) => {
		let i = ay(e);
		i !== -1 && sy(e) && (i === 0 ? t.push(e) : n.push({
			documentOrder: r,
			tabIndex: i,
			node: e
		}));
	}), n.sort((e, t) => e.tabIndex === t.tabIndex ? e.documentOrder - t.documentOrder : e.tabIndex - t.tabIndex).map((e) => e.node).concat(t);
}
function ly() {
	return !0;
}
function uy(e) {
	let { children: t, disableAutoFocus: n = !1, disableEnforceFocus: r = !1, disableRestoreFocus: i = !1, getTabbable: a = cy, isEnabled: o = ly, open: s } = e, c = R.useRef(!1), l = R.useRef(null), u = R.useRef(null), d = R.useRef(null), f = R.useRef(null), p = R.useRef(!1), m = R.useRef(null), h = Sa(Jo(t), m), g = R.useRef(null);
	R.useEffect(() => {
		s && m.current && (p.current = !n);
	}, [n, s]), R.useEffect(() => {
		if (!s || !m.current) return;
		let e = Hi(m.current);
		return m.current.contains(e.activeElement) || (m.current.hasAttribute("tabIndex") || m.current.setAttribute("tabIndex", "-1"), p.current && m.current.focus()), () => {
			i || (d.current && d.current.focus && (c.current = !0, d.current.focus()), d.current = null);
		};
	}, [s]), R.useEffect(() => {
		if (!s || !m.current) return;
		let e = Hi(m.current), t = (t) => {
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
	return /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [
		/*#__PURE__*/ (0, X.jsx)("div", {
			tabIndex: s ? 0 : -1,
			onFocus: v,
			ref: l,
			"data-testid": "sentinelStart"
		}),
		/*#__PURE__*/ R.cloneElement(t, {
			ref: h,
			onFocus: _
		}),
		/*#__PURE__*/ (0, X.jsx)("div", {
			tabIndex: s ? 0 : -1,
			onFocus: v,
			ref: u,
			"data-testid": "sentinelEnd"
		})
	] });
}
B(), Qo(), Po();
function dy(e) {
	return typeof e == "function" ? e() : e;
}
function fy(e) {
	return e ? e.props.hasOwnProperty("in") : !1;
}
var py = new ry();
function my(e) {
	let { container: t, disableEscapeKeyDown: n = !1, disableScrollLock: r = !1, manager: i = py, closeAfterTransition: a = !1, onTransitionEnter: o, onTransitionExited: s, children: c, onClose: l, open: u, rootRef: d } = e, f = R.useRef({}), p = R.useRef(null), m = R.useRef(null), h = Sa(m, d), [g, _] = R.useState(!u), v = fy(c), y = !0;
	(e["aria-hidden"] === "false" || e["aria-hidden"] === !1) && (y = !1);
	let b = () => Hi(p.current), x = () => (f.current.modalRef = m.current, f.current.mount = p.current, f.current), S = () => {
		i.mount(x(), { disableScrollLock: r }), m.current && (m.current.scrollTop = 0);
	}, C = va(() => {
		let e = dy(t) || b().body;
		i.add(x(), e), m.current && S();
	}), w = R.useCallback(() => i.isTopModal(x()), [i]), T = va((e) => {
		p.current = e, e && (u && w() ? S() : m.current && Xv(m.current, y));
	}), E = R.useCallback(() => {
		i.remove(x(), y);
	}, [y, i]);
	R.useEffect(() => () => {
		E();
	}, [E]), R.useEffect(() => {
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
			let n = Mo(e);
			delete n.onTransitionEnter, delete n.onTransitionExited;
			let r = z({}, n, t);
			return z({ role: "presentation" }, r, {
				onKeyDown: D(r),
				ref: h
			});
		},
		getBackdropProps: (e = {}) => {
			let t = e;
			return z({ "aria-hidden": !0 }, t, {
				onClick: O(t),
				open: u
			});
		},
		getTransitionProps: () => ({
			onEnter: ki(() => {
				_(!1), o && o();
			}, c == null ? void 0 : c.props.onEnter),
			onExited: ki(() => {
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
bo(), vo();
function hy(e) {
	return ho("MuiModal", e);
}
H("MuiModal", [
	"root",
	"hidden",
	"backdrop"
]), W(), B(), jo(), co(), qo(), Qp(), _s();
var gy = /* @__PURE__ */ "BackdropComponent.BackdropProps.classes.className.closeAfterTransition.children.container.component.components.componentsProps.disableAutoFocus.disableEnforceFocus.disableEscapeKeyDown.disablePortal.disableRestoreFocus.disableScrollLock.hideBackdrop.keepMounted.onBackdropClick.onClose.onTransitionEnter.onTransitionExited.open.slotProps.slots.theme".split("."), _y = (e) => {
	let { open: t, exited: n, classes: r } = e;
	return V({
		root: ["root", !t && n && "hidden"],
		backdrop: ["backdrop"]
	}, hy, r);
}, vy = Y("div", {
	name: "MuiModal",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.root, !n.open && n.exited && t.hidden];
	}
})(({ theme: e, ownerState: t }) => z({
	position: "fixed",
	zIndex: (e.vars || e).zIndex.modal,
	right: 0,
	bottom: 0,
	top: 0,
	left: 0
}, !t.open && t.exited && { visibility: "hidden" })), yy = Y(rv, {
	name: "MuiModal",
	slot: "Backdrop",
	overridesResolver: (e, t) => t.backdrop
})({ zIndex: -1 }), by = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i, a, o, s;
	let c = hs({
		name: "MuiModal",
		props: e
	}), { BackdropComponent: l = yy, BackdropProps: u, className: d, closeAfterTransition: f = !1, children: p, container: m, component: h, components: g = {}, componentsProps: _ = {}, disableAutoFocus: v = !1, disableEnforceFocus: y = !1, disableEscapeKeyDown: b = !1, disablePortal: x = !1, disableRestoreFocus: S = !1, disableScrollLock: C = !1, hideBackdrop: w = !1, keepMounted: T = !1, onBackdropClick: E, open: D, slotProps: O, slots: k } = c, A = U(c, gy), j = z({}, c, {
		closeAfterTransition: f,
		disableAutoFocus: v,
		disableEnforceFocus: y,
		disableEscapeKeyDown: b,
		disablePortal: x,
		disableRestoreFocus: S,
		disableScrollLock: C,
		hideBackdrop: w,
		keepMounted: T
	}), { getRootProps: ee, getBackdropProps: M, getTransitionProps: te, portalRef: ne, isTopModal: re, exited: N, hasTransition: ie } = my(z({}, j, { rootRef: t })), P = z({}, j, { exited: N }), ae = _y(P), F = {};
	if (p.props.tabIndex === void 0 && (F.tabIndex = "-1"), ie) {
		let { onEnter: e, onExited: t } = te();
		F.onEnter = e, F.onExited = t;
	}
	let oe = (n = (r = k == null ? void 0 : k.root) == null ? g.Root : r) == null ? vy : n, se = (i = (a = k == null ? void 0 : k.backdrop) == null ? g.Backdrop : a) == null ? l : i, ce = (o = O == null ? void 0 : O.root) == null ? _.root : o, le = (s = O == null ? void 0 : O.backdrop) == null ? _.backdrop : s, ue = Wo({
		elementType: oe,
		externalSlotProps: ce,
		externalForwardedProps: A,
		getSlotProps: ee,
		additionalProps: {
			ref: t,
			as: h
		},
		ownerState: P,
		className: G(d, ce == null ? void 0 : ce.className, ae == null ? void 0 : ae.root, !P.open && P.exited && (ae == null ? void 0 : ae.hidden))
	}), de = Wo({
		elementType: se,
		externalSlotProps: le,
		additionalProps: u,
		getSlotProps: (e) => M(z({}, e, { onClick: (t) => {
			E && E(t), e != null && e.onClick && e.onClick(t);
		} })),
		className: G(le == null ? void 0 : le.className, u == null ? void 0 : u.className, ae == null ? void 0 : ae.backdrop),
		ownerState: P
	});
	return !T && !D && (!ie || N) ? null : /*#__PURE__*/ (0, X.jsx)(u_, {
		ref: ne,
		container: m,
		disablePortal: x,
		children: /*#__PURE__*/ (0, X.jsxs)(oe, z({}, ue, { children: [!w && l ? /*#__PURE__*/ (0, X.jsx)(se, z({}, de)) : null, /*#__PURE__*/ (0, X.jsx)(uy, {
			disableEnforceFocus: y,
			disableAutoFocus: v,
			disableRestoreFocus: S,
			isEnabled: re,
			open: D,
			children: /*#__PURE__*/ R.cloneElement(p, F)
		})] }))
	});
});
bo(), vo();
function xy(e) {
	return ho("MuiDivider", e);
}
H("MuiDivider", [
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
]), W(), B(), jo(), co(), Qp(), _s();
var Sy = [
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
], Cy = (e) => {
	let { absolute: t, children: n, classes: r, flexItem: i, light: a, orientation: o, textAlign: s, variant: c } = e;
	return V({
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
	}, xy, r);
}, wy = Y("div", {
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
})(({ theme: e, ownerState: t }) => z({
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
}, t.light && { borderColor: e.vars ? `rgba(${e.vars.palette.dividerChannel} / 0.08)` : (0, wg.alpha)(e.palette.divider, .08) }, t.variant === "inset" && { marginLeft: 72 }, t.variant === "middle" && t.orientation === "horizontal" && {
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
}), ({ ownerState: e }) => z({}, e.children && {
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
}), ({ theme: e, ownerState: t }) => z({}, t.children && t.orientation !== "vertical" && { "&::before, &::after": {
	width: "100%",
	borderTop: `thin solid ${(e.vars || e).palette.divider}`,
	borderTopStyle: "inherit"
} }), ({ theme: e, ownerState: t }) => z({}, t.children && t.orientation === "vertical" && {
	flexDirection: "column",
	"&::before, &::after": {
		height: "100%",
		borderLeft: `thin solid ${(e.vars || e).palette.divider}`,
		borderLeftStyle: "inherit"
	}
}), ({ ownerState: e }) => z({}, e.textAlign === "right" && e.orientation !== "vertical" && {
	"&::before": { width: "90%" },
	"&::after": { width: "10%" }
}, e.textAlign === "left" && e.orientation !== "vertical" && {
	"&::before": { width: "10%" },
	"&::after": { width: "90%" }
})), Ty = Y("span", {
	name: "MuiDivider",
	slot: "Wrapper",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.wrapper, n.orientation === "vertical" && t.wrapperVertical];
	}
})(({ theme: e, ownerState: t }) => z({
	display: "inline-block",
	paddingLeft: `calc(${e.spacing(1)} * 1.2)`,
	paddingRight: `calc(${e.spacing(1)} * 1.2)`
}, t.orientation === "vertical" && {
	paddingTop: `calc(${e.spacing(1)} * 1.2)`,
	paddingBottom: `calc(${e.spacing(1)} * 1.2)`
})), Ey = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiDivider"
	}), { absolute: r = !1, children: i, className: a, component: o = i ? "div" : "hr", flexItem: s = !1, light: c = !1, orientation: l = "horizontal", role: u = o === "hr" ? void 0 : "separator", textAlign: d = "center", variant: f = "fullWidth" } = n, p = U(n, Sy), m = z({}, n, {
		absolute: r,
		component: o,
		flexItem: s,
		light: c,
		orientation: l,
		role: u,
		textAlign: d,
		variant: f
	}), h = Cy(m);
	return /*#__PURE__*/ (0, X.jsx)(wy, z({
		as: o,
		className: G(h.root, a),
		role: u,
		ref: t,
		ownerState: m
	}, p, { children: i ? /*#__PURE__*/ (0, X.jsx)(Ty, {
		className: h.wrapper,
		ownerState: m,
		children: i
	}) : null }));
});
Ey.muiSkipListHighlight = !0, W(), B(), bi(), co(), Qp(), _s();
var Dy = [
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
], Oy = (e) => {
	let { classes: t, disableUnderline: n } = e, r = V({
		root: ["root", !n && "underline"],
		input: ["input"]
	}, q_, t);
	return z({}, t, r);
}, ky = Y(z_, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiFilledInput",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [...I_(e, t), !n.disableUnderline && t.underline];
	}
})(({ theme: e, ownerState: t }) => {
	var n;
	let r = e.palette.mode === "light", i = r ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)", a = r ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.09)", o = r ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.13)", s = r ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
	return z({
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
		[`&.${J_.focused}`]: { backgroundColor: e.vars ? e.vars.palette.FilledInput.bg : a },
		[`&.${J_.disabled}`]: { backgroundColor: e.vars ? e.vars.palette.FilledInput.disabledBg : s }
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
		[`&.${J_.focused}:after`]: { transform: "scaleX(1) translateX(0)" },
		[`&.${J_.error}`]: { "&::before, &::after": { borderBottomColor: (e.vars || e).palette.error.main } },
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
		[`&:hover:not(.${J_.disabled}, .${J_.error}):before`]: { borderBottom: `1px solid ${(e.vars || e).palette.text.primary}` },
		[`&.${J_.disabled}:before`]: { borderBottomStyle: "dotted" }
	}, t.startAdornment && { paddingLeft: 12 }, t.endAdornment && { paddingRight: 12 }, t.multiline && z({ padding: "25px 12px 8px" }, t.size === "small" && {
		paddingTop: 21,
		paddingBottom: 4
	}, t.hiddenLabel && {
		paddingTop: 16,
		paddingBottom: 17
	}, t.hiddenLabel && t.size === "small" && {
		paddingTop: 8,
		paddingBottom: 9
	}));
}), Ay = Y(B_, {
	name: "MuiFilledInput",
	slot: "Input",
	overridesResolver: L_
})(({ theme: e, ownerState: t }) => z({
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
})), jy = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i, a;
	let o = hs({
		props: e,
		name: "MuiFilledInput"
	}), { components: s = {}, componentsProps: c, fullWidth: l = !1, inputComponent: u = "input", multiline: d = !1, slotProps: f, slots: p = {}, type: m = "text" } = o, h = U(o, Dy), g = z({}, o, {
		fullWidth: l,
		inputComponent: u,
		multiline: d,
		type: m
	}), _ = Oy(o), v = {
		root: { ownerState: g },
		input: { ownerState: g }
	}, y = (f == null ? c : f) ? _i(v, f == null ? c : f) : v, b = (n = (r = p.root) == null ? s.Root : r) == null ? ky : n, x = (i = (a = p.input) == null ? s.Input : a) == null ? Ay : i;
	return /*#__PURE__*/ (0, X.jsx)(H_, z({
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
jy.muiName = "Input", bo(), vo();
function My(e) {
	return ho("MuiFormControl", e);
}
H("MuiFormControl", [
	"root",
	"marginNone",
	"marginNormal",
	"marginDense",
	"fullWidth",
	"disabled"
]), W(), B(), jo(), co(), _s(), Qp(), $o(), ym();
var Ny = [
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
], Py = (e) => {
	let { classes: t, margin: n, fullWidth: r } = e;
	return V({ root: [
		"root",
		n !== "none" && `margin${K(n)}`,
		r && "fullWidth"
	] }, My, t);
}, Fy = Y("div", {
	name: "MuiFormControl",
	slot: "Root",
	overridesResolver: ({ ownerState: e }, t) => z({}, t.root, t[`margin${K(e.margin)}`], e.fullWidth && t.fullWidth)
})(({ ownerState: e }) => z({
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
}, e.fullWidth && { width: "100%" })), Iy = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiFormControl"
	}), { children: r, className: i, color: a = "primary", component: o = "div", disabled: s = !1, error: c = !1, focused: l, fullWidth: u = !1, hiddenLabel: d = !1, margin: f = "none", required: p = !1, size: m = "medium", variant: h = "outlined" } = n, g = U(n, Ny), _ = z({}, n, {
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
	}), v = Py(_), [y, b] = R.useState(() => {
		let e = !1;
		return r && R.Children.forEach(r, (t) => {
			if (!vm(t, ["Input", "Select"])) return;
			let n = vm(t, ["Select"]) ? t.props.input : t;
			n && M_(n.props) && (e = !0);
		}), e;
	}), [x, S] = R.useState(() => {
		let e = !1;
		return r && R.Children.forEach(r, (t) => {
			vm(t, ["Input", "Select"]) && (j_(t.props, !0) || j_(t.props.inputProps, !0)) && (e = !0);
		}), e;
	}), [C, w] = R.useState(!1);
	s && C && w(!1);
	let T = l !== void 0 && !s ? l : C, E, D = R.useMemo(() => ({
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
	return /*#__PURE__*/ (0, X.jsx)(D_.Provider, {
		value: D,
		children: /*#__PURE__*/ (0, X.jsx)(Fy, z({
			as: o,
			ownerState: _,
			className: G(v.root, i),
			ref: t
		}, g, { children: r }))
	});
});
bo(), vo();
function Ly(e) {
	return ho("MuiFormHelperText", e);
}
var Ry = H("MuiFormHelperText", [
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
W(), B(), jo(), co(), Qp(), $o(), _s();
var zy, By = [
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
], Vy = (e) => {
	let { classes: t, contained: n, size: r, disabled: i, error: a, filled: o, focused: s, required: c } = e;
	return V({ root: [
		"root",
		i && "disabled",
		a && "error",
		r && `size${K(r)}`,
		n && "contained",
		s && "focused",
		o && "filled",
		c && "required"
	] }, Ly, t);
}, Hy = Y("p", {
	name: "MuiFormHelperText",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			n.size && t[`size${K(n.size)}`],
			n.contained && t.contained,
			n.filled && t.filled
		];
	}
})(({ theme: e, ownerState: t }) => z({ color: (e.vars || e).palette.text.secondary }, e.typography.caption, {
	textAlign: "left",
	marginTop: 3,
	marginRight: 0,
	marginBottom: 0,
	marginLeft: 0,
	[`&.${Ry.disabled}`]: { color: (e.vars || e).palette.text.disabled },
	[`&.${Ry.error}`]: { color: (e.vars || e).palette.error.main }
}, t.size === "small" && { marginTop: 4 }, t.contained && {
	marginLeft: 14,
	marginRight: 14
})), Uy = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiFormHelperText"
	}), { children: r, className: i, component: a = "p" } = n, o = U(n, By), s = E_({
		props: n,
		muiFormControl: O_(),
		states: [
			"variant",
			"size",
			"disabled",
			"error",
			"filled",
			"focused",
			"required"
		]
	}), c = z({}, n, {
		component: a,
		contained: s.variant === "filled" || s.variant === "outlined",
		variant: s.variant,
		size: s.size,
		disabled: s.disabled,
		error: s.error,
		filled: s.filled,
		focused: s.focused,
		required: s.required
	}), l = Vy(c);
	return /*#__PURE__*/ (0, X.jsx)(Hy, z({
		as: a,
		ownerState: c,
		className: G(l.root, i),
		ref: t
	}, o, { children: r === " " ? zy || (zy = /*#__PURE__*/ (0, X.jsx)("span", {
		className: "notranslate",
		children: "​"
	})) : r }));
});
bo(), vo();
function Wy(e) {
	return ho("MuiFormLabel", e);
}
var Gy = H("MuiFormLabel", [
	"root",
	"colorSecondary",
	"focused",
	"disabled",
	"error",
	"filled",
	"required",
	"asterisk"
]);
W(), B(), jo(), co(), $o(), _s(), Qp();
var Ky = [
	"children",
	"className",
	"color",
	"component",
	"disabled",
	"error",
	"filled",
	"focused",
	"required"
], qy = (e) => {
	let { classes: t, color: n, focused: r, disabled: i, error: a, filled: o, required: s } = e;
	return V({
		root: [
			"root",
			`color${K(n)}`,
			i && "disabled",
			a && "error",
			o && "filled",
			r && "focused",
			s && "required"
		],
		asterisk: ["asterisk", a && "error"]
	}, Wy, t);
}, Jy = Y("label", {
	name: "MuiFormLabel",
	slot: "Root",
	overridesResolver: ({ ownerState: e }, t) => z({}, t.root, e.color === "secondary" && t.colorSecondary, e.filled && t.filled)
})(({ theme: e, ownerState: t }) => z({ color: (e.vars || e).palette.text.secondary }, e.typography.body1, {
	lineHeight: "1.4375em",
	padding: 0,
	position: "relative",
	[`&.${Gy.focused}`]: { color: (e.vars || e).palette[t.color].main },
	[`&.${Gy.disabled}`]: { color: (e.vars || e).palette.text.disabled },
	[`&.${Gy.error}`]: { color: (e.vars || e).palette.error.main }
})), Yy = Y("span", {
	name: "MuiFormLabel",
	slot: "Asterisk",
	overridesResolver: (e, t) => t.asterisk
})(({ theme: e }) => ({ [`&.${Gy.error}`]: { color: (e.vars || e).palette.error.main } })), Xy = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiFormLabel"
	}), { children: r, className: i, component: a = "label" } = n, o = U(n, Ky), s = E_({
		props: n,
		muiFormControl: O_(),
		states: [
			"color",
			"required",
			"focused",
			"disabled",
			"error",
			"filled"
		]
	}), c = z({}, n, {
		color: s.color || "primary",
		component: a,
		disabled: s.disabled,
		error: s.error,
		filled: s.filled,
		focused: s.focused,
		required: s.required
	}), l = qy(c);
	return /*#__PURE__*/ (0, X.jsxs)(Jy, z({
		as: a,
		ownerState: c,
		className: G(l.root, i),
		ref: t
	}, o, { children: [r, s.required && /*#__PURE__*/ (0, X.jsxs)(Yy, {
		ownerState: c,
		"aria-hidden": !0,
		className: l.asterisk,
		children: [" ", "*"]
	})] }));
});
B(), W(), La(), Xo(), zm();
var Zy = [
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
function Qy(e) {
	return `scale(${e}, ${e ** 2})`;
}
var $y = {
	entering: {
		opacity: 1,
		transform: Qy(1)
	},
	entered: {
		opacity: 1,
		transform: "none"
	}
}, eb = typeof navigator < "u" && /^((?!chrome|android).)*(safari|mobile)/i.test(navigator.userAgent) && /(os |version\/)15(.|_)4/i.test(navigator.userAgent), tb = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let { addEndListener: n, appear: r = !0, children: i, easing: a, in: o, onEnter: s, onEntered: c, onEntering: l, onExit: u, onExited: d, onExiting: f, style: p, timeout: m = "auto", TransitionComponent: h = ug } = e, g = U(e, Zy), _ = Pa(), v = R.useRef(), y = Gh(), b = R.useRef(null), x = Rm(b, Jo(i), t), S = (e) => (t) => {
		if (e) {
			let n = b.current;
			t === void 0 ? e(n) : e(n, t);
		}
	}, C = S(l), w = S((e, t) => {
		xg(e);
		let { duration: n, delay: r, easing: i } = Sg({
			style: p,
			timeout: m,
			easing: a
		}, { mode: "enter" }), o;
		m === "auto" ? (o = y.transitions.getAutoHeightDuration(e.clientHeight), v.current = o) : o = n, e.style.transition = [y.transitions.create("opacity", {
			duration: o,
			delay: r
		}), y.transitions.create("transform", {
			duration: eb ? o : o * .666,
			delay: r,
			easing: i
		})].join(","), s && s(e, t);
	}), T = S(c), E = S(f), D = S((e) => {
		let { duration: t, delay: n, easing: r } = Sg({
			style: p,
			timeout: m,
			easing: a
		}, { mode: "exit" }), i;
		m === "auto" ? (i = y.transitions.getAutoHeightDuration(e.clientHeight), v.current = i) : i = t, e.style.transition = [y.transitions.create("opacity", {
			duration: i,
			delay: n
		}), y.transitions.create("transform", {
			duration: eb ? i : i * .666,
			delay: eb ? n : n || i * .333,
			easing: r
		})].join(","), e.style.opacity = 0, e.style.transform = Qy(.75), u && u(e);
	}), O = S(d);
	return /*#__PURE__*/ (0, X.jsx)(h, z({
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
	}, g, { children: (e, t) => /*#__PURE__*/ R.cloneElement(i, z({
		style: z({
			opacity: 0,
			transform: Qy(.75),
			visibility: e === "exited" && !o ? "hidden" : void 0
		}, $y[e], p, i.props.style),
		ref: x
	}, t)) }));
});
tb.muiSupportAuto = !0, W(), B(), co(), bi(), Qp(), _s();
var nb = [
	"disableUnderline",
	"components",
	"componentsProps",
	"fullWidth",
	"inputComponent",
	"multiline",
	"slotProps",
	"slots",
	"type"
], rb = (e) => {
	let { classes: t, disableUnderline: n } = e, r = V({
		root: ["root", !n && "underline"],
		input: ["input"]
	}, U_, t);
	return z({}, t, r);
}, ib = Y(z_, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiInput",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [...I_(e, t), !n.disableUnderline && t.underline];
	}
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)";
	return e.vars && (n = `rgba(${e.vars.palette.common.onBackgroundChannel} / ${e.vars.opacity.inputUnderline})`), z({ position: "relative" }, t.formControl && { "label + &": { marginTop: 16 } }, !t.disableUnderline && {
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
		[`&.${W_.focused}:after`]: { transform: "scaleX(1) translateX(0)" },
		[`&.${W_.error}`]: { "&::before, &::after": { borderBottomColor: (e.vars || e).palette.error.main } },
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
		[`&:hover:not(.${W_.disabled}, .${W_.error}):before`]: {
			borderBottom: `2px solid ${(e.vars || e).palette.text.primary}`,
			"@media (hover: none)": { borderBottom: `1px solid ${n}` }
		},
		[`&.${W_.disabled}:before`]: { borderBottomStyle: "dotted" }
	});
}), ab = Y(B_, {
	name: "MuiInput",
	slot: "Input",
	overridesResolver: L_
})({}), ob = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i, a;
	let o = hs({
		props: e,
		name: "MuiInput"
	}), { disableUnderline: s, components: c = {}, componentsProps: l, fullWidth: u = !1, inputComponent: d = "input", multiline: f = !1, slotProps: p, slots: m = {}, type: h = "text" } = o, g = U(o, nb), _ = rb(o), v = { root: { ownerState: { disableUnderline: s } } }, y = (p == null ? l : p) ? _i(p == null ? l : p, v) : v, b = (n = (r = m.root) == null ? c.Root : r) == null ? ib : n, x = (i = (a = m.input) == null ? c.Input : a) == null ? ab : i;
	return /*#__PURE__*/ (0, X.jsx)(H_, z({
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
ob.muiName = "Input", bo(), vo();
function sb(e) {
	return ho("MuiInputLabel", e);
}
H("MuiInputLabel", [
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
]), W(), B(), co(), jo(), _s(), $o(), Qp();
var cb = [
	"disableAnimation",
	"margin",
	"shrink",
	"variant",
	"className"
], lb = (e) => {
	let { classes: t, formControl: n, size: r, shrink: i, disableAnimation: a, variant: o, required: s } = e, c = V({
		root: [
			"root",
			n && "formControl",
			!a && "animated",
			i && "shrink",
			r && r !== "normal" && `size${K(r)}`,
			o
		],
		asterisk: [s && "asterisk"]
	}, sb, t);
	return z({}, t, c);
}, ub = Y(Xy, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiInputLabel",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`& .${Gy.asterisk}`]: t.asterisk },
			t.root,
			n.formControl && t.formControl,
			n.size === "small" && t.sizeSmall,
			n.shrink && t.shrink,
			!n.disableAnimation && t.animated,
			n.focused && t.focused,
			t[n.variant]
		];
	}
})(({ theme: e, ownerState: t }) => z({
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
}) }, t.variant === "filled" && z({
	zIndex: 1,
	pointerEvents: "none",
	transform: "translate(12px, 16px) scale(1)",
	maxWidth: "calc(100% - 24px)"
}, t.size === "small" && { transform: "translate(12px, 13px) scale(1)" }, t.shrink && z({
	userSelect: "none",
	pointerEvents: "auto",
	transform: "translate(12px, 7px) scale(0.75)",
	maxWidth: "calc(133% - 24px)"
}, t.size === "small" && { transform: "translate(12px, 4px) scale(0.75)" })), t.variant === "outlined" && z({
	zIndex: 1,
	pointerEvents: "none",
	transform: "translate(14px, 16px) scale(1)",
	maxWidth: "calc(100% - 24px)"
}, t.size === "small" && { transform: "translate(14px, 9px) scale(1)" }, t.shrink && {
	userSelect: "none",
	pointerEvents: "auto",
	maxWidth: "calc(133% - 32px)",
	transform: "translate(14px, -9px) scale(0.75)"
}))), db = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		name: "MuiInputLabel",
		props: e
	}), { disableAnimation: r = !1, shrink: i, className: a } = n, o = U(n, cb), s = O_(), c = i;
	c === void 0 && s && (c = s.filled || s.focused || s.adornedStart);
	let l = E_({
		props: n,
		muiFormControl: s,
		states: [
			"size",
			"variant",
			"required",
			"focused"
		]
	}), u = z({}, n, {
		disableAnimation: r,
		formControl: s,
		shrink: c,
		size: l.size,
		variant: l.variant,
		required: l.required,
		focused: l.focused
	}), d = lb(u);
	return /*#__PURE__*/ (0, X.jsx)(ub, z({
		"data-shrink": c,
		ownerState: u,
		ref: t,
		className: G(d.root, a)
	}, o, { classes: d }));
});
bo(), vo();
function fb(e) {
	return ho("MuiLinearProgress", e);
}
H("MuiLinearProgress", [
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
]), W(), B(), jo(), co(), Ll(), $o(), Qp(), _s();
var pb = [
	"className",
	"color",
	"value",
	"valueBuffer",
	"variant"
], mb = (e) => e, hb, gb, _b, vb, yb, bb, xb = 4, Sb = Nl(hb || (hb = mb`
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
`)), Cb = Nl(gb || (gb = mb`
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
`)), wb = Nl(_b || (_b = mb`
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
`)), Tb = (e) => {
	let { classes: t, variant: n, color: r } = e;
	return V({
		root: [
			"root",
			`color${K(r)}`,
			n
		],
		dashed: ["dashed", `dashedColor${K(r)}`],
		bar1: [
			"bar",
			`barColor${K(r)}`,
			(n === "indeterminate" || n === "query") && "bar1Indeterminate",
			n === "determinate" && "bar1Determinate",
			n === "buffer" && "bar1Buffer"
		],
		bar2: [
			"bar",
			n !== "buffer" && `barColor${K(r)}`,
			n === "buffer" && `color${K(r)}`,
			(n === "indeterminate" || n === "query") && "bar2Indeterminate",
			n === "buffer" && "bar2Buffer"
		]
	}, fb, t);
}, Eb = (e, t) => t === "inherit" ? "currentColor" : e.vars ? e.vars.palette.LinearProgress[`${t}Bg`] : e.palette.mode === "light" ? (0, wg.lighten)(e.palette[t].main, .62) : (0, wg.darken)(e.palette[t].main, .5), Db = Y("span", {
	name: "MuiLinearProgress",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.root,
			t[`color${K(n.color)}`],
			t[n.variant]
		];
	}
})(({ ownerState: e, theme: t }) => z({
	position: "relative",
	overflow: "hidden",
	display: "block",
	height: 4,
	zIndex: 0,
	"@media print": { colorAdjust: "exact" },
	backgroundColor: Eb(t, e.color)
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
}, e.variant === "buffer" && { backgroundColor: "transparent" }, e.variant === "query" && { transform: "rotate(180deg)" })), Ob = Y("span", {
	name: "MuiLinearProgress",
	slot: "Dashed",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [t.dashed, t[`dashedColor${K(n.color)}`]];
	}
})(({ ownerState: e, theme: t }) => {
	let n = Eb(t, e.color);
	return z({
		position: "absolute",
		marginTop: 0,
		height: "100%",
		width: "100%"
	}, e.color === "inherit" && { opacity: .3 }, {
		backgroundImage: `radial-gradient(${n} 0%, ${n} 16%, transparent 42%)`,
		backgroundSize: "10px 10px",
		backgroundPosition: "0 -23px"
	});
}, Ml(vb || (vb = mb`
    animation: ${0} 3s infinite linear;
  `), wb)), kb = Y("span", {
	name: "MuiLinearProgress",
	slot: "Bar1",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.bar,
			t[`barColor${K(n.color)}`],
			(n.variant === "indeterminate" || n.variant === "query") && t.bar1Indeterminate,
			n.variant === "determinate" && t.bar1Determinate,
			n.variant === "buffer" && t.bar1Buffer
		];
	}
})(({ ownerState: e, theme: t }) => z({
	width: "100%",
	position: "absolute",
	left: 0,
	bottom: 0,
	top: 0,
	transition: "transform 0.2s linear",
	transformOrigin: "left",
	backgroundColor: e.color === "inherit" ? "currentColor" : (t.vars || t).palette[e.color].main
}, e.variant === "determinate" && { transition: `transform .${xb}s linear` }, e.variant === "buffer" && {
	zIndex: 1,
	transition: `transform .${xb}s linear`
}), ({ ownerState: e }) => (e.variant === "indeterminate" || e.variant === "query") && Ml(yb || (yb = mb`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    `), Sb)), Ab = Y("span", {
	name: "MuiLinearProgress",
	slot: "Bar2",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.bar,
			t[`barColor${K(n.color)}`],
			(n.variant === "indeterminate" || n.variant === "query") && t.bar2Indeterminate,
			n.variant === "buffer" && t.bar2Buffer
		];
	}
})(({ ownerState: e, theme: t }) => z({
	width: "100%",
	position: "absolute",
	left: 0,
	bottom: 0,
	top: 0,
	transition: "transform 0.2s linear",
	transformOrigin: "left"
}, e.variant !== "buffer" && { backgroundColor: e.color === "inherit" ? "currentColor" : (t.vars || t).palette[e.color].main }, e.color === "inherit" && { opacity: .3 }, e.variant === "buffer" && {
	backgroundColor: Eb(t, e.color),
	transition: `transform .${xb}s linear`
}), ({ ownerState: e }) => (e.variant === "indeterminate" || e.variant === "query") && Ml(bb || (bb = mb`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
    `), Cb)), jb = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiLinearProgress"
	}), { className: r, color: i = "primary", value: a, valueBuffer: o, variant: s = "indeterminate" } = n, c = U(n, pb), l = z({}, n, {
		color: i,
		variant: s
	}), u = Tb(l), d = Mh(), f = {}, p = {
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
	return /*#__PURE__*/ (0, X.jsxs)(Db, z({
		className: G(u.root, r),
		ownerState: l,
		role: "progressbar"
	}, f, { ref: t }, c, { children: [
		s === "buffer" ? /*#__PURE__*/ (0, X.jsx)(Ob, {
			className: u.dashed,
			ownerState: l
		}) : null,
		/*#__PURE__*/ (0, X.jsx)(kb, {
			className: u.bar1,
			ownerState: l,
			style: p.bar1
		}),
		s === "determinate" ? null : /*#__PURE__*/ (0, X.jsx)(Ab, {
			className: u.bar2,
			ownerState: l,
			style: p.bar2
		})
	] }));
}), Mb = /*#__PURE__*/ R.createContext({});
bo(), vo();
function Nb(e) {
	return ho("MuiList", e);
}
H("MuiList", [
	"root",
	"padding",
	"dense",
	"subheader"
]), W(), B(), jo(), co(), Qp(), _s();
var Pb = [
	"children",
	"className",
	"component",
	"dense",
	"disablePadding",
	"subheader"
], Fb = (e) => {
	let { classes: t, disablePadding: n, dense: r, subheader: i } = e;
	return V({ root: [
		"root",
		!n && "padding",
		r && "dense",
		i && "subheader"
	] }, Nb, t);
}, Ib = Y("ul", {
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
})(({ ownerState: e }) => z({
	listStyle: "none",
	margin: 0,
	padding: 0,
	position: "relative"
}, !e.disablePadding && {
	paddingTop: 8,
	paddingBottom: 8
}, e.subheader && { paddingTop: 0 })), Lb = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiList"
	}), { children: r, className: i, component: a = "ul", dense: o = !1, disablePadding: s = !1, subheader: c } = n, l = U(n, Pb), u = R.useMemo(() => ({ dense: o }), [o]), d = z({}, n, {
		component: a,
		dense: o,
		disablePadding: s
	}), f = Fb(d);
	return /*#__PURE__*/ (0, X.jsx)(Mb.Provider, {
		value: u,
		children: /*#__PURE__*/ (0, X.jsxs)(Ib, z({
			as: a,
			className: G(f.root, i),
			ref: t,
			ownerState: d
		}, l, { children: [c, r] }))
	});
});
//#endregion
//#region node_modules/@mui/material/utils/getScrollbarSize.js
eo();
var Rb = Qa;
B(), W(), xm(), zm(), km();
var zb = [
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
function Bb(e, t, n) {
	return e === t ? e.firstChild : t && t.nextElementSibling ? t.nextElementSibling : n ? null : e.firstChild;
}
function Vb(e, t, n) {
	return e === t ? n ? e.firstChild : e.lastChild : t && t.previousElementSibling ? t.previousElementSibling : n ? null : e.lastChild;
}
function Hb(e, t) {
	if (t === void 0) return !0;
	let n = e.innerText;
	return n === void 0 && (n = e.textContent), n = n.trim().toLowerCase(), n.length === 0 ? !1 : t.repeating ? n[0] === t.keys[0] : n.indexOf(t.keys.join("")) === 0;
}
function Ub(e, t, n, r, i, a) {
	let o = !1, s = i(e, t, t ? n : !1);
	for (; s;) {
		if (s === e.firstChild) {
			if (o) return !1;
			o = !0;
		}
		let t = r ? !1 : s.disabled || s.getAttribute("aria-disabled") === "true";
		if (!s.hasAttribute("tabindex") || !Hb(s, a) || t) s = i(e, s, n);
		else return s.focus(), !0;
	}
	return !1;
}
var Wb = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let { actions: n, autoFocus: r = !1, autoFocusItem: i = !1, children: a, className: o, disabledItemsFocusable: s = !1, disableListWrap: c = !1, onKeyDown: l, variant: u = "selectedMenu" } = e, d = U(e, zb), f = R.useRef(null), p = R.useRef({
		keys: [],
		repeating: !0,
		previousKeyMatched: !0,
		lastTime: null
	});
	Om(() => {
		r && f.current.focus();
	}, [r]), R.useImperativeHandle(n, () => ({ adjustStyleForScrollbar: (e, { direction: t }) => {
		let n = !f.current.style.width;
		if (e.clientHeight < f.current.clientHeight && n) {
			let n = `${Rb(bm(e))}px`;
			f.current.style[t === "rtl" ? "paddingLeft" : "paddingRight"] = n, f.current.style.width = `calc(100% + ${n})`;
		}
		return f.current;
	} }), []);
	let m = (e) => {
		let t = f.current, n = e.key, r = bm(t).activeElement;
		if (n === "ArrowDown") e.preventDefault(), Ub(t, r, c, s, Bb);
		else if (n === "ArrowUp") e.preventDefault(), Ub(t, r, c, s, Vb);
		else if (n === "Home") e.preventDefault(), Ub(t, null, c, s, Bb);
		else if (n === "End") e.preventDefault(), Ub(t, null, c, s, Vb);
		else if (n.length === 1) {
			let i = p.current, a = n.toLowerCase(), o = performance.now();
			i.keys.length > 0 && (o - i.lastTime > 500 ? (i.keys = [], i.repeating = !0, i.previousKeyMatched = !0) : i.repeating && a !== i.keys[0] && (i.repeating = !1)), i.lastTime = o, i.keys.push(a);
			let c = r && !i.repeating && Hb(r, i);
			i.previousKeyMatched && (c || Ub(t, r, !1, s, Bb, i)) ? e.preventDefault() : i.previousKeyMatched = !1;
		}
		l && l(e);
	}, h = Rm(f, t), g = -1;
	R.Children.forEach(a, (e, t) => {
		if (!/*#__PURE__*/ R.isValidElement(e)) {
			g === t && (g += 1, g >= a.length && (g = -1));
			return;
		}
		e.props.disabled || (u === "selectedMenu" && e.props.selected || g === -1) && (g = t), g === t && (e.props.disabled || e.props.muiSkipListHighlight || e.type.muiSkipListHighlight) && (g += 1, g >= a.length && (g = -1));
	});
	let _ = R.Children.map(a, (e, t) => {
		if (t === g) {
			let t = {};
			return i && (t.autoFocus = !0), e.props.tabIndex === void 0 && u === "selectedMenu" && (t.tabIndex = 0), /*#__PURE__*/ R.cloneElement(e, t);
		}
		return e;
	});
	return /*#__PURE__*/ (0, X.jsx)(Lb, z({
		role: "menu",
		ref: h,
		className: o,
		onKeyDown: m,
		tabIndex: r ? 0 : -1
	}, d, { children: _ }));
});
bo(), vo();
function Gb(e) {
	return ho("MuiPopover", e);
}
H("MuiPopover", ["root", "paper"]), B(), W(), jo(), co(), qo(), Eo(), Qp(), _s(), hm(), xm(), Cm(), zm();
var Kb = ["onEntering"], qb = [
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
], Jb = ["slotProps"];
function Yb(e, t) {
	let n = 0;
	return typeof t == "number" ? n = t : t === "center" ? n = e.height / 2 : t === "bottom" && (n = e.height), n;
}
function Xb(e, t) {
	let n = 0;
	return typeof t == "number" ? n = t : t === "center" ? n = e.width / 2 : t === "right" && (n = e.width), n;
}
function Zb(e) {
	return [e.horizontal, e.vertical].map((e) => typeof e == "number" ? `${e}px` : e).join(" ");
}
function Qb(e) {
	return typeof e == "function" ? e() : e;
}
var $b = (e) => {
	let { classes: t } = e;
	return V({
		root: ["root"],
		paper: ["paper"]
	}, Gb, t);
}, ex = Y(by, {
	name: "MuiPopover",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), tx = Y(Og, {
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
}), nx = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i;
	let a = hs({
		props: e,
		name: "MuiPopover"
	}), { action: o, anchorEl: s, anchorOrigin: c = {
		vertical: "top",
		horizontal: "left"
	}, anchorPosition: l, anchorReference: u = "anchorEl", children: d, className: f, container: p, elevation: m = 8, marginThreshold: h = 16, open: g, PaperProps: _ = {}, slots: v, slotProps: y, transformOrigin: b = {
		vertical: "top",
		horizontal: "left"
	}, TransitionComponent: x = tb, transitionDuration: S = "auto", TransitionProps: { onEntering: C } = {}, disableScrollLock: w = !1 } = a, T = U(a.TransitionProps, Kb), E = U(a, qb), D = (n = y == null ? void 0 : y.paper) == null ? _ : n, O = R.useRef(), k = Rm(O, D.ref), A = z({}, a, {
		anchorOrigin: c,
		anchorReference: u,
		elevation: m,
		marginThreshold: h,
		externalPaperSlotProps: D,
		transformOrigin: b,
		TransitionComponent: x,
		transitionDuration: S,
		TransitionProps: T
	}), j = $b(A), ee = R.useCallback(() => {
		if (u === "anchorPosition") return l;
		let e = Qb(s), t = (e && e.nodeType === 1 ? e : bm(O.current).body).getBoundingClientRect();
		return {
			top: t.top + Yb(t, c.vertical),
			left: t.left + Xb(t, c.horizontal)
		};
	}, [
		s,
		c.horizontal,
		c.vertical,
		l,
		u
	]), M = R.useCallback((e) => ({
		vertical: Yb(e, b.vertical),
		horizontal: Xb(e, b.horizontal)
	}), [b.horizontal, b.vertical]), te = R.useCallback((e) => {
		let t = {
			width: e.offsetWidth,
			height: e.offsetHeight
		}, n = M(t);
		if (u === "none") return {
			top: null,
			left: null,
			transformOrigin: Zb(n)
		};
		let r = ee(), i = r.top - n.vertical, a = r.left - n.horizontal, o = i + t.height, c = a + t.width, l = Sm(Qb(s)), d = l.innerHeight - h, f = l.innerWidth - h;
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
			transformOrigin: Zb(n)
		};
	}, [
		s,
		u,
		ee,
		M,
		h
	]), [ne, re] = R.useState(g), N = R.useCallback(() => {
		let e = O.current;
		if (!e) return;
		let t = te(e);
		t.top !== null && (e.style.top = t.top), t.left !== null && (e.style.left = t.left), e.style.transformOrigin = t.transformOrigin, re(!0);
	}, [te]);
	R.useEffect(() => (w && window.addEventListener("scroll", N), () => window.removeEventListener("scroll", N)), [
		s,
		w,
		N
	]);
	let ie = (e, t) => {
		C && C(e, t), N();
	}, P = () => {
		re(!1);
	};
	R.useEffect(() => {
		g && N();
	}), R.useImperativeHandle(o, () => g ? { updatePosition: () => {
		N();
	} } : null, [g, N]), R.useEffect(() => {
		if (!g) return;
		let e = mm(() => {
			N();
		}), t = Sm(s);
		return t.addEventListener("resize", e), () => {
			e.clear(), t.removeEventListener("resize", e);
		};
	}, [
		s,
		g,
		N
	]);
	let ae = S;
	S === "auto" && !x.muiSupportAuto && (ae = void 0);
	let F = p || (s ? bm(Qb(s)).body : void 0), oe = (r = v == null ? void 0 : v.root) == null ? ex : r, se = (i = v == null ? void 0 : v.paper) == null ? tx : i, ce = Wo({
		elementType: se,
		externalSlotProps: z({}, D, { style: ne ? D.style : z({}, D.style, { opacity: 0 }) }),
		additionalProps: {
			elevation: m,
			ref: k
		},
		ownerState: A,
		className: G(j.paper, D == null ? void 0 : D.className)
	}), le = Wo({
		elementType: oe,
		externalSlotProps: (y == null ? void 0 : y.root) || {},
		externalForwardedProps: E,
		additionalProps: {
			ref: t,
			slotProps: { backdrop: { invisible: !0 } },
			container: F,
			open: g
		},
		ownerState: A,
		className: G(j.root, f)
	}), { slotProps: ue } = le, de = U(le, Jb);
	return /*#__PURE__*/ (0, X.jsx)(oe, z({}, de, !wo(oe) && {
		slotProps: ue,
		disableScrollLock: w
	}, { children: /*#__PURE__*/ (0, X.jsx)(x, z({
		appear: !0,
		in: g,
		onEntering: ie,
		onExited: P,
		timeout: ae
	}, T, { children: /*#__PURE__*/ (0, X.jsx)(se, z({}, ce, { children: d })) })) }));
});
bo(), vo();
function rx(e) {
	return ho("MuiMenu", e);
}
H("MuiMenu", [
	"root",
	"paper",
	"list"
]), B(), W(), jo(), co(), qo(), Qp(), _s();
var ix = ["onEntering"], ax = [
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
], ox = {
	vertical: "top",
	horizontal: "right"
}, sx = {
	vertical: "top",
	horizontal: "left"
}, cx = (e) => {
	let { classes: t } = e;
	return V({
		root: ["root"],
		paper: ["paper"],
		list: ["list"]
	}, rx, t);
}, lx = Y(nx, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiMenu",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), ux = Y(tx, {
	name: "MuiMenu",
	slot: "Paper",
	overridesResolver: (e, t) => t.paper
})({
	maxHeight: "calc(100% - 96px)",
	WebkitOverflowScrolling: "touch"
}), dx = Y(Wb, {
	name: "MuiMenu",
	slot: "List",
	overridesResolver: (e, t) => t.list
})({ outline: 0 }), fx = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r;
	let i = hs({
		props: e,
		name: "MuiMenu"
	}), { autoFocus: a = !0, children: o, className: s, disableAutoFocusItem: c = !1, MenuListProps: l = {}, onClose: u, open: d, PaperProps: f = {}, PopoverClasses: p, transitionDuration: m = "auto", TransitionProps: { onEntering: h } = {}, variant: g = "selectedMenu", slots: _ = {}, slotProps: v = {} } = i, y = U(i.TransitionProps, ix), b = U(i, ax), x = Mh(), S = z({}, i, {
		autoFocus: a,
		disableAutoFocusItem: c,
		MenuListProps: l,
		onEntering: h,
		PaperProps: f,
		transitionDuration: m,
		TransitionProps: y,
		variant: g
	}), C = cx(S), w = a && !c && d, T = R.useRef(null), E = (e, t) => {
		T.current && T.current.adjustStyleForScrollbar(e, { direction: x ? "rtl" : "ltr" }), h && h(e, t);
	}, D = (e) => {
		e.key === "Tab" && (e.preventDefault(), u && u(e, "tabKeyDown"));
	}, O = -1;
	R.Children.map(o, (e, t) => {
		/*#__PURE__*/ R.isValidElement(e) && (e.props.disabled || (g === "selectedMenu" && e.props.selected || O === -1) && (O = t));
	});
	let k = (n = _.paper) == null ? ux : n, A = (r = v.paper) == null ? f : r, j = Wo({
		elementType: _.root,
		externalSlotProps: v.root,
		ownerState: S,
		className: [C.root, s]
	}), ee = Wo({
		elementType: k,
		externalSlotProps: A,
		ownerState: S,
		className: C.paper
	});
	return /*#__PURE__*/ (0, X.jsx)(lx, z({
		onClose: u,
		anchorOrigin: {
			vertical: "bottom",
			horizontal: x ? "right" : "left"
		},
		transformOrigin: x ? ox : sx,
		slots: {
			paper: k,
			root: _.root
		},
		slotProps: {
			root: j,
			paper: ee
		},
		open: d,
		ref: t,
		transitionDuration: m,
		TransitionProps: z({ onEntering: E }, y),
		ownerState: S
	}, b, {
		classes: p,
		children: /*#__PURE__*/ (0, X.jsx)(dx, z({
			onKeyDown: D,
			actions: T,
			autoFocus: a && (O === -1 || c),
			autoFocusItem: w,
			variant: g
		}, l, {
			className: G(C.list, l.className),
			children: o
		}))
	}));
});
bo(), vo();
function px(e) {
	return ho("MuiNativeSelect", e);
}
var mx = H("MuiNativeSelect", [
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
W(), B(), jo(), co(), $o(), Qp();
var hx = [
	"className",
	"disabled",
	"error",
	"IconComponent",
	"inputRef",
	"variant"
], gx = (e) => {
	let { classes: t, variant: n, disabled: r, multiple: i, open: a, error: o } = e;
	return V({
		select: [
			"select",
			n,
			r && "disabled",
			i && "multiple",
			o && "error"
		],
		icon: [
			"icon",
			`icon${K(n)}`,
			a && "iconOpen",
			r && "disabled"
		]
	}, px, t);
}, _x = ({ ownerState: e, theme: t }) => z({
	MozAppearance: "none",
	WebkitAppearance: "none",
	userSelect: "none",
	borderRadius: 0,
	cursor: "pointer",
	"&:focus": z({}, t.vars ? { backgroundColor: `rgba(${t.vars.palette.common.onBackgroundChannel} / 0.05)` } : { backgroundColor: t.palette.mode === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" }, { borderRadius: 0 }),
	"&::-ms-expand": { display: "none" },
	[`&.${mx.disabled}`]: { cursor: "default" },
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
}), vx = Y("select", {
	name: "MuiNativeSelect",
	slot: "Select",
	shouldForwardProp: Yp,
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.select,
			t[n.variant],
			n.error && t.error,
			{ [`&.${mx.multiple}`]: t.multiple }
		];
	}
})(_x), yx = ({ ownerState: e, theme: t }) => z({
	position: "absolute",
	right: 0,
	top: "calc(50% - .5em)",
	pointerEvents: "none",
	color: (t.vars || t).palette.action.active,
	[`&.${mx.disabled}`]: { color: (t.vars || t).palette.action.disabled }
}, e.open && { transform: "rotate(180deg)" }, e.variant === "filled" && { right: 7 }, e.variant === "outlined" && { right: 7 }), bx = Y("svg", {
	name: "MuiNativeSelect",
	slot: "Icon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.icon,
			n.variant && t[`icon${K(n.variant)}`],
			n.open && t.iconOpen
		];
	}
})(yx), xx = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let { className: n, disabled: r, error: i, IconComponent: a, inputRef: o, variant: s = "standard" } = e, c = U(e, hx), l = z({}, e, {
		disabled: r,
		variant: s,
		error: i
	}), u = gx(l);
	return /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [/*#__PURE__*/ (0, X.jsx)(vx, z({
		ownerState: l,
		className: G(u.select, n),
		disabled: r,
		ref: o || t
	}, c)), e.multiple ? null : /*#__PURE__*/ (0, X.jsx)(bx, {
		as: a,
		ownerState: l,
		className: u.icon
	})] });
});
W(), B(), Qp();
var Sx, Cx = [
	"children",
	"classes",
	"className",
	"label",
	"notched"
], wx = Y("fieldset", {
	name: "MuiNotchedOutlined",
	shouldForwardProp: Yp
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
}), Tx = Y("legend", {
	name: "MuiNotchedOutlined",
	shouldForwardProp: Yp
})(({ ownerState: e, theme: t }) => z({
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
}, e.withLabel && z({
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
function Ex(e) {
	let { className: t, label: n, notched: r } = e, i = U(e, Cx), a = n != null && n !== "", o = z({}, e, {
		notched: r,
		withLabel: a
	});
	return /*#__PURE__*/ (0, X.jsx)(wx, z({
		"aria-hidden": !0,
		className: t,
		ownerState: o
	}, i, { children: /*#__PURE__*/ (0, X.jsx)(Tx, {
		ownerState: o,
		children: a ? /*#__PURE__*/ (0, X.jsx)("span", { children: n }) : Sx || (Sx = /*#__PURE__*/ (0, X.jsx)("span", {
			className: "notranslate",
			children: "​"
		}))
	}) }));
}
W(), B(), co(), Qp(), _s();
var Dx = [
	"components",
	"fullWidth",
	"inputComponent",
	"label",
	"multiline",
	"notched",
	"slots",
	"type"
], Ox = (e) => {
	let { classes: t } = e, n = V({
		root: ["root"],
		notchedOutline: ["notchedOutline"],
		input: ["input"]
	}, G_, t);
	return z({}, t, n);
}, kx = Y(z_, {
	shouldForwardProp: (e) => Yp(e) || e === "classes",
	name: "MuiOutlinedInput",
	slot: "Root",
	overridesResolver: I_
})(({ theme: e, ownerState: t }) => {
	let n = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
	return z({
		position: "relative",
		borderRadius: (e.vars || e).shape.borderRadius,
		[`&:hover .${K_.notchedOutline}`]: { borderColor: (e.vars || e).palette.text.primary },
		"@media (hover: none)": { [`&:hover .${K_.notchedOutline}`]: { borderColor: e.vars ? `rgba(${e.vars.palette.common.onBackgroundChannel} / 0.23)` : n } },
		[`&.${K_.focused} .${K_.notchedOutline}`]: {
			borderColor: (e.vars || e).palette[t.color].main,
			borderWidth: 2
		},
		[`&.${K_.error} .${K_.notchedOutline}`]: { borderColor: (e.vars || e).palette.error.main },
		[`&.${K_.disabled} .${K_.notchedOutline}`]: { borderColor: (e.vars || e).palette.action.disabled }
	}, t.startAdornment && { paddingLeft: 14 }, t.endAdornment && { paddingRight: 14 }, t.multiline && z({ padding: "16.5px 14px" }, t.size === "small" && { padding: "8.5px 14px" }));
}), Ax = Y(Ex, {
	name: "MuiOutlinedInput",
	slot: "NotchedOutline",
	overridesResolver: (e, t) => t.notchedOutline
})(({ theme: e }) => {
	let t = e.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
	return { borderColor: e.vars ? `rgba(${e.vars.palette.common.onBackgroundChannel} / 0.23)` : t };
}), jx = Y(B_, {
	name: "MuiOutlinedInput",
	slot: "Input",
	overridesResolver: L_
})(({ theme: e, ownerState: t }) => z({ padding: "16.5px 14px" }, !e.vars && { "&:-webkit-autofill": {
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
}, t.size === "small" && { padding: "8.5px 14px" }, t.multiline && { padding: 0 }, t.startAdornment && { paddingLeft: 0 }, t.endAdornment && { paddingRight: 0 })), Mx = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n, r, i, a, o;
	let s = hs({
		props: e,
		name: "MuiOutlinedInput"
	}), { components: c = {}, fullWidth: l = !1, inputComponent: u = "input", label: d, multiline: f = !1, notched: p, slots: m = {}, type: h = "text" } = s, g = U(s, Dx), _ = Ox(s), v = O_(), y = E_({
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
	}), b = z({}, s, {
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
	}), x = (n = (r = m.root) == null ? c.Root : r) == null ? kx : n, S = (i = (a = m.input) == null ? c.Input : a) == null ? jx : i;
	return /*#__PURE__*/ (0, X.jsx)(H_, z({
		slots: {
			root: x,
			input: S
		},
		renderSuffix: (e) => /*#__PURE__*/ (0, X.jsx)(Ax, {
			ownerState: b,
			className: _.notchedOutline,
			label: d != null && d !== "" && y.required ? o || (o = /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [
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
	}, g, { classes: z({}, _, { notchedOutline: null }) }));
});
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/Star.js
Mx.muiName = "Input", pm();
var Nx = um(/*#__PURE__*/ (0, X.jsx)("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }), "Star");
//#endregion
//#region node_modules/@mui/material/internal/svg-icons/StarBorder.js
pm();
var Px = um(/*#__PURE__*/ (0, X.jsx)("path", { d: "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" }), "StarBorder");
bo(), vo();
function Fx(e) {
	return ho("MuiRating", e);
}
var Ix = H("MuiRating", [
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
W(), B(), jo(), Co(), ro(), co(), Wm(), _s(), Qp();
var Lx = ["value"], Rx = [
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
function zx(e) {
	let t = e.toString().split(".")[1];
	return t ? t.length : 0;
}
function Bx(e, t) {
	if (e == null) return e;
	let n = Math.round(e / t) * t;
	return Number(n.toFixed(zx(t)));
}
var Vx = (e) => {
	let { classes: t, size: n, readOnly: r, disabled: i, emptyValueFocused: a, focusVisible: o } = e;
	return V({
		root: [
			"root",
			`size${K(n)}`,
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
	}, Fx, t);
}, Hx = Y("span", {
	name: "MuiRating",
	slot: "Root",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`& .${Ix.visuallyHidden}`]: t.visuallyHidden },
			t.root,
			t[`size${K(n.size)}`],
			n.readOnly && t.readOnly
		];
	}
})(({ theme: e, ownerState: t }) => z({
	display: "inline-flex",
	position: "relative",
	fontSize: e.typography.pxToRem(24),
	color: "#faaf00",
	cursor: "pointer",
	textAlign: "left",
	width: "min-content",
	WebkitTapHighlightColor: "transparent",
	[`&.${Ix.disabled}`]: {
		opacity: (e.vars || e).palette.action.disabledOpacity,
		pointerEvents: "none"
	},
	[`&.${Ix.focusVisible} .${Ix.iconActive}`]: { outline: "1px solid #999" },
	[`& .${Ix.visuallyHidden}`]: to
}, t.size === "small" && { fontSize: e.typography.pxToRem(18) }, t.size === "large" && { fontSize: e.typography.pxToRem(30) }, t.readOnly && { pointerEvents: "none" })), Ux = Y("label", {
	name: "MuiRating",
	slot: "Label",
	overridesResolver: ({ ownerState: e }, t) => [t.label, e.emptyValueFocused && t.labelEmptyValueActive]
})(({ ownerState: e }) => z({ cursor: "inherit" }, e.emptyValueFocused && {
	top: 0,
	bottom: 0,
	position: "absolute",
	outline: "1px solid #999",
	width: "100%"
})), Wx = Y("span", {
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
})(({ theme: e, ownerState: t }) => z({
	display: "flex",
	transition: e.transitions.create("transform", { duration: e.transitions.duration.shortest }),
	pointerEvents: "none"
}, t.iconActive && { transform: "scale(1.2)" }, t.iconEmpty && { color: (e.vars || e).palette.action.disabled })), Gx = Y("span", {
	name: "MuiRating",
	slot: "Decimal",
	shouldForwardProp: (e) => qp(e) && e !== "iconActive",
	overridesResolver: (e, t) => {
		let { iconActive: n } = e;
		return [t.decimal, n && t.iconActive];
	}
})(({ iconActive: e }) => z({ position: "relative" }, e && { transform: "scale(1.2)" }));
function Kx(e) {
	let t = U(e, Lx);
	return /*#__PURE__*/ (0, X.jsx)("span", z({}, t));
}
function qx(e) {
	let { classes: t, disabled: n, emptyIcon: r, focus: i, getLabelText: a, highlightSelectedOnly: o, hover: s, icon: c, IconContainerComponent: l, isActive: u, itemValue: d, labelProps: f, name: p, onBlur: m, onChange: h, onClick: g, onFocus: _, readOnly: v, ownerState: y, ratingValue: b, ratingValueRounded: x } = e, S = o ? d === b : d <= b, C = d <= s, w = d <= i, T = d === x, E = Am(), D = /*#__PURE__*/ (0, X.jsx)(Wx, {
		as: l,
		value: d,
		className: G(t.icon, S ? t.iconFilled : t.iconEmpty, C && t.iconHover, w && t.iconFocus, u && t.iconActive),
		ownerState: z({}, y, {
			iconEmpty: !S,
			iconFilled: S,
			iconHover: C,
			iconFocus: w,
			iconActive: u
		}),
		children: r && !S ? r : c
	});
	return v ? /*#__PURE__*/ (0, X.jsx)("span", z({}, f, { children: D })) : /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [/*#__PURE__*/ (0, X.jsxs)(Ux, z({
		ownerState: z({}, y, { emptyValueFocused: void 0 }),
		htmlFor: E
	}, f, { children: [D, /*#__PURE__*/ (0, X.jsx)("span", {
		className: t.visuallyHidden,
		children: a(d)
	})] })), /*#__PURE__*/ (0, X.jsx)("input", {
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
var Jx = /*#__PURE__*/ (0, X.jsx)(Nx, { fontSize: "inherit" }), Yx = /*#__PURE__*/ (0, X.jsx)(Px, { fontSize: "inherit" });
function Xx(e) {
	return `${e} Star${e === 1 ? "" : "s"}`;
}
var Zx = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		name: "MuiRating",
		props: e
	}), { className: r, defaultValue: i = null, disabled: a = !1, emptyIcon: o = Yx, emptyLabelText: s = "Empty", getLabelText: c = Xx, highlightSelectedOnly: l = !1, icon: u = Jx, IconContainerComponent: d = Kx, max: f = 5, name: p, onChange: m, onChangeActive: h, onMouseLeave: g, onMouseMove: _, precision: v = 1, readOnly: y = !1, size: b = "medium", value: x } = n, S = U(n, Rx), C = Am(p), [w, T] = Pm({
		controlled: x,
		default: i,
		name: "Rating"
	}), E = Bx(w, v), D = Mh(), [{ hover: O, focus: k }, A] = R.useState({
		hover: -1,
		focus: -1
	}), j = E;
	O !== -1 && (j = O), k !== -1 && (j = k);
	let { isFocusVisibleRef: ee, onBlur: M, onFocus: te, ref: ne } = Bm(), [re, N] = R.useState(!1), ie = R.useRef(), P = Rm(ne, ie, t), ae = (e) => {
		_ && _(e);
		let { right: t, left: n, width: r } = ie.current.getBoundingClientRect(), i;
		i = D ? (t - e.clientX) / r : (e.clientX - n) / r;
		let a = Bx(f * i + v / 2, v);
		a = xo(a, v, f), A((e) => e.hover === a && e.focus === a ? e : {
			hover: a,
			focus: a
		}), N(!1), h && O !== a && h(e, a);
	}, F = (e) => {
		g && g(e), A({
			hover: -1,
			focus: -1
		}), h && O !== -1 && h(e, -1);
	}, oe = (e) => {
		let t = e.target.value === "" ? null : parseFloat(e.target.value);
		O !== -1 && (t = O), T(t), m && m(e, t);
	}, se = (e) => {
		(e.clientX !== 0 || e.clientY !== 0) && (A({
			hover: -1,
			focus: -1
		}), T(null), m && parseFloat(e.target.value) === E && m(e, null));
	}, ce = (e) => {
		te(e), ee.current === !0 && N(!0);
		let t = parseFloat(e.target.value);
		A((e) => ({
			hover: e.hover,
			focus: t
		}));
	}, le = (e) => {
		O === -1 && (M(e), ee.current === !1 && N(!1), A((e) => ({
			hover: e.hover,
			focus: -1
		})));
	}, [ue, de] = R.useState(!1), fe = z({}, n, {
		defaultValue: i,
		disabled: a,
		emptyIcon: o,
		emptyLabelText: s,
		emptyValueFocused: ue,
		focusVisible: re,
		getLabelText: c,
		icon: u,
		IconContainerComponent: d,
		max: f,
		precision: v,
		readOnly: y,
		size: b
	}), pe = Vx(fe);
	return /*#__PURE__*/ (0, X.jsxs)(Hx, z({
		ref: P,
		onMouseMove: ae,
		onMouseLeave: F,
		className: G(pe.root, r, y && "MuiRating-readOnly"),
		ownerState: fe,
		role: y ? "img" : null,
		"aria-label": y ? c(j) : null
	}, S, { children: [Array.from(Array(f)).map((e, t) => {
		let n = t + 1, r = {
			classes: pe,
			disabled: a,
			emptyIcon: o,
			focus: k,
			getLabelText: c,
			highlightSelectedOnly: l,
			hover: O,
			icon: u,
			IconContainerComponent: d,
			name: C,
			onBlur: le,
			onChange: oe,
			onClick: se,
			onFocus: ce,
			ratingValue: j,
			ratingValueRounded: E,
			readOnly: y,
			ownerState: fe
		}, i = n === Math.ceil(j) && (O !== -1 || k !== -1);
		if (v < 1) {
			let e = Array.from(Array(1 / v));
			return /*#__PURE__*/ (0, X.jsx)(Gx, {
				className: G(pe.decimal, i && pe.iconActive),
				ownerState: fe,
				iconActive: i,
				children: e.map((t, i) => {
					let a = Bx(n - 1 + (i + 1) * v, v);
					return /*#__PURE__*/ (0, X.jsx)(qx, z({}, r, {
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
		return /*#__PURE__*/ (0, X.jsx)(qx, z({}, r, {
			isActive: i,
			itemValue: n
		}), n);
	}), !y && !a && /*#__PURE__*/ (0, X.jsxs)(Ux, {
		className: G(pe.label, pe.labelEmptyValue),
		ownerState: fe,
		children: [/*#__PURE__*/ (0, X.jsx)("input", {
			className: pe.visuallyHidden,
			value: "",
			id: `${C}-empty`,
			type: "radio",
			name: C,
			checked: E == null,
			onFocus: () => de(!0),
			onBlur: () => de(!1),
			onChange: oe
		}), /*#__PURE__*/ (0, X.jsx)("span", {
			className: pe.visuallyHidden,
			children: s
		})]
	})] }));
});
bo(), vo();
function Qx(e) {
	return ho("MuiSelect", e);
}
var $x = H("MuiSelect", [
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
B(), W(), Ci(), jo(), co(), ua(), xm(), $o(), Qp(), zm(), Fm();
var eS, tS = /* @__PURE__ */ "aria-describedby.aria-label.autoFocus.autoWidth.children.className.defaultOpen.defaultValue.disabled.displayEmpty.error.IconComponent.inputRef.labelId.MenuProps.multiple.name.onBlur.onChange.onClose.onFocus.onOpen.open.readOnly.renderValue.SelectDisplayProps.tabIndex.type.value.variant".split("."), nS = Y("div", {
	name: "MuiSelect",
	slot: "Select",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			{ [`&.${$x.select}`]: t.select },
			{ [`&.${$x.select}`]: t[n.variant] },
			{ [`&.${$x.error}`]: t.error },
			{ [`&.${$x.multiple}`]: t.multiple }
		];
	}
})(_x, { [`&.${$x.select}`]: {
	height: "auto",
	minHeight: "1.4375em",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	overflow: "hidden"
} }), rS = Y("svg", {
	name: "MuiSelect",
	slot: "Icon",
	overridesResolver: (e, t) => {
		let { ownerState: n } = e;
		return [
			t.icon,
			n.variant && t[`icon${K(n.variant)}`],
			n.open && t.iconOpen
		];
	}
})(yx), iS = Y("input", {
	shouldForwardProp: (e) => qp(e) && e !== "classes",
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
function aS(e, t) {
	return typeof t == "object" && t ? e === t : String(e) === String(t);
}
function oS(e) {
	return e == null || typeof e == "string" && !e.trim();
}
var sS = (e) => {
	let { classes: t, variant: n, disabled: r, multiple: i, open: a, error: o } = e;
	return V({
		select: [
			"select",
			n,
			r && "disabled",
			i && "multiple",
			o && "error"
		],
		icon: [
			"icon",
			`icon${K(n)}`,
			a && "iconOpen",
			r && "disabled"
		],
		nativeInput: ["nativeInput"]
	}, Qx, t);
}, cS = /*#__PURE__*/ R.forwardRef(function(e, t) {
	var n;
	let { "aria-describedby": r, "aria-label": i, autoFocus: a, autoWidth: o, children: s, className: c, defaultOpen: l, defaultValue: u, disabled: d, displayEmpty: f, error: p = !1, IconComponent: m, inputRef: h, labelId: g, MenuProps: _ = {}, multiple: v, name: y, onBlur: b, onChange: x, onClose: S, onFocus: C, onOpen: w, open: T, readOnly: E, renderValue: D, SelectDisplayProps: O = {}, tabIndex: k, value: A, variant: j = "standard" } = e, ee = U(e, tS), [M, te] = Pm({
		controlled: A,
		default: u,
		name: "Select"
	}), [ne, re] = Pm({
		controlled: T,
		default: l,
		name: "Select"
	}), N = R.useRef(null), ie = R.useRef(null), [P, ae] = R.useState(null), { current: F } = R.useRef(T != null), [oe, se] = R.useState(), ce = Rm(t, h), le = R.useCallback((e) => {
		ie.current = e, e && ae(e);
	}, []), ue = P == null ? void 0 : P.parentNode;
	R.useImperativeHandle(ce, () => ({
		focus: () => {
			ie.current.focus();
		},
		node: N.current,
		value: M
	}), [M]), R.useEffect(() => {
		l && ne && P && !F && (se(o ? null : ue.clientWidth), ie.current.focus());
	}, [P, o]), R.useEffect(() => {
		a && ie.current.focus();
	}, [a]), R.useEffect(() => {
		if (!g) return;
		let e = bm(ie.current).getElementById(g);
		if (e) {
			let t = () => {
				getSelection().isCollapsed && ie.current.focus();
			};
			return e.addEventListener("click", t), () => {
				e.removeEventListener("click", t);
			};
		}
	}, [g]);
	let de = (e, t) => {
		e ? w && w(t) : S && S(t), F || (se(o ? null : ue.clientWidth), re(e));
	}, fe = (e) => {
		e.button === 0 && (e.preventDefault(), ie.current.focus(), de(!0, e));
	}, pe = (e) => {
		de(!1, e);
	}, me = R.Children.toArray(s), he = (e) => {
		let t = me.find((t) => t.props.value === e.target.value);
		t !== void 0 && (te(t.props.value), x && x(e, t));
	}, ge = (e) => (t) => {
		let n;
		if (t.currentTarget.hasAttribute("tabindex")) {
			if (v) {
				n = Array.isArray(M) ? M.slice() : [];
				let t = M.indexOf(e.props.value);
				t === -1 ? n.push(e.props.value) : n.splice(t, 1);
			} else n = e.props.value;
			if (e.props.onClick && e.props.onClick(t), M !== n && (te(n), x)) {
				let r = t.nativeEvent || t, i = new r.constructor(r.type, r);
				Object.defineProperty(i, "target", {
					writable: !0,
					value: {
						value: n,
						name: y
					}
				}), x(i, e);
			}
			v || de(!1, t);
		}
	}, _e = (e) => {
		E || [
			" ",
			"ArrowUp",
			"ArrowDown",
			"Enter"
		].indexOf(e.key) !== -1 && (e.preventDefault(), de(!0, e));
	}, ve = P !== null && ne, ye = (e) => {
		!ve && b && (Object.defineProperty(e, "target", {
			writable: !0,
			value: {
				value: M,
				name: y
			}
		}), b(e));
	};
	delete ee["aria-invalid"];
	let be, xe, Se = [], Ce = !1;
	(j_({ value: M }) || f) && (D ? be = D(M) : Ce = !0);
	let we = me.map((e) => {
		if (!/*#__PURE__*/ R.isValidElement(e)) return null;
		let t;
		if (v) {
			if (!Array.isArray(M)) throw Error(xi(2));
			t = M.some((t) => aS(t, e.props.value)), t && Ce && Se.push(e.props.children);
		} else t = aS(M, e.props.value), t && Ce && (xe = e.props.children);
		return /*#__PURE__*/ R.cloneElement(e, {
			"aria-selected": t ? "true" : "false",
			onClick: ge(e),
			onKeyUp: (t) => {
				t.key === " " && t.preventDefault(), e.props.onKeyUp && e.props.onKeyUp(t);
			},
			role: "option",
			selected: t,
			value: void 0,
			"data-value": e.props.value
		});
	});
	Ce && (be = v ? Se.length === 0 ? null : Se.reduce((e, t, n) => (e.push(t), n < Se.length - 1 && e.push(", "), e), []) : xe);
	let Te = oe;
	!o && F && P && (Te = ue.clientWidth);
	let Ee;
	Ee = k === void 0 ? d ? null : 0 : k;
	let De = O.id || (y ? `mui-component-select-${y}` : void 0), Oe = z({}, e, {
		variant: j,
		value: M,
		open: ve,
		error: p
	}), ke = sS(Oe), Ae = z({}, _.PaperProps, (n = _.slotProps) == null ? void 0 : n.paper), je = aa();
	return /*#__PURE__*/ (0, X.jsxs)(R.Fragment, { children: [
		/*#__PURE__*/ (0, X.jsx)(nS, z({
			ref: le,
			tabIndex: Ee,
			role: "combobox",
			"aria-controls": je,
			"aria-disabled": d ? "true" : void 0,
			"aria-expanded": ve ? "true" : "false",
			"aria-haspopup": "listbox",
			"aria-label": i,
			"aria-labelledby": [g, De].filter(Boolean).join(" ") || void 0,
			"aria-describedby": r,
			onKeyDown: _e,
			onMouseDown: d || E ? null : fe,
			onBlur: ye,
			onFocus: C
		}, O, {
			ownerState: Oe,
			className: G(O.className, ke.select, c),
			id: De,
			children: oS(be) ? eS || (eS = /*#__PURE__*/ (0, X.jsx)("span", {
				className: "notranslate",
				children: "​"
			})) : be
		})),
		/*#__PURE__*/ (0, X.jsx)(iS, z({
			"aria-invalid": p,
			value: Array.isArray(M) ? M.join(",") : M,
			name: y,
			ref: N,
			"aria-hidden": !0,
			onChange: he,
			tabIndex: -1,
			disabled: d,
			className: ke.nativeInput,
			autoFocus: a,
			ownerState: Oe
		}, ee)),
		/*#__PURE__*/ (0, X.jsx)(rS, {
			as: m,
			className: ke.icon,
			ownerState: Oe
		}),
		/*#__PURE__*/ (0, X.jsx)(fx, z({
			id: `menu-${y || ""}`,
			anchorEl: ue,
			open: ve,
			onClose: pe,
			anchorOrigin: {
				vertical: "bottom",
				horizontal: "center"
			},
			transformOrigin: {
				vertical: "top",
				horizontal: "center"
			}
		}, _, {
			MenuListProps: z({
				"aria-labelledby": g,
				role: "listbox",
				"aria-multiselectable": v ? "true" : void 0,
				disableListWrap: !0,
				id: je
			}, _.MenuListProps),
			slotProps: z({}, _.slotProps, { paper: z({}, Ae, { style: z({ minWidth: Te }, Ae == null ? null : Ae.style) }) }),
			children: we
		}))
	] });
});
B(), W(), jo(), bi(), Xo(), _s(), zm(), Qp();
var lS = [
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
], uS = ["root"], dS = (e) => {
	let { classes: t } = e;
	return t;
}, fS = {
	name: "MuiSelect",
	overridesResolver: (e, t) => t.root,
	shouldForwardProp: (e) => Yp(e) && e !== "variant",
	slot: "Root"
}, pS = Y(ob, fS)(""), mS = Y(Mx, fS)(""), hS = Y(jy, fS)(""), gS = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		name: "MuiSelect",
		props: e
	}), { autoWidth: r = !1, children: i, classes: a = {}, className: o, defaultOpen: s = !1, displayEmpty: c = !1, IconComponent: l = Y_, id: u, input: d, inputProps: f, label: p, labelId: m, MenuProps: h, multiple: g = !1, native: _ = !1, onClose: v, onOpen: y, open: b, renderValue: x, SelectDisplayProps: S, variant: C = "outlined" } = n, w = U(n, lS), T = _ ? xx : cS, E = E_({
		props: n,
		muiFormControl: O_(),
		states: ["variant", "error"]
	}), D = E.variant || C, O = z({}, n, {
		variant: D,
		classes: a
	}), k = dS(O), A = U(k, uS), j = d || {
		standard: /*#__PURE__*/ (0, X.jsx)(pS, { ownerState: O }),
		outlined: /*#__PURE__*/ (0, X.jsx)(mS, {
			label: p,
			ownerState: O
		}),
		filled: /*#__PURE__*/ (0, X.jsx)(hS, { ownerState: O })
	}[D], ee = Rm(t, Jo(j));
	return /*#__PURE__*/ (0, X.jsx)(R.Fragment, { children: /*#__PURE__*/ R.cloneElement(j, z({
		inputComponent: T,
		inputProps: z({
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
			SelectDisplayProps: z({ id: u }, S)
		}, f, { classes: f ? _i(A, f.classes) : A }, d ? d.props.inputProps : {})
	}, (g && _ || c) && D === "outlined" ? { notched: !0 } : {}, {
		ref: ee,
		className: G(j.props.className, o, k.root)
	}, !d && { variant: D }, w)) });
});
gS.muiName = "Select", bo(), vo();
function _S(e) {
	return ho("MuiTextField", e);
}
H("MuiTextField", ["root"]), B(), W(), jo(), co(), ua(), Qp(), _s();
var vS = /* @__PURE__ */ "autoComplete.autoFocus.children.className.color.defaultValue.disabled.error.FormHelperTextProps.fullWidth.helperText.id.InputLabelProps.inputProps.InputProps.inputRef.label.maxRows.minRows.multiline.name.onBlur.onChange.onFocus.placeholder.required.rows.select.SelectProps.type.value.variant".split("."), yS = {
	standard: ob,
	filled: jy,
	outlined: Mx
}, bS = (e) => {
	let { classes: t } = e;
	return V({ root: ["root"] }, _S, t);
}, xS = Y(Iy, {
	name: "MuiTextField",
	slot: "Root",
	overridesResolver: (e, t) => t.root
})({}), SS = /*#__PURE__*/ R.forwardRef(function(e, t) {
	let n = hs({
		props: e,
		name: "MuiTextField"
	}), { autoComplete: r, autoFocus: i = !1, children: a, className: o, color: s = "primary", defaultValue: c, disabled: l = !1, error: u = !1, FormHelperTextProps: d, fullWidth: f = !1, helperText: p, id: m, InputLabelProps: h, inputProps: g, InputProps: _, inputRef: v, label: y, maxRows: b, minRows: x, multiline: S = !1, name: C, onBlur: w, onChange: T, onFocus: E, placeholder: D, required: O = !1, rows: k, select: A = !1, SelectProps: j, type: ee, value: M, variant: te = "outlined" } = n, ne = U(n, vS), re = z({}, n, {
		autoFocus: i,
		color: s,
		disabled: l,
		error: u,
		fullWidth: f,
		multiline: S,
		required: O,
		select: A,
		variant: te
	}), N = bS(re), ie = {};
	te === "outlined" && (h && h.shrink !== void 0 && (ie.notched = h.shrink), ie.label = y), A && ((!j || !j.native) && (ie.id = void 0), ie["aria-describedby"] = void 0);
	let P = aa(m), ae = p && P ? `${P}-helper-text` : void 0, F = y && P ? `${P}-label` : void 0, oe = yS[te], se = /*#__PURE__*/ (0, X.jsx)(oe, z({
		"aria-describedby": ae,
		autoComplete: r,
		autoFocus: i,
		defaultValue: c,
		fullWidth: f,
		multiline: S,
		name: C,
		rows: k,
		maxRows: b,
		minRows: x,
		type: ee,
		value: M,
		id: P,
		inputRef: v,
		onBlur: w,
		onChange: T,
		onFocus: E,
		placeholder: D,
		inputProps: g
	}, ie, _));
	return /*#__PURE__*/ (0, X.jsxs)(xS, z({
		className: G(N.root, o),
		disabled: l,
		error: u,
		fullWidth: f,
		ref: t,
		required: O,
		color: s,
		variant: te,
		ownerState: re
	}, ne, { children: [
		y != null && y !== "" && /*#__PURE__*/ (0, X.jsx)(db, z({
			htmlFor: P,
			id: F
		}, h, { children: y })),
		A ? /*#__PURE__*/ (0, X.jsx)(gS, z({
			"aria-describedby": ae,
			id: P,
			labelId: F,
			value: M,
			input: se
		}, j, { children: a })) : se,
		p && /*#__PURE__*/ (0, X.jsx)(Uy, z({ id: ae }, d, { children: p }))
	] }));
}), CS = /* @__PURE__ */ O(Km()), wS = /* @__PURE__ */ O(qm()), TS = /* @__PURE__ */ O(Jm()), ES = /* @__PURE__ */ O(Ym()), DS = /* @__PURE__ */ O(Xm()), OS = /* @__PURE__ */ O(Zm()), kS = /* @__PURE__ */ O(Qm()), AS = /* @__PURE__ */ O($m()), jS = /* @__PURE__ */ O(eh()), { entries: MS, setPrototypeOf: NS, isFrozen: PS, getPrototypeOf: FS, getOwnPropertyDescriptor: IS } = Object, { freeze: LS, seal: RS, create: zS } = Object, { apply: BS, construct: VS } = typeof Reflect < "u" && Reflect;
LS || (LS = function(e) {
	return e;
}), RS || (RS = function(e) {
	return e;
}), BS || (BS = function(e, t) {
	var n = [...arguments].slice(2);
	return e.apply(t, n);
}), VS || (VS = function(e) {
	return new e(...[...arguments].slice(1));
});
var HS = nC(Array.prototype.forEach), US = nC(Array.prototype.lastIndexOf), WS = nC(Array.prototype.pop), GS = nC(Array.prototype.push), KS = nC(Array.prototype.splice), qS = nC(String.prototype.toLowerCase), JS = nC(String.prototype.toString), YS = nC(String.prototype.match), XS = nC(String.prototype.replace), ZS = nC(String.prototype.indexOf), QS = nC(String.prototype.trim), $S = nC(Object.prototype.hasOwnProperty), eC = nC(RegExp.prototype.test), tC = rC(TypeError);
function nC(e) {
	return function(t) {
		t instanceof RegExp && (t.lastIndex = 0);
		var n = [...arguments].slice(1);
		return BS(e, t, n);
	};
}
function rC(e) {
	return function() {
		return VS(e, [...arguments]);
	};
}
function $(e, t) {
	let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : qS;
	NS && NS(e, null);
	let r = t.length;
	for (; r--;) {
		let i = t[r];
		if (typeof i == "string") {
			let e = n(i);
			e !== i && (PS(t) || (t[r] = e), i = e);
		}
		e[i] = !0;
	}
	return e;
}
function iC(e) {
	for (let t = 0; t < e.length; t++) $S(e, t) || (e[t] = null);
	return e;
}
function aC(e) {
	let t = zS(null);
	for (let [n, r] of MS(e)) $S(e, n) && (t[n] = Array.isArray(r) ? iC(r) : r && typeof r == "object" && r.constructor === Object ? aC(r) : r);
	return t;
}
function oC(e, t) {
	for (; e !== null;) {
		let n = IS(e, t);
		if (n) {
			if (n.get) return nC(n.get);
			if (typeof n.value == "function") return nC(n.value);
		}
		e = FS(e);
	}
	function n() {
		return null;
	}
	return n;
}
var sC = LS(/* @__PURE__ */ "a.abbr.acronym.address.area.article.aside.audio.b.bdi.bdo.big.blink.blockquote.body.br.button.canvas.caption.center.cite.code.col.colgroup.content.data.datalist.dd.decorator.del.details.dfn.dialog.dir.div.dl.dt.element.em.fieldset.figcaption.figure.font.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.img.input.ins.kbd.label.legend.li.main.map.mark.marquee.menu.menuitem.meter.nav.nobr.ol.optgroup.option.output.p.picture.pre.progress.q.rp.rt.ruby.s.samp.search.section.select.shadow.slot.small.source.spacer.span.strike.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.tr.track.tt.u.ul.var.video.wbr".split(".")), cC = LS(/* @__PURE__ */ "svg.a.altglyph.altglyphdef.altglyphitem.animatecolor.animatemotion.animatetransform.circle.clippath.defs.desc.ellipse.enterkeyhint.exportparts.filter.font.g.glyph.glyphref.hkern.image.inputmode.line.lineargradient.marker.mask.metadata.mpath.part.path.pattern.polygon.polyline.radialgradient.rect.stop.style.switch.symbol.text.textpath.title.tref.tspan.view.vkern".split(".")), lC = LS([
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
]), uC = LS([
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
]), dC = LS(/* @__PURE__ */ "math.menclose.merror.mfenced.mfrac.mglyph.mi.mlabeledtr.mmultiscripts.mn.mo.mover.mpadded.mphantom.mroot.mrow.ms.mspace.msqrt.mstyle.msub.msup.msubsup.mtable.mtd.mtext.mtr.munder.munderover.mprescripts".split(".")), fC = LS([
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
]), pC = LS(["#text"]), mC = LS(/* @__PURE__ */ "accept.action.align.alt.autocapitalize.autocomplete.autopictureinpicture.autoplay.background.bgcolor.border.capture.cellpadding.cellspacing.checked.cite.class.clear.color.cols.colspan.controls.controlslist.coords.crossorigin.datetime.decoding.default.dir.disabled.disablepictureinpicture.disableremoteplayback.download.draggable.enctype.enterkeyhint.exportparts.face.for.headers.height.hidden.high.href.hreflang.id.inert.inputmode.integrity.ismap.kind.label.lang.list.loading.loop.low.max.maxlength.media.method.min.minlength.multiple.muted.name.nonce.noshade.novalidate.nowrap.open.optimum.part.pattern.placeholder.playsinline.popover.popovertarget.popovertargetaction.poster.preload.pubdate.radiogroup.readonly.rel.required.rev.reversed.role.rows.rowspan.spellcheck.scope.selected.shape.size.sizes.slot.span.srclang.start.src.srcset.step.style.summary.tabindex.title.translate.type.usemap.valign.value.width.wrap.xmlns.slot".split(".")), hC = LS(/* @__PURE__ */ "accent-height.accumulate.additive.alignment-baseline.amplitude.ascent.attributename.attributetype.azimuth.basefrequency.baseline-shift.begin.bias.by.class.clip.clippathunits.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.cx.cy.d.dx.dy.diffuseconstant.direction.display.divisor.dur.edgemode.elevation.end.exponent.fill.fill-opacity.fill-rule.filter.filterunits.flood-color.flood-opacity.font-family.font-size.font-size-adjust.font-stretch.font-style.font-variant.font-weight.fx.fy.g1.g2.glyph-name.glyphref.gradientunits.gradienttransform.height.href.id.image-rendering.in.in2.intercept.k.k1.k2.k3.k4.kerning.keypoints.keysplines.keytimes.lang.lengthadjust.letter-spacing.kernelmatrix.kernelunitlength.lighting-color.local.marker-end.marker-mid.marker-start.markerheight.markerunits.markerwidth.maskcontentunits.maskunits.max.mask.mask-type.media.method.mode.min.name.numoctaves.offset.operator.opacity.order.orient.orientation.origin.overflow.paint-order.path.pathlength.patterncontentunits.patterntransform.patternunits.points.preservealpha.preserveaspectratio.primitiveunits.r.rx.ry.radius.refx.refy.repeatcount.repeatdur.restart.result.rotate.scale.seed.shape-rendering.slope.specularconstant.specularexponent.spreadmethod.startoffset.stddeviation.stitchtiles.stop-color.stop-opacity.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke.stroke-width.style.surfacescale.systemlanguage.tabindex.tablevalues.targetx.targety.transform.transform-origin.text-anchor.text-decoration.text-rendering.textlength.type.u1.u2.unicode.values.viewbox.visibility.version.vert-adv-y.vert-origin-x.vert-origin-y.width.word-spacing.wrap.writing-mode.xchannelselector.ychannelselector.x.x1.x2.xmlns.y.y1.y2.z.zoomandpan".split(".")), gC = LS(/* @__PURE__ */ "accent.accentunder.align.bevelled.close.columnsalign.columnlines.columnspan.denomalign.depth.dir.display.displaystyle.encoding.fence.frame.height.href.id.largeop.length.linethickness.lspace.lquote.mathbackground.mathcolor.mathsize.mathvariant.maxsize.minsize.movablelimits.notation.numalign.open.rowalign.rowlines.rowspacing.rowspan.rspace.rquote.scriptlevel.scriptminsize.scriptsizemultiplier.selection.separator.separators.stretchy.subscriptshift.supscriptshift.symmetric.voffset.width.xmlns".split(".")), _C = LS([
	"xlink:href",
	"xml:id",
	"xlink:title",
	"xml:space",
	"xmlns:xlink"
]), vC = RS(/\{\{[\w\W]*|[\w\W]*\}\}/gm), yC = RS(/<%[\w\W]*|[\w\W]*%>/gm), bC = RS(/\$\{[\w\W]*/gm), xC = RS(/^data-[\-\w.\u00B7-\uFFFF]+$/), SC = RS(/^aria-[\-\w]+$/), CC = RS(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i), wC = RS(/^(?:\w+script|data):/i), TC = RS(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g), EC = RS(/^html$/i), DC = RS(/^[a-z][.\w]*(-[.\w]+)+$/i), OC = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	ARIA_ATTR: SC,
	ATTR_WHITESPACE: TC,
	CUSTOM_ELEMENT: DC,
	DATA_ATTR: xC,
	DOCTYPE_NAME: EC,
	ERB_EXPR: yC,
	IS_ALLOWED_URI: CC,
	IS_SCRIPT_OR_DATA: wC,
	MUSTACHE_EXPR: vC,
	TMPLIT_EXPR: bC
}), kC = {
	element: 1,
	attribute: 2,
	text: 3,
	cdataSection: 4,
	entityReference: 5,
	entityNode: 6,
	progressingInstruction: 7,
	comment: 8,
	document: 9,
	documentType: 10,
	documentFragment: 11,
	notation: 12
}, AC = function() {
	return typeof window > "u" ? null : window;
}, jC = function(e, t) {
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
}, MC = function() {
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
};
function NC() {
	let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : AC(), t = (e) => NC(e);
	if (t.version = "3.3.2", t.removed = [], !e || !e.document || e.document.nodeType !== kC.document || !e.Element) return t.isSupported = !1, t;
	let { document: n } = e, r = n, i = r.currentScript, { DocumentFragment: a, HTMLTemplateElement: o, Node: s, Element: c, NodeFilter: l, NamedNodeMap: u = e.NamedNodeMap || e.MozNamedAttrMap, HTMLFormElement: d, DOMParser: f, trustedTypes: p } = e, m = c.prototype, h = oC(m, "cloneNode"), g = oC(m, "remove"), _ = oC(m, "nextSibling"), v = oC(m, "childNodes"), y = oC(m, "parentNode");
	if (typeof o == "function") {
		let e = n.createElement("template");
		e.content && e.content.ownerDocument && (n = e.content.ownerDocument);
	}
	let b, x = "", { implementation: S, createNodeIterator: C, createDocumentFragment: w, getElementsByTagName: T } = n, { importNode: E } = r, D = MC();
	t.isSupported = typeof MS == "function" && typeof y == "function" && S && S.createHTMLDocument !== void 0;
	let { MUSTACHE_EXPR: O, ERB_EXPR: k, TMPLIT_EXPR: A, DATA_ATTR: j, ARIA_ATTR: ee, IS_SCRIPT_OR_DATA: M, ATTR_WHITESPACE: te, CUSTOM_ELEMENT: ne } = OC, { IS_ALLOWED_URI: re } = OC, N = null, ie = $({}, [
		...sC,
		...cC,
		...lC,
		...dC,
		...pC
	]), P = null, ae = $({}, [
		...mC,
		...hC,
		...gC,
		..._C
	]), F = Object.seal(zS(null, {
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
	})), oe = null, se = null, ce = Object.seal(zS(null, {
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
	})), le = !0, ue = !0, de = !1, fe = !0, pe = !1, me = !0, he = !1, ge = !1, _e = !1, ve = !1, ye = !1, be = !1, xe = !0, Se = !1, Ce = !0, we = !1, Te = {}, Ee = null, De = $({}, [
		"annotation-xml",
		"audio",
		"colgroup",
		"desc",
		"foreignobject",
		"head",
		"iframe",
		"math",
		"mi",
		"mn",
		"mo",
		"ms",
		"mtext",
		"noembed",
		"noframes",
		"noscript",
		"plaintext",
		"script",
		"style",
		"svg",
		"template",
		"thead",
		"title",
		"video",
		"xmp"
	]), Oe = null, ke = $({}, [
		"audio",
		"video",
		"img",
		"source",
		"image",
		"track"
	]), Ae = null, je = $({}, [
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
	]), Me = "http://www.w3.org/1998/Math/MathML", Ne = "http://www.w3.org/2000/svg", Pe = "http://www.w3.org/1999/xhtml", Fe = Pe, Ie = !1, Le = null, Re = $({}, [
		Me,
		Ne,
		Pe
	], JS), ze = $({}, [
		"mi",
		"mo",
		"mn",
		"ms",
		"mtext"
	]), Be = $({}, ["annotation-xml"]), Ve = $({}, [
		"title",
		"style",
		"font",
		"a",
		"script"
	]), He = null, Ue = ["application/xhtml+xml", "text/html"], We = null, Ge = null, Ke = n.createElement("form"), qe = function(e) {
		return e instanceof RegExp || e instanceof Function;
	}, Je = function() {
		let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		if (!(Ge && Ge === e)) {
			if ((!e || typeof e != "object") && (e = {}), e = aC(e), He = Ue.indexOf(e.PARSER_MEDIA_TYPE) === -1 ? "text/html" : e.PARSER_MEDIA_TYPE, We = He === "application/xhtml+xml" ? JS : qS, N = $S(e, "ALLOWED_TAGS") ? $({}, e.ALLOWED_TAGS, We) : ie, P = $S(e, "ALLOWED_ATTR") ? $({}, e.ALLOWED_ATTR, We) : ae, Le = $S(e, "ALLOWED_NAMESPACES") ? $({}, e.ALLOWED_NAMESPACES, JS) : Re, Ae = $S(e, "ADD_URI_SAFE_ATTR") ? $(aC(je), e.ADD_URI_SAFE_ATTR, We) : je, Oe = $S(e, "ADD_DATA_URI_TAGS") ? $(aC(ke), e.ADD_DATA_URI_TAGS, We) : ke, Ee = $S(e, "FORBID_CONTENTS") ? $({}, e.FORBID_CONTENTS, We) : De, oe = $S(e, "FORBID_TAGS") ? $({}, e.FORBID_TAGS, We) : aC({}), se = $S(e, "FORBID_ATTR") ? $({}, e.FORBID_ATTR, We) : aC({}), Te = $S(e, "USE_PROFILES") ? e.USE_PROFILES : !1, le = e.ALLOW_ARIA_ATTR !== !1, ue = e.ALLOW_DATA_ATTR !== !1, de = e.ALLOW_UNKNOWN_PROTOCOLS || !1, fe = e.ALLOW_SELF_CLOSE_IN_ATTR !== !1, pe = e.SAFE_FOR_TEMPLATES || !1, me = e.SAFE_FOR_XML !== !1, he = e.WHOLE_DOCUMENT || !1, ve = e.RETURN_DOM || !1, ye = e.RETURN_DOM_FRAGMENT || !1, be = e.RETURN_TRUSTED_TYPE || !1, _e = e.FORCE_BODY || !1, xe = e.SANITIZE_DOM !== !1, Se = e.SANITIZE_NAMED_PROPS || !1, Ce = e.KEEP_CONTENT !== !1, we = e.IN_PLACE || !1, re = e.ALLOWED_URI_REGEXP || CC, Fe = e.NAMESPACE || Pe, ze = e.MATHML_TEXT_INTEGRATION_POINTS || ze, Be = e.HTML_INTEGRATION_POINTS || Be, F = e.CUSTOM_ELEMENT_HANDLING || {}, e.CUSTOM_ELEMENT_HANDLING && qe(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (F.tagNameCheck = e.CUSTOM_ELEMENT_HANDLING.tagNameCheck), e.CUSTOM_ELEMENT_HANDLING && qe(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (F.attributeNameCheck = e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), e.CUSTOM_ELEMENT_HANDLING && typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (F.allowCustomizedBuiltInElements = e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), pe && (ue = !1), ye && (ve = !0), Te && (N = $({}, pC), P = zS(null), Te.html === !0 && ($(N, sC), $(P, mC)), Te.svg === !0 && ($(N, cC), $(P, hC), $(P, _C)), Te.svgFilters === !0 && ($(N, lC), $(P, hC), $(P, _C)), Te.mathMl === !0 && ($(N, dC), $(P, gC), $(P, _C))), $S(e, "ADD_TAGS") || (ce.tagCheck = null), $S(e, "ADD_ATTR") || (ce.attributeCheck = null), e.ADD_TAGS && (typeof e.ADD_TAGS == "function" ? ce.tagCheck = e.ADD_TAGS : (N === ie && (N = aC(N)), $(N, e.ADD_TAGS, We))), e.ADD_ATTR && (typeof e.ADD_ATTR == "function" ? ce.attributeCheck = e.ADD_ATTR : (P === ae && (P = aC(P)), $(P, e.ADD_ATTR, We))), e.ADD_URI_SAFE_ATTR && $(Ae, e.ADD_URI_SAFE_ATTR, We), e.FORBID_CONTENTS && (Ee === De && (Ee = aC(Ee)), $(Ee, e.FORBID_CONTENTS, We)), e.ADD_FORBID_CONTENTS && (Ee === De && (Ee = aC(Ee)), $(Ee, e.ADD_FORBID_CONTENTS, We)), Ce && (N["#text"] = !0), he && $(N, [
				"html",
				"head",
				"body"
			]), N.table && ($(N, ["tbody"]), delete oe.tbody), e.TRUSTED_TYPES_POLICY) {
				if (typeof e.TRUSTED_TYPES_POLICY.createHTML != "function") throw tC("TRUSTED_TYPES_POLICY configuration option must provide a \"createHTML\" hook.");
				if (typeof e.TRUSTED_TYPES_POLICY.createScriptURL != "function") throw tC("TRUSTED_TYPES_POLICY configuration option must provide a \"createScriptURL\" hook.");
				b = e.TRUSTED_TYPES_POLICY, x = b.createHTML("");
			} else b === void 0 && (b = jC(p, i)), b !== null && typeof x == "string" && (x = b.createHTML(""));
			LS && LS(e), Ge = e;
		}
	}, Ye = $({}, [
		...cC,
		...lC,
		...uC
	]), Xe = $({}, [...dC, ...fC]), Ze = function(e) {
		let t = y(e);
		(!t || !t.tagName) && (t = {
			namespaceURI: Fe,
			tagName: "template"
		});
		let n = qS(e.tagName), r = qS(t.tagName);
		return Le[e.namespaceURI] ? e.namespaceURI === Ne ? t.namespaceURI === Pe ? n === "svg" : t.namespaceURI === Me ? n === "svg" && (r === "annotation-xml" || ze[r]) : !!Ye[n] : e.namespaceURI === Me ? t.namespaceURI === Pe ? n === "math" : t.namespaceURI === Ne ? n === "math" && Be[r] : !!Xe[n] : e.namespaceURI === Pe ? t.namespaceURI === Ne && !Be[r] || t.namespaceURI === Me && !ze[r] ? !1 : !Xe[n] && (Ve[n] || !Ye[n]) : !!(He === "application/xhtml+xml" && Le[e.namespaceURI]) : !1;
	}, Qe = function(e) {
		GS(t.removed, { element: e });
		try {
			y(e).removeChild(e);
		} catch {
			g(e);
		}
	}, $e = function(e, n) {
		try {
			GS(t.removed, {
				attribute: n.getAttributeNode(e),
				from: n
			});
		} catch {
			GS(t.removed, {
				attribute: null,
				from: n
			});
		}
		if (n.removeAttribute(e), e === "is") {
			if (ve || ye) try {
				Qe(n);
			} catch {}
			else try {
				n.setAttribute(e, "");
			} catch {}
		}
	}, et = function(e) {
		let t = null, r = null;
		if (_e) e = "<remove></remove>" + e;
		else {
			let t = YS(e, /^[\r\n\t ]+/);
			r = t && t[0];
		}
		He === "application/xhtml+xml" && Fe === Pe && (e = "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head></head><body>" + e + "</body></html>");
		let i = b ? b.createHTML(e) : e;
		if (Fe === Pe) try {
			t = new f().parseFromString(i, He);
		} catch {}
		if (!t || !t.documentElement) {
			t = S.createDocument(Fe, "template", null);
			try {
				t.documentElement.innerHTML = Ie ? x : i;
			} catch {}
		}
		let a = t.body || t.documentElement;
		return e && r && a.insertBefore(n.createTextNode(r), a.childNodes[0] || null), Fe === Pe ? T.call(t, he ? "html" : "body")[0] : he ? t.documentElement : a;
	}, tt = function(e) {
		return C.call(e.ownerDocument || e, e, l.SHOW_ELEMENT | l.SHOW_COMMENT | l.SHOW_TEXT | l.SHOW_PROCESSING_INSTRUCTION | l.SHOW_CDATA_SECTION, null);
	}, nt = function(e) {
		return e instanceof d && (typeof e.nodeName != "string" || typeof e.textContent != "string" || typeof e.removeChild != "function" || !(e.attributes instanceof u) || typeof e.removeAttribute != "function" || typeof e.setAttribute != "function" || typeof e.namespaceURI != "string" || typeof e.insertBefore != "function" || typeof e.hasChildNodes != "function");
	}, rt = function(e) {
		return typeof s == "function" && e instanceof s;
	};
	function it(e, n, r) {
		HS(e, (e) => {
			e.call(t, n, r, Ge);
		});
	}
	let at = function(e) {
		let n = null;
		if (it(D.beforeSanitizeElements, e, null), nt(e)) return Qe(e), !0;
		let r = We(e.nodeName);
		if (it(D.uponSanitizeElement, e, {
			tagName: r,
			allowedTags: N
		}), me && e.hasChildNodes() && !rt(e.firstElementChild) && eC(/<[/\w!]/g, e.innerHTML) && eC(/<[/\w!]/g, e.textContent) || e.nodeType === kC.progressingInstruction || me && e.nodeType === kC.comment && eC(/<[/\w]/g, e.data)) return Qe(e), !0;
		if (!(ce.tagCheck instanceof Function && ce.tagCheck(r)) && (!N[r] || oe[r])) {
			if (!oe[r] && st(r) && (F.tagNameCheck instanceof RegExp && eC(F.tagNameCheck, r) || F.tagNameCheck instanceof Function && F.tagNameCheck(r))) return !1;
			if (Ce && !Ee[r]) {
				let t = y(e) || e.parentNode, n = v(e) || e.childNodes;
				if (n && t) {
					let r = n.length;
					for (let i = r - 1; i >= 0; --i) {
						let r = h(n[i], !0);
						r.__removalCount = (e.__removalCount || 0) + 1, t.insertBefore(r, _(e));
					}
				}
			}
			return Qe(e), !0;
		}
		return e instanceof c && !Ze(e) || (r === "noscript" || r === "noembed" || r === "noframes") && eC(/<\/no(script|embed|frames)/i, e.innerHTML) ? (Qe(e), !0) : (pe && e.nodeType === kC.text && (n = e.textContent, HS([
			O,
			k,
			A
		], (e) => {
			n = XS(n, e, " ");
		}), e.textContent !== n && (GS(t.removed, { element: e.cloneNode() }), e.textContent = n)), it(D.afterSanitizeElements, e, null), !1);
	}, ot = function(e, t, r) {
		if (se[t] || xe && (t === "id" || t === "name") && (r in n || r in Ke)) return !1;
		if (!(ue && !se[t] && eC(j, t)) && !(le && eC(ee, t)) && !(ce.attributeCheck instanceof Function && ce.attributeCheck(t, e))) {
			if (!P[t] || se[t]) {
				if (!(st(e) && (F.tagNameCheck instanceof RegExp && eC(F.tagNameCheck, e) || F.tagNameCheck instanceof Function && F.tagNameCheck(e)) && (F.attributeNameCheck instanceof RegExp && eC(F.attributeNameCheck, t) || F.attributeNameCheck instanceof Function && F.attributeNameCheck(t, e)) || t === "is" && F.allowCustomizedBuiltInElements && (F.tagNameCheck instanceof RegExp && eC(F.tagNameCheck, r) || F.tagNameCheck instanceof Function && F.tagNameCheck(r)))) return !1;
			} else if (!Ae[t] && !eC(re, XS(r, te, "")) && (t !== "src" && t !== "xlink:href" && t !== "href" || e === "script" || ZS(r, "data:") !== 0 || !Oe[e]) && (!de || eC(M, XS(r, te, ""))) && r) return !1;
		}
		return !0;
	}, st = function(e) {
		return e !== "annotation-xml" && YS(e, ne);
	}, ct = function(e) {
		it(D.beforeSanitizeAttributes, e, null);
		let { attributes: n } = e;
		if (!n || nt(e)) return;
		let r = {
			attrName: "",
			attrValue: "",
			keepAttr: !0,
			allowedAttributes: P,
			forceKeepAttr: void 0
		}, i = n.length;
		for (; i--;) {
			let { name: a, namespaceURI: o, value: s } = n[i], c = We(a), l = s, u = a === "value" ? l : QS(l);
			if (r.attrName = c, r.attrValue = u, r.keepAttr = !0, r.forceKeepAttr = void 0, it(D.uponSanitizeAttribute, e, r), u = r.attrValue, Se && (c === "id" || c === "name") && ($e(a, e), u = "user-content-" + u), me && eC(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, u)) {
				$e(a, e);
				continue;
			}
			if (c === "attributename" && YS(u, "href")) {
				$e(a, e);
				continue;
			}
			if (r.forceKeepAttr) continue;
			if (!r.keepAttr) {
				$e(a, e);
				continue;
			}
			if (!fe && eC(/\/>/i, u)) {
				$e(a, e);
				continue;
			}
			pe && HS([
				O,
				k,
				A
			], (e) => {
				u = XS(u, e, " ");
			});
			let d = We(e.nodeName);
			if (!ot(d, c, u)) {
				$e(a, e);
				continue;
			}
			if (b && typeof p == "object" && typeof p.getAttributeType == "function" && !o) switch (p.getAttributeType(d, c)) {
				case "TrustedHTML":
					u = b.createHTML(u);
					break;
				case "TrustedScriptURL": u = b.createScriptURL(u);
			}
			if (u !== l) try {
				o ? e.setAttributeNS(o, a, u) : e.setAttribute(a, u), nt(e) ? Qe(e) : WS(t.removed);
			} catch {
				$e(a, e);
			}
		}
		it(D.afterSanitizeAttributes, e, null);
	}, lt = function e(t) {
		let n = null, r = tt(t);
		for (it(D.beforeSanitizeShadowDOM, t, null); n = r.nextNode();) it(D.uponSanitizeShadowNode, n, null), at(n), ct(n), n.content instanceof a && e(n.content);
		it(D.afterSanitizeShadowDOM, t, null);
	};
	return t.sanitize = function(e) {
		let n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, i = null, o = null, c = null, l = null;
		if (Ie = !e, Ie && (e = "<!-->"), typeof e != "string" && !rt(e)) {
			if (typeof e.toString == "function") {
				if (e = e.toString(), typeof e != "string") throw tC("dirty is not a string, aborting");
			} else throw tC("toString is not a function");
		}
		if (!t.isSupported) return e;
		if (ge || Je(n), t.removed = [], typeof e == "string" && (we = !1), we) {
			if (e.nodeName) {
				let t = We(e.nodeName);
				if (!N[t] || oe[t]) throw tC("root node is forbidden and cannot be sanitized in-place");
			}
		} else if (e instanceof s) i = et("<!---->"), o = i.ownerDocument.importNode(e, !0), o.nodeType === kC.element && o.nodeName === "BODY" || o.nodeName === "HTML" ? i = o : i.appendChild(o);
		else {
			if (!ve && !pe && !he && e.indexOf("<") === -1) return b && be ? b.createHTML(e) : e;
			if (i = et(e), !i) return ve ? null : be ? x : "";
		}
		i && _e && Qe(i.firstChild);
		let u = tt(we ? e : i);
		for (; c = u.nextNode();) at(c), ct(c), c.content instanceof a && lt(c.content);
		if (we) return e;
		if (ve) {
			if (ye) for (l = w.call(i.ownerDocument); i.firstChild;) l.appendChild(i.firstChild);
			else l = i;
			return (P.shadowroot || P.shadowrootmode) && (l = E.call(r, l, !0)), l;
		}
		let d = he ? i.outerHTML : i.innerHTML;
		return he && N["!doctype"] && i.ownerDocument && i.ownerDocument.doctype && i.ownerDocument.doctype.name && eC(EC, i.ownerDocument.doctype.name) && (d = "<!DOCTYPE " + i.ownerDocument.doctype.name + ">\n" + d), pe && HS([
			O,
			k,
			A
		], (e) => {
			d = XS(d, e, " ");
		}), b && be ? b.createHTML(d) : d;
	}, t.setConfig = function() {
		let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		Je(e), ge = !0;
	}, t.clearConfig = function() {
		Ge = null, ge = !1;
	}, t.isValidAttribute = function(e, t, n) {
		Ge || Je({});
		let r = We(e), i = We(t);
		return ot(r, i, n);
	}, t.addHook = function(e, t) {
		typeof t == "function" && GS(D[e], t);
	}, t.removeHook = function(e, t) {
		if (t !== void 0) {
			let n = US(D[e], t);
			return n === -1 ? void 0 : KS(D[e], n, 1)[0];
		}
		return WS(D[e]);
	}, t.removeHooks = function(e) {
		D[e] = [];
	}, t.removeAllHooks = function() {
		D = MC();
	}, t;
}
var PC = NC(), FC = 3, IC = 15e3, LC = /* @__PURE__ */ new Set([
	"checkout",
	"approval",
	"form",
	"meet_copilot",
	"consent.request"
]), RC = {
	...o,
	color: "#fff"
}, zC = "var(--hart-accent, #6C63FF)", BC = "var(--hart-accent-strong, #5A52E0)", VC = "#64C8FF", HC = "#2ECC71", UC = "#FF6B6B", WC = 0, GC = (e) => typeof e == "string" && /^[A-Z]{3}$/.test(e), KC = (t, n) => GC(n) ? e(t, n) : t;
function qC(e) {
	let [t, n] = (0, R.useState)({
		phase: "idle",
		error: null
	});
	return [t, (0, R.useCallback)(async (t, r) => {
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
function JC({ state: e }) {
	return e.phase !== "error" || !e.error ? null : /* @__PURE__ */ (0, X.jsx)(Z, {
		role: "alert",
		variant: "caption",
		sx: {
			color: UC,
			display: "block",
			mt: .75
		},
		children: e.error
	});
}
function YC({ data: e, navigate: t, onDismiss: n }) {
	let r = {
		info: VC,
		success: HC,
		error: UC,
		warning: "#F39C12"
	}[e.severity] || VC, i = Array.isArray(e.actions) ? e.actions : [];
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		/* @__PURE__ */ (0, X.jsx)(Q, { sx: {
			width: 4,
			height: "100%",
			position: "absolute",
			left: 0,
			top: 0,
			borderRadius: "16px 0 0 16px",
			background: r
		} }),
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: .5
			},
			children: e.title || "Notification"
		}),
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "body2",
			sx: {
				color: "rgba(255,255,255,0.7)",
				whiteSpace: "pre-line"
			},
			children: e.message || e.content
		}),
		i.length > 0 && /* @__PURE__ */ (0, X.jsx)(Q, {
			sx: {
				display: "flex",
				flexWrap: "wrap",
				gap: .5,
				mt: 1
			},
			children: i.map((e, i) => {
				let a = typeof e == "string" ? e : e.label, o = typeof e == "object" ? e.kind : null, s = typeof e == "object" ? e.target : null;
				return /* @__PURE__ */ (0, X.jsx)(gv, {
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
function XC({ data: t, onAction: n }) {
	let [r, i] = qC(n), a = t.image || t.image_url, o = {
		idle: "Add to cart",
		busy: "Adding…",
		done: "Added ✓ · Add another",
		error: "Try again"
	}[r.phase];
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		a && /* @__PURE__ */ (0, X.jsx)(Q, {
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
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: t.name
		}),
		t.description && /* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "caption",
			sx: {
				color: "rgba(255,255,255,0.6)",
				display: "block",
				mb: .5
			},
			children: t.description
		}),
		/* @__PURE__ */ (0, X.jsxs)(Q, {
			sx: {
				display: "flex",
				alignItems: "center",
				gap: 1,
				mt: .5
			},
			children: [t.price != null && /* @__PURE__ */ (0, X.jsx)(Z, {
				sx: {
					fontWeight: 700,
					color: zC
				},
				children: GC(t.currency) ? e(t.price, t.currency) : `${t.currency || "$"}${t.price}`
			}), t.rating != null && /* @__PURE__ */ (0, X.jsx)(Zx, {
				value: t.rating,
				precision: .5,
				size: "small",
				readOnly: !0
			})]
		}),
		t.buy_action && n && /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)(gv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			disabled: r.phase === "busy",
			"aria-label": `${o}: ${t.name}`,
			sx: {
				mt: 1,
				minHeight: 44,
				background: zC,
				"&:hover": { background: BC }
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
		}), /* @__PURE__ */ (0, X.jsx)(JC, { state: r })] }),
		t.buy_action && !n && /* @__PURE__ */ (0, X.jsx)(gv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			sx: {
				mt: 1,
				background: zC,
				"&:hover": { background: BC }
			},
			onClick: () => window.open(t.buy_action, "_blank"),
			children: "Buy"
		})
	] });
}
function ZC({ data: e, onAction: t }) {
	let [n, r] = qC(t), i = e.items || [], a = !!(t && e.superseded);
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: a ? { opacity: .62 } : void 0,
		children: [
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: 1
				},
				children: [/* @__PURE__ */ (0, X.jsx)(OS.default, { sx: {
					fontSize: 20,
					color: zC
				} }), /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "subtitle2",
					sx: { fontWeight: 600 },
					children: "Cart"
				})]
			}),
			t && i.length === 0 && /* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "body2",
				sx: { color: "rgba(255,255,255,0.7)" },
				children: "Your cart is empty."
			}),
			i.map((t, n) => /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					justifyContent: "space-between",
					gap: 1,
					py: .3
				},
				children: [/* @__PURE__ */ (0, X.jsxs)(Z, {
					variant: "body2",
					sx: {
						color: "rgba(255,255,255,0.8)",
						minWidth: 0,
						overflowWrap: "anywhere"
					},
					children: [t.qty ? `${t.qty} × ` : "", t.name]
				}), /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: {
						color: zC,
						whiteSpace: "nowrap"
					},
					children: typeof t.price == "number" ? KC(t.price, e.currency) : t.price
				})]
			}, n)),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					borderTop: "1px solid rgba(255,255,255,0.1)",
					mt: 1,
					pt: 1,
					display: "flex",
					justifyContent: "space-between"
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: "Total"
				}), /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: {
						fontWeight: 700,
						color: zC
					},
					children: KC(e.total, e.currency)
				})]
			}),
			a && /* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "caption",
				sx: {
					display: "block",
					mt: 1,
					color: "rgba(255,255,255,0.85)"
				},
				children: e.ordered ? "Ordered ✓" : "Updated — see the latest cart below"
			}),
			e.checkout_action && !a && /* @__PURE__ */ (0, X.jsx)(gv, {
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
					background: zC,
					"&:hover": { background: BC }
				},
				children: t && n.phase === "busy" ? "Opening checkout…" : "Checkout"
			}),
			/* @__PURE__ */ (0, X.jsx)(JC, { state: n })
		]
	});
}
function QC({ data: e, onAction: t }) {
	let [n, r] = qC(t), i = e.items_count || (Array.isArray(e.items) ? e.items.length : 0), a = KC(e.total || e.amount, e.currency);
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: "Confirm Payment"
		}),
		/* @__PURE__ */ (0, X.jsxs)(Z, {
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
		e.payment_methods && /* @__PURE__ */ (0, X.jsx)(Q, {
			sx: {
				display: "flex",
				gap: .5,
				flexWrap: "wrap",
				mb: 1
			},
			children: e.payment_methods.map((e, t) => /* @__PURE__ */ (0, X.jsx)(y_, {
				label: e,
				size: "small",
				sx: {
					color: "#fff",
					borderColor: "rgba(255,255,255,0.2)"
				},
				variant: "outlined"
			}, t))
		}),
		t && (e.paid || e.cancelled) ? /* @__PURE__ */ (0, X.jsx)(Z, {
			role: "status",
			variant: "body2",
			sx: {
				fontWeight: 600,
				color: e.paid ? HC : "rgba(255,255,255,0.7)"
			},
			children: e.paid ? `Paid ✓${e.order_id ? ` · Order ${e.order_id}` : ""}` : "Payment cancelled"
		}) : t && e.approval_action ? /* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "body2",
			sx: { color: "rgba(255,255,255,0.78)" },
			children: "Waiting for your approval to pay."
		}) : t ? /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)(gv, {
			variant: "contained",
			fullWidth: !0,
			disabled: n.phase === "busy" || n.phase === "done",
			onClick: () => r("checkout.confirm", e),
			sx: {
				minHeight: 44,
				background: HC,
				"&:hover": { background: "#27AE60" }
			},
			children: {
				idle: `Pay ${a}`,
				busy: "Waiting for approval…",
				done: "Paid ✓",
				error: `Try again · Pay ${a}`
			}[n.phase]
		}), /* @__PURE__ */ (0, X.jsx)(JC, { state: n })] }) : /* @__PURE__ */ (0, X.jsx)(gv, {
			variant: "contained",
			fullWidth: !0,
			sx: {
				background: HC,
				"&:hover": { background: "#27AE60" }
			},
			onClick: () => e.confirm_action && fetch(e.confirm_action, { method: "POST" }),
			children: "Confirm Payment"
		})
	] });
}
function $C({ data: e }) {
	let t = {
		success: /* @__PURE__ */ (0, X.jsx)(CS.default, { sx: {
			fontSize: 40,
			color: HC
		} }),
		pending: /* @__PURE__ */ (0, X.jsx)(ES.default, { sx: {
			fontSize: 40,
			color: "#F39C12"
		} }),
		error: /* @__PURE__ */ (0, X.jsx)(TS.default, { sx: {
			fontSize: 40,
			color: UC
		} })
	};
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: { textAlign: "center" },
		children: [
			t[e.status] || t.pending,
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "subtitle2",
				sx: {
					fontWeight: 600,
					mt: 1,
					textTransform: "capitalize"
				},
				children: e.status
			}),
			e.amount && /* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "h6",
				sx: {
					fontWeight: 700,
					color: zC
				},
				children: e.amount
			}),
			e.method && /* @__PURE__ */ (0, X.jsxs)(Z, {
				variant: "caption",
				sx: { color: "rgba(255,255,255,0.5)" },
				children: ["via ", e.method]
			})
		]
	});
}
function ew({ data: e }) {
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		/* @__PURE__ */ (0, X.jsxs)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: ["Order ", e.order_id || ""]
		}),
		(e.steps || []).map((e, t) => /* @__PURE__ */ (0, X.jsxs)(Q, {
			sx: {
				display: "flex",
				alignItems: "center",
				gap: 1,
				py: .3
			},
			children: [e.completed ? /* @__PURE__ */ (0, X.jsx)(CS.default, { sx: {
				fontSize: 16,
				color: HC
			} }) : /* @__PURE__ */ (0, X.jsx)(Q, { sx: {
				width: 16,
				height: 16,
				borderRadius: "50%",
				border: "2px solid rgba(255,255,255,0.3)"
			} }), /* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "body2",
				"aria-current": e.current ? "step" : void 0,
				sx: {
					color: e.completed ? "#fff" : "rgba(255,255,255,0.6)",
					fontWeight: e.current ? 700 : void 0
				},
				children: e.label || e.name
			})]
		}, t)),
		e.eta && /* @__PURE__ */ (0, X.jsxs)(Z, {
			variant: "caption",
			sx: {
				color: VC,
				mt: 1,
				display: "block"
			},
			children: ["ETA: ", e.eta]
		})
	] });
}
function tw({ data: e }) {
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: "Comparison"
		}),
		/* @__PURE__ */ (0, X.jsx)(Q, {
			sx: {
				display: "flex",
				gap: 1
			},
			children: (e.apps || []).map((e, t) => /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					flex: 1,
					p: 1,
					borderRadius: "8px",
					background: "rgba(255,255,255,0.05)",
					textAlign: "center"
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: e.name
				}), e.rating != null && /* @__PURE__ */ (0, X.jsx)(Zx, {
					value: e.rating,
					precision: .5,
					size: "small",
					readOnly: !0
				})]
			}, t))
		}),
		e.winner && /* @__PURE__ */ (0, X.jsxs)(Z, {
			variant: "caption",
			sx: {
				color: HC,
				mt: 1,
				display: "block"
			},
			children: ["Winner: ", e.winner]
		})
	] });
}
function nw({ data: e }) {
	var t, n;
	let r = (t = (n = e.percent) == null ? e.value : n) == null ? 0 : t;
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [/* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			display: "flex",
			justifyContent: "space-between",
			mb: .5
		},
		children: [/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "body2",
			children: e.label || e.title || "Progress"
		}), /* @__PURE__ */ (0, X.jsxs)(Z, {
			variant: "body2",
			sx: { color: zC },
			children: [Math.round(r), "%"]
		})]
	}), /* @__PURE__ */ (0, X.jsx)(jb, {
		variant: "determinate",
		value: r,
		sx: {
			height: 6,
			borderRadius: 3,
			backgroundColor: "rgba(108,99,255,0.15)",
			"& .MuiLinearProgress-bar": {
				borderRadius: 3,
				background: `linear-gradient(90deg, ${zC}, #9B59B6)`
			}
		}
	})] });
}
function rw({ data: e }) {
	let t = {
		running: /* @__PURE__ */ (0, X.jsx)(DS.default, { sx: { color: VC } }),
		completed: /* @__PURE__ */ (0, X.jsx)(CS.default, { sx: { color: HC } }),
		error: /* @__PURE__ */ (0, X.jsx)(TS.default, { sx: { color: UC } })
	};
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			display: "flex",
			gap: 1.5,
			alignItems: "flex-start"
		},
		children: [t[e.status] || t.running, /* @__PURE__ */ (0, X.jsxs)(Q, {
			sx: { flex: 1 },
			children: [
				/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: { fontWeight: 600 },
					children: e.action || e.title || "Agent Action"
				}),
				/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: { color: "rgba(255,255,255,0.6)" },
					children: e.description
				}),
				e.result && /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: {
						color: HC,
						display: "block",
						mt: .5
					},
					children: e.result
				})
			]
		})]
	});
}
function iw({ data: e, onDismiss: t, onAction: n }) {
	let [r, i] = qC(n), a = async (r) => {
		if (n) {
			let n = await i("approval.decide", {
				...e,
				decision: r
			});
			(!n || n.ok !== !1) && t();
			return;
		}
		fetch(`${h}/api/agent/approval`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent_id: e.agent_id,
				action: e.action,
				decision: r
			})
		}).catch(() => {});
		let a = String(e.action || "").toLowerCase();
		if (a.includes("camera") || a.includes("video")) try {
			window.dispatchEvent(new CustomEvent(ue, { detail: {
				approved: r === "approve",
				user_id: e.user_id || e.agent_id
			} }));
		} catch {}
		t();
	}, o = (t, n) => {
		let r = Array.isArray(e.options) ? e.options[t] : null;
		return typeof r == "string" && r ? r : n;
	};
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: .5
			},
			children: e.title || "Approval Required"
		}),
		/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "body2",
			sx: {
				color: "rgba(255,255,255,0.7)",
				mb: 1.5
			},
			children: e.description
		}),
		/* @__PURE__ */ (0, X.jsxs)(Q, {
			sx: {
				display: "flex",
				gap: 1,
				flexWrap: n ? "wrap" : void 0
			},
			children: [
				/* @__PURE__ */ (0, X.jsx)(gv, {
					variant: "contained",
					size: "small",
					disabled: r.phase === "busy",
					sx: {
						background: HC,
						flex: 1,
						minHeight: n ? 44 : void 0,
						"&:hover": { background: "#27AE60" }
					},
					onClick: () => a("approve"),
					children: r.phase === "busy" ? "Working…" : o(0, "Approve")
				}),
				/* @__PURE__ */ (0, X.jsx)(gv, {
					variant: "outlined",
					size: "small",
					disabled: r.phase === "busy",
					sx: {
						color: UC,
						borderColor: UC,
						flex: 1,
						minHeight: n ? 44 : void 0
					},
					onClick: () => a("deny"),
					children: o(1, "Deny")
				}),
				/* @__PURE__ */ (0, X.jsx)(gv, {
					variant: "outlined",
					size: "small",
					disabled: r.phase === "busy",
					sx: {
						color: "rgba(255,255,255,0.7)",
						borderColor: "rgba(255,255,255,0.2)",
						minHeight: n ? 44 : void 0
					},
					onClick: () => a("later"),
					children: o(2, "Later")
				})
			]
		}),
		/* @__PURE__ */ (0, X.jsx)(JC, { state: r })
	] });
}
function aw({ data: e }) {
	let t = e.data || e.items || [], n = Math.max(...t.map((e) => e.value || 0), 1);
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [e.title && /* @__PURE__ */ (0, X.jsx)(Z, {
		variant: "subtitle2",
		sx: {
			fontWeight: 600,
			mb: 1
		},
		children: e.title
	}), t.map((e, t) => /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			display: "flex",
			alignItems: "center",
			gap: 1,
			mb: .5
		},
		children: [
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "caption",
				sx: {
					width: 60,
					textAlign: "right",
					color: "rgba(255,255,255,0.6)"
				},
				children: e.label
			}),
			/* @__PURE__ */ (0, X.jsx)(Q, {
				sx: {
					flex: 1,
					height: 12,
					borderRadius: 6,
					background: "rgba(255,255,255,0.05)"
				},
				children: /* @__PURE__ */ (0, X.jsx)(Q, { sx: {
					width: `${e.value / n * 100}%`,
					height: "100%",
					borderRadius: 6,
					background: `linear-gradient(90deg, ${zC}, #9B59B6)`
				} })
			}),
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "caption",
				sx: {
					width: 30,
					color: zC
				},
				children: e.value
			})
		]
	}, t))] });
}
function ow({ data: e }) {
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [e.filename && /* @__PURE__ */ (0, X.jsx)(Z, {
		variant: "caption",
		sx: {
			color: zC,
			mb: .5,
			display: "block"
		},
		children: e.filename
	}), /* @__PURE__ */ (0, X.jsx)(Q, {
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
		children: /* @__PURE__ */ (0, X.jsx)("code", { children: e.code || e.content })
	})] });
}
function sw({ data: e }) {
	let t = (e.content || e.text || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[(.+?)\]\((.+?)\)/g, "<a href=\"$2\" target=\"_blank\" style=\"color:#64C8FF\">$1</a>").replace(/^- (.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>").replace(/\n/g, "<br/>");
	return /* @__PURE__ */ (0, X.jsx)(Z, {
		variant: "body2",
		sx: { color: "rgba(255,255,255,0.85)" },
		dangerouslySetInnerHTML: { __html: PC.sanitize(t) }
	});
}
function cw({ data: e }) {
	var t, n;
	let r = e.media_type || ((t = e.url) != null && t.match(/\.(mp4|webm)/) ? "video" : (n = e.url) != null && n.match(/\.(mp3|wav|ogg)/) ? "audio" : "image");
	return r === "video" ? /* @__PURE__ */ (0, X.jsx)(Q, {
		component: "video",
		controls: !0,
		src: e.url,
		sx: {
			width: "100%",
			borderRadius: "8px"
		}
	}) : r === "audio" ? /* @__PURE__ */ (0, X.jsx)(Q, {
		component: "audio",
		controls: !0,
		src: e.url,
		sx: { width: "100%" }
	}) : /* @__PURE__ */ (0, X.jsx)(Q, {
		component: "img",
		src: e.url,
		alt: e.alt || "",
		sx: {
			width: "100%",
			borderRadius: "8px"
		}
	});
}
function lw({ data: e }) {
	let t = {
		up: /* @__PURE__ */ (0, X.jsx)(jS.default, { sx: { color: HC } }),
		down: /* @__PURE__ */ (0, X.jsx)(kS.default, { sx: { color: UC } }),
		flat: /* @__PURE__ */ (0, X.jsx)(AS.default, { sx: { color: "rgba(255,255,255,0.4)" } })
	};
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: { textAlign: "center" },
		children: [
			/* @__PURE__ */ (0, X.jsx)(Z, {
				sx: {
					fontSize: 32,
					fontWeight: 700,
					color: zC
				},
				children: e.value
			}),
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "body2",
				sx: { color: "rgba(255,255,255,0.6)" },
				children: e.label
			}),
			e.trend && /* @__PURE__ */ (0, X.jsx)(Q, {
				sx: { mt: .5 },
				children: t[e.trend] || t.flat
			})
		]
	});
}
function uw({ data: e, onDismiss: t, onAction: n }) {
	let [r, i] = (0, R.useState)(() => {
		let t = {};
		return (e.fields || []).forEach((e) => {
			e && e.name && e.value != null && (t[e.name] = String(e.value));
		}), t;
	}), [a, o] = (0, R.useState)({}), [s, c] = qC(n);
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [
		e.title && /* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: {
				fontWeight: 600,
				mb: 1
			},
			children: e.title
		}),
		(e.fields || []).map((e, t) => /* @__PURE__ */ (0, X.jsx)(SS, {
			label: e.label || e.name,
			size: "small",
			fullWidth: !0,
			type: e.type === "textarea" ? "text" : e.type || "text",
			required: e.required,
			multiline: e.type === "textarea" || void 0,
			minRows: e.type === "textarea" ? 3 : void 0,
			placeholder: e.placeholder,
			inputProps: e.inputMode ? { inputMode: e.inputMode } : void 0,
			disabled: n ? s.phase === "done" : void 0,
			error: !!a[e.name],
			helperText: a[e.name] || void 0,
			InputLabelProps: e.type === "date" ? { shrink: !0 } : void 0,
			value: r[e.name] || "",
			onChange: (t) => i((n) => ({
				...n,
				[e.name]: t.target.value
			})),
			sx: {
				mb: 1,
				"& .MuiInputBase-root": {
					color: "#fff",
					background: "rgba(255,255,255,0.05)"
				},
				"& .MuiInputLabel-root": { color: n ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.5)" }
			}
		}, t)),
		/* @__PURE__ */ (0, X.jsx)(gv, {
			variant: "contained",
			size: "small",
			fullWidth: !0,
			disabled: n ? s.phase === "busy" || s.phase === "done" : void 0,
			sx: {
				minHeight: n ? 44 : void 0,
				background: zC,
				"&:hover": { background: BC }
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
				e.action && fetch(e.action.startsWith("http") ? e.action : `${h}${e.action}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(r)
				}).catch(() => {}), t();
			},
			children: n && s.phase === "busy" ? "Submitting…" : n && s.phase === "done" ? "Done ✓" : e.submit_label || "Submit"
		}),
		/* @__PURE__ */ (0, X.jsx)(JC, { state: s })
	] });
}
function dw({ data: e }) {
	let t = e.ordered ? "ol" : "ul";
	return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [e.title && /* @__PURE__ */ (0, X.jsx)(Z, {
		variant: "subtitle2",
		sx: {
			fontWeight: 600,
			mb: .5
		},
		children: e.title
	}), /* @__PURE__ */ (0, X.jsx)(Q, {
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
		children: (e.items || []).map((e, t) => /* @__PURE__ */ (0, X.jsx)("li", { children: typeof e == "string" ? e : e.text || e.label }, t))
	})] });
}
function fw({ data: e, navigate: t, onDismiss: n, onAction: r }) {
	return /* @__PURE__ */ (0, X.jsx)(Q, {
		sx: {
			display: "flex",
			flexDirection: e.direction || "column",
			gap: e.gap || 1
		},
		children: (e.children || []).map((e, i) => /* @__PURE__ */ (0, X.jsx)(Q, { children: /* @__PURE__ */ (0, X.jsx)(_w, {
			data: e,
			navigate: t,
			onDismiss: n,
			onAction: r
		}) }, i))
	});
}
function pw({ data: e, onDismiss: t }) {
	let n = {
		live: HC,
		paused: "#F39C12",
		ended: "rgba(255,255,255,0.4)"
	}[e.state] || VC, r = Array.isArray(e.transcript_lines) ? e.transcript_lines : [], i = Array.isArray(e.decisions) ? e.decisions : [], a = Array.isArray(e.action_items) ? e.action_items : [], o = Array.isArray(e.participants) ? e.participants : [];
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: { minWidth: 280 },
		children: [
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: .75
				},
				children: [
					/* @__PURE__ */ (0, X.jsx)(Q, { sx: {
						width: 8,
						height: 8,
						borderRadius: "50%",
						background: n,
						boxShadow: e.state === "live" ? `0 0 8px ${n}` : "none"
					} }),
					/* @__PURE__ */ (0, X.jsxs)(Z, {
						variant: "subtitle2",
						sx: {
							fontWeight: 600,
							flex: 1
						},
						children: [e.platform || "meet", e.room_id ? ` · ${e.room_id}` : ""]
					}),
					/* @__PURE__ */ (0, X.jsx)(y_, {
						size: "small",
						label: e.agent_role || "co-pilot",
						sx: {
							background: "rgba(108,99,255,0.2)",
							color: zC,
							fontSize: "0.65rem"
						}
					})
				]
			}),
			o.length > 0 && /* @__PURE__ */ (0, X.jsxs)(Z, {
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
			r.length > 0 && /* @__PURE__ */ (0, X.jsx)(Q, {
				sx: {
					mb: 1,
					maxHeight: 140,
					overflowY: "auto",
					background: "rgba(0,0,0,0.25)",
					borderRadius: "8px",
					p: 1,
					fontSize: "0.8rem"
				},
				children: r.slice(-10).map((e, t) => /* @__PURE__ */ (0, X.jsxs)(Q, {
					sx: {
						mb: .4,
						color: "rgba(255,255,255,0.85)"
					},
					children: [e.speaker && /* @__PURE__ */ (0, X.jsxs)(Z, {
						component: "span",
						sx: {
							fontWeight: 600,
							color: zC,
							mr: .5,
							fontSize: "0.75rem"
						},
						children: [e.speaker, ":"]
					}), /* @__PURE__ */ (0, X.jsx)(Z, {
						component: "span",
						sx: { fontSize: "0.8rem" },
						children: e.text || e
					})]
				}, t))
			}),
			i.length > 0 && /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: { mb: 1 },
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: {
						color: HC,
						fontWeight: 600,
						display: "block",
						mb: .25
					},
					children: "Decisions"
				}), /* @__PURE__ */ (0, X.jsx)(Q, {
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
					children: i.map((e, t) => /* @__PURE__ */ (0, X.jsx)("li", { children: typeof e == "string" ? e : e.text }, t))
				})]
			}),
			a.length > 0 && /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: { mb: 1 },
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: {
						color: VC,
						fontWeight: 600,
						display: "block",
						mb: .25
					},
					children: "Action items"
				}), /* @__PURE__ */ (0, X.jsx)(Q, {
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
					children: a.map((e, t) => /* @__PURE__ */ (0, X.jsx)("li", { children: typeof e == "string" ? e : e.text }, t))
				})]
			}),
			/* @__PURE__ */ (0, X.jsx)(gv, {
				size: "small",
				fullWidth: !0,
				variant: "outlined",
				sx: {
					borderColor: UC,
					color: UC,
					"&:hover": {
						borderColor: UC,
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
function mw({ data: e, onDismiss: t }) {
	let n = e && e.qr || "", r = e && e.title || "Scan to connect", i = e && e.help || "Open the app on your phone, find \"Linked devices\" or \"Devices\", and scan this code.";
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			p: 2,
			textAlign: "center"
		},
		children: [
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "subtitle2",
				sx: {
					fontWeight: 600,
					mb: 1.25
				},
				children: r
			}),
			n ? /* @__PURE__ */ (0, X.jsx)(Q, {
				sx: {
					display: "inline-block",
					p: 2,
					bgcolor: "#fff",
					borderRadius: 2,
					boxShadow: "0 4px 18px rgba(0,0,0,0.4)"
				},
				children: /* @__PURE__ */ (0, X.jsx)(pi, {
					value: n,
					size: 220,
					level: "M",
					includeMargin: !1
				})
			}) : /* @__PURE__ */ (0, X.jsx)(Q, {
				sx: { py: 4 },
				children: /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: { color: "rgba(255,255,255,0.7)" },
					children: "Generating QR code…"
				})
			}),
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "body2",
				sx: {
					color: "rgba(255,255,255,0.7)",
					mt: 2,
					lineHeight: 1.4
				},
				children: i
			}),
			t && /* @__PURE__ */ (0, X.jsx)(gv, {
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
function hw({ data: e, onDismiss: t }) {
	let n = e && e.code || "", r = e && e.display_name || e && e.channel || "channel", i = e && e.color || "#25D366", a = Math.max(0, parseInt(e && e.expires_in || 60, 10)), o = e && e.instructions || `Open ${r} on your phone → Settings → Linked Devices → Link a Device → Link with phone number → paste this code.`, s = e && e.deeplink, c = e && e.notification_id, [l, u] = (0, R.useState)(a), [d, f] = (0, R.useState)(!1), p = (0, R.useRef)(!1);
	return (0, R.useEffect)(() => {
		if (n) try {
			navigator.clipboard.writeText(n).then(() => f(!0), () => {});
		} catch {}
		let e = setInterval(() => u((e) => e > 0 ? e - 1 : 0), 1e3);
		return () => clearInterval(e);
	}, [n]), (0, R.useEffect)(() => {
		if (l === 0 && c && !p.current) {
			p.current = !0;
			try {
				Lr.markRead([c]).catch(() => {});
			} catch {}
		}
	}, [l, c]), /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: { p: 2 },
		children: [
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1,
					mb: 1
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Q, { sx: {
					width: 10,
					height: 10,
					bgcolor: i,
					borderRadius: "50%",
					boxShadow: `0 0 10px ${i}80`
				} }), /* @__PURE__ */ (0, X.jsxs)(Z, {
					variant: "subtitle2",
					sx: { fontWeight: 600 },
					children: ["Connect ", r]
				})]
			}),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					my: 1.5,
					p: 2,
					textAlign: "center",
					bgcolor: "rgba(255,255,255,0.04)",
					border: "1px dashed rgba(255,255,255,0.18)",
					borderRadius: 2
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					sx: {
						fontFamily: "monospace",
						fontSize: 28,
						letterSpacing: 6,
						fontWeight: 700,
						color: i
					},
					children: n || "••••••••"
				}), /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: { color: "rgba(255,255,255,0.5)" },
					children: l > 0 ? `Expires in ${l}s` : "Expired — request a new code"
				})]
			}),
			/* @__PURE__ */ (0, X.jsxs)(Z, {
				variant: "body2",
				sx: {
					color: "rgba(255,255,255,0.75)",
					lineHeight: 1.45
				},
				children: [o, d && /* @__PURE__ */ (0, X.jsx)(Z, {
					component: "span",
					sx: {
						color: i,
						ml: .5,
						fontWeight: 600
					},
					children: "(copied to clipboard)"
				})]
			}),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					gap: 1,
					mt: 1.5,
					justifyContent: "flex-end"
				},
				children: [
					/* @__PURE__ */ (0, X.jsx)(gv, {
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
					s && /* @__PURE__ */ (0, X.jsx)(gv, {
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
					t && /* @__PURE__ */ (0, X.jsx)(gv, {
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
function gw({ data: e, onDismiss: t }) {
	let n = e && e.display_name || e && e.channel || "channel", r = e && e.color || "#00e89d";
	return (0, R.useEffect)(() => {
		let e = setTimeout(() => {
			t && t();
		}, 6e3);
		return () => clearTimeout(e);
	}, [t]), /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			p: 2,
			display: "flex",
			alignItems: "center",
			gap: 1.25
		},
		children: [/* @__PURE__ */ (0, X.jsx)(Q, {
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
		}), /* @__PURE__ */ (0, X.jsxs)(Q, { children: [/* @__PURE__ */ (0, X.jsxs)(Z, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: [n, " connected"]
		}), /* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "caption",
			sx: { color: "rgba(255,255,255,0.6)" },
			children: e && e.message || "Ready to send and receive."
		})] })]
	});
}
function _w({ data: e, onDismiss: t, navigate: n, onAction: r }) {
	let i = e.type || e.component_type || "notification";
	switch (i) {
		case "notification": return /* @__PURE__ */ (0, X.jsx)(YC, {
			data: e,
			navigate: n,
			onDismiss: t
		});
		case "toast": {
			let r = {
				...e,
				severity: e.severity || "info"
			};
			return /* @__PURE__ */ (0, X.jsx)(YC, {
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
			return /* @__PURE__ */ (0, X.jsx)(YC, {
				data: r,
				navigate: n,
				onDismiss: t
			});
		}
		case "product_card": return /* @__PURE__ */ (0, X.jsx)(XC, {
			data: e,
			onAction: r
		});
		case "cart": return /* @__PURE__ */ (0, X.jsx)(ZC, {
			data: e,
			onAction: r
		});
		case "checkout": return /* @__PURE__ */ (0, X.jsx)(QC, {
			data: e,
			onAction: r
		});
		case "payment_status": return /* @__PURE__ */ (0, X.jsx)($C, { data: e });
		case "order_tracking": return /* @__PURE__ */ (0, X.jsx)(ew, { data: e });
		case "comparison": return /* @__PURE__ */ (0, X.jsx)(tw, { data: e });
		case "progress": return /* @__PURE__ */ (0, X.jsx)(nw, { data: e });
		case "agent_action": return /* @__PURE__ */ (0, X.jsx)(rw, { data: e });
		case "approval": return /* @__PURE__ */ (0, X.jsx)(iw, {
			data: e,
			onDismiss: t,
			onAction: r
		});
		case "chart": return /* @__PURE__ */ (0, X.jsx)(aw, { data: e });
		case "code": return /* @__PURE__ */ (0, X.jsx)(ow, { data: e });
		case "markdown": return /* @__PURE__ */ (0, X.jsx)(sw, { data: e });
		case "media": return /* @__PURE__ */ (0, X.jsx)(cw, { data: e });
		case "metric": return /* @__PURE__ */ (0, X.jsx)(lw, { data: e });
		case "form": return /* @__PURE__ */ (0, X.jsx)(uw, {
			data: e,
			onDismiss: t,
			onAction: r
		});
		case "qr_pair": return /* @__PURE__ */ (0, X.jsx)(mw, {
			data: e,
			onDismiss: t
		});
		case "pair_code": return /* @__PURE__ */ (0, X.jsx)(hw, {
			data: e,
			onDismiss: t
		});
		case "channel_connected": return /* @__PURE__ */ (0, X.jsx)(gw, {
			data: e,
			onDismiss: t
		});
		case "list": return /* @__PURE__ */ (0, X.jsx)(dw, { data: e });
		case "layout": return /* @__PURE__ */ (0, X.jsx)(fw, {
			data: e,
			navigate: n,
			onDismiss: t,
			onAction: r
		});
		case "meet_copilot": return /* @__PURE__ */ (0, X.jsx)(pw, {
			data: e,
			onDismiss: t
		});
		case "consent_prompt": return /* @__PURE__ */ (0, X.jsx)(yw, {
			data: e,
			onDismiss: t
		});
		case "consent.request": return /* @__PURE__ */ (0, X.jsx)(yw, {
			data: e,
			onDismiss: t
		});
		case "post_preview": return /* @__PURE__ */ (0, X.jsx)(bw, {
			data: e,
			onDismiss: t
		});
		default: return /* @__PURE__ */ (0, X.jsxs)(Q, { children: [/* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "subtitle2",
			sx: { fontWeight: 600 },
			children: e.title || i
		}), /* @__PURE__ */ (0, X.jsx)(Z, {
			variant: "body2",
			sx: { color: "rgba(255,255,255,0.7)" },
			children: e.message || e.content || JSON.stringify(e)
		})] });
	}
}
function vw(e) {
	if (e.type === "consent.request") {
		let t = e.consent_type;
		return N(t) ? {
			consentType: t,
			scope: e.scope || "*",
			agentId: e.agent_id || null,
			title: P(t, e.requester_name),
			text: `This phone asks to ${re(t)}.`,
			fingerprint: e.requester_fingerprint || M(e.scope),
			caption: te,
			grantLabel: F(t),
			declineLabel: oe(t) ? se(t, e.agent_id) : null
		} : {
			consentType: t,
			scope: e.scope || "*",
			agentId: e.agent_id || null,
			title: P(t),
			text: e.reason || `${ie(e.agent_name)} asks to ${re(t)}.`,
			grantLabel: F(t),
			declineLabel: oe(t) ? se(t, e.agent_id, e.agent_name) : null
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
function yw({ data: e, onDismiss: t }) {
	let n = vw(e || {}), r = (t) => {
		if (n.consentType === "camera_capture") try {
			window.dispatchEvent(new CustomEvent(ue, { detail: {
				approved: t,
				user_id: (e == null ? void 0 : e.user_id) || (e == null ? void 0 : e.agent_id)
			} }));
		} catch {}
	};
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		"data-testid": "liquid-consent-prompt",
		sx: { p: 1.5 },
		children: [
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "subtitle1",
				sx: {
					fontWeight: 700,
					mb: .5
				},
				children: n.title
			}),
			/* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "body2",
				sx: {
					opacity: .8,
					mb: 1.5
				},
				children: n.text
			}),
			n.fingerprint && /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: { mb: 1.5 },
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
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
				}), /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "caption",
					sx: {
						display: "block",
						opacity: .7
					},
					children: n.caption
				})]
			}),
			n.declineLabel && /* @__PURE__ */ (0, X.jsx)(Z, {
				variant: "caption",
				sx: {
					display: "block",
					opacity: .6,
					mb: 1
				},
				children: `"${n.declineLabel}" lasts until you allow it again in Privacy settings; "Not now" leaves the ask open.`
			}),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					flexWrap: "wrap",
					gap: 1,
					justifyContent: "flex-end"
				},
				children: [
					/* @__PURE__ */ (0, X.jsx)("button", {
						onClick: t,
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
					n.declineLabel && /* @__PURE__ */ (0, X.jsx)("button", {
						onClick: async () => {
							try {
								await Rr.decline({
									consent_type: n.consentType,
									scope: n.scope,
									agent_id: n.agentId
								}), r(!1);
							} catch (e) {
								console.error("[consent_prompt] decline failed", e);
							} finally {
								t && t();
							}
						},
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
					/* @__PURE__ */ (0, X.jsx)("button", {
						"data-testid": "liquid-consent-grant",
						onClick: async () => {
							try {
								await Rr.grant({
									consent_type: n.consentType,
									scope: n.scope
								}), r(!0);
							} catch (e) {
								console.error("[consent_prompt] grant failed", e);
							} finally {
								t && t();
							}
						},
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
function bw({ data: e, onDismiss: t }) {
	let n = (e == null ? void 0 : e.platform) || "platform", r = (e == null ? void 0 : e.content) || "";
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
		"data-testid": "liquid-post-preview",
		sx: { p: 1.5 },
		children: [
			/* @__PURE__ */ (0, X.jsxs)(Z, {
				variant: "subtitle1",
				sx: {
					fontWeight: 700,
					mb: .5
				},
				children: ["Preview: post to ", n]
			}),
			/* @__PURE__ */ (0, X.jsx)(Q, {
				sx: {
					p: 1.5,
					mb: 1.5,
					borderRadius: 1,
					bgcolor: "rgba(255,255,255,0.06)",
					border: "1px solid rgba(255,255,255,0.12)"
				},
				children: /* @__PURE__ */ (0, X.jsx)(Z, {
					variant: "body2",
					sx: {
						whiteSpace: "pre-wrap",
						color: "rgba(255,255,255,0.92)"
					},
					children: r
				})
			}),
			/* @__PURE__ */ (0, X.jsxs)(Z, {
				variant: "caption",
				sx: {
					display: "block",
					opacity: .65,
					mb: 1
				},
				children: ["Posting as ", (e == null ? void 0 : e.handle) || "your saved session"]
			}),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					gap: 1,
					justifyContent: "flex-end"
				},
				children: [/* @__PURE__ */ (0, X.jsx)("button", {
					onClick: t,
					style: {
						padding: "6px 14px",
						borderRadius: 8,
						border: "1px solid #555",
						background: "transparent",
						color: "#ccc",
						cursor: "pointer"
					},
					children: (e == null ? void 0 : e.cancel_label) || "Cancel"
				}), /* @__PURE__ */ (0, X.jsx)("button", {
					"data-testid": "liquid-post-confirm",
					onClick: async () => {
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
							t && t();
						}
					},
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
function xw({ navigate: e, onInlineChatCard: t, subscribe: n, onAction: r, containerSx: i, cardSx: a, cardTransition: o = tb }) {
	let [s, c] = (0, R.useState)([]), l = (0, R.useRef)({}), u = (0, R.useRef)(/* @__PURE__ */ new Map()), d = (0, R.useCallback)((e) => {
		for (let [t, n] of u.current) n === e && u.current.delete(t);
	}, []), f = (0, R.useCallback)((e) => {
		clearTimeout(l.current[e]), delete l.current[e], d(e), c((t) => t.filter((t) => t._id !== e));
	}, [d]), p = (0, R.useCallback)((e) => {
		c((t) => {
			let n = t.filter((t) => t._type === "consent.request" && le(e, t));
			return n.length === 0 ? t : (n.forEach((e) => {
				clearTimeout(l.current[e._id]), delete l.current[e._id], d(e._id);
			}), t.filter((e) => !n.includes(e)));
		});
	}, [d]), m = (0, R.useCallback)((n) => {
		if (!n) return;
		let r = n.type || n.component_type || "notification";
		if (ce.includes(r)) return;
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
		let a = ++WC, o = {
			...n,
			_id: a,
			_type: r
		};
		i && u.current.set(i, a), c((e) => {
			let t = [...e, o];
			for (; t.length > FC;) {
				let e = t.shift();
				clearTimeout(l.current[e._id]), delete l.current[e._id], d(e._id);
			}
			return t;
		}), LC.has(r) || (l.current[a] = setTimeout(() => f(a), IC));
	}, [
		e,
		t,
		f,
		d
	]);
	return (0, R.useEffect)(() => {
		let e = n ? n(m) : _.on("agent.ui.update", m), t = ce.map((e) => _.on(e, p));
		return () => {
			e(), t.forEach((e) => e && e()), Object.values(l.current).forEach(clearTimeout);
		};
	}, [
		m,
		p,
		n
	]), s.length === 0 ? null : /* @__PURE__ */ (0, X.jsx)(Q, {
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
		children: s.map((t) => /* @__PURE__ */ (0, X.jsx)(o, {
			in: !0,
			timeout: 300,
			children: /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					...RC,
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
					t.agent_name && /* @__PURE__ */ (0, X.jsx)(y_, {
						label: t.agent_name,
						size: "small",
						sx: {
							position: "absolute",
							top: 8,
							left: 12,
							fontSize: "0.65rem",
							height: 20,
							background: "rgba(108,99,255,0.2)",
							color: zC,
							border: "1px solid rgba(108,99,255,0.3)"
						}
					}),
					/* @__PURE__ */ (0, X.jsx)(t_, {
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
						children: /* @__PURE__ */ (0, X.jsx)(wS.default, { sx: { fontSize: 16 } })
					}),
					/* @__PURE__ */ (0, X.jsx)(Q, {
						sx: { mt: t.agent_name ? 2.5 : 0 },
						children: /* @__PURE__ */ (0, X.jsx)(_w, {
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
function Sw(e = 1) {
	let [t, n] = (0, R.useState)(0), [r, i] = (0, R.useState)(-160), [a, o] = (0, R.useState)(!1), s = (0, R.useRef)(!0), c = (0, R.useRef)(e), l = (0, R.useRef)(null), u = (0, R.useRef)(null), d = (0, R.useRef)(null), f = (0, R.useRef)(null), p = (0, R.useRef)(null), m = (0, R.useRef)(null);
	c.current = e;
	let h = (0, R.useCallback)(() => {
		if (!s.current || !u.current || !m.current) return;
		u.current.getByteFrequencyData(m.current);
		let e = m.current, t = 0;
		for (let n = 0; n < e.length; n++) {
			let r = e[n] / 255;
			t += r * r;
		}
		let r = Math.sqrt(t / e.length), a = Math.min(r * c.current, 1), o = r > 0 ? 20 * Math.log10(r) : -160;
		s.current && (n(a), i(Math.max(o, -160))), p.current = requestAnimationFrame(h);
	}, []), g = (0, R.useCallback)(async () => {
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
	}, [h]), _ = (0, R.useCallback)(() => {
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
	return (0, R.useEffect)(() => (s.current = !0, () => {
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
var Cw = "ws://127.0.0.1:8005";
function ww(e, t) {
	return !e || t === "https:" && /^ws:\/\//i.test(e) ? null : e;
}
var Tw = typeof window < "u" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
function Ew(e) {
	return e ? {
		type: "config",
		language: e
	} : { type: "config" };
}
function Dw(e = {}) {
	let { language: t = null, onResult: n, onPartialResult: r, onError: i, sttUrl: a = Cw } = e, o = (0, R.useRef)(a);
	o.current = a;
	let [s, c] = (0, R.useState)(""), [l, u] = (0, R.useState)(!1), [d, f] = (0, R.useState)(-1), [p, m] = (0, R.useState)(null), [h, g] = (0, R.useState)(null), _ = (0, R.useRef)(!0), v = (0, R.useRef)(null), y = (0, R.useRef)(null), b = (0, R.useRef)(null), x = (0, R.useRef)(null), S = (0, R.useRef)(null), C = (0, R.useRef)(null), w = (0, R.useRef)(n), T = (0, R.useRef)(r), E = (0, R.useRef)(i);
	w.current = n, T.current = r, E.current = i;
	let D = (0, R.useCallback)(async (e) => {
		let t = ww(o.current, typeof window < "u" ? window.location.protocol : "");
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
					clearTimeout(i), r.send(JSON.stringify(Ew(e)));
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
	}, []), O = (0, R.useCallback)((e) => {
		if (!Tw) {
			let e = "Speech recognition not supported in this browser";
			_.current && m(e), E.current && E.current(e);
			return;
		}
		let t = new Tw();
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
	}, []), k = (0, R.useCallback)(async (e = {}) => {
		if (!_.current) return;
		let n = e.language || t || null;
		if (m(null), c(""), f(-1), await D(n)) return;
		let r = n || e.preferredLanguage || typeof navigator < "u" && navigator.language || "en";
		O(r);
	}, [
		t,
		D,
		O
	]), A = (0, R.useCallback)(() => {
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
	}, []), j = (0, R.useCallback)(() => {
		_.current && (c(""), f(-1), m(null));
	}, []);
	return (0, R.useEffect)(() => (_.current = !0, () => {
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
function Ow(e) {
	return (0, R.useSyncExternalStore)(e.subscribe, e.getState, e.getState);
}
var kw = {
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
}, Aw = {
	background: u,
	backdropFilter: "var(--hart-glass-filter)",
	WebkitBackdropFilter: "var(--hart-glass-filter)",
	border: "var(--hart-glass-border)",
	boxShadow: "var(--hart-glass-shadow)",
	borderRadius: "var(--hart-radius)",
	color: "#fff"
};
function jw({ children: e }) {
	return e;
}
function Mw({ fragment: e, onAction: t, onNavigate: n }) {
	return /* @__PURE__ */ (0, X.jsx)(Q, {
		"data-fragment-type": e.type,
		sx: {
			...Aw,
			...kw,
			p: 2,
			position: "relative",
			boxShadow: "0 10px 30px rgba(0,0,0,0.28)"
		},
		children: /* @__PURE__ */ (0, X.jsx)(_w, {
			data: e,
			onAction: t,
			onDismiss: () => {},
			navigate: (e) => n({ path: e })
		})
	});
}
function Nw() {
	return /* @__PURE__ */ (0, X.jsxs)(Q, {
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
			/* @__PURE__ */ (0, X.jsx)("span", {}),
			/* @__PURE__ */ (0, X.jsx)("span", {}),
			/* @__PURE__ */ (0, X.jsx)("span", {})
		]
	});
}
function Pw({ items: e, onPick: t, disabled: n }) {
	return !e || !e.length ? null : /* @__PURE__ */ (0, X.jsx)(Q, {
		role: "group",
		"aria-label": "Suggestions",
		sx: {
			display: "flex",
			flexWrap: "wrap",
			gap: 1,
			mt: 1
		},
		children: e.map((e) => /* @__PURE__ */ (0, X.jsx)(Q, {
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
function Fw({ msg: e, onRetry: t }) {
	let n = e.role === "user", r = e.tone === "error";
	return /* @__PURE__ */ (0, X.jsx)(Q, {
		sx: {
			display: "flex",
			justifyContent: n ? "flex-end" : "flex-start",
			...kw
		},
		children: /* @__PURE__ */ (0, X.jsxs)(Q, {
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
				/* @__PURE__ */ (0, X.jsx)(Z, {
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
				e.isDraft && /* @__PURE__ */ (0, X.jsx)(Z, {
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
				r && e.retryText && /* @__PURE__ */ (0, X.jsx)(gv, {
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
function Iw({ state: e, session: t, onNavigate: n, onSend: r, compact: i }) {
	let a = i ? e.timeline.slice(-4) : e.timeline, o = -1;
	return a.forEach((e, t) => {
		e.kind === "msg" && e.role === "assistant" && !e.isDraft && (o = t);
	}), /* @__PURE__ */ (0, X.jsxs)(Q, {
		sx: {
			display: "flex",
			flexDirection: "column",
			gap: 1.25
		},
		children: [a.map((i, a) => i.kind === "fragment" ? /* @__PURE__ */ (0, X.jsx)(Mw, {
			fragment: i.fragment,
			onAction: t.act,
			onNavigate: n
		}, i.id) : /* @__PURE__ */ (0, X.jsxs)(Q, { children: [/* @__PURE__ */ (0, X.jsx)(Fw, {
			msg: i,
			onRetry: r
		}), a === o && !e.thinking && /* @__PURE__ */ (0, X.jsx)(Pw, {
			items: i.suggestions,
			onPick: r
		})] }, i.id)), e.thinking && !a.some((e) => e.isDraft) && /* @__PURE__ */ (0, X.jsxs)(Q, {
			sx: {
				alignSelf: "flex-start",
				px: 1.75,
				py: 1,
				borderRadius: "18px",
				background: "rgba(255,255,255,0.08)"
			},
			children: [/* @__PURE__ */ (0, X.jsx)(Nw, {}), /* @__PURE__ */ (0, X.jsx)("span", {
				className: "hart-sr",
				children: "Thinking"
			})]
		})]
	});
}
var Lw = typeof window < "u" ? window.SpeechRecognition || window.webkitSpeechRecognition : null, Rw = {
	"not-allowed": "Microphone access is blocked. Allow it in your browser settings, or type instead.",
	"service-not-allowed": "Voice input is not allowed on this page. Type instead.",
	"audio-capture": "No microphone found. Type instead.",
	network: "Voice needs a connection right now. Type instead."
};
function zw({ sttUrl: e, locale: t, onFinal: n, onListening: r }) {
	let [i, a] = (0, R.useState)(""), [o, s] = (0, R.useState)(null), c = Sw(2.2), l = (0, R.useRef)(!1), u = (0, R.useRef)(() => {}), d = Dw({
		sttUrl: e || null,
		onPartialResult: (e) => a(e),
		onResult: (e) => {
			l.current || (l.current = !0, a(e), u.current(), n(e));
		},
		onError: (e) => s(Rw[e] || "I couldn't hear that. Tap the mic and try again.")
	}), f = !!Lw || !!e, p = (0, R.useCallback)(() => {
		d.stopListening(), c.stopListening();
	}, [d, c]);
	u.current = p;
	let m = (0, R.useCallback)(async () => {
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
	return (0, R.useEffect)(() => {
		r && r(h);
	}, [h, r]), (0, R.useEffect)(() => () => {
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
var Bw = [
	.45,
	.8,
	1,
	.75,
	.5,
	.85,
	.6
];
function Vw({ amplitude: e, active: t, height: n = 36 }) {
	let [r, i] = (0, R.useState)(0);
	(0, R.useEffect)(() => {
		if (!t || typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let e = requestAnimationFrame(function t(n) {
			i(n / 180), e = requestAnimationFrame(t);
		});
		return () => cancelAnimationFrame(e);
	}, [t]);
	let a = t ? Math.max(.12, Math.min(1, e * 1.4)) : .1;
	return /* @__PURE__ */ (0, X.jsx)(Q, {
		"aria-hidden": "true",
		sx: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			gap: "5px",
			height: n
		},
		children: Bw.map((e, i) => {
			let o = t ? .65 + .35 * Math.sin(r + i * .9) : 1, s = Math.max(.12, Math.min(1, a * e * o));
			return /* @__PURE__ */ (0, X.jsx)(Q, { sx: {
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
function Hw(e, t, n, r) {
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
function Uw(e, t) {
	switch (e) {
		case "merchant-onboarding": return {
			title: "Store setup",
			subtitle: "Onboard your store and products",
			placeholder: "e.g. onboard my store …",
			suggestions: ["Onboard my store Sri Balaji Stores in 600078", "Add SKU Amul Butter 100g ₹56"],
			welcome: Hw("Storefront", "Get your store on McGroce", "Tell me your store name and pincode, then list products by just typing them.", "You review everything before it goes live.")
		};
		case "marketing": return {
			title: "Marketing",
			subtitle: "Campaigns for your customers",
			placeholder: "e.g. draft a Diwali campaign",
			suggestions: ["Draft a Diwali campaign for my customers", "Draft a Pongal campaign for my customers"],
			welcome: Hw("Campaign", "Reach your regulars", "I draft festive offers and messages for your customers. You edit and approve.", "Nothing is sent without your approval.")
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
			welcome: Hw("AutoAwesome", "What can I get you today?", "I find products, fill your cart, pay with your approval and track your order.", "Nothing is bought without your approval.")
		};
	}
}
//#endregion
//#region node_modules/@mui/icons-material/AddShoppingCart.js
var Ww = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M11 9h2V6h3V4h-3V1h-2v3H8v2h3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2m10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2m-9.83-3.25.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25" }), "AddShoppingCart");
})), Gw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z" }), "AutoAwesome");
})), Kw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M18 11v2h4v-2zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61M20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4M4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34" }), "Campaign");
})), qw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4" }), "HelpOutline");
})), Jw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4h16z" }), "Inventory2");
})), Yw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m21.41 11.58-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42M5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7" }), "LocalOffer");
})), Xw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m13.5-9 1.96 2.5H17V9.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5" }), "LocalShipping");
})), Zw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3m5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72z" }), "Mic");
})), Qw = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2m-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3m13-6v11c0 1.1-.9 2-2 2H4v-2h17V7z" }), "Payments");
})), $w = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" }), "Search");
})), eT = /* @__PURE__ */ T(((e) => {
	var t = mi();
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = void 0;
	var n = t(Gm()), r = os();
	e.default = (0, n.default)(/*#__PURE__*/ (0, r.jsx)("path", { d: "m21.9 8.89-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89m-2.99-3.9 1.05 4.37c.1.42.01.84-.25 1.17-.14.18-.44.47-.94.47-.61 0-1.14-.49-1.21-1.14L16.98 5zM13 5h1.96l.54 4.52c.05.39-.07.78-.33 1.07-.22.26-.54.41-.95.41-.67 0-1.22-.59-1.22-1.31zM8.49 9.52 9.04 5H11v4.69c0 .72-.55 1.31-1.29 1.31-.34 0-.65-.15-.89-.41-.25-.29-.37-.68-.33-1.07m-4.45-.16L5.05 5h1.97l-.58 4.86c-.08.65-.6 1.14-1.21 1.14-.49 0-.8-.29-.93-.47-.27-.32-.36-.75-.26-1.17M5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19z" }), "Storefront");
})), tT = /* @__PURE__ */ E({
	AddShoppingCart: () => nT.default,
	AutoAwesome: () => rT.default,
	Campaign: () => iT.default,
	CheckCircle: () => CS.default,
	HelpOutline: () => aT.default,
	Inventory2: () => oT.default,
	LocalOffer: () => sT.default,
	LocalShipping: () => cT.default,
	Mic: () => lT.default,
	Payments: () => uT.default,
	Search: () => dT.default,
	ShoppingCart: () => OS.default,
	Storefront: () => fT.default
}), nT = /* @__PURE__ */ O(Ww()), rT = /* @__PURE__ */ O(Gw()), iT = /* @__PURE__ */ O(Kw()), aT = /* @__PURE__ */ O(qw()), oT = /* @__PURE__ */ O(Jw()), sT = /* @__PURE__ */ O(Yw()), cT = /* @__PURE__ */ O(Xw()), lT = /* @__PURE__ */ O(Zw()), uT = /* @__PURE__ */ O(Qw()), dT = /* @__PURE__ */ O($w()), fT = /* @__PURE__ */ O(eT()), pT = (0, R.createContext)(null), mT = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]), hT = (e, t) => {
	if (!t || !e) return;
	let n = t.split(".");
	if (n.length > 10) return;
	let r = e;
	for (let e of n) {
		if (mT.has(e) || r == null) return;
		r = r[e];
	}
	return r;
}, gT = (e, t) => !e || typeof e != "string" ? e : e.replace(/\{\{([^}]+)\}\}/g, (e, n) => {
	let r = hT(t, n.trim());
	return r == null ? "" : String(r);
});
function _T(e) {
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
function vT(e) {
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
function yT(e, t) {
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
						!mT.has(r) && Object.prototype.hasOwnProperty.call(t, r) && (e[n] = t[r]);
					}
					i && e[n].includes("{{") && (e[n] = gT(e[n], i));
				}
				return e;
			}
			return r;
		}
	};
	return n;
}
var bT = (e) => {
	if (!e || typeof e != "string") return null;
	let t = [
		e,
		e.charAt(0).toUpperCase() + e.slice(1),
		e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()).replace(/^./, (e) => e.toUpperCase())
	];
	for (let e of t) if (tT[e]) return tT[e];
	return aT.default || null;
}, xT = {
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
}, ST = "sdui-keyframes";
function CT(e) {
	if (typeof document > "u" || (e || document).getElementById(ST)) return;
	let t = document.createElement("style");
	t.id = ST, t.textContent = "\n    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }\n    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }\n    @keyframes fadeInScale { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }\n    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }\n    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }\n    @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }\n    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }\n    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }\n    @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }\n  ", (e || document.head).appendChild(t);
}
var wT = 100, TT = ({ node: e, data: t, onAction: n, depth: r = 0, resolveStyle: i, defaultStyles: a, tokens: o }) => {
	if (!e || r > 20 || typeof e != "object" || e.type && typeof e.type != "string") return null;
	let s = o.colors, c = o.spacing, l = o.borderRadius;
	o.fontSizes;
	let u = o.shadows;
	if (e.visible !== void 0 && !(typeof e.visible == "string" ? hT(t, e.visible) : e.visible) || e.show !== void 0 && !(typeof e.show == "string" ? hT(t, e.show) : e.show) || e.if !== void 0 && !(typeof e.if == "string" ? hT(t, e.if) : e.if)) return null;
	if (e.type === "loop" || e.type === "repeat") {
		var d;
		let s = hT(t, e.bind) || [];
		if (!Array.isArray(s)) return null;
		let c = s.length > wT ? s.slice(0, wT) : s, l = (d = e.children) == null ? void 0 : d[0];
		return l ? /* @__PURE__ */ (0, X.jsx)(X.Fragment, { children: c.map((s, c) => /* @__PURE__ */ (0, X.jsx)(TT, {
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
		let s = hT(t, e.bind) ? (f = e.children) == null ? void 0 : f[0] : (p = e.children) == null ? void 0 : p[1];
		return s ? /* @__PURE__ */ (0, X.jsx)(TT, {
			node: s,
			data: t,
			onAction: n,
			depth: r + 1,
			resolveStyle: i,
			defaultStyles: a,
			tokens: o
		}) : null;
	}
	let m = e.bind ? hT(t, e.bind) : void 0, h = i(e.style, t), g = e.props || {}, _ = (e) => !e || !Array.isArray(e) ? null : e.map((e, s) => /* @__PURE__ */ (0, X.jsx)(TT, {
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
	}, S = (e) => e == null ? "" : gT(String(e), t), C = e.animation ? { animation: xT[e.animation] || `${e.animation} 0.5s ease-out forwards` } : {};
	switch (e.type) {
		case "view":
		case "box":
		case "column": return /* @__PURE__ */ (0, X.jsx)(Q, {
			sx: {
				display: "flex",
				flexDirection: "column",
				...h,
				...C
			},
			children: _(e.children)
		});
		case "row": return /* @__PURE__ */ (0, X.jsx)(Q, {
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
			return /* @__PURE__ */ (0, X.jsx)(Q, {
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
		case "scroll": return /* @__PURE__ */ (0, X.jsx)(Q, {
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
		case "list": return /* @__PURE__ */ (0, X.jsx)(Q, {
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
			children: (e.children || []).map((e, s) => /* @__PURE__ */ (0, X.jsx)(Q, {
				component: "li",
				sx: { listStyle: "inherit" },
				children: /* @__PURE__ */ (0, X.jsx)(TT, {
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
		case "text": return /* @__PURE__ */ (0, X.jsx)(Z, {
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
		case "button": return /* @__PURE__ */ (0, X.jsxs)(gv, {
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
				let e = bT(g.icon);
				return e ? /* @__PURE__ */ (0, X.jsx)(e, { sx: {
					fontSize: g.iconSize || 20,
					color: g.iconColor || "inherit"
				} }) : null;
			})() : void 0,
			children: [g.text ? S(g.text) : null, _(e.children)]
		});
		case "icon": {
			let t = bT(m || g.name || "HelpOutline");
			if (!t) return null;
			let n = g.color ? g.color.startsWith("$") ? s[g.color.slice(1)] : g.color : s.accent;
			return e.action ? /* @__PURE__ */ (0, X.jsx)(t_, {
				onClick: x,
				sx: {
					...h,
					...C
				},
				children: /* @__PURE__ */ (0, X.jsx)(t, { sx: {
					fontSize: g.size || 24,
					color: n
				} })
			}) : /* @__PURE__ */ (0, X.jsx)(t, { sx: {
				fontSize: g.size || 24,
				color: n,
				...h,
				...C
			} });
		}
		case "image": {
			let e = m || g.uri || g.src || "";
			return /* @__PURE__ */ (0, X.jsx)(Q, {
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
		case "input": return /* @__PURE__ */ (0, X.jsx)(SS, {
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
		case "spacer": return /* @__PURE__ */ (0, X.jsx)(Q, { sx: {
			height: g.size || c.md,
			width: g.horizontal ? g.size || c.md : "auto",
			flexShrink: 0,
			...h
		} });
		case "divider": return /* @__PURE__ */ (0, X.jsx)(Ey, {
			sx: {
				my: `${c.sm}px`,
				borderColor: s.border,
				...h
			},
			orientation: g.orientation || "horizontal"
		});
		case "card": return e.action ? /* @__PURE__ */ (0, X.jsx)(xv, {
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
			children: /* @__PURE__ */ (0, X.jsx)(Ov, {
				onClick: x,
				sx: { p: `${c.md}px` },
				children: _(e.children)
			})
		}) : /* @__PURE__ */ (0, X.jsx)(xv, {
			sx: {
				...a.defaultCard,
				...h,
				...C
			},
			elevation: 0,
			children: /* @__PURE__ */ (0, X.jsx)(Nv, {
				sx: {
					p: `${c.md}px`,
					"&:last-child": { pb: `${c.md}px` }
				},
				children: _(e.children)
			})
		});
		case "chip": return /* @__PURE__ */ (0, X.jsx)(y_, {
			label: S(m === void 0 ? g.label || "" : String(m)),
			icon: g.icon ? (() => {
				let e = bT(g.icon);
				return e ? /* @__PURE__ */ (0, X.jsx)(e, {}) : void 0;
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
			return g.circular ? /* @__PURE__ */ (0, X.jsx)(Jv, {
				variant: g.indeterminate ? "indeterminate" : "determinate",
				value: e,
				size: g.size || 40,
				thickness: g.thickness || 4,
				sx: {
					color: g.color || s.accent,
					...h,
					...C
				}
			}) : /* @__PURE__ */ (0, X.jsx)(jb, {
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
			return /* @__PURE__ */ (0, X.jsx)(Q, {
				sx: {
					animation: `${t} ${n}ms ease-out ${r}ms ${i} forwards`,
					...h
				},
				children: _(e.children)
			});
		}
		default: return /* @__PURE__ */ (0, X.jsx)(Q, {
			sx: {
				...h,
				...C
			},
			children: _(e.children)
		});
	}
}, ET = ({ themeTokens: e, layout: t, data: n = {}, onAction: r, sx: i, style: a, keyframesRoot: o }) => {
	let s = (0, R.useContext)(pT), c = e || s, l = (0, R.useMemo)(() => c ? _T(c) : {}, [c]), u = (0, R.useMemo)(() => c ? vT(c) : {}, [c]), d = (0, R.useMemo)(() => c ? yT(l, c.colors) : () => void 0, [l, c]);
	return (0, R.useEffect)(() => {
		CT(o);
	}, [o]), !t || !c ? null : /* @__PURE__ */ (0, X.jsx)(Q, {
		sx: {
			...u.container,
			...i
		},
		style: a,
		children: /* @__PURE__ */ (0, X.jsx)(TT, {
			node: t,
			data: n,
			onAction: r,
			resolveStyle: d,
			defaultStyles: u,
			tokens: c
		})
	});
}, DT = {
	community: "#FF6B6B",
	environment: "#2ECC71",
	education: "#6C63FF",
	health: "#00B8D9",
	equity: "#FFAB00",
	technology: "#7C4DFF"
}, OT = {
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
OT.intentCommunity, OT.intentEnvironment, OT.intentEducation, OT.intentHealth, OT.intentEquity, OT.intentTechnology;
var kT = {
	sm: "8px",
	md: "12px",
	lg: "16px",
	xl: "24px",
	pill: "9999px"
}, AT = {
	card: "0 4px 24px rgba(108, 99, 255, 0.08)",
	cardHover: "0 12px 40px rgba(108, 99, 255, 0.15), 0 0 0 1px rgba(108,99,255,0.08)",
	fab: "0 8px 32px rgba(108, 99, 255, 0.3)",
	float: "0 8px 32px rgba(0,0,0,0.2)",
	glow: "0 0 24px rgba(108, 99, 255, 0.4)",
	inset: "inset 0 1px 0 rgba(255,255,255,0.05)"
}, jT = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48
};
`${n.fast}${c.smooth}${n.fast}${c.smooth}`, AT.cardHover, `${n.instant}${c.snappy}`;
//#endregion
//#region src/components/shared/LiquidUI/SocialLiquidUI.jsx
function MT(e) {
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
			...DT
		},
		spacing: e.custom.spacing || jT,
		borderRadius: e.custom.radius || kT,
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
		shadows: e.custom.shadows || AT
	};
}
function NT({ layout: e, data: t, onAction: n, ...r }) {
	let i = Gh(), a = (0, R.useMemo)(() => MT(i), [i]);
	return /* @__PURE__ */ (0, X.jsx)(ET, {
		themeTokens: a,
		layout: e,
		data: t,
		onAction: n,
		...r
	});
}
//#endregion
//#region src/embed/ui/LiquidSheet.jsx
var PT = 420;
function FT() {
	return /* @__PURE__ */ (0, X.jsx)("svg", {
		width: "20",
		height: "20",
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, X.jsx)("path", {
			fill: "currentColor",
			d: "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"
		})
	});
}
function IT() {
	return /* @__PURE__ */ (0, X.jsx)("svg", {
		width: "20",
		height: "20",
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, X.jsx)("path", {
			fill: "currentColor",
			d: "M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"
		})
	});
}
function LT({ size: e = 20 }) {
	return /* @__PURE__ */ (0, X.jsx)("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, X.jsx)("path", {
			fill: "currentColor",
			d: "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"
		})
	});
}
function RT(e, t) {
	(0, R.useEffect)(() => {
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
function zT({ open: e, onClose: t, session: n, state: r, surface: i, agentName: a, isDesktop: o, onNavigate: c, sttUrl: u, locale: d, onListening: f, position: p, shadowRoot: m }) {
	let h = Uw(i, a), [g, _] = (0, R.useState)(""), [v, y] = (0, R.useState)(0), b = (0, R.useRef)(null), x = (0, R.useRef)(null), S = (0, R.useRef)(null), C = (0, R.useRef)(null), [w, T] = (0, R.useState)(typeof navigator > "u" || navigator.onLine !== !1), E = p === "bottom-left", D = (0, R.useCallback)((e) => {
		let t = String(e || "").trim();
		t && (_(""), n.send(t));
	}, [n]), O = zw({
		sttUrl: u,
		locale: d,
		onFinal: D,
		onListening: f
	});
	(0, R.useEffect)(() => {
		if (!e) {
			O.listening && O.stop();
			return;
		}
		let t = setTimeout(() => {
			o && S.current ? S.current.focus() : b.current && b.current.focus();
		}, 60);
		return () => clearTimeout(t);
	}, [e, o]), RT(b, e && !o), (0, R.useEffect)(() => {
		let e = () => T(!0), t = () => T(!1);
		return window.addEventListener("online", e), window.addEventListener("offline", t), () => {
			window.removeEventListener("online", e), window.removeEventListener("offline", t);
		};
	}, []);
	let k = r.timeline.length;
	(0, R.useEffect)(() => {
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
	}, ee = (e) => {
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
	}, M = (e) => {
		if (!C.current) return;
		let n = e.clientY - C.current.y, r = n / Math.max(1, performance.now() - C.current.t);
		C.current = null, y(0), (n > 110 || r > .9) && t();
	}, te = o ? "translateY(14px) scale(0.96)" : "translateY(105%)", ne = v ? `translateY(${v}px)` : "none", re = r.timeline.length === 0, N = r.transportKind === "demo";
	return /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [!o && /* @__PURE__ */ (0, X.jsx)(Q, {
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
	}), /* @__PURE__ */ (0, X.jsxs)(Q, {
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
			...Aw,
			position: "fixed",
			zIndex: 2147483e3,
			outline: "none",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			visibility: e ? "visible" : "hidden",
			transform: e ? ne : te,
			opacity: o && !e ? 0 : 1,
			transformOrigin: E ? "bottom left" : "bottom right",
			transition: v ? "none" : `transform ${l + 60}ms ${s}, opacity ${l}ms ease, visibility 0s linear ${e ? "0s" : `${l + 60}ms`}`,
			"@media (prefers-reduced-motion: reduce)": { transition: "none" },
			...o ? {
				bottom: "calc(84px + var(--hart-offset-bottom, 0px))",
				height: "min(720px, calc(100vh - 100px - var(--hart-offset-bottom, 0px)))",
				width: PT,
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
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				onPointerDown: j,
				onPointerMove: ee,
				onPointerUp: M,
				onPointerCancel: M,
				sx: {
					px: 2,
					pt: o ? 1.5 : 1,
					pb: 1.25,
					touchAction: o ? "auto" : "none",
					flexShrink: 0,
					borderBottom: "1px solid rgba(255,255,255,0.08)"
				},
				children: [!o && /* @__PURE__ */ (0, X.jsx)(Q, {
					"aria-hidden": "true",
					sx: {
						width: 40,
						height: 4,
						borderRadius: 2,
						background: "rgba(255,255,255,0.35)",
						mx: "auto",
						mb: 1
					}
				}), /* @__PURE__ */ (0, X.jsxs)(Q, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 1.25
					},
					children: [
						/* @__PURE__ */ (0, X.jsx)(Q, {
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
						/* @__PURE__ */ (0, X.jsxs)(Q, {
							sx: {
								flex: 1,
								minWidth: 0
							},
							children: [/* @__PURE__ */ (0, X.jsxs)(Q, {
								sx: {
									display: "flex",
									alignItems: "center",
									gap: .75,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, X.jsx)(Z, {
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
								}), N && /* @__PURE__ */ (0, X.jsx)(Q, {
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
							}), /* @__PURE__ */ (0, X.jsx)(Z, {
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
						/* @__PURE__ */ (0, X.jsx)(t_, {
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
							children: /* @__PURE__ */ (0, X.jsx)(FT, {})
						})
					]
				})]
			}),
			!w && r.transportKind === "gateway" && /* @__PURE__ */ (0, X.jsx)(Q, {
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
			/* @__PURE__ */ (0, X.jsxs)(Q, {
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
					r.layout && /* @__PURE__ */ (0, X.jsx)(Q, {
						sx: {
							...Aw,
							p: 1.5,
							boxShadow: "none"
						},
						children: /* @__PURE__ */ (0, X.jsx)(NT, {
							layout: r.layout,
							data: r.layoutData,
							keyframesRoot: m,
							onAction: (e, t) => {
								e === "navigate" && t && t.path ? c({ path: t.path }) : n.act(e, t);
							}
						})
					}),
					re && !r.layout && /* @__PURE__ */ (0, X.jsxs)(Q, {
						sx: {
							m: "auto",
							py: 2,
							width: "100%"
						},
						children: [h.welcome && /* @__PURE__ */ (0, X.jsx)(NT, {
							layout: h.welcome,
							data: {},
							keyframesRoot: m,
							sx: {
								background: "transparent",
								p: 0
							}
						}), /* @__PURE__ */ (0, X.jsx)(Q, {
							sx: {
								display: "flex",
								justifyContent: "center"
							},
							children: /* @__PURE__ */ (0, X.jsx)(Pw, {
								items: h.suggestions,
								onPick: D
							})
						})]
					}),
					!re && /* @__PURE__ */ (0, X.jsx)(Iw, {
						state: r,
						session: n,
						onNavigate: c,
						onSend: D
					})
				]
			}),
			/* @__PURE__ */ (0, X.jsxs)(Q, {
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
				children: [O.error && /* @__PURE__ */ (0, X.jsx)(Z, {
					role: "alert",
					sx: {
						fontSize: 12.5,
						color: "#ffb3c4",
						px: .5,
						pb: .75
					},
					children: O.error
				}), /* @__PURE__ */ (0, X.jsxs)(Q, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 1
					},
					children: [
						/* @__PURE__ */ (0, X.jsx)(t_, {
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
							children: /* @__PURE__ */ (0, X.jsx)(LT, {})
						}),
						/* @__PURE__ */ (0, X.jsx)(Q, {
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
							children: O.listening ? /* @__PURE__ */ (0, X.jsxs)(Q, {
								sx: {
									display: "flex",
									alignItems: "center",
									gap: 1,
									minWidth: 0,
									width: "100%"
								},
								children: [/* @__PURE__ */ (0, X.jsx)(Vw, {
									amplitude: O.amplitude,
									active: !0,
									height: 22
								}), /* @__PURE__ */ (0, X.jsx)(Z, {
									noWrap: !0,
									sx: {
										fontSize: 14,
										color: "rgba(255,255,255,0.85)"
									},
									children: O.partial || "Listening…"
								})]
							}) : /* @__PURE__ */ (0, X.jsx)(H_, {
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
						/* @__PURE__ */ (0, X.jsx)(t_, {
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
							children: /* @__PURE__ */ (0, X.jsx)(IT, {})
						})
					]
				})]
			})
		]
	})] });
}
//#endregion
//#region src/embed/ui/VoiceCapsule.jsx
function BT({ open: e, onClose: t, session: n, state: r, agentName: i, onNavigate: a, sttUrl: o, locale: s, onListening: c, position: l }) {
	let [u, d] = (0, R.useState)(!1), [f, p] = (0, R.useState)(""), [m, h] = (0, R.useState)(0), g = (0, R.useRef)(null), _ = l === "bottom-left", v = (0, R.useCallback)((e) => {
		let t = String(e || "").trim();
		t && (p(""), h(n.getState().timeline.length), n.send(t));
	}, [n]), y = zw({
		sttUrl: o,
		locale: s,
		onFinal: v,
		onListening: c
	});
	(0, R.useEffect)(() => {
		if (!e) {
			y.stop();
			return;
		}
		y.supported && !u ? y.start() : d(!0);
	}, [e]), (0, R.useEffect)(() => {
		u && g.current && g.current.focus();
	}, [u]);
	let b = r.timeline.slice(m), x = [...b].reverse().find((e) => e.kind === "msg" && e.role === "assistant"), S = [...b].reverse().find((e) => e.kind === "fragment"), C = [...b].find((e) => e.kind === "msg" && e.role === "user"), w = "Tap the mic and speak";
	return y.listening ? w = "Listening…" : r.thinking ? w = "Working on it…" : u && (w = "Type your request"), e ? /* @__PURE__ */ (0, X.jsxs)(Q, {
		role: "dialog",
		"aria-label": `Voice — ${i}`,
		"data-testid": "hart-voice",
		onKeyDown: (e) => {
			e.key === "Escape" && t();
		},
		sx: {
			...Aw,
			...kw,
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
			/* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					alignItems: "center",
					gap: 1
				},
				children: [
					/* @__PURE__ */ (0, X.jsx)(Z, {
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
					r.transportKind === "demo" && /* @__PURE__ */ (0, X.jsx)(Q, {
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
					y.method === "browser" && /* @__PURE__ */ (0, X.jsx)(Q, {
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
			!u && /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: { py: .5 },
				children: [/* @__PURE__ */ (0, X.jsx)(Vw, {
					amplitude: y.amplitude,
					active: y.listening,
					height: 40
				}), /* @__PURE__ */ (0, X.jsx)(Z, {
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
			y.error && /* @__PURE__ */ (0, X.jsx)(Z, {
				role: "alert",
				sx: {
					fontSize: 13,
					color: "#ffb3c4"
				},
				children: y.error
			}),
			r.thinking && !x && /* @__PURE__ */ (0, X.jsx)(Nw, {}),
			x && /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: { ...kw },
				children: [/* @__PURE__ */ (0, X.jsx)(Z, {
					component: "p",
					sx: {
						m: 0,
						fontSize: 14,
						color: "#fff",
						lineHeight: 1.5
					},
					children: x.text
				}), !r.thinking && /* @__PURE__ */ (0, X.jsx)(Pw, {
					items: x.suggestions,
					onPick: v
				})]
			}),
			S && /* @__PURE__ */ (0, X.jsx)(Mw, {
				fragment: S.fragment,
				onAction: n.act,
				onNavigate: a
			}),
			u ? /* @__PURE__ */ (0, X.jsxs)(Q, {
				component: "form",
				onSubmit: (e) => {
					e.preventDefault(), v(f);
				},
				sx: {
					display: "flex",
					gap: 1,
					alignItems: "center"
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Q, {
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
					children: /* @__PURE__ */ (0, X.jsx)(H_, {
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
				}), y.supported && /* @__PURE__ */ (0, X.jsx)(t_, {
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
					children: /* @__PURE__ */ (0, X.jsx)(LT, {})
				})]
			}) : /* @__PURE__ */ (0, X.jsxs)(Q, {
				sx: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1
				},
				children: [/* @__PURE__ */ (0, X.jsx)(Q, {
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
				}), /* @__PURE__ */ (0, X.jsx)(t_, {
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
					children: /* @__PURE__ */ (0, X.jsx)(LT, { size: 26 })
				})]
			})
		]
	}) : null;
}
//#endregion
//#region src/theme/themeBuilder.js
Hp();
function VT(e, t) {
	if (e <= 0) return 0;
	let n = .5 + (1 - e / 100) * 1.5;
	return Math.round(t * n);
}
function HT(e, t) {
	return e / 100 * t;
}
function UT(e) {
	var t, r, a, o, s;
	let l = e || i, u = l.colors || i.colors, d = l.glass || i.glass, f = l.animations || i.animations, p = l.font || i.font, m = l.shell || i.shell, h = ((t = f.liquid_motion) == null ? void 0 : t.enabled) !== !1, g = (r = (a = f.liquid_motion) == null ? void 0 : a.intensity) == null ? 60 : r, _ = ((o = f.gradients) == null ? void 0 : o.enabled) !== !1, v = ((s = f.glassmorphism) == null ? void 0 : s.enabled) !== !1, y = {
		primary: `linear-gradient(135deg, ${u.primary}, ${u.primary_light || u.primary})`,
		primaryHover: `linear-gradient(135deg, ${u.primary_dark || u.primary}, ${u.primary})`,
		accent: `linear-gradient(135deg, ${u.secondary}, ${u.secondary_light || u.secondary})`,
		growth: `linear-gradient(135deg, ${u.accent}, ${u.accent_light || u.accent})`,
		brand: `linear-gradient(135deg, ${u.primary} 0%, ${u.secondary} 50%, ${u.accent} 100%)`,
		shimmer: OT.shimmer,
		surface: `linear-gradient(180deg, ${yh(u.primary, .05)}, transparent)`
	}, b = h ? `all ${VT(g, n.fast)}ms ${c.snappy}` : "none";
	h && `${VT(g, n.fast)}${c.smooth}`;
	let x = h ? `translateY(-${HT(g, 2)}px)` : "none", S = h ? `scale(${1 + HT(g, .1)})` : "none", C = h ? "scale(0.97)" : "none", w = Bp({
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
				hover: yh(u.primary, .08),
				selected: yh(u.primary, .12)
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
			spacing: jT,
			radius: kT,
			shadows: AT,
			gradients: {
				...OT,
				...y
			},
			easings: c,
			durations: n,
			intent: DT,
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
					borderRadius: kT.md,
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
				borderRadius: kT.lg,
				transition: h ? `transform ${VT(g, 250)}ms ${c.smooth}, box-shadow ${VT(g, 250)}ms ${c.smooth}` : "none",
				willChange: h ? "transform" : "auto",
				"&:hover": {
					transform: x,
					boxShadow: h ? AT.cardHover : void 0
				}
			} } },
			MuiIconButton: { styleOverrides: { root: {
				transition: h ? `transform 150ms ${c.smooth}` : "none",
				"&:hover": { transform: S },
				"&:active": { transform: h ? "scale(0.9)" : "none" }
			} } },
			MuiOutlinedInput: { styleOverrides: { root: {
				borderRadius: kT.md,
				transition: h ? `box-shadow ${n.fast}ms ${c.smooth}` : "none",
				"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
					borderColor: u.primary,
					boxShadow: `0 0 0 3px ${yh(u.primary, .15)}`
				}
			} } },
			MuiDialog: { styleOverrides: { paper: {
				borderRadius: kT.xl,
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
				borderRadius: kT.sm,
				transition: h ? `background-color 150ms ${c.smooth}, padding-left 150ms ${c.smooth}` : "none",
				"&.Mui-selected": {
					paddingLeft: 20,
					backgroundColor: yh(u.primary, .08)
				}
			} } },
			MuiFab: { styleOverrides: { root: {
				borderRadius: kT.lg,
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
				borderRadius: kT.sm,
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
				backgroundColor: yh(u.text_primary, .06),
				borderRadius: kT.sm,
				"&::after": { background: _ ? OT.shimmer : "none" }
			} } },
			MuiStepLabel: { styleOverrides: { label: {
				fontWeight: 600,
				"&.Mui-active": { fontWeight: 700 }
			} } },
			MuiDrawer: { styleOverrides: { paper: {
				borderRight: `1px solid ${yh(u.text_primary, .06)}`,
				backgroundImage: "none"
			} } }
		}
	});
	return w = Wh(w), w;
}
//#endregion
//#region node_modules/react-dom/client.js
var WT = /* @__PURE__ */ T(((e) => {
	var t = eg();
	e.createRoot = t.createRoot, e.hydrateRoot = t.hydrateRoot;
}));
Hc(), Ll(), Hp();
var GT = WT(), KT = /* @__PURE__ */ new Set([
	"assistant",
	"merchant-onboarding",
	"marketing"
]);
function qT(e, t) {
	return Bp(UT(e.config), {
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
function JT({ session: e, state: n, hasOrb: i, position: a, isDesktop: o, onNavigate: s }) {
	let c = a === "bottom-left", l = n.openSheets.length > 0, u = (0, R.useCallback)((t) => e.subscribeStack((n) => {
		n._summaryOf && e.getState().openSheets.length > 0 || t(n);
	}), [e]), d = (0, R.useCallback)((e) => s({ path: e }), [s]), f = c ? "left" : "right", p = l && !o, m = {
		visibility: (0, R.useSyncExternalStore)(t.subscribe, t.getSnapshot, t.getSnapshot).some((t) => t !== e.uid) && !o ? "hidden" : "visible",
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
	return /* @__PURE__ */ (0, X.jsx)(xw, {
		subscribe: u,
		onAction: e.act,
		navigate: d,
		containerSx: m,
		cardSx: {
			...Aw,
			...kw,
			...p ? { background: r } : {}
		},
		cardTransition: jw
	});
}
function YT(e) {
	let { session: t, surface: n, open: r, agentName: i, position: a, onClose: o, onNavigate: s, elementId: c, sttUrl: l, locale: u, onListening: d, shadowRoot: f } = e, p = Ow(t), m = mh("(min-width: 768px)", { noSsr: !0 }), h = p.floatingOwner === c, g = {
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
	return /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [
		KT.has(n) && /* @__PURE__ */ (0, X.jsx)(zT, {
			...g,
			open: r,
			surface: n
		}),
		n === "voice" && /* @__PURE__ */ (0, X.jsx)(BT, {
			...g,
			open: r
		}),
		h && /* @__PURE__ */ (0, X.jsx)(JT, {
			session: t,
			state: p,
			hasOrb: n !== "overlay" || t.orbCount() > 0,
			position: a,
			isDesktop: m,
			onNavigate: s
		})
	] });
}
function XT({ props: e, cache: t }) {
	let { theme: n, container: r } = e, i = (0, R.useMemo)(() => qT(n, r), [n, r]);
	return /* @__PURE__ */ (0, X.jsx)(Cl, {
		value: t,
		children: /* @__PURE__ */ (0, X.jsx)(qh, {
			theme: i,
			children: /* @__PURE__ */ (0, X.jsx)(YT, { ...e })
		})
	});
}
function ZT(e) {
	let t = Vc({
		key: "hart",
		container: e.shadowRoot,
		prepend: !0
	}), n = (0, GT.createRoot)(e.container), r = e, i = () => n.render(/* @__PURE__ */ (0, X.jsx)(XT, {
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
export { ZT as mountEmbed };
