/**
 * Kids Learning Zone - Game Registry (Web Version)
 *
 * Maps template names to React web components using React.lazy() for
 * code-splitting. This is the web equivalent of the React Native
 * gameRegistry.js that uses require().
 *
 * Three rendering modes:
 * 1. Local Template: Uses built-in React web template components (offline-capable)
 * 2. Server-Driven UI: Uses DynamicTemplateEngine with JSON layout from server
 * 3. HTML5 Dynamic: Uses DynamicGameRenderer with server-generated HTML5 games (online)
 *
 * Built-in templates (34 total):
 *   - 15 touch templates (original + future)
 *   - 10 canvas game templates
 *   - 9 voice-activated game templates (mic amplitude + STT)
 *
 * Dynamic templates from the server are registered at runtime and stored
 * in localStorage alongside the built-in 15 templates.
 */

import {lazy} from 'react';

// ─── Built-in Template Registry ──────────────────────────────────────────────
//
// React.lazy() for code-splitting - each template is loaded only when needed.
// The 6 existing templates are real imports. The remaining 9 templates will
// either be created later or rendered through the server-driven engine.
// When a template component doesn't exist yet, the lazy import will fail
// gracefully and the fallback UI in Suspense will show.

const TEMPLATE_REGISTRY = {
  // ── Existing Templates (6) ─────────────────────────────────────────────────
  'multiple-choice': lazy(() => import('./templates/MultipleChoiceTemplate')),
  'true-false': lazy(() => import('./templates/TrueFalseTemplate')),
  'fill-blank': lazy(() => import('./templates/FillBlankTemplate')),
  'match-pairs': lazy(() => import('./templates/MatchPairsTemplate')),
  'memory-flip': lazy(() => import('./templates/MemoryFlipTemplate')),
  counting: lazy(() => import('./templates/CountingTemplate')),

  // ── Future Templates (9) ───────────────────────────────────────────────────
  // These will be created as separate .jsx files. Until then, games using
  // these templates will fall back to server-driven rendering or show a
  // "coming soon" placeholder via the getTemplateComponent() helper.
  'sequence-order': lazy(() => import('./templates/SequenceOrderTemplate')),
  'word-build': lazy(() => import('./templates/WordBuildTemplate')),
  'drag-to-zone': lazy(() => import('./templates/DragToZoneTemplate')),
  'timed-rush': lazy(() => import('./templates/TimedRushTemplate')),
  'story-builder': lazy(() => import('./templates/StoryBuilderTemplate')),
  simulation: lazy(() => import('./templates/SimulationTemplate')),
  'spot-difference': lazy(() => import('./templates/SpotDifferenceTemplate')),
  'puzzle-assemble': lazy(() => import('./templates/PuzzleAssembleTemplate')),
  tracing: lazy(() => import('./templates/TracingTemplate')),

  // ── Canvas Game Templates (10) ──────────────────────────────────────────────
  'balloon-pop': lazy(() => import('./templates/BalloonPopTemplate')),
  'whack-a-mole': lazy(() => import('./templates/WhackAMoleTemplate')),
  catcher: lazy(() => import('./templates/CatcherTemplate')),
  'flappy-learner': lazy(() => import('./templates/FlappyLearnerTemplate')),
  'runner-dodge': lazy(() => import('./templates/RunnerDodgeTemplate')),
  'math-castle': lazy(() => import('./templates/MathCastleTemplate')),
  'letter-trace-canvas': lazy(
    () => import('./templates/LetterTraceCanvasTemplate')
  ),
  'paint-by-concept': lazy(() => import('./templates/PaintByConceptTemplate')),
  builder: lazy(() => import('./templates/BuilderTemplate')),
  'word-maze': lazy(() => import('./templates/WordMazeTemplate')),

  // ── Voice-Activated Game Templates (9) ─────────────────────────────────────
  voice_spell: lazy(() => import('./templates/VoiceSpellTemplate')),
  sound_charades: lazy(() => import('./templates/SoundCharadesTemplate')),
  whisper_shout: lazy(() => import('./templates/WhisperShoutTemplate')),
  story_weaver: lazy(() => import('./templates/StoryWeaverTemplate')),
  beat_match: lazy(() => import('./templates/BeatMatchTemplate')),
  voice_paint: lazy(() => import('./templates/VoicePaintTemplate')),
  'voice-balloon-pop': lazy(() => import('./templates/VoiceBalloonPopTemplate')),
  peekaboo: lazy(() => import('./templates/PeekabooTemplate')),
  'speech-bubble': lazy(() => import('./templates/SpeechBubbleTemplate')),
};

