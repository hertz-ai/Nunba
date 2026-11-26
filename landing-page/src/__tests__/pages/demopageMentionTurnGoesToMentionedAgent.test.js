/**
 * A turn that @mentions another agent goes to that agent.
 *
 * Live 2026-11-25 (design_1125 D2): handleSend's @mention branch switched the
 * page with setCurrentAgent(targetAgent), then the same send built the POST
 * from currentAgent, the value this render's closure still held.  A state
 * update shows only on the next render, so the mentioned turn went to the
 * PREVIOUS agent (its prompt_id, agent_id, agent_type, create flags), and the
 * turn's chat was saved under the previous agent's storage key.
 *
 * Demopage is too large to render in a unit test, so handleSend and the
 * storage helper it calls are cut out of Demopage.js and run as written, with
 * the page's state stubbed (the pattern of openMicAddressed.test.js).  What is
 * checked is what the page sends (chatApi.chat) and what it stores
 * (localStorage chat_messages_<id> and the /conversation copy).
 */
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
const UNMOUNT_SAVE = cut('      // Save messages when component unmounts (using refs to avoid stale closure)',
  '\n    };\n  }, []);');

// The argument lists of every call to `callee(` in src, split at top-level commas.
function argsOfEachCall(src, callee) {
  const calls = [];
  for (let at = src.indexOf(callee); at >= 0; at = src.indexOf(callee, at + 1)) {
    const args = [];
    let depth = 0;
    let arg = '';
    for (let i = at + callee.length; i < src.length; i += 1) {
      const c = src[i];
      if (')]}'.includes(c)) {
        if (depth === 0) { args.push(arg.trim()); break; }
        depth -= 1;
      }
      if ('([{'.includes(c)) depth += 1;
      if (c === ',' && depth === 0) { args.push(arg.trim()); arg = ''; } else { arg += c; }
    }
    calls.push(args.filter(Boolean));
  }
  return calls;
}

// Agent A is open.  It differs from B in every field the send reads.
const AGENT_A = {
  prompt_id: 111, id: 'agent-a', name: 'Agent A', type: 'custom',
  create_agent: true, autonomous_creation: true,
};
const AGENT_B = {prompt_id: 95568353503, name: 'Speech Therapy Companion', type: 'local'};

