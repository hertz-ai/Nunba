/**
 * #206 backfill — pin the local-reply speak-guard contract.
 *
 * Extracted from Demopage.handleSend so the guards are testable
 * without React Testing Library.  See ttsGuards.js for the design
 * doc.
 */

const {
  shouldSpeakLocalReply,
  isDraftReply,
  hasServerAudioPayload,
  shouldPlayPushedClip,
} = require('../../utils/ttsGuards');


describe('#206 isDraftReply', () => {
  test('true when speculation_id + expert_pending both present', () => {
    expect(isDraftReply({
      speculation_id: 'spec-1',
      expert_pending: true,
    })).toBe(true);
  });

  test('false when only speculation_id present', () => {
    expect(isDraftReply({speculation_id: 'spec-1'})).toBe(false);
  });

  test('false when only expert_pending present', () => {
    expect(isDraftReply({expert_pending: true})).toBe(false);
  });

  test('false on null/empty resultData', () => {
    expect(isDraftReply(null)).toBe(false);
    expect(isDraftReply(undefined)).toBe(false);
    expect(isDraftReply({})).toBe(false);
  });
});


describe('#206 hasServerAudioPayload', () => {
  test('detects audio_url', () => {
    expect(hasServerAudioPayload({audio_url: '/tts/a.wav'})).toBe(true);
  });

  test('detects aud_url (alt key)', () => {
    expect(hasServerAudioPayload({aud_url: '/tts/a.wav'})).toBe(true);
  });

  test('detects nested video_link.aud_url (SSE shape)', () => {
    expect(hasServerAudioPayload({
      video_link: {aud_url: '/tts/a.wav'},
    })).toBe(true);
  });

  test('false when no audio keys present', () => {
    expect(hasServerAudioPayload({text: 'just text'})).toBe(false);
  });

  test('false on null/empty input', () => {
    expect(hasServerAudioPayload(null)).toBe(false);
    expect(hasServerAudioPayload({})).toBe(false);
  });
});


describe('#206 shouldSpeakLocalReply', () => {
  const baseOpts = {
    ttsEnabled: true,
    ttsAvailable: true,
    responseText: 'Hi there!',
    isDraft: false,
    hasServerAudio: false,
    realtimeConnected: false,  // SSE disconnected — client is the fallback
  };

  test('allows speak when SSE disconnected AND all other conditions met', () => {
    expect(shouldSpeakLocalReply(baseOpts)).toBe(true);
  });

  test('blocks when SSE is connected (server delivers audio via SSE)', () => {
    expect(shouldSpeakLocalReply({...baseOpts, realtimeConnected: true}))
      .toBe(false);
  });

  test('blocks when ttsEnabled=false', () => {
    expect(shouldSpeakLocalReply({...baseOpts, ttsEnabled: false}))
      .toBe(false);
  });

  test('blocks when ttsAvailable=false (engine still loading)', () => {
    expect(shouldSpeakLocalReply({...baseOpts, ttsAvailable: false}))
      .toBe(false);
  });

  test('blocks when responseText is empty/null', () => {
    expect(shouldSpeakLocalReply({...baseOpts, responseText: ''}))
      .toBe(false);
    expect(shouldSpeakLocalReply({...baseOpts, responseText: null}))
      .toBe(false);
  });

  test('blocks draft (expert reply still pending)', () => {
    expect(shouldSpeakLocalReply({...baseOpts, isDraft: true})).toBe(false);
  });

  test('blocks when backend already shipped audio', () => {
    expect(shouldSpeakLocalReply({...baseOpts, hasServerAudio: true}))
      .toBe(false);
  });

  test('all-blocked combos return false', () => {
    expect(shouldSpeakLocalReply({
      ttsEnabled: false,
      ttsAvailable: false,
      responseText: '',
      isDraft: true,
      hasServerAudio: true,
      realtimeConnected: true,
    })).toBe(false);
  });
});


// Whether a server-pushed clip (SSE 'tts' or WAMP, Demopage.playPushedTts)
// plays: only the current turn's.  Each turn carries its own id, so a reply
// that lands after the next send is not spoken over it (measured 2026-10-11:
// two voice turns 29 s apart, two clips, one page id).  The one rule for
// whose turn an envelope is lives in constants/chatBubble.isOtherTurnEnvelope.
describe('shouldPlayPushedClip', () => {
  const first = 'msg_1760160492473_k3j9x1';
  const second = 'msg_1760160521422_a1b2c3';
  const clip = (requestId) => ({generated_audio_url: '/tts/audio/a.wav', request_id: requestId});

  test('the current turn\'s clip plays', () => {
    expect(shouldPlayPushedClip(clip(second), second)).toBe(true);
  });

  test('an earlier turn\'s clip does not play once a newer turn was sent', () => {
    expect(shouldPlayPushedClip(clip(first), second)).toBe(false);
  });

  test('a background agent\'s clip never plays, with or without a turn of our own', () => {
    expect(shouldPlayPushedClip(clip('daemon_goal_20260412_235046_b18bba6f'), second)).toBe(false);
    expect(shouldPlayPushedClip(clip('daemon_goal_20260412_235046_b18bba6f'), null)).toBe(false);
  });

  test('a clip with no id, or one arriving before the page has a turn, plays', () => {
    expect(shouldPlayPushedClip(clip(undefined), second)).toBe(true);
    expect(shouldPlayPushedClip(clip(first), null)).toBe(true);
  });

  test('nothing plays without a clip url', () => {
    expect(shouldPlayPushedClip({request_id: second}, second)).toBe(false);
    expect(shouldPlayPushedClip(null, second)).toBe(false);
    expect(shouldPlayPushedClip(undefined, null)).toBe(false);
  });
});
