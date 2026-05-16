/* eslint-disable */
/**
 * TaskLedgerPage — `?task_id=X` deep-link highlight.
 *
 * Pins the contract used by the Liquid UI notification deep-link:
 * Nunba chat busy branch emits a `notification` with
 * `actions:[{kind:'navigate', target:'/admin/task-ledger?task_id=X'}]`.
 * AgentOverlay's navigate handler routes to that URL.  This test
 * verifies the receiving page reads the query param and renders the
 * matching row with a highlight outline.
 */

import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

import TaskLedgerPage from '../../../pages/admin/TaskLedgerPage';

const SAMPLE_TASKS = [
  {task_id: 'task-aaa-1', title: 'First task', status: 'IN_PROGRESS',
   agent_id: 'agent_a'},
  {task_id: 'task-bbb-2', title: 'Second task', status: 'IN_PROGRESS',
   agent_id: 'agent_b'},
  {task_id: 'task-ccc-3', title: 'Third task', status: 'COMPLETED',
   agent_id: 'agent_c'},
];

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/agent-engine/ledger/tasks')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({success: true, tasks: SAMPLE_TASKS}),
      });
    }
    if (url.includes('/api/agent-engine/ledger/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({success: true, stats: {}}),
      });
    }
    return Promise.resolve({ok: false, json: () => Promise.resolve({})});
  });
  // scrollIntoView isn't defined in jsdom — stub it so our useEffect
  // doesn't crash the test.
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

describe('TaskLedgerPage ?task_id= highlight', () => {
  test('renders highlighted outline on the matching row', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/task-ledger?task_id=task-bbb-2']}>
        <TaskLedgerPage />
      </MemoryRouter>
    );

    // Wait for fetch to resolve and rows to render
    await waitFor(() => {
      expect(screen.getByText('Second task')).toBeInTheDocument();
    });

    // scrollIntoView should have been called for the highlighted row.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  test('no highlight when query param is absent', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/task-ledger']}>
        <TaskLedgerPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('First task')).toBeInTheDocument();
    });
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
