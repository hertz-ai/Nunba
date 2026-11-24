/**
 * useSpeechRecognition - Web Speech Recognition Hook
 *
 * Web equivalent of the React Native useSpeechRecognition hook.
 * Primary: WebSocket STT at ws://127.0.0.1:8005 (HARTOS streaming Whisper)
 * Fallback: Browser webkitSpeechRecognition / SpeechRecognition API
 *
 * API matches the RN hook exactly:
 *   { transcript, isListening, confidence, startListening, stopListening, resetTranscript, error }
 *
 * Language.  `language` PINS the recognizer to one language: the local
 * Whisper is told to decode that language and nothing else, and the browser
 * fallback is set to it.  The kids' games pass 'en' because they are English
 * by design.  Without it (the chat mic) the local Whisper detects the
 * language of each utterance itself -- the streaming server treats a config
 * with no language as "auto-detect per utterance" -- so a person can speak
 * Tamil, Hindi or English to the same mic.  Until 2026-09-16 the chat mic
 * pinned the stream to hart_language ('en' on the owner's box), so anything
 * spoken in another language was decoded as English.  The browser fallback
 * (Web Speech) cannot detect and must be told a language, so startListening
 * takes `preferredLanguage` (the person's hart_language) for that path.
 *
 * @param {Object} [config]
 * @param {string} [config.language] - ISO 639-1 code to pin the recognizer to (absent = detect)
 * @param {function} [config.onResult] - Callback with final transcript text
 * @param {function} [config.onPartialResult] - Callback with partial transcript text
 * @param {function} [config.onError] - Callback with error string
 * @param {string|null} [config.sttUrl] - streaming STT socket.  Default is
 *   the local HARTOS Whisper (ws://127.0.0.1:8005).  `null` / '' skips the
 *   socket and goes straight to the browser recognizer; so does a plain ws://
 *   URL on an https page, which the browser would block as mixed content.
 */

import {useState, useEffect, useRef, useCallback} from 'react';

const WS_STT_URL = 'ws://127.0.0.1:8005';

// A ws:// socket from an https page is mixed content: the browser refuses it,
// so trying it only adds the 3 s open timeout before the fallback.
export function usableSttUrl(url, pageProtocol) {
  if (!url) return null;
  if (pageProtocol === 'https:' && /^ws:\/\//i.test(url)) return null;
  return url;
}

// Check if browser SpeechRecognition is available
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// The streaming server's per-connection config: {type:'config', language}
// pins the language; the same message without `language` leaves Whisper to
// detect it per utterance (whisper_tool._stt_stream_handler).
//
// `continuous` says the mic stays open (the chat page opened it by itself):
// nobody releases it, so the server ends each utterance at a pause instead of
// waiting for {control:'final'} (whisper_tool._stt_stream_handler; owner
// 2026-11-24: an open mic's words otherwise waited for the 30 s flush).
export function sttConfigMessage(language, {continuous = false} = {}) {
  const message = language ? {type: 'config', language} : {type: 'config'};
  if (continuous) message.continuous = true;
  return message;
}

// How long a mic waits before each try to get its speech socket back.  After
// the last one it gives up and says so.  Owner 2026-11-24: the chat mic's
// socket died at 14:39, the button kept showing Stop, nothing reconnected, and
// everything said from 15:00 to 15:06 was lost.
export const STT_RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000];
// Audio held while the socket is down: 30 s of 16 kHz PCM16, the server's
// own longest utterance.  The oldest frames go first.
export const STT_HELD_AUDIO_BYTES = 16000 * 2 * 30;
// A socket that stayed open this long earns a fresh set of retries.
const STT_STEADY_MS = 5000;

