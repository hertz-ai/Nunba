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
  // One handler per topic: the overlay subscribes to agent.ui.update for
  // cards and to the answer topics (consent.granted / consent.revoked).
  const handlers = {};
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  return (payload, topic = 'agent.ui.update') => act(() => {
    handlers[topic](payload);
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

  test('a named agent is asked for by name, never by its id', async () => {
    // HARTOS resolves agent_name where the ask is built
    // (consent_service.agent_display_name); the id is a prompt id.
    const send = mountOverlay();
    send({
      type: 'consent.request',
      msg_id: 'consent.request:row-3',
      consent_type: 'computer_control',
      scope: '*',
      agent_id: '79211163351',
      agent_name: 'Spider-Man',
      reason: '',
    });

    expect(
      await screen.findByText('Spider-Man asks to control this computer.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: "Don't allow Spider-Man"})).toBeInTheDocument();
    expect(screen.getAllByText('Spider-Man').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('79211163351')).not.toBeInTheDocument();
  });

  test('an ask with only an id shows no id anywhere', async () => {
    const send = mountOverlay();
    send({...ASK, msg_id: 'consent.request:row-4', reason: ''});
    expect(
      await screen.findByText('An agent asks to control this computer.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(ASK.agent_id)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: "Don't allow this agent"})).toBeInTheDocument();
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

describe('AgentOverlay consent.request — answered on another surface', () => {
  // Owner 2026-09-15: giving consent in one place dismisses the ask on every
  // surface it was shown on, for that user or the network guests.  HARTOS
  // already tells every device: grant_consent emits consent.granted and
  // revoke_consent (the card's "Don't allow") emits consent.revoked, both
  // through the on_notification fan-out the ask itself rides (consent_service
  // ._emit), each {consent_type, scope, agent_id}.  The overlay reads those
  // as answers, never as cards.
  const GRANT_ALL = {type: 'consent.granted', consent_type: 'computer_control',
    scope: '*', agent_id: null};

  test('a grant made on another device dismisses the card here', async () => {
    const send = mountOverlay();
    send(ASK);
    await screen.findByText(ASK.reason);

    send(GRANT_ALL, 'consent.granted');
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });
    expect(consentApi.grant).not.toHaveBeenCalled();
  });

  test("a 'Don't allow' for this agent made elsewhere dismisses the card", async () => {
    const send = mountOverlay();
    send(ASK);
    await screen.findByText(ASK.reason);

    send({type: 'consent.revoked', consent_type: 'computer_control',
      scope: '*', agent_id: ASK.agent_id}, 'consent.revoked');
    await waitFor(() => {
      expect(screen.queryByText(ASK.reason)).not.toBeInTheDocument();
    });
  });

  test("a 'Don't allow' for another agent leaves this ask open", async () => {
    const send = mountOverlay();
    send(ASK);
    await screen.findByText(ASK.reason);

    send({type: 'consent.revoked', consent_type: 'computer_control',
      scope: '*', agent_id: 'someone-else'}, 'consent.revoked');
    expect(screen.getByText(ASK.reason)).toBeInTheDocument();
  });

  test('an answer for another consent type leaves this ask open', async () => {
    const send = mountOverlay();
    send(ASK);
    await screen.findByText(ASK.reason);

    send({...GRANT_ALL, consent_type: 'screen_capture'}, 'consent.granted');
    expect(screen.getByText(ASK.reason)).toBeInTheDocument();
  });

  test('an answer never renders as a card of its own', () => {
    // A per-agent answer carries agent_id, so realtimeService also puts it
    // on agent.ui.update; the overlay used to render it through the default
    // branch as raw JSON.
    const send = mountOverlay();
    send({...GRANT_ALL, agent_id: ASK.agent_id});
    expect(screen.queryByText(/consent\.granted/)).not.toBeInTheDocument();
    expect(screen.queryByText(/computer_control/)).not.toBeInTheDocument();
  });
});

describe('AgentOverlay consent.request — a device ask (#111)', () => {
  // HARTOS files this when a person's phone asks to reach this desktop's
  // agents from the network (#111): consent_type device_access, scope
  // 'device:<64 hex key>', agent_id null, requester_name the name the
  // phone signed into the ask (self-asserted), requester_fingerprint the
  // key's first 16 hex in four groups (consent_service.device_fingerprint,
  // HARTOS 29a188036), reason the server's sentence.  The wording IS the
  // security control (hartos-63): the name is shown only as a claim, the
  // fingerprint is what the owner matches against the phone, the grant is
  // that exact scope -- one phone, never a blanket over every agent.
  const KEY = 'a'.repeat(64);
  const FINGERPRINT = 'aaaa aaaa aaaa aaaa';
  const TITLE = 'A phone calling itself "Giri"';
  const DEVICE_ASK = {
    type: 'consent.request',
    msg_id: 'consent.request:row-9',
    consent_type: 'device_access',
    scope: `device:${KEY}`,
    agent_id: null,
    requester_name: 'Giri',
    requester_fingerprint: FINGERPRINT,
    reason: "Giri's phone asks to use this computer's agents from the network.",
  };

  test('names the phone as a claim, shows the code to match, grants that one phone', async () => {
    const send = mountOverlay();
    send(DEVICE_ASK);
    expect(await screen.findByText(TITLE)).toBeInTheDocument();

    const code = screen.getByTestId('liquid-consent-fingerprint');
    expect(code).toHaveTextContent(FINGERPRINT);
    expect(code.tagName).toBe('CODE');
    expect(screen.getByText('Check the code matches on the phone')).toBeInTheDocument();
    // The server's sentence states the self-asserted name as fact; the
    // card does not repeat it, and the name appears nowhere else.
    expect(screen.queryByText(DEVICE_ASK.reason)).toBeNull();
    expect(screen.getAllByText(/Giri/)).toHaveLength(1);
    expect(screen.queryByRole('button', {name: /ALL agents/})).toBeNull();
    expect(screen.queryByRole('button', {name: /Giri/})).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Always allow this phone'}));
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'device_access',
        scope: `device:${KEY}`,
      });
    });
  });

  test('says what the phone asks for, without the name', async () => {
    const send = mountOverlay();
    send({...DEVICE_ASK, msg_id: 'consent.request:row-10', reason: ''});
    await screen.findByText(TITLE);
    expect(
      screen.getByText("This phone asks to use this computer's agents from the network."),
    ).toBeInTheDocument();
  });

  test('without a fingerprint from the server the card derives it from the key', async () => {
    const send = mountOverlay();
    send({...DEVICE_ASK, msg_id: 'consent.request:row-12', requester_fingerprint: undefined});
    await screen.findByText(TITLE);
    expect(screen.getByTestId('liquid-consent-fingerprint')).toHaveTextContent(FINGERPRINT);
  });

  test('a phone that signed no name is an unnamed phone', async () => {
    const send = mountOverlay();
    send({...DEVICE_ASK, msg_id: 'consent.request:row-13', requester_name: ''});
    expect(await screen.findByText('An unnamed phone')).toBeInTheDocument();
  });

  test("Don't allow declines that phone's ask, for no agent, and closes the card", async () => {
    // The way back is the privacy page's per-phone row (Allow), so the no
    // can be offered here.
    const send = mountOverlay();
    send(DEVICE_ASK);
    await screen.findByText(TITLE);
    fireEvent.click(screen.getByRole('button', {name: "Don't allow"}));
    await waitFor(() => {
      expect(consentApi.decline).toHaveBeenCalledWith({
        consent_type: 'device_access',
        scope: `device:${KEY}`,
        agent_id: null,
      });
    });
    await waitFor(() => {
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    });
    expect(consentApi.grant).not.toHaveBeenCalled();
  });

  test('a grant for that phone dismisses the ask; a grant for another phone does not', async () => {
    const send = mountOverlay();
    send(DEVICE_ASK);
    await screen.findByText(TITLE);

    send({type: 'consent.granted', consent_type: 'device_access',
      scope: `device:${'b'.repeat(64)}`, agent_id: null}, 'consent.granted');
    expect(screen.getByText(TITLE)).toBeInTheDocument();

    send({type: 'consent.granted', consent_type: 'device_access',
      scope: `device:${KEY}`, agent_id: null}, 'consent.granted');
    await waitFor(() => {
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    });
  });

  test('a blanket device_access answer leaves every phone ask standing', async () => {
    // check_consent's wildcard and blanket steps run only for an ask that
    // names an agent (agent_id is not None); a device ask names none, so a
    // blanket ('*', no agent) device_access row admits NO phone and the
    // gate keeps answering 403 consent_pending.  The card must stay up
    // (hartos-3e review of ef237047).
    const KEY_B = 'b'.repeat(64);
    const TITLE_B = 'A phone calling itself "Mani"';
    const ASK_B = {...DEVICE_ASK, msg_id: 'consent.request:row-11',
      scope: `device:${KEY_B}`, requester_name: 'Mani',
      requester_fingerprint: 'bbbb bbbb bbbb bbbb',
      reason: "Mani's phone asks to use this computer's agents from the network."};
    const send = mountOverlay();
    send(DEVICE_ASK);
    send(ASK_B);
    await screen.findByText(TITLE);
    await screen.findByText(TITLE_B);

    send({type: 'consent.granted', consent_type: 'device_access',
      scope: '*', agent_id: null}, 'consent.granted');
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(TITLE_B)).toBeInTheDocument();

    // The exact scope still settles only its own phone.
    send({type: 'consent.granted', consent_type: 'device_access',
      scope: `device:${KEY_B}`, agent_id: null}, 'consent.granted');
    await waitFor(() => {
      expect(screen.queryByText(TITLE_B)).not.toBeInTheDocument();
    });
    expect(screen.getByText(TITLE)).toBeInTheDocument();
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
