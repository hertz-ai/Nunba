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
 */
import {
  agentPermissions, AGENT_SWITCHABLE, COMPUTER_WIDE, COMPUTER_WIDE_NOTE,
  OWN_GRANT_NOTE, REOPEN_NOTE,
} from '../../../constants/agentPermissions';

import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import React from 'react';

jest.mock('../../../services/socialApi', () => ({
  consentApi: {list: jest.fn(), decline: jest.fn(), reopen: jest.fn()},
  dashboardApi: {},
}));

// eslint-disable-next-line import/order
import {AgentPermissionsPanel} from '../../../components/Admin/AgentOperationsDrawer';
// eslint-disable-next-line import/order
import {consentApi} from '../../../services/socialApi';

const AGENT = '88659566083';
const OTHER = '70264903070';

const allowAll = (type, at = '2026-11-21T10:00:00') => ({
  id: `all-${type}-${at}`, consent_type: type, scope: '*', granted: true,
  granted_at: at, revoked_at: null, reopened_at: null, agent_id: null, agent_name: null,
});
const agentNo = (type, agent, at = '2026-11-21T11:00:00', reopened = null) => ({
  id: `no-${type}-${agent}`, consent_type: type, scope: '*', granted: false,
  granted_at: null, revoked_at: at, reopened_at: reopened, agent_id: agent,
  agent_name: 'Vijai',
});
const only = (rows, type) => agentPermissions(rows, AGENT).filter((p) => p.consentType === type);

