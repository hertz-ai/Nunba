/**
 * The speaking orb must move with the syllables, not only with the sentence.
 *
 * Owner 2026-11-03: "check why the voiceviz anim is not realtime". The orb on
 * the chat page IS fed the real voice (the pushed clip plays on the shared
 * #nunba-tts-audio element and the analyser sits on it), but two smoothers
 * stand between the voice and the silhouette:
 *
 *   1. the AnalyserNode averages each frame with the last
 *      (smoothingTimeConstant), and
 *   2. each band then steps toward the analyser's reading once per frame.
 *
 * Measured on a real 18.8 s reply clip (Piper, 2026-11-03 09:25) by replaying
 * the analyser at 60 fps: with the shipped 0.8 and 0.12/0.10/0.08, only 10% of
 * the orb's movement was at syllable rate (2-8 Hz) against 50% in the voice
 * itself, and the orb trailed the voice by 67 ms. It swelled with sentences.
 *
 * Two parts:
 *   - the numbers: the component's exported constants and step function,
 *     driven through the analyser's smoothing rule as the Web Audio spec
 *     states it (each frame: tau * previous + (1 - tau) * current, on the
 *     linear magnitude, before the dB mapping). The dB mapping is memoryless,
 *     so it does not change how fast the orb follows.
 *   - the drawn ring: the component itself, rendered, its draw loop run frame
 *     by frame while a voice starts and stops. jsdom has no canvas and no Web
 *     Audio, so the canvas hands the loop a 2D context that records the ring
 *     it strokes, the AudioContext hands it an analyser that applies the
 *     spec's smoothing with whatever smoothingTimeConstant the component sets
 *     on it, and the test owns the 60 fps clock.
 *
 * The second part replaced a check that read the component's source for the
 * right lines (review of bbc25198, 2026-11-04): a loop that kept those lines
 * but stepped the bands at the old 0.12/0.10/0.08 passed it while the drawn
 * orb's syllable swing fell from 0.68 to 0.20.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/components/VoiceVisualizer.followsSpeech.test.js
 */
import VoiceVisualizer, {
  ANALYSER_SMOOTHING,
  BAND_FOLLOW,
  followBand,
} from '../../components/VoiceVisualizer';

import { render } from '@testing-library/react';
import React from 'react';

const FPS = 60;               // the speaking orb gets every animation frame
const SYLLABLE_HZ = 4;        // ordinary speech runs about 3-5 syllables a second

// One band's journey from the voice to the silhouette, frame by frame.
function orbTrack(voice, rate) {
  let analysed = 0;
  let orb = 0;
  return voice.map((x) => {
    analysed = ANALYSER_SMOOTHING * analysed + (1 - ANALYSER_SMOOTHING) * x;
    orb = followBand(orb, analysed, rate);
    return orb;
  });
}

const swing = (xs) => Math.max(...xs) - Math.min(...xs);
const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;

