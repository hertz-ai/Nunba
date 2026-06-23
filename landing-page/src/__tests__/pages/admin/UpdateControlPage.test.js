/* eslint-disable */
/**
 * Behavioral tests for UpdateControlPage — mock the otaApi boundary, render
 * the real component, assert observable side-effects (cards render, the
 * publish button gates on a commit, confirming the dialog calls
 * otaApi.publish with the channel + commit, the latest pointer renders).
 *
 * No grep/source-shape assertions — every test drives the real component
 * through user-visible behavior.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Fixtures live at module scope (mock-prefixed so babel-plugin-jest-hoist
// permits the factory to reference them). The factory installs BARE jest.fn()
// spies — CRA's react-scripts sets resetMocks:true, which strips any
// implementation passed to jest.fn() in the factory before each test, so the
// resolved values MUST be (re)applied in beforeEach via mockResolvedValue.
const mockLatestData = {
  channel: 'stable',
  flake_ref: 'github:hertz-ai/HARTOS/abc123def456',
  commit: 'abc123def456789',
  published_at: 1718600000,
};
const mockNodesData = {
  nodes: [
    { node_id: 'node-aaaa', name: 'alpha', hart_tag: 'alpha', tier: 'flat',
      status: 'active', version: '1.0.0', target_commit: 'abc123def456789',
      rollout: 'applied', result_message: '', polled_at: 1718600100, applied_at: 1718600200 },
    { node_id: 'node-bbbb', name: 'beta', hart_tag: 'beta', tier: 'regional',
      status: 'active', version: '0.9.0', target_commit: 'abc123def456789',
      rollout: 'polled', result_message: '', polled_at: 1718600150, applied_at: null },
  ],
  counts: { idle: 0, queued: 0, polled: 1, applied: 1, failed: 0 },
};
const mockPublishData = {
  success: true, channel: 'stable', commit: 'newcommit999',
  flake_ref: '', node_count: 2, command_ids: [10, 11],
};

jest.mock('../../../services/socialApi', () => ({
  otaApi: { latest: jest.fn(), nodes: jest.fn(), publish: jest.fn() },
}));

import UpdateControlPage from '../../../pages/admin/UpdateControlPage';

const { otaApi: mockOtaApi } = jest.requireMock('../../../services/socialApi');

beforeEach(() => {
  // Re-apply implementations AFTER react-scripts' resetMocks strips them.
  mockOtaApi.latest.mockReset().mockResolvedValue(mockLatestData);
  mockOtaApi.nodes.mockReset().mockResolvedValue(mockNodesData);
  mockOtaApi.publish.mockReset().mockResolvedValue(mockPublishData);
});

describe('UpdateControlPage', () => {
  test('renders latest, publish, and nodes cards', async () => {
    render(<UpdateControlPage />);
    await waitFor(() => {
      expect(screen.getByTestId('ota-latest-card')).toBeInTheDocument();
      expect(screen.getByTestId('ota-publish-card')).toBeInTheDocument();
      expect(screen.getByTestId('ota-nodes-card')).toBeInTheDocument();
    });
  });

  test('fetches the latest pointer and node rollout on mount', async () => {
    render(<UpdateControlPage />);
    await waitFor(() => {
      expect(mockOtaApi.latest).toHaveBeenCalledWith('stable');
      expect(mockOtaApi.nodes).toHaveBeenCalledWith('stable');
    });
  });

  test('renders the current published commit (short form)', async () => {
    render(<UpdateControlPage />);
    // shortHash truncates to 12 chars + ellipsis. The same short commit also
    // renders in the node "Target" column, so scope the assertion to the
    // latest-pointer card to keep it unambiguous.
    const latestCard = await screen.findByTestId('ota-latest-card');
    await waitFor(() => {
      expect(within(latestCard).getByText('abc123def456…')).toBeInTheDocument();
    });
  });

  test('renders each node with its rollout phase', async () => {
    render(<UpdateControlPage />);
    await waitFor(() => {
      expect(screen.getByText('@alpha')).toBeInTheDocument();
      expect(screen.getByText('@beta')).toBeInTheDocument();
    });
    // "Applied"/"Pulling" appear in the rollout chip, the phase-summary stat,
    // and (for "Applied") the table column header — so assert presence via
    // getAllByText rather than a single-match getByText.
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pulling').length).toBeGreaterThan(0);
  });

  test('publish button is disabled until a commit is entered', async () => {
    render(<UpdateControlPage />);
    const btn = await screen.findByTestId('ota-publish-button');
    expect(btn).toBeDisabled();

    const commitField = screen.getByLabelText(/Commit \/ release hash/i);
    fireEvent.change(commitField, { target: { value: 'deadbeefcafe' } });
    expect(btn).not.toBeDisabled();
  });

  test('confirming the dialog calls otaApi.publish with channel + commit', async () => {
    render(<UpdateControlPage />);
    await screen.findByTestId('ota-publish-button');

    fireEvent.change(screen.getByLabelText(/Commit \/ release hash/i), {
      target: { value: 'deadbeefcafe123' },
    });
    fireEvent.click(screen.getByTestId('ota-publish-button'));

    // Dialog opens — confirm.
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Publish$/i }));

    await waitFor(() => {
      expect(mockOtaApi.publish).toHaveBeenCalledTimes(1);
    });
    const arg = mockOtaApi.publish.mock.calls[0][0];
    expect(arg.channel).toBe('stable');
    expect(arg.commit).toBe('deadbeefcafe123');
  });

  test('"Check for updates" polls otaApi.latest on demand for the selected channel', async () => {
    render(<UpdateControlPage />);
    // Mount already polled stable once; clear so we assert the on-demand call.
    await waitFor(() => expect(mockOtaApi.latest).toHaveBeenCalledWith('stable'));
    mockOtaApi.latest.mockClear();

    fireEvent.click(await screen.findByTestId('ota-check-button'));

    await waitFor(() => {
      expect(mockOtaApi.latest).toHaveBeenCalledTimes(1);
      expect(mockOtaApi.latest).toHaveBeenCalledWith('stable');
    });
  });

  test('"Check for updates" reports the freshly polled commit', async () => {
    render(<UpdateControlPage />);
    fireEvent.click(await screen.findByTestId('ota-check-button'));
    // shortHash of the mock commit 'abc123def456789' → 'abc123def456…'
    await waitFor(() => {
      expect(screen.getByText(/Latest on stable: abc123def456…/)).toBeInTheDocument();
    });
  });

  test('switching channel re-queries latest + nodes for that channel', async () => {
    render(<UpdateControlPage />);
    await waitFor(() => expect(mockOtaApi.latest).toHaveBeenCalledWith('stable'));

    fireEvent.click(screen.getByRole('button', { name: 'nightly' }));

    await waitFor(() => {
      expect(mockOtaApi.latest).toHaveBeenCalledWith('nightly');
      expect(mockOtaApi.nodes).toHaveBeenCalledWith('nightly');
    });
  });
});
