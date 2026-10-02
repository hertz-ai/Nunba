/**
 * One player for a TTS clip.  The same clip reaches Demopage over two
 * transports (SSE -> realtimeService 'tts', WAMP -> handleDataReceived), and
 * each used to load the shared <audio> element itself.  A second `src`
 * assignment aborts the first play() ("The play() request was interrupted by a
 * new load request" -- seen in the owner's console 2026-10-02), so the reply
 * was synthesized, delivered twice, and heard never.
 */
import { playTtsClip, _resetTtsClipPlayer } from '../ttsClipPlayer';

function fakeAudio() {
  const el = {
    srcAssignments: [],
    plays: 0,
    paused: true,
    set src(v) { this.srcAssignments.push(v); },
    get src() { return this.srcAssignments[this.srcAssignments.length - 1] || ''; },
    play() { this.plays += 1; this.paused = false; return Promise.resolve(); },
  };
  return el;
}

beforeEach(() => _resetTtsClipPlayer());

test('the same clip delivered twice loads the element once and plays once', () => {
  const el = fakeAudio();
  expect(playTtsClip(el, '/tts/audio/a.wav')).toBe('played');
  expect(playTtsClip(el, '/tts/audio/a.wav')).toBe('duplicate');
  expect(el.srcAssignments).toEqual(['/tts/audio/a.wav']);
  expect(el.plays).toBe(1);
});

test('a different clip is a new load', () => {
  const el = fakeAudio();
  playTtsClip(el, '/tts/audio/a.wav');
  expect(playTtsClip(el, '/tts/audio/b.wav')).toBe('played');
  expect(el.srcAssignments).toEqual(['/tts/audio/a.wav', '/tts/audio/b.wav']);
});

test('the same clip again after the dedup window plays again', () => {
  const el = fakeAudio();
  playTtsClip(el, '/tts/audio/a.wav', {}, 1000);
  expect(playTtsClip(el, '/tts/audio/a.wav', {}, 1000 + 31000)).toBe('played');
});

test('no element or no url is a no-op, never a throw', () => {
  expect(playTtsClip(null, '/x.wav')).toBe('no-element');
  expect(playTtsClip(fakeAudio(), '')).toBe('no-url');
});

test('a rejected play() reports through onError', async () => {
  const el = fakeAudio();
  el.play = () => Promise.reject(new Error('blocked'));
  const onError = jest.fn();
  playTtsClip(el, '/tts/audio/a.wav', { onError });
  await Promise.resolve();
  await Promise.resolve();
  expect(onError).toHaveBeenCalled();
});
