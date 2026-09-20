/**
 * useComputerActivity: the one reducer for the computer-use projection.
 *
 * Pins the contract both the companion orb and NunbaChat rely on:
 *   - liveRun is set while a run can still take guidance (it names the goal,
 *     and the run has not closed), INCLUDING between steps;
 *   - the run-level close (run_done: true) ends liveRun at once and clears
 *     the card after ACTIVITY_LINGER_MS;
 *   - a server without run_done (older HARTOS) still clears after a
 *     non-executing step, so a card can never stick.
 */
import {act, renderHook} from '@testing-library/react';

const handlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => {
      handlers[ev] = fn;
      return () => { delete handlers[ev]; };
    },
  },
}));

// eslint-disable-next-line import/first
import useComputerActivity, {ACTIVITY_LINGER_MS, isRunClosed, liveRunOf} from '../../hooks/useComputerActivity';

const step = (phase, extra = {}) => ({
  type: 'computer_use.update', task_id: 'computer_use_run1', prompt_id: '42',
  agent_id: 'goal-42', summary: 'Selecting a control', phase, run_done: false,
  ...extra,
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('guidance can reach the run between steps, and not once it closes', () => {
  const {result} = renderHook(() => useComputerActivity());
  expect(result.current.liveRun).toBeNull();

  act(() => handlers['computer_use.update'](step('executing')));
  expect(result.current.liveRun?.agent_id).toBe('goal-42');

  act(() => handlers['computer_use.update'](step('completed')));
  // The step finished; the run has not.  A message typed now still steers.
  expect(result.current.liveRun?.agent_id).toBe('goal-42');
  act(() => jest.advanceTimersByTime(ACTIVITY_LINGER_MS + 1));
  expect(result.current.activity).not.toBeNull();

  act(() => handlers['computer_use.update'](step('completed', {run_done: true})));
  expect(result.current.liveRun).toBeNull();          // at once
  expect(result.current.activity?.run_done).toBe(true); // outcome still readable
  act(() => jest.advanceTimersByTime(ACTIVITY_LINGER_MS + 1));
  expect(result.current.activity).toBeNull();
});

test('an event without a goal id never routes guidance', () => {
  const {result} = renderHook(() => useComputerActivity());
  act(() => handlers['computer_use.update'](step('executing', {agent_id: ''})));
  expect(result.current.activity?.summary).toBe('Selecting a control');
  expect(result.current.liveRun).toBeNull();
});

test('a server that never sends run_done still clears after a step outcome', () => {
  const {result} = renderHook(() => useComputerActivity());
  const legacy = step('completed');
  delete legacy.run_done;
  act(() => handlers['computer_use.update'](legacy));
  expect(isRunClosed(legacy)).toBe(true);
  expect(liveRunOf(legacy)).toBeNull();
  act(() => jest.advanceTimersByTime(ACTIVITY_LINGER_MS + 1));
  expect(result.current.activity).toBeNull();
});

test('events missing a task id or summary are ignored', () => {
  const {result} = renderHook(() => useComputerActivity());
  act(() => handlers['computer_use.update']({type: 'computer_use.update', phase: 'executing'}));
  expect(result.current.activity).toBeNull();
});
