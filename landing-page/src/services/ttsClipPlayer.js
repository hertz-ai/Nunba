/**
 * ttsClipPlayer.js — the one function that loads a TTS clip into the shared
 * audio element (services/ttsAudioElement.js).
 *
 * The same clip reaches the chat page over two transports (SSE through
 * realtimeService's 'tts' event, WAMP through the crossbar worker), and each
 * used to assign `el.src` and call play() itself.  Assigning `src` is a new
 * load; it aborts a play() still pending on the same element, so the second
 * delivery cancelled the first and the owner heard nothing (console,
 * 2026-10-02: "The play() request was interrupted by a new load request",
 * twice per clip).  Deduping by URL here makes the second delivery a no-op.
 *
 * One turn's clips play in order.  HARTOS speaks every message an agent
 * sends during a turn as it is sent, each its own clip under the send's id
 * (owner 2026-11-24: "a text reaching the tablet shd also get the audio
 * delivered as and when it was fanned out"; 2026-11-27: "only final reply is
 * ever spoke ... why are they not spoken").  A clip of the turn that is
 * playing now waits for it to end (the turn is cut from the clip's request
 * id, `hooks.requestId`); a clip of another turn replaces it and drops what
 * was waiting, as every clip did before.  The Android app queues the same
 * way (AbstractChatActivity videoQueue).
 *
 * A duplicate is the same clip for the same message (url AND request id):
 * the same words sent twice in a turn are two messages with two ids, and
 * HARTOS's cache hands both the same file, so a url-only check dropped the
 * second (rv_voice F11).
 *
 * A message HARTOS said it would speak itself (`voiced`) is left to its clip;
 * when no clip has come for it within the page's audio race, the page says it
 * itself (claimForPage) and a clip that comes later for that message is not
 * played, so it is heard once either way (rv_voice gap c: a synth failure
 * after the message was marked voiced was silent everywhere).
 *
 * One turn's speech is one queue: its clips, its talking faces (each spoken
 * message of a video turn carries its own, played in the video element, not
 * the audio element), and the page's own saying of a message whose clip never
 * came all take their place in it (queueForTurn).  A face that started over a
 * clip still being said paused it (rv_voice F7); dropping that face instead
 * left a video turn with no face at all (R3-1); and the page saying a message
 * while the turn's clip played set the shared element's src and cut the clip
 * mid-sentence (R3-2).  Each now waits for what is before it.
 */
import { turnIdOf } from '../constants/chatBubble';

const DEDUP_MS = 30000;
// Message ids remembered for the voiced hand-off: well over one turn's sends,
// a bound on the page's memory, not a rule about speech.
const MARKS_KEPT = 64;

let lastClip = { url: '', at: 0, turn: '', id: '' };
// What the speaking turn still has to say, oldest first: a clip
// {url, hooks, turn, id} or a step {run, turn, id} (a face to start, or the
// page saying a message itself).
let waiting = [];
const arrived = new Map();   // message id -> a clip came for it
const pageSpoke = new Map(); // message id -> the page said it itself
const played = new Map();    // url + id -> when that clip started (dedup)
// The face playing now, {turn, id}; a step the turn is waiting on (the page's
// own speech, until its promise settles); the element the queue runs on.
let facePlaying = null;
let stepRunning = null;
let element = null;

function remember(marks, id, value = true) {
  if (!id) return;
  marks.delete(id);
  marks.set(id, value);
  while (marks.size > MARKS_KEPT) marks.delete(marks.keys().next().value);
}

function isPlaying(el) {
  return Boolean(el.src) && !el.paused && !el.ended;
}

/** Whether the turn has something being said right now. */
function speakingNow(el) {
  return Boolean(facePlaying) || Boolean(stepRunning) || (Boolean(el) && isPlaying(el));
}

function runNext(el) {
  const next = waiting.shift();
  if (!next) return;
  if (next.run) {
    runStep(el, next);
  } else {
    start(el, next.url, next.hooks, next.turn, Date.now(), next.id);
  }
}

function runStep(el, step) {
  lastClip = { ...lastClip, turn: step.turn, id: step.id };
  let out;
  try {
    out = step.run();
  } catch (err) {
    out = undefined;
  }
  if (out && typeof out.then === 'function') {
    stepRunning = step;
    const settled = () => {
      if (stepRunning !== step) return;
      stepRunning = null;
      runNext(el);
    };
    out.then(settled, settled);
    return;
  }
  // A step that started nothing (the clip came after all, or no face could
  // start and its audio went in front) leaves the turn to what is next.
  if (!speakingNow(el)) runNext(el);
}

function start(el, url, hooks, turn, now, id = '') {
  lastClip = { url, at: now, turn, id };
  remember(played, `${id}\n${url}`, now);
  el.src = url;
  if (hooks.onStart) hooks.onStart();
  const finished = () => {
    el.onended = null;
    el.onerror = null;
    if (hooks.onEnd) hooks.onEnd();
    runNext(el);
  };
  el.onended = finished;
  el.onerror = finished;
  const started = el.play();
  if (started && typeof started.catch === 'function') {
    started.catch((err) => { if (hooks.onError) hooks.onError(err); });
  }
}

