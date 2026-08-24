/**
 * ttsAudioElement.js — THE audio element TTS plays through.
 *
 * One element, session-scoped, deliberately outside React's tree. Two reasons
 * it has to be shared rather than one per caller:
 *
 * 1. AUTOPLAY. WebView2 refuses `new Audio().play()` when the call comes from
 *    an async callback (an SSE handler, an awaited fetch). A persistent element
 *    that was primed by a real user gesture is allowed. Demopage learned this
 *    and built the singleton inline; useTTS did not, and kept its own
 *    `new Audio()`.
 *
 * 2. THE VOICE ORB. VoiceVisualizer animates from a Web Audio analyser tapped
 *    off whatever element sits in `audioRef`. While useTTS spoke through its
 *    own private element, `tts.isSpeaking` still switched the orb ON but the
 *    analyser had nothing to read, so the draw loop fell through to its
 *    synthetic-sine branch: motion that runs while audio plays but is not
 *    derived from it. Reported 2026-08-12 as "smoothened over period of time
 *    and looks less correlated with audio", against a build where the audio
 *    was audibly playing the whole time. Two playback elements meant the orb
 *    could only ever watch one of them, and it was watching the wrong one.
 *
 * `createMediaElementSource()` may be called at most ONCE per element for its
 * entire lifetime. That is the other reason this is a singleton and is never
 * recreated: VoiceVisualizer claims it once and caches the graph
 * (_voiceGraphCache), and a replacement element would silently lose the tap.
 */

export const TTS_AUDIO_ELEMENT_ID = 'nunba-tts-audio';

/**
 * The shared TTS playback element, created on first call.
 * @returns {HTMLAudioElement|null} null only when there is no DOM (SSR/tests).
 */
export function getTtsAudioElement() {
  if (typeof document === 'undefined' || !document.body) return null;
  const existing = document.getElementById(TTS_AUDIO_ELEMENT_ID);
  if (existing) return existing;
  const el = document.createElement('audio');
  el.id = TTS_AUDIO_ELEMENT_ID;
  el.preload = 'auto';
  document.body.appendChild(el);
  return el;
}

export default getTtsAudioElement;
