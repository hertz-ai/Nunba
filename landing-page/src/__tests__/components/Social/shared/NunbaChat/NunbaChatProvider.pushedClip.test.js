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
