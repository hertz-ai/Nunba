/**
 * useMainPagePresence: the main page reports whether the owner is looking at
 * it, from its own focus and visibility, so the desktop host can hide the
 * floating companion over Nunba and show it elsewhere.
 *
 * Owner, 2026-11-10: events, not a 0.35 s poll of the operating system's
 * foreground window; the answer comes from our own page, on every OS.
 *
 * The real hook; only its inputs are replaced: the main window's js_api
 * (window.pywebview.api), document.hasFocus and document.visibilityState.
 */
import {act, renderHook} from '@testing-library/react';

import useMainPagePresence, {mainPageInFront} from '../../hooks/useMainPagePresence';

let focused;
let visibility;
let calls;

function installApi(api) {
  window.pywebview = {api};
}

beforeEach(() => {
  jest.useFakeTimers();
  focused = true;
  visibility = 'visible';
  calls = [];
  jest.spyOn(document, 'hasFocus').mockImplementation(() => focused);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  installApi({main_page_presence: jest.fn((v) => { calls.push(v); return Promise.resolve(true); })});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete window.pywebview;
  delete document.visibilityState;
});

function settle() {
  act(() => { jest.runOnlyPendingTimers(); });
}

test('in front means visible and focused', () => {
  expect(mainPageInFront({visibilityState: 'visible', hasFocus: () => true})).toBe(true);
  expect(mainPageInFront({visibilityState: 'visible', hasFocus: () => false})).toBe(false);
  expect(mainPageInFront({visibilityState: 'hidden', hasFocus: () => true})).toBe(false);
});

test('the page reports itself once on mount', () => {
  renderHook(() => useMainPagePresence());
  settle();
  expect(calls).toEqual([true]);
});

test('blur and focus report the change, and only the change', () => {
  renderHook(() => useMainPagePresence());
  settle();
  focused = false;
  act(() => { window.dispatchEvent(new Event('blur')); });
  settle();
  act(() => { window.dispatchEvent(new Event('blur')); });
  settle();
  focused = true;
  act(() => { window.dispatchEvent(new Event('focus')); });
  settle();
  expect(calls).toEqual([true, false, true]);
});

test('a hidden page is not in front even with focus', () => {
  renderHook(() => useMainPagePresence());
  settle();
  visibility = 'hidden';
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  settle();
  expect(calls).toEqual([true, false]);
});

test('focus moving into an iframe is not leaving the page', () => {
  // blur fires on this window while the document still has focus: the state
  // is read after the event settles, not taken from the event's name.
  // At the moment blur fires the document has no focus yet; a tick later the
  // iframe holds it and the document has focus again.  Reading at the event
  // would report "not in front" and flash the floating window over Nunba.
  renderHook(() => useMainPagePresence());
  settle();
  focused = false;
  act(() => { window.dispatchEvent(new Event('blur')); });
  focused = true;
  settle();
  expect(calls).toEqual([true]);
});

test('the api arriving late is reported at pywebviewready', () => {
  delete window.pywebview;
  renderHook(() => useMainPagePresence());
  settle();
  expect(calls).toEqual([]);
  installApi({main_page_presence: (v) => { calls.push(v); return Promise.resolve(true); }});
  act(() => { window.dispatchEvent(new Event('pywebviewready')); });
  settle();
  expect(calls).toEqual([true]);
});

test('the floating window and a browser report nothing', () => {
  installApi({on_companion_presence: jest.fn()});   // the companion's js_api
  renderHook(() => useMainPagePresence());
  settle();
  focused = false;
  act(() => { window.dispatchEvent(new Event('blur')); });
  settle();
  expect(calls).toEqual([]);
  expect(window.pywebview.api.on_companion_presence).not.toHaveBeenCalled();
});

test('a report that was not delivered is sent again on the next event', async () => {
  let fail = true;
  installApi({main_page_presence: (v) => {
    calls.push(v);
    return fail ? Promise.reject(new Error('bridge not ready')) : Promise.resolve(true);
  }});
  renderHook(() => useMainPagePresence());
  settle();
  await act(async () => { await Promise.resolve(); });
  fail = false;
  act(() => { window.dispatchEvent(new Event('focus')); });
  settle();
  expect(calls).toEqual([true, true]);
});

test('unmount stops listening', () => {
  const {unmount} = renderHook(() => useMainPagePresence());
  settle();
  unmount();
  focused = false;
  act(() => { window.dispatchEvent(new Event('blur')); });
  settle();
  expect(calls).toEqual([true]);
});
