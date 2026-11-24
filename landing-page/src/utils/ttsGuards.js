/**
 * ttsGuards.js — pure helpers for the TTS speak-decision contract.
 *
 * Extracted from Demopage.js handleSend (#206) so the guards are
 * testable without React Testing Library and reusable across other
 * chat surfaces (NunbaChatProvider, future RN bridge) without
 * inlining the same conditions.
 *
 * The local-reply speak-guard contract:
 *
 *   shouldSpeakLocalReply({
 *     ttsEnabled,            // user has TTS toggled on
 *     ttsAvailable,          // useTTS.isAvailable
 *     responseText,          // non-empty text we'd actually speak
 *     isDraft,               // bubble is a draft awaiting expert reply (#206 draft-first guard)
 *     hasServerAudio,        // backend already shipped audio bytes (no need to re-synth)
 *   }) → boolean
 *
 * Returns true ONLY when every condition allows speaking:
 *   - TTS is enabled
 *   - TTS engine is available
 *   - Text is non-empty
 *   - NOT a draft (expert will arrive via WAMP/SSE and replace it)
 *   - Server didn't already include audio
 *
 * isDraftReply / hasServerAudioPayload extract the booleans from a
 * raw backend response so callers can pass the resultData straight in.
 *
 * shouldPlayPushedClip(data, currentRequestId, ttsEnabled) is the other
 * half: whether a clip the server pushed (SSE 'tts' or WAMP) plays at all.
 */

import {isBackgroundRequest, isOtherTurnEnvelope, turnIdOf} from '../constants/chatBubble';
import {lastTurnStartedHere, turnsStartedHere} from './chatRetry';


export function isDraftReply(resultData) {
  if (!resultData) return false;
  return Boolean(resultData.speculation_id && resultData.expert_pending);
}


export function hasServerAudioPayload(resultData) {
  if (!resultData) return false;
  return Boolean(
    resultData.audio_url
    || resultData.aud_url
    || resultData.video_link?.aud_url,
  );
}


/**
 * Whether a server-pushed clip plays: only while the speaker toggle is on,
 * only a clip with a url, and only the current turn's.  Each turn carries its
 * own request id (chatRetry.startTurn), so an earlier turn's clip that lands
 * after the next send is not spoken over it, and a background agent's clip
 * never plays.  The one rule for whose turn an envelope is lives in
 * constants/chatBubble.isOtherTurnEnvelope.
 *
 * `ttsEnabled` is required, not defaulted: the server synthesises every
 * reply and pushes it whatever the toggle says, so this is the only place the
 * toggle can silence it (measured 2026-10-21: speaker OFF, "[TTS] Clip
 * played").  A caller that leaves it out plays nothing rather than speaking
 * over the user's choice.
 *
 * Only the device used speaks a turn (owner 2026-11-23: "Only the device you
 * used").  HARTOS publishes a turn's voice to every device of the person,
 * tagged with the turn's request id, and the desktop page played the
 * tablet's turns (live, ~18:30 IST: "[TTS] Clip played" for bc4ed03d,
 * f25d90c5, e90d9af5).  A clip of a person's turn plays only when this page
 * started that turn (`sentHere`, chatRetry.turnsStartedHere), the same rule
 * as the Android app's ChatBubble.playsVoiceOf: a clip of no person's turn
 * (no id, or one naming nothing: '', None, null, undefined) plays as before.
 * Only the voice: the reply's words show on every device.
 *
 * The device is the desktop, not one window of it.  The last turn the
 * desktop sent (`lastHere`, chatRetry.lastTurnStartedHere, written by
 * whichever window sent it) is its current turn too: a quick prompt typed in
 * the floating companion, which plays no audio, is spoken by this window
 * even while this page is on an earlier turn of its own.  A turn this page
 * sends after it moves both on, so the companion's late clip is then an
 * earlier turn's.
 */
