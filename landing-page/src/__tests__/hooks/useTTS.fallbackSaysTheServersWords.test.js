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
  return {returned, result};
}

describe('the browser voice says what the server would have said', () => {
  it('speaks the server-cut words, not the markup', async () => {
    const {returned} = await speakWithServerAnswer(
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

  // Review rv_66ba of aa885268: the page spoke an empty utterance and showed
  // "speaking" (uttered=[""], isSpeaking=true) when the server found no words.
  it('says nothing when the server found no words in the text', async () => {
    const {returned, result} = await speakWithServerAnswer(
      {
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({error: 'No text provided', spoken_text: ''}),
      },
      '** **'
    );
    expect(uttered).toEqual([]);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(returned).toBeNull();
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('says nothing when the words the server names are only spaces', async () => {
    const {returned, result} = await speakWithServerAnswer(
      {ok: false, status: 400, json: () => Promise.resolve({spoken_text: ' \n'})},
      '\u{1F642}'
    );
    expect(uttered).toEqual([]);
    expect(returned).toBeNull();
    expect(result.current.isSpeaking).toBe(false);
  });

  // The two other ways into the browser voice (review rv_537b of bb142dd0):
  // neither has a server answer naming words, so the text as sent is said.
  it('speaks the text as sent when the request never reaches the server', async () => {
    global.fetch = jest.fn((url) =>
      String(url).endsWith('/synthesize')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve(statusOk)
    );
    const {result} = renderHook(() => useTTS());
    await act(async () => {
      await result.current.checkStatus();
    });
    let returned;
    await act(async () => {
      returned = await result.current.speak('Hello there');
    });
    expect(returned).toBe('webspeech');
    expect(uttered).toEqual(['Hello there']);
    expect(result.current.isSpeaking).toBe(true);
  });

  it('speaks the text as sent when the audio came but may not be played', async () => {
    const hadCreate = 'createObjectURL' in URL;
    const create = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:speech');
    window.HTMLMediaElement.prototype.play.mockRejectedValue(
      new Error('NotAllowedError: play() blocked')
    );
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const {returned} = await speakWithServerAnswer(
        {ok: true, status: 200, blob: () => Promise.resolve(new Blob(['wav']))},
        'Hello there'
      );
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
      expect(returned).toBe('webspeech');
      expect(uttered).toEqual(['Hello there']);
    } finally {
      if (hadCreate) URL.createObjectURL = create;
      else delete URL.createObjectURL;
    }
  });

  it('still speaks when the server names words on a 400', async () => {
    const {returned} = await speakWithServerAnswer(
      {ok: false, status: 400, json: () => Promise.resolve({spoken_text: 'Hi'})},
      '*Hi*'
    );
    expect(returned).toBe('webspeech');
    expect(uttered).toEqual(['Hi']);
  });
});
