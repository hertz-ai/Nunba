/**
 * A mic the chat page opened by itself sends what it hears, marked open_mic.
 *
 * The page starts its mic on its own once speech recognition is ready
 * (Demopage's bootstrap poll calls handleStart with no click).  From 11-03 to
 * 11-25 such a mic sent a final only when it started with "Nunba", after room
 * speech became agent turns on 2026-11-03 ("1.5°C 1.5°C", "And he leaves me
 * sickly..." each ran the tutor for minutes).  On 2026-11-24 that drop ate the
 * owner's own words ("[STT] open mic: 39 / 87 chars not addressed to Nunba,
 * not sent").  Owner 2026-11-24/25: "Saying Nunba for a speech therapy agent
 * is not gonna work", "mic is on by default is the design".  So the page
 * gates nothing: every final goes through the same send as a clicked mic,
 * marked open_mic, and HARTOS (integrations/audio/addressee) decides from
 * context whether the agent answers or stays silent (not_addressed).
 * A mic the person clicked open is unchanged: everything they say is sent,
 * unmarked.
 *
 * Two parts are tested here:
 *   - the helpers in hooks/useSpeechRecognition.js, called directly;
 *   - Demopage's own handlers, RUN, not read: the Whisper tier's onmessage,
 *     the Web Speech tier's onresult, handleSend's open-mic mark and its
 *     silent reply, the STT-ready poll and the "Hey Nunba" listener.
 *     Demopage is too large to render in a unit test, so each handler's real
 *     text is cut out of the page (between the markers below) and executed
 *     with the page's state stubbed.  A changed handler changes what these
 *     tests see; a missing marker fails loudly.
 *
 * OPEN_MIC_DEMOPAGE=<path> runs the same tests against another copy of
 * Demopage.js (the parent commit, a mutant) to show they fail there.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/hooks/openMicAddressed.test.js
 */
const {
  addressedToNunba, micTurnText, OPEN_MIC_CUE, HEARD_NOT_FOR_ME,
} = require('../../hooks/useSpeechRecognition');

const fs = require('fs');
const path = require('path');

const PAGE = process.env.OPEN_MIC_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const SRC = fs.readFileSync(PAGE, 'utf8');

// The three Whisper finals that reached agent 54 as turns on 2026-11-03, and
// the owner's own words the old filter dropped on 2026-11-24.
const ROOM_SPEECH = [
  '1.5°C 1.5°C',
  'Learner to learner to learner wants to restart learning from the business by',
  'And he leaves me sickly, sickly, sickly, sickly, sickly',
];
const OWNER_SPEECH = 'hello do you hear me';

describe('speech addressed to Nunba (the "Hey Nunba" listener only)', () => {
  test.each(ROOM_SPEECH)('room speech is not addressed: %s', (said) => {
    expect(addressedToNunba(said)).toBeNull();
  });

  test('what follows the name is the turn, in the words as spoken', () => {
    expect(addressedToNunba('Nunba, what is two plus two?')).toBe('what is two plus two?');
    expect(addressedToNunba('hey nunba open my lesson')).toBe('open my lesson');
    expect(addressedToNunba('Okay NUNBA. Continue my lesson')).toBe('Continue my lesson');
  });

  test('the name with nothing after it is addressed but empty', () => {
    expect(addressedToNunba('Nunba.')).toBe('');
    expect(addressedToNunba('hey nunba')).toBe('');
  });

  test('the name counts only as a whole word', () => {
    expect(addressedToNunba('the nunbas are here')).toBeNull();
    expect(addressedToNunba('mynunba app')).toBeNull();
  });

  test('no text is not addressed', () => {
    expect(addressedToNunba('')).toBeNull();
    expect(addressedToNunba(undefined)).toBeNull();
  });
});

describe('what a mic final sends', () => {
  test.each([...ROOM_SPEECH, OWNER_SPEECH])('what was said, trimmed, with or without the name: %s', (said) => {
    expect(micTurnText(`  ${said}  `)).toBe(said);
  });

  test('speech naming Nunba is sent as said, name included', () => {
    expect(micTurnText('Nunba, continue my lesson')).toBe('Nunba, continue my lesson');
  });

  test('silence sends nothing', () => {
    expect(micTurnText('   ')).toBeNull();
    expect(micTurnText(undefined)).toBeNull();
  });
});

