/* eslint-disable */
/**
 * NunbaTitleBar — frameless-window custom chrome (Teams-style, canon palette).
 *
 * Renders ONLY when running inside pywebview on Win+Linux (the platforms where
 * app.py:7038 set frameless=True).  Hidden in:
 *   - browser mode (no window.pywebview)
 *   - macOS pywebview (Apple HIG → keep native traffic-light buttons)
 *
 * Single 32px row:
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  ⚫ Nunba              ⌁ drag region ⌁              — ☐ ✕     │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Phase A (this commit): titlebar shows window controls only; the existing
 * Demopage intelligence-preference chip stays where it is (top-right of page
 * body) — visually it lands ~30px below the titlebar, looks unified.
 *
 * Phase B (follow-up): lift Demopage chip state into AppShellContext and
 * render chip inside titlebar's right cluster.  Keeps this commit small.
 *
 * Drag region: uses CSS `-webkit-app-region: drag` (pywebview cef/edge respects
 * it on Windows + Linux via Chromium); the buttons themselves opt out with
 * `-webkit-app-region: no-drag`.  We also call window_start_drag on mousedown
 * as a safety net for backends that don't honor the CSS hint.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TitleBarSlotProvider } from './TitleBarSlotContext';

// ── Detection helpers ────────────────────────────────────────────────

function isPywebview() {
  return typeof window !== 'undefined' && Boolean(window.pywebview && window.pywebview.api);
}

function isMacOS() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
}

// The floating desktop-companion window loads the /voice-orb route in its OWN
// frameless, TRANSPARENT pywebview window (app.py companion window → commit
// 2c06d093 repointed it from /companion to /voice-orb).  /voice-orb is a real
// route inside MainRoutes, which App.js wraps in <NunbaTitleBar>, so without
// this guard the orb window would paint a 32px solid-black titlebar over the
// transparent orb AND clamp its 100vh canvas to 100vh-32px.  Never render the
// chrome there — the orb window has no window controls and isn't draggable via
// a titlebar.
function isVoiceOrbRoute() {
  if (typeof window === 'undefined' || !window.location) return false;
  return (window.location.pathname || '').startsWith('/voice-orb');
}

function shouldRenderTitleBar() {
  // Render only in pywebview, not on macOS (macOS keeps native chrome), and
  // never on the transparent floating voice-orb companion window.
  return isPywebview() && !isMacOS() && !isVoiceOrbRoute();
}

// ── Window control button (— / ☐ / ✕) ────────────────────────────────

function WindowButton({ label, onClick, hoverBg, testId, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      data-testid={testId}
      style={{
        WebkitAppRegion: 'no-drag',
        appRegion: 'no-drag',
        width: 46,
        height: 32,
        border: 'none',
        background: 'transparent',
        color: '#cfcaff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        lineHeight: 1,
        transition: 'background 0.12s ease',
        padding: 0,
        outline: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function NunbaTitleBar({ children }) {
  const [visible, setVisible] = useState(() => shouldRenderTitleBar());
  const slotRef = useRef(null);
  const [slot, setSlot] = useState(null);

  // pywebview's api object may attach late; re-check on `pywebviewready` event.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const recheck = () => setVisible(shouldRenderTitleBar());
    window.addEventListener('pywebviewready', recheck);
    return () => window.removeEventListener('pywebviewready', recheck);
  }, []);

  // ── First-paint occlusion fix ────────────────────────────────────────
  // Toggle a body class + CSS var so layout reflows when pywebview's api
  // attaches late.  Without this, App.js's paddingTop is computed once at
  // initial render (when shouldRenderTitleBar() is still false) and never
  // re-applied, so the sidebar's bold "Nunba" h1 and mobile hamburger get
  // covered by the fixed 32px chrome until a route change forces a
  // re-render.  The CSS rules (injected once below) push the known top-0
  // and top-4 children down by the titlebar height.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const root = document.documentElement;
    if (visible) {
      root.style.setProperty('--nunba-titlebar-h', '32px');
      root.classList.add('nunba-frameless-active');
      body.classList.add('nunba-frameless-active');
    } else {
      root.style.removeProperty('--nunba-titlebar-h');
      root.classList.remove('nunba-frameless-active');
      body.classList.remove('nunba-frameless-active');
    }
    return () => {
      root.style.removeProperty('--nunba-titlebar-h');
      root.classList.remove('nunba-frameless-active');
      body.classList.remove('nunba-frameless-active');
    };
  }, [visible]);

  // Inject the offset stylesheet once.  Scoped under
  // `html.nunba-frameless-active` so it's a no-op in browser / macOS mode.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('nunba-titlebar-offsets')) return;
    const style = document.createElement('style');
    style.id = 'nunba-titlebar-offsets';
    style.textContent = `
      /* The custom titlebar is a fixed 32px overlay at z:10000.
         Two visible bugs we were solving — and a third we just caused:
           (a) chrome at top:0 / top:1rem was occluded by the strip;
           (b) <main> padding-top:32px made the body 100vh+32px tall →
               outer page scrollbar + chat input pushed below viewport.
         Fix is to RESERVE the 32px at the document level instead of
         padding INTO the existing layout:
           1. html { padding-top:32px; height:100vh; box-sizing:border-box;
              overflow:hidden } — the document content box becomes exactly
              (100vh − 32px).  No outer scroller.
           2. body { height:100% } — fills the new shorter document.
           3. .h-screen / .min-h-screen / 100vh shells (chat, sidebar,
              social layout) get clamped to (100vh − 32px) so full-height
              panels fit without overflowing past the visible bottom edge.
           4. position:fixed top-0 still references the unshrunk viewport
              (CSS fixed-positioning is viewport-relative regardless of
              html padding) → keep that single offset rule.
           5. .sticky.top-0 + .absolute.top-4 now live inside the
              shrunk body, so their natural top:0 / top:1rem positions are
              already correct — no extra offset for them. */
      html.nunba-frameless-active {
        padding-top: var(--nunba-titlebar-h, 32px);
        height: 100vh;
        box-sizing: border-box;
        overflow: hidden;
      }
      html.nunba-frameless-active body {
        height: 100%;
        margin: 0;
      }
      html.nunba-frameless-active .h-screen,
      html.nunba-frameless-active .min-h-screen {
        /* !important so this clamp beats tailwind's own .h-screen rule
           (height:100vh !important in assets/css/tailwind.css). Without it
           the clamp loses the cascade, the chat/sidebar/social shells stay a
           full 100vh, overflow the (100vh − 32px) document, and the bottom
           (chat input) is clipped by the titlebar height. This selector is
           more specific, so among two !important rules it wins. */
        height: calc(100vh - var(--nunba-titlebar-h, 32px)) !important;
        min-height: calc(100vh - var(--nunba-titlebar-h, 32px)) !important;
      }
      /* Cancel the now-redundant App.js paddingTop on <main> — the
         html-level padding already reserves the titlebar gap. */
      html.nunba-frameless-active main { padding-top: 0 !important; }
      html.nunba-frameless-active .fixed.top-0 { top: var(--nunba-titlebar-h, 32px); }
    `;
    document.head.appendChild(style);
  }, []);

  const callApi = useCallback((name) => {
    try {
      const api = window.pywebview && window.pywebview.api;
      if (api && typeof api[name] === 'function') {
        api[name]();
      } else {
        console.warn(`[NunbaTitleBar] pywebview.api.${name} unavailable`);
      }
    } catch (exc) {
      console.error(`[NunbaTitleBar] ${name} failed:`, exc);
    }
  }, []);

  const handleMinimize = useCallback(() => callApi('window_minimize'), [callApi]);
  const handleMaximize = useCallback(() => callApi('window_toggle_maximize'), [callApi]);
  const handleClose = useCallback(() => callApi('window_close'), [callApi]);

  // Double-click anywhere on the drag region toggles maximize (OS convention).
  const handleDragDoubleClick = useCallback((e) => {
    if (e.target.closest('[data-testid="nunba-window-buttons"]')) return;
    handleMaximize();
  }, [handleMaximize]);

  // Mousedown safety net for backends that ignore -webkit-app-region.
  const handleDragMouseDown = useCallback((e) => {
    if (e.target.closest('[data-testid="nunba-window-buttons"]')) return;
    callApi('window_start_drag');
  }, [callApi]);

  if (!visible) {
    // Browser mode: still render the provider so consumers see slot=null and
    // fall back to inline render.  No DOM emitted by the titlebar itself.
    return (
      <TitleBarSlotProvider slot={null}>
        {children || null}
      </TitleBarSlotProvider>
    );
  }

  return (<>
    <TitleBarSlotProvider slot={slot}>{children || null}</TitleBarSlotProvider>
    <div
      data-testid="nunba-titlebar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 32,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        // Solid canon black — gradient was reading as "not fully black" in
        // the install; user asked for full black background.  #0F0E17 is the
        // Hevolve canon palette anchor.  No bottom border so the strip blends
        // seamlessly into the dark app body below.
        background: '#0F0E17',
        borderBottom: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // The whole strip is draggable; interactive children opt out below.
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
      }}
      onDoubleClick={handleDragDoubleClick}
      onMouseDown={handleDragMouseDown}
    >
      {/* Left: small Nunba icon + wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 12,
          flex: '0 0 auto',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C63FF, #FF6B6B)',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#cfcaff',
            letterSpacing: 0.3,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Nunba
        </span>
      </div>

      {/* Center: empty draggable spacer (inherits drag from parent) */}
      <div style={{ flex: '1 1 auto' }} />

      {/* Right slot for portal'd Demopage chip + Audio dropdown — opts out of drag */}
      <div
        ref={(el) => {
          slotRef.current = el;
          // Publish the live element via context so consumers can portal into it.
          if (el !== slot) setSlot(el);
        }}
        data-testid="nunba-titlebar-rightslot"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingRight: 6,
          WebkitAppRegion: 'no-drag',
          appRegion: 'no-drag',
        }}
      />

      {/* Right: window controls cluster — opts out of drag */}
      <div
        data-testid="nunba-window-buttons"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          WebkitAppRegion: 'no-drag',
          appRegion: 'no-drag',
        }}
      >
        <WindowButton
          label="Minimize"
          onClick={handleMinimize}
          hoverBg="rgba(255,255,255,0.08)"
          testId="nunba-window-min"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <rect x="1" y="5" width="8" height="1" fill="currentColor" />
          </svg>
        </WindowButton>
        <WindowButton
          label="Maximize / Restore"
          onClick={handleMaximize}
          hoverBg="rgba(255,255,255,0.08)"
          testId="nunba-window-max"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </WindowButton>
        <WindowButton
          label="Close"
          onClick={handleClose}
          hoverBg="#e94560"
          testId="nunba-window-close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </WindowButton>
      </div>
    </div>
  </>);
}

// Export the detection helper for Jest + other consumers.
export { shouldRenderTitleBar, isPywebview };
