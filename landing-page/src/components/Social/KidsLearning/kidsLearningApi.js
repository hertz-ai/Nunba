/**
 * Kids Learning Zone - API Service for Web
 *
 * Server-driven API client for the Dynamic Liquid Agentic UI game engine.
 * Follows the same patterns as src/services/socialApi.js:
 * - axios instance with Bearer token auth
 * - { success, data, meta } envelope unwrapping
 * - Same backend endpoints as the React Native version
 */

import {
  KIDS_API_URL,
  KIDS_TTS_URL,
  KIDS_MUSIC_URL,
} from '../../../config/apiBase';
import {createApiClient} from '../../../services/axiosFactory';
import {pollUntilDone} from '../../../utils/polling';
export {pollUntilDone};

// ─── API Instances ────────────────────────────────────────────────────────────

const kidsApi = createApiClient(KIDS_API_URL, {timeout: 30000});
const ttsApi = createApiClient(KIDS_TTS_URL, {
  timeout: 60000,
  handle401: false,
});
const musicApi = createApiClient(KIDS_MUSIC_URL, {
  timeout: 30000,
  handle401: false,
});

// ─── Game Creation & AI ───────────────────────────────────────────────────────

/**
 * Create a new AI-generated game via the agentic engine.
 * @param {string} prompt - Natural language game description
 * @param {string} ageGroup - e.g. '4-6', '6-8', '8-10'
 * @param {string} mode - 'quick' | 'detailed' | 'adaptive'
 * @returns {Promise<Object>} - { taskId, status } or immediate game config
 */
export const createGame = (prompt, ageGroup, mode = 'quick') => {
  return kidsApi.post('/games/create', {prompt, ageGroup, mode});
};

/**
 * Get the status / result of a game creation task.
 * @param {string} taskId
 */
export const getGameCreationStatus = (taskId) => {
  return kidsApi.get(`/games/create/${taskId}`);
};

/**
 * Create a game and poll until it is ready.
 * @param {string} prompt
 * @param {string} ageGroup
 * @param {string} mode
 * @param {Function} onProgress - optional callback with status updates
 * @returns {Promise<Object>} - the completed game config
 */
export const createGameAndWait = async (
  prompt,
  ageGroup,
  mode = 'quick',
  onProgress
) => {
  const initial = await createGame(prompt, ageGroup, mode);

  // If the server returned the game immediately (quick mode)
  if (initial?.data?.config || initial?.data?.template) {
    return initial;
  }

  const taskId = initial?.data?.taskId || initial?.taskId;
  if (!taskId) {
    return initial;
  }

  return pollUntilDone(
    async () => {
      const result = await getGameCreationStatus(taskId);
      if (onProgress) onProgress(result);
      return result;
    },
    {intervalMs: 1500, maxAttempts: 40}
  );
};

// ─── Dynamic Templates (Server-Driven UI) ─────────────────────────────────────

/**
 * Fetch a server-driven template definition.
 * The server returns a JSON layout that the DynamicTemplateEngine renders.
 * @param {string} templateId
 */
export const getDynamicTemplate = (templateId) => {
  return kidsApi.get(`/templates/${templateId}`);
};

/**
 * List all available dynamic templates.
 */
export const listDynamicTemplates = () => {
  return kidsApi.get('/templates');
};

// ─── Adaptive Questions ───────────────────────────────────────────────────────

/**
 * Get adaptive questions tailored to the child's skill level.
 * The server uses 3R intelligence data to select appropriate difficulty.
 * @param {string} category - 'english' | 'math' | 'lifeSkills' | 'science' | 'creativity'
 * @param {string} concept - specific concept key, e.g. 'add:within-10'
 * @param {number} difficulty - 1-5 current difficulty level
 * @param {Object} params - additional params (ageGroup, count, etc.)
 */
export const getAdaptiveQuestion = (
  category,
  concept,
  difficulty,
  params = {}
) => {
  return kidsApi.get('/adaptive/question', {
    params: {category, concept, difficulty, ...params},
  });
};

/**
 * Get a batch of adaptive questions for a game session.
 * @param {string} category
 * @param {number} count - number of questions
 * @param {Object} params
 */
export const getAdaptiveQuestionBatch = (category, count = 10, params = {}) => {
  return kidsApi.get('/adaptive/batch', {
    params: {category, count, ...params},
  });
};

// ─── Game Results & Reporting ─────────────────────────────────────────────────

/**
 * Report game completion with detailed results for analytics and 3R tracking.
 * @param {Object} result - { gameId, category, score, totalQuestions, correctAnswers,
 *   timeSpentMs, streak, conceptResults: [{ concept, correct, timeMs }], ageGroup }
 */
export const reportGameCompletion = (result) => {
  return kidsApi.post('/games/complete', result);
};

/**
 * Get the child's learning progress and analytics.
 * @param {Object} params - { category, timeRange, limit }
 */
