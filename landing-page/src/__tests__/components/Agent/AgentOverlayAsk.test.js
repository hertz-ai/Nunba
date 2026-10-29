/* eslint-disable */
/**
 * An agent's ask, answered on the desktop page (HARTOS
 * integrations.agent_engine.person_ask; docs/design/PERSON_ASK_LIQUID_UI_TOOL.md).
 *
 * Owner, 2026-10-27: "user might also select clips from desktop the mechanism
 * shd be same agnostic of hartos consumer, liqiuid ui shd also fanout".
 * HARTOS sends one card per ask, carrying its `ask_id`, to every surface; the
 * person answers on one, the answer goes to POST /api/agent/approval
 * {ask_id, answer}, and HARTOS then sends `ask.answered` {ask_id}, which drops
 * the card everywhere else.  Reading the ask in the bell (notification.read)
 * is not an answer and drops nothing.
 *
 *   file_request  her picks go to /api/chat-sync/files/push under the ask's
 *                 id (the door takes the purpose from the open ask), then the
 *                 ask is answered with their file ids
 *   approval      a card with an ask_id answers it with {decision}, and never
 *                 turns the camera on
 *   form          a card with an ask_id answers it with {values}
 */

import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';

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
  agentFormApi: {submit: jest.fn(() => Promise.resolve({}))},
}));

const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');

const ASK = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const CLIPS = {
  type: 'file_request',
  msg_id: ASK,
  ask_id: ASK,
  agent_id: '342',
  title: 'Send me the clips for your reel',
  purpose: 'reel_source',
  accept: 'video',
  max_files: 5,
};
const XID = (n) => String(n).repeat(64).slice(0, 64);

let handlers;
function mountOverlay({strict = false} = {}) {
  handlers = {};
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  const overlay = <AgentOverlay navigate={jest.fn()} />;
  render(strict ? <React.StrictMode>{overlay}</React.StrictMode> : overlay);
  return (payload) => act(() => { handlers['agent.ui.update'](payload); });
}

