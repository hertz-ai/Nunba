/**
 * The two cards an agent's contact has on the page say who asks in HARTOS's
 * words, not in the page's own.
 *
 * routes/chatbot_routes.py agent_contact_request sends two payloads: an
 * unowned agent's 'agent_contact_request' (App.js mounts AgentContactRequest
 * for it) and an owned agent's 'agent_message' (AgentMessageToast).  Both
 * carry agent_asker, HARTOS's wording of agent_name, since 72f4493f.  Until
 * this test neither card read it: the request card printed agent_name over
 * "wants to talk to you" and the toast was titled with agent_name, so the
 * key had no reader at all.
 *
 * The earlier "producer" test in consentAsks.test.js called askerOf on
 * payloads typed out in the test, so it could not see that no component
 * called askerOf.  Here the REAL components are mounted, and each payload's
 * keys are read out of the route's own source, so a key the route stops
 * sending fails here too.  The name is one the page's fallback copy words
 * differently from HARTOS ("AgentÜber": HARTOS says "Agent AgentÜber", the
 * copy says "AgentÜber"), so a card worded by the copy, or by the bare
 * name, cannot pass.
 */
import AgentContactRequest from '../../../components/Agent/AgentContactRequest';
import AgentMessageToast from '../../../components/Agent/AgentMessageToast';
import {ToastProvider} from '../../../components/shared/ToastProvider';
import realtimeService from '../../../services/realtimeService';

import {render, screen, act, fireEvent} from '@testing-library/react';
import React from 'react';

import fs from 'fs';
import path from 'path';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn()},
  subscribeTtsLangEvents: jest.fn(() => () => {}),
}));

const ROUTE_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', '..', '..', 'routes', 'chatbot_routes.py'), 'utf8');

const NAME = 'AgentÜber';
const HARTOS_SAYS = 'Agent AgentÜber';

// What the route puts in each variable it sends.
const SENT = {
  agent_id: '61',
  agent_name: NAME,
  agent_asker: HARTOS_SAYS,
  message: 'I finished the sweep you asked for.',
  reason: 'wants to share something with you',
  request_id: 'r1',
};

/** The payload the route sends for `type`, keys taken from its source. */
function routePayload(type) {
  const start = ROUTE_SOURCE.indexOf(`'type': '${type}',`);
  expect(start).toBeGreaterThan(-1);
  const body = ROUTE_SOURCE.slice(start, ROUTE_SOURCE.indexOf('})', start));
  const payload = {};
  for (const [, key, value] of body.matchAll(/'(\w+)':\s*([^,\n]+),/g)) {
    if (key === 'type') payload.type = type;
    else if (value === 'True') payload[key] = true;
    else if (value === 'False') payload[key] = false;
    else payload[key] = SENT[value];
  }
  return payload;
}

function toastHandler() {
  const call = realtimeService.on.mock.calls.find((c) => c[0] === 'agent_message');
  return call && call[1];
}

function mountToast() {
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

describe('what the route sends', () => {
  test('a contact request names the agent both ways and needs an answer', () => {
    expect(routePayload('agent_contact_request')).toEqual({
      type: 'agent_contact_request',
      request_id: 'r1',
      agent_id: '61',
      agent_name: NAME,
      agent_asker: HARTOS_SAYS,
      reason: SENT.reason,
      requires_consent: true,
    });
  });

  test("an owned agent's message names the agent both ways", () => {
    expect(routePayload('agent_message')).toEqual({
      type: 'agent_message',
      agent_id: '61',
      agent_name: NAME,
      agent_asker: HARTOS_SAYS,
      message: SENT.message,
      reason: SENT.reason,
      request_id: 'r1',
      requires_consent: false,
    });
  });
});

describe('the contact request card', () => {
  test("says who asks in HARTOS's words", () => {
    render(<AgentContactRequest request={routePayload('agent_contact_request')} />);
    expect(screen.getByText(HARTOS_SAYS)).toBeInTheDocument();
    expect(screen.queryByText(NAME)).not.toBeInTheDocument();
    expect(screen.getByText('wants to talk to you')).toBeInTheDocument();
    expect(screen.getByText(SENT.reason)).toBeInTheDocument();
  });

  test('shows the words sent, whatever they are', () => {
    render(<AgentContactRequest
      request={{...routePayload('agent_contact_request'), agent_asker: 'The agent Vijai'}} />);
    expect(screen.getByText('The agent Vijai')).toBeInTheDocument();
  });

  test('a payload from before agent_asker is worded by the dated fallback', () => {
    const old = routePayload('agent_contact_request');
    delete old.agent_asker;
    old.agent_name = 'Vijai';
    render(<AgentContactRequest request={old} />);
    expect(screen.getByText('Agent Vijai')).toBeInTheDocument();
  });

  test('a payload that names nobody still has a name line', () => {
    const bare = routePayload('agent_contact_request');
    delete bare.agent_asker;
    delete bare.agent_name;
    render(<AgentContactRequest request={bare} />);
    expect(screen.getByText('An agent')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/undefined|null/);
  });

  test('Accept and Deny hand back the request as it came', () => {
    const request = routePayload('agent_contact_request');
    const onAccept = jest.fn();
    const onDeny = jest.fn();
    const first = render(
      <AgentContactRequest request={request} onAccept={onAccept} onDeny={onDeny} />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith(request);
    first.unmount();
    render(<AgentContactRequest request={request} onAccept={onAccept} onDeny={onDeny} />);
    fireEvent.click(screen.getByText('Deny'));
    expect(onDeny).toHaveBeenCalledWith(request);
  });

  test('no request, no card', () => {
    render(<AgentContactRequest request={null} />);
    expect(screen.queryByText('wants to talk to you')).not.toBeInTheDocument();
  });
});

describe("an owned agent's message toast", () => {
  test("is headed by who sent it, in HARTOS's words", () => {
    mountToast();
    act(() => {
      toastHandler()(routePayload('agent_message'));
    });
    expect(screen.getByText(HARTOS_SAYS)).toBeInTheDocument();
    expect(screen.queryByText(NAME)).not.toBeInTheDocument();
    expect(screen.getByText(SENT.message)).toBeInTheDocument();
  });

  test('a payload from before agent_asker is worded by the dated fallback', () => {
    mountToast();
    const old = routePayload('agent_message');
    delete old.agent_asker;
    old.agent_name = 'Vijai';
    act(() => {
      toastHandler()(old);
    });
    expect(screen.getByText('Agent Vijai')).toBeInTheDocument();
  });

  test('a payload that says who asks and gives no bare name is still headed by it', () => {
    mountToast();
    const asked = routePayload('agent_message');
    delete asked.agent_name;
    act(() => {
      toastHandler()(asked);
    });
    expect(screen.getByText(HARTOS_SAYS)).toBeInTheDocument();
    expect(screen.queryByText('Your agent')).not.toBeInTheDocument();
  });

  test.each([
    ['no name at all', {}],
    ['a blank name', {agent_name: '   '}],
    ['a blank asker and no name', {agent_asker: ' '}],
  ])('%s keeps the headline "Your agent"', (_label, names) => {
    mountToast();
    const bare = routePayload('agent_message');
    delete bare.agent_asker;
    delete bare.agent_name;
    act(() => {
      toastHandler()({...bare, ...names});
    });
    expect(screen.getByText('Your agent')).toBeInTheDocument();
    expect(screen.queryByText('An agent')).not.toBeInTheDocument();
  });
});
