/**
 * liquidFragments.js — the ONE fragment-routing contract for web Liquid UI.
 *
 * SOURCE OF TRUTH: Hevolve_React_Native
 *   components/AgentOverlay/AgentOverlayBridge.js
 *     handleAgentUIUpdate()  — the FLOATING / INLINE / NAVIGATE sets
 *     getComponentSummary()  — the per-type summary strings
 *
 * The Android app, the Nunba desktop and the <hart-agent> web embed route a
 * HARTOS `agent_ui_update` component ({type, _agent_id, _ts, ...props}) the
 * same way, so one agent reply looks the same on every surface:
 *
 *   navigate       -> a navigation event to the host, plus a brief
 *                     "Navigating to …" notification
 *   FLOATING_TYPES -> a floating glass card
 *   INLINE_TYPES   -> a card inside the chat / Liquid sheet, plus a brief
 *                     floating notification carrying getComponentSummary()
 *   anything else  -> floating (the RN default branch)
 *
 * If the RN sets move, move them here in the same change (and the other way
 * round).  This module is data + pure functions only: no React, no MUI, so
 * the embed's launcher chunk can import it without pulling in the UI.
 */

// Ported verbatim from AgentOverlayBridge.handleAgentUIUpdate.
export const FLOATING_TYPES = Object.freeze(new Set([
  'notification', 'progress', 'agent_action', 'payment_status',
  'lyrics', 'order_tracking', 'approval', 'metric', 'code',
  'markdown', 'media', 'chart', 'list',
  'meet_copilot',
]));

export const INLINE_TYPES = Object.freeze(new Set([
  'product_card', 'cart', 'checkout', 'comparison', 'form',
]));

export const NAVIGATE_TYPES = Object.freeze(new Set(['navigate']));

export const FRAGMENT_MODE = Object.freeze({
  FLOATING: 'floating',
  INLINE: 'inline',
  NAVIGATE: 'navigate',
});

/** Which surface a fragment type belongs to (RN routing order). */
export function fragmentMode(type) {
  const t = type || 'notification';
  if (NAVIGATE_TYPES.has(t)) return FRAGMENT_MODE.NAVIGATE;
  if (FLOATING_TYPES.has(t)) return FRAGMENT_MODE.FLOATING;
  if (INLINE_TYPES.has(t)) return FRAGMENT_MODE.INLINE;
  return FRAGMENT_MODE.FLOATING;
}

const ISO_CURRENCY = /^[A-Z]{3}$/;
const _formatters = new Map();

/**
 * Money for display.  A pre-formatted string ("₹56") passes through; a
 * number with an ISO code is formatted for Indian English (en-IN), so INR
 * reads "₹56" and 1234.5 reads "₹1,234.50".  Anything else keeps the RN
 * shape "<amount> <currency>" (e.g. "12 Spark").
 */
export function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return '';
  if (typeof amount === 'string' && !/^-?\d+(\.\d+)?$/.test(amount.trim())) {
    return amount;
  }
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  if (currency && ISO_CURRENCY.test(currency)) {
    // Whole rupees read "₹60"; paise always show two digits: "₹1,234.50".
    const digits = Number.isInteger(n) ? 0 : 2;
    const key = `${currency}:${digits}`;
    if (!_formatters.has(key)) {
      try {
        _formatters.set(key, new Intl.NumberFormat('en-IN', {
          style: 'currency', currency, minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }));
      } catch {
        _formatters.set(key, null);
      }
    }
    const f = _formatters.get(key);
    if (f) return f.format(n);
  }
  return `${n} ${currency || 'Spark'}`;
}

/**
 * One-line summary of a fragment, used by the floating notification an
 * INLINE fragment raises and by the aria-live announcement.  Same cases and
 * the same field names as AgentOverlayBridge.getComponentSummary; money goes
 * through formatMoney so INR reads as ₹.
 */
export function getComponentSummary(component) {
  const c = component || {};
  const type = c.type || '';
  switch (type) {
    case 'product_card':
      return `${c.name || 'Product'} — ${formatMoney(c.price, c.currency) || 'Free'}`;
    case 'cart':
      return `Cart: ${(c.items || []).length} items, ${formatMoney(c.total || 0, c.currency)}`;
    case 'checkout':
      return `Checkout: ${formatMoney(c.total || 0, c.currency)}`;
    case 'comparison':
      return `Comparing ${(c.apps || []).length} apps`;
    case 'payment_status':
      return `Payment ${c.status || 'pending'}`;
    case 'order_tracking':
      return `Order ${c.order_id || ''}: ${c.status || ''}`;
    case 'agent_action':
      return c.description || c.action_type || 'Working...';
    case 'approval':
      return `Approval: ${c.description || c.action || 'pending'}`;
    case 'chart':
      return `Chart: ${c.title || 'data'}`;
    case 'code':
      return `Code: ${c.filename || c.language || 'snippet'}`;
    case 'markdown':
      return (c.content || '').substring(0, 80);
    case 'media':
      return `Media: ${c.alt || c.title || c.media_type || 'content'}`;
    case 'metric':
      return `${c.label || 'Metric'}: ${c.value || 0}${c.unit || ''}`;
    case 'form':
      return `Form: ${c.title || 'input needed'}`;
    case 'qr_pair':
      return `Scan QR: ${c.title || c.channel || 'connect'}`;
    case 'list':
      return `List: ${(c.items || []).length} items`;
    case 'navigate':
      return `Navigate: ${c.title || c.target || ''}`;
    case 'meet_copilot': {
      const lines = Array.isArray(c.transcript_lines) ? c.transcript_lines : [];
      const last = lines.length > 0 ? lines[lines.length - 1] : null;
      const lastTxt = last ? (typeof last === 'string' ? last : (last.text || '')) : '';
      return `${c.platform || 'meet'} · ${lines.length} lines${lastTxt ? ' · ' + lastTxt.slice(0, 40) : ''}`;
    }
    default:
      return c.message || c.content || c.title || type;
  }
}
