/* eslint-disable */
/**
 * AgentOverlay channel-connect cards: the credential form reaches HARTOS,
 * and WhatsApp's QR stays current until the phone links.
 *
 * Form: HARTOS's Connect_Channel card names its submit URL in `action`
 * (/api/social/channels/<type>/connect, auth required).  FormOverlay posted
 * with a bare fetch (no Bearer token, so a 401), ignored the answer and
 * closed: a typed bot token vanished with nothing on screen.  It now sends
 * through socialApi's authenticated client and stays open with the
 * server's reason when the values were not taken.
 *
 * QR: HARTOS sends a new qr_pair card each time WhatsApp rotates its code
 * (every ~20s).  Each used to stack as its own card and vanish after 15s,
 * so the one on top could be a dead code.  A newer code for the same
 * channel now replaces the card in place, and channel_connected clears it.
 */

import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({value}) => <span data-testid="qr">{value}</span>,
}));
jest.mock('../../../services/socialApi', () => ({
  agentFormApi: {submit: jest.fn()},
  consentApi: {grant: jest.fn(), decline: jest.fn()},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  chatApi: {vaultStore: jest.fn()},
}));

const {agentFormApi} = require('../../../services/socialApi');
const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');

function mountOverlay() {
  const handlers = {};
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  return (payload) => act(() => { handlers['agent.ui.update'](payload); });
}

const FORM = {
  type: 'form',
  msg_id: 'form-1',
  title: 'Connect Telegram',
  channel: 'telegram',
  fields: [{name: 'bot_token', label: 'Bot token', secret: true}],
  submit_label: 'Connect',
  action: '/api/social/channels/telegram/connect',
};

beforeEach(() => {
  agentFormApi.submit.mockReset();
});

describe('FormOverlay', () => {
  test('Connect sends the typed values through the authenticated client', async () => {
    agentFormApi.submit.mockResolvedValue({data: {success: true}});
    const send = mountOverlay();
    send(FORM);
    fireEvent.change(screen.getByLabelText('Bot token'), {target: {value: '123:ABC'}});
    fireEvent.click(screen.getByText('Connect'));
    await waitFor(() => expect(screen.queryByText('Connect Telegram')).toBeNull());
    expect(agentFormApi.submit).toHaveBeenCalledWith(
      '/api/social/channels/telegram/connect', {bot_token: '123:ABC'});
  });

  test('a refused submit keeps the card and shows the server reason', async () => {
    agentFormApi.submit.mockRejectedValue({
      response: {data: {success: false,
        error: "Telegram registered with partial config. Missing: ['bot_token']."}},
    });
    const send = mountOverlay();
    send(FORM);
    fireEvent.click(screen.getByText('Connect'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing');
    expect(screen.getByText('Connect Telegram')).toBeInTheDocument();
  });

  test('a secret field is masked', () => {
    const send = mountOverlay();
    send(FORM);
    expect(screen.getByLabelText('Bot token')).toHaveAttribute('type', 'password');
  });
});

describe('Invite share card (local submit action)', () => {
  const INVITE = {
    type: 'form', msg_id: 'inv-1', title: 'Share invite', channel: 'invite',
    fields: [{name: 'invite_url', label: 'Your invite link',
      value: 'https://hevolve.ai/i/abc', readonly: true}],
    submit_label: 'Copy link', submit_action: 'copy_invite_url',
  };

  test('shows the link it was sent and copies it, with no server call', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.assign(navigator, {clipboard: {writeText}});
    const send = mountOverlay();
    send(INVITE);
    expect(screen.getByLabelText('Your invite link')).toHaveValue('https://hevolve.ai/i/abc');
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() => expect(screen.queryByText('Share invite')).toBeNull());
    expect(writeText).toHaveBeenCalledWith('https://hevolve.ai/i/abc');
    expect(agentFormApi.submit).not.toHaveBeenCalled();
  });
});

describe('QR pairing card', () => {
  const qr = (code, n) => ({
    type: 'qr_pair', channel: 'whatsapp', msg_id: `qr_pair-whatsapp-${n}`,
    title: 'Scan to connect WhatsApp', qr: code,
  });

  test('a rotated code replaces the card instead of stacking', () => {
    const send = mountOverlay();
    send(qr('CODE-1', 1));
    send(qr('CODE-2', 2));
    const shown = screen.getAllByTestId('qr').map((n) => n.textContent);
    expect(shown).toEqual(['CODE-2']);
  });

  test('the card stays up past the transient timeout', () => {
    jest.useFakeTimers();
    try {
      const send = mountOverlay();
      send(qr('CODE-1', 1));
      act(() => { jest.advanceTimersByTime(20000); });
      expect(screen.getByTestId('qr')).toHaveTextContent('CODE-1');
    } finally {
      jest.useRealTimers();
    }
  });

  test("the channel's failure toast clears its dead QR", () => {
    const send = mountOverlay();
    send(qr('CODE-1', 1));
    send({type: 'toast', severity: 'error', channel: 'whatsapp', msg_id: 't-1',
      text: 'The WhatsApp link expired before it was completed.'});
    expect(screen.queryByTestId('qr')).toBeNull();
  });

  test("another channel's toast leaves the QR alone", () => {
    const send = mountOverlay();
    send(qr('CODE-1', 1));
    send({type: 'toast', severity: 'error', channel: 'telegram', msg_id: 't-2',
      text: "Telegram couldn't connect."});
    expect(screen.getByTestId('qr')).toHaveTextContent('CODE-1');
  });

  test("can't scan: the phone number goes to the endpoint HARTOS named", async () => {
    agentFormApi.submit.mockResolvedValue({data: {success: true}});
    const send = mountOverlay();
    send({...qr('CODE-1', 1),
      pair_code_action: '/api/social/channels/whatsapp/connect-pair-code'});
    fireEvent.click(screen.getByText("Can't scan? Link with phone number"));
    fireEvent.change(screen.getByLabelText('Your phone number'),
      {target: {value: '+91 90000 00000'}});
    fireEvent.click(screen.getByText('Send me a code'));
    await waitFor(() => expect(screen.queryByTestId('qr')).toBeNull());
    expect(agentFormApi.submit).toHaveBeenCalledWith(
      '/api/social/channels/whatsapp/connect-pair-code', {phone: '+91 90000 00000'});
  });

  test('without pair_code_action there is no phone option', () => {
    const send = mountOverlay();
    send(qr('CODE-1', 1));
    expect(screen.queryByText("Can't scan? Link with phone number")).toBeNull();
  });

  test('connected clears the pairing card for that channel', () => {
    const send = mountOverlay();
    send(qr('CODE-1', 1));
    send({type: 'channel_connected', channel: 'whatsapp', msg_id: 'c-1',
      display_name: 'WhatsApp', message: 'WhatsApp connected.'});
    expect(screen.queryByTestId('qr')).toBeNull();
    expect(screen.getByText('WhatsApp connected')).toBeInTheDocument();
  });
});
