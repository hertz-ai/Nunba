/**
 * One turn is heard once, and shown once, on the desktop page.
 *
 * Owner 2026-11-23: "audio is playing twice in same device simultaneously",
 * with the tablet muted, so the desktop page doubled.  HARTOS speaks a
 * person's turn in ONE clip under the turn's request id: every message the
 * agent sent during the turn, then the reply (core/peer_link/crossbar_publish
 * .turn_speech_text, from hart_intelligence_entry._chat_reply).  A message
 * sent during the turn reaches the page first, on the chat topic, under
 * '<turn>-intermediate' (CREATE) or '<turn>-intermediate-<n>' (REUSE).  The
 * page spoke that message itself as it arrived, then played the turn's clip,
 * which says the same words again.
 *
 * Measured here against the code as written (cut out of Demopage.js and
 * NunbaChatProvider.jsx and run with the real guards, the real clip player
 * and a recording audio element), one turn being a pushed send plus that
 * turn's clip:
 *   candidate 1  the pushed send spoken here AND said by the clip: 2 voices
 *                (also for a turn the tablet started, and with the page on
 *                a turn of its own the tablet's send was still spoken here)
 *   candidate 2  a clip of a turn this page did not start plays when the
 *                page has no turn of its own (kept: see the last describe)
 *   candidate 3  both players of one window load one clip once (already
 *                true); one clip delivered again after another clip loaded
 *                a second time
 * and a desktop-typed turn showed the same words twice when a send of the
 * turn and its HTTP reply carried them.
 *
 * Demopage's provider tree is not mountable here (see demopageCameraFreed),
 * so the handlers run as written: React's state setters are recorders and
 * setMessages applies its updater to a plain array.
 *
 * TURN_SPOKEN_DEMOPAGE=<path> / TURN_SPOKEN_PROVIDER=<path> run the same
 * tests against other copies of the two files (the parent commit).
 */
const fs = require('fs');
const path = require('path');

const PAGE = process.env.TURN_SPOKEN_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const PROVIDER = process.env.TURN_SPOKEN_PROVIDER
  || path.join(__dirname, '..', '..', 'components', 'Social', 'shared', 'NunbaChat', 'NunbaChatProvider.jsx');
const SRC = fs.readFileSync(PAGE, 'utf8');
const PROVIDER_SRC = fs.readFileSync(PROVIDER, 'utf8');