describe('the speaking orb follows syllables', () => {
  // 3 s of a 4 Hz syllable envelope around a speaking level.
  const voice = Array.from({ length: 3 * FPS },
    (_, n) => 0.3 + 0.2 * Math.sin((2 * Math.PI * SYLLABLE_HZ * n) / FPS));
  const lastSecond = (xs) => xs.slice(-FPS);

  test.each(Object.keys(BAND_FOLLOW))(
    'the %s band keeps at least half of the syllable swing', (band) => {
      const kept = swing(lastSecond(orbTrack(voice, BAND_FOLLOW[band])))
        / swing(lastSecond(voice));
      expect(kept).toBeGreaterThanOrEqual(0.5);
    });

  test.each(Object.keys(BAND_FOLLOW))(
    'the %s band reaches 80%% of a syllable onset within 100 ms', (band) => {
      const step = Array.from({ length: FPS }, () => 0.5);
      const track = orbTrack(step, BAND_FOLLOW[band]);
      const frames100ms = Math.round(0.1 * FPS);
      expect(track[frames100ms - 1]).toBeGreaterThanOrEqual(0.8 * 0.5);
    });

  test('the step toward the reading is a plain step, never past it', () => {
    expect(followBand(0, 1, 0.5)).toBe(0.5);
    expect(followBand(1, 0, 0.5)).toBe(0.5);
    expect(followBand(0.3, 0.3, 0.5)).toBe(0.3);
    Object.values(BAND_FOLLOW).forEach((rate) => {
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
    expect(ANALYSER_SMOOTHING).toBeGreaterThanOrEqual(0);
    expect(ANALYSER_SMOOTHING).toBeLessThan(1);
  });
});

describe('the drawn ring follows the voice', () => {
  const FRAME_MS = 1000 / FPS;
  // A speaking level well inside the orb's headroom (-70 dB on the analyser's
  // -100..-30 dB scale, byte 109): it swells the ring without any of it
  // reaching the canvas edge, where the size would stop tracking the voice.
  const SPEAKING = 10 ** (-70 / 20);

  let now;
  let queued;
  let rings;   // per drawn frame, the ring the loop stroked
  let saved;
  let spies;

  // Web Audio's AnalyserNode as the spec defines it, for a voice whose level
  // the test sets: each read blends the new magnitude into the last by
  // smoothingTimeConstant, then maps decibels onto a byte.
  function analyserFor(voice) {
    const smoothed = new Float64Array(256);
    return {
      smoothingTimeConstant: 0.8,   // Web Audio's default, until the component sets its own
      minDecibels: -100,
      maxDecibels: -30,
      connect() {},
      getByteFrequencyData(bytes) {
        const tau = this.smoothingTimeConstant;
        const perDb = 255 / (this.maxDecibels - this.minDecibels);
        for (let k = 0; k < bytes.length; k++) {
          smoothed[k] = tau * smoothed[k] + (1 - tau) * voice.level;
          const byte = Math.floor(perDb * (20 * Math.log10(smoothed[k]) - this.minDecibels));
          bytes[k] = Math.max(0, Math.min(255, byte));
        }
      },
    };
  }

  // A 2D context that keeps the outline of the last ring stroked in each frame
  // (the loop clears the canvas once at the start of every frame).
  function recordingContext() {
    let path = [];
    return {
      clearRect() { rings.push(null); },
      beginPath() { path = []; },
      moveTo(x, y) { path.push([x, y]); },
      lineTo(x, y) { path.push([x, y]); },
      closePath() {},
      stroke() { rings[rings.length - 1] = path; },
      fill() {},
      arc() {},
      createRadialGradient() { return { addColorStop() {} }; },
    };
  }

  beforeEach(() => {
    now = 0;
    queued = [];
    rings = [];
    let nextId = 1;
    saved = {
      raf: window.requestAnimationFrame,
      caf: window.cancelAnimationFrame,
      AudioContext: window.AudioContext,
    };
    window.requestAnimationFrame = (cb) => {
      const id = nextId++;
      queued.push({ id, cb });
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      queued = queued.filter((frame) => frame.id !== id);
    };
    spies = [
      jest.spyOn(performance, 'now').mockImplementation(() => now),
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(recordingContext),
    ];
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    window.requestAnimationFrame = saved.raf;
    window.cancelAnimationFrame = saved.caf;
    window.AudioContext = saved.AudioContext;
  });

  // The orb's size per drawn frame (mean distance of the stroked ring from the
  // centre, backing-store px) through half a second of silence, one second of
  // a steady voice, then half a second of silence while the clip is still
  // playing (a gap between words, so the orb stays active throughout).
  function ringThroughOneWord() {
    const voice = { level: 0 };
    const analyser = analyserFor(voice);
    window.AudioContext = function FakeAudioContext() {
      return {
        state: 'running',
        destination: {},
        createAnalyser: () => analyser,
        createMediaElementSource: () => ({ connect() {} }),
      };
    };
    // A new element per orb: the component keeps one audio graph per element.
    const audioRef = { current: {} };
    const { container, unmount } = render(
      React.createElement(VoiceVisualizer, { audioRef, isActive: true, size: 200 }));
    const centre = container.querySelector('canvas').width / 2;

    const run = (frames) => {
      for (let n = 0; n < frames; n++) {
        now += FRAME_MS;
        const due = queued;
        queued = [];
        due.forEach((frame) => frame.cb(now));
      }
    };
    run(30);
    const onset = rings.length;
    voice.level = SPEAKING;
    run(60);
    const stop = rings.length;
    voice.level = 0;
    run(30);
    unmount();

    const size = rings.map((ring) => mean(
      ring.map(([x, y]) => Math.hypot(x - centre, y - centre))));
    return {
      rest: mean(size.slice(onset - 10, onset)),
      speaking: mean(size.slice(stop - 30, stop)),
      fromOnset: size.slice(onset),
      fromStop: size.slice(stop),
    };
  }

  // The bars. A syllable at speaking pace lasts about 250 ms, so the ring has
  // to be most of the way up within 100 ms of the voice starting (the bar the
  // numbers above meet). The release bar is a 150 ms silence, a short gap
  // between words: the ring has to be back near rest inside it, or the gap
  // never shows. On 2026-11-04 the old 0.8 / 0.12-0.08 orb took 200 ms and
  // 317 ms; at 0.3 / 0.5 it takes 33 ms and 50 ms.
  //
  // Milliseconds from a change in the voice to the first frame that meets
  // `meets` (Infinity when none does).
  const msUntil = (sizes, meets) => {
    const i = sizes.findIndex(meets);
    return i < 0 ? Infinity : (i + 1) * FRAME_MS;
  };

  test('the voice swells the ring', () => {
    const { rest, speaking } = ringThroughOneWord();
    expect(speaking - rest).toBeGreaterThan(5);
  });

  test('the ring reaches 80% of its speaking size within 100 ms of the voice starting', () => {
    const { rest, speaking, fromOnset } = ringThroughOneWord();
    const ms = msUntil(fromOnset, (s) => s >= rest + 0.8 * (speaking - rest));
    expect(ms).toBeLessThanOrEqual(100);
  });

  test('the ring falls back to within 20% of rest within 150 ms of the voice stopping', () => {
    const { rest, speaking, fromStop } = ringThroughOneWord();
    const ms = msUntil(fromStop, (s) => s <= rest + 0.2 * (speaking - rest));
    expect(ms).toBeLessThanOrEqual(150);
  });
});
