/* eslint-disable */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import NunbaTitleBar, { shouldRenderTitleBar, isPywebview } from '../../../components/Shell/NunbaTitleBar';

// ── Test helpers ─────────────────────────────────────────────────────

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

  test('renders all 3 window control buttons', () => {
    mockPywebview();
    render(<NunbaTitleBar />);
    expect(screen.getByTestId('nunba-window-min')).toBeInTheDocument();
    expect(screen.getByTestId('nunba-window-max')).toBeInTheDocument();
    expect(screen.getByTestId('nunba-window-close')).toBeInTheDocument();
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