function cut(src, start, end, from = 0) {
  const a = src.indexOf(start, from);
  if (a < 0) throw new Error(`marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`end marker not found after ${start}: ${end}`);
  return src.slice(a, b + end.length);
}

// safeParsePayload, playPushedTts and handleDataReceived, as written.
const HANDLERS = (() => {
  const a = SRC.indexOf('const safeParsePayload = (data) => {');
  const h = SRC.indexOf('const handleDataReceived = useCallback(', a);
  if (a < 0 || h < 0) throw new Error('Demopage handlers not found');
  const end = '\n  }, []);';
  const b = SRC.indexOf(end, h);
  return SRC.slice(a, b + end.length);
})();

// The HTTP reply's bubble (handleSend, local backend branch), as written,
// up to the speak below it; the open `if` is closed here.
const HTTP_REPLY = `${cut(SRC,
  'const responseText = resultData.text || resultData.response;',
  'setShouldScroll(true);')}\n}`;

// NunbaChatProvider's pushed-clip player, as written.
const PROVIDER_PLAYER = cut(PROVIDER_SRC, 'const handleTTSPush = (payload) => {', '\n    };');

const realGuards = () => require('../../utils/ttsGuards');
const realBubble = () => require('../../constants/chatBubble');
const realPlayer = () => require('../../services/ttsClipPlayer');

const quiet = {log: () => {}, warn: () => {}, error: () => {}};

// The scope's names a function can take as parameters (a module's
// `default` and `__esModule` cannot).
const bindable = (scope) => Object.keys(scope)
  .filter((n) => n !== 'default' && /^[A-Za-z_$][\w$]*$/.test(n));

// One shared element per window, recording every load.
function audioElement() {
  return {
    loads: [],
    set src(v) { this.loads.push(v); },
    get src() { return this.loads[this.loads.length - 1] || ''; },
    play() { return Promise.resolve(); },
    onended: null,
    onerror: null,
  };
}

// The modules the cut code imports, real, with every export by name.
function imports(el, loads) {
  const player = realPlayer();
  return {
    ...realBubble(),
    ...realGuards(),
    ...player,
    getTtsAudioElement: () => el,
    playTtsClip: (...args) => {
      const out = player.playTtsClip(...args);
      loads.push(out);
      return out;
    },
  };
}

// The desktop page with its speaker on, current turn `turn` (null: it has
// started none).
// `pending`: the turn whose /chat POST is still out (replyPendingRef).
function desktopPage({turn = null, textMode = false, speaker = true, pending = null} = {}) {
  const el = audioElement();
  const loads = [];
  let messages = [];
  const audioUrls = [];
  const speak = jest.fn(() => Promise.resolve());
  const requestIdRef = {current: turn};
  const scope = {
    ...imports(el, loads),
    useCallback: (fn) => fn,
    logger: quiet,
    console: quiet,
    document: {addEventListener: () => {}, removeEventListener: () => {}},
    chatApi: {bumpChatDeadline: () => {}},
    seenMsgIdsRef: {current: new Map()},
    isTextModeRef: {current: textMode},
    waitingTextRef: {current: null},
    thinkingStartTimeRef: {current: null},
    currentThinkingIdRef: {current: null},
    staleClearRef: {current: null},
    audioRef: {current: null},
    requestIdRef,
    replyPendingRef: {current: pending},
    ttsEnabledRef: {current: speaker},
    ttsEnabled: speaker,
    tts: {isAvailable: true, speak, stop: () => {}},
    setMessages: (u) => { messages = typeof u === 'function' ? u(messages) : u; },
    setShouldScroll: () => {},
    setLoading: () => {},
    setIsRequestInFlight: () => {},
    setLatestThinkingText: () => {},
    setThinkingStartTime: () => {},
    setCurrentThinkingId: () => {},
    setAnimatingMessageIndex: () => {},
    setUploadedImage: () => {},
    setDuration: () => {},
    setWaitingText: () => {},
    setVideoUrl: () => {},
    setAudioUrl: (u) => { audioUrls.push(u); },
    setIsPlayingResponse: () => {},
  };
  const names = bindable(scope);
  // eslint-disable-next-line no-new-func
  const page = new Function(...names,
    `${HANDLERS}\nreturn {playPushedTts, handleDataReceived};`)(
    ...names.map((n) => scope[n]));
  const httpReply = (msgId, text, replyMsgId) => {
    const resultData = {text, source: 'langchain_local',
      ...(replyMsgId ? {msg_id: replyMsgId} : {})};
    const s = {...scope, resultData, msgId};
    const keys = bindable(s);
    // eslint-disable-next-line no-new-func
    new Function(...keys, HTTP_REPLY)(...keys.map((n) => s[n]));
  };
  return {
    ...page,
    httpReply,
    speak,
    el,
    loads,
    requestIdRef,
    rows: () => messages.filter((m) => m.type === 'assistant').map((m) => m.content),
    audioUrls: () => audioUrls,
  };
}

// The Social panel's player, mounted in the same window as `page`.
function panelPlayer(page, {turn = null} = {}) {
  const scope = {
    ...imports(page.el, page.loads),
    latestRequestIdRef: {current: turn},
    ttsEnabledRef: {current: true},
    console: quiet,
    document: {addEventListener: () => {}, removeEventListener: () => {}},
  };
  const names = bindable(scope);
  // eslint-disable-next-line no-new-func
  return new Function(...names, `${PROVIDER_PLAYER}\nreturn handleTTSPush;`)(
    ...names.map((n) => scope[n]));
}

// An agent's message as HARTOS publish_agent_message sends it.  `voiced`: the
// server stamped it turn_voiced (crossbar_publish.turn_voiced: sent inside a
// person's /chat turn whose clip will say it).
const send = (requestId, text, msgId, {voiced = false} = {}) => ({
  text: [text], request_id: requestId, prompt_id: '342', bot_type: 'Custom GPT',
  options: [], newoptions: [], page_image_url: '', analogy_image_url: '',
  probe: false, inp: '', ...(msgId ? {msg_id: msgId} : {}),
  ...(voiced ? {turn_voiced: true} : {}),
});
const voicedSend = (requestId, text, msgId) => send(requestId, text, msgId, {voiced: true});
const clip = (turn, url) => ({
  action: 'TTS', generated_audio_url: url, request_id: turn,
  text: ['Twinkle twinkle little star\n\nWell sung!'],
  video_link: {aud_url: `http://192.168.0.5:5000${url}`, request_id: turn, action: 'TTS'},
});
const played = (page) => page.loads.filter((o) => o === 'played').length;
const voices = (page) => page.speak.mock.calls.length + played(page);

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetModules();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('candidate 1: a send the turn\'s clip says (server-stamped) is heard once, in the clip', () => {
  test('CREATE: the page\'s own turn, a send then the clip: one voice', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(voicedSend('msg_T1-intermediate', 'Twinkle twinkle little star', 'm1'));
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(page.speak).not.toHaveBeenCalled();
    expect(played(page)).toBe(1);
    expect(voices(page)).toBe(1);
  });

  test('REUSE (-intermediate-<n>): one voice', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(voicedSend('msg_T1-intermediate-2', 'Say ba.', 'm2'));
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(voices(page)).toBe(1);
  });

  test('a voiced turn the tablet started, the desktop page with no turn of its own: the send is not spoken here and the clip plays once', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(voicedSend('tab_T9-intermediate', 'Twinkle twinkle little star', 'm3'));
    page.playPushedTts(clip('tab_T9', '/tts/audio/t9.wav'));
    page.handleDataReceived(clip('tab_T9', '/tts/audio/t9.wav'));   // the WAMP copy
    expect(page.speak).not.toHaveBeenCalled();
    // The clip itself plays here: candidate 2, kept (see below).
    expect(page.el.loads).toEqual(['/tts/audio/t9.wav']);
  });

  test('a voiced turn the tablet started, the page on a turn of its own: nothing of it is spoken here', () => {
    const page = desktopPage({turn: 'msg_D0'});
    page.handleDataReceived(voicedSend('tab_T9-intermediate', 'Twinkle twinkle little star', 'm4'));
    page.playPushedTts(clip('tab_T9', '/tts/audio/t9.wav'));
    expect(voices(page)).toBe(0);
  });
});