// ── Demopage's handlers, run with the page's state stubbed ──────────────

function cut(src, start, end) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return src.slice(a, b);
}

// What the person would see: the composer's successive contents, the turns
// sent (the composer as it stood when handleSend fired) and what handleSend
// was told about each (marks).  Timers run only when flushed, so "1 s of
// silence" is a flush.
function pageStubs() {
  const page = { composer: [], sent: [], marks: [], logs: [], toasts: [] };
  const timers = new Map();
  let nextTimer = 0;
  page.setInputMessage = (v) => { page.composer.push(v); };
  page.handleSendRef = {
    // An open-mic send carries its own words (how.text); any other send
    // takes the composer as it stands.
    current: (how) => {
      page.sent.push(how && how.openMic ? how.text : page.composer[page.composer.length - 1]);
      page.marks.push(how ? how.openMic === true : false);
    },
  };
  page.setTimeout = (cb) => { nextTimer += 1; timers.set(nextTimer, cb); return nextTimer; };
  page.clearTimeout = (id) => { timers.delete(id); };
  page.flush = () => { const due = [...timers.values()]; timers.clear(); due.forEach((cb) => cb()); };
  page.console = { log: (line) => { page.logs.push(line); } };
  page.pushNotification = (n) => { page.toasts.push(n); };
  return page;
}

const TIER_ARGS = ['micTurnText', 'unprompted', 'setInputMessage',
  'handleSendRef', 'setTimeout', 'clearTimeout', 'console'];
const tierArgs = (page, unprompted) => [micTurnText, unprompted,
  page.setInputMessage, page.handleSendRef, page.setTimeout, page.clearTimeout, page.console];

// Tier 1: the streaming-Whisper socket's onmessage.
function whisperMic(unprompted) {
  const tier = cut(SRC, 'const _useStreamingWhisper = async () => {', 'const _useWebSpeech = () => {');
  // The socket's message handler, handed to the shared speech link
  // (openSttLink) since 2026-11-24.
  const handler = cut(tier, 'const onMessage = (evt) => {', '\n        const onGiveUp');
  const page = pageStubs();
  // eslint-disable-next-line no-new-func
  const onmessage = new Function(...TIER_ARGS,
    `let fullText = ''; let autoSendTimer = null;\n${handler}\nreturn onMessage;`,
  )(...tierArgs(page, unprompted));
  page.hear = (...msgs) => {
    msgs.forEach(([text, isFinal]) => onmessage({ data: JSON.stringify({ text, is_final: isFinal }) }));
    page.flush();
    return page;
  };
  return page;
}

// Tier 2: the browser's SpeechRecognition onresult.  Chrome keeps every
// result of the session and marks where the new ones start.
function webSpeechMic(unprompted) {
  const tier = cut(SRC, 'const _useWebSpeech = () => {', '// Tier cascade:');
  const handler = cut(tier, 'recognition.onresult = (event) => {', '\n      recognition.onerror');
  const page = pageStubs();
  // eslint-disable-next-line no-new-func
  const onresult = new Function(...TIER_ARGS,
    `let committedText = ''; let autoSendTimer = null; const recognition = {};\n${handler}\nreturn recognition.onresult;`,
  )(...tierArgs(page, unprompted));
  const results = [];
  page.hear = (...events) => {
    events.forEach((event) => {
      const resultIndex = results.length;
      event.forEach(([transcript, isFinal]) => {
        const r = [{ transcript }];
        r.isFinal = isFinal;
        results.push(r);
      });
      onresult({ resultIndex, results: results.slice() });
    });
    page.flush();
    return page;
  };
  return page;
}

const OPEN_MIC = true;
const CLICKED = false;
// What the person is typing in the chat box while the open mic hears the room.
const TYPED = 'what I am typing';

