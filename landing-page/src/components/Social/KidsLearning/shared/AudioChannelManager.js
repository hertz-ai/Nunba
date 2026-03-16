/**
 * AudioChannelManager - Web Audio API implementation for Kids Learning Zone.
 *
 * Replaces react-native-sound with Web Audio API (AudioContext).
 * Three audio channels:
 *   BGM  - looping background music, volume 0.3, with fade in/out via GainNode
 *   SFX  - fire-and-forget sound effects, max 4 concurrent
 *   TTS  - text-to-speech playback, auto-pauses BGM, resumes after
 *
 * Audio sources can be:
 *   - URL strings (fetched via fetch(), decoded with decodeAudioData)
 *   - Pre-decoded AudioBuffer objects (from procedural generation)
 *   - Blob URLs (from IndexedDB cache)
 *
 * Usage:
 *   import AudioChannelManager from './shared/AudioChannelManager';
 *   AudioChannelManager.playSFX(urlOrBuffer);
 *   AudioChannelManager.startBGM(url, { loop: true, volume: 0.3 });
 *   await AudioChannelManager.playTTS(url, { onStart, onEnd });
 */

import {logger} from '../../../../utils/logger';

// ── Lazy AudioContext singleton ──────────────────────────────────────────────
// iOS Safari requires AudioContext to be created or resumed during a user
// gesture (touchstart/click). We set up a one-time listener that creates or
// resumes the context on the first user interaction.

let _audioCtx = null;
let _userGestureListenerAdded = false;

const _ensureUserGestureListener = () => {
  if (_userGestureListenerAdded || typeof window === 'undefined') return;
  _userGestureListenerAdded = true;

  const unlock = () => {
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    // Also create context if not yet created (so first sound is instant)
    if (!_audioCtx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) _audioCtx = new AudioCtx();
      } catch (err) {
        logger.error(err);
      }
    }
    // Remove after first successful unlock
    if (_audioCtx && _audioCtx.state === 'running') {
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    }
  };

  // Capture phase to fire before any stopPropagation
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', unlock, true);
};

// Set up the listener immediately on module load
_ensureUserGestureListener();

const getAudioContext = () => {
  if (!_audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    _audioCtx = new AudioCtx();
  }
  // Resume if suspended (browser autoplay policy / iOS)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
};

// ── State ────────────────────────────────────────────────────────────────────

let isMuted = false;
let masterVolume = 1.0;

const bgmChannel = {
  source: null, // AudioBufferSourceNode
  gainNode: null, // GainNode for fade / volume
  volume: 0.3,
  isPlaying: false,
  isPaused: false,
  pausedAt: 0, // seconds into the buffer when paused
  startedAt: 0, // ctx.currentTime when playback started
  buffer: null, // decoded AudioBuffer (kept for pause/resume)
  loop: true,
  fadeTimeout: null,
};

const ttsChannel = {
  source: null,
  gainNode: null,
  volume: 0.7,
  isPlaying: false,
  bgmWasPaused: false,
  _endResolve: null,
};

const MAX_CONCURRENT_SFX = 4;
let activeSfxCount = 0;

// ── Buffer Cache (URL -> AudioBuffer) ────────────────────────────────────────

const _bufferCache = new Map();
const MAX_BUFFER_CACHE = 50;

/**
 * Fetch and decode an audio source into an AudioBuffer.
 * Accepts a URL string, a Blob, or an already-decoded AudioBuffer.
 */
