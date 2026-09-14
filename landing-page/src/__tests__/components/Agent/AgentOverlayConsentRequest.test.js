/* eslint-disable */
/**
 * AgentOverlay — HARTOS consent asks (type 'consent.request').
 *
 * HARTOS ConsentService.request_consent sends
 *   {type: 'consent.request', msg_id: 'consent.request:<row id>',
 *    consent_type, scope, agent_id, reason}
 * through integrations/social/realtime.on_notification (WAMP chat.social
 * and SSE 'notification').  A gate that is waiting for the answer
 * (integrations/vlm/safety.computer_control_block) sends the same ask
 * again every 3 s, with the same msg_id, for up to 90 s.
 *
 * The consent API grant (/api/social/consent) writes a row with no agent,
 * so every grant from this card covers every agent, and the button says so.
 * "Don't allow" (/api/social/consent/decline) says no to the ask, for the
 * ask's agent only; a no stands until the owner allows agents again on the
 * privacy page, so only a type with a privacy-page card offers it.
 *
 * Pins:
 *   1. The ask shows its reason and grants {consent_type, scope}.
 *   2. The same msg_id shows one card while that card is up.
 *   3. After the card is dismissed or answered, the same msg_id shows
 *      again (a re-ask after a revoke must never stay hidden).
 *   4. The card stays up until answered (no 15 s auto-dismiss).
 *   5. An ask with no reason still says what it is for.
 *   6. "Don't allow" declines the ask's own agent, never every agent.
 *   7. The browser-research consent_prompt still grants cloud_capability.
 */

import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: jest.fn(() => () => {}),
    off: jest.fn(),
  },
}));
jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../../services/socialApi', () => ({
  consentApi: {
    grant: jest.fn(() => Promise.resolve({})),
    decline: jest.fn(() => Promise.resolve({})),
  },
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
}));

const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');
const {consentApi} = require('../../../services/socialApi');

// The ask integrations/vlm/safety.computer_control_block files for a
// known agent: its reason carries COMPUTER_CONTROL_COVERS.
const ASK = {
  type: 'consent.request',
  msg_id: 'consent.request:row-1',
  consent_type: 'computer_control',
  scope: '*',
  agent_id: '88659566083',
  reason:
    'Agent 88659566083 asks to run shell commands, write files, move the ' +
    'mouse, type on the keyboard and open apps on this computer.',
};

const ALLOW_ALL = 'Allow ALL agents to control this computer';

function mountOverlay() {
  let handleEvent;
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((_topic, cb) => {
    handleEvent = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  return (payload) => act(() => {
    handleEvent(payload);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AgentOverlay consent.request', () => {
  test('shows the reason and grants computer_control for every agent', async () => {
    const send = mountOverlay();
    send(ASK);

    expect(await screen.findByText(ASK.reason)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: ALLOW_ALL}));

    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        scope: '*',
      });
    });
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });
  });

  test('the same ask sent again while its card is up shows one card', async () => {
    const send = mountOverlay();
    send(ASK);
    send(ASK);
    send(ASK);

    await screen.findByText(ASK.reason);
    expect(screen.getAllByText(ASK.reason)).toHaveLength(1);
  });

  test('after the card is dismissed the same ask shows again', async () => {
    const send = mountOverlay();
    send(ASK);
    fireEvent.click(await screen.findByRole('button', {name: 'Not now'}));
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });

    send(ASK);
    expect(await screen.findByText(ASK.reason)).toBeInTheDocument();
  });

  test('after the card is answered a later ask with the same id shows again', async () => {
    const send = mountOverlay();
    send(ASK);
    fireEvent.click(await screen.findByRole('button', {name: ALLOW_ALL}));
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });

    // The owner revokes on the privacy page; the next run asks again with
    // the same pending row, so the same msg_id.
    send(ASK);
    expect(await screen.findByText(ASK.reason)).toBeInTheDocument();
  });

  test('the card stays up past the 15 s auto-dismiss', () => {
    jest.useFakeTimers();
    try {
      const send = mountOverlay();
      send(ASK);
      expect(screen.getByText(ASK.reason)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(16000);
      });
      expect(screen.getByText(ASK.reason)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('an ask with no reason says what it is for and grants it', async () => {
    const send = mountOverlay();
    send({
      type: 'consent.request',
      msg_id: 'consent.request:row-2',
      consent_type: 'screen_capture',
      scope: '*',
      agent_id: null,
      reason: '',
    });

    expect(
      await screen.findByText('An agent asks to see this screen.'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {name: 'Allow ALL agents to see this screen'}),
    );
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'screen_capture',
        scope: '*',
      });
    });
  });
});

describe("AgentOverlay consent.request — Don't allow", () => {
  test("says no to this agent's ask only, and closes the card", async () => {
    const send = mountOverlay();
    send(ASK);

    fireEvent.click(
      await screen.findByRole('button', {name: "Don't allow this agent"}),
    );
    await waitFor(() => {
      expect(consentApi.decline).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        scope: '*',
        agent_id: '88659566083',
      });
    });
    expect(consentApi.grant).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });
  });

  test('an ask with no agent is declined as it was asked, never widened', async () => {
    const send = mountOverlay();
    send({
      ...ASK,
      msg_id: 'consent.request:row-3',
      agent_id: null,
      reason: 'An agent that could not be identified asks to control this computer.',
    });

    fireEvent.click(await screen.findByRole('button', {name: "Don't allow"}));
    await waitFor(() => {
      expect(consentApi.decline).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        scope: '*',
        agent_id: null,
      });
    });
  });

  test('the card says how long a no lasts', async () => {
    const send = mountOverlay();
    send(ASK);
    expect(
      await screen.findByText(/until you allow it again in Privacy settings/i),
    ).toBeInTheDocument();
  });

  test('a type with no privacy-page card has no decline, so a no cannot strand it', async () => {
    const send = mountOverlay();
    send({
      type: 'consent.request',
      msg_id: 'consent.request:row-4',
      consent_type: 'data_access',
      scope: '*',
      agent_id: null,
      reason: '',
    });

    await screen.findByText('An agent asks to use your data.');
    expect(screen.queryByRole('button', {name: /Don't allow/})).toBeNull();
  });
});

describe('AgentOverlay consent_prompt (browser research)', () => {
  test('still grants cloud_capability for its platform', async () => {
    const send = mountOverlay();
    send({type: 'consent_prompt', platform: 'twitter', agent_id: 'br'});

    fireEvent.click(await screen.findByTestId('liquid-consent-grant'));
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'cloud_capability',
        scope: 'web_research:twitter',
      });
    });
    expect(screen.queryByRole('button', {name: /Don't allow/})).toBeNull();
  });
});
