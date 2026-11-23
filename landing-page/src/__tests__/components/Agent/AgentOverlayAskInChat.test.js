/* eslint-disable */
/**
 * An agent's question is part of its own chat while that chat is in front.
 *
 * Owner 2026-11-23: "ideally when the agent is running the question shd be
 * part of chat in all clients".  Android already shows an ask in its chat.
 * On the desktop page, while the asking agent's chat is the one in front
 * (Demopage's current agent is the card's prompt_id, and the card's person
 * is the one signed in), AgentOverlay hands the ask to the chat (onChatAsk)
 * and shows no card for it.  The chat renders it as that agent's message,
 * answered through the same door (POST /api/agent/approval {ask_id,
 * answer}).  When the chat leaves the front the open ask comes back as a
 * card, and goes back into the chat when it returns: never both at once.
 * Consent and credential asks, and any ask with a field that looks like a
 * secret, keep their card.  Whether an ask is still open comes from HARTOS
 * (ask.answered; the read GET /api/agent/approval?ask_id= after a reload),
 * never from the chat's history, and the bubble says how it closed.
 */
import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';

jest.mock('lottie-react', () => ({__esModule: true, default: () => null}));
jest.mock('../../../assets/hourglass-lottie.json', () => ({}), {virtual: true});
jest.mock('../../../pages/chat/TypeWriterSubtitle', () => ({__esModule: true, default: () => null}));
jest.mock('../../../pages/chat/ThinkingProcessContainer', () => ({__esModule: true, default: () => null}));
jest.mock('../../../pages/chat/WorkflowFlowchart', () => ({__esModule: true, default: () => null}));
jest.mock('../../../pages/chat/SetupProgressCard', () => ({__esModule: true, default: () => null}));
jest.mock('lucide-react', () => ({FileText: () => null}));
jest.mock('markdown-to-jsx', () => ({__esModule: true, default: ({children}) => <div>{children}</div>}));
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

const overlayModule = require('../../../components/AgentOverlay/AgentOverlay');
const {default: AgentOverlay, askChatMessage} = overlayModule;
const ChatMessageList = require('../../../pages/chat/ChatMessageList').default;

const CHAT = {promptId: '342', userId: '10202'};
const OTHER_CHAT = {promptId: '999', userId: '10202'};
let n = 0;
const ask = (extra = {}) => {
  n += 1;
  const id = `ask${n}`;
  return {type: 'approval', msg_id: id, ask_id: id, agent_id: '342', prompt_id: '342',
          user_id: '10202', action: 'name_it', title: `Call it Reely ${n}?`,
          description: 'The agent asks for a name.', ...extra};
};

let handlers;
function reply(status, body) {
  return Promise.resolve({ok: status >= 200 && status < 300, status,
                          json: () => Promise.resolve(body)});
}
function posts() {
  return global.fetch.mock.calls.filter(([url, init]) => url === '/api/agent/approval'
                                         && init && init.method === 'POST');
}