// ── Backward-compatible aliases ──────────────────────────────────────────────
// The original gameConfigs.js used shorter template names ('quiz', 'matching',
// 'sorting', 'fillBlank'). These aliases ensure old configs still work.
const TEMPLATE_ALIASES = {
  quiz: 'multiple-choice',
  matching: 'match-pairs',
  sorting: 'drag-to-zone',
  fillBlank: 'fill-blank',
  // Voice template aliases (mobile uses both underscore and hyphen forms)
  'balloon-pop-voice': 'voice-balloon-pop',
  balloon_pop: 'voice-balloon-pop',
  'speech_bubble': 'speech-bubble',
};

// ── Dynamic Template Registry ────────────────────────────────────────────────
// Templates registered at runtime from server definitions
const dynamicTemplateRegistry = {};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the React.lazy component for a template name.
 * Resolves aliases and checks dynamic registry before built-in.
 *
 * @param {string} templateName - e.g. 'multiple-choice', 'quiz', 'match-pairs'
 * @returns {React.LazyExoticComponent|null} - the lazy component, or null if not found
 */
export const getTemplateComponent = (templateName) => {
  // Resolve aliases first
  const resolved = TEMPLATE_ALIASES[templateName] || templateName;

  // Check built-in registry
  if (TEMPLATE_REGISTRY[resolved]) {
    return TEMPLATE_REGISTRY[resolved];
  }

  // Check dynamic registry
  if (dynamicTemplateRegistry[resolved]?.component) {
    return dynamicTemplateRegistry[resolved].component;
  }

  return null;
};

/**
 * Check if a template name is known (built-in or dynamic).
 * @param {string} templateName
 * @returns {boolean}
 */
export const hasTemplate = (templateName) => {
  const resolved = TEMPLATE_ALIASES[templateName] || templateName;
  return !!(TEMPLATE_REGISTRY[resolved] || dynamicTemplateRegistry[resolved]);
};

/**
 * Check if a game should use server rendering (HTML5 or server-driven native).
 * A game uses server rendering if it has server-specific fields or if
 * its template is not available locally.
 *
 * @param {Object} gameConfig
 * @returns {boolean}
 */
export const isServerGame = (gameConfig) => {
  return !!(
    gameConfig.serverHtml ||
    gameConfig.serverUrl ||
    gameConfig.serverLayout ||
    gameConfig.dynamicTemplate
  );
};

/**
 * Check if a game uses a local built-in template.
 * @param {Object} gameConfig
 * @returns {boolean}
 */
export const isLocalTemplate = (gameConfig) => {
  if (!gameConfig.template) return false;
  const resolved = TEMPLATE_ALIASES[gameConfig.template] || gameConfig.template;
  return !!(TEMPLATE_REGISTRY[resolved] && !isServerGame(gameConfig));
};

/**
 * Resolve a template name (handling aliases).
 * @param {string} templateName
 * @returns {string}
 */
export const resolveTemplateName = (templateName) => {
  return TEMPLATE_ALIASES[templateName] || templateName;
};

// ─── Dynamic Template Management ────────────────────────────────────────────

/**
 * Register a dynamic template definition from the server.
 * Supports both component-based and JSON layout definitions.
 *
 * @param {string} templateId - unique template identifier
 * @param {Object} templateDef - { component?, layout?, metadata? }
 */
export const registerDynamicTemplate = (templateId, templateDef) => {
  dynamicTemplateRegistry[templateId] = {
    ...templateDef,
    registeredAt: Date.now(),
  };
};

