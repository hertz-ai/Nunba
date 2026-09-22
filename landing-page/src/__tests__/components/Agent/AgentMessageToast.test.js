/**
 * An owned agent's direct message must actually reach the person.
 *
 * This repo ships both halves of a path that did not connect:
 * routes/chatbot_routes.agent_contact_request delivers an OWNED agent's message
 * through on_notification with `type: 'agent_message'`, and App.js received it and
 * wrote it to localStorage['agent_proactive_message'], which nothing here reads.
 *
 * realtimeService is mocked, so these tests exercise THIS component's contract --
 * which event it subscribes to, what it renders, and what it declines to render --
 * rather than the transport.
 */
import AgentMessageToast from '../../../components/Agent/AgentMessageToast';
import {ToastProvider} from '../../../components/shared/ToastProvider';
import realtimeService from '../../../services/realtimeService';

import {render, screen, act} from '@testing-library/react';
import React from 'react';

// `subscribeTtsLangEvents` is mocked alongside the default export because this
// repo's ToastProvider (unlike hevolve's) subscribes to TTS-language events in an
// effect of its own. Mocking only the default export left it undefined and every
// test failed inside the PROVIDER rather than the component under test.
jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn()},
  subscribeTtsLangEvents: jest.fn(() => () => {}),
}));

/** The handler the component registered for `agent_message`. */
function registeredHandler() {
  const call = realtimeService.on.mock.calls.find((c) => c[0] === 'agent_message');
  return call && call[1];
}

function mount() {
  return render(
    <ToastProvider>
      <AgentMessageToast />
    </ToastProvider>,
  );
}

beforeEach(() => {
  realtimeService.on.mockReset();
  realtimeService.on.mockReturnValue(() => {});
});

test('subscribes to agent_message', () => {
  mount();
  expect(registeredHandler()).toBeInstanceOf(Function);
});

test('an owned agent message is shown with the agent name and the body', () => {
  mount();
  act(() => {
    registeredHandler()({
      agent_id: 'ag-1',
      agent_name: 'Compute Recruiter',
      message: 'I finished the sweep you asked for.',
    });
  });
  expect(screen.getByText('Compute Recruiter')).toBeInTheDocument();
  expect(screen.getByText('I finished the sweep you asked for.')).toBeInTheDocument();
});

test('falls back to `reason` when the sender filled no message body', () => {
  mount();
  act(() => {
    registeredHandler()({agent_id: 'ag-1', agent_name: 'Scout', reason: 'hive task done'});
  });
  expect(screen.getByText('hive task done')).toBeInTheDocument();
});

test('an unnamed agent still gets a headline rather than "undefined"', () => {
  mount();
  act(() => {
    registeredHandler()({agent_id: 'ag-1', message: 'ping'});
  });
  expect(screen.getByText('Your agent')).toBeInTheDocument();
  expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
});

test('a payload with no agent_id is ignored', () => {
  mount();
  act(() => {
    registeredHandler()({message: 'from nobody'});
  });
  expect(screen.queryByText('from nobody')).not.toBeInTheDocument();
});

test('a payload with nothing to say raises no empty toast', () => {
  mount();
  act(() => {
    registeredHandler()({agent_id: 'ag-1', agent_name: 'Quiet'});
  });
  expect(screen.queryByText('Quiet')).not.toBeInTheDocument();
});

test('showing a toast does NOT resubscribe', () => {
  // The hazard this component is written against: ToastProvider passes a fresh
  // `value={{showToast, dismissToast}}` literal and re-renders on every toast, so
  // an effect depending on the context OBJECT would tear down and resubscribe
  // each time. Depending on `showToast` (a useCallback([])) keeps it to one.
  mount();
  expect(realtimeService.on).toHaveBeenCalledTimes(1);
  act(() => {
    registeredHandler()({agent_id: 'ag-1', agent_name: 'Scout', message: 'one'});
  });
  expect(screen.getByText('one')).toBeInTheDocument();
  expect(realtimeService.on).toHaveBeenCalledTimes(1);
});

test('unsubscribes on unmount', () => {
  const unsub = jest.fn();
  realtimeService.on.mockReturnValue(unsub);
  const {unmount} = mount();
  expect(unsub).not.toHaveBeenCalled();
  unmount();
  expect(unsub).toHaveBeenCalledTimes(1);
});
