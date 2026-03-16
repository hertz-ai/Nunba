/* eslint-disable */
/**
 * PocketTTS Browser Service
 *
 * Headless wrapper around the pocket-tts ONNX Web Worker.
 * No DOM dependencies — designed for React integration via useTTS hook.
 *
 * Usage:
 *   const tts = new PocketTTSService();
 *   await tts.init();
 *   tts.speak('Hello world');
 *   tts.stop();
 */

const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_ENGINE = 'pocket';

// ---- Inline PCM AudioWorklet processor code ----
const PCM_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = sampleRate * 60;
    this.ring = new Float32Array(this.bufferSize);
    this.rp = 0; this.wp = 0;
    this.playing = false;
    this.ended = false;
    this.minBuf = Math.floor(50 * sampleRate / 1000); // 50ms buffer — low latency
    this.samplesPlayed = 0;
    this.totalSamplesReceived = 0;
    this.positionInterval = Math.floor(50 * sampleRate / 1000); // report every 50ms
    this.lastPositionReport = 0;
    this.port.onmessage = (e) => {
      if (e.data.type === 'audio') this.addAudio(e.data.data);
      else if (e.data.type === 'reset') this.reset();
      else if (e.data.type === 'stream-ended') this.ended = true;
    };
  }
  buffered() { return this.wp >= this.rp ? this.wp - this.rp : this.bufferSize - this.rp + this.wp; }
  addAudio(d) {
    const n = d.length;
    this.totalSamplesReceived += n;
    if (this.wp + n <= this.bufferSize) { this.ring.set(d, this.wp); this.wp += n; if (this.wp >= this.bufferSize) this.wp = 0; }
    else { const f = this.bufferSize - this.wp; this.ring.set(d.slice(0,f), this.wp); this.ring.set(d.slice(f), 0); this.wp = n - f; }
    if (!this.playing && this.buffered() >= this.minBuf) { this.playing = true; this.port.postMessage({type:'playback-started'}); }
  }
  process(inputs, outputs) {
    const out = outputs[0]; if (!out||!out[0]) return true;
    const ch = out[0], ns = ch.length;
    if (!this.playing) { ch.fill(0); return true; }
    const b = this.buffered();
    let samplesRead = 0;
    if (b < ns) {
      if (b > 0) {
        if (this.rp + b <= this.bufferSize) { for(let i=0;i<b;i++) ch[i]=this.ring[this.rp+i]; this.rp+=b; if(this.rp>=this.bufferSize) this.rp=0; }
        else { const f=this.bufferSize-this.rp; for(let i=0;i<f;i++) ch[i]=this.ring[this.rp+i]; for(let i=0;i<b-f;i++) ch[f+i]=this.ring[i]; this.rp=b-f; }
        samplesRead = b;
      }
      for(let i=b;i<ns;i++) ch[i]=0;
      if (this.ended && b===0) { this.port.postMessage({type:'playback-complete', samplesPlayed: this.samplesPlayed}); this.playing=false; this.ended=false; }
    } else {
      if (this.rp + ns <= this.bufferSize) { for(let i=0;i<ns;i++) ch[i]=this.ring[this.rp+i]; this.rp+=ns; if(this.rp>=this.bufferSize) this.rp=0; }
      else { const f=this.bufferSize-this.rp; for(let i=0;i<f;i++) ch[i]=this.ring[this.rp+i]; for(let i=0;i<ns-f;i++) ch[f+i]=this.ring[i]; this.rp=ns-f; }
      samplesRead = ns;
    }
    this.samplesPlayed += samplesRead;
    if (this.playing && this.samplesPlayed - this.lastPositionReport >= this.positionInterval) {
      this.lastPositionReport = this.samplesPlayed;
      this.port.postMessage({type:'playback-position', samplesPlayed: this.samplesPlayed, totalReceived: this.totalSamplesReceived});
    }
    return true;
  }
  reset() { this.rp=0; this.wp=0; this.ring.fill(0); this.playing=false; this.ended=false; this.samplesPlayed=0; this.totalSamplesReceived=0; this.lastPositionReport=0; }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export class PocketTTSService {
  /**
   * @param {Object} [options]
   * @param {number} [options.sampleRate=24000] - Audio sample rate (48000 for LuxTTS, 24000 for Pocket)
   * @param {'luxtts'|'pocket'} [options.engine='pocket'] - TTS engine to load
   */
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || DEFAULT_SAMPLE_RATE;
    this.engine = options.engine || DEFAULT_ENGINE;
    this.fadeSamples = Math.floor(0.02 * this.sampleRate); // 20ms fade

    this.worker = null;
    this.audioCtx = null;
    this.workletNode = null;
    this.gainNode = null;

    this.isReady = false;
    this.isLoading = false;
    this.isGenerating = false;
    this.loadError = null;

    this.availableVoices = [];
    this.currentVoice = null;

    // Callbacks (set by consumer)
    this.onReady = null; // () => void
    this.onStatus = null; // (status: string, state: string) => void
    this.onError = null; // (error: string) => void
    this.onFirstAudio = null; // () => void  — first audio chunk received
    this.onComplete = null; // () => void  — generation + playback done
    this.onVoicesLoaded = null; // (voices: string[], defaultVoice: string) => void
    this.onPlaybackPosition = null; // (positionMs: number, totalReceivedMs: number) => void

    this._resolveSpeak = null;
    this._rejectSpeak = null;
    this._isFirstChunk = true;
    this._deferEnd = false;
  }

  /**
   * Initialize the service: create AudioContext, load worklet, spawn worker.
   * Call once on user interaction (click) to satisfy autoplay policy.
   */
  async init() {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;

    try {
      // AudioContext — sample rate adapts to selected engine
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive',
      });

      // Gain node
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);

      // Load inline PCM worklet processor
      const blob = new Blob([PCM_WORKLET_CODE], {
        type: 'application/javascript',
      });
      const url = URL.createObjectURL(blob);
      await this.audioCtx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor');
      this.workletNode.connect(this.gainNode);
      this.workletNode.port.onmessage = (e) => {
        if (e.data.type === 'playback-started' && this._isFirstChunk) {
          this._isFirstChunk = false;
          this.onFirstAudio?.();
        }
        if (e.data.type === 'playback-position') {
          const posMs = (e.data.samplesPlayed / this.sampleRate) * 1000;
          const totalMs = (e.data.totalReceived / this.sampleRate) * 1000;
          this.onPlaybackPosition?.(posMs, totalMs);
        }
        if (e.data.type === 'playback-complete') {
          if (this._deferEnd) {
            this._deferEnd = false;
            this._finishGeneration();
          }
        }
      };

      // Spawn unified TTS worker (selects engine based on capability probe)
      this.worker = new Worker('/workers/tts-worker.js', {type: 'module'});
      this.worker.onmessage = (e) => this._handleWorkerMsg(e.data);
      this.worker.onerror = (err) => {
        console.error('TTS worker error:', err);
        this.loadError = err.message;
        this.onError?.('Worker crashed: ' + err.message);
      };

      // Tell worker to load the selected engine's models
      this.worker.postMessage({type: 'load', data: {engine: this.engine}});
    } catch (err) {
      this.isLoading = false;
      this.loadError = err.message;
      console.error('PocketTTS init failed:', err);
      throw err;
    }
  }

  _handleWorkerMsg(msg) {
    switch (msg.type) {
      case 'status':
        this.onStatus?.(msg.status, msg.state);
        break;
      case 'loaded':
        this.isReady = true;
        this.isLoading = false;
        this.onReady?.();
        break;
      case 'voices_loaded':
        this.availableVoices = msg.voices || [];
        this.currentVoice = msg.defaultVoice;
        this.onVoicesLoaded?.(this.availableVoices, this.currentVoice);
        break;
      case 'voice_set':
      case 'voice_encoded':
        this.currentVoice = msg.voiceName;
        break;
      case 'audio_chunk':
        this._handleAudioChunk(msg.data, msg.metrics);
        break;
      case 'stream_ended':
        this._handleStreamEnd();
        break;
      case 'error':
        console.error('PocketTTS worker error:', msg.error);
        this.isGenerating = false;
        this.onError?.(msg.error);
        this._rejectSpeak?.(new Error(msg.error));
        this._resolveSpeak = null;
        this._rejectSpeak = null;
        break;
    }
  }

  _handleAudioChunk(audioData, metrics) {
    if (!this.isGenerating) return;

    // Apply fade-in at chunk start, fade-out at end
    const fadeSamples = this.fadeSamples;
    if (metrics.isFirst || metrics.chunkStart) {
      const len = Math.min(fadeSamples, audioData.length);
      for (let i = 0; i < len; i++) audioData[i] *= i / len;
    }
    if (metrics.isLast) {
      const len = Math.min(fadeSamples, audioData.length);
      const start = audioData.length - len;
      for (let i = 0; i < len; i++) audioData[start + i] *= 1 - i / len;
    }

    // First audio chunk callback (for TTFB tracking)
    if (metrics.isFirst) this.onFirstAudio?.();

    // Send to AudioWorklet
    this.workletNode.port.postMessage({type: 'audio', data: audioData});
  }

  _handleStreamEnd() {
    // Notify worklet that no more data is coming
    this.workletNode.port.postMessage({type: 'stream-ended'});
    this._deferEnd = true;
    // If all audio already played, finish immediately
    // Otherwise wait for 'playback-complete' from worklet
    setTimeout(() => {
      if (this._deferEnd) {
        this._deferEnd = false;
        this._finishGeneration();
      }
    }, 5000); // safety timeout
  }

  _finishGeneration() {
    this.isGenerating = false;
    this.onComplete?.();
    this._resolveSpeak?.();
    this._resolveSpeak = null;
    this._rejectSpeak = null;
  }

  /**
   * Speak text using browser TTS. Returns a Promise that resolves when done.
   * @param {string} text — text to synthesize
   * @param {string} [voiceName] — optional voice name (from availableVoices)
   * @returns {Promise<void>}
   */
  speak(text, voiceName) {
    if (!this.isReady) return Promise.reject(new Error('PocketTTS not ready'));
    if (this.isGenerating) this.stop();

    return new Promise((resolve, reject) => {
      this._resolveSpeak = resolve;
      this._rejectSpeak = reject;
      this.isGenerating = true;
      this._isFirstChunk = true;
      this._deferEnd = false;

      // Reset audio buffer
      this.workletNode.port.postMessage({type: 'reset'});

      // Resume AudioContext if suspended
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      this.worker.postMessage({
        type: 'generate',
        data: {text, voice: voiceName || this.currentVoice},
      });
    });
  }

  /** Stop current generation and playback */
  stop() {
    if (!this.isGenerating) return;
    this.worker?.postMessage({type: 'stop'});
    this.workletNode?.port.postMessage({type: 'reset'});
    this.isGenerating = false;
    this._deferEnd = false;
    this._resolveSpeak?.();
    this._resolveSpeak = null;
    this._rejectSpeak = null;
  }

  /**
   * Encode a voice cloning audio sample.
   * @param {Float32Array} audioData — mono 24kHz PCM
   * @returns {Promise<void>}
   */
  async encodeVoice(audioData) {
    if (!this.isReady) throw new Error('PocketTTS not ready');

    // Resample to target rate if needed (caller should handle this)
    // Limit to 10s
    const max = this.sampleRate * 10;
    if (audioData.length > max) audioData = audioData.slice(0, max);

    return new Promise((resolve, reject) => {
      const handler = (e) => {
        if (e.data.type === 'voice_encoded') {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
        if (e.data.type === 'error') {
          this.worker.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({type: 'encode_voice', data: {audio: audioData}});
    });
  }

  /**
   * Encode voice from an audio URL (fetch, decode, resample, encode).
   * @param {string} url — URL to WAV/MP3/OGG audio file
   */
  async encodeVoiceFromURL(url) {
    if (!this.isReady) throw new Error('PocketTTS not ready');
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const audioBuf = await this.audioCtx.decodeAudioData(buf);

    // Mono + resample to 24kHz
    let data = audioBuf.getChannelData(0);
    if (audioBuf.numberOfChannels > 1) {
      const r = audioBuf.getChannelData(1);
      const mixed = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) mixed[i] = (data[i] + r[i]) / 2;
      data = mixed;
    }
    if (audioBuf.sampleRate !== this.sampleRate) {
      const ratio = audioBuf.sampleRate / this.sampleRate;
      const outLen = Math.floor(data.length / ratio);
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const si = i * ratio;
        const f = Math.floor(si);
        const c = Math.min(f + 1, data.length - 1);
        const t = si - f;
        out[i] = data[f] * (1 - t) + data[c] * t;
      }
      data = out;
    }

    return this.encodeVoice(data);
  }

  /** Switch to a predefined voice */
  setVoice(name) {
    if (!this.isReady) return;
    this.worker.postMessage({type: 'set_voice', data: {voiceName: name}});
  }

  /** Destroy the service (cleanup) */
  destroy() {
    this.stop();
    this.worker?.terminate();
    this.workletNode?.disconnect();
    this.gainNode?.disconnect();
    if (this.audioCtx?.state !== 'closed') this.audioCtx?.close();
    this.worker = null;
    this.audioCtx = null;
    this.isReady = false;
  }
}

export default PocketTTSService;
