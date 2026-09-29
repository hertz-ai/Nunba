/**
 * windowDrag — the one drag-vs-click gesture that moves the frameless
 * desktop window, and the rules for where it may start.
 *
 * The gesture ends in `window.pywebview.api.window_start_drag()`, which is
 * already platform-neutral: WindowApi runs the native move loop on Windows
 * (begin_window_drag), the window manager's move on Linux/GTK
 * (begin_move_drag), and pywebview's generic move elsewhere.  Nothing here
 * knows which OS it is on.
 *
 * Two callers:
 *   - NunbaTitleBar's right slot (the intelligence chip), which used to
 *     carry its own copy of this gesture;
 *   - the body, in portrait (owner 2026-09-23: "in portrait mode I shd be
 *     able to drag the whole body from wherever I click unless that
 *     component has individual draggability attribute").
 */

// Pointer travel (CSS px, |dx|+|dy|) past which a press becomes a drag.
// Below it the press is a click and reaches the element untouched.
export const DRAG_THRESHOLD_PX = 5;

// Portrait = the single-column layout.  Tailwind's `md` breakpoint is 768px
// (min-width), so the layout is single-column below it.  The portrait dock
// (709 physical px at 150% scaling) is 472 CSS px.
export const PORTRAIT_MAX_WIDTH_PX = 768;

export function isPortraitLayout(win = typeof window !== 'undefined' ? window : null) {
  return Boolean(win) && Number(win.innerWidth) < PORTRAIT_MAX_WIDTH_PX;
}

// A component that handles the pointer itself opts out of window drag with
// this attribute (e.g. a game board, a canvas, a custom slider).
export const WINDOW_DRAG_OPT_OUT_ATTR = 'data-no-window-drag';

// Elements that own the pointer: pressing them must keep their own
// behaviour (typing, clicking, selecting, native drag, scrubbing).
const POINTER_OWNER_SELECTOR = [
  'button', 'a[href]', 'input', 'textarea', 'select', 'option', 'label',
  'summary', 'iframe', 'video', 'audio', 'canvas',
  '[contenteditable=""]', '[contenteditable="true"]',
  '[draggable="true"]',
  `[${WINDOW_DRAG_OPT_OUT_ATTR}]`,
  '[role="button"]', '[role="link"]', '[role="slider"]', '[role="textbox"]',
  '[role="checkbox"]', '[role="switch"]', '[role="radio"]', '[role="tab"]',
  '[role="menuitem"]', '[role="option"]', '[role="combobox"]',
  '[role="scrollbar"]',
].join(',');

export function ownsPointer(target) {
  const el = target && target.nodeType === 1 ? target : target && target.parentElement;
  return Boolean(el && typeof el.closest === 'function' && el.closest(POINTER_OWNER_SELECTOR));
}

// A press on an element's own scrollbar lands on the element itself, past
// its client box.  Moving the window there would make the scrollbar unusable.
export function pressIsOnScrollbar(event) {
  const el = event && event.target;
  if (!el || el.nodeType !== 1) return false;
  const { offsetX, offsetY } = event;
  if (typeof offsetX !== 'number' || typeof offsetY !== 'number') return false;
  return (el.clientWidth > 0 && offsetX > el.clientWidth)
    || (el.clientHeight > 0 && offsetY > el.clientHeight);
}

function startWindowDrag() {
  try {
    const api = window.pywebview && window.pywebview.api;
    if (api && typeof api.window_start_drag === 'function') {
      api.window_start_drag();
      return true;
    }
    console.warn('[windowDrag] pywebview.api.window_start_drag unavailable');
  } catch (exc) {
    console.error('[windowDrag] window_start_drag failed:', exc);
  }
  return false;
}

/**
 * Arm the drag-vs-click gesture on a left-button mousedown.
 *
 * A move past DRAG_THRESHOLD_PX hands the pointer to the OS move loop; a
 * release before that leaves the click alone.  When a drag happened, the
 * click that follows is swallowed on `clickTarget` so dropping the window
 * does not also click whatever sits under the pointer.
 *
 * Returns a cleanup that removes any listeners still armed.
 */
export function armWindowDragGesture(downEvent, clickTarget = document) {
  const startX = downEvent.clientX;
  const startY = downEvent.clientY;
  let dragging = false;

  const onMove = (mv) => {
    if (dragging) return;
    if (Math.abs(mv.clientX - startX) + Math.abs(mv.clientY - startY) > DRAG_THRESHOLD_PX) {
      dragging = true;
      // The OS move loop owns the pointer from here; the WebView stops
      // getting mousemove, so the move listener is no longer needed.
      document.removeEventListener('mousemove', onMove, true);
      startWindowDrag();
    }
  };
  const cleanup = () => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
  };
  function onUp() {
    cleanup();
    if (!dragging || !clickTarget) return;
    const suppress = (clk) => {
      clk.stopPropagation();
      clk.preventDefault();
      clickTarget.removeEventListener('click', suppress, true);
    };
    clickTarget.addEventListener('click', suppress, true);
    // No click arrives when the pointer left the element during the move.
    setTimeout(() => clickTarget.removeEventListener('click', suppress, true), 0);
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mouseup', onUp, true);
  return cleanup;
}