function reply(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function calls(path) {
  return global.fetch.mock.calls.filter(([url]) => url === path);
}

beforeEach(() => {
  localStorage.setItem('access_token', 'tok-owner');
  let n = 0;
  global.fetch = jest.fn((url) => {
    if (url === '/api/chat-sync/files/push') {
      n += 1;
      return reply(200, {file_id: XID(n), purpose: 'reel_source'});
    }
    return reply(200, {status: 'ok', ask_id: ASK});
  });
});

afterEach(() => {
  localStorage.removeItem('access_token');
  delete global.fetch;
});

function pick(...names) {
  const input = screen.getByTestId('liquid-file-request-input');
  const files = names.map((name) => new File(['clip bytes'], name, {type: 'video/mp4'}));
  fireEvent.change(input, {target: {files}});
}

describe('file_request', () => {
  test('her picks go up under the ask\'s id, then the ask is answered with their ids', async () => {
    const send = mountOverlay();
    send(CLIPS);
    expect(screen.getByText('Send me the clips for your reel')).toBeTruthy();
    expect(screen.getByTestId('liquid-file-request-input').getAttribute('accept')).toBe('video/*');

    pick('look1.mp4', 'look2.mp4');

    await waitFor(() => expect(calls('/api/agent/approval')).toHaveLength(1));
    const pushes = calls('/api/chat-sync/files/push');
    expect(pushes).toHaveLength(2);
    for (const [, init] of pushes) {
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer tok-owner');
      expect(init.body.get('ask_id')).toBe(ASK);
      // the door takes the purpose from the open ask, never from the page
      expect(init.body.get('purpose')).toBeNull();
      expect(init.body.get('file').name).toMatch(/^look[12]\.mp4$/);
    }
    const [, answer] = calls('/api/agent/approval')[0];
    expect(answer.headers.Authorization).toBe('Bearer tok-owner');
    expect(JSON.parse(answer.body)).toEqual({ask_id: ASK, answer: {xids: [XID(1), XID(2)]}});
    await waitFor(() => expect(screen.queryByTestId('liquid-file-request')).toBeNull());
  });

  test('a file the desktop refuses keeps the card up and answers nothing', async () => {
    global.fetch = jest.fn((url) => (url === '/api/chat-sync/files/push'
      ? reply(507, {error: 'no_space', message: 'the desktop has no room for it'})
      : reply(200, {status: 'ok'})));
    const send = mountOverlay();
    send(CLIPS);

    pick('look1.mp4');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/no_space|no room/);
    expect(calls('/api/agent/approval')).toHaveLength(0);
    expect(screen.getByTestId('liquid-file-request')).toBeTruthy();
  });

  test('a refused answer (another device answered first) keeps the reason on the card', async () => {
    global.fetch = jest.fn((url) => (url === '/api/chat-sync/files/push'
      ? reply(200, {file_id: XID(1)})
      : reply(409, {status: 'error', reason: 'already_answered'})));
    const send = mountOverlay();
    send(CLIPS);

    pick('look1.mp4');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/already_answered/);
  });

  test('the card stays until it is answered (it is not a toast)', () => {
    jest.useFakeTimers();
    try {
      const send = mountOverlay();
      send(CLIPS);
      act(() => { jest.advanceTimersByTime(60000); });
      expect(screen.getByTestId('liquid-file-request')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  test('newer cards never push an open ask off the page', () => {
    const send = mountOverlay();
    send(CLIPS);
    for (let i = 1; i <= 4; i += 1) {
      send({type: 'notification', msg_id: `n${i}`, title: `Note ${i}`, message: 'x'});
    }
    expect(screen.getByTestId('liquid-file-request')).toBeTruthy();
    expect(screen.queryByText('Note 1')).toBeNull();      // the oldest note went
    expect(screen.getByText('Note 4')).toBeTruthy();
  });

  test('with only asks up, a new card still shows and the oldest ask goes', () => {
    // HARTOS keeps up to three asks open for her (person_ask
    // MAX_OPEN_PER_PERSON), as many as the page shows (review of 715e2184)
    const send = mountOverlay();
    for (let i = 1; i <= 3; i += 1) {
      send({type: 'approval', msg_id: `ask${i}`, ask_id: `ask${i}`, agent_id: '342',
            action: `step_${i}`, title: `Ask ${i}`});
    }
    send({type: 'notification', msg_id: 'n1', title: 'A new note', message: 'x'});
    expect(screen.getByText('A new note')).toBeTruthy();
    expect(screen.queryByText('Ask 1')).toBeNull();
    expect(screen.getByText('Ask 2')).toBeTruthy();
    expect(screen.getByText('Ask 3')).toBeTruthy();
  });
});

describe('an ask pushed aside', () => {
  // HARTOS sends an ask once and the bell cannot answer one, so an ask that
  // stepped aside for a newer card comes back when a slot frees (review of
  // 26d32915, probe R3).
  function threeAsksAndANote(send) {
    for (let i = 1; i <= 3; i += 1) {
      send({type: 'approval', msg_id: `ask${i}`, ask_id: `ask${i}`, agent_id: '342',
            action: `step_${i}`, title: `Ask ${i}`});
    }
    send({type: 'notification', msg_id: 'n1', title: 'A new note', message: 'x'});
    expect(screen.queryByText('Ask 1')).toBeNull();
  }

  test('comes back when the short card that pushed it goes', () => {
    jest.useFakeTimers();
    try {
      const send = mountOverlay();
      threeAsksAndANote(send);
      act(() => { jest.advanceTimersByTime(16000); });
      expect(screen.queryByText('A new note')).toBeNull();
      expect(screen.getByText('Ask 1')).toBeTruthy();
      expect(screen.getByText('Ask 2')).toBeTruthy();
      expect(screen.getByText('Ask 3')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  test('does not come back once it is answered elsewhere', () => {
    const send = mountOverlay();
    threeAsksAndANote(send);
    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: 'ask1'}); });
    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: 'ask2'}); });
    expect(screen.queryByText('Ask 1')).toBeNull();
    expect(screen.queryByText('Ask 2')).toBeNull();
    expect(screen.getByText('Ask 3')).toBeTruthy();
    expect(screen.getByText('A new note')).toBeTruthy();
  });

  test('answered here while it was parked, it does not come back', async () => {
    // She approves Ask 1, a note parks it while the answer is on its way, the
    // node takes the answer and no ask.answered reaches this page (review of
    // 622a31ea, probe P7).
    jest.useFakeTimers();
    try {
      let release;
      global.fetch = jest.fn(() => new Promise((resolve) => {
        release = () => resolve({ok: true, status: 200,
                                 json: () => Promise.resolve({status: 'ok', ask_id: 'ask1'})});
      }));
      const send = mountOverlay();
      send({type: 'approval', msg_id: 'ask1', ask_id: 'ask1', agent_id: '342',
            action: 'step_1', title: 'Ask 1'});
      fireEvent.click(screen.getByText('Approve'));
      expect(global.fetch).toHaveBeenCalledTimes(1);
      for (let i = 2; i <= 3; i += 1) {
        send({type: 'approval', msg_id: `ask${i}`, ask_id: `ask${i}`, agent_id: '342',
              action: `step_${i}`, title: `Ask ${i}`});
      }
      send({type: 'notification', msg_id: 'n1', title: 'A new note', message: 'x'});
      expect(screen.queryByText('Ask 1')).toBeNull();
      await act(async () => { release(); });
      act(() => { jest.advanceTimersByTime(16000); });
      expect(screen.queryByText('A new note')).toBeNull();
      expect(screen.queryByText('Ask 1')).toBeNull();
      expect(screen.getByText('Ask 2')).toBeTruthy();
      expect(screen.getByText('Ask 3')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  test('in StrictMode, asks parked in one batch each come back once', () => {
    // React runs updaters twice in StrictMode; parking and the re-show must
    // be safe to repeat (review of 622a31ea, probe P6).
    jest.useFakeTimers();
    try {
      const send = mountOverlay({strict: true});
      act(() => {
        for (let i = 1; i <= 3; i += 1) {
          handlers['agent.ui.update']({type: 'approval', msg_id: `ask${i}`, ask_id: `ask${i}`,
                                       agent_id: '342', action: `step_${i}`, title: `Ask ${i}`});
        }
        handlers['agent.ui.update']({type: 'notification', msg_id: 'n1', title: 'Note 1', message: 'x'});
        handlers['agent.ui.update']({type: 'notification', msg_id: 'n2', title: 'Note 2', message: 'y'});
      });
      expect(send).toBeTruthy();
      act(() => { jest.advanceTimersByTime(16000); });
      for (let i = 1; i <= 3; i += 1) {
        expect(screen.getAllByText(`Ask ${i}`)).toHaveLength(1);
      }
    } finally {
      jest.useRealTimers();
    }
  });

  test('sent again, it shows once', () => {
    const send = mountOverlay();
    threeAsksAndANote(send);
    send({type: 'approval', msg_id: 'ask1', ask_id: 'ask1', agent_id: '342',
          action: 'step_1', title: 'Ask 1'});
    expect(screen.getAllByText('Ask 1')).toHaveLength(1);
    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: 'ask2'}); });
    expect(screen.getAllByText('Ask 1')).toHaveLength(1);
  });
});

