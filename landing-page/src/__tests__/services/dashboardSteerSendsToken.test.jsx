/**
 * Steering a goal (inject, pause, resume, cancel) carries the signed-in
 * user's token, through the same client every other authenticated social
 * call uses (services/axiosFactory's auth interceptor).
 *
 * HARTOS c3651a483 + its follow-up put every steering route behind
 * require_local_or_auth + may_steer: from another machine (the web app on
 * hevolve.ai) no token is a 401, and a token names who may steer.  These
 * clients used bare fetch() with no Authorization header, so a signed-in web
 * user could no longer steer even their own goal.
 *
 * Real axiosFactory + real socialApi + real components; only axios's
 * transport is replaced (an adapter that records each request), so the
 * header asserted is the one the interceptor actually set.
 */
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import React from 'react';

const mockSent = [];
let mockReply = {status: 200, data: {success: true, data: {ok: true}}};
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const real = actual.default || actual;
  const adapter = (config) => {
    mockSent.push(config);
    const {status, data} = mockReply;
    const resp = {data, status, statusText: String(status), headers: {}, config};
    if (status >= 400) {
      const err = new Error(`HTTP ${status}`);
      err.config = config;
      err.response = resp;
      return Promise.reject(err);
    }
    return Promise.resolve(resp);
  };
  const create = (cfg) => real.create({...cfg, adapter});
  // Every request this suite makes goes to the recording adapter: instances
  // (create) AND the default export (axios.get/post), so nothing reaches
  // the network (review of e6e806bf: the suite leaked real requests).
  const wrapped = Object.assign(real.create({adapter}), {
    create, isAxiosError: real.isAxiosError, CancelToken: real.CancelToken,
    isCancel: real.isCancel,
  });
  return {__esModule: true, ...actual, default: wrapped, create};
});

// Every fetch() in this suite answers locally; a test that needs a
// particular reply sets global.fetch itself.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve({}),
  }));
});

// The drawer renders MUI; keep its breakpoint hook out of jsdom's way.
jest.mock('@mui/material/useMediaQuery', () => ({__esModule: true, default: () => false}));

// NunbaChatProvider's surroundings (auth context, realtime, TTS, camera).
// The computer-use projection is driven directly: a live run the user owns.
let mockLiveRun = null;
jest.mock('../../hooks/useComputerActivity', () => ({
  __esModule: true,
  default: () => ({activity: mockLiveRun, liveRun: mockLiveRun}),
}));
jest.mock('../../contexts/SocialContext', () => ({
  __esModule: true,
  useSocial: () => ({currentUser: {id: 'web-user'}}),
  default: {},
}));
jest.mock('../../hooks/useAuthSession', () => ({
  __esModule: true,
  default: () => ({_raw: {}}),
  clearAccessTokenForExpiry: () => {},
}));
// uuid ships ESM that CRA's jest does not transform.
let mockUuidN = 0;
jest.mock('uuid', () => ({v4: () => `uuid-${++mockUuidN}`}));
jest.mock('../../hooks/useCameraFrameStream', () => ({__esModule: true, default: () => {}}));
jest.mock('../../hooks/useTTS', () => ({
  __esModule: true,
  useTTS: () => ({speak: () => {}, stop: () => {}}),
  default: () => ({speak: () => {}, stop: () => {}}),
}));
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: () => () => {}, off: () => {}},
  subscribeChatNew: () => () => {},
}));

// eslint-disable-next-line import/first
import {steerError} from '../../constants/steerOutcome';
// eslint-disable-next-line import/first
import {dashboardApi} from '../../services/socialApi';

const header = (cfg) => {
  const h = cfg.headers || {};
  return typeof h.get === 'function' ? h.get('Authorization') : h.Authorization;
};

beforeEach(() => {
  mockSent.length = 0;
  mockReply = {status: 200, data: {success: true, data: {ok: true}}};
  localStorage.clear();
});

test.each(['inject', 'pause', 'resume', 'cancel'])(
  '%s sends the signed-in token to the goal\'s steering route', async (verb) => {
    localStorage.setItem('access_token', 'web-user-token');
    const out = await dashboardApi.steer('goal/42', verb, {instruction: 'go'});
    expect(out.success).toBe(true);
    expect(mockSent).toHaveLength(1);
    expect(mockSent[0].method).toBe('post');
    expect(mockSent[0].url).toBe(`/dashboard/agents/goal%2F42/${verb}`);
    expect(mockSent[0].baseURL).toMatch(/\/api\/social$/);
    expect(header(mockSent[0])).toBe('Bearer web-user-token');
  });

test('a refusal comes back as the server\'s JSON reason, not a generic error', async () => {
  localStorage.setItem('access_token', 't');
  mockReply = {status: 403, data: {success: false, data: {error: 'this agent belongs to another user'}}};
  const err = await dashboardApi.steer('g', 'pause', {}).catch((e) => e);
  expect(err.data.error).toBe('this agent belongs to another user');
});

test.each([
  ['a refusal (not yours)', {success: false, data: {error: 'agent not found, or not yours to steer', forbidden: true}},
    'You can only steer your own runs.'],
  ['no token (require_auth)', {success: false, error: 'Missing or invalid Authorization header'},
    'Sign in to steer this run.'],
  ['an expired token (require_auth)', {success: false, error: 'Invalid or expired token'},
    'Sign in to steer this run.'],
  ['a run that stopped taking guidance', {success: false, data: {error: 'no live GroupChat registered for this agent (not currently executing)'}},
    'This run is no longer taking guidance.'],
  ['nothing to go on', undefined, 'Guidance not delivered.'],
])('steerError words %s as its outcome', (_label, body, expected) => {
  expect(steerError(body)).toBe(expected);
});

