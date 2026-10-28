/**
 * The speaker toggle's choice survives a page reload.
 *
 * Measured 2026-10-21: the toggle wrote localStorage.tts_enabled=false, but
 * Demopage seeded ttsEnabled from nunba_speech_consent alone, so a reload
 * with consent 'granted' turned the speaker back ON and the user's choice was
 * lost.  Consent is permission to speak at all; the toggle is the user's
 * current choice within that permission.  Both must allow speech.
 */
const {initialTtsEnabled} = require('../../utils/ttsGuards');

const fs = require('fs');
const path = require('path');

const store = (values) => (key) => (key in values ? values[key] : null);

describe('initialTtsEnabled', () => {
  test('consent granted and the speaker never toggled: on', () => {
    expect(initialTtsEnabled(store({nunba_speech_consent: 'granted'}))).toBe(true);
  });

  test('consent granted, speaker toggled off: stays off after reload', () => {
    expect(initialTtsEnabled(store({
      nunba_speech_consent: 'granted', tts_enabled: 'false'}))).toBe(false);
  });

  test('consent granted, speaker on: on', () => {
    expect(initialTtsEnabled(store({
      nunba_speech_consent: 'granted', tts_enabled: 'true'}))).toBe(true);
  });

  test('quiet mode or no answer yet: off, whatever the toggle says', () => {
    expect(initialTtsEnabled(store({
      nunba_speech_consent: 'text_only', tts_enabled: 'true'}))).toBe(false);
    expect(initialTtsEnabled(store({tts_enabled: 'true'}))).toBe(false);
  });

  test('storage that throws reads as off', () => {
    expect(initialTtsEnabled(() => { throw new Error('denied'); })).toBe(false);
  });
});

describe('Demopage seeds the speaker state from the one helper', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../pages/Demopage.js'), 'utf8');

  test('useState initialiser calls initialTtsEnabled', () => {
    expect(src).toMatch(
      /const \[ttsEnabled, setTtsEnabled\] = useState\(\(\) =>\s*initialTtsEnabled\(/);
  });
});