describe('an ask answered anywhere', () => {
  test('ask.answered for the ask drops its card here', () => {
    const send = mountOverlay();
    send(CLIPS);
    expect(screen.getByTestId('liquid-file-request')).toBeTruthy();

    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: ASK}); });

    expect(screen.queryByTestId('liquid-file-request')).toBeNull();
  });

  test('ask.answered for another ask leaves the card', () => {
    const send = mountOverlay();
    send(CLIPS);

    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: 'other'}); });

    expect(screen.getByTestId('liquid-file-request')).toBeTruthy();
  });

  test('reading the ask in the bell (notification.read) is not an answer', () => {
    const send = mountOverlay();
    send(CLIPS);

    if (handlers['notification.read']) {
      act(() => { handlers['notification.read']({user_id: '10202', ids: [ASK]}); });
    }

    expect(screen.getByTestId('liquid-file-request')).toBeTruthy();
  });

  test('an approval card that carries an ask_id answers the ask', async () => {
    const send = mountOverlay();
    send({type: 'approval', msg_id: ASK, ask_id: ASK, agent_id: '342',
          action: 'post_the_reel', title: 'Post today\'s reel?'});

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => expect(calls('/api/agent/approval')).toHaveLength(1));
    const [, init] = calls('/api/agent/approval')[0];
    expect(JSON.parse(init.body)).toEqual({ask_id: ASK, answer: {decision: 'approve'}});
  });

  test('approving an ask never turns the camera on, whatever its action says', async () => {
    const seen = [];
    const onCamera = (e) => seen.push(e.detail);
    window.addEventListener('evt', onCamera);
    try {
      const send = mountOverlay();
      send({type: 'approval', msg_id: ASK, ask_id: ASK, agent_id: '342',
            action: 'post_video_from_camera', title: 'Post the video?'});

      fireEvent.click(screen.getByText('Approve'));

      await waitFor(() => expect(calls('/api/agent/approval')).toHaveLength(1));
      await waitFor(() => expect(screen.queryByText('Approve')).toBeNull());
      expect(seen).toEqual([]);
    } finally {
      window.removeEventListener('evt', onCamera);
    }
  });

  test('a form card that carries an ask_id answers the ask with its values', async () => {
    const send = mountOverlay();
    send({type: 'form', msg_id: ASK, ask_id: ASK, agent_id: '342',
          title: 'Tell me about the reel',
          fields: [{name: 'caption', label: 'Caption', type: 'text'}]});

    fireEvent.change(screen.getByLabelText('Caption'), {target: {value: 'Summer drop'}});
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(calls('/api/agent/approval')).toHaveLength(1));
    const [, init] = calls('/api/agent/approval')[0];
    expect(init.headers.Authorization).toBe('Bearer tok-owner');
    expect(JSON.parse(init.body)).toEqual({ask_id: ASK, answer: {values: {caption: 'Summer drop'}}});
    const agentFormApi = require('../../../services/socialApi').agentFormApi;
    expect(agentFormApi.submit).not.toHaveBeenCalled();
  });
});
