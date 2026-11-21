/**
 * When the server cannot synthesize, the browser's own voice takes over.
 * It must say the words the server would have said: the server cuts markup
 * and emoji (HARTOS normalize_for_tts) and names the result "spoken_text" in
 * its error answer.  Before this, the fallback read the raw reply aloud,
 * asterisks included (task #184).  The page keeps no cutting rule of its own.
 */
import {renderHook, act} from '@testing-library/react';

const mockPocketTTSInstance = {
  init: jest.fn(() => Promise.resolve()),
  speak: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  isReady: false,
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

import {useTTS} from '../../hooks/useTTS';

const statusOk = {
  ok: true,
  json: () => Promise.resolve({available: true}),
  blob: () => Promise.resolve(new Blob(['x'])),
};

let uttered;

beforeEach(() => {
  jest.clearAllMocks();
  uttered = [];
  jest
    .spyOn(window.HTMLMediaElement.prototype, 'play')
    .mockResolvedValue(undefined);
  jest
    .spyOn(window.HTMLMediaElement.prototype, 'pause')
    .mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.SpeechSynthesisUtterance = jest.fn(function (text) {
    this.text = text;
    uttered.push(text);
  });
  window.speechSynthesis = {
    cancel: jest.fn(),
    speak: jest.fn(),
    getVoices: jest.fn(() => []),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.speechSynthesis;
});

async function speakWithServerAnswer(answer, text) {
  global.fetch = jest.fn((url) =>
    Promise.resolve(String(url).endsWith('/synthesize') ? answer : statusOk)
  );
  const {result} = renderHook(() => useTTS());
  await act(async () => {
    await result.current.checkStatus();
  });
  let returned;
  await act(async () => {
    returned = await result.current.speak(text);
  });
  return returned;
}

describe('the browser voice says what the server would have said', () => {
  it('speaks the server-cut words, not the markup', async () => {
    const returned = await speakWithServerAnswer(
      {
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({error: 'Synthesis failed', spoken_text: 'Well done'}),
      },
      '**Well done** \u{1F642}'
    );
    expect(returned).toBe('webspeech');
    expect(uttered).toEqual(['Well done']);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('speaks the text as sent when the answer names no words', async () => {
    await speakWithServerAnswer(
      {ok: false, status: 503, json: () => Promise.resolve({error: 'TTS not available'})},
      'Hello there'
    );
    expect(uttered).toEqual(['Hello there']);
  });

  it('speaks the text as sent when the answer is not JSON', async () => {
    await speakWithServerAnswer(
      {ok: false, status: 502, json: () => Promise.reject(new Error('not json'))},
      'Hello there'
    );
    expect(uttered).toEqual(['Hello there']);
  });

  it('sends the server the text as written', async () => {
    await speakWithServerAnswer(
      {ok: false, status: 500, json: () => Promise.resolve({spoken_text: 'Hi'})},
      '*Hi*'
    );
    const call = global.fetch.mock.calls.find(([u]) =>
      String(u).endsWith('/synthesize')
    );
    expect(JSON.parse(call[1].body).text).toBe('*Hi*');
  });
});
