/**
 * The run close must survive the page's own msg_id dedupe.
 *
 * Owner 2026-10-04: a Live Commentary card stayed on the floating window with
 * ": step failed" for hours.  HARTOS activity_stream built the close's msg_id
 * from the last step's sequence and the exit phase, so for an action_error
 * run the third failed step and the close carried the SAME msg_id
 * (computer-use:<task>:4:failed).  realtimeService._isDuplicate drops a
 * msg_id seen within 10 s, so the close -- the only message with
 * run_done:true -- never reached useComputerActivity, no linger timer
 * started, and 'failed' is a visible phase.
 *
 * These tests drive the REAL realtimeService (an SSE 'notification' frame,
 * as HARTOS on_notification sends it) into the REAL hook.  The first pins
 * the mechanism with the old id (the defect, as the page experiences it);
 * the second pins the contract with the id HARTOS sends now (a ':run_done'
 * suffix): the card clears.
 */
import {act, renderHook} from '@testing-library/react';

class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    this._listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener() {}
  close() {}
  _simulateOpen() { if (this.onopen) this.onopen({}); }
  _fire(name, payload) {
    (this._listeners[name] || []).forEach((fn) => fn({data: JSON.stringify(payload)}));
  }
}
FakeEventSource.instances = [];
global.EventSource = FakeEventSource;

// Required AFTER the fake EventSource exists and WITHOUT resetModules: the
// hook and the testing library must share one React instance.
const {default: realtimeService} = require('../../services/realtimeService');
const {default: useComputerActivity, ACTIVITY_LINGER_MS} =
  require('../../hooks/useComputerActivity');

function frame(task, msgId, phase, runDone) {
  // on_notification: {'user_id', 'msg_id', **payload}; the payload is
  // activity_stream._payload's safe client dict.
  return {
    user_id: 'owner-1', msg_id: msgId, type: 'computer_use.update',
    agent_id: 'goal-1', task_id: task, run_id: task.slice(-12), sequence: 4,
    action: 'shell', summary: 'Running a local step', caption: 'dir',
    phase, error: phase === 'failed' ? "'task' is not recognized" : '',
    run_done: runDone, disclosure_only: false,
  };
}

let es;
beforeAll(() => {
  realtimeService.setIdentity({userId: 'owner-1'});
  es = FakeEventSource.instances[0];
  es._simulateOpen();
});
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a close that reuses the last failed step msg_id is dropped: the card never clears (the defect)', () => {
  const task = 'computer_use_443f86f06cd9';
  const {result, unmount} = renderHook(() => useComputerActivity());
  act(() => es._fire('notification', frame(task, `computer-use:${task}:4:failed`, 'failed', false)));
  expect(result.current.activity?.phase).toBe('failed');
  // HARTOS before the fix: the SAME msg_id on the close.
  act(() => es._fire('notification', frame(task, `computer-use:${task}:4:failed`, 'failed', true)));
  act(() => jest.advanceTimersByTime(ACTIVITY_LINGER_MS * 10));
  expect(result.current.activity?.phase).toBe('failed');
  expect(result.current.activity?.run_done).toBe(false);
  unmount();
});

test('a close with its own msg_id reaches the hook and the card clears after the linger', () => {
  const task = 'computer_use_0b2c9f1d7a3e';
  const {result, unmount} = renderHook(() => useComputerActivity());
  act(() => es._fire('notification', frame(task, `computer-use:${task}:4:failed`, 'failed', false)));
  expect(result.current.activity?.phase).toBe('failed');
  // HARTOS now: ':run_done' makes the close its own transport message.
  act(() => es._fire('notification', frame(task, `computer-use:${task}:4:failed:run_done`, 'failed', true)));
  expect(result.current.activity?.run_done).toBe(true);
  expect(result.current.liveRun).toBeNull();
  act(() => jest.advanceTimersByTime(ACTIVITY_LINGER_MS + 1));
  expect(result.current.activity).toBeNull();
  unmount();
});
