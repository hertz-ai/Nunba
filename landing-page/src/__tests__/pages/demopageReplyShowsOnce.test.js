/**
 * An agent's reply shows once on the desktop chat page.
 *
 * Live on the installed build #5, 2026-11-26 14:51-15:06 IST (user 10202,
 * agents 348, 344 and 353, text mode, local 4B): every agent message showed
 * as two identical bubbles.  HARTOS makes a turn's newest send_message_to_user
 * its /chat reply ([SYNTHESIS], hartos/reuse_recipe.py _reply_with_the_send),
 * so the words reach the page twice: the send pushed as
 * '<turn>-intermediate-<n>' (server.log 14:59:09.372 "Message published
 * locally with request_id: msg_1795685299811_zbw1jq-intermediate-9485") and
 * the reply on the /chat response (14:59:11.542 "LangChain local response",
 * the same words).  The page appended a bubble for each, handleDataReceived
 * per push and handleSend per reply, and nothing linked the two: the msg_id
 * map sees pushes only, and neither row kept its turn.  Read over CDP from the
 * live page, agent 353's chat held 5 such pairs.
 *
 * Demopage cannot be mounted here, so every place that appends an agent's
 * line is cut out of Demopage.js and run as written, on one shared message
 * list, with the real rule (constants/chatBubble.repeatsShownMessage, the
 * mirror of the tablet's ChatBubble.shouldDrop) and the real chat.new filter.
 */
const fs = require('fs');
const path = require('path');

const {repeatsShownMessage} = require('../../constants/chatBubble');
const {isRemoteChatTurn} = require('../../services/realtimeService');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

function cut(start, end, from = 0) {
  const a = SRC.indexOf(start, from);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b);
}

// The cut from `start` to `end` that comes after `anchor`.
function cutAfter(anchor, start, end) {
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error(`Demopage anchor not found: ${anchor}`);
  return cut(start, end, at);
}

// handleDataReceived's three branches that append a pushed agent line,
// handleSend's /chat reply (its `if` closed here), and the chat.new mirror.
const TEXT_MODE = cut('      if (isTextMode) {', '      const hasText = !!extractedText;');
const TEXT_ONLY = cut('      if (hasText && !hasAudio) {', '      if (hasAudio) {');
const WITH_AUDIO = cut('      if (hasAudio) {', '      if (parsed.page_image_url) {');
const REPLY = `${cut('if (!cardConsumedText && !replyPushed && responseText) {',
  '} else if (!cardConsumedText && !replyPushed && !notAddressed) {')}}`;
const MIRROR = cut('    return subscribeChatNew((row) => {', '\n  }, []);');
// The page's other turns that end with a /chat reply: an autonomous creation
// step (CREATE), the new agent's auto-executed task and a plan run of the
// matched agent (both REUSE turns).
const CREATION_STEP = cut('        if (contText) {', '        if (contData.agent_status) {');
const AUTO_EXECUTE = cut('                  if (execText) {', '                  // Clean up autonomous state');
const PLAN_RUN = `${cutAfter('text: plan.task_description,', '      if (responseText) {', '      } else {')}}`;

const AGENT = '353';
const DESK = 'desk-device-1';