describe('a mic the page opened, Whisper tier', () => {
  test.each([...ROOM_SPEECH, OWNER_SPEECH])('a final without "Nunba" is sent as a turn, marked open_mic: %s', (said) => {
    const page = whisperMic(true).hear([said.slice(0, 8), false], [said, true]);
    expect(page.sent).toEqual([said]);
    expect(page.marks).toEqual([OPEN_MIC]);
    // The open mic never writes into the chat box, not even its final.
    expect(page.composer).toEqual([]);
  });

  test('with text typed in the box, a final sends its own words and the box keeps the typed text', () => {
    const page = whisperMic(true);
    page.composer.push(TYPED);
    page.hear([OWNER_SPEECH.slice(0, 5), false], [OWNER_SPEECH, true]);
    expect(page.sent).toEqual([OWNER_SPEECH]);
    expect(page.marks).toEqual([OPEN_MIC]);
    expect(page.composer).toEqual([TYPED]);
  });

  test('speech naming Nunba is sent as said, marked open_mic', () => {
    const page = whisperMic(true).hear(['Nunba, continue', false], ['Nunba, continue my lesson.', true]);
    expect(page.sent).toEqual(['Nunba, continue my lesson.']);
    expect(page.marks).toEqual([OPEN_MIC]);
  });

  test('the drop is gone: no "not addressed to Nunba" line is left in the page', () => {
    expect(SRC).not.toContain('not addressed to Nunba');
    expect(SRC).not.toContain('toldToSayName');
  });
});

describe('a clicked mic, Whisper tier: unchanged', () => {
  test.each(ROOM_SPEECH)('what was said is shown as it comes and sent, unmarked: %s', (said) => {
    const page = whisperMic(false).hear([said.slice(0, 8), false], [said, true]);
    expect(page.composer).toEqual([said.slice(0, 8).trim(), said]);
    expect(page.sent).toEqual([said]);
    expect(page.marks).toEqual([CLICKED]);
  });
});

describe('a mic the page opened, Web Speech tier', () => {
  test('a final without "Nunba" is sent as a turn, marked open_mic', () => {
    const page = webSpeechMic(true).hear(
      [['And he leaves me', false]], [['And he leaves me sickly sickly', true]]);
    expect(page.sent).toEqual(['And he leaves me sickly sickly']);
    expect(page.marks).toEqual([OPEN_MIC]);
    // The open mic never writes into or clears the chat box.
    expect(page.composer).toEqual([]);
  });

  test('with text typed in the box, a final sends its own words and the box keeps the typed text', () => {
    const page = webSpeechMic(true);
    page.composer.push(TYPED);
    page.hear([['hello do', false]], [[OWNER_SPEECH, true]]);
    expect(page.sent).toEqual([OWNER_SPEECH]);
    expect(page.marks).toEqual([OPEN_MIC]);
    expect(page.composer).toEqual([TYPED]);
  });

  test('two finals inside one second are one turn, words apart', () => {
    const page = webSpeechMic(true).hear(
      [['open my lesson', true]], [[' read it aloud', true]]);
    expect(page.sent).toEqual(['open my lesson read it aloud']);
    expect(page.marks).toEqual([OPEN_MIC]);
  });
});

describe('a clicked mic, Web Speech tier: unchanged', () => {
  test('what was said is sent, unmarked', () => {
    const page = webSpeechMic(false).hear(
      [['And he leaves me', false]], [['And he leaves me sickly sickly', true]]);
    expect(page.sent).toEqual(['And he leaves me sickly sickly']);
    expect(page.marks).toEqual([CLICKED]);
  });
});

