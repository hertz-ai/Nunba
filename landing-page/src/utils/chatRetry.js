/**
 * chatRetry.js — Shared retry utilities for chat message sending, and the
 * one test for whether a chat turn got its reply.
 * Used by Demopage.js, NunbaChatProvider.jsx and chat/ChatMessageList.js.
 */

export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 30000;

// #125 — terminal retry cap.  Previously the Demopage handleSend
// dispatcher used `while (!localSuccess)` and `while (true)` with no
// upper bound — if classifyError kept returning retryable=true (which
// it does for offline, timeout, network error, 429, 5xx), the loop
// looped indefinitely.  10 attempts at exponential backoff (2s, 4s,
// 8s, 16s, 30s, 30s, ...) is ~3 minutes of trying — beyond that the
// user is better served by a clear "Backend unreachable" message they
// can manually retry rather than an invisible never-ending loop.
export const MAX_RETRIES = 10;

/**
 * What a message reads while the page has given up waiting on a silent turn
 * and sends it again.  The page's own deadline (socialApi CHAT_DEADLINE_MS,
 * 180 s with no trace) aborts the POST; axios rejects with its CanceledError
 * ("canceled"), and the bubble read "canceled - retrying in 4s...", then
 * "gave up after 10 attempts", while the agent was still working on it: a
 * resend of the same id joins the running turn (Nunba _chat_turn).  Live
 * 2026-11-27/28: 888 resends of 149 messages (audit K10).
 */
export const STILL_WORKING_REASON = 'Still working on it';

/** Classify an error into a user-readable reason + retryable flag.  `working`
 * marks the page's own give-up on a turn that is still running. */
export function classifyError(error) {
  if (!navigator.onLine) return {reason: 'You are offline', retryable: true};
  if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError')
    return {reason: STILL_WORKING_REASON, retryable: true, working: true};
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout'))
    return {reason: 'Request timed out', retryable: true};
  if (
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Network Error')
  )
    return {reason: 'Backend not reachable', retryable: true};
  if (error?.response?.status === 429)
    return {reason: 'Rate limited', retryable: true};
  if (error?.response?.status === 401)
    return {reason: 'Session expired', retryable: false};
  if (error?.response?.status >= 500)
    return {reason: `Server error (${error.response.status})`, retryable: true};
  return {reason: error?.message || 'Unknown error', retryable: true};
}

/** The bubble text while a message waits to be sent again: a still-working
 * turn shows no countdown, any other reason shows when the next try goes. */
export function retryingText(reason, sec) {
  if (reason === STILL_WORKING_REASON) return `${STILL_WORKING_REASON}...`;
  return `${reason} — retrying in ${sec}s...`;
}

/** The bubble text once the tries are used up. */
export function gaveUpText(reason, attempts) {
  if (reason === STILL_WORKING_REASON) return `No answer came after ${attempts} tries`;
  return `${reason || 'Backend unreachable'} — gave up after ${attempts} attempts`;
}

/** The text a message restored after a reload shows when it was mid-send:
 * the countdown is dropped, and a still-working wait reads as interrupted. */
export function interruptedText(error) {
  if (!error || error.startsWith(STILL_WORKING_REASON)) return 'Send interrupted';
  return error.replace(/\s*—?\s*retrying in \d+s\.\.\.?/i, '').trim() || 'Send interrupted';
}

/** Compute backoff delay for a given retry count (0-indexed). Capped at MAX_BACKOFF_MS. */
export function getBackoff(retryCount) {
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, retryCount), MAX_BACKOFF_MS);
}

/** Generate a stable message ID for retry tracking. */
export function makeMsgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Start a chat turn: mint its id and make it the page's current turn.
 *
 * The id is the turn's message id and the request_id its POST carries
 * (NunbaChatProvider sends the same id).  `currentTurnRef.current` is
 * written here, at the send, so an envelope that lands before the next
 * render is judged against this turn (constants/chatBubble.
 * isOtherTurnEnvelope).  Every call is a new turn: nothing is carried over
 * from the previous one, whatever the ref already holds.
 */
export function startTurn(currentTurnRef) {
  const id = mintTurn();
  takeTurn(currentTurnRef, id);
  return id;
}

// An open-mic final is minted as a turn of this page but takes the current
// turn only once HARTOS treats it as one (its first trace or clip, or a reply
// that is not not_addressed): promoteHeardTurn.  Until then the turn the
// person is in stays current, so its reply keeps playing and is not skipped
// as "another turn's clip".  Live 2026-11-27/28: 515 clips reached the page,
// 27 played, 276 were skipped that way (audit K6; review rv_gaps B).  Every
// minted id carries a sequence number, and a final is promoted only when it
// was minted after the turn that is current then, so a late answer to an
// older kept final never takes the turn from a newer typed send (B3).
let turnSeq = 0;
const TURN_SEQ_KEPT = 200;
const turnSeqOf = new Map();
const heardTurns = new Set();

function mintTurn() {
  const id = makeMsgId();
  turnSeq += 1;
  turnSeqOf.set(id, turnSeq);
  while (turnSeqOf.size > TURN_SEQ_KEPT) turnSeqOf.delete(turnSeqOf.keys().next().value);
  return id;
}

