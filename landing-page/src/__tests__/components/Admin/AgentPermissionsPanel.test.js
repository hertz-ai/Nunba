/**
 * Admin > Agents > one agent > Permissions: the switch that turns a kept
 * consent off for that one agent.
 *
 * Owner, 2026-11-21: a consent an agent asked for once is kept for its whole
 * life unless the user turns it off in chat "or user consents off in nunba
 * admin for that agent".  No page had that switch: the consent list did not
 * say which agent a row was for.  HARTOS now does (agent_id, agent_name), Off
 * is the existing POST /consent/decline with agent_id, On is POST
 * /consent/reopen.
 *
 * Review of b0849302 (rv_59ff), fixed here:
 * - the page worked out on or off again in JavaScript (the allow-all step,
 *   the standing no, the tie) and disagreed with HARTOS for two answers
 *   given in one millisecond.  HARTOS now says it on each row (agent_state)
 *   and the page shows that; the rule's own tests are HARTOS's
 *   (tests/unit/test_consent_rows_say_which_agent.py).
 * - data access had a switch that changed nothing.  It has none.
 *
 * Owner, 2026-11-22: "Turn back on" takes back every agent's no for that
 * permission, and the switch says so before it is pressed.
 */
import {
  agentPermissions, statesAreSaid, AGENT_SWITCHABLE, BACK_ON_LABEL, COMPUTER_WIDE,
  COMPUTER_WIDE_NOTE, OFF_LABEL, OWN_GRANT_NOTE, REOPEN_NOTE,
} from '../../../constants/agentPermissions';

import {act, render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';

jest.mock('../../../services/socialApi', () => ({
  consentApi: {list: jest.fn(), decline: jest.fn(), reopen: jest.fn()},
  dashboardApi: {},
}));

const realtimeHandlers = {};
jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: jest.fn((topic, cb) => {
      realtimeHandlers[topic] = cb;
      return () => { delete realtimeHandlers[topic]; };
    }),
  },
}));

// eslint-disable-next-line import/order
import {AgentPermissionsPanel} from '../../../components/Admin/AgentOperationsDrawer';
// eslint-disable-next-line import/order
import {consentApi} from '../../../services/socialApi';

const AGENT = '88659566083';
const OTHER = '70264903070';

// Rows as GET /consent?agent_id=AGENT sends them: agent_state is HARTOS's
// word for where the agent stands.
const allowAll = (type, state = 'allowed', at = '2026-11-21T10:00:00') => ({
  id: `all-${type}-${at}`, consent_type: type, scope: '*', granted: true,
  granted_at: at, revoked_at: null, reopened_at: null, agent_id: null, agent_name: null,
  agent_state: state,
});
const agentNo = (type, agent, state = 'turned_off', at = '2026-11-21T11:00:00') => ({
  id: `no-${type}-${agent}`, consent_type: type, scope: '*', granted: false,
  granted_at: null, revoked_at: at, reopened_at: null, agent_id: agent,
  agent_name: 'Vijai', agent_state: state,
});
const only = (rows, type) => agentPermissions(rows, AGENT).filter((p) => p.consentType === type);

