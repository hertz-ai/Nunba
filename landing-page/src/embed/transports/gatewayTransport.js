/**
 * gatewayTransport — the real agent: HARTOS `POST /chat` + per-user realtime.
 *
 * Chat body is the one PLAN §5.4 pins for the existing /chat route (no new
 * chat route):  {prompt: "[mcgroce_ctx]{json}\n<text>", prompt_id,
 * request_id, media_mode, preferred_lang}  with `Bearer <getToken()>`.
 * `text` is sent too so the Nunba /chat adapter (which reads `text`) works
 * behind the same gateway.
 *
 * Pushed fragments and expert replies arrive on the EXISTING realtime
 * broker (services/realtimeService: SSE /api/social/events/stream, dedup,
 * named events) pointed at the gateway — no second SSE client.
 *
 * Tokens come only from getToken(); they are never put in a URL except the
 * SSE ?token= the existing broker already uses (EventSource cannot send
 * headers).
 */

import realtimeService from '../../services/realtimeService';
import {fragmentsFromChatResponse} from '../a2uiAdapter';
import {ACTION_KINDS} from '../hostBridge';

const CHAT_TIMEOUT_MS = 90000;

function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  return `${b}${path.startsWith('/') ? path : `/${path}`}`;
}

function firstText(v) {
  return (Array.isArray(v) ? v[0] : v) || '';
}

function compactContext(ctx) {
  if (!ctx) return {};
  const c = {};
  if (ctx.page) c.page = ctx.page;
  if (ctx.product) c.product = ctx.product;
  if (ctx.cart) {
    c.cart = {
      total: ctx.cart.total, currency: ctx.cart.currency,
      items: (ctx.cart.items || []).slice(0, 20).map((l) => ({sku: l.sku, name: l.name, qty: l.qty})),
    };
  }
  if (ctx.store) c.store = {id: ctx.store.id, name: ctx.store.name};
  if (ctx.merchant) c.merchant = {id: ctx.merchant.id, name: ctx.merchant.name};
  return c;
}

/**
 * @param {object} o
 * @param {object} o.sink          embedSession sink
 * @param {string} o.gatewayUrl    e.g. "/agent"
 * @param {string} [o.promptId]    e.g. "mcgroce_shopper"
 * @param {string} [o.userId]
 * @param {string} [o.locale]
 * @param {Function} [o.getToken]  async () => jwt
 * @param {Function} [o.fetchImpl]
 * @param {object} [o.realtime]    broker (defaults to the app's singleton)
 */