function takeTurn(currentTurnRef, id) {
  currentTurnRef.current = id;
  rememberOwnTurn(id);
  const now = turnSeqOf.get(id) || 0;
  // A final minted before the turn just taken can never be promoted.
  heardTurns.forEach((heard) => {
    if ((turnSeqOf.get(heard) || 0) <= now) heardTurns.delete(heard);
  });
}

/**
 * Mint the id of an open-mic final without taking the current turn.  It is
 * this window's turn (rememberOwnTurn last: false), not the desktop's last
 * one, so the floating companion's quick prompt keeps its voice (B6).
 */
export function mintHeardTurn() {
  const id = mintTurn();
  heardTurns.add(id);
  rememberOwnTurn(id, { last: false });
  return id;
}

/**
 * Make an open-mic final the current turn, once HARTOS treats it as one.
 * True when it took the turn; false for an id that is no pending final, or
 * one minted before the current turn (the current turn never moves back).
 */
export function promoteHeardTurn(currentTurnRef, turnId) {
  const id = turnId ? String(turnId) : '';
  if (!heardTurns.has(id)) return false;
  const current = currentTurnRef.current ? turnSeqOf.get(String(currentTurnRef.current)) || 0 : 0;
  if ((turnSeqOf.get(id) || 0) <= current) {
    heardTurns.delete(id);
    return false;
  }
  heardTurns.delete(id);
  takeTurn(currentTurnRef, id);
  return true;
}

// The turns this desktop started, so a turn's voice plays only on the device
// that started it (owner 2026-11-23: "Only the device you used";
// utils/ttsGuards.shouldPlayPushedClip).  The turns sent are kept as a list
// in localStorage, the newest SENT_TURNS_KEPT, oldest dropped: every window
// of the app reads it (one WebView2 profile, one origin), so the main window
// speaks the floating companion's quick prompts, and a reload mid-turn still
// speaks the turns sent before it (as the Android app keeps keyID).  This
// window's own record (the newest OWN_TURNS_KEPT, and the asks it answered)
// is kept in memory too, so a blocked store leaves the page speaking its own
// turns.  One slot (the last turn only) silenced an earlier turn whose
// reply had not landed yet (review of 79df4713 + ac152433).
const OWN_TURNS_KEPT = 200;
const SENT_TURNS_KEPT = 50;
export const SENT_TURNS_KEY = 'nunba_sent_turns';
const ownTurns = new Set();

/** The turns this desktop sent, oldest first ([] for none, a blocked store or junk). */
function sentTurns() {
  try {
    const list = JSON.parse(localStorage.getItem(SENT_TURNS_KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  } catch (e) {
    return []; // storage blocked, or not a list
  }
}

/**
 * Record `turnId` as this page's.  `last` (default true): it is a turn just
 * sent, added to the desktop's list (every window, across a reload); an ask
 * answered here is recorded with last: false, in this window only.  Storage
 * that throws is skipped.
 */
export function rememberOwnTurn(turnId, { last = true } = {}) {
  if (!turnId) return;
  const id = String(turnId);
  ownTurns.delete(id);
  ownTurns.add(id);
  while (ownTurns.size > OWN_TURNS_KEPT) {
    ownTurns.delete(ownTurns.values().next().value);
  }
  if (last) {
    const sent = sentTurns().filter((t) => t !== id);
    sent.push(id);
    try {
      localStorage.setItem(SENT_TURNS_KEY, JSON.stringify(sent.slice(-SENT_TURNS_KEPT)));
    } catch (e) { /* storage blocked */ }
  }
}

/**
 * The last turn sent from this desktop, by whichever of its windows sent it
 * ('' for none, or storage blocked): a quick prompt sent from the floating
 * companion (VoiceOrbPage) is read here by the main window.
 */
export function lastTurnStartedHere() {
  const sent = sentTurns();
  return sent.length ? sent[sent.length - 1] : '';
}

/** Every turn this desktop started: this page's record and the turns sent. */
export function turnsStartedHere() {
  const here = new Set(ownTurns);
  sentTurns().forEach((t) => here.add(t));
  return here;
}

/**
 * True for a message the user reads as an answer: assistant text, or a card
 * that answers in its place.  ChatMessageList renders llm_setup_card and
 * plan_card only when their payload is present, so they count only then.
 */
export function isReplyMessage(message) {
  if (!message) return false;
  if (message.type === 'assistant') {
    return typeof message.content === 'string' && message.content.trim() !== '';
  }
  if (message.type === 'llm_setup_card') return !!message.setupCard;
  if (message.type === 'plan_card') return !!message.plan;
  return false;
}

/** True when the user message at userIndex has a reply before the next user message. */
export function turnHasReply(messages, userIndex) {
  for (let i = userIndex + 1; i < messages.length; i++) {
    if (messages[i].type === 'user') return false;
    if (isReplyMessage(messages[i])) return true;
  }
  return false;
}

// Shown on a message whose turn ended without a reply.
export const EMPTY_REPLY_REASON = 'The AI returned an empty reply';
export const PUSHED_REPLY_MISSING_REASON = 'Sent, but no reply reached this window';