// One speech socket for a mic, kept open for as long as the mic is: every mic
// that streams to the local Whisper uses this (the chat page's own mic and
// useSpeechRecognition below), so reconnecting lives in one place.
//
//   send(frame)   streams a PCM frame; while the socket is down the frame is
//                 held and sent, in order, once it is back
//   finish(waitMs, then)  ends the stream: asks for the last words
//                 ({control:'final'}), closes after waitMs, then calls `then`
//
// A socket that never opened is not retried (the caller falls back at once);
// one that was working is retried on STT_RECONNECT_DELAYS_MS, the config sent
// again each time.  onGiveUp() runs when it does not come back.
export function openSttLink(url, {config, onMessage, onOpen, onGiveUp} = {}) {
  let ws = null;
  let finished = false;
  let opened = false;
  let openedAt = 0;
  let failures = 0;
  let retry = null;
  const held = [];
  let heldBytes = 0;

  const isOpen = () => !!ws && ws.readyState === WebSocket.OPEN;

  const flush = () => {
    while (held.length && isOpen()) {
      const frame = held.shift();
      heldBytes -= frame.byteLength;
      ws.send(frame);
    }
  };

  const giveUp = (why) => {
    finished = true;
    console.warn(`[STT] the speech socket is gone (${why}); the mic stopped`);
    if (onGiveUp) onGiveUp();
  };

  const connect = () => {
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => {
      if (ws !== sock || finished) return;
      opened = true;
      openedAt = Date.now();
      sock.send(JSON.stringify(config || {type: 'config'}));
      flush();
      if (onOpen) onOpen();
    };
    sock.onmessage = (event) => { if (ws === sock && onMessage) onMessage(event); };
    // A socket that never opened gives up on its error, so the caller falls
    // back at once; for one that was working the close that follows decides.
    sock.onerror = () => {
      if (ws === sock && !opened && !finished) giveUp('it never opened');
    };
    sock.onclose = (event) => {
      if (ws !== sock || finished) return;
      const code = event && event.code;
      const reason = (event && event.reason) || '';
      if (!opened) {
        giveUp(`it never opened, code ${code}`);
        return;
      }
      if (openedAt && Date.now() - openedAt >= STT_STEADY_MS) failures = 0;
      openedAt = 0;
      if (failures >= STT_RECONNECT_DELAYS_MS.length) {
        giveUp(`closed with code ${code}${reason ? ` (${reason})` : ''} and did not come back`);
        return;
      }
      const delay = STT_RECONNECT_DELAYS_MS[failures];
      failures += 1;
      console.warn(`[STT] the speech socket closed (code ${code}${reason ? `, ${reason}` : ''}); `
        + `reconnecting in ${delay} ms`);
      retry = setTimeout(() => { retry = null; if (!finished) connect(); }, delay);
    };
  };

  connect();
  return {
    send(frame) {
      if (finished) return;
      if (isOpen() && !held.length) {
        ws.send(frame);
        return;
      }
      held.push(frame);
      heldBytes += frame.byteLength;
      while (heldBytes > STT_HELD_AUDIO_BYTES && held.length) heldBytes -= held.shift().byteLength;
      flush();
    },
    isOpen,
    // Drop the stream without asking for its last words (unmount, a page
    // that went away): no final, no reconnect.
    close() {
      finished = true;
      if (retry) { clearTimeout(retry); retry = null; }
      try { if (ws) ws.close(); } catch (_) { /* already closed */ }
    },
    finish(waitMs = 600, then) {
      finished = true;
      if (retry) { clearTimeout(retry); retry = null; }
      const sock = ws;
      if (sock && sock.readyState === WebSocket.OPEN) {
        try { sock.send(JSON.stringify({control: 'final'})); } catch (_) { /* closing anyway */ }
        setTimeout(() => {
          try { sock.close(); } catch (_) { /* already closed */ }
          if (then) then();
        }, waitMs);
      } else {
        try { if (sock) sock.close(); } catch (_) { /* already closed */ }
        if (then) then();
      }
    },
  };
}

// A browser recognizer that keeps listening: it restarts on every end
// (silence timeout, network blip) until stop() is called.  The restart reads
// this listener's own flag.  The wake-word listener used to read the React
// state it was created with, which stayed true after the owner turned it off:
// stop() fires onend, onend restarted it, and the orphaned listener held the
// mic until a reload (2026-10-03: the mic button then did nothing).
export function startContinuousRecognition(Recognition, lang, onResult) {
  let stopped = false;
  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = lang;
  recognition.onresult = onResult;
  recognition.onend = () => { if (!stopped) recognition.start(); };
  recognition.start();
  return {
    recognition,
    stop: () => { stopped = true; recognition.stop(); },
  };
}

// Speech is meant for Nunba when it names Nunba ("Hey Nunba, ...").  Returns
// what was said after the name -- leading punctuation dropped, words as
// spoken -- '' when the name came with nothing after it, and null when the
// name is not in it.  The one rule for both the "Hey Nunba" listener and a
// mic the chat page opened by itself (micTurnText below).  The name counts
// only as a whole word: "the nunbas are here" does not name Nunba (it used to
// send "s are here").
const WAKE_WORD = /\bnunba\b/i;
export function addressedToNunba(text) {
  const said = String(text || '');
  const named = WAKE_WORD.exec(said);
  if (!named) return null;
  return said.slice(named.index + named[0].length).replace(/^[\s,.:;!?-]+/, '').trim();
}