// The page with agent A open.  send(text) is the person typing text and
// pressing send: handleSend with no argument, as a click calls it.
function page() {
  const out = {sent: [], conversationCopies: [], errors: [], switchedTo: []};
  out.send = (text) => {
    let agentState = AGENT_A;
    let msgs = [];
    const messagesRef = {current: msgs};
    const scope = {
      stopLiveAvatar: () => false, // utils/liveAvatar: the page's cut code stops a live avatar reply (none here)
      // what the person typed
      inputMessage: text,
      fileUrl: null, userImage: null, pdffileUrl: null,
      // the page's state, as this render's closure holds it
      currentAgent: AGENT_A,
      allAgents: [AGENT_A, AGENT_B],
      agentData: AGENT_A,
      loading: false, engineReady: true, agentsLoading: false,
      token: 'token', isGuestMode: false,
      effectiveUserId: 'user-1', decryptedUserId: 'user-1',
      conversationId: 'conv-1', mediaMode: 'audio', intelligencePreference: 'local_only',
      ttsEnabled: false,
      // refs
      lastMessageSentAtRef: {current: 0}, chatMountAtRef: {current: 0},
      requestIdRef: {current: null}, textareaRef: {current: null},
      messagesRef, announcedCapsRef: {current: new Set()},
      loadingRetryRef: {current: 0}, loadingRetryTimersRef: {current: []},
      // setters
      setMessages: (v) => { msgs = typeof v === 'function' ? v(msgs) : v; messagesRef.current = msgs; },
      setCurrentAgent: (v) => {
        agentState = typeof v === 'function' ? v(agentState) : v;
        if (typeof v !== 'function') out.switchedTo.push(v);
      },
      setDuration: () => {}, setAnimatingMessageIndex: () => {},
      setCurrentThinkingId: () => {}, setThinkingStartTime: () => {},
      setMessageQueue: () => {}, setInputMessage: () => {},
      setShowAgentMentionList: () => {}, setRequestId: () => {}, setLoading: () => {},
      setShouldScroll: () => {}, setWaitingText: () => {},
      setUploadedPdf: () => {}, setUserImage: () => {}, setFileUrl: () => {},
      setPdfFile: () => {}, setpdfFileUrl: () => {}, setIsModalOpen: () => {},
      setIsRequestInFlight: () => {}, setAllAgents: () => {},
      setAutoContinueFlag: () => {}, setSecretRequest: () => {},
      // helpers and services
      getTtsAudioElement: () => null,
      tts: {isSpeaking: false, stop: () => {}, isAvailable: true, speak: () => Promise.resolve()},
      logger: {log: () => {}, warn: () => {}},
      console: {log: () => {}, warn: () => {}, error: (...a) => { out.errors.push(a); }},
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
        chat: (body) => { out.sent.push(body); return Promise.resolve({text: 'Hi, I am here.', source: 'local'}); },
        syncAgents: () => Promise.resolve(),
      },
      fetch: (url, init) => { out.conversationCopies.push(JSON.parse(init.body)); return Promise.resolve({}); },
      navigate: () => {},
      handleDataReceived: () => {},
      pushNotification: () => {},
      scheduleLoadingRetry: () => null,
      shouldSpeakLocalReply: () => false,
      isDraftReply: () => false,
      hasServerAudioPayload: () => false,
      realtimeService: {connected: true},
      awaitPushedReply: () => {},
      // the save runs at once instead of 100 ms later
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

const stored = (id) => JSON.parse(window.localStorage.getItem(`chat_messages_${id}`));

beforeEach(() => {
  window.localStorage.clear();
});

describe('an @mention turn goes to the mentioned agent', () => {
  test("with A open, '@<B's prompt_id> hello' is posted to B", async () => {
    const desktop = page();
    await desktop.send(`@${AGENT_B.prompt_id} hello`);

    expect(desktop.errors).toEqual([]);
    expect(desktop.sent).toHaveLength(1);
    expect(desktop.sent[0]).toMatchObject({
      text: `@${AGENT_B.prompt_id} hello`,
      prompt_id: AGENT_B.prompt_id,
      agent_id: AGENT_B.prompt_id,
      agent_type: 'local',
      create_agent: false,
      autonomous_creation: false,
    });
  });

  test("the turn's chat is saved under B's id and name, not A's", async () => {
    const desktop = page();
    await desktop.send(`@${AGENT_B.prompt_id} hello`);

    expect(stored(AGENT_B.prompt_id)).toMatchObject({
      agentId: AGENT_B.prompt_id,
      agentName: AGENT_B.name,
    });
    expect(stored(AGENT_A.prompt_id)).toBeNull();
    expect(desktop.conversationCopies.map((c) => c.topic)).toEqual([`agent_${AGENT_B.prompt_id}`]);
  });

  test('the page switches to B for the turns after it, as before', async () => {
    const desktop = page();
    await desktop.send(`@${AGENT_B.prompt_id} hello`);

    expect(desktop.switchedTo.map((a) => a.prompt_id)).toEqual([AGENT_B.prompt_id]);
    expect(window.localStorage.getItem('active_agent_id')).toBe(String(AGENT_B.prompt_id));
  });

  test('a turn with no mention goes to the open agent, as before', async () => {
    const desktop = page();
    await desktop.send('hello');

    expect(desktop.errors).toEqual([]);
    expect(desktop.sent[0]).toMatchObject({
      prompt_id: AGENT_A.prompt_id,
      agent_id: AGENT_A.id,
      agent_type: 'custom',
      create_agent: true,
      autonomous_creation: true,
    });
    expect(stored(AGENT_A.prompt_id)).toMatchObject({agentId: AGENT_A.prompt_id, agentName: AGENT_A.name});
    expect(desktop.switchedTo).toEqual([]);
  });
});

// Review nit on 64d183cd: saveMessagesToStorage stamped currentAgent's name
// from its own closure whenever a caller left the name out, so a save could
// put one agent's name on another agent's chat.  The name is now passed by
// every caller, with no default.
describe('every save names the agent it saves', () => {
  test("leaving the page saves the open agent's chat under that agent's name", () => {
    // The cleanup is made on the first render, so the currentAgent it sees is
    // the agent open when the page mounted (A).  The agent open now is B.
    const scope = {
      stopLiveAvatar: () => false, // utils/liveAvatar: the page's cut code stops a live avatar reply (none here)
      currentAgent: AGENT_A,
      currentAgentRef: {current: AGENT_B},
      messagesRef: {current: [{type: 'user', content: 'hello'}, {type: 'assistant', content: 'hi'}]},
      logger: {log: () => {}},
      holdsAgentChat,
      effectiveUserId: 'user-1',
      fetch: () => Promise.resolve({}),
      console: {error: () => {}},
    };
    const names = Object.keys(scope);
    // eslint-disable-next-line no-new-func
    new Function(...names, `${STORAGE}\n${UNMOUNT_SAVE}`)(...names.map((n) => scope[n]));

    expect(stored(AGENT_B.prompt_id)).toMatchObject({agentId: AGENT_B.prompt_id, agentName: AGENT_B.name});
  });

  test('the storage helper has no default name, and every call passes one', () => {
    expect(STORAGE).toMatch(/const saveMessagesToStorage = \(messages, promptId, name\) => \{/);
    const calls = argsOfEachCall(SRC, 'saveMessagesToStorage(');
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((args) => expect(args).toHaveLength(3));
  });
});
