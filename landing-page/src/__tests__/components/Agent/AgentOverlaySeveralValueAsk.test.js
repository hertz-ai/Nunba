/* eslint-disable */
/**
 * AgentOverlay: a channel's one ask for all the values it needs.
 *
 * HARTOS post_to_channel asks the owner for every value a channel such as
 * Mattermost or Microsoft Teams needs on ONE credential card (scope
 * 'secret:<CHANNEL>_SETUP').  Its note names them, consent_service._emit:
 *   fields: '[{"name": "server_url", "label": "...", "secret": false}, ...]'
 * (the same JSON string the phone's push carries), and request_id.  The
 * owner's answer {consent_type, request_id, values: {name: typed}} starts
 * the channel there and then; nothing is stored in this computer's vault
 * (the channel's binding keeps them).  Before this the card had one
 * password input: it stored that one value under '<CHANNEL>_SETUP' and
 * granted with no values (review of HARTOS 2ba06d991, rv_chan).
 *
 * Pins:
 *   1. One input per field the ask names, labelled as it says, masked only
 *      when it is secret; no single password input.
 *   2. Accept stays off until every field holds something.
 *   3. Accept sends every value with the ask's request_id, never to the
 *      vault, and the card closes once it is taken.
 *   4. A refused answer stays on the card with the reason and the values.
 *   5. An ask that names no fields keeps the one password input.
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
const {consentApi, chatApi} = require('../../../services/socialApi');

const TOKEN = 'pat-fake-123';
const SEVERAL_ASK = {
  type: 'consent.request',
  msg_id: 'consent.request:row-31',
  request_id: 'row-31',
  node_id: 'cccc9d3e55f0a7c2',
  consent_type: 'credential',
  scope: 'secret:MATTERMOST_SETUP',
  agent_id: null,
  reason: 'Mattermost settings is needed for post_to_channel. Needed to ' +
    'connect Mattermost: Mattermost Server URL, Personal Access Token.',
  fields: JSON.stringify([
    {name: 'server_url', label: 'Mattermost Server URL', secret: false},
    {name: 'access_token', label: 'Personal Access Token', secret: true},
  ]),
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

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), {target: {value}});
}

beforeEach(() => {
  jest.clearAllMocks();
  chatApi.vaultStore.mockResolvedValue({success: true});
  consentApi.grant.mockResolvedValue({});
});

describe('AgentOverlay consent.request: a channel ask for several values', () => {
  test('shows one input per field the ask names, masked only when secret', async () => {
    const send = mountOverlay();
    send(SEVERAL_ASK);
    await screen.findByText(SEVERAL_ASK.reason);

    expect(screen.getByLabelText('Mattermost Server URL')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Personal Access Token')).toHaveAttribute('type', 'password');
    expect(screen.queryByTestId('liquid-consent-secret')).toBeNull();
  });

  test('Accept stays off until every field holds something', async () => {
    const send = mountOverlay();
    send(SEVERAL_ASK);
    await screen.findByText(SEVERAL_ASK.reason);
    const accept = screen.getByTestId('liquid-consent-grant');

    expect(accept).toBeDisabled();
    fill('Mattermost Server URL', 'https://mm.example');
    expect(accept).toBeDisabled();
    fill('Personal Access Token', '   ');
    expect(accept).toBeDisabled();
    fill('Personal Access Token', TOKEN);
    expect(accept).not.toBeDisabled();
  });

  test('Accept answers the ask with every value and stores nothing in the vault', async () => {
    const send = mountOverlay();
    send(SEVERAL_ASK);
    await screen.findByText(SEVERAL_ASK.reason);
    fill('Mattermost Server URL', '  https://mm.example ');
    fill('Personal Access Token', TOKEN);
    fireEvent.click(screen.getByTestId('liquid-consent-grant'));

    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'credential',
        request_id: 'row-31',
        values: {server_url: 'https://mm.example', access_token: TOKEN},
      });
    });
    expect(chatApi.vaultStore).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText(SEVERAL_ASK.reason)).not.toBeInTheDocument();
    });
  });

  test('a refused answer stays on the card with its reason and the values', async () => {
    consentApi.grant.mockImplementationOnce(() => Promise.reject({
      response: {status: 409, data: {error: 'mattermost was not started: the server refused the token'}},
      message: 'Request failed with status code 409',
    }));
    const send = mountOverlay();
    send(SEVERAL_ASK);
    await screen.findByText(SEVERAL_ASK.reason);
    fill('Mattermost Server URL', 'https://mm.example');
    fill('Personal Access Token', TOKEN);
    fireEvent.click(screen.getByTestId('liquid-consent-grant'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(SEVERAL_ASK.reason)).toBeInTheDocument();
    expect(screen.getByLabelText('Personal Access Token')).toHaveValue(TOKEN);
    expect(screen.getByTestId('liquid-consent-grant')).not.toBeDisabled();
  });

  test('an ask whose fields arrive as a list reads the same', async () => {
    const send = mountOverlay();
    send({...SEVERAL_ASK, msg_id: 'consent.request:row-32', request_id: 'row-32',
      fields: JSON.parse(SEVERAL_ASK.fields)});
    await screen.findByText(SEVERAL_ASK.reason);
    expect(screen.getByLabelText('Personal Access Token')).toHaveAttribute('type', 'password');
  });

  test('an ask that names no fields keeps its one password input', async () => {
    const send = mountOverlay();
    const {fields, ...one} = SEVERAL_ASK;
    send({...one, msg_id: 'consent.request:row-33', scope: 'secret:SITE_PASSWORD'});
    await screen.findByText(SEVERAL_ASK.reason);
    expect(screen.getByTestId('liquid-consent-secret')).toHaveAttribute('type', 'password');
    expect(screen.queryByLabelText('Personal Access Token')).toBeNull();
  });
});