// ── the call sites use it ────────────────────────────────────────────────

// eslint-disable-next-line import/first
import AgentOperationsDrawer from '../../components/Admin/AgentOperationsDrawer';

test('the operations drawer\'s Pause button sends the token', async () => {
  localStorage.setItem('access_token', 'drawer-token');
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve({success: true, data: {
      agent: {id: 'g1', status: 'active', title: 'Goal'}, tree: [],
    }}),
  }));
  render(<AgentOperationsDrawer open agentId="g1" onClose={() => {}} />);
  const pause = await screen.findByRole('button', {name: /pause/i});
  await waitFor(() => expect(pause).not.toBeDisabled());
  await act(async () => { fireEvent.click(pause); });
  const steer = mockSent.find((c) => c.url === '/dashboard/agents/g1/pause');
  expect(steer).toBeTruthy();
  expect(header(steer)).toBe('Bearer drawer-token');
});

const drawerSnapshot = () => jest.fn(() => Promise.resolve({
  ok: true, status: 200,
  json: () => Promise.resolve({success: true, data: {
    agent: {id: 'g1', status: 'active', title: 'Goal'}, tree: [],
    registered: true, messages: [], next_index: 0,
  }}),
}));

async function openConversation() {
  render(<AgentOperationsDrawer open agentId="g1" onClose={() => {}} />);
  await act(async () => {
    fireEvent.click(await screen.findByRole('tab', {name: /conversation/i}));
  });
  fireEvent.change(screen.getByPlaceholderText(/retry the failing step/i),
    {target: {value: 'use the cloud model'}});
}

test("the operations drawer's Inject sends the token", async () => {
  localStorage.setItem('access_token', 'drawer-token');
  global.fetch = drawerSnapshot();
  await openConversation();
  await act(async () => { fireEvent.click(screen.getByRole('button', {name: /send/i})); });
  const steer = mockSent.find((c) => c.url === '/dashboard/agents/g1/inject');
  expect(steer).toBeTruthy();
  expect(header(steer)).toBe('Bearer drawer-token');
  expect(JSON.parse(steer.data).instruction).toBe('use the cloud model');
});

test("the drawer shows why an Inject was refused, and keeps the text", async () => {
  localStorage.setItem('access_token', 'drawer-token');
  mockReply = {status: 403, data: {success: false, data: {error: 'agent not found, or not yours to steer', forbidden: true}}};
  global.fetch = drawerSnapshot();
  await openConversation();
  await act(async () => { fireEvent.click(screen.getByRole('button', {name: /send/i})); });
  expect(await screen.findByText('You can only steer your own runs.')).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/retry the failing step/i).value).toBe('use the cloud model');
});

test("the drawer shows why a Pause was refused", async () => {
  mockReply = {status: 401, data: {success: false, error: 'Missing or invalid Authorization header'}};
  global.fetch = drawerSnapshot();
  render(<AgentOperationsDrawer open agentId="g1" onClose={() => {}} />);
  const pause = await screen.findByRole('button', {name: /pause/i});
  await waitFor(() => expect(pause).not.toBeDisabled());
  await act(async () => { fireEvent.click(pause); });
  expect(await screen.findByText('Sign in to steer this run.')).toBeInTheDocument();
});

// ── the web chat: a signed-in user guiding their own live run ───────────

// eslint-disable-next-line import/first
import NunbaChatProvider, {useNunbaChat} from '../../components/Social/shared/NunbaChat/NunbaChatProvider';

// Mount, then let the provider's startup fetches settle: once the chat
// settings arrive it reloads the thread from storage, which would replace a
// message sent before that.  A person types after the panel is up.
async function renderSettled() {
  render(<NunbaChatProvider><Sender /></NunbaChatProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

function Sender() {
  const {sendMessage, messages} = useNunbaChat();
  return (
    <div>
      <button onClick={() => sendMessage('click the blue button')}>send</button>
      <div data-testid="statuses">{messages.map((m) => `${m.role}:${m.status || ''}:${m.error || ''}`).join('|')}</div>
    </div>
  );
}

test("NunbaChat guidance to the user's live run carries their token", async () => {
  localStorage.setItem('access_token', 'chat-token');
  mockLiveRun = {agent_id: 'my-goal', task_id: 't', phase: 'executing', run_done: false};
  global.fetch = jest.fn(() => Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({})}));
  await renderSettled();
  await act(async () => { fireEvent.click(screen.getByText('send')); });
  const steer = mockSent.find((c) => c.url === '/dashboard/agents/my-goal/inject');
  expect(steer).toBeTruthy();
  expect(header(steer)).toBe('Bearer chat-token');
  expect(JSON.parse(steer.data).instruction).toBe('click the blue button');
  await waitFor(() => expect(screen.getByTestId('statuses').textContent).toMatch(/user:sent:/));
  mockLiveRun = null;
});

test("NunbaChat shows the server's refusal when the run is not the user's", async () => {
  localStorage.setItem('access_token', 'chat-token');
  mockLiveRun = {agent_id: 'their-goal', task_id: 't', phase: 'executing', run_done: false};
  mockReply = {status: 403, data: {success: false, data: {error: 'this agent belongs to another user'}}};
  global.fetch = jest.fn(() => Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({})}));
  await renderSettled();
  await act(async () => { fireEvent.click(screen.getByText('send')); });
  await waitFor(() => expect(screen.getByTestId('statuses').textContent)
    .toMatch(/user:failed:this agent belongs to another user/));
  mockLiveRun = null;
});