describe('agentPermissions: what one agent is allowed', () => {
  it('allow-all covers the agent: on, and it can be switched', () => {
    const [p] = only([allowAll('computer_control')], 'computer_control');
    expect(p).toMatchObject({on: true, canSwitch: true, scope: '*', own: false});
    expect(p.label).toBe('May control this computer');
  });

  it("the agent's own no after allow-all: off for this agent", () => {
    const rows = [allowAll('computer_control'), agentNo('computer_control', AGENT)];
    const [p] = only(rows, 'computer_control');
    expect(p.on).toBe(false);
    expect(p.note).toBe(REOPEN_NOTE);
  });

  it("another agent's no leaves this agent on", () => {
    const rows = [allowAll('computer_control'), agentNo('computer_control', OTHER)];
    expect(only(rows, 'computer_control')[0].on).toBe(true);
    expect(agentPermissions(rows, OTHER)[0].on).toBe(false);
  });

  it('a no given before the newest allow-all is covered by it', () => {
    const rows = [
      allowAll('computer_control', '2026-11-21T09:00:00'),
      agentNo('computer_control', AGENT, '2026-11-21T10:00:00'),
      allowAll('computer_control', '2026-11-21T12:00:00'),
    ];
    expect(only(rows, 'computer_control')[0].on).toBe(true);
  });

  it('a no at the very time of the grant wins, as in HARTOS', () => {
    const rows = [allowAll('computer_control', '2026-11-21T10:00:00'),
      agentNo('computer_control', AGENT, '2026-11-21T10:00:00')];
    expect(only(rows, 'computer_control')[0].on).toBe(false);
  });

  it('a no taken back no longer stands', () => {
    const rows = [allowAll('computer_control'),
      agentNo('computer_control', AGENT, '2026-11-21T11:00:00', '2026-11-21T11:30:00')];
    expect(only(rows, 'computer_control')[0].on).toBe(true);
  });

  it('an allow-all that was ended lists nothing', () => {
    const ended = {...allowAll('computer_control'), revoked_at: '2026-11-21T10:30:00'};
    expect(agentPermissions([ended], AGENT)).toEqual([]);
    expect(agentPermissions([{...allowAll('computer_control'), scope: 'files'}], AGENT))
      .toEqual([]);
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
    const rows = [allowAll('camera_capture'), allowAll('screen_capture'),
      agentNo('camera_capture', AGENT)];
    const out = agentPermissions(rows, AGENT);
    expect(out.map((p) => [p.consentType, p.on, p.canSwitch])).toEqual([
      ['camera_capture', false, true], ['screen_capture', true, true]]);
    expect(out[0].label).toBe('May see through your camera');
  });

  it('kinds an agent does not hold for itself are left out', () => {
    const rows = ['voice_speech', 'public_exposure', 'cloud_capability'].map((t) => allowAll(t));
    expect(agentPermissions(rows, AGENT)).toEqual([]);
    const scoped = {...allowAll('cloud_capability'), scope: 'web_research:x', agent_id: AGENT};
    expect(agentPermissions([scoped], AGENT)).toEqual([]);
    expect(AGENT_SWITCHABLE).toEqual(
      ['computer_control', 'camera_capture', 'screen_capture', 'data_access']);
  });

  it("a joined chat is this agent's own grant, by its own scope", () => {
    const join = {
      id: 'j1', consent_type: 'chat_join', scope: '10077#1763720000', granted: true,
      granted_at: '2026-11-21T10:00:00', revoked_at: null, agent_id: AGENT,
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
    const rows = [allowAll('data_access'), agentNo('data_access', AGENT)];
    expect(agentPermissions(rows, Number(AGENT))[0].on).toBe(false);
  });
});

describe('AgentPermissionsPanel: the switch', () => {
  beforeEach(() => {
    consentApi.list.mockReset();
    consentApi.decline.mockReset().mockResolvedValue({success: true});
    consentApi.reopen.mockReset().mockResolvedValue({success: true});
  });

  it('Off sends this agent, this permission, to the decline route and shows it off', async () => {
    consentApi.list
      .mockResolvedValueOnce({data: {consents: [allowAll('computer_control')]}})
      .mockResolvedValueOnce({data: {consents: [
        allowAll('computer_control'), agentNo('computer_control', AGENT)]}});
    render(<AgentPermissionsPanel agentId={Number(AGENT)} />);
    const row = await screen.findByTestId('permission-computer_control');
    expect(within(row).getByText('On')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', {name: 'Turn off for this agent'}));
    await waitFor(() => expect(consentApi.decline).toHaveBeenCalledTimes(1));
    expect(consentApi.decline).toHaveBeenCalledWith(
      {consent_type: 'computer_control', scope: '*', agent_id: AGENT});
    expect(consentApi.reopen).not.toHaveBeenCalled();
    await waitFor(() => expect(
      within(screen.getByTestId('permission-computer_control'))
        .getByText('Off for this agent')).toBeTruthy());
    expect(screen.getByRole('button', {name: 'Turn back on'})).toBeTruthy();
    expect(screen.getByText(REOPEN_NOTE)).toBeTruthy();
  });

  it('On takes the no back through the reopen route', async () => {
    consentApi.list
      .mockResolvedValueOnce({consents: [
        allowAll('computer_control'), agentNo('computer_control', AGENT)]})
      .mockResolvedValueOnce({consents: [allowAll('computer_control')]});
    render(<AgentPermissionsPanel agentId={AGENT} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Turn back on'}));
    await waitFor(() => expect(consentApi.reopen).toHaveBeenCalledWith(
      {consent_type: 'computer_control', scope: '*'}));
    expect(consentApi.decline).not.toHaveBeenCalled();
    await screen.findByRole('button', {name: 'Turn off for this agent'});
  });

  it('a switch that fails says so and changes nothing on the page', async () => {
    consentApi.list.mockResolvedValue({consents: [allowAll('computer_control')]});
    consentApi.decline.mockRejectedValue(new Error('500'));
    render(<AgentPermissionsPanel agentId={AGENT} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Turn off for this agent'}));
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

  it('a run with no agent of its own reads no list', () => {
    render(<AgentPermissionsPanel agentId={null} />);
    expect(screen.getByText(
      'This run has no agent of its own, so it holds no permissions.')).toBeTruthy();
    expect(consentApi.list).not.toHaveBeenCalled();
  });
});
