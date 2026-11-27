/* eslint-disable */
/**
 * AgentOverlay: a person's phone asking for this desktop (device_access,
 * HARTOS #306 and the review rv_2c18 of 2c18dc713).
 *
 * A phone allowed on a desktop acts as ONE account: the one it says it is
 * signed in as when it asks.  HARTOS writes that into the ask's reason
 * (auth._device_ask_reason): the phone's own name for itself, said as its
 * claim, its key's fingerprint, and the account ("This phone says it is
 * signed in as <name> (<id>). Allow only if this is your own phone.").  The
 * owner decides on those words, so the card shows them.  An ask from a phone
 * already allowed as another account (requester_switch_from) is that same
 * phone switching accounts, and its card says so instead of looking like a
 * new phone's.  The answer names the ask it answers (request_id), so a yes
 * binds the account the card showed and no other.
 *
 * Pins:
 *   1. The server's words are shown, with the fingerprint to match.
 *   2. A switch ask is titled as the allowed phone switching accounts.
 *   3. Allow and Don't allow carry the ask's request_id.
 *   4. An ask with no reason still says what it is for (as before).
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
  chatApi: {vaultStore: jest.fn(() => Promise.resolve({success: true}))},
}));

const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');
const {consentApi} = require('../../../services/socialApi');

const KEY = 'b'.repeat(64);
const FINGERPRINT = 'bbbb bbbb bbbb bbbb';
const SCOPE = `device:${KEY}`;

// The ask as HARTOS sends it for a phone signing in as the owner's account
// (auth.file_device_access_ask -> ConsentService.request_consent -> _emit).
const OWNERS_ACCOUNT = {
  type: 'consent.request',
  msg_id: 'consent.request:row-21',
  request_id: 'row-21',
  consent_type: 'device_access',
  scope: SCOPE,
  agent_id: null,
  requester_name: 'Pixel',
  requester_fingerprint: FINGERPRINT,
  // The key's fingerprint rides beside the words (requester_fingerprint),
  // never in them: the card shows it once (rv_2c18).
  reason:
    'A phone (it says its name is "Pixel") wants to use this computer\'s ' +
    'agents. This phone says it is signed in as Sathish (10202). Allow only ' +
    'if this is your own phone.',
};

// The same phone, allowed as 10202, now signed in as another account.
const SWITCH = {
  ...OWNERS_ACCOUNT,
  msg_id: 'consent.request:row-22',
  request_id: 'row-22',
  requester_switch_from: '10202',
  reason:
    'This phone (it says its name is "Pixel") is allowed on this computer as ' +
    'Sathish (10202). It now says it is signed in as account 40021 and asks ' +
    'to switch. Allow only if this is your own phone: once allowed, Sathish ' +
    '(10202) stops working on this phone.',
};

// A phone allowed before HARTOS kept a phone's account (v60): the owner is
// asked to confirm it, not to allow a new phone.
const RECONFIRM = {
  ...OWNERS_ACCOUNT,
  msg_id: 'consent.request:row-24',
  request_id: 'row-24',
  requester_reconfirm: true,
  reason:
    'This phone (it says its name is "Pixel") was allowed on this computer ' +
    'before. It says it is signed in as Sathish (10202); confirm it as that ' +
    'account. Allow only if this is your own phone.',
};

function mountOverlay() {
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

describe('AgentOverlay: a phone asking for this desktop', () => {
  test("shows the server's words: the account, its claim and the code to match", async () => {
    const send = mountOverlay();
    send(OWNERS_ACCOUNT);
    expect(await screen.findByText(OWNERS_ACCOUNT.reason)).toBeInTheDocument();
    expect(screen.getByText('A phone calling itself "Pixel"')).toBeInTheDocument();
    expect(screen.getByTestId('liquid-consent-fingerprint')).toHaveTextContent(FINGERPRINT);
    // The name is never stated as fact anywhere on the card.
    expect(screen.queryByText(/Pixel's phone/)).toBeNull();
  });

  test('Allow answers this ask by its id, so the yes binds the account it showed', async () => {
    const send = mountOverlay();
    send(OWNERS_ACCOUNT);
    await screen.findByText(OWNERS_ACCOUNT.reason);
    fireEvent.click(screen.getByRole('button', {name: 'Always allow this phone'}));
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'device_access',
        scope: SCOPE,
        request_id: 'row-21',
      });
    });
  });

  test("Don't allow answers this ask by its id", async () => {
    const send = mountOverlay();
    send(OWNERS_ACCOUNT);
    await screen.findByText(OWNERS_ACCOUNT.reason);
    fireEvent.click(screen.getByRole('button', {name: "Don't allow"}));
    await waitFor(() => {
      expect(consentApi.decline).toHaveBeenCalledWith({
        consent_type: 'device_access',
        scope: SCOPE,
        agent_id: null,
        request_id: 'row-21',
      });
    });
  });

  test('a phone already allowed, switching accounts, is not shown as a new phone', async () => {
    const send = mountOverlay();
    send(SWITCH);
    expect(await screen.findByText(SWITCH.reason)).toBeInTheDocument();
    expect(
      screen.getByText('A phone you allowed, calling itself "Pixel", asks to switch accounts'),
    ).toBeInTheDocument();
    expect(screen.queryByText('A phone calling itself "Pixel"')).toBeNull();
    expect(screen.getByTestId('liquid-consent-fingerprint')).toHaveTextContent(FINGERPRINT);
    fireEvent.click(screen.getByRole('button', {name: 'Always allow this phone'}));
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'device_access',
        scope: SCOPE,
        request_id: 'row-22',
      });
    });
  });

  test('a phone allowed before is asked to be confirmed, the code shown once', async () => {
    const send = mountOverlay();
    send(RECONFIRM);
    expect(await screen.findByText(RECONFIRM.reason)).toBeInTheDocument();
    expect(
      screen.getByText('A phone you allowed, calling itself "Pixel", asks you to confirm it'),
    ).toBeInTheDocument();
    expect(screen.queryByText('A phone calling itself "Pixel"')).toBeNull();
    expect(screen.getAllByText(new RegExp(FINGERPRINT))).toHaveLength(1);
  });

  test('every phone card shows the code to match exactly once', async () => {
    const send = mountOverlay();
    send(OWNERS_ACCOUNT);
    await screen.findByText(OWNERS_ACCOUNT.reason);
    expect(screen.getAllByText(new RegExp(FINGERPRINT))).toHaveLength(1);
  });

  test('an ask with no reason still says what the phone asks for', async () => {
    const send = mountOverlay();
    send({...OWNERS_ACCOUNT, msg_id: 'consent.request:row-23', reason: ''});
    expect(
      await screen.findByText("This phone asks to use this computer's agents from the network."),
    ).toBeInTheDocument();
  });
});
