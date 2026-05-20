/**
 * #208 — STALE_CEILING_SEC contract: thinking spinner can't run forever.
 *
 * Live evidence (2026-05-20): user reported 83-minute stuck spinner
 * because the SSE thinking_trace channel stopped emitting completion
 * events.  The fix added a 180s force-complete fallback.  This test
 * pins the contract on the pure helper (extracted for testability).
 */

const {
  STALE_CEILING_SEC,
  computeIsReallyCompleted,
} = require('../../../pages/chat/ThinkingProcessContainer');

describe('#208 ThinkingProcessContainer completion logic', () => {
  test('STALE_CEILING_SEC is 180', () => {
    expect(STALE_CEILING_SEC).toBe(180);
  });

  test('isContainerCompleted=true → completed immediately', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: true,
      thinkingMessages: [],
      liveTime: 0,
    })).toBe(true);
  });

  test('all steps completed → completed', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 1, isCompleted: true},
        {id: 2, isCompleted: true},
      ],
      liveTime: 10,
    })).toBe(true);
  });

  test('one step incomplete + under ceiling → still thinking', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 1, isCompleted: true},
        {id: 2, isCompleted: false},
      ],
      liveTime: 30,
    })).toBe(false);
  });

  test('exactly at ceiling boundary → still thinking (strict >)', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [{id: 1, isCompleted: false}],
      liveTime: STALE_CEILING_SEC,
    })).toBe(false);
  });

  test('past ceiling → force-completed even with incomplete steps', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [{id: 1, isCompleted: false}],
      liveTime: STALE_CEILING_SEC + 1,
    })).toBe(true);
  });

  test('the 83-minute case: liveTime way past ceiling → completed', () => {
    // User's reported case from frozen_debug.log: 83 minutes = 4980s.
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [{id: 1, isCompleted: false}],
      liveTime: 4980,
    })).toBe(true);
  });

  test('empty thinkingMessages + under ceiling → not completed', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [],
      liveTime: 5,
    })).toBe(false);
  });

  test('liveTime undefined → not completed (no force trigger)', () => {
    expect(computeIsReallyCompleted({
      isContainerCompleted: false,
      thinkingMessages: [{id: 1, isCompleted: false}],
      liveTime: undefined,
    })).toBe(false);
  });
});