describe('a send of the turn this page still waits on is heard once, in the clip (page-local)', () => {
  test('the page\'s own turn, its reply not back, an unstamped send then the clip: one voice', () => {
    const page = desktopPage({turn: 'msg_T1', pending: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate-2', 'Say ba.', 'p1'));
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(page.speak).not.toHaveBeenCalled();
    expect(page.el.loads).toEqual(['/tts/audio/t1.wav']);
  });

  test('once its reply is back, a send under the turn\'s id (a reminder) is spoken here', () => {
    const page = desktopPage({turn: 'msg_T1', pending: null});
    page.handleDataReceived(send('msg_T1-intermediate-4821', 'Time for your practice!', 'p2'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('while it waits, another turn\'s send and CREATE\'s fallback id are spoken here', () => {
    const page = desktopPage({turn: 'msg_T1', pending: 'msg_T1'});
    page.handleDataReceived(send('tab_T9-intermediate', 'Hello from the tablet', 'p3'));
    page.handleDataReceived(send('10202_342-intermediate', 'What is your child\'s name?', 'p4'));
    expect(page.speak).toHaveBeenCalledTimes(2);
  });
});

describe('a send no clip will say is spoken here, as before (review of 4fef48aa)', () => {
  test('a scheduled reminder (REUSE, the last turn\'s id, no stamp)', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(send('msg_T1-intermediate-4821', 'Time for your practice!', 'r1'));
    expect(page.speak).toHaveBeenCalledWith('Time for your practice!');
  });

  test('a scheduled reminder while the page is on that same turn', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate-4821', 'Time for your practice!', 'r2'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('CREATE\'s fallback id (<user>_<prompt>-intermediate) names no turn', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('10202_342-intermediate', 'What is your child\'s name?', 'c1'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('a push from central or an older node (never stamped)', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate', 'Twinkle twinkle little star', 'k1'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('a stamp on a goal turn\'s send silences nothing (no clip voices a goal turn)', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(voicedSend('daemon_g1-intermediate', 'Good morning!', 'g1'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });
});

describe('what the server does not voice is still spoken here (proactive speech)', () => {
  test('a background turn\'s send (daemon_<goal>-intermediate): HARTOS gives it no clip', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(send('daemon_g1-intermediate', 'Time for your practice!', 'm5'));
    expect(page.speak).toHaveBeenCalledTimes(1);
    expect(page.speak).toHaveBeenCalledWith('Time for your practice!');
  });

  test('a notice published outside a turn (Reel Studio: the job\'s request id, no turn mark)', () => {
    const page = desktopPage({turn: 'msg_T5'});
    page.handleDataReceived(send('msg_T1', 'Your reel is ready.', 'm6'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('a message with no request id at all', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(send(undefined, 'Hello again!', 'm7'));
    expect(page.speak).toHaveBeenCalledTimes(1);
  });

  test('the same words sent twice by a background turn are said twice (a cue repeated to a child)', () => {
    const page = desktopPage({turn: null});
    page.handleDataReceived(send('daemon_g1-intermediate', 'Say ba.', 'm8'));
    page.handleDataReceived(send('daemon_g1-intermediate', 'Say ba.', 'm9'));
    expect(page.speak).toHaveBeenCalledTimes(2);
  });

  test('a speaker that is off speaks nothing', () => {
    const page = desktopPage({turn: null, speaker: false});
    page.handleDataReceived(send('daemon_g1-intermediate', 'Hello', 'm10'));
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(voices(page)).toBe(0);
  });
});

describe('a clip a message carries (<audio autoPlay src={audioUrl}>) asks the same record', () => {
  // A message with video_link.aud_url sets audioUrl, which the page's
  // <audio autoPlay> plays; the phone bundle writes the clip's url absolute.
  const withAudio = (url) => ({text: ['Well sung!'], request_id: 'msg_T1', msg_id: `a-${url}`,
    video_link: {aud_url: url}});

  test('a clip the TTS player already played is not played again by it', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    page.handleDataReceived(withAudio('http://192.168.0.5:5000/tts/audio/t1.wav'));
    expect(page.audioUrls()).toEqual(['']);
    expect(page.el.loads).toEqual(['/tts/audio/t1.wav']);
  });

  test('a clip it played is not played again by the TTS player', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(withAudio('http://192.168.0.5:5000/tts/audio/t1.wav'));
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(page.audioUrls()).toEqual(['http://192.168.0.5:5000/tts/audio/t1.wav']);
    expect(page.el.loads).toEqual([]);
  });

  test('another clip still plays', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));
    page.handleDataReceived(withAudio('/tts/audio/t2.wav'));
    expect(page.audioUrls()).toEqual(['/tts/audio/t2.wav']);
  });
});

describe('candidate 3: one clip is loaded once per window', () => {
  test('both players of the window, and both transports: one load', () => {
    const page = desktopPage({turn: 'msg_T1'});
    const panel = panelPlayer(page, {turn: 'msg_T1'});
    page.playPushedTts(clip('msg_T1', '/tts/audio/t1.wav'));   // SSE
    page.handleDataReceived(clip('msg_T1', '/tts/audio/t1.wav'));   // WAMP
    panel(clip('msg_T1', '/tts/audio/t1.wav'));
    expect(page.el.loads).toEqual(['/tts/audio/t1.wav']);
  });

  test('a clip delivered again after another clip loaded is not loaded a second time', () => {
    const page = desktopPage({turn: null});
    page.playPushedTts(clip('', '/tts/audio/a.wav'));
    page.playPushedTts(clip('', '/tts/audio/b.wav'));
    page.playPushedTts(clip('', '/tts/audio/a.wav'));   // the late copy of a
    expect(page.el.loads).toEqual(['/tts/audio/a.wav', '/tts/audio/b.wav']);
  });
});

describe('a desktop-typed turn shows each of its lines once', () => {
  test('a send of the turn, then its HTTP reply with the same words: one bubble', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate', 'What is your child\'s name?', 'm11'));
    page.httpReply('msg_T1', 'What is your child\'s name?');
    expect(page.rows()).toEqual(['What is your child\'s name?']);
  });

  test('the HTTP reply first, then a send the server says was made in the turn, same words: one bubble', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.httpReply('msg_T1', 'What is your child\'s name?');
    page.handleDataReceived(voicedSend('msg_T1-intermediate', 'What is your child\'s name?', 'm12'));
    expect(page.rows()).toEqual(['What is your child\'s name?']);
  });

  test('a reminder repeated under the turn\'s id is shown each time (review of 4fef48aa)', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate-4821', 'Time for your practice!', 'r3'));
    page.handleDataReceived(send('msg_T1-intermediate-1907', 'Time for your practice!', 'r4'));
    expect(page.rows()).toEqual(['Time for your practice!', 'Time for your practice!']);
  });

  test('a reminder after the turn\'s reply, with the reply\'s words, is shown (no stamp: not sent in the turn)', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.httpReply('msg_T1', 'Time for your practice!');
    page.handleDataReceived(send('msg_T1-intermediate-4821', 'Time for your practice!', 'r5'));
    expect(page.rows()).toEqual(['Time for your practice!', 'Time for your practice!']);
  });

  test('two sends of one turn with the same words are both shown', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(voicedSend('msg_T1-intermediate', 'Say ba.', 's1'));
    page.handleDataReceived(voicedSend('msg_T1-intermediate', 'Say ba.', 's2'));
    expect(page.rows()).toEqual(['Say ba.', 'Say ba.']);
  });

  test('a reply and a send that carry different msg_ids are both shown', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(voicedSend('msg_T1-intermediate', 'Well done!', 's3'));
    page.httpReply('msg_T1', 'Well done!', 'other');
    expect(page.rows()).toEqual(['Well done!', 'Well done!']);
  });

  test('the same words in another turn are shown again, in either order', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T0-intermediate', 'Well done!', 'm13'));
    page.httpReply('msg_T1', 'Well done!');
    page.httpReply('msg_T2', 'Great job!');
    page.handleDataReceived(send('msg_T3-intermediate', 'Great job!', 'm14'));
    expect(page.rows()).toEqual(['Well done!', 'Well done!', 'Great job!', 'Great job!']);
  });

  test('other words in the same turn are all shown', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.handleDataReceived(send('msg_T1-intermediate', 'Twinkle twinkle little star', 'm15'));
    page.handleDataReceived(send('msg_T1-intermediate', 'How I wonder what you are', 'm16'));
    page.httpReply('msg_T1', 'Well sung!');
    expect(page.rows()).toEqual(
      ['Twinkle twinkle little star', 'How I wonder what you are', 'Well sung!']);
  });

  test('a message with no turn is never matched on its words', () => {
    const page = desktopPage({turn: 'msg_T1'});
    page.httpReply('msg_T1', 'Hello!');
    page.handleDataReceived(send(undefined, 'Hello!', 'm17'));
    expect(page.rows()).toEqual(['Hello!', 'Hello!']);
  });

  test('in text mode too', () => {
    const page = desktopPage({turn: 'msg_T1', textMode: true});
    page.handleDataReceived(send('msg_T1-intermediate', 'Pick a colour?', 'm18'));
    page.httpReply('msg_T1', 'Pick a colour?');
    expect(page.rows()).toEqual(['Pick a colour?']);
  });
});

describe('candidate 2, kept: a clip with no turn of this page', () => {
  // Measured: with no turn of its own the page plays every clip of the
  // account.  Not changed: the floating companion's quick prompt (app.py
  // on_companion_prompt) posts /chat with no request id and that window
  // plays no audio, so its reply is heard only through this page; and no
  // signal says which surface the person used last.
  test('the page with no turn of its own plays a clip of another surface\'s turn', () => {
    const page = desktopPage({turn: null});
    page.playPushedTts(clip('1763880000000', '/tts/audio/c.wav'));
    expect(played(page)).toBe(1);
  });

  test('the page on a turn of its own plays no other turn\'s clip', () => {
    const page = desktopPage({turn: 'msg_D0'});
    page.playPushedTts(clip('tab_T9', '/tts/audio/t9.wav'));
    expect(played(page)).toBe(0);
  });
});