const loadAudioBuffer = async (source) => {
  const ctx = getAudioContext();

  // Already an AudioBuffer - return directly
  if (source instanceof AudioBuffer) {
    return source;
  }

  // Blob - decode from ArrayBuffer
  if (source instanceof Blob) {
    const arrayBuffer = await source.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  // URL string - check cache first
  if (typeof source === 'string') {
    if (_bufferCache.has(source)) {
      return _bufferCache.get(source);
    }

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${source}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Cache with eviction
    if (_bufferCache.size >= MAX_BUFFER_CACHE) {
      const firstKey = _bufferCache.keys().next().value;
      _bufferCache.delete(firstKey);
    }
    _bufferCache.set(source, audioBuffer);

    return audioBuffer;
  }

  throw new Error('AudioChannelManager: unsupported audio source type');
};

// ── Internal BGM helpers ─────────────────────────────────────────────────────

const _stopBGMSource = () => {
  if (bgmChannel.source) {
    try {
      bgmChannel.source.onended = null;
      bgmChannel.source.stop();
    } catch (err) {
      logger.error(err);
      // May already be stopped
    }
    bgmChannel.source.disconnect();
    bgmChannel.source = null;
  }
  if (bgmChannel.gainNode) {
    bgmChannel.gainNode.disconnect();
    bgmChannel.gainNode = null;
  }
  if (bgmChannel.fadeTimeout) {
    clearTimeout(bgmChannel.fadeTimeout);
    bgmChannel.fadeTimeout = null;
  }
};

const _createBGMSource = (buffer, loop) => {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0; // start silent, fade in
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  return {source, gainNode};
};

// ── Internal TTS helpers ─────────────────────────────────────────────────────

const _stopTTSSource = () => {
  if (ttsChannel.source) {
    try {
      ttsChannel.source.onended = null;
      ttsChannel.source.stop();
    } catch (err) {
      logger.error(err);
    }
    ttsChannel.source.disconnect();
    ttsChannel.source = null;
  }
  if (ttsChannel.gainNode) {
    ttsChannel.gainNode.disconnect();
    ttsChannel.gainNode = null;
  }
  ttsChannel.isPlaying = false;
};

// ── AudioChannelManager ──────────────────────────────────────────────────────

const AudioChannelManager = {
  /**
   * Play a sound effect (fire-and-forget).
   * @param {string|AudioBuffer|Blob} source - URL, AudioBuffer, or Blob
   */
  playSFX: (source) => {
    if (isMuted || activeSfxCount >= MAX_CONCURRENT_SFX) return;
    activeSfxCount++;

    (async () => {
      try {
        const ctx = getAudioContext();
        const buffer = await loadAudioBuffer(source);
        if (isMuted) {
          activeSfxCount = Math.max(0, activeSfxCount - 1);
          return;
        }

        const sfxSource = ctx.createBufferSource();
        sfxSource.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = masterVolume;
        sfxSource.connect(gainNode);
        gainNode.connect(ctx.destination);

        sfxSource.onended = () => {
          sfxSource.disconnect();
          gainNode.disconnect();
          activeSfxCount = Math.max(0, activeSfxCount - 1);
        };

        sfxSource.start(0);
      } catch (err) {
        logger.error(err);
        activeSfxCount = Math.max(0, activeSfxCount - 1);
      }
    })();
  },

  /**
   * Play a sound effect from a cached file path / Blob URL.
   * On the web this is identical to playSFX since both accept URLs.
   * @param {string} urlOrBlobUrl
   */
  playSFXFromPath: (urlOrBlobUrl) => {
    AudioChannelManager.playSFX(urlOrBlobUrl);
  },

  /**
   * Start looping background music with fade-in.
   * @param {string|AudioBuffer|Blob} source
   * @param {Object} opts
   * @param {boolean} [opts.loop=true]
   * @param {number}  [opts.volume=0.3]
   * @param {number}  [opts.fadeInMs=1000]
   */
  startBGM: (source, {loop = true, volume = 0.3, fadeInMs = 1000} = {}) => {
    // Stop any current BGM immediately
    AudioChannelManager.stopBGM({fadeOutMs: 0});

    (async () => {
      try {
        const ctx = getAudioContext();
        const buffer = await loadAudioBuffer(source);

        bgmChannel.buffer = buffer;
        bgmChannel.volume = volume;
        bgmChannel.loop = loop;
        bgmChannel.isPaused = false;
        bgmChannel.pausedAt = 0;

        const {source: srcNode, gainNode} = _createBGMSource(buffer, loop);
        bgmChannel.source = srcNode;
        bgmChannel.gainNode = gainNode;
        bgmChannel.isPlaying = true;
        bgmChannel.startedAt = ctx.currentTime;

        const targetGain = isMuted ? 0 : volume * masterVolume;

        if (!isMuted && fadeInMs > 0) {
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            targetGain,
            ctx.currentTime + fadeInMs / 1000
          );
        } else {
          gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);
        }

        srcNode.onended = () => {
          if (bgmChannel.source === srcNode) {
            bgmChannel.isPlaying = false;
          }
        };

        srcNode.start(0);
      } catch (err) {
        logger.error(err);
        bgmChannel.isPlaying = false;
      }
    })();
  },

  /**
   * Stop background music with optional fade-out.
   * @param {Object} opts
   * @param {number} [opts.fadeOutMs=500]
   */
  stopBGM: ({fadeOutMs = 500} = {}) => {
    if (bgmChannel.fadeTimeout) {
      clearTimeout(bgmChannel.fadeTimeout);
      bgmChannel.fadeTimeout = null;
    }

    if (!bgmChannel.source || !bgmChannel.gainNode) {
      _stopBGMSource();
      bgmChannel.isPlaying = false;
      bgmChannel.isPaused = false;
      bgmChannel.buffer = null;
      return;
    }

    if (fadeOutMs > 0 && bgmChannel.isPlaying) {
      const ctx = getAudioContext();
      const gainNode = bgmChannel.gainNode;
      const currentGain = gainNode.gain.value;

      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.setValueAtTime(currentGain, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0,
        ctx.currentTime + fadeOutMs / 1000
      );

      bgmChannel.fadeTimeout = setTimeout(() => {
        _stopBGMSource();
        bgmChannel.isPlaying = false;
        bgmChannel.isPaused = false;
        bgmChannel.buffer = null;
        bgmChannel.fadeTimeout = null;
      }, fadeOutMs + 50);
    } else {
      _stopBGMSource();
      bgmChannel.isPlaying = false;
      bgmChannel.isPaused = false;
      bgmChannel.buffer = null;
    }
  },

  /**
   * Pause background music (used when TTS plays).
   * Remembers the playback position so resumeBGM can continue from it.
   */
  pauseBGM: () => {
    if (!bgmChannel.source || !bgmChannel.isPlaying || bgmChannel.isPaused)
      return;

    const ctx = getAudioContext();
    const elapsed = ctx.currentTime - bgmChannel.startedAt;
    bgmChannel.pausedAt = bgmChannel.buffer
      ? elapsed % bgmChannel.buffer.duration
      : 0;

    try {
      bgmChannel.source.onended = null;
      bgmChannel.source.stop();
    } catch (err) {
      logger.error(err);
    }
    bgmChannel.source.disconnect();
    bgmChannel.source = null;
    if (bgmChannel.gainNode) {
      bgmChannel.gainNode.disconnect();
      bgmChannel.gainNode = null;
    }

    bgmChannel.isPaused = true;
    // Keep isPlaying = true so we know we should resume
  },

  /**
   * Resume background music from where it was paused.
   */
  resumeBGM: () => {
    if (!bgmChannel.isPaused || !bgmChannel.buffer) return;

    const ctx = getAudioContext();
    const {source: srcNode, gainNode} = _createBGMSource(
      bgmChannel.buffer,
      bgmChannel.loop
    );
    bgmChannel.source = srcNode;
    bgmChannel.gainNode = gainNode;

    const targetGain = isMuted ? 0 : bgmChannel.volume * masterVolume;
    gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);

    srcNode.onended = () => {
      if (bgmChannel.source === srcNode) {
        bgmChannel.isPlaying = false;
      }
    };

    bgmChannel.startedAt = ctx.currentTime - bgmChannel.pausedAt;
    srcNode.start(0, bgmChannel.pausedAt);

    bgmChannel.isPaused = false;
    bgmChannel.isPlaying = true;
  },

  /**
   * Play TTS audio. Auto-pauses BGM and resumes after playback.
   * Returns a Promise<boolean> indicating whether playback completed.
   * @param {string|AudioBuffer|Blob} source
   * @param {Object} opts
   * @param {Function} [opts.onStart]
   * @param {Function} [opts.onEnd]
   * @returns {Promise<boolean>}
   */
  playTTS: (source, {onStart, onEnd} = {}) => {
    return new Promise((resolve) => {
      if (isMuted) {
        resolve(false);
        return;
      }

      // Stop any current TTS
      AudioChannelManager.stopTTS();

      // Pause BGM
      const wasBGMPlaying = bgmChannel.isPlaying && !bgmChannel.isPaused;
      if (wasBGMPlaying) {
        AudioChannelManager.pauseBGM();
      }
      ttsChannel.bgmWasPaused = wasBGMPlaying;

      (async () => {
        try {
          const ctx = getAudioContext();
          const buffer = await loadAudioBuffer(source);

          const ttsSource = ctx.createBufferSource();
          ttsSource.buffer = buffer;

          const gainNode = ctx.createGain();
          gainNode.gain.value = ttsChannel.volume * masterVolume;
          ttsSource.connect(gainNode);
          gainNode.connect(ctx.destination);

          ttsChannel.source = ttsSource;
          ttsChannel.gainNode = gainNode;
          ttsChannel.isPlaying = true;

          if (onStart) onStart();

          ttsSource.onended = () => {
            ttsSource.disconnect();
            gainNode.disconnect();
            ttsChannel.source = null;
            ttsChannel.gainNode = null;
            ttsChannel.isPlaying = false;

            if (ttsChannel.bgmWasPaused) {
              AudioChannelManager.resumeBGM();
              ttsChannel.bgmWasPaused = false;
            }

            if (onEnd) onEnd();
            resolve(true);
          };

          ttsSource.start(0);
        } catch (err) {
          logger.error(err);
          ttsChannel.isPlaying = false;
          if (ttsChannel.bgmWasPaused) {
            AudioChannelManager.resumeBGM();
            ttsChannel.bgmWasPaused = false;
          }
          resolve(false);
        }
      })();
    });
  },

  /**
   * Stop current TTS playback and resume BGM if it was paused.
   */
  stopTTS: () => {
    _stopTTSSource();

    if (ttsChannel.bgmWasPaused) {
      AudioChannelManager.resumeBGM();
      ttsChannel.bgmWasPaused = false;
    }
  },

  /**
   * Stop all audio channels.
   */
  stopAll: () => {
    AudioChannelManager.stopBGM({fadeOutMs: 0});
    AudioChannelManager.stopTTS();
    // Active SFX will finish naturally (fire-and-forget)
  },

  /**
   * Mute / unmute all audio channels.
   * @param {boolean} muted
   */
  setMuted: (muted) => {
    isMuted = muted;
    if (bgmChannel.gainNode) {
      bgmChannel.gainNode.gain.value = muted
        ? 0
        : bgmChannel.volume * masterVolume;
    }
    if (ttsChannel.gainNode) {
      ttsChannel.gainNode.gain.value = muted
        ? 0
        : ttsChannel.volume * masterVolume;
    }
  },

  /** @returns {boolean} */
  isMuted: () => isMuted,

  /**
   * Set master volume (0-1). Affects all channels.
   * @param {number} volume
   */
  setMasterVolume: (volume) => {
    masterVolume = Math.max(0, Math.min(1, volume));
    if (bgmChannel.gainNode && !isMuted) {
      bgmChannel.gainNode.gain.value = bgmChannel.volume * masterVolume;
    }
    if (ttsChannel.gainNode && !isMuted) {
      ttsChannel.gainNode.gain.value = ttsChannel.volume * masterVolume;
    }
  },

  /** @returns {number} */
  getMasterVolume: () => masterVolume,

  /** @returns {boolean} */
  isPlaying: () => bgmChannel.isPlaying || ttsChannel.isPlaying,
  /** @returns {boolean} */
  isBGMPlaying: () => bgmChannel.isPlaying,
  /** @returns {boolean} */
  isTTSPlaying: () => ttsChannel.isPlaying,

  /**
   * Get the raw AudioContext (useful for procedural sound generation).
   * @returns {AudioContext}
   */
  getAudioContext,

  /**
   * Pre-load and cache an audio buffer from a URL.
   * @param {string} url
   * @returns {Promise<AudioBuffer>}
   */
  preloadBuffer: (url) => loadAudioBuffer(url),
};

export default AudioChannelManager;