export function createGatewayTransport({
  sink, gatewayUrl, promptId, userId, locale, getToken, fetchImpl, realtime,
}) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const rt = realtime || realtimeService;
  let serverPromptId = promptId || null;
  let rid = 0;
  const unsubs = [];

  async function authHeaders() {
    const h = {'Content-Type': 'application/json'};
    try {
      const tok = getToken ? await getToken() : null;
      if (tok) h.Authorization = `Bearer ${tok}`;
    } catch { /* anonymous */ }
    return h;
  }

  async function post(path, body, timeoutMs = 20000) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await doFetch(joinUrl(gatewayUrl, path), {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin',
      });
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok) {
        const err = new Error(
          res.status === 429 ? 'The assistant is busy. Please try again in a few seconds.'
            : res.status === 401 || res.status === 403 ? 'Please sign in again to use the assistant.'
              : 'The assistant could not answer just now.');
        err.code = `http_${res.status}`;
        throw err;
      }
      return data || {};
    } catch (e) {
      if (e && e.name === 'AbortError') {
        const err = new Error('The assistant took too long to answer. Please try again.');
        err.code = 'timeout';
        throw err;
      }
      if (e && e.code) throw e;
      const err = new Error("Can't reach the assistant. Check your connection and try again.");
      err.code = 'network';
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function connect() {
    let token = null;
    Promise.resolve(getToken ? getToken() : null).then((t) => {
      token = t;
    }).catch(() => {}).finally(() => {
      if (token) rt.connect(token);
      rt.init(null, {userId: userId || undefined, sseBase: joinUrl(gatewayUrl, '/api/social')});
    });
    unsubs.push(rt.on('agent.ui.update', (p) => sink.fragment(p)));
    const onExpert = (data) => {
      if (!data || !data.speculation_id) return;
      const text = firstText(data.text) || data.response || '';
      if (text) sink.replaceDraft(data.speculation_id, text, data.source || 'expert');
    };
    unsubs.push(rt.on('chat.response', onExpert));
    unsubs.push(rt.on('chat_response', onExpert));
  }

  async function send(text, {context} = {}) {
    rid += 1;
    const requestId = `emb_${Date.now().toString(36)}_${rid}`;
    const ctx = compactContext(context);
    const res = await post('/chat', {
      prompt: `[mcgroce_ctx]${JSON.stringify(ctx)}\n${text}`,
      text,
      context: ctx,
      prompt_id: serverPromptId || undefined,
      request_id: requestId,
      user_id: userId || undefined,
      media_mode: 'text',
      preferred_lang: locale || undefined,
    }, CHAT_TIMEOUT_MS);
    if (res.prompt_id) serverPromptId = res.prompt_id;
    const reply = firstText(res.text) || res.response || res.message || res.answer || '';
    if (reply) {
      const draft = !!(res.speculation_id && res.expert_pending);
      sink.message({
        text: reply, speculationId: res.speculation_id, isDraft: draft,
        source: draft ? 'draft' : (res.responding_agent || 'agent'),
      });
    }
    fragmentsFromChatResponse(res).forEach((f) => sink.fragment(f));
    if (res.dynamic_layout) sink.layout(res.dynamic_layout, res.dynamic_data || res.layout_data || {});
    if (!reply && !(res.ui_components || []).length) {
      sink.message({text: "I didn't catch that. Could you say it another way?"});
    }
  }

  async function decide(payload) {
    const action = String(payload.action || '');
    // AP2 (PLAN §5.3): the host confirms with a user gesture BEFORE the
    // approval reaches HARTOS; HARTOS then authorizes against the JWT user.
    if (action.startsWith('ap2_pay:') && payload.decision === 'approve') {
      const hostOk = await sink.request('payment.authorize', {
        mandate: {payment_id: action.slice('ap2_pay:'.length), mandate_id: payload.mandate_id},
        amount: payload.amount, currency: payload.currency, merchant: payload.merchant,
      }, {timeoutMs: 60000});
      if (!hostOk.ok) return hostOk;
    }
    try {
      const data = await post('/api/agent/approval', {
        agent_id: payload.agent_id || payload._agent_id,
        action,
        decision: payload.decision,
        approved: payload.decision === 'approve',
      });
      return {ok: true, data};
    } catch (e) {
      return {ok: false, error: e.message, code: e.code};
    }
  }

  async function handleAction(kind, payload) {
    if (kind === 'approval.decide') return decide(payload);
    if (kind === 'checkout.confirm') {
      return decide({...payload, action: payload.approval_action || payload.confirm_action, decision: 'approve'});
    }
    if (kind === 'form.submit') {
      const action = String(payload.action || '');
      if (ACTION_KINDS.includes(action)) return sink.request(action, payload.values || {});
      if (action.startsWith('/')) {
        try {
          return {ok: true, data: await post(action, payload.values || {})};
        } catch (e) {
          return {ok: false, error: e.message};
        }
      }
      return {ok: false, error: 'This form has no destination.'};
    }
    return undefined;
  }

  return {
    kind: 'gateway',
    label: '',
    connect,
    send,
    handleAction,
    setUser(id) {
      userId = id || null;
      rt.init(null, {userId: userId || undefined, sseBase: joinUrl(gatewayUrl, '/api/social')});
    },
    disconnect() {
      unsubs.splice(0).forEach((u) => u && u());
    },
  };
}
