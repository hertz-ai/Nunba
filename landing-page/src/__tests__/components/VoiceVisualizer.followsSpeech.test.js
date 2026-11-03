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
 * jsdom has no canvas and no Web Audio, so this drives the component's own
 * exported constants and step function through the analyser's smoothing rule
 * as the Web Audio spec states it (each frame: tau * previous + (1 - tau) *
 * current, on the linear magnitude, before the dB mapping). The dB mapping is
 * memoryless, so it does not change how fast the orb follows.
 *
 *   npx react-scripts test --watchAll=false src/__tests__/components/VoiceVisualizer.followsSpeech.test.js
 */
import {
  ANALYSER_SMOOTHING,
  BAND_FOLLOW,
  followBand,
} from '../../components/VoiceVisualizer';

import fs from 'fs';
import path from 'path';

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

describe('the draw loop uses these numbers, not copies of them', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'components', 'VoiceVisualizer.jsx'), 'utf8');

  test('the analyser is built with ANALYSER_SMOOTHING', () => {
    expect(src).toContain('analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;');
    expect(src).not.toMatch(/smoothingTimeConstant = 0\.\d/);
  });

  test('every band steps through followBand with its BAND_FOLLOW rate', () => {
    expect(src).toContain('s.bassCur = followBand(s.bassCur, s.bass, BAND_FOLLOW.bass);');
    expect(src).toContain('s.midCur = followBand(s.midCur, s.mid, BAND_FOLLOW.mid);');
    expect(src).toContain(
      's.trebleCur = followBand(s.trebleCur, s.treble, BAND_FOLLOW.treble);');
    expect(src).not.toMatch(/Cur \+= \(s\.\w+ - s\.\w+Cur\) \*/);
  });
});
