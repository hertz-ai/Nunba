/**
 * useTTS.orbWiring.test.js — the voice orb must watch the element that speaks.
 *
 * THE REGRESSION. bb10f78cc (2026-04-09, "VoiceVisualizer not animating during
 * TTS playback") fixed the orb with one line in the SSE handler: point audioRef
 * at the element that is speaking, so VoiceVisualizer can tap an analyser off
 * it. b6ee8fc0 (2026-05-20) added a second speak path — local-backend replies
 * via tts.speak() — and did not carry that line across. useTTS plays through
 * its own `new Audio()` (present since the initial import), which nothing ever
 * hands to the orb.
 *
 * So the orb switched ON (`isActive` is `isPlayingResponse || tts.isSpeaking`)
 * with no analyser to read, and fell through to its synthetic branch:
 *
 *     } else if (isActive) {
 *       s.bass = 0.25 + 0.15 * Math.sin(s.time * 2.3);   // three fixed sines
 *
 * Motion, in time with nothing, while audio audibly played. Reported
 * 2026-08-12 as "smoothened over period of time and looks less correlated with
 * audio". The Hevolve web build never had it, because there the playing
 * element IS the one in audioRef — same component, different wiring.
 *
 * The existing suite could not have caught this: it mocks `global.Audio`, so a
 * private element is indistinguishable from a shared one.
 */

const mockPocketTTSInstance = {
  init: jest.fn(() => Promise.resolve()),
  speak: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  isReady: false,
  onReady: null,
  onComplete: null,
  onError: null,
  onStatus: null,
  onVoicesLoaded: null,
  onPlaybackPosition: null,
  encodeVoiceFromURL: jest.fn(() => Promise.resolve()),
};

jest.mock('../../services/pocketTTS', () => ({
  PocketTTSService: jest.fn(() => mockPocketTTSInstance),
}));

jest.mock('../../services/ttsCapabilityProbe', () => ({
  probeTTSCapability: jest.fn(() =>
    Promise.resolve({engine: 'pocket', sampleRate: 24000, reason: 'test'})
  ),
}));

// Imported after the mocks above, which jest hoists anyway — kept in this
// order so the dependency direction is readable.
// eslint-disable-next-line import/first
import {useTTS} from '../../hooks/useTTS';
// eslint-disable-next-line import/first
import {TTS_AUDIO_ELEMENT_ID} from '../../services/ttsAudioElement';
// eslint-disable-next-line import/first, import/order
import {renderHook, act} from '@testing-library/react';

const mockFetchResponse = (data, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(new Blob(['audio'], {type: 'audio/wav'})),
});

// jsdom has no media stack: play()/pause() are "not implemented". Stub them and
// record the receiver, since "which element was told to play" is the whole
// point of this file.
let playCalls = [];

beforeEach(() => {
  jest.clearAllMocks();
  playCalls = [];
  mockPocketTTSInstance.isReady = false;

  document.body.innerHTML = '';

  jest
    .spyOn(window.HTMLMediaElement.prototype, 'play')
    .mockImplementation(function play() {
      playCalls.push(this);
      return Promise.resolve();
    });
  jest
    .spyOn(window.HTMLMediaElement.prototype, 'pause')
    .mockImplementation(() => {});

  // If the hook ever constructs its own element again, this records it.
  global.Audio = jest.fn(() => ({
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
    src: '',
    currentTime: 0,
    onended: null,
    onerror: null,
  }));

  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  global.fetch = jest.fn(() =>
    Promise.resolve(mockFetchResponse({available: false}))
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

const speakingHook = async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(mockFetchResponse({available: true})) // checkStatus
    .mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], {type: 'audio/wav'})),
    });
  const {result, unmount} = renderHook(() => useTTS());
  await act(async () => {
    await result.current.checkStatus();
  });
  return {result, unmount};
};

describe('tts.speak() plays through the element the orb watches', () => {
  it('speaks through #nunba-tts-audio, not a private new Audio()', async () => {
    const {result} = await speakingHook();
    await act(async () => {
      await result.current.speak('Hello world');
    });

    const shared = document.getElementById(TTS_AUDIO_ELEMENT_ID);
    expect(shared).not.toBeNull();

    // THE assertion. Pre-fix this failed: play() landed on a detached
    // `new Audio()` that the orb had no reference to.
    expect(playCalls).toContain(shared);
    expect(shared.src).toBe('blob:mock-url');

    // …and it must not have minted a second, invisible element to do it with.
    expect(global.Audio).not.toHaveBeenCalled();
  });

  it('reuses the SAME element across speaks — a replacement would lose the tap', async () => {
    // createMediaElementSource() can be called at most once per element, ever.
    // VoiceVisualizer claims this element and caches the graph, so swapping the
    // element mid-session silently kills the analyser (and, once, killed audio
    // outright — see _voiceGraphCache in VoiceVisualizer.jsx).
    const {result} = await speakingHook();
    await act(async () => {
      await result.current.speak('one');
    });
    await act(async () => {
      await result.current.speak('two');
    });

    expect(document.querySelectorAll('audio').length).toBe(1);
    expect(new Set(playCalls).size).toBe(1);
  });

  it('unmount pauses the shared element but never discards it', () => {
    const {unmount} = renderHook(() => useTTS());
    const shared = document.getElementById(TTS_AUDIO_ELEMENT_ID);
    expect(shared).not.toBeNull();

    unmount();

    // Still in the document: it outlives the hook and carries a
    // MediaElementSourceNode claim that can never be re-made.
    expect(document.getElementById(TTS_AUDIO_ELEMENT_ID)).toBe(shared);
  });
});

// ── Drift guard: the other half of the wiring lives in Demopage ───────────
describe('Demopage keeps audioRef pointed at whatever is speaking', () => {
  const src = () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    return fs.readFileSync(
      path.join(__dirname, '../../pages/Demopage.js'), 'utf8',
    );
  };

  it('no longer creates its own copy of the TTS element', () => {
    // An inline `document.createElement('audio')` with this id is how the
    // element became un-nameable by useTTS in the first place. One owner:
    // services/ttsAudioElement.js.
    expect(src()).toMatch(/getTtsAudioElement/);
    expect(src()).not.toMatch(/el\.id\s*=\s*['"]nunba-tts-audio['"]/);
  });

  it('re-points audioRef when the client-side engine starts speaking', () => {
    // `isActive` is `isPlayingResponse || tts.isSpeaking`. Both disjuncts must
    // set audioRef; from b6ee8fc0 until now only the first did.
    const s = src();
    expect(s).toMatch(/isActive=\{isPlayingResponse \|\| tts\.isSpeaking\}/);
    expect(s).toMatch(/tts\.isSpeaking[\s\S]{0,240}audioRef\.current = el/);
  });
});
