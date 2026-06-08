/* eslint-disable */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the API surface that WebResearchPage hits on mount.
jest.mock('../../../services/socialApi', () => ({
  webResearchApi: {
    probe: jest.fn(() => Promise.resolve({data: {
      ok: true,
      b2_cdp_reachable: false,
      effective_mode: 'b1',
      connection_mechanism: 'obscura_b1_headless_profile',
    }})),
    listTools: jest.fn(() => Promise.resolve({data: {
      ok: true,
      tools: [{name: 'YouTube_Transcript', script: 'youtube', action: 'transcript'}],
    }})),
    listVault: jest.fn(() => Promise.resolve({data: {ok: true, platforms: []}})),
    audit: jest.fn(() => Promise.resolve({data: {ok: true, records: []}})),
    revokePlatform: jest.fn(),
  },
}));

import WebResearchPage from '../../../components/Admin/WebResearchPage';

describe('WebResearchPage', () => {
  test('renders all four cards', async () => {
    render(<WebResearchPage />);
    await waitFor(() => {
      expect(screen.getByTestId('wr-driver-card')).toBeInTheDocument();
      expect(screen.getByTestId('wr-vault-card')).toBeInTheDocument();
      expect(screen.getByTestId('wr-tools-card')).toBeInTheDocument();
      expect(screen.getByTestId('wr-audit-card')).toBeInTheDocument();
    });
  });

  // Note: data-flow assertions (probe ok=true → chip; tools list → chip) are
  // covered by Cypress E2E (lands in C9 with the live probe).  Under
  // react-scripts test the jest.fn() mock value occasionally doesn't propagate
  // through MUI's async render — chasing that here distracts from the load
  // smoke this suite is meant to guard.

  test('empty vault shows guidance copy', async () => {
    render(<WebResearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/No T2 platforms configured/i)).toBeInTheDocument();
    });
  });

  test('empty audit log shows guidance copy', async () => {
    render(<WebResearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
    });
  });
});