// Demopage's part, as written there: the chat's messages and the asks shown
// in it, fed by AgentOverlay's onChatAsk, and the chat drawn by
// ChatMessageList.
function Page({chat, initialMessages = []}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [askStates, setAskStates] = React.useState({});
  const [front, setFront] = React.useState(chat);
  React.useEffect(() => { setFront(chat); }, [chat]);
  const askStatesRef = React.useRef(askStates);
  askStatesRef.current = askStates;
  Page.messages = messages;
  Page.events = Page.events || [];
  // Demopage's handleChatAsk, with the one rule it applies
  // (AgentOverlay.chatMessagesAfterAsk), not a copy of it.
  const onChatAsk = React.useCallback((event) => {
    Page.events.push(event);
    const {askId, state, card} = event;
    setAskStates((prev) => ({...prev, [askId]: {state, card: state === 'open' ? card : undefined}}));
    setMessages((prev) => overlayModule.chatMessagesAfterAsk(prev, event));
  }, []);
  // Demopage's agent switch, as written there (handleButtonClick and the
  // route switch): the chat is cleared to its carried cards, the agent
  // changes, and 100 ms later the agent's stored history replaces the chat,
  // with every ask still open in it put back (withOpenChatAsks).
  Page.switchTo = (next, saved) => {
    setMessages([]);
    setFront(next);
    setTimeout(() => setMessages(overlayModule.withOpenChatAsks(saved, askStatesRef.current)), 100);
  };
  const askIdsToCheck = messages
    .filter((m) => m.type === 'agent_ask' && !m.closed && !askStates[m.askId])
    .map((m) => m.askId);
  return (
    <>
      <div data-testid="chat">
        <ChatMessageList
          messages={messages} setMessages={setMessages} isRequestInFlight={false}
          currentThinkingId={null} animatingMessageIndex={-1} duration={0} isTextMode
          videoUrl="" idleVideoUrl="idle.mp4" progress={0} messagesEndRef={{current: null}}
          onPdfClick={jest.fn()} onImageClick={jest.fn()} onImgError={jest.fn()}
          onRetryMessage={jest.fn()} onDeleteMessage={jest.fn()} setCodeContent={jest.fn()}
          askStates={askStates} />
      </div>
      <div data-testid="overlay">
        <AgentOverlay navigate={jest.fn()} chatAsks={front} onChatAsk={onChatAsk}
                      askIdsToCheck={askIdsToCheck} />
      </div>
    </>
  );
}

function mount(chat = CHAT, initialMessages) {
  handlers = {};
  Page.events = [];
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => { handlers[topic] = cb; return () => {}; });
  const view = render(<Page chat={chat} initialMessages={initialMessages} />);
  const send = (payload) => act(() => { handlers['agent.ui.update'](payload); });
  return {send, rerender: (c) => view.rerender(<Page chat={c} initialMessages={initialMessages} />)};
}

const inChat = (text) => !!screen.getByTestId('chat').textContent.includes(text);
const inOverlay = (text) => !!screen.getByTestId('overlay').textContent.includes(text);

beforeEach(() => {
  localStorage.setItem('access_token', 'tok-owner');
  global.fetch = jest.fn(() => reply(200, {status: 'ok'}));
});
afterEach(() => {
  localStorage.removeItem('access_token');
  delete global.fetch;
});

describe('the open agent\'s question is its chat\'s message', () => {
  test('it renders in the chat with its answer buttons, and no card is shown for it', () => {
    const {send} = mount();
    const q = ask();
    send(q);
    const bubble = screen.getByTestId('chat-ask');
    expect(bubble.getAttribute('data-ask-state')).toBe('open');
    expect(inChat(q.title)).toBe(true);
    expect(inOverlay(q.title)).toBe(false);
    expect(screen.getAllByText('Approve')).toHaveLength(1);
  });

  test('the same ask sent again is still one message and no card', () => {
    const {send} = mount();
    const q = ask();
    send(q);
    send({...q});
    expect(screen.getAllByTestId('chat-ask')).toHaveLength(1);
    expect(inOverlay(q.title)).toBe(false);
  });

  test('its answer goes through the approval door, as her, and the bubble says it was answered here', async () => {
    const {send} = mount();
    const q = ask();
    send(q);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const [, init] = posts()[0];
    expect(init.headers.Authorization).toBe('Bearer tok-owner');
    expect(JSON.parse(init.body)).toEqual({ask_id: q.ask_id, answer: {decision: 'approve'}});
    await waitFor(() => expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('here'));
    expect(inChat('Answered here.')).toBe(true);
    expect(screen.queryByText('Approve')).toBeNull();
    expect(inOverlay(q.title)).toBe(false);
  });

  test('another agent\'s ask, another person\'s, or a consent ask keeps its card', () => {
    const {send} = mount();
    const other = ask({prompt_id: '999', title: 'Other agent asks?'});
    const theirs = ask({user_id: '777', title: 'Their question?'});
    const consent = {type: 'consent.request', ask_id: 'c1', msg_id: 'c1', prompt_id: '342',
                     user_id: '10202', title: 'Allow the camera?', consent_type: 'camera'};
    send(other);
    send(theirs);
    send(consent);
    expect(screen.queryAllByTestId('chat-ask')).toHaveLength(0);
    expect(inOverlay('Other agent asks?')).toBe(true);
    expect(inOverlay('Their question?')).toBe(true);
  });
});

