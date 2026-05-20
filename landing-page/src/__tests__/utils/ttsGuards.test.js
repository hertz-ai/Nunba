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
  };

  test('allows speak when all conditions met', () => {
    expect(shouldSpeakLocalReply(baseOpts)).toBe(true);
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
    })).toBe(false);
  });
});
