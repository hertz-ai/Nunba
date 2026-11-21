import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import React from 'react';

/* The agent page's trail filters come from HARTOS (meta.kinds on the trail
 * response), not from a copy of the trail's kinds kept here (parallel-path
 * audit row N12), and an entry of HARTOS's security event log shows in the
 * same trail (owner 2026-11-21, "One view, two stores"), so the whole-node
 * check and the export note speak for both stores (review of 11c79a22).
 * Rendered through the
 * real RoleGuard, as AgentAuditPage.roleAccess.test.js does; only the social
 * context and the audit API are stubbed. */

const mockUseSocial = jest.fn();
jest.mock('../../../contexts/SocialContext', () => ({
  useSocial: () => mockUseSocial(),
}));

const mockGetTrail = jest.fn();
const mockVerify = jest.fn();
const mockExport = jest.fn();
const mockSave = jest.fn();
jest.mock('../../../utils/nativeFilePicker', () => ({
  saveTextFile: (...args) => mockSave(...args),
}));
jest.mock('../../../services/socialApi', () => ({
  auditApi: {
    listAgents: jest.fn(() =>
      Promise.resolve({data: [{id: 'a1', name: 'Agent One', type: 'local', status: 'idle'}]})
    ),
    getTimeline: jest.fn(() => Promise.resolve({data: []})),
    getTrail: (...args) => mockGetTrail(...args),
    verifyTrail: (...args) => mockVerify(...args),
    exportTrail: (...args) => mockExport(...args),
    getDaemonGoals: jest.fn(() => Promise.resolve({data: []})),
    getDaemonActivity: jest.fn(() => Promise.resolve({data: []})),
    getComputeNodes: jest.fn(() => Promise.resolve({data: []})),
    getComputeRouting: jest.fn(() => Promise.resolve({data: null})),
    getComputeUsage: jest.fn(() => Promise.resolve({data: []})),
  },
}));

const AgentAuditPage =
  require('../../../components/Social/Agents/AgentAuditPage').default;

const SECURITY_ROW = {
  kind: 'security_event', ts: '2026-11-21T08:00:01.000+00:00',
  text: 'a2ui_push: push card component', actor: 'owner', agent_id: 'a1',
  hash: 'h1', prev: 'h0', detail: {type: 'card'}, source: 'event_log',
};

async function openTrail() {
  mockUseSocial.mockReturnValue({accessTier: 'flat', isAuthenticated: true, loading: false});
  render(<AgentAuditPage />);
  fireEvent.click(await screen.findByText('Agent One'));
}

describe('the agent trail', () => {
  beforeEach(() => {
    mockGetTrail.mockReset();
    mockGetTrail.mockImplementation(() => Promise.resolve({
      success: true,
      data: [SECURITY_ROW],
      meta: {kinds: ['message', 'security_event', 'tool_receipt']},
    }));
    mockVerify.mockReset();
    mockVerify.mockImplementation(() => Promise.resolve({data: {ok: true, segments: []}}));
    mockExport.mockReset();
    mockExport.mockImplementation(() => Promise.resolve(''));
    mockSave.mockReset();
  });

  test('the whole-node check states the event log result', async () => {
    mockVerify.mockImplementation(() => Promise.resolve({data: {ok: false, missing: [],
      segments: [{segment: '2026-11-21_1-000.jsonl', lines: 1, ok: true, reason: ''}],
      event_log: {ok: false, checked: 2, total: 9,
        reason: 'Chain broken at entry 3: expected ab..., got cd...'}}}));
    await openTrail();
    const chip = await screen.findByText('Whole trail on this node: broken');
    expect(chip.closest('[title]').getAttribute('title'))
      .toContain('Security event log: Chain broken at entry 3');
  });

  test('a capped export says where the security events are kept', async () => {
    mockExport.mockImplementation(() => Promise.resolve('{"kind":"message"}\n'.repeat(5000)));
    mockSave.mockImplementation(() => Promise.resolve({saved: true, where: 'C:/audit_a1.jsonl'}));
    await openTrail();
    fireEvent.click(await screen.findByText('Export'));
    expect(await screen.findByText(/Exported 5000 line/)).toHaveTextContent(
      'the security events in its database');
  });

  test('offers the filters the server sent, and only those', async () => {
    await openTrail();
    expect(await screen.findByText('Security events')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('tool_receipt')).toBeInTheDocument();
    expect(screen.queryByText('Transcripts')).toBeNull();
    fireEvent.click(screen.getByText('Security events'));
    await waitFor(() => expect(mockGetTrail).toHaveBeenLastCalledWith(
      'a1', {kinds: 'security_event', limit: 500}));
  });

  test('shows a security event line with its words and who acted', async () => {
    await openTrail();
    expect(await screen.findByText('a2ui_push: push card component')).toBeInTheDocument();
    expect(screen.getByText(/security_event.*owner/)).toBeInTheDocument();
  });
});
