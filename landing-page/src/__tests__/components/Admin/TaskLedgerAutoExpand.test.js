/* eslint-disable */
/**
 * TaskLedgerPage (#204): a flow holding IN_PROGRESS or BLOCKED work opens
 * by itself the first time it appears.
 *
 * Since the session layer (Phase 5) the grouped view renders the flows of
 * each session (key `<prompt>__<session>__<flow>`), but the default-expand
 * effect walked only the prompt-level flow list (key `<prompt>__<flow>`),
 * so the flow the operator cares about stayed shut.  Found by
 * cypress/e2e/chat-resilience-2026-05.cy.js #204 on 2026-11-05: "Flow 1"
 * and "Flow 2" rendered, "Action 1" never did.
 */

import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

import TaskLedgerPage from '../../../pages/admin/TaskLedgerPage';

// The tasks the #204 Cypress test stubs: no session_id, so they share the
// one synthetic session; Flow 1 has the in-progress action.
const TASKS = [
  {id: 't1', task_id: 't1', agent_id: 'a1', owner_prompt_id: 'p1',
   description: 'Execute Action 1: lookup', status: 'COMPLETED'},
  {id: 't2', task_id: 't2', agent_id: 'a1', owner_prompt_id: 'p1',
   description: 'Execute Action 2: synthesize', status: 'IN_PROGRESS'},
  {id: 't3', task_id: 't3', agent_id: 'a1', owner_prompt_id: 'p1',
   description: 'Flow 2 / Action 1: post', status: 'PENDING'},
];

beforeEach(() => {
  global.fetch = jest.fn((url) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(url.includes('/ledger/tasks')
      ? {success: true, tasks: TASKS}
      : {success: true, stats: {}}),
  }));
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

describe('TaskLedgerPage default expand', () => {
  test('the flow with an in-progress action shows its actions without a click', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/task-ledger']}>
        <TaskLedgerPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Execute Action 2: synthesize')).toBeInTheDocument();
    });
    // The whole flow opens, not only the in-progress row.
    expect(screen.getByText('Execute Action 1: lookup')).toBeInTheDocument();
  });

  test('a flow with only pending work stays collapsed', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/task-ledger']}>
        <TaskLedgerPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Flow 2/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Flow 2 / Action 1: post')).not.toBeInTheDocument();
  });
});
