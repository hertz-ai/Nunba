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
import { useEffect, useRef, useState } from 'react';

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

/**
 * A chat page's half of the bridge: announce the page, put a composed line in
 * its composer (sending it when the shell asks), and report the turn the
 * shell's orb lamp mirrors. Standalone it does nothing.
 *
 * The send goes through the page's own send (handleSendRef) on the render
 * after the line landed, so it is the same turn a typed line makes. A counter
 * triggers it, not the composer's text: keyed on the text, a line equal to
 * what the composer already held rendered nothing, so the send never ran and
 * the person's next keystroke sent whatever they had half typed (review of
 * Nunba 22b282cf, M1).
 *
 * Composed lines go one at a time, in order: each is put in the composer,
 * sent on the render that holds it if the shell asked, and only then is the
 * next one taken.  The shell flushes the lines it held while this page
 * loaded back to back, and they reach one render; one pending flag sent the
 * last of them alone, and a prefill last sent nothing (review of Nunba
 * d16667cf, A).
 *
 * 'done' is reported only after a 'start'. On mount it turned off the lamp
 * the shell had just lit for the line it was about to compose (same review,
 * m1).
 */
export function useShellBridge({ setInputMessage, handleSendRef, textareaRef, loading }) {
  const composedRef = useRef([]);  // lines the shell composed, oldest first
  const landedRef = useRef(null);  // the line put in the composer, not yet sent
  const [composeTick, setComposeTick] = useState(0);
  const turnStartedRef = useRef(false);

  useEffect(() => {
    if (!isEmbeddedInShell()) return undefined;
    postToShell('nunba:ready', { route: window.location.pathname });
    return onShellMessage((msg) => {
      if (msg.type !== 'nunba:compose') return;
      const text = typeof msg.text === 'string' ? msg.text.trim() : '';
      if (!text) return;
      composedRef.current.push({ text, send: !!msg.send });
      setComposeTick((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    const landed = landedRef.current;
    landedRef.current = null;
    if (landed && landed.send && handleSendRef && handleSendRef.current) handleSendRef.current();
    const next = composedRef.current.shift();
    if (!next) return;
    landedRef.current = next;
    setInputMessage(next.text);
    const input = textareaRef && textareaRef.current;
    if (input) {
      try { input.focus(); } catch { /* detached */ }
    }
    setComposeTick((n) => n + 1);
  }, [composeTick]); // eslint-disable-line react-hooks/exhaustive-deps -- a setter and two refs, all stable

  useEffect(() => {
    if (!isEmbeddedInShell()) return;
    if (loading) {
      turnStartedRef.current = true;
      postToShell('nunba:turn', { state: 'start' });
    } else if (turnStartedRef.current) {
      postToShell('nunba:turn', { state: 'done' });
    }
  }, [loading]);
}
