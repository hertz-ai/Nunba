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
 */


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


export function shouldSpeakLocalReply({
  ttsEnabled,
  ttsAvailable,
  responseText,
  isDraft,
  hasServerAudio,
}) {
  if (!ttsEnabled) return false;
  if (!ttsAvailable) return false;
  if (!responseText) return false;
  if (isDraft) return false;
  if (hasServerAudio) return false;
  return true;
}