describe('agentPermissions: what one agent is allowed, as HARTOS says it', () => {
  it('allow-all covers the agent: on, and it can be switched', () => {
    const [p] = only([allowAll('computer_control')], 'computer_control');
    expect(p).toMatchObject({on: true, canSwitch: true, scope: '*', own: false});
    expect(p.label).toBe('May control this computer');
    expect(p.note).toBe('');
  });

  it("HARTOS says turned off on the agent's own row: off for this agent", () => {
    const rows = [allowAll('computer_control', 'turned_off'), agentNo('computer_control', AGENT)];
    const [p] = only(rows, 'computer_control');
    expect(p.on).toBe(false);
    expect(p.note).toBe(REOPEN_NOTE);
  });

  it("the agent's own row is read before the every-agent row", () => {
    // Asked about another agent, the every-agent row would say that agent's
    // state; this agent's own row always says its own.
    const rows = [allowAll('computer_control', 'allowed'), agentNo('computer_control', AGENT)];
    expect(only(rows, 'computer_control')[0].on).toBe(false);
  });

  it("another agent's no leaves this agent on", () => {
    const rows = [allowAll('computer_control'), agentNo('computer_control', OTHER)];
    expect(only(rows, 'computer_control')[0].on).toBe(true);
  });

  it('the page keeps no rule: the times on the rows change nothing', () => {
    // Measured drift (rv_59ff): a no 0.8 ms BEFORE the allow-all.  HARTOS
    // allows the agent; the old page compared millisecond dates, called it a
    // tie and showed "Off for this agent".
    const before = [
      allowAll('camera_capture', 'allowed', '2026-11-21T12:00:00.500900'),
      agentNo('camera_capture', AGENT, 'allowed', '2026-11-21T12:00:00.500100'),
    ];
    expect(only(before, 'camera_capture')[0].on).toBe(true);
    // And the other way round: whatever the dates look like, off is off.
    const after = [
      allowAll('camera_capture', 'turned_off', '2026-11-21T12:00:00'),
      agentNo('camera_capture', AGENT, 'turned_off', '2026-11-21T09:00:00'),
    ];
    expect(only(after, 'camera_capture')[0].on).toBe(false);
    // A no taken back: reopened_at is HARTOS's to read, not the page's.
    const reopened = {...agentNo('camera_capture', AGENT, 'turned_off'),
      reopened_at: '2026-11-21T11:30:00'};
    expect(only([allowAll('camera_capture', 'turned_off'), reopened], 'camera_capture')[0].on)
      .toBe(false);
  });

  it('the page holds no copy of the rule', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../../constants/agentPermissions.js'), 'utf8');
    const code = src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
    expect(code).not.toMatch(/Date\.parse|reopened_at|granted_at|noStands/);
    expect(code).toMatch(/agent_state/);
  });

  it('a row with no state from HARTOS is not shown as on or off', () => {
    const {agent_state: _dropped, ...bare} = allowAll('computer_control');
    expect(agentPermissions([bare], AGENT)).toEqual([]);
    expect(statesAreSaid([bare])).toBe(false);
    expect(statesAreSaid([allowAll('computer_control')])).toBe(true);
    expect(statesAreSaid([{...bare, agent_state: null}])).toBe(true);
    expect(statesAreSaid([])).toBe(true);
    expect(agentPermissions([{...bare, agent_state: null}], AGENT)).toEqual([]);
  });

  it('an allow-all that was ended lists nothing', () => {
    const ended = {...allowAll('computer_control', null), granted: false,
      revoked_at: '2026-11-21T10:30:00'};
    expect(agentPermissions([ended], AGENT)).toEqual([]);
    expect(agentPermissions([{...allowAll('computer_control'), scope: 'files'}], AGENT))
      .toEqual([]);
  });

  it('a no to an ask, with nothing ever given, lists nothing as before', () => {
    expect(agentPermissions([agentNo('computer_control', AGENT)], AGENT)).toEqual([]);
  });

  it('the copilot is shown and not switched: one switch for the computer', () => {
    const out = agentPermissions(COMPUTER_WIDE.map((type) => allowAll(type)), AGENT);
    expect(COMPUTER_WIDE).toEqual(['copilot_access']);
    expect(out.map((p) => p.consentType)).toEqual(COMPUTER_WIDE);
    out.forEach((p) => {
      expect(p.canSwitch).toBe(false);
      expect(p.note).toBe(COMPUTER_WIDE_NOTE);
    });
  });

  it('the camera and the screen are switched for one agent', () => {
    const rows = [allowAll('camera_capture', 'turned_off'), allowAll('screen_capture'),
      agentNo('camera_capture', AGENT)];
    const out = agentPermissions(rows, AGENT);
    expect(out.map((p) => [p.consentType, p.on, p.canSwitch])).toEqual([
      ['camera_capture', false, true], ['screen_capture', true, true]]);
    expect(out[0].label).toBe('May see through your camera');
  });

  it('data access has no switch: nothing in HARTOS reads it for one agent', () => {
    expect(AGENT_SWITCHABLE).toEqual(['computer_control', 'camera_capture', 'screen_capture']);
    const rows = [allowAll('data_access'), agentNo('data_access', AGENT)];
    expect(agentPermissions(rows, AGENT)).toEqual([]);
  });

  it('kinds an agent does not hold for itself are left out', () => {
    const rows = ['voice_speech', 'public_exposure', 'cloud_capability'].map((t) => allowAll(t));
    expect(agentPermissions(rows, AGENT)).toEqual([]);
    const scoped = {...allowAll('cloud_capability'), scope: 'web_research:x', agent_id: AGENT};
    expect(agentPermissions([scoped], AGENT)).toEqual([]);
  });

  it("the agent's own grant is its own, and says ending it cannot be undone here", () => {
    const own = {...allowAll('computer_control'), id: 'own-1', agent_id: AGENT};
    const [p] = agentPermissions([own], AGENT);
    expect(p).toMatchObject({on: true, own: true, canSwitch: true, note: OWN_GRANT_NOTE});
  });

  it("a joined chat is this agent's own grant, by its own scope", () => {
    const join = {
      id: 'j1', consent_type: 'chat_join', scope: '10077#1763720000', granted: true,
      granted_at: '2026-11-21T10:00:00', revoked_at: null, agent_id: AGENT,
      agent_state: 'allowed',
    };
    const out = agentPermissions([join, {...join, id: 'j2', agent_id: OTHER}], AGENT);
    expect(out).toHaveLength(1);
    const [p] = out;
    expect(p).toMatchObject({
      consentType: 'chat_join', scope: '10077#1763720000', on: true, own: true, canSwitch: true,
      note: OWN_GRANT_NOTE,
    });
    expect(p.label).toBe('Lets user 10077 join your chat with this agent');
    expect(agentPermissions([{...join, revoked_at: '2026-11-21T10:30:00'}], AGENT)).toEqual([]);
  });

  it('no agent, no rows: nothing', () => {
    expect(agentPermissions([allowAll('computer_control')], null)).toEqual([]);
    expect(agentPermissions([allowAll('computer_control')], '')).toEqual([]);
    expect(agentPermissions(null, AGENT)).toEqual([]);
  });

  it('a numeric agent id matches its text form', () => {
    const rows = [allowAll('camera_capture', 'allowed'), agentNo('camera_capture', AGENT)];
    expect(agentPermissions(rows, Number(AGENT))[0].on).toBe(false);
  });
});

