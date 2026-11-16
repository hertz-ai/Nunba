/**
 * useMainPagePresence: the main page tells the desktop host whether the owner
 * is looking at it, so the floating companion window hides over Nunba and
 * shows when the owner is somewhere else.
 *
 * Owner, 2026-11-10: the floating window follows events, not a 0.35 s poll of
 * the operating system's foreground window, and the answer comes from our own
 * page ("we shd know whether its getting rendered or not, not the windows"),
 * on Windows, macOS and Linux alike.
 *
 * In front = the page is visible and the document has focus.  Reported on
 * focus, blur, visibilitychange and pywebviewready, and only when the answer
 * changes, through the main window's js_api `main_page_presence(inFront)`
 * (desktop/main_page_presence.py).  pywebview carries that call the same way
 * on WebView2, WKWebView and WebKitGTK.
 *
 * Only the main window's js_api has that method: in the floating window, and
 * in a plain browser, the hook does nothing.
 *
 * Read after the event settles: moving focus into an iframe fires `blur` on
 * this window while the document still has focus, so the state is read on
 * the next tick, not taken from the event's name.
 */
import {useEffect} from 'react';

export function mainPageInFront(doc = document) {
  return doc.visibilityState === 'visible' && doc.hasFocus();
}

function presenceApi() {
  const api = window.pywebview && window.pywebview.api;
  return api && typeof api.main_page_presence === 'function' ? api : null;
}

export default function useMainPagePresence() {
  useEffect(() => {
    let last = null;
    let timer = null;
    const report = () => {
      timer = null;
      const api = presenceApi();
      if (!api) return;
      const inFront = mainPageInFront();
      if (inFront === last) return;
      last = inFront;
      Promise.resolve(api.main_page_presence(inFront)).catch(() => {
        // Not delivered: report it again on the next event.
        last = null;
      });
    };
    const settle = () => {
      if (timer === null) timer = setTimeout(report, 0);
    };
    window.addEventListener('focus', settle);
    window.addEventListener('blur', settle);
    window.addEventListener('pywebviewready', settle);
    document.addEventListener('visibilitychange', settle);
    settle();
    return () => {
      window.removeEventListener('focus', settle);
      window.removeEventListener('blur', settle);
      window.removeEventListener('pywebviewready', settle);
      document.removeEventListener('visibilitychange', settle);
      if (timer !== null) clearTimeout(timer);
    };
  }, []);
}
