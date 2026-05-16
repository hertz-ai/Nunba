/* eslint-disable */
/**
 * Tests for the /agents browse page.
 *
 * The page is the sole UI surface for the cloud+local agent unification
 * (Demopage routes per-agent; /agents *displays* the unified list).  This
 * file pins the contract:
 *
 *   1. Babel-parse smoke (implicit — file imports the page)
 *   2. Search-by-name filters the rendered list
 *   3. predefinedAgents short-circuits the API call
 *   4. getPrompts() is the single endpoint hit on mount
 *   5. Clicking a card navigates to /agents/<name>
 *   6. Backend-down regression — REVEALS gap G2/G3
 *
 * #6 is expected to fail on the current code path (silent empty state on
 * fetch failure).  Keeping it red is the verification — it documents the
 * gap and prevents accidental "still broken in v2" merges.
 */

import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

// Mocks ---------------------------------------------------------

jest.mock(
  '../../../assets/images/AgentPoster.png',
  () => 'agent-poster.png',
  {virtual: true},
);

jest.mock('../../../components/footer', () => {
  const React = require('react');
  return {__esModule: true, default: () => <div data-testid="footer" />};
});
jest.mock('../../../components/navbar', () => {
  const React = require('react');
  return {__esModule: true, default: () => <div data-testid="navbar" />};
});

jest.mock('lucide-react', () => ({
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

jest.mock('react-toastify', () => ({
  __esModule: true,
  ToastContainer: () => null,
  toast: {error: jest.fn(), success: jest.fn()},
}));

const mockGetPrompts = jest.fn();
jest.mock('../../../services/socialApi', () => ({
  __esModule: true,
  chatApi: {
    getPrompts: (...args) => mockGetPrompts(...args),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const real = jest.requireActual('react-router-dom');
  return {
    ...real,
    useNavigate: () => mockNavigate,
  };
});

import Agents from '../../../components/Agent/Agents';

// Fixtures ------------------------------------------------------

const SAMPLE_LOCAL = {
  prompt_id: 1,
  name: 'Local Tutor',
  description: 'On-device math tutor',
  type: 'local',
  _isLocal: true,
};
const SAMPLE_CLOUD = {
  prompt_id: 2,
  name: 'Cloud Coach',
  description: 'Cloud-hosted productivity coach',
  type: 'custom',
};
const SAMPLE_UNNAMED = {prompt_id: 3, name: '', description: 'no name'};

function renderPage(overrides = {}) {
  return render(
    <MemoryRouter>
      <Agents {...overrides} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// 1+2+3: predefined-agents path + search filter -----------------

describe('Agents page — predefined agents (no fetch)', () => {
  it('renders every named agent and filters out unnamed ones', () => {
    renderPage({
      predefinedAgents: [SAMPLE_LOCAL, SAMPLE_CLOUD, SAMPLE_UNNAMED],
    });
    expect(screen.getByText(/Local Tutor/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloud Coach/i)).toBeInTheDocument();
    // Unnamed agent is dropped (Agents.js:31-33).
    expect(screen.queryByText(/no name/i)).not.toBeInTheDocument();
    // No fetch fired when predefinedAgents is supplied (Agents.js:30-37).
    expect(mockGetPrompts).not.toHaveBeenCalled();
  });

  it('search input filters by name (case-insensitive)', () => {
    renderPage({
      predefinedAgents: [SAMPLE_LOCAL, SAMPLE_CLOUD],
    });
    const search = screen.getByPlaceholderText(/Search agents/i);
    fireEvent.change(search, {target: {value: 'tutor'}});
    expect(screen.getByText(/Local Tutor/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cloud Coach/i)).not.toBeInTheDocument();
  });
});

// 4: API contract — single unified endpoint ---------------------

describe('Agents page — API contract', () => {
  it('hits chatApi.getPrompts() exactly once on mount when no predefinedAgents', async () => {
    mockGetPrompts.mockResolvedValue({
      prompts: [SAMPLE_LOCAL, SAMPLE_CLOUD],
    });
    renderPage();
    await waitFor(() => {
      expect(mockGetPrompts).toHaveBeenCalledTimes(1);
    });
    // Single call — no separate cloud or sync call from this page.
    // (Demopage does multi-source merge; /agents trusts the server.)
    await waitFor(() => {
      expect(screen.getByText(/Local Tutor/i)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Coach/i)).toBeInTheDocument();
    });
  });

  it('handles {data: {prompts: [...]}} response shape (axios envelope)', async () => {
    mockGetPrompts.mockResolvedValue({
      data: {prompts: [SAMPLE_LOCAL]},
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Local Tutor/i)).toBeInTheDocument();
    });
  });

  it('handles bare-array response shape (legacy backend)', async () => {
    mockGetPrompts.mockResolvedValue([SAMPLE_LOCAL]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Local Tutor/i)).toBeInTheDocument();
    });
  });
});

// 5: navigate-on-click -----------------------------------------

describe('Agents page — navigation', () => {
  it('clicking a card in standalone mode navigates to /agents/<name>', () => {
    renderPage({predefinedAgents: [SAMPLE_LOCAL]});
    const card = screen.getByText(/Local Tutor/i).closest('div');
    // Walk up to the clickable card root (has cursor-pointer class).
    let clickable = card;
    while (clickable && !clickable.className.includes('cursor-pointer')) {
      clickable = clickable.parentElement;
    }
    expect(clickable).toBeTruthy();
    fireEvent.click(clickable);
    // Spaces in the agent name become hyphens (Agents.js:202).
    expect(mockNavigate).toHaveBeenCalledWith(
      '/agents/Local-Tutor',
      expect.objectContaining({state: {agentData: SAMPLE_LOCAL}}),
    );
  });

  it('clicking a card in overlay mode invokes onAgentSelect (no navigate)', () => {
    const onAgentSelect = jest.fn();
    renderPage({
      isOverlay: true,
      predefinedAgents: [SAMPLE_LOCAL],
      onAgentSelect,
    });
    const card = screen.getByText(/Local Tutor/i).closest('div');
    let clickable = card;
    while (clickable && !clickable.className.includes('cursor-pointer')) {
      clickable = clickable.parentElement;
    }
    fireEvent.click(clickable);
    expect(onAgentSelect).toHaveBeenCalledWith(SAMPLE_LOCAL);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// 6: backend-down regression — REVEALS GAP G2/G3 ---------------
//
// Current behaviour: when chatApi.getPrompts() rejects, the catch
// only console.errors and the page renders the same "no agents match"
// copy users see for an empty *successful* response.  That makes
// "local backend offline" indistinguishable from "you genuinely have
// zero agents" — a real UX bug.
//
// This test is intentionally red on the current code.  Once Agents.js
// either (a) falls through to chatApi.getPublicPromptsCloud() when the
// local call fails, or (b) renders a distinguishable error state with a
// retry CTA, the test will pass.  Keeping it as a failing fixture
// documents the gap rather than burying it in a memo.

describe('Agents page — backend-down regression (G2/G3)', () => {
  it('shows a distinguishable error state when chatApi.getPrompts rejects', async () => {
    mockGetPrompts.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(mockGetPrompts).toHaveBeenCalled();
    });
    // Either an error banner OR a retry CTA — anything that distinguishes
    // failure from "you have no agents".  The current code shows neither.
    const errorish =
      screen.queryByText(/couldn't load|failed to load|retry|connection|offline/i);
    expect(errorish).toBeInTheDocument();
  });
});