describe('handleSend carries the open-mic mark and its own words', () => {
  // handleSend's first lines read what it was called with, and the words of
  // the turn: an open-mic send's own text, else the chat box.
  function turnOf(how, inputMessage) {
    const block = cut(SRC, 'const handleSend = async (how) => {', '// Prime TTS audio element');
    // eslint-disable-next-line no-new-func
    return new Function('how', 'inputMessage',
      `${block.replace('const handleSend = async (how) => {', '')}\nreturn { openMic, turnText };`,
    )(how, inputMessage);
  }

  test('an open-mic send is marked; a click event or no argument is not', () => {
    expect(turnOf({ openMic: true, text: 'x' }, '').openMic).toBe(true);
    expect(turnOf({ openMic: false }, '').openMic).toBe(false);
    expect(turnOf({ type: 'click', target: {} }, '').openMic).toBe(false);
    expect(turnOf(undefined, '').openMic).toBe(false);
  });

  test('an open-mic send takes its own words, not what is typed in the box', () => {
    expect(turnOf({ openMic: true, text: OWNER_SPEECH }, TYPED).turnText).toBe(OWNER_SPEECH);
  });

  test('a click or a clicked mic sends the box, as before', () => {
    expect(turnOf({ type: 'click', target: {} }, TYPED).turnText).toBe(TYPED);
    expect(turnOf({ openMic: false, text: 'ignored' }, TYPED).turnText).toBe(TYPED);
    expect(turnOf(undefined, TYPED).turnText).toBe(TYPED);
  });

  test('handleSend never clears the box for an open-mic turn', () => {
    const send = cut(SRC, 'const handleSend = async (how) => {', 'handleSendRef.current = handleSend;');
    expect(send.split("if (!openMic) setInputMessage('');").length - 1).toBe(2);
    expect(send).toContain('if (!openMic && textareaRef.current) {');
    // Every use of the box's text in handleSend goes through turnText.
    expect(send.split('inputMessage').length - 1).toBe(1);
  });

  test('the chat request sends the turn text, and open_mic only for a marked turn', () => {
    const body = cut(SRC, 'const localResult = await chatApi.chat({', '});');
    expect(body).toContain('text: turnText,');
    expect(body).toContain('...(openMic ? { open_mic: true } : {}),');
  });

  test('a queued open-mic turn keeps its mark and words through both drains, never via the box', () => {
    expect(SRC).toContain('{ text: turnText.trim(), id: Date.now(), openMic }');
    expect(SRC).toContain('(text) => setMessageQueue((prev) => [...prev, { text, id: Date.now(), openMic }]),');
    const sends = SRC.split('handleSendRef.current({ openMic: next.openMic === true, text: next.text })').length - 1;
    expect(sends).toBe(2);
    const boxWrites = SRC.split('if (!next.openMic) setInputMessage(next.text);').length - 1;
    expect(boxWrites).toBe(2);
  });
});

describe('a turn the agent did not take shows as heard, and is silent', () => {
  function reply(openMic, resultData) {
    const block = cut(SRC, 'const notAddressed = openMic && resultData.not_addressed === true;',
      'if (!cardConsumedText && !replyPushed && responseText) {');
    const page = pageStubs();
    let messages = [{ messageId: 'm1', type: 'user', content: 'say ball', status: 'sent' },
      { messageId: 'm0', type: 'assistant', content: 'Say ball.' }];
    // Demopage's own updateMessageStatus: merge the updates into that bubble.
    const updateMessageStatus = (id, updates) => {
      messages = messages.map((m) => (m.messageId === id ? { ...m, ...updates } : m));
    };
    // eslint-disable-next-line no-new-func
    const notAddressed = new Function('openMic', 'resultData', 'msgId', 'updateMessageStatus', 'console',
      `${block}\nreturn notAddressed;`,
    )(openMic, resultData, 'm1', updateMessageStatus, page.console);
    return { notAddressed, messages, logs: page.logs };
  }

  test('an open-mic turn judged not addressed keeps its bubble, marked heard with the reason, and logs it', () => {
    const { notAddressed, messages, logs } = reply(true,
      { text: '', addressed: false, not_addressed: true, reason: 'talking to the audience' });
    expect(notAddressed).toBe(true);
    expect(messages.map((m) => m.messageId)).toEqual(['m1', 'm0']);
    expect(messages[0]).toMatchObject({
      status: 'sent', error: null, heard: true, heardReason: 'talking to the audience',
    });
    expect(messages[1].heard).toBeUndefined();
    expect(logs).toEqual(['[STT] open mic: turn judged not addressed, no reply']);
  });

  test('a clicked turn is never marked heard by the flag', () => {
    const { notAddressed, messages } = reply(false, { text: '', not_addressed: true });
    expect(notAddressed).toBe(false);
    expect(messages.every((m) => m.heard === undefined)).toBe(true);
  });

  test('no reply bubble, no voice, no failure for a turn the agent did not take', () => {
    // The reply bubble and its speech live only in the branch that has words;
    // a not-addressed answer has none ('' text), and the heard block speaks
    // nothing.
    const heard = cut(SRC, 'const notAddressed = openMic && resultData.not_addressed === true;',
      'if (!cardConsumedText && !replyPushed && responseText) {');
    expect(heard).not.toMatch(/speak|assistantMessage/);
    const withWords = cut(SRC, 'if (!cardConsumedText && !replyPushed && responseText) {',
      '} else if (!cardConsumedText && !replyPushed && !notAddressed) {');
    expect(withWords).toContain('shouldSpeakLocalReply(');
    expect(SRC).toContain('} else if (!cardConsumedText && !replyPushed && !notAddressed) {');
  });
});