// One chat page: one message list, and the page's ways in.
function page(initial = []) {
  let messages = initial.slice();
  const noop = () => {};
  const scope = {
    repeatsShownMessage,
    setMessages: (v) => { messages = typeof v === 'function' ? v(messages) : v; },
    setAnimatingMessageIndex: noop, setShouldScroll: noop, setLoading: noop,
    setIsRequestInFlight: noop, setUploadedImage: noop, setWaitingText: noop,
    setDuration: noop, setVideoUrl: noop, setAudioUrl: noop, setIsPlayingResponse: noop,
    // Text arrives with the speaker off: what is counted is the bubbles.
    ttsEnabled: false,
    tts: {isAvailable: true, speak: () => Promise.resolve()},
    speaksPushedText: () => false,
    shouldSpeakLocalReply: () => false,
    isDraftReply: () => false,
    hasServerAudioPayload: () => false,
    realtimeService: {connected: true},
    requestIdRef: {current: null},
    logger: {log: noop, warn: noop},
    setTimeout: () => 0, clearTimeout: noop,
    // the chat.new subscription hands back its listener
    subscribeChatNew: (listener) => listener,
    isRemoteChatTurn,
    deviceId: DESK,
    currentAgentRef: {current: {prompt_id: AGENT}},
  };
  const names = Object.keys(scope);
  const values = names.map((n) => scope[n]);
  const run = (body, params, args) => {
    // eslint-disable-next-line no-new-func
    return new Function(...names, ...params, body)(...values, ...args);
  };
  const envelope = (requestId, text, msgId, extra = {}) => ({
    request_id: requestId, text: [text], prompt_id: AGENT, served_by: 'local',
    ...(msgId ? {msg_id: msgId} : {}), ...extra,
  });
  return {
    get rows() { return messages; },
    get said() { return messages.filter((m) => m.type === 'assistant').map((m) => m.content); },
    // An agent message pushed to this page, in each of its three branches.
    pushText(requestId, text, msgId) {
      run(TEXT_MODE, ['isTextMode', 'parsed', 'extractedText'],
        [true, envelope(requestId, text, msgId), text]);
    },
    pushSpoken(requestId, text, msgId) {
      run(TEXT_ONLY, ['hasText', 'hasAudio', 'parsed', 'extractedText'],
        [true, false, envelope(requestId, text, msgId), text]);
    },
    pushWithAudio(requestId, text, msgId) {
      const parsed = envelope(requestId, text, msgId, {video_link: {video: '/v/1.mp4'}});
      run(WITH_AUDIO,
        ['hasAudio', 'hasWaitingText', 'waitingText', 'hasText', 'extractedText', 'parsed',
          'responseVideoUrl', 'responseAudioUrl'],
        [true, false, null, true, text, parsed, '/v/1.mp4', '']);
    },
    // The /chat reply of the turn this page sent as `turnId`.
    reply(turnId, text) {
      run(REPLY,
        ['cardConsumedText', 'replyPushed', 'responseText', 'resultData', 'turnAgent', 'msgId'],
        [false, false, text, {text, source: 'langchain_local', served_by: 'local', node_tier: 'flat'},
          {prompt_id: AGENT}, turnId]);
    },
    // A turn of another device, mirrored here by chat.new.
    mirror(row) {
      run(MIRROR, [], [])({prompt_id: AGENT, channel_type: 'chat', device_id: 'tablet-1', ...row});
    },
    // The /chat replies of the page's other turns, sent as `turnId`.
    creationStep(turnId, text) {
      run(CREATION_STEP, ['contText', 'contData', 'currentAgent', 'contTurn'],
        [text, {text, source: 'langchain_local', served_by: 'local'}, {prompt_id: AGENT}, turnId]);
    },
    autoExecute(turnId, text) {
      run(AUTO_EXECUTE, ['execText', 'execData', 'contData', 'execTurn'],
        [text, {text, source: 'langchain_local', served_by: 'local'}, {prompt_id: AGENT}, turnId]);
    },
    planRun(turnId, text) {
      run(PLAN_RUN, ['responseText', 'resultData', 'promptId', 'planTurn'],
        [text, {text, source: 'langchain_local', served_by: 'local'}, AGENT, turnId]);
    },
  };
}

// The live 14:59 turn of agent 353.
const TURN = 'msg_1795685299811_zbw1jq';
const SEND = `${TURN}-intermediate-9485`;
const WORDS = "Hello! I'm so excited to meet you! Could you please tell me your name so I can greet you properly?";