/**
 * @param {HTMLAudioElement|null} el  the shared element
 * @param {string} url                the clip
 * @param {{onStart?:Function,onEnd?:Function,onError?:Function,requestId?:string}} [hooks]
 *        `requestId`: the clip's request id; a clip of the turn playing now
 *        (constants/chatBubble.turnIdOf, the send mark cut off) waits its turn.
 * @param {number} [now]              injectable clock (tests)
 * @returns {'played'|'queued'|'duplicate'|'spoken-by-page'|'no-element'|'no-url'}
 */
export function playTtsClip(el, url, hooks = {}, now = Date.now()) {
  if (!el) return 'no-element';
  if (!url) return 'no-url';
  element = el;
  const id = hooks.requestId || '';
  if (id && pageSpoke.has(id)) return 'spoken-by-page';
  const startedAt = played.get(`${id}\n${url}`);
  if (startedAt !== undefined && now - startedAt < DEDUP_MS) return 'duplicate';
  if (waiting.some((w) => w.url === url && w.id === id)) return 'duplicate';
  remember(arrived, id);
  const turn = turnIdOf(id);
  if (turn && turn === lastClip.turn && speakingNow(el)) {
    waiting.push({ url, hooks, turn, id });
    return 'queued';
  }
  // Another turn's clip replaces what was left of the last one; the same
  // turn's clip goes ahead of what is still waiting (a face that could not
  // start hands its place to its own audio).
  if (turn !== lastClip.turn || !turn) {
    waiting = [];
    facePlaying = null;
    stepRunning = null;
  }
  start(el, url, hooks, turn, now, id);
  return 'played';
}

/**
 * Run ``run`` in the turn of ``requestId``'s place: now when that turn has
 * nothing being said, else after everything it already has waiting.  A
 * ``run`` that returns a promise holds the turn until it settles (the page
 * saying a message itself); a face holds it from faceStarted to faceEnded.
 * Another turn's step replaces what was left of the last one, as its clip
 * would.
 * @returns {'ran'|'queued'|'no-element'}
 */
export function queueForTurn(el, requestId, run) {
  if (!el) return 'no-element';
  element = el;
  const turn = turnIdOf(requestId);
  const step = { run, turn, id: requestId || '' };
  if (turn && turn === lastClip.turn && speakingNow(el)) {
    waiting.push(step);
    return 'queued';
  }
  if (turn !== lastClip.turn || !turn) {
    waiting = [];
    facePlaying = null;
    stepRunning = null;
  }
  runStep(el, step);
  return 'ran';
}

/**
 * A face came for the message ``requestId``.  False when the page already
 * said that message itself (the face is not played, as a late clip is not);
 * true marks it, so the page will not say it while the face waits its place.
 */
export function faceCameFor(requestId) {
  if (requestId && pageSpoke.has(requestId)) return false;
  remember(arrived, requestId);
  return true;
}

/** A live face of ``requestId``'s turn is playing: the turn is speaking. */
export function faceStarted(requestId) {
  facePlaying = { turn: turnIdOf(requestId), id: requestId || '' };
  lastClip = { ...lastClip, turn: facePlaying.turn, id: facePlaying.id };
  remember(arrived, requestId);
}

/**
 * The face of ``requestId`` is over.  Ended (it said its words): the turn
 * goes on to what is waiting.  Stopped (the person cut in, the speaker went
 * off, the page closed) or failed (its audio is played in its place by the
 * caller): nothing more of the turn is started from here.
 */
export function faceEnded(requestId, { stopped = false } = {}) {
  // Only the face that is playing can end itself: an end with no id, or
  // another message's, must never end this turn's face.
  if (!facePlaying || !requestId || facePlaying.id !== requestId) return;
  facePlaying = null;
  if (!stopped) runNext(element);
}

/** Whether a face of ``requestId``'s turn is playing now. */
export function turnFaceIsPlaying(requestId) {
  return Boolean(facePlaying) && facePlaying.turn === turnIdOf(requestId);
}

/** Whether a clip has come for the message ``requestId``. */
export function clipArrivedFor(requestId) {
  return Boolean(requestId) && arrived.has(requestId);
}

/**
 * The page takes over saying the message ``requestId`` (its clip never came).
 * False when a clip came for it after all: that clip says it.  True marks
 * it, so a clip that comes later is not played.
 */
export function claimForPage(requestId) {
  if (!requestId) return true;
  if (arrived.has(requestId)) return false;
  remember(pageSpoke, requestId);
  return true;
}

/**
 * Whether the turn of ``requestId`` is saying something (a clip, a face, the
 * page's own speech) or has something waiting.
 */
export function turnIsSpeaking(el, requestId) {
  const turn = turnIdOf(requestId);
  return Boolean(turn) && Boolean(el) && turn === lastClip.turn
    && (speakingNow(el) || waiting.length > 0);
}

/** Tests only. */
export function _resetTtsClipPlayer() {
  lastClip = { url: '', at: 0, turn: '', id: '' };
  waiting = [];
  arrived.clear();
  pageSpoke.clear();
  played.clear();
  facePlaying = null;
  stepRunning = null;
  element = null;
}

export default playTtsClip;