describe('AgentPermissionsPanel: the switch', () => {
  beforeEach(() => {
    consentApi.list.mockReset();
    consentApi.decline.mockReset().mockResolvedValue({success: true});
    consentApi.reopen.mockReset().mockResolvedValue({success: true});
  });

  it('the list is asked for this agent, so HARTOS answers for it', async () => {
    consentApi.list.mockResolvedValue({consents: [allowAll('computer_control')]});
    render(<AgentPermissionsPanel agentId={Number(AGENT)} />);
    await screen.findByTestId('permission-computer_control');
    expect(consentApi.list).toHaveBeenCalledWith({agent_id: AGENT});
  });

  it('Off sends this agent, this permission, to the decline route and shows it off', async () => {
    consentApi.list
      .mockResolvedValueOnce({data: {consents: [allowAll('computer_control')]}})
      .mockResolvedValueOnce({data: {consents: [
        allowAll('computer_control', 'turned_off'), agentNo('computer_control', AGENT)]}});
    render(<AgentPermissionsPanel agentId={Number(AGENT)} />);
    const row = await screen.findByTestId('permission-computer_control');
    expect(within(row).getByText('On')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', {name: OFF_LABEL}));
    await waitFor(() => expect(consentApi.decline).toHaveBeenCalledTimes(1));
    expect(consentApi.decline).toHaveBeenCalledWith(
      {consent_type: 'computer_control', scope: '*', agent_id: AGENT});
    expect(consentApi.reopen).not.toHaveBeenCalled();
    await waitFor(() => expect(
      within(screen.getByTestId('permission-computer_control'))
        .getByText('Off for this agent')).toBeTruthy());
    expect(screen.getByRole('button', {name: BACK_ON_LABEL})).toBeTruthy();
    expect(screen.getByText(REOPEN_NOTE)).toBeTruthy();
  });

  it('a turn-off made in chat shows without reopening the tab', async () => {
    consentApi.list
      .mockResolvedValueOnce({consents: [allowAll('camera_capture')]})
      .mockResolvedValueOnce({consents: [
        allowAll('camera_capture', 'turned_off'), agentNo('camera_capture', AGENT)]});
    const view = render(<AgentPermissionsPanel agentId={AGENT} />);
    const row = await screen.findByTestId('permission-camera_capture');
    expect(within(row).getByText('On')).toBeTruthy();
    // HARTOS announces the no the person gave in chat.
    expect(Object.keys(realtimeHandlers).sort()).toEqual(
      ['consent.granted', 'consent.reopened', 'consent.revoked']);
    await act(async () => {
      realtimeHandlers['consent.revoked'](
        {consent_type: 'camera_capture', scope: '*', agent_id: AGENT});
    });
    await waitFor(() => expect(
      within(screen.getByTestId('permission-camera_capture'))
        .getByText('Off for this agent')).toBeTruthy());
    expect(consentApi.decline).not.toHaveBeenCalled();
    view.unmount();
    expect(Object.keys(realtimeHandlers)).toEqual([]);
  });

  it('turning back on says it is for every agent before it is pressed', async () => {
    consentApi.list.mockResolvedValue({consents: [
      allowAll('computer_control', 'turned_off'), agentNo('computer_control', AGENT)]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    const row = await screen.findByTestId('permission-computer_control');
    // On the button itself, and in the line under it, with nothing pressed.
    expect(BACK_ON_LABEL).toBe('Turn back on for every agent');
    expect(within(row).getByRole('button').textContent).toBe(BACK_ON_LABEL);
    expect(REOPEN_NOTE).toMatch(/for every agent/);
    expect(REOPEN_NOTE).toMatch(/any other agent you turned it off for/);
    expect(within(row).getByText(REOPEN_NOTE)).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Turn back on'})).toBeNull();
    expect(consentApi.reopen).not.toHaveBeenCalled();
  });

  it('On takes the no back through the reopen route', async () => {
    consentApi.list
      .mockResolvedValueOnce({consents: [
        allowAll('computer_control', 'turned_off'), agentNo('computer_control', AGENT)]})
      .mockResolvedValueOnce({consents: [
        allowAll('computer_control'), agentNo('computer_control', AGENT, 'allowed')]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    fireEvent.click(await screen.findByRole('button', {name: BACK_ON_LABEL}));
    await waitFor(() => expect(consentApi.reopen).toHaveBeenCalledWith(
      {consent_type: 'computer_control', scope: '*'}));
    expect(consentApi.decline).not.toHaveBeenCalled();
    await screen.findByRole('button', {name: OFF_LABEL});
  });

  it('a switch that fails says so and changes nothing on the page', async () => {
    consentApi.list.mockResolvedValue({consents: [allowAll('computer_control')]});
    consentApi.decline.mockRejectedValue(new Error('500'));
    render(<AgentPermissionsPanel agentId={AGENT} />);
    fireEvent.click(await screen.findByRole('button', {name: OFF_LABEL}));
    expect((await screen.findByRole('alert')).textContent)
      .toBe('Could not turn it off. Nothing was changed.');
    expect(within(screen.getByTestId('permission-computer_control')).getByText('On')).toBeTruthy();
  });

  it('the copilot row has no switch and says where it changes', async () => {
    consentApi.list.mockResolvedValue({consents: [allowAll('copilot_access')]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    const row = await screen.findByTestId('permission-copilot_access');
    expect(within(row).queryByRole('button')).toBeNull();
    expect(within(row).getByText(COMPUTER_WIDE_NOTE)).toBeTruthy();
  });

  it('data access is not offered as a switch', async () => {
    consentApi.list.mockResolvedValue({consents: [
      allowAll('data_access'), allowAll('computer_control')]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    await screen.findByTestId('permission-computer_control');
    expect(screen.queryByTestId('permission-data_access')).toBeNull();
  });

  it('an agent with nothing allowed says it asks at first use', async () => {
    consentApi.list.mockResolvedValue({consents: []});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    expect(await screen.findByText(
      'This agent holds no permissions. It asks you the first time it needs one.')).toBeTruthy();
  });

  it('a list that cannot be read is said, never shown as nothing allowed', async () => {
    consentApi.list.mockRejectedValue(new Error('offline'));
    render(<AgentPermissionsPanel agentId={AGENT} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Could not read the permissions.');
    expect(screen.queryByText(/holds no permissions/)).toBeNull();
  });

  it('a list that does not say on or off is said, never guessed', async () => {
    const {agent_state: _dropped, ...bare} = allowAll('computer_control');
    consentApi.list.mockResolvedValue({consents: [bare]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Could not read the permissions.');
    expect(screen.queryByText(/holds no permissions/)).toBeNull();
    expect(screen.queryByTestId('permission-computer_control')).toBeNull();
  });

  it('a run with no agent of its own reads no list', () => {
    render(<AgentPermissionsPanel agentId={null} />);
    expect(screen.getByText(
      'This run has no agent of its own, so it holds no permissions.')).toBeTruthy();
    expect(consentApi.list).not.toHaveBeenCalled();
  });
});
