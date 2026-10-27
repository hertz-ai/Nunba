/**
 * Source-level pin: the Social chat panel's pushed-clip player asks the same
 * guard as Demopage's, and plays through the same clip player.
 *
 * Review of #37 found a second pushed-clip player left untouched:
 * NunbaChatProvider's handleTTSPush played `generated_audio_url` on the shared
 * `nunba-tts-audio` element and compared request ids its own inline way.  It
 * never read its own `ttsEnabled`, which the panel's voice toggle flips, so in
 * the SocialLayout panel the speaker showed OFF while the reply still played.
 * ttsGuards.shouldPlayPushedClip is "the one decision on a pushed clip"; both
 * surfaces ask it, and both load the clip through services/ttsClipPlayer so
 * one clip delivered over two transports (or to two mounted surfaces) is
 * loaded once instead of aborting its own play().
 *
 * Same approach and limits as pages/demopagePushedClipRespectsSpeaker.test.js:
 * the provider's tree is not mountable here, so this pins the wiring; the
 * decision itself is tested for real in utils/ttsGuards.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../../components/Social/shared/NunbaChat/NunbaChatProvider.jsx',
  ),
  'utf8',
);

const handler = (() => {
  const start = src.indexOf('const handleTTSPush = ');
  const end = src.indexOf("realtimeService.on('pupit', handleTTSPush)", start);
  return src.slice(start, end);
})();

describe('NunbaChatProvider pushed clip follows the speaker toggle', () => {
  test('the handler was found', () => {
    expect(handler.length).toBeGreaterThan(100);
  });

  test('the provider imports the one guard and the one clip player', () => {
    expect(src).toMatch(
      /import \{[^}]*shouldPlayPushedClip[^}]*\} from '..\/..\/..\/..\/utils\/ttsGuards'/,
    );
    expect(src).toMatch(
      /import \{playTtsClip\} from '..\/..\/..\/..\/services\/ttsClipPlayer'/,
    );
    expect(src).toMatch(
      /import \{getTtsAudioElement\} from '..\/..\/..\/..\/services\/ttsAudioElement'/,
    );
  });

  test('whether a clip plays is asked of shouldPlayPushedClip, with the toggle', () => {
    expect(handler).toMatch(
      /if \(!shouldPlayPushedClip\(data, latestRequestIdRef\.current, ttsEnabledRef\.current\)\)/,
    );
  });

  test('no inline request-id comparison or inline element/src handling is left', () => {
    expect(handler).not.toMatch(/request_id !== latestRequestIdRef/);
    expect(handler).not.toMatch(/\.src = /);
    expect(src).not.toMatch(/createElement\('audio'\)/);
    expect(handler).toMatch(/playTtsClip\(/);
  });

  test('the ref follows the toggle, and turning the speaker off stops the clip through useTTS', () => {
    expect(src).toMatch(/const ttsEnabledRef = useRef\(ttsEnabled\);/);
    const effect = src.slice(src.indexOf('ttsEnabledRef.current = ttsEnabled;'));
    const body = effect.slice(0, effect.indexOf('], [ttsEnabled'));
    const effectBody = effect.slice(0, effect.indexOf('}, ['));
    expect(effectBody).toMatch(/if \(ttsEnabled\) return;/);
    expect(effectBody).toMatch(/stopTts\(\)/);
    expect(body.length).toBeGreaterThan(0);
  });
});

/**
 * Review of #37: the panel's toggle was its own `useState(false)`, never saved
 * and never seeded from storage, so once the pushed clip obeys the toggle the
 * panel's voice replies (which played before) were silent every session until
 * the user clicked the speaker, and a user with the speaker on in Demopage
 * heard nothing in the panel.  The panel now starts from the same storage
 * reading Demopage uses (ttsGuards.initialTtsEnabled: consent granted AND the
 * saved `tts_enabled` choice) and saves the choice when the user changes it.
 */
describe('NunbaChatProvider speaker toggle starts from, and saves to, storage', () => {
  test('the initial state is initialTtsEnabled(read), not a literal false', () => {
    expect(src).toMatch(
      /const \[ttsEnabled, setTtsEnabled\] = useState\(\(\) =>\s*initialTtsEnabled\(\(key\) => localStorage\.getItem\(key\)\)\)/,
    );
    expect(src).not.toMatch(/const \[ttsEnabled, setTtsEnabled\] = useState\(false\)/);
    expect(src).toMatch(
      /import \{[^}]*initialTtsEnabled[^}]*\} from '..\/..\/..\/..\/utils\/ttsGuards'/,
    );
  });

  test("the user's choice is saved to tts_enabled when it changes", () => {
    expect(src).toMatch(/localStorage\.setItem\('tts_enabled', String\(ttsEnabled\)\)/);
  });

  test('neither the save nor the stop runs on mount, only on a change', () => {
    // A save on mount would overwrite a stored 'true' with the false that
    // initialTtsEnabled returns when consent is not granted yet; a stop on
    // mount would pause the shared audio element for nothing.
    expect(src).toMatch(/const ttsMountedRef = useRef\(false\);/);
    const save = src.slice(src.indexOf("localStorage.setItem('tts_enabled'") - 400,
      src.indexOf("localStorage.setItem('tts_enabled'") + 200);
    expect(save).toMatch(/ttsMountedRef\.current/);
    const stop = src.slice(src.indexOf('ttsEnabledRef.current = ttsEnabled;'),
      src.indexOf('}, [ttsEnabled, stopTts]);'));
    expect(stop).toMatch(/ttsMountedRef\.current/);
  });
});
