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
 * shouldPlayPushedClip(data, currentRequestId) is the other half: whether
 * a clip the server pushed (SSE 'tts' or WAMP) is this turn's to play.
 */

import {isOtherTurnEnvelope} from '../constants/chatBubble';


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
 * Whether a server-pushed clip plays: only a clip with a url, and only the
 * current turn's.  Each turn carries its own request id (chatRetry.
 * startTurn), so an earlier turn's clip that lands after the next send is
 * not spoken over it, and a background agent's clip never plays.  The one
 * rule for whose turn an envelope is lives in
 * constants/chatBubble.isOtherTurnEnvelope.
 */
export function shouldPlayPushedClip(data, currentRequestId) {
  if (!data || !data.generated_audio_url) return false;
  return !isOtherTurnEnvelope(data.request_id, currentRequestId);
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
