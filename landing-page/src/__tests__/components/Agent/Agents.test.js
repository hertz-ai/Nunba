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

// Proxy, not a hand-listed set, and that is the point.  This mock previously
// defined ONLY `X`, while Agents.js imports {X, Search, ArrowRight, Sparkles} —
// so three icons resolved to `undefined`, React threw "Element type is invalid",
// and ALL 8 tests in this file died.  The file's own header claimed only test #6
// was red, so seven real contract guards sat dead and nobody noticed: a guard
// that cannot pass is not a guard.
//
// A Proxy answers any icon name, so adding an import to the component can never
// silently kill this suite again.  Named `data-testid` stays available via
// `icon-<Name>` for tests that need to assert on a specific glyph.
jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') return true;
        const Icon = (props) =>
          React.createElement('svg', {'data-testid': `icon-${String(name)}`, ...props});
        Icon.displayName = `MockIcon(${String(name)})`;
        return Icon;
      },
    },
  );
});

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

// Locate the clickable card ROOT by the accessible role the component already
// exposes (Agents.js AgentCard: role="button" + tabIndex={0} + onKeyDown), not
// by a CSS class.  The previous version walked up looking for `cursor-pointer`,
// which stopped existing when the card moved to agents.css class names — so the
// walk ran off the top of the tree, `clickable` became null, and both tests
// failed on a styling detail that has nothing to do with the contract.
// Role-based lookup cannot drift with the stylesheet.
const cardFor = (nameRe) => {
  const label = screen.getByText(nameRe);
  const root = label.closest('[role="button"]');
  expect(root).toBeTruthy();
  return root;
};

describe('Agents page — navigation', () => {
  it('clicking a card in standalone mode navigates to /agents/<name>', () => {
    renderPage({predefinedAgents: [SAMPLE_LOCAL]});
    fireEvent.click(cardFor(/Local Tutor/i));
    // Spaces in the agent name become hyphens.
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
    fireEvent.click(cardFor(/Local Tutor/i));
    expect(onAgentSelect).toHaveBeenCalledWith(SAMPLE_LOCAL);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The card advertises role="button" + tabIndex={0} + onKeyDown, so Enter must
  // do what a click does.  Pinning it keeps a future refactor from quietly
  // dropping the keyboard path and leaving the role as a false advertisement.
  it('Enter on a focused card activates it (keyboard parity with click)', () => {
    renderPage({predefinedAgents: [SAMPLE_LOCAL]});
    fireEvent.keyDown(cardFor(/Local Tutor/i), {key: 'Enter', code: 'Enter'});
    expect(mockNavigate).toHaveBeenCalledWith(
      '/agents/Local-Tutor',
      expect.objectContaining({state: {agentData: SAMPLE_LOCAL}}),
    );
  });
});

// 6: backend-down regression — GAP G2/G3, NOW CLOSED ------------
//
// The defect: when chatApi.getPrompts() rejected, the catch only
// console.error'd, so the page rendered the same "No agents found" copy
// users see for an empty *successful* response.  "Local backend offline"
// was indistinguishable from "you genuinely have zero agents" — and only
// one of those is fixable by retrying.
//
// Closed via option (b) from the original note: Agents.js now tracks
// `loadError` and renders LoadErrorState (role="alert" + Retry CTA)
// instead of EmptyState.  Option (a) — falling through to
// getPublicPromptsCloud() — was deliberately NOT taken: that method has
// zero production callers and points at /prompts/public, a route absent
// from Nunba's routes/, so it would have swapped a visible bug for a
// silent network path to a probably-nonexistent endpoint.
//
// The original assertion was ALSO mis-timed: it awaited only that
// getPrompts had been CALLED, then queried synchronously — so it read the
// DOM one microtask before the catch's setState rendered, and would have
// reported "still broken" even against a correct fix.  The assertion
// itself must be what waitFor retries.

describe('Agents page — backend-down regression (G2/G3)', () => {
  it('shows a distinguishable error state when chatApi.getPrompts rejects', async () => {
    mockGetPrompts.mockRejectedValue(new Error('Network error'));
    renderPage();
    // findBy* retries — the error state appears a microtask after the reject.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    // And it must NOT be the empty-list copy, which is the whole point.
    expect(screen.queryByText(/No agents found/i)).not.toBeInTheDocument();
  });

  it('offers a Retry that actually re-runs the load and recovers', async () => {
    mockGetPrompts.mockRejectedValueOnce(new Error('Network error'));
    renderPage();
    const retry = await screen.findByRole('button', {name: /retry/i});
    expect(mockGetPrompts).toHaveBeenCalledTimes(1);

    // Second attempt succeeds — proves Retry re-enters the same load path
    // rather than being a decorative button.
    mockGetPrompts.mockResolvedValueOnce({prompts: [SAMPLE_CLOUD]});
    fireEvent.click(retry);

    expect(await screen.findByText(/Cloud Coach/i)).toBeInTheDocument();
    expect(mockGetPrompts).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a successful load shows the empty state, never the error state', async () => {
    mockGetPrompts.mockResolvedValue({prompts: []});
    renderPage();
    // Genuinely-zero-agents must still read as "nothing here", not "failure".
    expect(await screen.findByText(/No agents found/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
