/**
 * Kids Media API - Web Service
 *
 * API client for all Kids Learning Zone media operations:
 * TTS (text-to-speech), music composition, video generation,
 * pre-generation, and job management.
 *
 * Follows the same axios patterns as kidsLearningApi.js:
 * - axios instances with Bearer token auth from localStorage
 * - { success, data, meta } envelope unwrapping
 * - Non-blocking calls with graceful error handling
 * - Reusable pollUntilDone utility
 */

import {KIDS_MEDIA_URL} from '../../../config/apiBase';
import {createApiClient} from '../../../services/axiosFactory';
import {pollUntilDone} from '../../../utils/polling';

// ─── API Instance ─────────────────────────────────────────────────────────────

const mediaApi = createApiClient(KIDS_MEDIA_URL, {timeout: 60000});

// pollUntilDone imported from utils/polling.js

// ─── TTS Endpoints ────────────────────────────────────────────────────────────

/**
 * Submit a TTS (text-to-speech) job for processing.
 * @param {Object} params
 * @param {string} params.text - The text to convert to speech.
 * @param {string} [params.voice] - Voice identifier.
 * @param {string} [params.engine] - TTS engine to use.
 * @param {number} [params.speed] - Playback speed multiplier.
 * @param {string} [params.language] - Language code.
 * @returns {Promise<Object>} - { jobId, status }
 */
export const submitTTS = ({text, voice, engine, speed, language}) => {
  return mediaApi.post('/tts/submit', {text, voice, engine, speed, language});
};

/**
 * Poll a TTS job status by jobId.
 * @param {string} jobId
 * @returns {Promise<Object>} - { status, progress, audioUrl, error }
 */
export const pollTTS = (jobId) => {
  return mediaApi.get(`/tts/status/${jobId}`);
};

/**
 * Quick inline TTS for short texts. Returns audio data (e.g. base64 or URL)
 * immediately without creating an async job.
 * @param {Object} params
 * @param {string} params.text - The text to convert.
 * @param {string} [params.voice] - Voice identifier.
 * @param {string} [params.engine] - TTS engine.
 * @returns {Promise<Object>} - { audioUrl, audioData, format }
 */
export const quickTTS = ({text, voice, engine}) => {
  return mediaApi.post('/tts/quick', {text, voice, engine});
};

/**
 * Submit TTS and poll until the audio is ready.
 * Falls back to async path if quickTTS is not suitable.
 * @param {Object} params - Same as submitTTS params.
 * @param {Object} [pollOpts] - Options for pollUntilDone.
 * @returns {Promise<Object>} - The completed TTS result.
 */
export const ttsAndWait = async (params, pollOpts = {}) => {
  // Try quick TTS first for short text
  if (params.text && params.text.length < 200) {
    try {
      const quick = await quickTTS(params);
      if (quick?.data?.audioUrl || quick?.audioUrl) {
        return quick;
      }
    } catch {
      // Fall through to async path
    }
  }

  const submission = await submitTTS(params);
  const jobId = submission?.data?.jobId || submission?.jobId;
  if (!jobId) {
    return submission;
  }

  return pollUntilDone(() => pollTTS(jobId), {
    intervalMs: 1000,
    maxAttempts: 30,
    ...pollOpts,
  });
};

// ─── Music Composition Endpoints ──────────────────────────────────────────────

/**
 * Submit a music composition job (e.g. ACE Step 1.5).
 * @param {Object} params
 * @param {string} params.prompt - Natural language description of the music.
 * @param {number} [params.duration] - Desired duration in seconds.
 * @param {string} [params.genre] - Music genre.
 * @param {string} [params.mood] - Mood descriptor.
 * @param {number} [params.tempo] - BPM.
 * @param {string[]} [params.instruments] - Desired instruments.
 * @returns {Promise<Object>} - { jobId, status }
 */
export const submitMusic = ({
  prompt,
  duration,
  genre,
  mood,
  tempo,
  instruments,
}) => {
  return mediaApi.post('/music/submit', {
    prompt,
    duration,
    genre,
    mood,
    tempo,
    instruments,
  });
};

/**
 * Poll a music composition job status by jobId.
 * @param {string} jobId
 * @returns {Promise<Object>} - { status, progress, audioUrl, error }
 */
export const pollMusic = (jobId) => {
  return mediaApi.get(`/music/status/${jobId}`);
};

