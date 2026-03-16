/**
 * Kids Learning Zone — Barrel Export
 *
 * Central export file for the Kids Learning Zone module.
 * Import from this file for clean module boundaries:
 *
 *   import { KidsLearningHub, GameEngine, kidsColors } from './KidsLearning';
 */

// ─── Pages ───────────────────────────────────────────────────────────────────
export {default as KidsLearningHub} from './KidsLearningHub';
export {default as KidsGameScreen} from './KidsGameScreen';
export {default as KidsProgressScreen} from './KidsProgressScreen';
export {default as GameCreatorScreen} from './GameCreatorScreen';

// ─── Core Engine ─────────────────────────────────────────────────────────────
export {
  default as GameEngine,
  useGameEngine,
  GamePhase,
  shuffleArray,
  extractQuestions,
  checkAnswer,
} from './GameEngine';

// ─── Game Registry ───────────────────────────────────────────────────────────
export {
  default as TEMPLATE_REGISTRY,
  getTemplateComponent,
  hasTemplate,
  isServerGame,
  isLocalTemplate,
  resolveTemplateName,
  registerDynamicTemplate,
  unregisterDynamicTemplate,
  getAllTemplateNames,
  TEMPLATE_NAMES,
  TEMPLATE_INFO,
  getTemplateInfo,
} from './gameRegistry';

// ─── API Service ─────────────────────────────────────────────────────────────
export {
  default as kidsLearningApi,
  createGame,
  createGameAndWait,
  reportGameCompletion,
  getLearningProgress,
  getAdaptiveQuestion,
  quickTTS,
  ttsAndWait,
  getCachedMusic,
  pollUntilDone,
} from './kidsLearningApi';

// ─── Store ───────────────────────────────────────────────────────────────────
export {
  KidsLearningProvider,
  useKidsLearning,
  getProgress,
  recordGame,
  resetProgress,
} from './data/kidsLearningStore';

// ─── Theme ───────────────────────────────────────────────────────────────────
export {
  kidsColors,
  kidsSpacing,
  kidsBorderRadius,
  kidsRadius,
  kidsFontSizes,
  kidsFontWeights,
  kidsShadows,
  kidsTransitions,
  kidsAnimations,
  kidsMixins,
  kidsMuiOverrides,
  CATEGORY_MAP,
  CATEGORIES,
  getCategoryColor,
  getCategoryGradient,
  getDifficultyColor,
  getDifficultyLabel,
} from './kidsTheme';

// ─── Data ────────────────────────────────────────────────────────────────────
export {
  default as gameConfigs,
  getGameById,
  getGamesByCategory,
  getGamesByTemplate,
  getGamesForAge,
  filterGames,
} from './data/gameConfigs';

// ─── Shared Components ───────────────────────────────────────────────────────
export {default as GameShell} from './shared/GameShell';
export {default as FeedbackOverlay} from './shared/FeedbackOverlay';

// ─── Dynamic Compute ────────────────────────────────────────────────────────
export {
  default as ServerDrivenUI,
  RenderNode,
  resolvePath,
  resolveStyle,
  interpolateTemplate,
  STYLE_PRESETS,
  getMuiIcon,
} from './ServerDrivenUI';
export {
  default as DynamicTemplateEngine,
  getRenderMode,
  detectRenderMode,
  cacheDynamicTemplate,
  getCachedTemplate,
  clearTemplateCache,
  getCachedTemplateIds,
} from './DynamicTemplateEngine';
export {default as DynamicGameRenderer} from './DynamicGameRenderer';

// ─── Intelligence Store ─────────────────────────────────────────────────────
export {
  KidsIntelligenceProvider,
  useKidsIntelligence,
  getConceptScore,
  recordConceptAttempt,
  getWeakConcepts,
  getDueForReview,
  get3RScores,
  getMasteryLevel,
} from './data/kidsIntelligenceStore';

// ─── Media Store ────────────────────────────────────────────────────────────
export {
  KidsMediaProvider,
  useKidsMedia,
  getMediaState,
  setMuted,
} from './data/kidsMediaStore';

// ─── Media API ──────────────────────────────────────────────────────────────
export {
  default as kidsMediaApi,
  pollUntilDone as mediaPollUntilDone,
  submitTTS as mediaSubmitTTS,
  pollTTS as mediaPollTTS,
  quickTTS as mediaQuickTTS,
  ttsAndWait as mediaTtsAndWait,
  submitMusic,
  pollMusic,
  getCachedMusic as mediaGetCachedMusic,
  musicAndWait,
  submitVideo,
  pollVideo,
  videoAndWait,
  requestPregeneration,
  getAvailableMedia,
  cancelJob,
  getActiveJobs,
} from './kidsMediaApi';

// ─── Shared Media Stack ─────────────────────────────────────────────────────
export {default as AudioChannelManager} from './shared/AudioChannelManager';
export {default as MediaCacheManager} from './shared/MediaCacheManager';
export {default as TTSManager} from './shared/TTSManager';
export {default as MediaPreloader} from './shared/MediaPreloader';
export {
  default as GameSounds,
  GameSounds as GameSoundsNamed,
  HapticPatterns,
  SoundEvents,
} from './shared/SoundManager';

// ─── Media Components ───────────────────────────────────────────────────────
export {default as KidsVideoPlayer} from './media/KidsVideoPlayer';
export {default as NarrationOverlay} from './media/NarrationOverlay';
export {default as MediaLoadingIndicator} from './media/MediaLoadingIndicator';

// ─── Custom Games ───────────────────────────────────────────────────────────
export {default as CustomGamesScreen} from './CustomGamesScreen';

// ─── Extra Game Configs ─────────────────────────────────────────────────────
export {default as creativityGames} from './data/creativityGames';
export {default as englishGamesExtra} from './data/englishGamesExtra';
export {default as mathGamesExtra} from './data/mathGamesExtra';
export {default as lifeSkillsGamesExtra} from './data/lifeSkillsGamesExtra';
