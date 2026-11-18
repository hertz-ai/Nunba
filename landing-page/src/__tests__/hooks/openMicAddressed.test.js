/**
 * A mic the chat page opened by itself sends only speech naming Nunba.
 *
 * The page starts its mic on its own once speech recognition is ready
 * (Demopage's bootstrap poll calls handleStart with no click), and every
 * Whisper final used to become a chat turn one second later.  So the whole
 * room talked to the open agent.  Measured 2026-11-03 on the owner's desktop:
 * three agent 54 turns were background speech -- "1.5°C 1.5°C" (09:49 IST),
 * "Learner to learner to learner wants to restart learning from the business
 * by..." (09:51), "And he leaves me sickly, sickly..." (09:54) -- and each ran
 * the tutor for minutes, asked the owner for reel clips, and spoke replies.
 *
 * The rule is the one the "Hey Nunba" listener already used: speech that
 * names Nunba is a turn, and the turn is what follows the name.  A mic the
 * person clicked open is unchanged: everything they say is sent.
 *
 * Two parts are tested here:
 *   - the two helpers in hooks/useSpeechRecognition.js, called directly;
 *   - Demopage's own handlers, RUN, not read: the Whisper tier's onmessage,
 *     the Web Speech tier's onresult, the drop report, the STT-ready poll and
 *     the "Hey Nunba" listener.  Demopage is too large to render in a unit
 *     test, so each handler's real text is cut out of the page (between the
 *     markers below) and executed with the page's state stubbed.  A changed
 *     handler changes what these tests see; a missing marker fails loudly.
 *
 * OPEN_MIC_DEMOPAGE=<path> runs the same tests against another copy of
 * Demopage.js (the parent commit, a mutant) to show they fail there.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/hooks/openMicAddressed.test.js
 */
const {
  addressedToNunba, micTurnText, OPEN_MIC_CUE,
} = require('../../hooks/useSpeechRecognition');

const fs = require('fs');
const path = require('path');

const PAGE = process.env.OPEN_MIC_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const SRC = fs.readFileSync(PAGE, 'utf8');

// The three Whisper finals that reached agent 54 as turns on 2026-11-03.
const ROOM_SPEECH = [
  '1.5°C 1.5°C',
  'Learner to learner to learner wants to restart learning from the business by',
  'And he leaves me sickly, sickly, sickly, sickly, sickly',
];

