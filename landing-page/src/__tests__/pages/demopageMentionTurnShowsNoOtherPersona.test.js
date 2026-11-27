/**
 * After an @mention switches the chat to another agent, the header never
 * names the previous agent's persona.
 *
 * Review of d899016f (M1): handleSend's @mention branch switches the agent
 * and keeps the messages on screen; a /chat reply's message kept no agent,
 * so the header (components/chat/AgentPersonaLabel) read the previous
 * agent's 'Parent' under the new agent's name, while the new agent's turn
 * was waiting and after its reply named no persona.
 *
 * Demopage is too large to render in a unit test, so handleSend and the
 * storage helper it calls are cut out of Demopage.js and run as written, with
 * the page's state stubbed (the harness of
 * demopageMentionTurnGoesToMentionedAgent.test.js).  Two turns run on one
 * chat: a turn to the open agent whose reply names 'Parent', then an
 * @mention turn to the other agent.  What is checked is the header the real
 * AgentPersonaLabel draws from the page's messages.
 */
import React from 'react';
import {render} from '@testing-library/react';

import AgentPersonaLabel from '../../components/chat/AgentPersonaLabel';

const fs = require('fs');
const path = require('path');

const {rememberServerPromptId} = require('../../utils/promptId');
const chatRetry = require('../../utils/chatRetry');
const {holdsAgentChat} = require('../../utils/serverChatHistory');
const {repeatsShownMessage} = require('../../constants/chatBubble');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

function cut(start, end) {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b);
}

const STORAGE = cut('  const getChatStorageKey = (promptId) => {', '  const readLocalMessages = (promptId) => {');
const SEND = cut('  const handleSend = async (how) => {', '  // Keep ref in sync for queue processor');

// The speech agent is open; the person there is the parent.
const SPEECH = {prompt_id: 95568353503, name: 'Speech Buddy', type: 'local'};
const COACH = {prompt_id: 70000000001, name: 'Word Coach', type: 'local'};

// One chat page with the speech agent open.  send(text, reply) is the person
// typing text and pressing send, /chat answering `reply`.  The messages stay
// across sends, as on the page.
function page() {
  let msgs = [];
  const out = {waiting: null};
  const messagesRef = {current: msgs};
  out.messages = () => msgs;
  out.send = (text, reply) => {
    const scope = {
      inputMessage: text,
      fileUrl: null, userImage: null, pdffileUrl: null,
      currentAgent: SPEECH,
      allAgents: [SPEECH, COACH],
      agentData: SPEECH,
      loading: false, engineReady: true, agentsLoading: false,
      token: 'token', isGuestMode: false,
      effectiveUserId: 'user-1', decryptedUserId: 'user-1',
      conversationId: 'conv-1', mediaMode: 'text', intelligencePreference: 'local_only',
      ttsEnabled: false,
      lastMessageSentAtRef: {current: 0}, chatMountAtRef: {current: 0},
      requestIdRef: {current: null}, textareaRef: {current: null},
      messagesRef, announcedCapsRef: {current: new Set()},
      loadingRetryRef: {current: 0}, loadingRetryTimersRef: {current: []},
      setMessages: (v) => { msgs = typeof v === 'function' ? v(msgs) : v; messagesRef.current = msgs; },
      setCurrentAgent: () => {},
      setDuration: () => {}, setAnimatingMessageIndex: () => {},
      setCurrentThinkingId: () => {}, setThinkingStartTime: () => {},
      setMessageQueue: () => {}, setInputMessage: () => {},
      setShowAgentMentionList: () => {}, setRequestId: () => {}, setLoading: () => {},
      setShouldScroll: () => {}, setWaitingText: () => {},
      setUploadedPdf: () => {}, setUserImage: () => {}, setFileUrl: () => {},
      setPdfFile: () => {}, setpdfFileUrl: () => {}, setIsModalOpen: () => {},
      setIsRequestInFlight: () => {}, setAllAgents: () => {},
      setAutoContinueFlag: () => {}, setSecretRequest: () => {},
      getTtsAudioElement: () => null,
      // A new turn stops a live talking face (utils/liveAvatar, d7f66e18).
      stopLiveAvatar: () => {},
      tts: {isSpeaking: false, stop: () => {}, isAvailable: true, speak: () => Promise.resolve()},
      logger: {log: () => {}, warn: () => {}},
      console: {log: () => {}, warn: () => {}, error: () => {}},
      ENGINE_BOOT_GRACE_MS: 20000,
      startTurn: chatRetry.startTurn,
      MAX_RETRIES: chatRetry.MAX_RETRIES,
      getBackoff: chatRetry.getBackoff,
      classifyError: chatRetry.classifyError,
      EMPTY_REPLY_REASON: chatRetry.EMPTY_REPLY_REASON,
      holdsAgentChat,
      repeatsShownMessage, // the reply shows once (demopageReplyShowsOnce)
      rememberServerPromptId,
      updateMessageStatus: () => {},
      chatApi: {
        // The header while the turn waits for its reply.
        chat: () => { out.waiting = [...msgs]; return Promise.resolve(reply); },
        syncAgents: () => Promise.resolve(),
      },
      fetch: () => Promise.resolve({}),
      navigate: () => {},
      handleDataReceived: () => {},
      pushNotification: () => {},
      scheduleLoadingRetry: () => null,
      shouldSpeakLocalReply: () => false,
      isDraftReply: () => false,
      hasServerAudioPayload: () => false,
      realtimeService: {connected: true},
      awaitPushedReply: () => {},
      setTimeout: (cb) => { cb(); return 0; },
    };
    const names = Object.keys(scope);
    // eslint-disable-next-line no-new-func
    const handleSend = new Function(...names, `${STORAGE}\n${SEND}\nreturn handleSend;`)(
      ...names.map((n) => scope[n]));
    return handleSend();
  };
  return out;
}

function header(agent, messages) {
  const {container, unmount} = render(
    <AgentPersonaLabel name={agent.name} promptId={agent.prompt_id} messages={messages} />);
  const text = container.textContent;
  unmount();
  return text;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("an @mention switch never shows the previous agent's persona", () => {
  test("the speech agent's reply names the parent, under its own name", async () => {
    const chat = page();
    await chat.send('hello', {text: 'Hello! Shall we start?', source: 'local', persona: 'Parent'});
    expect(header(SPEECH, chat.messages())).toBe('Speech Buddy · Parent');
  });

  test("while the mentioned agent's turn waits, its header names no persona", async () => {
    const chat = page();
    await chat.send('hello', {text: 'Hello! Shall we start?', source: 'local', persona: 'Parent'});
    await chat.send(`@${COACH.prompt_id} hi`, {text: 'Hi, I am here.', source: 'local'});
    expect(header(COACH, chat.waiting)).toBe('');
  });

  test("the mentioned agent's reply that names no persona leaves its header without one", async () => {
    const chat = page();
    await chat.send('hello', {text: 'Hello! Shall we start?', source: 'local', persona: 'Parent'});
    await chat.send(`@${COACH.prompt_id} hi`, {text: 'Hi, I am here.', source: 'local'});
    expect(header(COACH, chat.messages())).toBe('');
  });

  test("the mentioned agent's reply that names a persona is the one shown", async () => {
    const chat = page();
    await chat.send('hello', {text: 'Hello! Shall we start?', source: 'local', persona: 'Parent'});
    await chat.send(`@${COACH.prompt_id} hi`, {text: 'Hi, I am here.', source: 'local', persona: 'Learner'});
    expect(header(COACH, chat.messages())).toBe('Word Coach · Learner');
  });
});
