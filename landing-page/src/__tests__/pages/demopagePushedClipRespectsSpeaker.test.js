/**
 * Source-level pin: Demopage's one pushed-clip player passes the speaker
 * toggle into shouldPlayPushedClip, and turning the speaker off silences a
 * clip that is already playing.
 *
 * Measured 2026-10-21 on the installed app: with the speaker OFF the server
 * still pushed the reply's audio and the page played it ("[TTS] Clip
 * played").  playPushedTts is a useCallback with [] deps, so it must read the
 * toggle through a ref, not the state value captured at mount.  Same
 * approach and limits as constants/chatBubble.test.js: Demopage's provider
 * tree is not mountable here, so this pins the wiring, not the runtime.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(__dirname, '../../pages/Demopage.js'), 'utf8');

describe('Demopage pushed clip follows the speaker toggle', () => {
  // The call itself (third argument = ttsEnabledRef.current) is pinned in
  // utils/__tests__/demopagePerTurnRequestId.test.js, the one place that
  // pins how the player asks the guard.

  test('the ref follows the toggle', () => {
    expect(src).toMatch(/const ttsEnabledRef = useRef\(ttsEnabled\);/);
    expect(src).toMatch(/ttsEnabledRef\.current = ttsEnabled;/);
  });

  test('turning the speaker off stops the clip through useTTS (the one stop)', () => {
    // tts.stop() pauses the shared element AND stops browser PocketTTS and
    // clears the queue; a bare el.pause() here did only the first.
    const effect = src.slice(src.indexOf('ttsEnabledRef.current = ttsEnabled;'));
    const body = effect.slice(0, effect.indexOf('}, [ttsEnabled'));
    expect(body).toMatch(/if \(ttsEnabled\) return;/);
    expect(body).toMatch(/tts\.stop\(\)/);
    expect(body).not.toMatch(/\.pause\(\)/);
  });
});