/**
 * Unregister a dynamic template.
 * @param {string} templateId
 * @returns {boolean} - true if removed, false if not found
 */
export const unregisterDynamicTemplate = (templateId) => {
  if (dynamicTemplateRegistry[templateId]) {
    delete dynamicTemplateRegistry[templateId];
    return true;
  }
  return false;
};

/**
 * Get a dynamic template definition.
 * @param {string} templateId
 * @returns {Object|null}
 */
export const getDynamicTemplate = (templateId) => {
  return dynamicTemplateRegistry[templateId] || null;
};

/**
 * Get all registered dynamic template IDs.
 * @returns {string[]}
 */
export const getDynamicTemplateNames = () => {
  return Object.keys(dynamicTemplateRegistry);
};

// ─── Template Metadata ───────────────────────────────────────────────────────

/**
 * All built-in template names (the canonical names, not aliases).
 * @type {string[]}
 */
export const TEMPLATE_NAMES = Object.keys(TEMPLATE_REGISTRY);

/**
 * All template names including aliases.
 * @type {string[]}
 */
export const ALL_TEMPLATE_KEYS = [
  ...TEMPLATE_NAMES,
  ...Object.keys(TEMPLATE_ALIASES),
];

/**
 * Get all template names (built-in + dynamic, no aliases).
 * @returns {string[]}
 */
export const getAllTemplateNames = () => {
  return [...TEMPLATE_NAMES, ...getDynamicTemplateNames()];
};

/**
 * Template display info for UI rendering (e.g., game creation screens).
 */