describe('a reply that repeats the send its turn pushed shows once', () => {
  test('text mode: the push, then the /chat reply (the live 14:59 turn)', () => {
    const desktop = page([{type: 'user', content: 'hello', messageId: TURN}]);
    desktop.pushText(SEND, WORDS, 'a1b2c3');
    desktop.reply(TURN, WORDS);
    expect(desktop.said).toEqual([WORDS]);
  });

  test('voice mode: the push, then the /chat reply', () => {
    const desktop = page([{type: 'user', content: 'hello', messageId: TURN}]);
    desktop.pushSpoken(SEND, WORDS, 'a1b2c3');
    desktop.reply(TURN, WORDS);
    expect(desktop.said).toEqual([WORDS]);
  });

  test('a push that brings a video, then the /chat reply', () => {
    const desktop = page([{type: 'user', content: 'hello', messageId: TURN}]);
    desktop.pushWithAudio(SEND, WORDS, 'a1b2c3');
    desktop.reply(TURN, WORDS);
    expect(desktop.said).toEqual([WORDS]);
  });

  test("the turn's thought process is still closed when its reply is held back", () => {
    const desktop = page([
      {type: 'user', content: 'hello', messageId: TURN},
      {type: 'thinking_container', requestId: TURN, isCompleted: false,
        thinkingSteps: [{id: 's1', content: 'Greeting the child', isCompleted: false}]},
    ]);
    desktop.pushText(SEND, WORDS, 'a1b2c3');
    desktop.reply(TURN, WORDS);
    expect(desktop.said).toEqual([WORDS]);
    const container = desktop.rows.find((m) => m.type === 'thinking_container');
    expect(container.isCompleted).toBe(true);
    expect(container.thinkingSteps.every((s) => s.isCompleted)).toBe(true);
  });
});

describe('either copy can come first', () => {
  test('text mode: the /chat reply, then its push (an SSE replay brings it late)', () => {
    const desktop = page();
    desktop.reply(TURN, WORDS);
    desktop.pushText(SEND, WORDS, 'a1b2c3');
    expect(desktop.said).toEqual([WORDS]);
  });

  test('voice mode: the /chat reply, then its push', () => {
    const desktop = page();
    desktop.reply(TURN, WORDS);
    desktop.pushSpoken(SEND, WORDS, 'a1b2c3');
    expect(desktop.said).toEqual([WORDS]);
  });
});

describe('one message, however many legs bring it (hartos-17 O2)', () => {
  test('the same push again, after the 60 s msg_id map has forgotten it, shows once', () => {
    const desktop = page();
    desktop.pushText(SEND, WORDS, 'a1b2c3');
    desktop.pushText(SEND, WORDS, 'a1b2c3');
    expect(desktop.said).toEqual([WORDS]);
  });
});

describe("a deferred turn's answer, pushed under the turn's own id (hartos-17 MUST; sub J #288 D1 (c))", () => {
  // A message sent while the agent was busy is kept.  Its /chat reply is the
  // kept line; the answer comes later, pushed under that message's own id
  // with its own msg_id (crossbar_publish.publish_agent_message, no mark).
  const KEPT = 'msg_1795670743478_w2gp9o';
  const KEPT_LINE = 'This conversation is still answering an earlier message. I have this message '
    + 'too; my answer to it comes as a new message once that one is done.';
  const ANSWER = 'Arjun, look at the red ball!';

  test('the kept line and the answer, in other words, both show', () => {
    const desktop = page();
    desktop.reply(KEPT, KEPT_LINE);
    desktop.pushText(KEPT, ANSWER, 'd1');
    expect(desktop.said).toEqual([KEPT_LINE, ANSWER]);
  });

  test('a send of that turn, then the same words pushed as its answer, shows once', () => {
    const desktop = page();
    desktop.reply(KEPT, KEPT_LINE);
    desktop.pushText(`${KEPT}-intermediate-3`, ANSWER, 'd1');
    desktop.pushText(KEPT, ANSWER, 'd2');
    expect(desktop.said).toEqual([KEPT_LINE, ANSWER]);
  });
});

describe("another device's turn, mirrored by chat.new (hartos-17 O1)", () => {
  const TABLET_TURN = '0507de59-6788-4b36-8a07-7a1ffed3c5f3';

  test('its send, then its reply mirrored here, shows once', () => {
    const desktop = page();
    desktop.pushText(`${TABLET_TURN}-intermediate-3185`, 'Which drink would you like?', 'e1');
    desktop.mirror({msg_id: 'srv-2', role: 'assistant', content: 'Which drink would you like?',
      request_id: TABLET_TURN});
    expect(desktop.said).toEqual(['Which drink would you like?']);
  });

  test("the person's own words from that device show, even when the agent said them too", () => {
    const desktop = page();
    desktop.pushText(`${TABLET_TURN}-intermediate-1`, 'Arjun', 'e1');
    desktop.mirror({msg_id: 'srv-1', role: 'user', content: 'Arjun', request_id: TABLET_TURN});
    expect(desktop.rows.map((m) => [m.type, m.content])).toEqual([['assistant', 'Arjun'], ['user', 'Arjun']]);
  });
});

