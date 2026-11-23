import {render, screen} from '@testing-library/react';
import React from 'react';

/* The agent audit page (the "HARTs" entry, /social/agents) asked the role
 * hook for `canAccess('regional')`.  useRoleAccess has never returned a
 * canAccess, so the page threw a TypeError on every render, for every tier:
 * the audit trail it shows could not be opened (found 2026-11-21).  An
 * earlier probe stubbed RoleGuard WITH a canAccess, which hid it.  These tests
 * render the page through the REAL RoleGuard; only the social context and the
 * audit API are stubbed. */

const mockUseSocial = jest.fn();
jest.mock('../../../contexts/SocialContext', () => ({
  useSocial: () => mockUseSocial(),
}));

jest.mock('../../../services/socialApi', () => ({
  auditApi: {
    listAgents: jest.fn(() =>
      Promise.resolve({
        data: [{id: 'a1', name: 'Agent One', type: 'local', status: 'idle'}],
      })
    ),
    getTimeline: jest.fn(() => Promise.resolve({data: []})),
    getTrail: jest.fn(() => Promise.resolve({data: []})),
    verifyTrail: jest.fn(() => Promise.resolve({data: {ok: true, segments: []}})),
    exportTrail: jest.fn(() => Promise.resolve('')),
    getDaemonGoals: jest.fn(() => Promise.resolve({data: []})),
    getDaemonActivity: jest.fn(() => Promise.resolve({data: []})),
    getComputeNodes: jest.fn(() => Promise.resolve({data: []})),
    getComputeRouting: jest.fn(() => Promise.resolve({data: null})),
    getComputeUsage: jest.fn(() => Promise.resolve({data: []})),
  },
}));

const AgentAuditPage =
  require('../../../components/Social/Agents/AgentAuditPage').default;

function openAs(accessTier) {
  mockUseSocial.mockReturnValue({accessTier, isAuthenticated: true, loading: false});
  return render(<AgentAuditPage />);
}

describe('the agent audit page opens', () => {
  test('for a member, without the compute tab', async () => {
    openAs('flat');
    expect(await screen.findByText('Agent One')).toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: /compute/i})).toBeNull();
  });

  test('for a signed-in person whose role is no access tier', async () => {
    openAs('student');
    expect(await screen.findByText('Agent One')).toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: /compute/i})).toBeNull();
  });

  test('for a regional steward, with the compute tab', async () => {
    openAs('regional');
    expect(await screen.findByText('Agent One')).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /compute/i})).toBeInTheDocument();
  });
});