export const getLearningProgress = (params = {}) => {
  return kidsApi.get('/progress', {params});
};

/**
 * Get concept mastery data for adaptive difficulty adjustment.
 * @param {string} category
 */
export const getConceptMastery = (category) => {
  return kidsApi.get(`/progress/concepts/${category}`);
};

// ─── Game Catalog ─────────────────────────────────────────────────────────────

/**
 * Get the catalog of available games from the server.
 * This can include server-curated games, trending games, and recommended games.
 * @param {Object} params - { category, ageGroup, difficulty, limit, offset }
 */
export const getGameCatalog = (params = {}) => {
  return kidsApi.get('/catalog', {params});
};

/**
 * Get recommended games based on 3R intelligence data.
 * @param {Object} params - { ageGroup, limit }
 */
export const getRecommendedGames = (params = {}) => {
  return kidsApi.get('/catalog/recommended', {params});
};

/**
 * Get trending/popular games from the community.
 * @param {Object} params - { limit, offset }
 */
export const getTrendingGames = (params = {}) => {
  return kidsApi.get('/catalog/trending', {params});
};

// ─── TTS (Text-to-Speech) ─────────────────────────────────────────────────────

/**
 * Quick TTS - returns audio data immediately for short text.
 * @param {string} text - text to speak
 * @param {Object} opts - { voice, speed, format }
 */
export const quickTTS = (text, opts = {}) => {
  return ttsApi.post('/quick', {
    text,
    voice: opts.voice || 'kids-friendly',
    speed: opts.speed || 1.0,
    format: opts.format || 'mp3',
  });
};

/**
 * Submit a TTS job for longer text (async processing).
 * @param {string} text
 * @param {Object} opts
 * @returns {Promise<Object>} - { taskId }
 */
export const submitTTS = (text, opts = {}) => {
  return ttsApi.post('/submit', {
    text,
    voice: opts.voice || 'kids-friendly',
    speed: opts.speed || 1.0,
    format: opts.format || 'mp3',
  });
};

/**
 * Poll TTS job status.
 * @param {string} taskId
 */
export const pollTTS = (taskId) => {
  return ttsApi.get(`/status/${taskId}`);
};

/**
 * Submit TTS and wait for the audio URL.
 * @param {string} text
 * @param {Object} opts
 * @returns {Promise<string>} - audio URL
 */
export const ttsAndWait = async (text, opts = {}) => {
  // Try quick TTS first for short text
  if (text.length < 200) {
    try {
      const result = await quickTTS(text, opts);
      if (result?.data?.audioUrl) return result.data.audioUrl;
    } catch {
      // Fall through to async path
    }
  }

  const submission = await submitTTS(text, opts);
  const taskId = submission?.data?.taskId || submission?.taskId;

  const result = await pollUntilDone(() => pollTTS(taskId), {
    intervalMs: 1000,
    maxAttempts: 30,
  });

  return result?.data?.audioUrl || result?.audioUrl;
};

// ─── Music / Background Audio ─────────────────────────────────────────────────

/**
 * Get cached background music for a game category/mood.
 * @param {Object} params - { category, mood, duration }
 */
export const getCachedMusic = (params = {}) => {
  return musicApi.get('/cached', {params});
};

/**
 * Get a list of available music tracks.
 * @param {Object} params - { category, mood }
 */
export const listMusicTracks = (params = {}) => {
  return musicApi.get('/tracks', {params});
};

// ─── Leaderboard & Social ─────────────────────────────────────────────────────

/**
 * Get the kids learning leaderboard.
 * @param {Object} params - { category, timeRange, limit }
 */
export const getLeaderboard = (params = {}) => {
  return kidsApi.get('/leaderboard', {params});
};

/**
 * Share a game achievement / score.
 * @param {Object} data - { gameId, score, badge }
 */
export const shareAchievement = (data) => {
  return kidsApi.post('/share', data);
};

// ─── Export grouped API ───────────────────────────────────────────────────────

export const kidsLearningApi = {
  // Game creation (AI-powered)
  createGame,
  getGameCreationStatus,
  createGameAndWait,

  // Dynamic templates (server-driven UI)
  getDynamicTemplate,
  listDynamicTemplates,

  // Adaptive questions
  getAdaptiveQuestion,
  getAdaptiveQuestionBatch,

  // Game results
  reportGameCompletion,
  getLearningProgress,
  getConceptMastery,

  // Catalog
  getGameCatalog,
  getRecommendedGames,
  getTrendingGames,

  // TTS
  quickTTS,
  submitTTS,
  pollTTS,
  ttsAndWait,

  // Music
  getCachedMusic,
  listMusicTracks,

  // Social
  getLeaderboard,
  shareAchievement,

  // Utility
  pollUntilDone,
};

export default kidsLearningApi;
