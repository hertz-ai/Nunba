/**
 * hostBridge — the <hart-agent> ⇄ host page contract (PLAN §6, nunba_liquid §7).
 *
 * Embed → host   CustomEvents on the element, bubbles + composed, so a
 *                listener on the element, document or window sees them:
 *                  hart:ready     {surface}
 *                  hart:action    {kind, requestId, payload}
 *                  hart:navigate  {path, params, title}
 *                  hart:message   {role, text, request_id}
 *                  hart:error     {code, message}
 * Host → embed   hart:action-result {requestId, ok, data | error}
 *                dispatched on the element (or window), or answered
 *                synchronously via event.detail.respond(result).
 *
 * request() never throws: it resolves {ok, data} or {ok:false, error, code}
 * so a card can show a designed error state instead of an exception.
 */

export const ACTION_KINDS = Object.freeze([
  'cart.add', 'cart.remove', 'cart.update', 'checkout.start',
  'payment.authorize', 'catalog.search', 'merchant.onboard',
  'merchant.sku.upsert', 'campaign.draft',
]);

export const HOST_EVENTS = Object.freeze({
  READY: 'hart:ready',
  ACTION: 'hart:action',
  ACTION_RESULT: 'hart:action-result',
  NAVIGATE: 'hart:navigate',
  MESSAGE: 'hart:message',
  ERROR: 'hart:error',
});

export const DEFAULT_ACTION_TIMEOUT_MS = 15000;

let _rid = 0;
function nextRequestId() {
  _rid += 1;
  return `hart_${Date.now().toString(36)}_${_rid}`;
}

/**
 * @param {EventTarget} target the <hart-agent> element
 * @param {{timeoutMs?:number, resultTargets?:EventTarget[]}} [opts]
 */
export function createHostBridge(target, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;
  const pending = new Map();
  const listenOn = opts.resultTargets
    || [target, typeof window !== 'undefined' ? window : null].filter(Boolean);

  function settle(result) {
    if (!result || !result.requestId) return false;
    const entry = pending.get(result.requestId);
    if (!entry) return false;
    pending.delete(result.requestId);
    clearTimeout(entry.timer);
    entry.resolve(result.ok === false
      ? {ok: false, error: result.error || 'The store could not complete that.', code: result.code || 'host_error', data: result.data}
      : {ok: true, data: result.data});
    return true;
  }

  const onResult = (e) => settle(e && e.detail);
  listenOn.forEach((t) => t.addEventListener(HOST_EVENTS.ACTION_RESULT, onResult));

  function emit(type, detail) {
    const ev = new CustomEvent(type, {
      detail, bubbles: true, composed: true, cancelable: true,
    });
    return target.dispatchEvent(ev);
  }

  function request(kind, payload, reqOpts = {}) {
    const requestId = nextRequestId();
    const wait = reqOpts.timeoutMs ?? timeoutMs;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!pending.has(requestId)) return;
        pending.delete(requestId);
        resolve({ok: false, code: 'timeout', error: 'The store did not answer in time.'});
      }, wait);
      pending.set(requestId, {resolve, timer, kind});
      const respond = (result) => settle({...(result || {}), requestId});
      emit(HOST_EVENTS.ACTION, {kind, requestId, payload: payload || {}, respond});
    });
  }

  function destroy() {
    listenOn.forEach((t) => t.removeEventListener(HOST_EVENTS.ACTION_RESULT, onResult));
    pending.forEach((entry) => {
      clearTimeout(entry.timer);
      entry.resolve({ok: false, code: 'destroyed', error: 'The assistant was closed.'});
    });
    pending.clear();
  }

  return {
    emit,
    request,
    settle,
    destroy,
    get pendingCount() { return pending.size; },
  };
}
