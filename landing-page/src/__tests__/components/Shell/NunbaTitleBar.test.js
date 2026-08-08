/* eslint-disable */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// NunbaTitleBar reads useLocation() to decide whether the current route owns
// the viewport.  Mock it rather than wrapping 30+ bare render() calls in a
// MemoryRouter — one seam, and each test can steer the route by assigning
// mockPathname.  (Jest allows out-of-scope refs in a mock factory when the
// name begins with "mock".)
let mockPathname = '/admin/task-ledger';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ pathname: mockPathname }),
}));

import NunbaTitleBar, {
  shouldRenderTitleBar,
  isPywebview,
  isFixedViewportRoute,
  FIXED_VIEWPORT_ROUTES,
} from '../../../components/Shell/NunbaTitleBar';

// ── Test helpers ─────────────────────────────────────────────────────

beforeEach(() => {
  mockPathname = '/admin/task-ledger';
  document.documentElement.className = '';
});

function mockPywebview(api = {}) {
  window.pywebview = {
    api: {
      window_minimize: jest.fn(),
      window_toggle_maximize: jest.fn(),
      window_close: jest.fn(),
      window_start_drag: jest.fn(),
      window_is_maximized: jest.fn(() => false),
      ...api,
    },
  };
}

function clearPywebview() {
  delete window.pywebview;
}

function setPlatform(platform) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  });
}

beforeEach(() => {
  clearPywebview();
  setPlatform('Win32');
});

afterEach(() => {
  clearPywebview();
});

// ── Detection helpers ────────────────────────────────────────────────

describe('shouldRenderTitleBar detection', () => {
  test('returns false when no pywebview present (browser mode)', () => {
    expect(shouldRenderTitleBar()).toBe(false);
  });

  test('returns true on Win+pywebview', () => {
    mockPywebview();
    setPlatform('Win32');
    expect(shouldRenderTitleBar()).toBe(true);
  });

  test('returns true on Linux+pywebview', () => {
    mockPywebview();
    setPlatform('Linux x86_64');
    expect(shouldRenderTitleBar()).toBe(true);
  });

  test('returns false on macOS+pywebview (Apple HIG)', () => {
    mockPywebview();
    setPlatform('MacIntel');
    expect(shouldRenderTitleBar()).toBe(false);
  });

  test('isPywebview reads window.pywebview.api', () => {
    expect(isPywebview()).toBe(false);
    mockPywebview();
    expect(isPywebview()).toBe(true);
  });
});

// ── Render guards ────────────────────────────────────────────────────

