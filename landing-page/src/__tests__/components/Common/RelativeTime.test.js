/**
 * #223 — RelativeTime self-tick contract.
 *
 * Pure formatter cases use formatRelative(ts, nowMs) to stay
 * deterministic without faking timers.  Component cases use jest fake
 * timers to assert the internal setInterval fires AND React re-renders
 * the span.
 */
import React from 'react';
import {render, act} from '@testing-library/react';

import RelativeTime, {
  formatRelative,
  TICK_INTERVAL_MS,
} from '../../../components/Common/RelativeTime';


describe('#223 formatRelative — pure formatter', () => {
  const T0 = Date.parse('2026-05-20T10:00:00Z');

  test('"just now" when diff < 1 minute', () => {
    expect(formatRelative(T0, T0 + 30_000)).toBe('just now');
    expect(formatRelative(T0, T0 + 59_999)).toBe('just now');
  });

  test('"Nm ago" when 1 <= diff < 60 minutes', () => {
    expect(formatRelative(T0, T0 + 60_000)).toBe('1m ago');
    expect(formatRelative(T0, T0 + 5 * 60_000)).toBe('5m ago');
    expect(formatRelative(T0, T0 + 59 * 60_000)).toBe('59m ago');
  });

  test('"Nh ago" when 1 <= diff < 24 hours', () => {
    expect(formatRelative(T0, T0 + 60 * 60_000)).toBe('1h ago');
    expect(formatRelative(T0, T0 + 5 * 60 * 60_000)).toBe('5h ago');
    expect(formatRelative(T0, T0 + 23 * 60 * 60_000)).toBe('23h ago');
  });

  test('absolute date when diff >= 24 hours', () => {
    const out = formatRelative(T0, T0 + 25 * 60 * 60_000);
    expect(out).not.toBe('just now');
    expect(out).not.toMatch(/^\d+(m|h) ago$/);
    expect(out.length).toBeGreaterThan(0);
  });

  test('empty string for falsy ts', () => {
    expect(formatRelative(null)).toBe('');
    expect(formatRelative(undefined)).toBe('');
    expect(formatRelative('')).toBe('');
  });

  test('empty string for unparseable ts', () => {
    expect(formatRelative('not-a-date')).toBe('');
  });

  test('accepts ISO string + epoch ms equivalently', () => {
    const iso = '2026-05-20T10:00:00Z';
    const ms = Date.parse(iso);
    expect(formatRelative(iso, ms + 60_000)).toBe('1m ago');
    expect(formatRelative(ms, ms + 60_000)).toBe('1m ago');
  });
});


describe('#223 RelativeTime component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders null when ts is missing', () => {
    const {container} = render(<RelativeTime ts={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders the initial label', () => {
    const ts = Date.now() - 5 * 60_000;
    const {container} = render(<RelativeTime ts={ts} />);
    expect(container.textContent).toBe('5m ago');
  });

  test('forwards className + style + extra props', () => {
    const ts = Date.now();
    const {container} = render(
      <RelativeTime
        ts={ts}
        className="text-xs"
        style={{color: 'red'}}
        data-testid="rt"
      />,
    );
    const span = container.querySelector('span');
    expect(span.className).toBe('text-xs');
    expect(span.style.color).toBe('red');
    expect(span.getAttribute('data-testid')).toBe('rt');
  });

  test('label advances when interval fires (just now → 1m ago)', () => {
    const realNow = Date.now;
    const start = realNow();
    let frozenNow = start;
    // Freeze Date.now so the first render sees 0 diff
    Date.now = () => frozenNow;
    try {
      const {container} = render(<RelativeTime ts={start} />);
      expect(container.textContent).toBe('just now');
      // advance wall clock 70s + fire the 30s tick interval
      frozenNow = start + 70_000;
      act(() => {
        jest.advanceTimersByTime(TICK_INTERVAL_MS * 3);
      });
      expect(container.textContent).toBe('1m ago');
    } finally {
      Date.now = realNow;
    }
  });

  test('cleans up interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const {unmount} = render(<RelativeTime ts={Date.now()} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  test('TICK_INTERVAL_MS is 30s (semantic contract)', () => {
    expect(TICK_INTERVAL_MS).toBe(30_000);
  });
});