describe('the chat list shows a heard bubble muted, tagged', () => {
  const LIST = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'chat', 'ChatMessageList.js'), 'utf8');

  test('the tag is one constant, plain words', () => {
    expect(HEARD_NOT_FOR_ME).toBe('Heard - not for me');
  });

  test('a heard bubble renders the tag and is muted', () => {
    expect(LIST).toContain("import {HEARD_NOT_FOR_ME} from '../../hooks/useSpeechRecognition';");
    expect(cut(LIST, '{message.heard && (', ')}')).toContain('{HEARD_NOT_FOR_ME}');
    expect(LIST).toContain('opacity: message.heard ? 0.6 : undefined,');
  });
});

describe('the cue says the mic is on, and asks for no keyword', () => {
  test('no "Nunba" in the cue', () => {
    expect(OPEN_MIC_CUE).not.toMatch(/nunba/i);
    expect(OPEN_MIC_CUE).toMatch(/microphone is on/i);
  });
});

describe('the STT-ready poll opens the mic as one nobody clicked', () => {
  function poll(readySteps) {
    const block = cut(SRC, 'for (const [type, step] of Object.entries(data.steps)) {',
      "if (data.phase === 'done')");
    const page = pageStubs();
    const opened = [];
    const UNPROMPTED = { sentinel: 'unprompted' };
    const steps = {};
    readySteps.forEach((type) => { steps[type] = { status: 'ready' }; });
    // eslint-disable-next-line no-new-func
    new Function('data', 'announcedCapsRef', 'CAPABILITY_LABELS', 'OPEN_MIC_CUE',
      'pushNotification', 'isRecording', 'handleStartRef', 'UNPROMPTED_MIC', block,
    )({ steps }, { current: new Set() }, { stt: 'I can hear you now', tts: 'I can speak now' },
      OPEN_MIC_CUE, page.pushNotification, false,
      { current: (how) => { opened.push(how); } }, UNPROMPTED);
    return { toasts: page.toasts, opened, UNPROMPTED };
  }

  test('speech ready: the mic opens marked unprompted, and the person is told it is on', () => {
    const { toasts, opened, UNPROMPTED } = poll(['stt']);
    expect(opened).toEqual([UNPROMPTED]);
    expect(toasts).toEqual([{ type: 'success', message: OPEN_MIC_CUE }]);
  });

  test('another capability keeps its own announcement and opens no mic', () => {
    const { toasts, opened } = poll(['tts']);
    expect(opened).toEqual([]);
    expect(toasts).toEqual([{ type: 'success', message: 'I can speak now' }]);
  });
});

describe('the "Hey Nunba" listener', () => {
  // The listener hands over the last result, lower-cased and trimmed.
  function wake(said) {
    const block = cut(SRC, '// Wake word: "Hey Nunba [command]"',
      '\n    };\n    const listener = startContinuousRecognition(');
    const page = pageStubs();
    // eslint-disable-next-line no-new-func
    new Function('text', 'setInputMessage', 'setTimeout', 'handleSendRef', 'addressedToNunba', block,
    )(said.toLowerCase().trim(), page.setInputMessage, page.setTimeout, page.handleSendRef,
      addressedToNunba);
    page.flush();
    return page.sent;
  }

  test('sends what follows the name', () => {
    expect(wake('Hey Nunba, open my lesson')).toEqual(['open my lesson']);
  });

  test.each(['Hey Nunba.', 'the nunbas are here', ...ROOM_SPEECH])('sends nothing: %s', (said) => {
    expect(wake(said)).toEqual([]);
  });
});