describe('NunbaTitleBar render guards', () => {
  test('renders nothing in browser mode', () => {
    const {container} = render(<NunbaTitleBar />);
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing on macOS even in pywebview', () => {
    mockPywebview();
    setPlatform('MacIntel');
    const {container} = render(<NunbaTitleBar />);
    expect(container.firstChild).toBeNull();
  });

  test('renders titlebar in Win+pywebview', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    expect(screen.getByTestId('nunba-titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('nunba-window-buttons')).toBeInTheDocument();
  });

  // Drift-guard (2026-06-24): the injected offset stylesheet must push MUI
  // fixed AppBars + side Drawers below the 32px titlebar — else the admin
  // header / sidebar top is occluded (they're MUI classes, NOT .fixed.top-0,
  // so they escape the generic offset).
  test('offset stylesheet reserves the titlebar for MUI AppBar + Drawer', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const css = document.getElementById('nunba-titlebar-offsets')?.textContent || '';
    expect(css).toContain('.MuiAppBar-positionFixed');
    expect(css).toContain('.MuiDrawer-paperAnchorLeft');
    // must offset by the titlebar-height var, not a hardcoded pixel value
    expect(css).toMatch(/\.MuiAppBar-positionFixed\s*\{[^}]*top:\s*var\(--nunba-titlebar-h/);
  });

  // Drift-guard (2026-08-08): the root element's overflow PROPAGATES TO THE
  // VIEWPORT (CSS Overflow §3.3), so `overflow:hidden` on
  // html.nunba-frameless-active did not just clip <html> — it disabled
  // document scrolling for the entire app.  /admin/task-ledger and
  // /admin/models have no inner scroller of their own, so they became
  // unreachable past the fold INSIDE Nunba while still scrolling fine in a
  // browser (where this class is never applied).  That asymmetry is exactly
  // what makes it easy to reintroduce, hence a mechanical guard.
  test('frameless html rule never disables the viewport scroller', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const css = document.getElementById('nunba-titlebar-offsets')?.textContent || '';

    const rawRule = css.match(
      /html\.nunba-frameless-active\s*\{([^}]*)\}/)?.[1] || '';
    expect(rawRule).not.toBe('');

    // Strip CSS comments FIRST.  The rule carries a long explanation that
    // necessarily quotes the very declaration being banned, and a guard that
    // reads prose instead of declarations fails on its own documentation
    // (measured: this test went red against the CORRECT css).  Assert on what
    // the browser actually applies.
    const decls = rawRule.replace(/\/\*[\s\S]*?\*\//g, '');

    // The exact regression: a blanket `overflow: hidden` on the root, which
    // propagates to the viewport and kills document scrolling everywhere.
    // (`overflow-x: hidden` does NOT match — "overflow" is followed by "-".)
    expect(decls).not.toMatch(/overflow\s*:\s*hidden/);
    expect(decls).not.toMatch(/overflow-y\s*:\s*hidden/);
    // ...and the document must still be able to scroll vertically.
    expect(decls).toMatch(/overflow-y\s*:\s*(auto|scroll)/);
  });

  test('frameless mode still reserves the strip and clamps h-screen shells', () => {
    // ZERO-REGRESSION PIN for what the overflow:hidden was there to solve:
    // the 32px must still be reserved at document level, and full-height
    // shells still clamped, or the chat input drops below the visible edge.
    mockPywebview();
    render(<NunbaTitleBar />);
    const raw = document.getElementById('nunba-titlebar-offsets')?.textContent || '';
    // Same reason as above: comments sit BETWEEN the selector and the
    // declaration here, so any proximity match must run on stripped CSS.
    const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(
      /html\.nunba-frameless-active\s*\{[^}]*padding-top:\s*var\(--nunba-titlebar-h/);
    expect(css).toMatch(
      /\.h-screen[\s\S]{0,120}calc\(100vh\s*-\s*var\(--nunba-titlebar-h/);
  });

  // Document scrolling is enabled for every route EXCEPT the ones that own
  // the viewport.  /local (Demopage) and /agents are full-height surfaces
  // with their own internal scrollers; a document scrollbar there would let
  // the whole shell drift under the titlebar.
  test.each(FIXED_VIEWPORT_ROUTES)(
    '%s keeps the viewport fixed (no document scroller)', (route) => {
      mockPathname = route;
      mockPywebview();
      render(<NunbaTitleBar />);
      expect(document.documentElement.classList
        .contains('nunba-fixed-viewport')).toBe(true);
    });

  test.each([
    '/admin/task-ledger', '/admin/models', '/admin/channels',
    '/social', '/settings', '/',
  ])(
    '%s scrolls the document (no fixed-viewport modifier)', (route) => {
      mockPathname = route;
      mockPywebview();
      render(<NunbaTitleBar />);
      expect(document.documentElement.classList
        .contains('nunba-fixed-viewport')).toBe(false);
    });

  test('the fixed-viewport override actually re-hides overflow', () => {
    // The modifier is only meaningful if the CSS consumes it, and only wins
    // if it is MORE specific than the base rule.  Both are asserted here so
    // the class cannot become decorative.
    mockPywebview();
    render(<NunbaTitleBar />);
    const css = (document.getElementById('nunba-titlebar-offsets')?.textContent || '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const override = css.match(
      /html\.nunba-frameless-active\.nunba-fixed-viewport\s*\{([^}]*)\}/)?.[1];
    expect(override).toBeDefined();
    expect(override).toMatch(/overflow\s*:\s*hidden/);
    // base rule must still come FIRST, so the more specific override wins
    expect(css.indexOf('html.nunba-frameless-active {'))
      .toBeLessThan(css.indexOf('html.nunba-frameless-active.nunba-fixed-viewport'));
  });

  test('browser mode adds neither class', () => {
    mockPathname = '/local';
    clearPywebview();
    render(<NunbaTitleBar />);
    expect(document.documentElement.classList
      .contains('nunba-frameless-active')).toBe(false);
    expect(document.documentElement.classList
      .contains('nunba-fixed-viewport')).toBe(false);
  });

  test('renders all 3 window control buttons', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    expect(screen.getByTestId('nunba-window-min')).toBeInTheDocument();
    expect(screen.getByTestId('nunba-window-max')).toBeInTheDocument();
    expect(screen.getByTestId('nunba-window-close')).toBeInTheDocument();
  });
});

describe('isFixedViewportRoute', () => {
  test.each([
    ['/local', true],                // Demopage — fixed height
    ['/agents', true],               // Agents page — fixed height
    ['/local/anything', true],       // nested demopage state
    ['/agents/some-agent', true],
    ['/admin/task-ledger', false],
    ['/admin/models', false],
    ['/localhost-ish', false],       // prefix must not match by substring
    ['/agentsomething', false],
    ['/', false],
    ['', false],
    [undefined, false],
  ])('%s -> %s', (path, expected) => {
    expect(isFixedViewportRoute(path)).toBe(expected);
  });
});

// ── Click handlers route to pywebview.api ─────────────────────────────

describe('Window-control click handlers', () => {
  test('minimize button calls window.pywebview.api.window_minimize', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.click(screen.getByTestId('nunba-window-min'));
    expect(window.pywebview.api.window_minimize).toHaveBeenCalledTimes(1);
  });

  test('maximize button calls window_toggle_maximize', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.click(screen.getByTestId('nunba-window-max'));
    expect(window.pywebview.api.window_toggle_maximize).toHaveBeenCalledTimes(1);
  });

  test('close button calls window_close', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.click(screen.getByTestId('nunba-window-close'));
    expect(window.pywebview.api.window_close).toHaveBeenCalledTimes(1);
  });

  test('double-click drag region toggles maximize', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.doubleClick(screen.getByTestId('nunba-titlebar'));
    expect(window.pywebview.api.window_toggle_maximize).toHaveBeenCalled();
  });

  test('double-click on window buttons does NOT toggle maximize (it stops at button)', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.doubleClick(screen.getByTestId('nunba-window-min'));
    // Minimize button's onClick fires (one click), but the parent's onDoubleClick
    // should NOT toggle maximize.
    expect(window.pywebview.api.window_toggle_maximize).not.toHaveBeenCalled();
  });

  test('mousedown on drag region calls window_start_drag', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.mouseDown(screen.getByTestId('nunba-titlebar'));
    expect(window.pywebview.api.window_start_drag).toHaveBeenCalled();
  });

  test('mousedown on window buttons does NOT call start_drag', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    fireEvent.mouseDown(screen.getByTestId('nunba-window-close'));
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });
});