export function shouldPlayPushedClip(data, currentRequestId, ttsEnabled,
  sentHere = turnsStartedHere(), lastHere = lastTurnStartedHere()) {
  if (ttsEnabled !== true) return false;
  if (!data || !data.generated_audio_url) return false;
  return isTurnVoicedHere(data.request_id, currentRequestId, sentHere, lastHere);
}

/**
 * Whether this device gives voice to the turn `requestId` belongs to: the
 * device used speaks a turn, the others only show its words (owner
 * 2026-11-23, "Only the device you used").  The rule shouldPlayPushedClip
 * applies to a clip the server pushed, and the one a message pushed as text
 * alone, which this page speaks itself, must pass too: an agent's mid-turn
 * send of a tablet turn ('<turn>-intermediate-<n>') was spoken by the
 * desktop page, which never started that turn (live 2026-11-24 16:44 IST,
 * Cafe Flow: the desktop said the question twice before the tablet's clip
 * of the turn arrived).
 */
export function isTurnVoicedHere(requestId, currentRequestId,
  sentHere = turnsStartedHere(), lastHere = lastTurnStartedHere()) {
  const turn = clipTurnOf(requestId);
  if (turn && turn === lastHere && !isBackgroundRequest(turn)) return true;
  if (isOtherTurnEnvelope(turn, currentRequestId)) return false;
  if (!turn) return true;
  return turn === currentRequestId || Boolean(sentHere && sentHere.has(turn));
}

// What a missing id reads as once a producer wrote it out: Python's
// str(None), JSON's null, JavaScript's undefined (RN ChatBubble.NO_ID_WORDS).
const NO_ID_WORDS = new Set(['none', 'null', 'undefined']);

/** The person's turn a clip names (its request id cut at the send mark), or '' for none. */
function clipTurnOf(requestId) {
  const turn = turnIdOf(typeof requestId === 'string' ? requestId.trim() : requestId).trim();
  return !turn || NO_ID_WORDS.has(turn.toLowerCase()) ? '' : turn;
}


/**
 * The speaker state a page starts with, read from storage.
 *
 * Two keys, two meanings: `nunba_speech_consent` is the user's permission to
 * speak at all ('granted' | 'text_only'), and `tts_enabled` is the speaker
 * toggle's current choice inside that permission.  Speech needs both.
 * Measured 2026-10-21: Demopage seeded the state from the consent alone, so a
 * reload after switching the speaker off turned it back on.
 *
 * `read(key)` is localStorage.getItem (injected so this stays pure); a read
 * that throws counts as off.
 */
export function initialTtsEnabled(read) {
  try {
    if (read('nunba_speech_consent') !== 'granted') return false;
    return read('tts_enabled') !== 'false';
  } catch (e) {
    return false;
  }
}


export function shouldSpeakLocalReply({
  ttsEnabled,
  ttsAvailable,
  responseText,
  isDraft,
  hasServerAudio,
  realtimeConnected,
}) {
  if (!ttsEnabled) return false;
  if (!ttsAvailable) return false;
  if (!responseText) return false;
  if (isDraft) return false;
  if (hasServerAudio) return false;
  // #206 / 2026-05-20 double-playback fix — server-side TTS
  // (HARTOS Tier-1 bg thread + chatbot_routes._fire_nunba_tts) ALWAYS
  // synthesizes the assistant reply and publishes audio_url via SSE
  // chat.pupit topic, ASYNC after this chat response returns.  The
  // sync resultData therefore never carries audio_url at this point,
  // and the `!hasServerAudio` guard alone is not sufficient — it lets
  // the client-side speak fire ALONGSIDE the inbound SSE audio.
  // Live evidence: frozen_debug.log 19:30:00 (server synth) +
  // 19:30:12 (client synth) producing two playbacks of identical
  // text ~12s apart.
  //
  // Correct gate: speak client-side ONLY when SSE is NOT connected.
  // When SSE is connected, the server publish IS the audio path;
  // client-side is just a fallback for the disconnected case.
  if (realtimeConnected) return false;
  return true;
}
