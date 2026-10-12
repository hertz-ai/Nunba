/**
 * TypedText (the HART ceremony's letter-by-letter line) is clock-driven.
 *
 * THE DEFECT (HART OS node, generation 19, 2026-10-12): one character per
 * timer tick, one <span> per character with a 300 ms fade and a 20 ms stagger.
 * Under a busy main thread the ticks came late and each late tick still showed
 * exactly one more character, so the line crawled. These tests stall the clock
 * between ticks and expect the line to catch up, which the old renderer cannot.
 */
import TypedText, { COMPLETE_HOLD_MS, visibleCount } from '../../../components/HART/TypedText';

import { act, render } from '@testing-library/react';
import React from 'react';

const TEXT = 'Welcome home. Let us light your HART together tonight.'; // 55 chars

function shown(container) {
  return container.querySelector('[data-typed="visible"]').textContent;
}
function rest(container) {
  return container.querySelector('[data-typed="rest"]').textContent;
}

describe('visibleCount', () => {
  test('starts at one character, follows the clock, never passes the end', () => {
    expect(visibleCount(0, 35, 10)).toBe(1);
    expect(visibleCount(35 * 4, 35, 10)).toBe(5);
    expect(visibleCount(35 * 400, 35, 10)).toBe(10);
    expect(visibleCount(1000, 35, 0)).toBe(0);
    expect(visibleCount(100, 0, 10)).toBe(10);   // a zero delay is treated as 1 ms
  });
});

describe('TypedText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-12T00:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('the whole line is in the DOM from the first paint, the hidden part keeps the layout', () => {
    const { container } = render(<TypedText text={TEXT} delay={35} />);
    expect(shown(container)).toBe('');
    expect(rest(container)).toBe(TEXT);
    expect(container.querySelector('[data-typed="rest"]').getAttribute('aria-hidden')).toBe('true');
  });

  test('the visible length follows the clock, so a stalled tick catches up', () => {
    const { container } = render(<TypedText text={TEXT} delay={35} />);
    act(() => { jest.advanceTimersByTime(35 * 10); });
    const paced = shown(container).length;
    expect(paced).toBeGreaterThanOrEqual(10);
    expect(paced).toBeLessThanOrEqual(12);

    // A busy main thread: 700 ms pass with no timer firing, then ONE tick.
    act(() => {
      jest.setSystemTime(Date.now() + 700);
      jest.advanceTimersByTime(35);
    });
    expect(shown(container).length - paced).toBeGreaterThanOrEqual(20);
    expect(shown(container) + rest(container)).toBe(TEXT);
  });

  test('completes exactly once, holds briefly, then calls onComplete', () => {
    const done = jest.fn();
    const { container } = render(<TypedText text={TEXT} delay={35} onComplete={done} />);
    act(() => { jest.advanceTimersByTime(35 * TEXT.length + 35); });
    expect(shown(container)).toBe(TEXT);
    expect(rest(container)).toBe('');
    expect(container.querySelector('[data-typed-done="true"]')).not.toBeNull();
    expect(done).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(COMPLETE_HOLD_MS); });
    expect(done).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('a new line restarts from its first character', () => {
    const { container, rerender } = render(<TypedText text={TEXT} delay={35} />);
    act(() => { jest.advanceTimersByTime(35 * 20); });
    expect(shown(container).length).toBeGreaterThanOrEqual(20);
    rerender(<TypedText text="Your secret name is..." delay={60} />);
    expect(shown(container)).toBe('');
    act(() => { jest.advanceTimersByTime(60 * 5); });
    expect(shown(container).length).toBeGreaterThanOrEqual(5);
    expect(shown(container).length).toBeLessThanOrEqual(7);
  });

  test('renders nothing for an empty line', () => {
    const { container } = render(<TypedText text="" delay={35} />);
    expect(container.firstChild).toBeNull();
  });
});