// ── Right-slot (intelligence chip) drag-vs-click ──────────────────────
//
// The chip is portaled into nunba-titlebar-rightslot.  On the chip's pixels
// the parent titlebar drag handler must NOT auto-start a drag (it would eat
// the click), and the slot's own handler must only START a native move when
// the pointer actually moves past the threshold — a plain click falls through
// to the chip button so the preference toggles.

describe('Right-slot drag-vs-click', () => {
  test('plain mousedown on the slot (no movement) does NOT start a drag', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const slot = screen.getByTestId('nunba-titlebar-rightslot');
    fireEvent.mouseDown(slot, { button: 0, clientX: 100, clientY: 10 });
    // No mousemove yet → no native drag kicked.
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
    fireEvent.mouseUp(document, { clientX: 100, clientY: 10 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('parent titlebar drag handler ignores the slot (chip click stays live)', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    // A bare mousedown on the slot must not trigger the parent's
    // handleDragMouseDown (which would call window_start_drag immediately and
    // swallow the chip click).
    const slot = screen.getByTestId('nunba-titlebar-rightslot');
    fireEvent.mouseDown(slot, { button: 0, clientX: 120, clientY: 8 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('dragging past the threshold starts a native window move', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const slot = screen.getByTestId('nunba-titlebar-rightslot');
    fireEvent.mouseDown(slot, { button: 0, clientX: 100, clientY: 10 });
    // Move well past DRAG_THRESHOLD_PX (5) — document-level listener fires.
    fireEvent.mouseMove(document, { clientX: 140, clientY: 12 });
    expect(window.pywebview.api.window_start_drag).toHaveBeenCalledTimes(1);
    fireEvent.mouseUp(document, { clientX: 140, clientY: 12 });
  });

  test('a tiny jiggle under the threshold does NOT start a drag', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const slot = screen.getByTestId('nunba-titlebar-rightslot');
    fireEvent.mouseDown(slot, { button: 0, clientX: 100, clientY: 10 });
    // |dx|+|dy| = 2+1 = 3 < 5 → still a click, no drag.
    fireEvent.mouseMove(document, { clientX: 102, clientY: 11 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
    fireEvent.mouseUp(document, { clientX: 102, clientY: 11 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('right-button mousedown on the slot is ignored', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const slot = screen.getByTestId('nunba-titlebar-rightslot');
    fireEvent.mouseDown(slot, { button: 2, clientX: 100, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 140, clientY: 12 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });
});

// ── Resize grips (frameless Win + Linux) ─────────────────────────────

describe('Frameless resize grips', () => {
  test('renders 8 resize grips on Windows too (WebView2 eats the native hit-test edge)', () => {
    // The hosted WebView fills the client to the edge, so the OS resize
    // border is unreachable — the grips drive resize via window_begin_resize
    // on Windows as well as Linux.
    mockPywebview();
    setPlatform('Win32');
    render(<NunbaTitleBar />);
    expect(screen.getByTestId('nunba-resize-grips')).toBeInTheDocument();
    ['top', 'bottom', 'left', 'right',
     'top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((edge) => {
      expect(screen.getByTestId(`nunba-resize-${edge}`)).toBeInTheDocument();
    });
  });

  test('renders 8 resize grips on Linux+pywebview', () => {
    mockPywebview();
    setPlatform('Linux x86_64');
    render(<NunbaTitleBar />);
    expect(screen.getByTestId('nunba-resize-grips')).toBeInTheDocument();
    ['top', 'bottom', 'left', 'right',
     'top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((edge) => {
      expect(screen.getByTestId(`nunba-resize-${edge}`)).toBeInTheDocument();
    });
  });

  test('grip mousedown (left button) calls window_begin_resize with the edge', () => {
    const beginResize = jest.fn();
    mockPywebview({ window_begin_resize: beginResize });
    setPlatform('Linux x86_64');
    render(<NunbaTitleBar />);
    fireEvent.mouseDown(screen.getByTestId('nunba-resize-bottom-right'), { button: 0 });
    expect(beginResize).toHaveBeenCalledWith('bottom-right');
  });

  test('grip mousedown with non-left button is ignored', () => {
    const beginResize = jest.fn();
    mockPywebview({ window_begin_resize: beginResize });
    setPlatform('Linux x86_64');
    render(<NunbaTitleBar />);
    fireEvent.mouseDown(screen.getByTestId('nunba-resize-left'), { button: 2 });
    expect(beginResize).not.toHaveBeenCalled();
  });
});

// ── Liquid UI shell drift-guard ──────────────────────────────────────

describe('Liquid UI shell parity', () => {
  test('titlebar is sticky at top with high z-index (over AgentOverlay)', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const tb = screen.getByTestId('nunba-titlebar');
    const style = tb.getAttribute('style') || '';
    // Style includes fixed positioning + zIndex >= 10000 so AgentOverlay
    // notifications (which use lower z-index in their default render)
    // don't visually punch through the chrome.
    expect(style).toMatch(/position:\s*fixed/i);
    expect(style).toMatch(/z-index:\s*10000/i);
  });

  test('titlebar height is 32px (matches App.js padding-top compensator)', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    const tb = screen.getByTestId('nunba-titlebar');
    const style = tb.getAttribute('style') || '';
    expect(style).toMatch(/height:\s*32px/i);
  });

  test('graceful degrade if pywebview.api method is missing', () => {
    mockPywebview({});
    delete window.pywebview.api.window_minimize;
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NunbaTitleBar />);
    fireEvent.click(screen.getByTestId('nunba-window-min'));
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('window_minimize'),
    );
    consoleWarn.mockRestore();
  });
});