/**
 * Get cached/pre-generated music by category, mood, and duration.
 * Returns immediately available music tracks without needing generation.
 * @param {Object} params
 * @param {string} [params.category] - Music category.
 * @param {string} [params.mood] - Mood descriptor.
 * @param {number} [params.duration] - Desired duration in seconds.
 * @returns {Promise<Object>} - { tracks, total }
 */
export const getCachedMusic = ({category, mood, duration}) => {
  return mediaApi.post('/music/cached', {category, mood, duration});
};

/**
 * Submit music generation and poll until the audio is ready.
 * @param {Object} params - Same as submitMusic params.
 * @param {Object} [pollOpts] - Options for pollUntilDone.
 * @returns {Promise<Object>} - The completed music result.
 */
export const musicAndWait = async (params, pollOpts = {}) => {
  const submission = await submitMusic(params);
  const jobId = submission?.data?.jobId || submission?.jobId;
  if (!jobId) {
    return submission;
  }

  return pollUntilDone(() => pollMusic(jobId), {
    intervalMs: 3000,
    maxAttempts: 60,
    ...pollOpts,
  });
};

// ─── Video Generation Endpoints ───────────────────────────────────────────────

/**
 * Submit a video generation job (e.g. LTX2).
 * @param {Object} params
 * @param {string} params.prompt - Natural language description of the video.
 * @param {number} [params.duration] - Desired duration in seconds.
 * @param {string} [params.style] - Visual style.
 * @param {string} [params.resolution] - Output resolution (e.g. '720p', '1080p').
 * @returns {Promise<Object>} - { jobId, status }
 */
export const submitVideo = ({prompt, duration, style, resolution}) => {
  return mediaApi.post('/video/submit', {prompt, duration, style, resolution});
};

/**
 * Poll a video generation job status by jobId.
 * @param {string} jobId
 * @returns {Promise<Object>} - { status, progress, videoUrl, thumbnailUrl, error }
 */
export const pollVideo = (jobId) => {
  return mediaApi.get(`/video/status/${jobId}`);
};

/**
 * Submit video generation and poll until the video is ready.
 * @param {Object} params - Same as submitVideo params.
 * @param {Object} [pollOpts] - Options for pollUntilDone.
 * @returns {Promise<Object>} - The completed video result.
 */
export const videoAndWait = async (params, pollOpts = {}) => {
  const submission = await submitVideo(params);
  const jobId = submission?.data?.jobId || submission?.jobId;
  if (!jobId) {
    return submission;
  }

  return pollUntilDone(() => pollVideo(jobId), {
    intervalMs: 5000,
    maxAttempts: 120,
    ...pollOpts,
  });
};

// ─── Pre-generation Endpoints ─────────────────────────────────────────────────

/**
 * Request pre-generation of media assets for upcoming games.
 * The server will begin generating TTS, music, and/or video assets
 * in the background so they are ready when the games start.
 * @param {Object} params
 * @param {string[]} params.gameIds - IDs of games to pre-generate for.
 * @param {string[]} params.mediaTypes - Types to generate: 'tts', 'music', 'video'.
 * @returns {Promise<Object>} - { acknowledged, jobIds }
 */
export const requestPregeneration = ({gameIds, mediaTypes}) => {
  return mediaApi.post('/pregenerate', {gameIds, mediaTypes});
};

/**
 * Get available pre-generated media for a specific game.
 * @param {string} gameId
 * @returns {Promise<Object>} - { tts: [...], music: [...], video: [...] }
 */
export const getAvailableMedia = (gameId) => {
  return mediaApi.get(`/available/${gameId}`);
};

// ─── Job Management Endpoints ─────────────────────────────────────────────────

/**
 * Cancel an active media generation job.
 * @param {string} jobId
 * @returns {Promise<Object>} - { cancelled: true }
 */
export const cancelJob = (jobId) => {
  return mediaApi.post('/jobs/cancel', {jobId});
};

/**
 * Get all active media generation jobs for the current user.
 * @returns {Promise<Object>} - { jobs: [...] }
 */
export const getActiveJobs = () => {
  return mediaApi.get('/jobs/active');
};

// ─── Export Grouped API ───────────────────────────────────────────────────────

export const kidsMediaApi = {
  // TTS
  submitTTS,
  pollTTS,
  quickTTS,
  ttsAndWait,

  // Music
  submitMusic,
  pollMusic,
  getCachedMusic,
  musicAndWait,

  // Video
  submitVideo,
  pollVideo,
  videoAndWait,

  // Pre-generation
  requestPregeneration,
  getAvailableMedia,

  // Job management
  cancelJob,
  getActiveJobs,
};

export default kidsMediaApi;