// Review of a038f23a: the chat's message passed no-op callbacks, so a form or
// file ask could not be closed while its chat was in front.  It has the
// card's own Dismiss (dismissed everywhere, as the card's X does), and no
// Later: the question is part of the chat.
describe('closing an ask from the chat', () => {
  test('a form ask in the chat has Dismiss: it dismisses everywhere, as her, and says it was dismissed', async () => {
    const {send} = mount();
    const q = ask({type: 'form', title: 'Your child\'s age?',
                   fields: [{name: 'age', label: 'Age', type: 'text'}]});
    send(q);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][1].headers.Authorization).toBe('Bearer tok-owner');
    expect(JSON.parse(posts()[0][1].body)).toEqual({ask_id: q.ask_id, dismiss: true});
    // Review of e8a527f3: a dismissal said "Answered here.".
    expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('dismissed');
    expect(inChat('Dismissed here.')).toBe(true);
    expect(inChat('Answered here.')).toBe(false);
    expect(inOverlay(q.title)).toBe(false);
  });

  test('put off with the card\'s Later while its chat was away: back in the chat it says so, and it returns after the period', () => {
    // Review of e8a527f3: the bubble said "Waiting for your answer on its
    // card." while the put-off card was hidden.
    jest.useFakeTimers();
    try {
      const {send, rerender} = mount();
      const q = ask();
      send(q);
      rerender(OTHER_CHAT);
      expect(inOverlay(q.title)).toBe(true);
      fireEvent.click(screen.getByText('Later'));
      expect(inOverlay(q.title)).toBe(false);
      rerender(CHAT);
      const bubble = screen.getByTestId('chat-ask');
      expect(bubble.getAttribute('data-ask-state')).toBe('later');
      expect(inChat('Waiting for your answer on its card.')).toBe(false);
      expect(inChat('Put off for now')).toBe(true);
      expect(screen.queryByText('Approve')).toBeNull();
      act(() => { jest.advanceTimersByTime(5 * 60 * 1000); });
      expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('open');
      expect(screen.getAllByText('Approve')).toHaveLength(1);
      expect(inOverlay(q.title)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('an approval ask in the chat offers no Later', () => {
    const {send} = mount();
    send(ask());
    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.queryByText('Later')).toBeNull();
  });

  test('on its card (no chat in front) the approval ask keeps Later', () => {
    const {send} = mount(null);
    send(ask());
    expect(screen.getByText('Later')).toBeTruthy();
  });
});

// Review of 179c2163 (rv_179c): the wording it added was not pinned.
describe('what a put-off or dismissed ask\'s bubble says, pinned', () => {
  test('P3: put off while its chat is away and the period ends with the chat still away: card back, bubble waits on its card; then into the chat when it opens', () => {
    jest.useFakeTimers();
    try {
      const {send, rerender} = mount();
      const q = ask();
      send(q);
      rerender(OTHER_CHAT);
      expect(inOverlay(q.title)).toBe(true);
      fireEvent.click(screen.getByText('Later'));
      expect(inOverlay(q.title)).toBe(false);
      expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('later');
      act(() => { jest.advanceTimersByTime(5 * 60 * 1000); });
      expect(inOverlay(q.title)).toBe(true);
      expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('moved');
      expect(inChat('Waiting for your answer on its card.')).toBe(true);
      rerender(CHAT);
      expect(inOverlay(q.title)).toBe(false);
      expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('open');
      expect(screen.getAllByText('Approve')).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test('the put-off wording names the Later period', () => {
    expect(overlayModule.askClosedText('later')).toBe(
      `Put off for now: it comes back in ${overlayModule.ASK_LATER_MS / 60000} minutes.`);
  });

  test('a drop\'s reason never overrides "Dismissed here." (nor "Answered here.")', () => {
    expect(overlayModule.askClosedText('dismissed', 'expired')).toBe('Dismissed here.');
    expect(overlayModule.askClosedText('here', 'expired')).toBe('Answered here.');
    expect(overlayModule.askClosedText('elsewhere', 'expired')).toBe('expired');
  });

  test('an ask that never had a bubble posts no later or moved notice', () => {
    jest.useFakeTimers();
    try {
      const {send} = mount(OTHER_CHAT);
      const q = ask();
      send(q);
      fireEvent.click(screen.getByText('Later'));
      act(() => { jest.advanceTimersByTime(5 * 60 * 1000); });
      expect(inOverlay(q.title)).toBe(true);
      expect(Page.events.filter((e) => e.askId === q.ask_id)).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('the shared handler: a closed state is written once, a later one with the same state changes nothing', () => {
    const q = ask();
    const one = overlayModule.chatMessagesAfterAsk([], {askId: q.ask_id, state: 'open', card: q});
    const closed = overlayModule.chatMessagesAfterAsk(one, {askId: q.ask_id, state: 'dismissed'});
    expect(closed[0].closed).toBe('dismissed');
    expect(overlayModule.chatMessagesAfterAsk(closed, {askId: q.ask_id, state: 'dismissed'})).toBe(closed);
    expect(overlayModule.chatMessagesAfterAsk(closed, {askId: q.ask_id, state: 'later'})).toBe(closed);
    expect(overlayModule.chatMessagesAfterAsk(one, {askId: q.ask_id, state: 'open', card: q})).toBe(one);
  });
});

describe('a secret never enters the chat', () => {
  test('an ask with a secret-looking field keeps its card', () => {
    const {send} = mount();
    send(ask({type: 'form', title: 'Your bank login?',
              fields: [{name: 'password', label: 'Password', type: 'password'}]}));
    send(ask({type: 'form', title: 'Your API key?',
              fields: [{name: 'key', label: 'API key', type: 'text'}]}));
    expect(screen.queryAllByTestId('chat-ask')).toHaveLength(0);
    expect(inOverlay('Your bank login?')).toBe(true);
    expect(inOverlay('Your API key?')).toBe(true);
  });

  test('what she types in the chat goes to the door and never into the chat\'s history', async () => {
    const {send} = mount();
    const q = ask({type: 'form', title: 'Your child\'s name?',
                   fields: [{name: 'child', label: 'Child', type: 'text'}]});
    send(q);
    fireEvent.change(screen.getByLabelText('Child'), {target: {value: 'Aarav-7731'}});
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body)).toEqual(
      {ask_id: q.ask_id, answer: {values: {child: 'Aarav-7731'}}});
    await waitFor(() => expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('here'));
    expect(JSON.stringify(Page.messages)).not.toContain('Aarav-7731');
    expect(JSON.stringify(askChatMessage(q))).not.toContain('Aarav-7731');
  });
});

describe('whether it is open is HARTOS\'s word, not the history\'s', () => {
  test('closed by HARTOS, not from this window: the bubble says it is closed, neutrally, and offers no answer', () => {
    // The same drop comes for an answer on another device, an expiry and a
    // finished CREATE run, so this window does not claim which (review of
    // a038f23a: it said "Answered on another device" for all three).
    const {send} = mount();
    const q = ask();
    send(q);
    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: q.ask_id}); });
    expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('elsewhere');
    expect(inChat('This question is closed.')).toBe(true);
    expect(inChat('Answered on another device')).toBe(false);
    expect(inChat(q.title)).toBe(true);                     // never silently gone
    expect(screen.queryByText('Approve')).toBeNull();
  });

  test('a drop that says why is shown with its reason', () => {
    const {send} = mount();
    const q = ask();
    send(q);
    act(() => { handlers['ask.answered']({type: 'ask.answered', ask_id: q.ask_id,
                                          reason: 'Answered on your phone.'}); });
    expect(inChat('Answered on your phone.')).toBe(true);
  });

  test('after a reload, an ask still open is read back as open, and one that is not as gone', async () => {
    const open = ask();
    const gone = ask();
    global.fetch = jest.fn((url) => {
      if (url === `/api/agent/approval?ask_id=${open.ask_id}`) return reply(200, open);
      if (url === `/api/agent/approval?ask_id=${gone.ask_id}`) return reply(404, {reason: 'gone'});
      return reply(200, {status: 'ok'});
    });
    const history = [askChatMessage(open), askChatMessage(gone)];
    mount(CHAT, history);
    await waitFor(() => expect(screen.getAllByTestId('chat-ask').map(
      (b) => b.getAttribute('data-ask-state'))).toEqual(['open', 'gone']));
    expect(screen.getAllByText('Approve')).toHaveLength(1);
    expect(inChat('No longer open')).toBe(true);
    expect(inOverlay(open.title)).toBe(false);
  });

  test('a history that says closed is not read again and never reopens', () => {
    global.fetch = jest.fn(() => reply(200, ask()));
    const q = ask();
    mount(CHAT, [{...askChatMessage(q), closed: 'elsewhere'}]);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('elsewhere');
  });
});

describe('hand-off: the ask follows its chat, never shown both ways', () => {
  test('the chat leaves the front: the open ask becomes a card; it comes back: the card goes', () => {
    const {send, rerender} = mount();
    const q = ask();
    send(q);
    expect(inChat(q.title) && !inOverlay(q.title)).toBe(true);

    rerender(OTHER_CHAT);
    expect(inOverlay(q.title)).toBe(true);
    expect(screen.queryByTestId('chat-ask') === null
           || screen.getByTestId('chat-ask').getAttribute('data-ask-state') !== 'open').toBe(true);

    rerender(CHAT);
    expect(inOverlay(q.title)).toBe(false);
    expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('open');
  });

  test('an ask that arrived while its chat was away goes into the chat when it opens', () => {
    const {send, rerender} = mount(OTHER_CHAT);
    const q = ask();
    send(q);
    expect(inOverlay(q.title)).toBe(true);
    expect(screen.queryAllByTestId('chat-ask')).toHaveLength(0);
    rerender(CHAT);
    expect(inOverlay(q.title)).toBe(false);
    expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('open');
  });

  // Review of a038f23a, critical: the overlay moved the card into the chat,
  // then Demopage's agent switch replaced the chat with the agent's stored
  // history 100 ms later, which wiped the message, and HARTOS does not send
  // the same ask again: she opened the asking agent's chat and saw nothing.
  test('opening the asking agent\'s chat (the real switch, its history load 100 ms later) keeps the ask', async () => {
    jest.useFakeTimers();
    try {
      const {send} = mount(OTHER_CHAT);
      const q = ask();
      send(q);
      expect(inOverlay(q.title)).toBe(true);
      const saved = [{type: 'assistant', content: 'an earlier reply of agent 342',
                      timestamp: new Date(Date.now() - 60000).toISOString()}];
      act(() => { Page.switchTo(CHAT, saved); });
      act(() => { jest.advanceTimersByTime(150); });
      expect(screen.getAllByText('Approve')).toHaveLength(1);
      expect(inOverlay(q.title)).toBe(false);
      expect(screen.getByTestId('chat-ask').getAttribute('data-ask-state')).toBe('open');
      expect(inChat('an earlier reply of agent 342')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('switching away and back, with a history that lacks the ask, keeps it once', async () => {
    jest.useFakeTimers();
    try {
      const {send} = mount(CHAT);
      const q = ask();
      send(q);
      act(() => { Page.switchTo(OTHER_CHAT, []); });
      act(() => { jest.advanceTimersByTime(150); });
      expect(inOverlay(q.title)).toBe(true);
      act(() => { Page.switchTo(CHAT, []); });
      act(() => { jest.advanceTimersByTime(150); });
      expect(screen.getAllByTestId('chat-ask')).toHaveLength(1);
      expect(screen.getAllByText('Approve')).toHaveLength(1);
      expect(inOverlay(q.title)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('withOpenChatAsks: every ask open in the chat that the history lacks, once, nothing else', () => {
    const {withOpenChatAsks} = overlayModule;
    const q1 = ask();
    const q2 = ask();
    const history = [{type: 'assistant', content: 'hi'}, askChatMessage(q1)];
    const states = {[q1.ask_id]: {state: 'open', card: q1}, [q2.ask_id]: {state: 'open', card: q2},
                    gone1: {state: 'gone'}, moved1: {state: 'moved'}};
    const out = withOpenChatAsks(history, states);
    expect(out.filter((m) => m.type === 'agent_ask').map((m) => m.askId)).toEqual([q1.ask_id, q2.ask_id]);
    expect(withOpenChatAsks(out, states)).toBe(out);         // nothing missing: the same list
    expect(withOpenChatAsks(null, {})).toEqual([]);
  });

  test('with no agent chat in front every ask is a card, as before', () => {
    const {send} = mount(null);
    const q = ask();
    send(q);
    expect(inOverlay(q.title)).toBe(true);
    expect(screen.queryAllByTestId('chat-ask')).toHaveLength(0);
  });
});

// Demopage's provider tree is not mountable here (pages/demopageCameraFreed),
// so its wiring is pinned: the overlay is told the chat in front, reports the
// chat's asks to it, and is given the history's asks to read back.
describe('Demopage hands the open agent\'s asks to its chat', () => {
  const fs = require('fs');
  const path = require('path');
  const SRC = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'pages', 'Demopage.js'), 'utf8');
  const at = SRC.indexOf('<AgentOverlay');
  const mountTag = SRC.slice(at, SRC.indexOf('/>', at));

  test('the overlay gets the chat in front, the chat\'s callback and the asks to read back', () => {
    expect(mountTag).toMatch(/chatAsks=\{currentAgent\?\.prompt_id != null/);
    expect(mountTag).toMatch(/userId: String\(effectiveUserId/);
    expect(mountTag).toMatch(/onChatAsk=\{handleChatAsk\}/);
    expect(mountTag).toMatch(/askIdsToCheck=\{askIdsToCheck\}/);
  });

  test('the chat keeps an ask through the one shared rule, and draws it from askStates', () => {
    expect(SRC).toMatch(/setMessages\(\(prev\) => chatMessagesAfterAsk\(prev, event\)\)/);
    expect(SRC).toMatch(/askStates=\{askStates\}/);
  });
});

describe('Demopage puts the open asks back after each agent-switch history load', () => {
  const fs = require('fs');
  const path = require('path');
  const SRC = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'pages', 'Demopage.js'), 'utf8');

  test('both switch sites load the history through withOpenChatAsks, from the live ask states', () => {
    const loads = SRC.match(/setMessages\(withOpenChatAsks\(\s*mergeCarriedSetupCards\(savedMessages, carriedSetup\),\s*askStatesRef\.current\)\)/g) || [];
    expect(loads).toHaveLength(2);
    expect(SRC).not.toMatch(/setMessages\(mergeCarriedSetupCards\(savedMessages, carriedSetup\)\)/);
    expect(SRC).toMatch(/askStatesRef\.current = askStates;/);
  });
});
