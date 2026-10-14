/**
 * Source guard: Demopage has ONE place that loads a TTS clip into the shared
 * element.  Its two transports (SSE 'tts' event, WAMP DATA_RECEIVED ->
 * handleDataReceived) both call playTtsClip, which dedups by URL.  Two inline
 * `.src = <clip url>` sites is the parallel path that cancelled its own audio
 * (owner console 2026-10-02: "play() request was interrupted by a new load
 * request", twice per clip).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

test('no inline assignment of a TTS clip url to an audio element', () => {
  expect(SRC).not.toMatch(/\.src = parsed\.generated_audio_url/);
  expect(SRC).not.toMatch(/ttsAudio\.src = data\.generated_audio_url/);
});

test('both transports go through the one player', () => {
  const calls = SRC.match(/playTtsClip\(/g) || [];
  // the helper's own call site only; the two transports call the wrapper
  expect(calls.length).toBe(1);
  expect(SRC).toMatch(/const playPushedTts = useCallback\(/);
  const callers = SRC.match(/playPushedTts\(/g) || [];
  expect(callers.length).toBe(2); // the SSE 'tts' listener and handleDataReceived (WAMP)
});