export const TEMPLATE_INFO = {
  'multiple-choice': {
    label: 'Multiple Choice',
    description: 'Pick the correct answer from 4 options',
    icon: 'quiz',
    contentKey: 'questions',
  },
  'true-false': {
    label: 'True or False',
    description: 'Decide if a statement is true or false',
    icon: 'check-circle',
    contentKey: 'statements',
  },
  'fill-blank': {
    label: 'Fill in the Blank',
    description: 'Choose the right word to complete a sentence',
    icon: 'edit',
    contentKey: 'questions',
  },
  'match-pairs': {
    label: 'Match Pairs',
    description: 'Connect matching items from two columns',
    icon: 'link',
    contentKey: 'pairs',
  },
  'memory-flip': {
    label: 'Memory Flip',
    description: 'Flip cards and find matching pairs',
    icon: 'grid-view',
    contentKey: 'pairs',
  },
  counting: {
    label: 'Counting',
    description: 'Count objects and pick the right number',
    icon: 'tag',
    contentKey: 'rounds',
  },
  'sequence-order': {
    label: 'Sequence Order',
    description: 'Put items in the correct order',
    icon: 'sort',
    contentKey: 'sequences',
  },
  'word-build': {
    label: 'Word Build',
    description: 'Arrange letters to spell a word',
    icon: 'abc',
    contentKey: 'words',
  },
  'drag-to-zone': {
    label: 'Drag to Zone',
    description: 'Sort items into the correct categories',
    icon: 'drag-indicator',
    contentKey: 'items',
  },
  'timed-rush': {
    label: 'Timed Rush',
    description: 'Answer as many questions as you can before time runs out',
    icon: 'timer',
    contentKey: 'questions',
  },
  'story-builder': {
    label: 'Story Builder',
    description: 'Make choices to build your own story',
    icon: 'auto-stories',
    contentKey: 'story',
  },
  simulation: {
    label: 'Simulation',
    description: 'Make decisions in a real-world scenario',
    icon: 'science',
    contentKey: 'scenario',
  },
  'spot-difference': {
    label: 'Spot the Difference',
    description: 'Find differences between two pictures',
    icon: 'compare',
    contentKey: 'differences',
  },
  'puzzle-assemble': {
    label: 'Puzzle Assemble',
    description: 'Put puzzle pieces together',
    icon: 'extension',
    contentKey: 'pieces',
  },
  tracing: {
    label: 'Tracing',
    description: 'Trace letters and shapes with your finger',
    icon: 'gesture',
    contentKey: 'traces',
  },

  // ── Canvas Game Templates (10) ──────────────────────────────────────────────
  'balloon-pop': {
    label: 'Balloon Pop',
    description: 'Pop the correct balloon before it floats away',
    icon: 'bubble-chart',
    contentKey: 'questions',
  },
  'whack-a-mole': {
    label: 'Whack-a-Mole',
    description: 'Tap the correct character before it hides',
    icon: 'pest-control',
    contentKey: 'questions',
  },
  catcher: {
    label: 'Catcher',
    description: 'Catch falling correct answers in your basket',
    icon: 'catching-pokemon',
    contentKey: 'questions',
  },
  'flappy-learner': {
    label: 'Flappy Learner',
    description: 'Fly through the correct answer gates',
    icon: 'flight',
    contentKey: 'questions',
  },
  'runner-dodge': {
    label: 'Runner Dodge',
    description: 'Collect correct answers and dodge wrong ones',
    icon: 'directions-run',
    contentKey: 'questions',
  },
  'math-castle': {
    label: 'Math Castle',
    description: 'Defend your castle by solving problems',
    icon: 'castle',
    contentKey: 'questions',
  },
  'letter-trace-canvas': {
    label: 'Letter Trace',
    description: 'Trace letters with sparkle particle trail',
    icon: 'draw',
    contentKey: 'traces',
  },
  'paint-by-concept': {
    label: 'Paint by Concept',
    description: 'Color zones by answering questions correctly',
    icon: 'palette',
    contentKey: 'zones',
  },
  builder: {
    label: 'Block Builder',
    description: 'Stack correct answer blocks into a tower',
    icon: 'view-column',
    contentKey: 'questions',
  },
  'word-maze': {
    label: 'Word Maze',
    description: 'Navigate a maze by answering at junctions',
    icon: 'explore',
    contentKey: 'questions',
  },

  // ── Voice-Activated Game Templates (9) ─────────────────────────────────────
  voice_spell: {
    label: 'Voice Spell',
    description: 'Say the word aloud to practice pronunciation',
    icon: 'mic',
    contentKey: 'words',
  },
  sound_charades: {
    label: 'Sound Charades',
    description: 'Make the sound of the emoji shown',
    icon: 'record-voice-over',
    contentKey: 'charades',
  },
  whisper_shout: {
    label: 'Whisper & Shout',
    description: 'Control a runner with your voice volume',
    icon: 'volume-up',
    contentKey: 'obstacles',
  },
  story_weaver: {
    label: 'Story Weaver',
    description: 'Choose your own adventure with voice or tap',
    icon: 'auto-stories',
    contentKey: 'scenes',
  },
  beat_match: {
    label: 'Beat Match',
    description: 'Listen to a rhythm and clap it back',
    icon: 'music-note',
    contentKey: 'patterns',
  },
  voice_paint: {
    label: 'Voice Paint',
    description: 'Use your voice volume to paint shapes',
    icon: 'palette',
    contentKey: 'shapes',
  },
  'voice-balloon-pop': {
    label: 'Voice Balloon Pop',
    description: 'Say the word to pop the balloon',
    icon: 'bubble-chart',
    contentKey: 'questions',
  },
  peekaboo: {
    label: 'Peekaboo',
    description: 'Say peekaboo to find the hiding character',
    icon: 'visibility',
    contentKey: 'questions',
  },
  'speech-bubble': {
    label: 'Speech Bubble',
    description: 'Say words to pop letter bubbles in order',
    icon: 'chat-bubble',
    contentKey: 'questions',
  },
};

/**
 * Get display info for a template.
 * @param {string} templateName
 * @returns {Object}
 */
export const getTemplateInfo = (templateName) => {
  const resolved = TEMPLATE_ALIASES[templateName] || templateName;
  return (
    TEMPLATE_INFO[resolved] || {
      label: templateName,
      description: 'Custom game template',
      icon: 'extension',
      contentKey: 'content',
    }
  );
};

// ─── Default Export ──────────────────────────────────────────────────────────

export default TEMPLATE_REGISTRY;
