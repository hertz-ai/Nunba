/**
 * A mic the chat page opened by itself sends only speech that names Nunba.
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
 * The decision lives in two pure helpers in hooks/useSpeechRecognition.js
 * (tested here).  Demopage is too large to render in a unit test, so the last
 * block reads its source and pins the wiring, as demopagePerTurnRequestId
 * does.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/hooks/openMicAddressed.test.js
 */
const {addressedToNunba, micTurnText} = require('../../hooks/useSpeechRecognition');

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

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

describe('Demopage wiring', () => {
  test('only the page\'s own start marks the mic as one nobody opened', () => {
    expect(SRC).toMatch(/const UNPROMPTED_MIC = /);
    const marks = SRC.match(/handleStartRef\.current\(UNPROMPTED_MIC\)/g) || [];
    expect(marks).toHaveLength(1);
    const poll = SRC.indexOf("if (type === 'stt' && !isRecording && handleStartRef.current)");
    expect(poll).toBeGreaterThan(-1);
    expect(SRC.indexOf('handleStartRef.current(UNPROMPTED_MIC)', poll)).toBeGreaterThan(poll);
    expect(SRC).toMatch(/const handleStart = \(how\) => \{/);
    expect(SRC).toMatch(/const unprompted = how === UNPROMPTED_MIC;/);
  });

  test('both auto-sending tiers decide through micTurnText', () => {
    const calls = SRC.match(/micTurnText\(/g) || [];
    expect(calls).toHaveLength(2);
    const whisper = SRC.indexOf('const _useStreamingWhisper = async () => {');
    const webSpeech = SRC.indexOf('const _useWebSpeech = () => {');
    const first = SRC.indexOf('micTurnText(');
    const second = SRC.indexOf('micTurnText(', first + 1);
    expect(first).toBeGreaterThan(whisper);
    expect(first).toBeLessThan(webSpeech);
    expect(second).toBeGreaterThan(webSpeech);
  });

  test('a mic the page opened writes no partial speech into the composer', () => {
    const whisper = SRC.indexOf('const _useStreamingWhisper = async () => {');
    const webSpeech = SRC.indexOf('const _useWebSpeech = () => {');
    expect(SRC.slice(whisper, webSpeech)).toMatch(/\} else if \(!unprompted\) \{/);
  });

  test('the "Hey Nunba" listener uses the same rule, not a copy of it', () => {
    expect(SRC).not.toMatch(/indexOf\('nunba'\)/);
    const wake = SRC.indexOf('const onWakeResult = (e) => {');
    expect(wake).toBeGreaterThan(-1);
    expect(SRC.indexOf('addressedToNunba(text)', wake)).toBeGreaterThan(wake);
  });
});
