/**
 * shellBridge: Nunba inside the HART OS desktop shell.
 *
 * On HART OS this SPA is the desktop's one chat surface. The shell frames it
 * twice from the same origin: the pinned "assistant" panel (its chat) and the
 * first-run overlay (its "Light Your HART" ceremony). The two windows talk over
 * postMessage, and this module is the only place either side's message shape
 * is spelled out:
 *
 *   Nunba -> shell   nunba:ready        {route}          the chat page mounted
 *                    nunba:turn         {state}          'start' | 'done'
 *                    nunba:onboarding   {state, language} 'sealed'
 *   shell -> Nunba   nunba:compose      {text, send}     put text in the
 *                                                        composer, send if asked
 *
 * Standalone Nunba (Windows, macOS, the browser) has no parent window, so
 * every call here is a no-op there. The shell's half lives in HARTOS
 * integrations/agent_engine/liquid_ui_service.py (window.HartNunba) and
 * static/hartOnboarding.js.
 *
 * Same origin only: the shell serves this bundle through its own proxy, so the
 * parent IS our origin; anything else is ignored, never answered.
 */

export const SHELL_MESSAGE_PREFIX = 'nunba:';

export function isEmbeddedInShell() {
  try {
    return typeof window !== 'undefined' && !!window.parent && window.parent !== window;
  } catch {
    return false;
  }
}

/**
 * Post one message up to the shell. Returns true when a message left, false
 * when standalone (no parent) or the type is not ours.
 */
export function postToShell(type, payload) {
  if (!isEmbeddedInShell()) return false;
  if (typeof type !== 'string' || type.indexOf(SHELL_MESSAGE_PREFIX) !== 0) return false;
  try {
    window.parent.postMessage({ type, ...(payload || {}) }, window.location.origin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to the shell's messages. The handler sees only same-origin
 * messages from the parent window whose `type` carries our prefix.
 * Returns the unsubscribe function.
 */
export function onShellMessage(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') return () => {};
  const listener = (event) => {
    if (!event || event.origin !== window.location.origin) return;
    // A sibling frame of our own origin is not the shell. jsdom and some
    // embedders deliver no source at all; the origin check still holds there.
    if (event.source && event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
    if (data.type.indexOf(SHELL_MESSAGE_PREFIX) !== 0) return;
    handler(data, event);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