describe('what keeps showing', () => {
  test('two sends of one turn in the same words both show (a reminder reuses the turn id)', () => {
    const desktop = page();
    desktop.pushText(`${TURN}-intermediate-1111`, 'Time to practise!', 'r1');
    desktop.pushText(`${TURN}-intermediate-2222`, 'Time to practise!', 'r2');
    expect(desktop.said).toEqual(['Time to practise!', 'Time to practise!']);
  });

  test("a reminder in other words under the same turn shows while the turn's reply is on screen", () => {
    // Accepted with the rule (hartos-17): a reminder in the reply's exact
    // words is held back while that reply's row is on screen.  Only that.
    const desktop = page();
    desktop.reply(TURN, WORDS);
    desktop.pushText(`${TURN}-intermediate-5150`, 'Zoey, time for your practice!', 'r3');
    expect(desktop.said).toEqual([WORDS, 'Zoey, time for your practice!']);
  });

  test('the same words in another turn show', () => {
    const desktop = page();
    desktop.pushText(SEND, 'Well done!', 'a1');
    desktop.reply('msg_1795685379388_zg3ps3', 'Well done!');
    expect(desktop.said).toEqual(['Well done!', 'Well done!']);
  });

  test("a reply in other words than its turn's send shows", () => {
    const desktop = page();
    desktop.pushText(SEND, "Here's a rhyme about a red ball.", 'a1');
    desktop.reply(TURN, 'Now you sing it with me!');
    expect(desktop.said).toEqual(["Here's a rhyme about a red ball.", 'Now you sing it with me!']);
  });

  test('a row saved before rows kept a turn id is never matched', () => {
    const desktop = page([{type: 'assistant', content: WORDS, source: 'cloud'}]);
    desktop.reply(TURN, WORDS);
    expect(desktop.said).toEqual([WORDS, WORDS]);
  });

  test("two replies under the turn's own id, each with its own msg id, both show", () => {
    const desktop = page();
    desktop.pushText(TURN, 'Again!', 'm1');
    desktop.pushText(TURN, 'Again!', 'm2');
    expect(desktop.said).toEqual(['Again!', 'Again!']);
  });
});

describe("the page's other turns that end with a /chat reply (rv_da3c, finding 1)", () => {
  // da3c386f covered handleSend's reply only.  The auto-executed task of a
  // new agent and a plan run of a matched agent are REUSE turns too, whose
  // newest send HARTOS makes the reply; a creation step is held to the
  // same rule.  A CREATE send's id has no number after the mark.
  const RUN = 'msg_1795690000000_x1y2z3';
  const ANSWER = 'Here is the plan for your cafe lesson.';

  test("the new agent's auto-executed task: its send, then the same reply, shows once", () => {
    const desktop = page();
    desktop.pushText(`${RUN}-intermediate-1111`, ANSWER, 'x1');
    desktop.autoExecute(RUN, ANSWER);
    expect(desktop.said).toEqual([ANSWER]);
  });

  test('a plan run: its send, then the same reply, shows once', () => {
    const desktop = page();
    desktop.pushText(`${RUN}-intermediate-2222`, ANSWER, 'x2');
    desktop.planRun(RUN, ANSWER);
    expect(desktop.said).toEqual([ANSWER]);
  });

  test('a creation step: its send, then the same reply, shows once', () => {
    const desktop = page();
    desktop.pushText(`${RUN}-intermediate`, ANSWER, 'x3');
    desktop.creationStep(RUN, ANSWER);
    expect(desktop.said).toEqual([ANSWER]);
  });

  test("an auto-executed task's reply, then its push brought late, shows once", () => {
    const desktop = page();
    desktop.autoExecute(RUN, ANSWER);
    desktop.pushText(`${RUN}-intermediate-1111`, ANSWER, 'x1');
    expect(desktop.said).toEqual([ANSWER]);
  });

  test("a creation step's reply in other words than its send shows", () => {
    const desktop = page();
    desktop.pushText(`${RUN}-intermediate`, 'What should the agent be called?', 'x4');
    desktop.creationStep(RUN, 'I need your input to finish building this agent.');
    expect(desktop.said).toEqual(['What should the agent be called?',
      'I need your input to finish building this agent.']);
  });
});
