/* eslint-disable */
// Owner 2026-09-23: "in portrait mode I shd be able to drag the whole body
// from wherever I click unless that component has individual draggability
// attribute agnostic of the platform".
//
// Contract pinned here:
//   * portrait (the single-column layout, width < 768 CSS px) + pywebview:
//     press anywhere on the body and move past the threshold -> the window
//     moves (window_start_drag, the one platform-neutral bridge call);
//   * a component that owns the pointer keeps it: form controls, links,
//     buttons, [draggable="true"], [data-no-window-drag], canvas/media;
//   * landscape, browser mode, a plain click, a right press, or a press a
//     component already handled (defaultPrevented) never move the window;
//   * the click that ends a drag is swallowed, so dropping the window on a
//     message does not also "click" it.
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockPathname = '/local';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ pathname: mockPathname }),
}));

import NunbaTitleBar from '../../../components/Shell/NunbaTitleBar';
import {
  isPortraitLayout,
  PORTRAIT_MAX_WIDTH_PX,
  ownsPointer,
  WINDOW_DRAG_OPT_OUT_ATTR,
} from '../../../components/Shell/windowDrag';

function mockPywebview() {
  window.pywebview = { api: { window_start_drag: jest.fn(), window_platform: jest.fn(() => 'win32') } };
}

function setWidth(w) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
}

function renderShell(body) {
  return render(<NunbaTitleBar><div data-testid="body">{body}</div></NunbaTitleBar>);
}

function pressAndMove(el, dx = 40, dy = 3) {
  fireEvent.mouseDown(el, { button: 0, clientX: 100, clientY: 200 });
  fireEvent.mouseMove(document, { clientX: 100 + dx, clientY: 200 + dy });
  fireEvent.mouseUp(document, { clientX: 100 + dx, clientY: 200 + dy });
}

beforeEach(() => {
  Object.defineProperty(window.navigator, 'platform', { configurable: true, value: 'Win32' });
  mockPywebview();
  setWidth(472); // the portrait dock: 709 physical px at 150% scaling
});

afterEach(() => {
  delete window.pywebview;
  setWidth(1024);
});

describe('portrait predicate', () => {
  test('portrait is the single-column layout, below the md breakpoint', () => {
    expect(PORTRAIT_MAX_WIDTH_PX).toBe(768);
    expect(isPortraitLayout({ innerWidth: 767 })).toBe(true);
    expect(isPortraitLayout({ innerWidth: 768 })).toBe(false);
    expect(isPortraitLayout({ innerWidth: 472 })).toBe(true);
  });
});

describe('body drag in portrait', () => {
  test('pressing plain body content and moving drags the window', () => {
    const { getByText } = renderShell(<p>Hello from the chat</p>);
    pressAndMove(getByText('Hello from the chat'));
    expect(window.pywebview.api.window_start_drag).toHaveBeenCalledTimes(1);
  });

  test('a plain click (no movement) does not drag', () => {
    const { getByText } = renderShell(<p>message</p>);
    fireEvent.mouseDown(getByText('message'), { button: 0, clientX: 100, clientY: 200 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: 200 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('a jiggle under the threshold does not drag', () => {
    const { getByText } = renderShell(<p>message</p>);
    pressAndMove(getByText('message'), 2, 1);
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test.each([
    ['button', <button type="button">Send</button>, 'Send'],
    ['input', <input aria-label="field" defaultValue="typed" />, null],
    ['textarea', <textarea aria-label="composer" defaultValue="draft" />, null],
    ['link', <a href="/x">a link</a>, 'a link'],
    ['draggable element', <div draggable="true">drag me</div>, 'drag me'],
    ['explicit opt-out', <div {...{ [WINDOW_DRAG_OPT_OUT_ATTR]: '' }}><span>game board</span></div>, 'game board'],
    ['role=slider', <div role="slider" aria-valuenow={3}>volume</div>, 'volume'],
  ])('a %s keeps the pointer (no window drag)', (_name, node, text) => {
    const utils = renderShell(node);
    const el = text ? utils.getByText(text)
      : utils.container.querySelector('input, textarea');
    pressAndMove(el);
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('a press a component already handled (defaultPrevented) does not drag', () => {
    const { getByText } = renderShell(
      <div onMouseDown={(e) => e.preventDefault()}>custom widget</div>);
    pressAndMove(getByText('custom widget'));
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('right-button press does not drag', () => {
    const { getByText } = renderShell(<p>message</p>);
    fireEvent.mouseDown(getByText('message'), { button: 2, clientX: 100, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 160, clientY: 200 });
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('the click that ends a drag is swallowed', () => {
    const onClick = jest.fn();
    const { getByText } = renderShell(<p onClick={onClick}>message</p>);
    const el = getByText('message');
    pressAndMove(el);
    fireEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('body drag is portrait-only and desktop-only', () => {
  test('landscape does not drag from the body', () => {
    setWidth(1200);
    const { getByText } = renderShell(<p>message</p>);
    pressAndMove(getByText('message'));
    expect(window.pywebview.api.window_start_drag).not.toHaveBeenCalled();
  });

  test('browser mode (no pywebview) never drags', () => {
    delete window.pywebview;
    const { getByText } = renderShell(<p>message</p>);
    pressAndMove(getByText('message'));
    // nothing to assert against but the absence of a throw; the bridge is gone
    expect(window.pywebview).toBeUndefined();
  });
});

describe('ownsPointer', () => {
  test('plain text does not own the pointer; a button does', () => {
    document.body.innerHTML = '<p id="p">t</p><button id="b"><span id="s">x</span></button>';
    expect(ownsPointer(document.getElementById('p'))).toBe(false);
    expect(ownsPointer(document.getElementById('s'))).toBe(true);
  });
});
