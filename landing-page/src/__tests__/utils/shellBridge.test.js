/**
 * utils/shellBridge: the postMessage contract between Nunba and the HART OS
 * desktop shell that frames it. Drives the real module in jsdom: standalone
 * (parent === window) every call is a no-op; embedded, messages leave to the
 * page's own origin and only same-origin, prefixed messages come back in.
 */
import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  SHELL_MESSAGE_PREFIX, isEmbeddedInShell, onShellMessage, postToShell, useShellBridge,
} from '../../utils/shellBridge';

function withParent(parent, fn) {
  const desc = Object.getOwnPropertyDescriptor(window, 'parent');
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  try {
    return fn();
  } finally {
    if (desc) Object.defineProperty(window, 'parent', desc);
    else Object.defineProperty(window, 'parent', { configurable: true, value: window });
  }
}

function deliver(data, init) {
  window.dispatchEvent(new MessageEvent('message', {
    data, origin: window.location.origin, ...(init || {}),
  }));
}

describe('standalone Nunba (no parent window)', () => {
  test('is not embedded and posts nothing', () => {
    expect(isEmbeddedInShell()).toBe(false);
    expect(postToShell('nunba:ready', { route: '/local' })).toBe(false);
  });
});

describe('embedded in the HART OS shell', () => {
  test('posts prefixed messages to the parent at our own origin only', () => {
    const parent = { postMessage: jest.fn() };
    withParent(parent, () => {
      expect(isEmbeddedInShell()).toBe(true);
      expect(postToShell('nunba:turn', { state: 'start' })).toBe(true);
      expect(parent.postMessage).toHaveBeenCalledWith(
        { type: 'nunba:turn', state: 'start' }, window.location.origin,
      );
      // Not our namespace: never leaves.
      expect(postToShell('hart:action', { kind: 'x' })).toBe(false);
      expect(parent.postMessage).toHaveBeenCalledTimes(1);
    });
  });

  test('a parent that throws on postMessage is reported, not thrown', () => {
    const parent = { postMessage: () => { throw new Error('closed'); } };
    withParent(parent, () => {
      expect(postToShell('nunba:ready', {})).toBe(false);
    });
  });

  test('hands the handler same-origin prefixed messages and nothing else', () => {
    const seen = [];
    const off = onShellMessage((msg) => seen.push(msg));

    deliver({ type: 'nunba:compose', text: 'hello', send: true });
    deliver({ type: 'hart:action', kind: 'cart.add' });        // another protocol
    deliver('nunba:compose');                                  // not an object
    deliver({ type: 'nunba:compose', text: 'evil' }, { origin: 'https://attacker.example' });

    expect(seen).toEqual([{ type: 'nunba:compose', text: 'hello', send: true }]);
    expect(seen[0].type.indexOf(SHELL_MESSAGE_PREFIX)).toBe(0);

    off();
    deliver({ type: 'nunba:compose', text: 'after unsubscribe' });
    expect(seen).toHaveLength(1);
  });

  test('a message from a window that is not the parent is ignored', () => {
    const seen = [];
    const off = onShellMessage((msg) => seen.push(msg));
    // The listener accepts a null source (jsdom, some embedders deliver none)
    // and rejects a non-parent one. A sibling frame's window is such a source.
    const sibling = document.createElement('iframe');
    document.body.appendChild(sibling);
    deliver({ type: 'nunba:compose', text: 'from a sibling' }, { source: sibling.contentWindow });
    expect(seen).toEqual([]);
    sibling.remove();
    off();
  });

  test('a non-function handler yields a harmless unsubscribe', () => {
    expect(typeof onShellMessage(null)).toBe('function');
    expect(() => onShellMessage(null)()).not.toThrow();
  });
});

/**
 * useShellBridge, as the chat page uses it: a composer held in real state, and
 * a send that reads the composer of the render it belongs to (Demopage assigns
 * handleSendRef.current = handleSend on every render).
 */
function useChatPage(initialText = '') {
  const [inputMessage, setInputMessage] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const sentRef = useRef([]);
  const handleSendRef = useRef(null);
  handleSendRef.current = () => { sentRef.current.push(inputMessage); };
  const textareaRef = useRef(null);
  useShellBridge({ setInputMessage, handleSendRef, textareaRef, loading });
  return { inputMessage, setInputMessage, setLoading, sent: sentRef.current };
}

describe('useShellBridge inside the shell', () => {
  let parent;
  let parentDesc;
  beforeEach(() => {
    parent = { postMessage: jest.fn() };
    parentDesc = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  });
  afterEach(() => {
    if (parentDesc) Object.defineProperty(window, 'parent', parentDesc);
    else Object.defineProperty(window, 'parent', { configurable: true, value: window });
  });
  const posted = () => parent.postMessage.mock.calls.map(([m]) => m);
  const compose = (text, send) => act(() => {
    deliver({ type: 'nunba:compose', text, send });
  });

  test('announces the page on mount and says nothing about a turn yet', () => {
    renderHook(() => useChatPage());
    expect(posted()).toEqual([{ type: 'nunba:ready', route: window.location.pathname }]);
  });

  test('a shell send of a new line sends that line once', () => {
    const { result } = renderHook(() => useChatPage());
    compose('open my recipes', true);
    expect(result.current.inputMessage).toBe('open my recipes');
    expect(result.current.sent).toEqual(['open my recipes']);
  });

  test('a shell send of the line the composer already holds is sent, not lost', () => {
    // The Ask menu pre-fills the composer; the person then sends the same
    // words from the command bar (review of Nunba 22b282cf, M1).
    const { result } = renderHook(() => useChatPage('open my recipes'));
    compose('open my recipes', true);
    expect(result.current.sent).toEqual(['open my recipes']);
  });

  test('the next keystroke after a shell send sends nothing', () => {
    const { result } = renderHook(() => useChatPage('open my recipes'));
    compose('open my recipes', true);
    act(() => result.current.setInputMessage('open my recipes '));
    act(() => result.current.setInputMessage('open my recipes t'));
    expect(result.current.sent).toEqual(['open my recipes']);
  });

  test('a compose that does not ask to send fills the composer and sends nothing', () => {
    const { result } = renderHook(() => useChatPage());
    compose('draft this', false);
    act(() => result.current.setInputMessage('draft this please'));
    expect(result.current.inputMessage).toBe('draft this please');
    expect(result.current.sent).toEqual([]);
  });

  test('the lamp hears start and done for a turn, and no done before one', () => {
    const { result } = renderHook(() => useChatPage());
    expect(posted().filter((m) => m.type === 'nunba:turn')).toEqual([]);
    act(() => result.current.setLoading(true));
    act(() => result.current.setLoading(false));
    expect(posted().filter((m) => m.type === 'nunba:turn')).toEqual([
      { type: 'nunba:turn', state: 'start' },
      { type: 'nunba:turn', state: 'done' },
    ]);
  });
});

describe('useShellBridge standalone', () => {
  test('hears no compose and posts nothing', () => {
    const { result } = renderHook(() => useChatPage('mine'));
    act(() => { deliver({ type: 'nunba:compose', text: 'from nowhere', send: true }); });
    act(() => result.current.setLoading(true));
    expect(result.current.inputMessage).toBe('mine');
    expect(result.current.sent).toEqual([]);
  });
});