// What one final transcript from the chat page's mic sends as a turn, or null
// to send nothing.  A mic the person clicked open sends what they said.  A
// mic the page opened by itself (it starts listening once speech recognition
// is ready) hears the whole room, so it sends only speech addressed to Nunba:
// on 2026-11-03 three background-speech finals ("1.5°C 1.5°C", "And he leaves
// me sickly...") each became an agent turn.
export function micTurnText(said, unprompted) {
  const words = unprompted ? addressedToNunba(said) : String(said || '').trim();
  return words || null;
}

// What the person is told about such a mic: when the page opens it, and the
// first time it drops speech that did not name Nunba.  Without it the refusal
// was silent: the red Stop looked like a mic that hears everything, and the
// dropped words left only a console line.
export const OPEN_MIC_CUE = 'I\'m listening. Start with "Nunba" to talk to me.';

// What the person is told when a mic's speech socket did not come back, so the
// button never shows a mic that hears nothing (owner 2026-11-24, "I see stop
// which means nunba is still listening isnt").
export const MIC_STOPPED_CUE = 'The microphone stopped because the speech service did not come back. Click the mic to start it again.';

export default function useSpeechRecognition(config = {}) {
  const {
    language: defaultLanguage = null,
    onResult,
    onPartialResult,
    onError: onErrorCallback,
    sttUrl = WS_STT_URL,
  } = config;
  const sttUrlRef = useRef(sttUrl);
  sttUrlRef.current = sttUrl;

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(-1);
  const [error, setError] = useState(null);
  // Which STT path is active — exposed as a state so the UI can show a
  // local-vs-cloud privacy badge.  null = idle, 'ws' = local Whisper,
  // 'browser' = browser SpeechRecognition (cloud-backed in Chrome/Edge).
  const [activeMethod, setActiveMethod] = useState(null);

  const mountedRef = useRef(true);
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const activeMethodRef = useRef(null); // 'ws' | 'browser'

  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onErrorCallback);

  onResultRef.current = onResult;
  onPartialResultRef.current = onPartialResult;
  onErrorRef.current = onErrorCallback;

  // ── WebSocket STT ──────────────────────────────────────────────────────────

  const startWebSocketSTT = useCallback(async (lang) => {
    const url = usableSttUrl(
      sttUrlRef.current,
      typeof window !== 'undefined' ? window.location.protocol : '');
    if (!url) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      mediaStreamRef.current = stream;

      return new Promise((resolve) => {
        // `settled` is the first open (or the 3 s give-up); a reconnect's
        // open finds the audio already flowing into the same link.
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          link.close();
          resolve(false);
        }, 3000);

        const onMessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            const text = (data.text || data.transcript || '').trim();
            const conf = data.confidence ?? -1;

            if (text) {
              setTranscript(text);
              setConfidence(conf);

              if (data.is_final || data.isFinal) {
                if (onResultRef.current) onResultRef.current(text);
              } else {
                if (onPartialResultRef.current) onPartialResultRef.current(text);
              }
            }
          } catch (_) {}
        };

        // The socket did not come back: say so and stop the mic, so the
        // button never shows a mic that hears nothing.  Before the first
        // open this is the caller's fallback instead.
        const onGiveUp = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(false);
            return;
          }
          if (wsRef.current !== link) return;
          wsRef.current = null;
          if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch (_) {}
            processorRef.current = null;
          }
          if (audioCtxRef.current) {
            try { audioCtxRef.current.close(); } catch (_) {}
            audioCtxRef.current = null;
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
          if (mountedRef.current && activeMethodRef.current === 'ws') {
            activeMethodRef.current = null;
            setActiveMethod(null);
            setIsListening(false);
            setError(MIC_STOPPED_CUE);
          }
          if (onErrorRef.current) onErrorRef.current(MIC_STOPPED_CUE);
        };

        const onOpen = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          // Set up audio streaming via AudioContext + ScriptProcessor
          // Note: WKWebView may ignore sampleRate and give hardware rate
          const TARGET_RATE = 16000;
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: TARGET_RATE,
          });
          const actualRate = audioCtx.sampleRate;
          const needsResample = actualRate !== TARGET_RATE;
          const source = audioCtx.createMediaStreamSource(stream);
          // ScriptProcessor is deprecated but widely supported; AudioWorklet
          // requires a separate file which complicates bundling
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);

          // Every frame goes to the link: while its socket is down the link
          // holds the frame and sends it once the socket is back.
          processor.onaudioprocess = (e) => {
            let inputData = e.inputBuffer.getChannelData(0);
            // Resample to 16kHz if AudioContext gave a different rate
            if (needsResample) {
              const ratio = actualRate / TARGET_RATE;
              const newLen = Math.round(inputData.length / ratio);
              const resampled = new Float32Array(newLen);
              for (let i = 0; i < newLen; i++) {
                resampled[i] = inputData[Math.round(i * ratio)];
              }
              inputData = resampled;
            }
            // Convert float32 to int16 PCM
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            link.send(pcm16.buffer);
          };

          source.connect(processor);
          processor.connect(audioCtx.destination);

          audioCtxRef.current = audioCtx;
          processorRef.current = processor;

          if (mountedRef.current) {
            activeMethodRef.current = 'ws';
            setActiveMethod('ws');
            setIsListening(true);
          }
          resolve(true);
        };

        // No language = Whisper detects per utterance.
        const link = openSttLink(url, {
          config: sttConfigMessage(lang), onMessage, onOpen, onGiveUp});
        wsRef.current = link;
      });
    } catch (err) {
      return false;
    }
  }, []);

  // ── Browser SpeechRecognition fallback ─────────────────────────────────────

  const startBrowserSTT = useCallback((lang) => {
    if (!SpeechRecognitionAPI) {
      const msg = 'Speech recognition not supported in this browser';
      if (mountedRef.current) setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!mountedRef.current) return;
      activeMethodRef.current = 'browser';
      setActiveMethod('browser');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      if (!mountedRef.current) return;
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          final += text;
          setConfidence(result[0].confidence ?? -1);
        } else {
          interim += text;
        }
      }

      if (final) {
        setTranscript(final.trim());
        if (onResultRef.current) onResultRef.current(final.trim());
      } else if (interim) {
        setTranscript(interim.trim());
        if (onPartialResultRef.current) onPartialResultRef.current(interim.trim());
      }
    };

    recognition.onerror = (event) => {
      if (!mountedRef.current) return;
      // 'no-speech' is common and not a real error
      if (event.error === 'no-speech') return;
      const msg = event.error || 'Speech recognition error';
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  const startListening = useCallback(async (options = {}) => {
    if (!mountedRef.current) return;

    // A pinned language (options or hook config) binds both paths.  With
    // none, the local Whisper detects the spoken language; the browser
    // fallback cannot, so it takes the person's preference, else the
    // browser's own language.
    const pinned = options.language || defaultLanguage || null;

    setError(null);
    setTranscript('');
    setConfidence(-1);

    // Try WebSocket STT first (local HARTOS Whisper)
    const wsOk = await startWebSocketSTT(pinned);
    if (wsOk) return;

    // Fallback to browser SpeechRecognition
    const browserLang = pinned || options.preferredLanguage
      || (typeof navigator !== 'undefined' && navigator.language) || 'en';
    startBrowserSTT(browserLang);
  }, [defaultLanguage, startWebSocketSTT, startBrowserSTT]);

  const stopListening = useCallback(() => {
    // Stop capturing new audio immediately (mic + processor + context), so no
    // more frames are sent after the user releases the mic.
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (_) {}
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Flush a FINAL transcript before closing the WS. The streaming server only
    // emits {is_final:true} — which is what drives onResult — when it receives
    // {control:'final'} (or at the 30s max-buffer). Closing the socket without
    // it means the trailing audio is never transcribed and onResult NEVER
    // fires: every short utterance looked "broken". Send the flush, keep the
    // socket open briefly so the final reply (handled by the link's onMessage
    // above) arrives, then close.  finish() also stops any reconnect.
    const link = wsRef.current;
    wsRef.current = null;
    if (link) link.finish(600);

    // Stop browser SpeechRecognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    activeMethodRef.current = null;
    if (mountedRef.current) {
      setActiveMethod(null);
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    if (!mountedRef.current) return;
    setTranscript('');
    setConfidence(-1);
    setError(null);
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) try { processorRef.current.disconnect(); } catch (_) {}
      if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch (_) {}
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}
    };
  }, []);

  return {
    transcript,
    isListening,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    error,
    // Path indicator: 'ws' when local HARTOS Whisper is connected,
    // 'browser' when falling back to the browser SpeechRecognition API
    // (cloud-backed in Chrome/Edge), null when idle.  UI uses this to
    // show users whether their audio stays local or is sent to the cloud.
    activeMethod,
    usingFallback: activeMethod === 'browser',
  };
}
