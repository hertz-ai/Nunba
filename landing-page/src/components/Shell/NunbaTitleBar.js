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

// Heuristic Linux detection from the UA — used as the INITIAL guess before
// the authoritative window_platform() bridge call resolves.  On Windows the
// native WM_NCHITTEST subclass owns 8-way resize, so the JS grips must NOT
// render (they would double-handle).  On Linux/GTK there is no native
// caption/border, so the grips are the resize affordance.
function looksLikeLinux() {
  if (typeof navigator === 'undefined') return false;
  const p = navigator.platform || '';
  const ua = navigator.userAgent || '';
  // Exclude Android (RN shell, never frameless desktop) — only desktop Linux.
  if (/Android/i.test(ua)) return false;
  return /Linux|X11/i.test(p) || /Linux/i.test(ua);
}

// The 8 resize grips for the GTK frameless window.  Each maps to a
// Gdk.WindowEdge name the WindowApi.window_begin_resize() understands.
// Thin invisible strips at the viewport edges + slightly larger corner
// squares.  z-index sits ABOVE the app body but BELOW the 32px titlebar
// (titlebar is z:10000) so the titlebar drag/buttons keep priority.
const RESIZE_GRIP_PX = 6;
const RESIZE_CORNER_PX = 12;

// Pointer travel (in CSS px, summed |dx|+|dy|) past which a mouse-down on the
// titlebar right slot is treated as a window-drag instead of a chip click.
const DRAG_THRESHOLD_PX = 5;
const RESIZE_GRIPS = [
  { edge: 'top', cursor: 'ns-resize', s: { top: 0, left: RESIZE_CORNER_PX, right: RESIZE_CORNER_PX, height: RESIZE_GRIP_PX } },
  { edge: 'bottom', cursor: 'ns-resize', s: { bottom: 0, left: RESIZE_CORNER_PX, right: RESIZE_CORNER_PX, height: RESIZE_GRIP_PX } },
  { edge: 'left', cursor: 'ew-resize', s: { left: 0, top: RESIZE_CORNER_PX, bottom: RESIZE_CORNER_PX, width: RESIZE_GRIP_PX } },
  { edge: 'right', cursor: 'ew-resize', s: { right: 0, top: RESIZE_CORNER_PX, bottom: RESIZE_CORNER_PX, width: RESIZE_GRIP_PX } },
  { edge: 'top-left', cursor: 'nwse-resize', s: { top: 0, left: 0, width: RESIZE_CORNER_PX, height: RESIZE_CORNER_PX } },
  { edge: 'top-right', cursor: 'nesw-resize', s: { top: 0, right: 0, width: RESIZE_CORNER_PX, height: RESIZE_CORNER_PX } },
  { edge: 'bottom-left', cursor: 'nesw-resize', s: { bottom: 0, left: 0, width: RESIZE_CORNER_PX, height: RESIZE_CORNER_PX } },
  { edge: 'bottom-right', cursor: 'nwse-resize', s: { bottom: 0, right: 0, width: RESIZE_CORNER_PX, height: RESIZE_CORNER_PX } },
];

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
  // Whether to render the GTK resize grips.  Initial guess from the UA;
  // corrected by the authoritative window_platform() bridge call below.
  // Windows = false (native hit-test owns resize); Linux = true.
  const [isLinux, setIsLinux] = useState(() => looksLikeLinux());

  // pywebview's api object may attach late; re-check on `pywebviewready` event.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const recheck = () => setVisible(shouldRenderTitleBar());
    window.addEventListener('pywebviewready', recheck);
    return () => window.removeEventListener('pywebviewready', recheck);
  }, []);

  // Resolve the authoritative host platform from the Python bridge.  Falls
  // back to the UA heuristic if the bridge call is unavailable / rejects.
  // The grips ONLY render on Linux (window_platform() === 'linux'); on
  // Windows the WM_NCHITTEST subclass already owns 8-way resize so rendering
  // them would double-handle.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;
    const resolvePlatform = () => {
      try {
        const api = window.pywebview && window.pywebview.api;
        if (!api || typeof api.window_platform !== 'function') return;
        Promise.resolve(api.window_platform())
          .then((plat) => { if (!cancelled && typeof plat === 'string') setIsLinux(plat === 'linux'); })
          .catch(() => { /* keep UA heuristic */ });
      } catch (exc) {
        /* keep UA heuristic */
      }
    };
    resolvePlatform();
    window.addEventListener('pywebviewready', resolvePlatform);
    return () => { cancelled = true; window.removeEventListener('pywebviewready', resolvePlatform); };
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
  // The right slot (chip) and window-buttons cluster opt out — double-clicking
  // a chip button must not maximize.
  const handleDragDoubleClick = useCallback((e) => {
    if (e.target.closest('[data-testid="nunba-window-buttons"]')) return;
    if (e.target.closest('[data-testid="nunba-titlebar-rightslot"]')) return;
    handleMaximize();
  }, [handleMaximize]);

  // Mousedown safety net for backends that ignore -webkit-app-region.
  // Skip the window-buttons cluster AND the right slot: the slot has its own
  // drag-vs-click handler (handleSlotMouseDown) so the chip stays clickable;
  // letting this fire there would start a native drag on every chip click.
  const handleDragMouseDown = useCallback((e) => {
    if (e.target.closest('[data-testid="nunba-window-buttons"]')) return;
    if (e.target.closest('[data-testid="nunba-titlebar-rightslot"]')) return;
    callApi('window_start_drag');
  }, [callApi]);

  // ── Right-slot drag-vs-click ─────────────────────────────────────────
  // The intelligence-preference chip (Local / Hybrid / Hive) is portaled
  // into this slot.  On Windows frameless, the chip's pixels are carved to
  // HTCLIENT (desktop/win32_chrome.py slot_width) so the WebView receives
  // the click — but that means the OS no longer auto-drags the window from
  // there.  We restore titlebar-like behaviour with JS drag-vs-click:
  //   • a plain click (movement under DRAG_THRESHOLD_PX) falls through to
  //     the chip button's own onClick → toggles the preference;
  //   • a real drag (movement past the threshold) calls window_start_drag()
  //     → begin_window_drag() runs the native move loop, and the pending
  //     click is suppressed so the chip doesn't toggle on drop.
  // Only active in pywebview (isPywebview()); browser mode is untouched.
  // `dragging` tracks an in-flight gesture; `cleanup` holds the teardown for
  // the active document listeners so we can also remove them on unmount (no
  // leaked listeners across route changes / re-renders).
  const slotDragRef = useRef({ startX: 0, startY: 0, dragging: false, cleanup: null });

  // Tear down any in-flight drag listeners when the titlebar unmounts.
  useEffect(() => () => {
    const st = slotDragRef.current;
    if (st && typeof st.cleanup === 'function') st.cleanup();
  }, []);

  const handleSlotMouseDown = useCallback((e) => {
    // Left button only; ignore if pywebview bridge is absent (browser mode).
    if (e.button !== 0) return;
    if (!isPywebview()) return;
    const state = slotDragRef.current;
    // A previous gesture's listeners must be gone before we arm a new one,
    // else two onMove handlers would each fire window_start_drag.
    if (typeof state.cleanup === 'function') state.cleanup();
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.dragging = false;

    const cleanup = () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      state.cleanup = null;
    };
    const onMove = (mv) => {
      if (state.dragging) return;
      const dx = Math.abs(mv.clientX - state.startX);
      const dy = Math.abs(mv.clientY - state.startY);
      if (dx + dy > DRAG_THRESHOLD_PX) {
        state.dragging = true;
        // Hand off to the OS native move loop.  After this the WebView stops
        // receiving mousemove (the OS modal move loop owns the pointer), so
        // we can tear down our listeners immediately.
        callApi('window_start_drag');
        cleanup();
      }
    };
    const onUp = () => {
      cleanup();
      if (state.dragging) {
        // A drag just ended on top of the chip — block the synthetic click
        // so the button's onClick doesn't toggle the preference on drop.
        // One-shot, capture-phase, on the slot container.
        const slotEl = slotRef.current;
        if (slotEl) {
          const suppress = (clk) => {
            clk.stopPropagation();
            clk.preventDefault();
            slotEl.removeEventListener('click', suppress, true);
          };
          slotEl.addEventListener('click', suppress, true);
          // Safety net: if no click event arrives (e.g. pointer left the
          // element during the OS move), drop the suppressor next tick.
          setTimeout(() => slotEl.removeEventListener('click', suppress, true), 0);
        }
        state.dragging = false;
      }
    };
    state.cleanup = cleanup;
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
    // Do NOT preventDefault here: a plain click must still reach the chip
    // button's onClick.  We only intercept the click if a drag happened.
  }, [callApi]);

  // Edge/corner grip mousedown → ask GTK to begin a native resize (Linux).
  // Only wired when grips are rendered (isLinux), so it never fires on
  // Windows where the native hit-test owns resize.
  const handleResizeMouseDown = useCallback((edge) => (e) => {
    // Left button only; let the WM take over the drag.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const api = window.pywebview && window.pywebview.api;
      if (api && typeof api.window_begin_resize === 'function') {
        api.window_begin_resize(edge);
      }
    } catch (exc) {
      console.error('[NunbaTitleBar] window_begin_resize failed:', exc);
    }
  }, []);

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
    {/* GTK resize grips — Linux/X11 only.  On Windows the native
        WM_NCHITTEST subclass owns 8-way resize, so these are NOT rendered
        there (would double-handle).  Each grip starts a real WM resize via
        WindowApi.window_begin_resize(edge) on left-button mousedown. */}
    {isLinux && (
      <div data-testid="nunba-resize-grips" aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
        {RESIZE_GRIPS.map((g) => (
          <div
            key={g.edge}
            data-testid={`nunba-resize-${g.edge}`}
            onMouseDown={handleResizeMouseDown(g.edge)}
            style={{
              position: 'fixed',
              cursor: g.cursor,
              pointerEvents: 'auto',
              // Invisible — the cursor change communicates the affordance.
              background: 'transparent',
              ...g.s,
            }}
          />
        ))}
      </div>
    )}
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

      {/* Right slot for portal'd Demopage chip + Audio dropdown — opts out of
          CSS drag, and runs JS drag-vs-click (handleSlotMouseDown) so a plain
          click on a chip button toggles the preference while a drag from the
          chip still moves the window (native move via window_start_drag). */}
      <div
        ref={(el) => {
          slotRef.current = el;
          // Publish the live element via context so consumers can portal into it.
          if (el !== slot) setSlot(el);
        }}
        data-testid="nunba-titlebar-rightslot"
        onMouseDown={handleSlotMouseDown}
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
