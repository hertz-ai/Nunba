/**
 * TypeWriterSubtitle's clock-driven fallback (no audio position): the shown
 * length follows elapsed time, so a late tick catches up instead of stretching
 * the subtitle past its audio. Same defect class as components/HART/TypedText.
 */
import TypeWriterForSubtitle from '../../pages/chat/TypeWriterSubtitle';

import { act, render } from '@testing-library/react';
import React from 'react';

const TEXT = 'x'.repeat(100);

describe('TypeWriterSubtitle, clock mode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-12T00:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('follows the clock and catches up after a stall; completes once', () => {
    const done = jest.fn();
    // The streamed path: the message list mounts it with the empty
    // placeholder first, then the reply's text arrives.
    const { container, rerender } = render(
      <TypeWriterForSubtitle text="" duration={2} isIdle={false} onComplete={done} />,
    );
    rerender(<TypeWriterForSubtitle text={TEXT} duration={2} isIdle={false} onComplete={done} />);
    expect(container.textContent).toBe('');

    act(() => { jest.advanceTimersByTime(1000); });
    const half = container.textContent.length;
    expect(half).toBeGreaterThanOrEqual(45);
    expect(half).toBeLessThanOrEqual(55);

    // Stall: 900 ms pass with no tick, then one tick lands.
    act(() => {
      jest.setSystemTime(Date.now() + 900);
      jest.advanceTimersByTime(50);
    });
    expect(container.textContent.length).toBeGreaterThanOrEqual(95);

    act(() => { jest.advanceTimersByTime(500); });
    expect(container.textContent).toBe(TEXT);
    expect(done).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('idle video shows the whole subtitle at once', () => {
    const { container } = render(
      <TypeWriterForSubtitle text={TEXT} duration={2} isIdle />,
    );
    expect(container.textContent).toBe(TEXT);
  });

  // A reply another device's turn pushed to this page (SSE chat.response,
  // Demopage handleDataReceived) is appended WITH its text, so the message
  // list mounts the typewriter with the line itself, no empty placeholder
  // first.  Live 2026-11-23 on the desktop page: the tablet's "Super Arjun!"
  // bubble stayed empty until the next message arrived.
  test('a line it mounts with types to the end', () => {
    const { container } = render(
      <TypeWriterForSubtitle text={TEXT} duration={2} isIdle={false} />,
    );
    act(() => { jest.advanceTimersByTime(1000); });
    expect(container.textContent.length).toBeGreaterThanOrEqual(45);
    act(() => { jest.advanceTimersByTime(1500); });
    expect(container.textContent).toBe(TEXT);
  });

  // Demopage refines the duration while the line types (its word estimate,
  // then the clip's real length).  A change under 10% re-ran the effect,
  // whose cleanup stopped the clock, and nothing restarted it.
  test('a small duration change mid-line does not freeze the line', () => {
    const { container, rerender } = render(
      <TypeWriterForSubtitle text="" duration={2} isIdle={false} />,
    );
    rerender(<TypeWriterForSubtitle text={TEXT} duration={2} isIdle={false} />);
    act(() => { jest.advanceTimersByTime(500); });
    const before = container.textContent.length;
    expect(before).toBeGreaterThan(0);
    rerender(<TypeWriterForSubtitle text={TEXT} duration={2.1} isIdle={false} />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(container.textContent).toBe(TEXT);
  });

  // The idle video shows the whole line; when the reply's video starts the
  // line types.  It went blank: the re-run took neither start branch.
  test('the line types when the idle video gives way, it does not go blank', () => {
    const { container, rerender } = render(
      <TypeWriterForSubtitle text={TEXT} duration={2} isIdle />,
    );
    expect(container.textContent).toBe(TEXT);
    rerender(<TypeWriterForSubtitle text={TEXT} duration={2} isIdle={false} />);
    act(() => { jest.advanceTimersByTime(2500); });
    expect(container.textContent).toBe(TEXT);
  });
});