describe('speech addressed to Nunba', () => {
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
  test.each(ROOM_SPEECH)('a mic the page opened sends no room speech: %s', (said) => {
    expect(micTurnText(said, true)).toBeNull();
  });

  test('a mic the page opened sends what follows the name', () => {
    expect(micTurnText('Nunba, continue my lesson', true)).toBe('continue my lesson');
  });

  test('a mic the page opened sends nothing for the name alone', () => {
    expect(micTurnText('Nunba.', true)).toBeNull();
  });

  test.each(ROOM_SPEECH)('a clicked mic sends what was said, as before: %s', (said) => {
    expect(micTurnText(`  ${said}  `, false)).toBe(said);
  });

  test('a clicked mic sends nothing for silence', () => {
    expect(micTurnText('   ', false)).toBeNull();
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
// sent (the composer as it stood when handleSend fired), and the drops the
// handler reported.  Timers run only when flushed, so "1 s of silence" is a
// flush.
function pageStubs() {
  const page = { composer: [], sent: [], dropped: [], logs: [], toasts: [] };
  const timers = new Map();
  let nextTimer = 0;
  page.setInputMessage = (v) => { page.composer.push(v); };
  page.handleSendRef = { current: () => { page.sent.push(page.composer[page.composer.length - 1]); } };
  page.setTimeout = (cb) => { nextTimer += 1; timers.set(nextTimer, cb); return nextTimer; };
  page.clearTimeout = (id) => { timers.delete(id); };
  page.flush = () => { const due = [...timers.values()]; timers.clear(); due.forEach((cb) => cb()); };
  page.notAddressed = (said) => { page.dropped.push(said); };
  page.console = { log: (line) => { page.logs.push(line); } };
  page.pushNotification = (n) => { page.toasts.push(n); };
  return page;
}

const TIER_ARGS = ['micTurnText', 'unprompted', 'notAddressed', 'setInputMessage',
  'handleSendRef', 'setTimeout', 'clearTimeout', 'console'];
const tierArgs = (page, unprompted) => [micTurnText, unprompted, page.notAddressed,
  page.setInputMessage, page.handleSendRef, page.setTimeout, page.clearTimeout, page.console];

// Tier 1: the streaming-Whisper socket's onmessage.
function whisperMic(unprompted) {
  const tier = cut(SRC, 'const _useStreamingWhisper = async () => {', 'const _useWebSpeech = () => {');
  const handler = cut(tier, 'ws.onmessage = (evt) => {', '\n        ws.onerror');
  const page = pageStubs();
  // eslint-disable-next-line no-new-func
  const onmessage = new Function(...TIER_ARGS,
    `let fullText = ''; let autoSendTimer = null; const ws = {};\n${handler}\nreturn ws.onmessage;`,
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

describe('a mic the page opened, Whisper tier', () => {
  test.each(ROOM_SPEECH)('room speech is no turn and never reaches the composer: %s', (said) => {
    const page = whisperMic(true).hear([said.slice(0, 8), false], [said, true]);
    expect(page.sent).toEqual([]);
    expect(page.composer).toEqual([]);
    expect(page.dropped).toEqual([said]);
  });

  test('"Nunba, <command>" sends the command', () => {
    const page = whisperMic(true).hear(['Nunba, continue', false], ['Nunba, continue my lesson.', true]);
    expect(page.sent).toEqual(['continue my lesson.']);
    expect(page.dropped).toEqual([]);
  });

  test('the name alone sends nothing', () => {
    const page = whisperMic(true).hear(['Hey Nunba.', true]);
    expect(page.sent).toEqual([]);
  });
});

describe('a clicked mic, Whisper tier: unchanged', () => {
  test.each(ROOM_SPEECH)('what was said is shown as it comes and sent: %s', (said) => {
    const page = whisperMic(false).hear([said.slice(0, 8), false], [said, true]);
    expect(page.composer).toEqual([said.slice(0, 8).trim(), said]);
    expect(page.sent).toEqual([said]);
    expect(page.dropped).toEqual([]);
  });
});

describe('a mic the page opened, Web Speech tier', () => {
  test('room speech is no turn and never reaches the composer', () => {
    const page = webSpeechMic(true).hear(
      [['And he leaves me', false]], [['And he leaves me sickly sickly', true]]);
    expect(page.sent).toEqual([]);
    expect(page.composer).toEqual([]);
    expect(page.dropped).toEqual(['And he leaves me sickly sickly']);
  });

  test('"hey nunba <command>" sends the command', () => {
    const page = webSpeechMic(true).hear(
      [['hey nunba open', false]], [['hey nunba open my lesson', true]]);
    expect(page.sent).toEqual(['open my lesson']);
  });

  test('two addressed finals inside one second are one turn, words apart', () => {
    const page = webSpeechMic(true).hear(
      [['Nunba open my lesson', true]], [[' Nunba read it aloud', true]]);
    expect(page.sent).toEqual(['open my lesson read it aloud']);
  });
});

describe('a clicked mic, Web Speech tier: unchanged', () => {
  test('what was said is sent', () => {
    const page = webSpeechMic(false).hear(
      [['And he leaves me', false]], [['And he leaves me sickly sickly', true]]);
    expect(page.sent).toEqual(['And he leaves me sickly sickly']);
    expect(page.dropped).toEqual([]);
  });
});

describe('a drop is reported, and the person is told once', () => {
  test('length only in the log, one on-screen cue per mic', () => {
    const block = cut(SRC, 'let toldToSayName = false;', '\n    // Barge-in');
    const page = pageStubs();
    // eslint-disable-next-line no-new-func
    const notAddressed = new Function('console', 'pushNotification', 'OPEN_MIC_CUE',
      `${block}\nreturn notAddressed;`,
    )(page.console, page.pushNotification, OPEN_MIC_CUE);
    ROOM_SPEECH.forEach((said) => notAddressed(said));

    expect(page.logs).toEqual(ROOM_SPEECH.map(
      (said) => `[STT] open mic: ${said.length} chars not addressed to Nunba, not sent`));
    expect(page.toasts).toEqual([{ type: 'info', message: OPEN_MIC_CUE }]);
  });

  test('the cue names the word that opens a turn', () => {
    expect(OPEN_MIC_CUE).toMatch(/"Nunba"/);
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

  test('speech ready: the mic opens marked unprompted, and the person is told the rule', () => {
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
