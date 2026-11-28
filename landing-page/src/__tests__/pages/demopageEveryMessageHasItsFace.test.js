/**
 * On a video turn every spoken message shows the agent's face, one after
 * another, in the order they were sent.
 *
 * rv_voice round 3, R3-1 (HIGH): HARTOS spoke an agent's mid-turn sends as
 * audio only, and the page dropped the reply's face whenever the turn's audio
 * was still playing, so a video turn with a send never showed the talking face
 * (probe: reply during the send = NO_FACE).  A held turn whose question was its
 * newest send had no face anywhere.  Now each send carries its own face (HARTOS
 * _speak_send) and the page plays a turn's faces and clips through one queue
 * (services/ttsClipPlayer.queueForTurn), so no face is dropped and none cuts
 * another (rv_voice F7).  R3-3: this is the test of the page's face decision.
 *
 * Demopage's provider tree is not mountable here, so startFace, playReply and
 * the effect that attaches a live face to the <video> are cut out of
 * Demopage.js and run as written, with the real player, the real device guard
 * and the real turn record.  Faked: the live stream (utils/liveAvatar) and the
 * audio element.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

function cut(startText, endText) {
  const a = SRC.indexOf(startText);
  if (a < 0) throw new Error(`not found in Demopage.js: ${startText}`);
  const b = SRC.indexOf(endText, a);
  if (b < 0) throw new Error(`end not found in Demopage.js: ${endText}`);
  return SRC.slice(a, b + endText.length);
}

const FACE_AND_REPLY = cut('  const startFace = useCallback((data, stream) => {',
  '  }, [playPushedTts, startFace]);');
const ATTACH = cut('  useEffect(() => {\n    const live = liveAvatarRef.current;',
  '  }, [videoUrl]);');

const player = require('../../services/ttsClipPlayer');
const guards = require('../../utils/ttsGuards');
const {rememberOwnTurn} = require('../../utils/chatRetry');

const TURN = 'desk-face-turn';

function audioElement() {
  return {
    src: '', paused: true, ended: false, onended: null, onerror: null, played: [],
    play() { this.paused = false; this.ended = false; this.played.push(this.src); return Promise.resolve(); },
    pause() { this.paused = true; },
    finish() { this.paused = true; this.ended = true; if (this.onended) this.onended(); },
  };
}

function page() {
  const el = audioElement();
  const faces = [];      // every live face the page started, in order
  const heard = [];      // every message the page played as audio
  const refs = {
    mediaModeRef: {current: 'video'},
    requestIdRef: {current: TURN},
    ttsEnabledRef: {current: true},
    lastAvatarClipRef: {current: null},
    liveAvatarRef: {current: null},
    idleVideoUrlRef: {current: '/idle.mp4'},
  };
  let videoUrl = null;
  const scope = {
    useCallback: (fn) => fn,
    useEffect: (fn) => fn(),
    startLiveAvatar: ({streamUrl}) => {
      const live = {
        url: `blob:${streamUrl}`, stream: streamUrl, attached: false, active: true, cbs: null,
        attach(v, cbs) { this.attached = true; this.cbs = cbs; },
        stop() { this.active = false; if (this.cbs && this.cbs.onStop) this.cbs.onStop(); },
      };
      faces.push(live);
      return live;
    },
    playPushedTts: (data) => {
      heard.push(data.request_id);
      player.playTtsClip(el, data.generated_audio_url, {requestId: data.request_id});
    },
    shouldPlayPushedClip: guards.shouldPlayPushedClip,
    getTtsAudioElement: () => el,
    queueForTurn: player.queueForTurn,
    faceCameFor: player.faceCameFor,
    faceStarted: player.faceStarted,
    faceEnded: player.faceEnded,
    setIsPlayingResponse: () => {},
    setVideoUrl: (u) => { videoUrl = u; },
    setTimeout: () => 0,
    console: {log: () => {}},
    ...refs,
  };
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  const build = new Function(...names, `${FACE_AND_REPLY}\nreturn {startFace, playReply};`);
  const {playReply} = build(...names.map((n) => scope[n]));
  // eslint-disable-next-line no-new-func
  const attachFn = new Function(...names, 'videoUrl', 'videoRef', ATTACH);
  const attach = () => attachFn(...names.map((n) => scope[n]), videoUrl, {current: {}});
  return {
    el, faces, heard, refs,
    receive(id, stream, audio = `/tts/audio/${id}.wav`) {
      playReply({request_id: id, generated_video_url: stream, generated_audio_url: audio});
      attach(); // React runs the effect when videoUrl changes
    },
    faceEnds(i) { faces[i].cbs.onEnd({natural: true}); attach(); },
    faceStoppedByPerson(i) { faces[i].stop(); attach(); },
  };
}

beforeEach(() => {
  try { window.localStorage.clear(); } catch (_) { /* no storage */ }
  player._resetTtsClipPlayer();
  rememberOwnTurn(TURN);
});

test('a send shows its face; the next send\'s face waits for it, then shows', () => {
  const p = page();
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  p.receive(`${TURN}-intermediate-2`, '/face/2');
  expect(p.faces.map((f) => f.stream)).toEqual(['/face/1']);
  p.faceEnds(0);
  expect(p.faces.map((f) => f.stream)).toEqual(['/face/1', '/face/2']);
  expect(p.heard).toEqual([]);
});

test("the reply's face after a send still being said as audio waits, then shows (was NO_FACE)", () => {
  const p = page();
  player.playTtsClip(p.el, '/tts/audio/q1.wav', {requestId: `${TURN}-intermediate-1`});
  p.receive(TURN, '/face/reply');
  expect(p.faces).toEqual([]);
  p.el.finish();
  expect(p.faces.map((f) => f.stream)).toEqual(['/face/reply']);
});

test("a send's audio that comes while the turn's face is showing waits; the face is not cut", () => {
  const p = page();
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  expect(player.playTtsClip(p.el, '/tts/audio/q2.wav', {requestId: `${TURN}-intermediate-2`})).toBe('queued');
  expect(p.faces[0].active).toBe(true);
  p.faceEnds(0);
  expect(p.el.played).toEqual(['/tts/audio/q2.wav']);
});

test('a held turn whose question was its newest send shows that question\'s face', () => {
  // The reply equal to the newest send makes no clip; the send's own face is the face.
  const p = page();
  p.receive(`${TURN}-intermediate-1`, '/face/question');
  expect(p.faces.map((f) => f.stream)).toEqual(['/face/question']);
});

test('the same face delivered twice (SSE and WAMP) shows once', () => {
  const p = page();
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  p.faceEnds(0);
  expect(p.faces).toHaveLength(1);
});

test('when the person cuts in, the rest of the turn\'s faces do not start', () => {
  const p = page();
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  p.receive(`${TURN}-intermediate-2`, '/face/2');
  p.faceStoppedByPerson(0);
  expect(p.faces).toHaveLength(1);
});

test('a face of a message the page already said itself is not shown', () => {
  const p = page();
  expect(player.claimForPage(`${TURN}-intermediate-1`)).toBe(true);
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  expect(p.faces).toEqual([]);
});

test('off video mode a message with a face is heard, as before', () => {
  const p = page();
  p.refs.mediaModeRef.current = 'audio';
  p.receive(`${TURN}-intermediate-1`, '/face/1');
  expect(p.faces).toEqual([]);
  expect(p.heard).toEqual([`${TURN}-intermediate-1`]);
});
