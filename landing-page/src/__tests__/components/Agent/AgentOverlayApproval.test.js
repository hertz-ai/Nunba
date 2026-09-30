/* eslint-disable */
/**
 * AgentOverlay 'approval' card (ApprovalOverlay): an answer that does not
 * reach HARTOS stays on the card and says so.
 *
 * The card POSTs {agent_id, action, decision} to /api/agent/approval, where
 * HARTOS agent_approval records it (ConsentService.record_capability_
 * decision).  Its .catch(() => {}) closed the card whatever happened, so a
 * 404 (live 2026-09-26, before Nunba b04e5f39) or a 500 looked exactly like
 * an answer that was written: nothing recorded, nothing on screen.
 *
 * "Later" is not an answer: HARTOS accepts approve | deny only and refuses
 * 'later' with 400 (Nunba tests/test_inprocess_dispatch_reachable.py pins
 * that), so it closes the card here and sends nothing, like "Not now" on
 * the consent card.
 */

import React from 'react';
import {render, screen, fireEvent, act, waitFor, cleanup} from '@testing-library/react';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(), decline: jest.fn()},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  chatApi: {vaultStore: jest.fn()},
}));

const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');

const CARD = {
  type: 'approval',
  msg_id: 'approval-1',
  agent_id: '42',
  action: 'enable_camera',
  title: 'Camera access',
  description: 'The agent wants to see through your camera.',
};

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

function reply(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

let cameraEvents;
const onCamera = (e) => cameraEvents.push(e.detail);

beforeEach(() => {
  cameraEvents = [];
  window.addEventListener('evt', onCamera);
  global.fetch = jest.fn(() => reply(200, {status: 'approved'}));
});

afterEach(() => {
  window.removeEventListener('evt', onCamera);
  delete global.fetch;
});

describe('ApprovalOverlay', () => {
  test('an Approve that HARTOS records closes the card', async () => {
    const send = mountOverlay();
    send(CARD);
    fireEvent.click(await screen.findByRole('button', {name: 'Approve'}));

    await waitFor(() => {
      expect(screen.queryByText(CARD.description)).not.toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      agent_id: '42', action: 'enable_camera', decision: 'approve'});
    expect(cameraEvents).toEqual([{approved: true, user_id: '42'}]);
  });

  test('the decision carries the signed-in Bearer, and none when signed out', async () => {
    for (const [token, expected] of [['tok-1', 'Bearer tok-1'], [null, undefined]]) {
      global.fetch = jest.fn(() => reply(200, {status: 'approved'}));
      if (token) localStorage.setItem('access_token', token);
      else localStorage.removeItem('access_token');
      const send = mountOverlay();
      send(CARD);
      fireEvent.click(await screen.findByRole('button', {name: 'Approve'}));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe(expected);
      cleanup();
    }
    localStorage.removeItem('access_token');
  });

  test('an Approve refused by the server stays on the card and says why', async () => {
    global.fetch = jest.fn(() => reply(500, {status: 'error', reason: 'db locked'}));
    const send = mountOverlay();
    send(CARD);
    fireEvent.click(await screen.findByRole('button', {name: 'Approve'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('db locked');
    expect(screen.getByText(CARD.description)).toBeInTheDocument();
    // Nothing was recorded, so the camera is not started either.
    expect(cameraEvents).toEqual([]);
    // The owner can try again.
    expect(screen.getByRole('button', {name: 'Approve'})).not.toBeDisabled();
  });

  test('a Deny that cannot reach the server stays on the card and says so', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')));
    const send = mountOverlay();
    send(CARD);
    fireEvent.click(await screen.findByRole('button', {name: 'Deny'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch');
    expect(screen.getByText(CARD.description)).toBeInTheDocument();
  });

  test('Later closes the card and sends nothing (HARTOS has no "later")', async () => {
    const send = mountOverlay();
    send(CARD);
    fireEvent.click(await screen.findByRole('button', {name: 'Later'}));

    await waitFor(() => {
      expect(screen.queryByText(CARD.description)).not.toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(cameraEvents).toEqual([]);
  });
});
