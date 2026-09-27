//#region src/config/apiBase.js
var e = {}.REACT_APP_API_BASE_URL || "http://localhost:5000", t = {}.REACT_APP_SOCIAL_API_URL || `${e}/api/social`, n = {}.REACT_APP_CHAT_API_URL || e, r = {}.REACT_APP_CLOUD_API_URL || "https://azurekong.hertzai.com", i = `${e}/api/admin`;
`${e}`, `${t}`, `${t}`, `${t}`, `${t}`;
var a = {}.REACT_APP_MAILER_API_URL || "https://mailer.hertzai.com", o = {}.REACT_APP_SMS_API_URL || "https://sms.hertzai.com";
({}).REACT_APP_SENTRY_DSN, {}.REACT_APP_GA_TRACKING_ID, {}.REACT_APP_SECRET_KEY, `${a}`, `${a}`, `${a}`, `${a}`, `${r}`, `${r}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, {}.REACT_APP_PHONEPE_MERCHANT_ID, {}.REACT_APP_PHONEPE_SALT_INDEX, {}.REACT_APP_PHONEPE_SALT_KEY, `${r}`, `${r}`, `${r}`, `${r}`, `${r}`, `${e}`, `${e}`, `${e}`, `${e}`, `${r}`, `${e}`, `${e}`, `${e}`, `${r}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${a}`, `${r}`, `${o}`, {}.REACT_APP_WAMP_URL, `${e}`;
//#endregion
//#region src/services/realtimeService.js
var s = null, c = null, l = null, u = null, d = 3e3, f = 1e4, p = 200, m = new class {
	constructor() {
		this._listeners = /* @__PURE__ */ new Map(), this._connected = !1, this._crossbarConnected = !1, this._sseConnected = !1, this._token = null, this._userId = null, this._seenIds = /* @__PURE__ */ new Map(), this._sseBase = null;
	}
	init(e, t = {}) {
		if (t.sseBase && (this._sseBase = t.sseBase), t.userId !== void 0 && t.userId !== null && t.userId !== this._userId ? (this._userId = t.userId, this._sseConnected && this._rotateSSE()) : t.userId && (this._userId = t.userId), this._sseConnected || this._openSSE(), e && s !== e) {
			let t = s;
			s = e, c && t && t.removeEventListener("message", c), c = (e) => {
				let { type: t, payload: n } = e.data;
				if (t === "CONNECTION_STATUS") {
					let e = n === "Connected";
					this._crossbarConnected = e, this._connected = e || this._sseConnected, this._emit(e ? "connected" : "disconnected", { connected: this._connected }), this._sseConnected || this._openSSE();
				}
				t === "SOCIAL_EVENT" && n && this._dispatchSocialPayload(n);
			}, s.addEventListener("message", c);
		}
		this._crossbarConnected || this._openSSE();
	}
	connect(e) {
		e && (this._token = e), !this._crossbarConnected && (this._sseConnected || this._openSSE());
	}
	disconnect() {
		this._connected = !1, this._closeSSE(), c && s && (s.removeEventListener("message", c), c = null);
	}
	get connected() {
		return this._connected;
	}
	on(e, t) {
		return this._listeners.has(e) || this._listeners.set(e, /* @__PURE__ */ new Set()), this._listeners.get(e).add(t), () => {
			var n;
			return (n = this._listeners.get(e)) == null ? void 0 : n.delete(t);
		};
	}
	off(e, t) {
		var n;
		(n = this._listeners.get(e)) == null || n.delete(t);
	}
	_buildSSEUrl() {
		let e = this._sseBase || t;
		if (this._token) return `${e}/events/stream?token=${encodeURIComponent(this._token)}`;
		let n = this._userId || "guest";
		return `${e}/events/stream?user_id=${encodeURIComponent(n)}`;
	}
	_attachSSEHandlers(e) {
		e.onmessage = (e) => {
			try {
				let t = JSON.parse(e.data);
				if (t.type === "connected") return;
				this._dispatchSocialPayload(t);
			} catch {}
		}, [
			"notification",
			"chat.social",
			"setup_progress",
			"chat.response",
			"agent.ui.update"
		].forEach((t) => {
			e.addEventListener(t, (e) => {
				try {
					let n = JSON.parse(e.data);
					this._dispatchSocialPayload({
						type: t,
						...n
					});
				} catch {}
			});
		}), e.onerror = () => {
			e === l && (this._closeSSE(), u = setTimeout(() => this._openSSE(), d));
		};
	}
	_openSSE() {
		if (l) return;
		let e = this._buildSSEUrl();
		try {
			l = new EventSource(e);
		} catch {
			return;
		}
		l.onopen = () => {
			this._sseConnected = !0, this._connected = !0, this._emit("connected", {
				connected: !0,
				transport: "sse"
			});
		}, this._attachSSEHandlers(l);
	}
	_rotateSSE() {
		if (!l) {
			this._openSSE();
			return;
		}
		let e = l, t = this._buildSSEUrl(), n;
		try {
			n = new EventSource(t);
		} catch {
			return;
		}
		this._attachSSEHandlers(n);
		let r = !1;
		n.onopen = () => {
			if (!r) {
				r = !0, l = n, this._sseConnected = !0, this._connected = !0;
				try {
					e.close();
				} catch {}
				this._emit("connected", {
					connected: !0,
					transport: "sse",
					uid: this._userId
				});
			}
		}, n.onerror = () => {
			if (r) {
				this._closeSSE(), u = setTimeout(() => this._openSSE(), d);
				return;
			}
			try {
				n.close();
			} catch {}
			u = setTimeout(() => this._rotateSSE(), d);
		};
	}
	_closeSSE() {
		u && (clearTimeout(u), u = null), l && (l.close(), l = null), this._sseConnected = !1, this._crossbarConnected || (this._connected = !1);
	}
	_isDuplicate(e) {
		let t = e.msg_id || e.request_id || e.id;
		t || (t = "_h:" + ((e.action || e.type || "") + "|" + (e.generated_audio_url || e.agent_id || "") + "|" + (e.message || e.content || e.text || "").slice(0, 100)));
		let n = Date.now();
		if (this._seenIds.has(t) && n - this._seenIds.get(t) < f) return !0;
		if (this._seenIds.set(t, n), this._seenIds.size > p) {
			let e = n - f;
			for (let [t, n] of this._seenIds) n < e && this._seenIds.delete(t);
		}
		return !1;
	}
	_dispatchSocialPayload(e) {
		if (this._isDuplicate(e)) return;
		let t = e.type || e.event_type || e.action || "message";
		e.action === "TTS" && e.generated_audio_url && (t = "tts");
		let n = e.type === "consent.request";
		if ((e.component_type || n || e.type && e.agent_id && e.type !== "notification") && t !== "agent.ui.update" && this._emit("agent.ui.update", e), this._emit(t, e), t === "notification") {
			var r, i;
			let t = ((r = e.data) == null ? void 0 : r.type) || ((i = e.data) == null ? void 0 : i.event_type);
			t && t !== "notification" && this._emit(t, e.data || e);
		}
	}
	_emit(e, t) {
		let n = this._listeners.get(e);
		n && n.forEach((e) => {
			try {
				e(t);
			} catch {}
		});
		let r = this._listeners.get("*");
		r && r.forEach((n) => {
			try {
				n({
					type: e,
					data: t
				});
			} catch {}
		});
	}
}();
//#endregion
export { r as a, n as i, i as n, a as o, e as r, t as s, m as t };
