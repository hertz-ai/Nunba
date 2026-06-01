/**
 * #204 / #220 — parseFlowAction contract:
 *  (a) reads task.context.action_id / context.flow when present (canonical
 *      values stamped by HARTOS agent_ledger create_ledger_from_actions)
 *  (b) falls back to description regex for legacy / daemon tasks
 *  (c) returns synthetic "—" bucket when no signal is recoverable.
 */

const {parseFlowAction} = require('../../../pages/admin/TaskLedgerPage');

describe('#204/#220 parseFlowAction', () => {
  // (a) context-driven (preferred)
  test('reads context.action_id + context.flow when both present', () => {
    expect(parseFlowAction({
      context: {action_id: 3, flow: 2, persona: 'analyst'},
      description: 'whatever',
    })).toEqual({flow: 'Flow 2', action: 'Action 3'});
  });

  test('context with action_id only → defaults flow to "Flow 1"', () => {
    expect(parseFlowAction({
      context: {action_id: 5},
      description: 'whatever',
    })).toEqual({flow: 'Flow 1', action: 'Action 5'});
  });

  test('context.context_json alias is also honored', () => {
    expect(parseFlowAction({
      context_json: {action_id: 7, flow: 4},
    })).toEqual({flow: 'Flow 4', action: 'Action 7'});
  });

  // (b) description regex fallback
  test('falls back to "Flow N / Action M" regex when context absent', () => {
    expect(parseFlowAction({
      description: 'Flow 3 / Action 4: do_thing',
    })).toEqual({flow: 'Flow 3', action: 'Action 4'});
  });

  test('falls back to "Execute Action N" pattern (recipe-driven)', () => {
    expect(parseFlowAction({
      description: 'Execute Action 2: lookup',
    })).toEqual({flow: 'Flow 1', action: 'Action 2'});
  });

  test('falls back to bare "Action N" pattern', () => {
    expect(parseFlowAction({
      description: 'Step text including Action 8 somewhere',
    })).toEqual({flow: 'Flow 1', action: 'Action 8'});
  });

  test('case-insensitive matching', () => {
    expect(parseFlowAction({
      description: 'execute action 11 lowercase',
    })).toEqual({flow: 'Flow 1', action: 'Action 11'});
  });

  // (c) synthetic fallback
  test('no signal → flow="—" action="—" (still groups under prompt)', () => {
    expect(parseFlowAction({
      description: 'daemon side-task with no recipe header',
    })).toEqual({flow: '—', action: '—'});
  });

  test('empty task object → synthetic bucket', () => {
    expect(parseFlowAction({})).toEqual({flow: '—', action: '—'});
  });

  test('title takes priority over description for regex', () => {
    expect(parseFlowAction({
      title: 'Action 9',
      description: 'Action 100 in description should lose to title',
    })).toEqual({flow: 'Flow 1', action: 'Action 9'});
  });

  // priority: context wins over description even when description has signal
  test('context wins over description even when description has signal', () => {
    expect(parseFlowAction({
      context: {action_id: 1, flow: 1},
      description: 'Flow 99 / Action 99: red herring',
    })).toEqual({flow: 'Flow 1', action: 'Action 1'});
  });

  // Phase 5 / 2026-05-27 — explicit recipe_* fields stamped by Phase 1
  // (agent_ledger/core.py Task.__init__) win over context AND description.
  test('Phase 1 recipe_flow_id + recipe_action_id win over context', () => {
    expect(parseFlowAction({
      recipe_flow_id: 2,
      recipe_action_id: 3,
      context: {action_id: 99, flow: 99},   // context red herring — ignored
      description: 'Flow 88 / Action 88: red herring',
    })).toEqual({flow: 'Flow 2', action: 'Action 3'});
  });

  test('Phase 1 recipe_flow_id alone defaults action to "—"', () => {
    expect(parseFlowAction({
      recipe_flow_id: 0,
    })).toEqual({flow: 'Flow 0', action: '—'});
  });

  test('Phase 1 recipe_action_id alone defaults flow to "Flow 1"', () => {
    expect(parseFlowAction({
      recipe_action_id: 5,
    })).toEqual({flow: 'Flow 1', action: 'Action 5'});
  });

  test('Phase 1 flow_id=0 (falsy but explicit) is still honoured', () => {
    // recipe_flow_id=0 is the most-common case (single-flow recipes);
    // the != null check in parseFlowAction must accept it.
    expect(parseFlowAction({
      recipe_flow_id: 0,
      recipe_action_id: 1,
    })).toEqual({flow: 'Flow 0', action: 'Action 1'});
  });
});
