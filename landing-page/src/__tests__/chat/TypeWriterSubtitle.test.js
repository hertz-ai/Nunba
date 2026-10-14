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
    // The component starts its clock when `text` CHANGES (the message list
    // mounts it with the empty placeholder first), so mount empty, then move
    // to the subtitle under test.
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
});
