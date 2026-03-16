/**
 * Game Configs Catalogue - Validation Tests
 *
 * Validates that all 195+ game configurations in gameConfigs.js have correct
 * structure, unique IDs, registered templates, valid metadata, and meaningful
 * content for their template type.
 */

/* eslint-disable no-unused-vars */

jest.mock('../../../../../components/Social/KidsLearning/gameRegistry', () => {
  const KNOWN_TEMPLATES = [
    'multiple-choice',
    'true-false',
    'fill-blank',
    'match-pairs',
    'memory-flip',
    'counting',
    'sequence-order',
    'word-build',
    'drag-to-zone',
    'timed-rush',
    'story-builder',
    'simulation',
    'spot-difference',
    'puzzle-assemble',
    'tracing',
    'balloon-pop',
    'whack-a-mole',
    'catcher',
    'flappy-learner',
    'runner-dodge',
    'math-castle',
    'letter-trace-canvas',
    'paint-by-concept',
    'builder',
    'word-maze',
    // aliases
    'quiz',
    'matching',
    'sorting',
    'fillBlank',
  ];
  return {
    __esModule: true,
    default: {},
    hasTemplate: (name) => KNOWN_TEMPLATES.includes(name),
    getTemplateComponent: jest.fn(),
    TEMPLATE_NAMES: KNOWN_TEMPLATES,
    ALL_TEMPLATE_KEYS: KNOWN_TEMPLATES,
  };
});

jest.mock(
  '../../../../../components/Social/KidsLearning/shared/SoundManager',
  () => ({
    GameSounds: {
      correct: jest.fn(),
      wrong: jest.fn(),
      tap: jest.fn(),
      complete: jest.fn(),
      streak: jest.fn(),
      intro: jest.fn(),
      countdownTick: jest.fn(),
      countdownEnd: jest.fn(),
      starEarned: jest.fn(),
      dragStart: jest.fn(),
      dragDrop: jest.fn(),
      cardFlip: jest.fn(),
      matchFound: jest.fn(),
      levelUp: jest.fn(),
      pop: jest.fn(),
      whoosh: jest.fn(),
      splash: jest.fn(),
      explosion: jest.fn(),
      gatePass: jest.fn(),
      enemyDefeat: jest.fn(),
      castleHit: jest.fn(),
      blockStack: jest.fn(),
      blockFall: jest.fn(),
      paintFill: jest.fn(),
      powerUp: jest.fn(),
      coinCollect: jest.fn(),
      speakText: jest.fn(),
      startBackgroundMusic: jest.fn(),
      stopBackgroundMusic: jest.fn(),
      stopTTS: jest.fn(),
      cleanup: jest.fn(),
      setMuted: jest.fn(),
      isMuted: jest.fn(() => false),
      warmUp: jest.fn(),
    },
    HapticPatterns: {},
    SoundEvents: {},
  })
);

import gameConfigs from '../../../../../components/Social/KidsLearning/data/gameConfigs';
import {hasTemplate} from '../../../../../components/Social/KidsLearning/gameRegistry';

describe('Game Configs Catalogue', () => {
  const games = gameConfigs; // the default export (array)

  test('has at least 100 games', () => {
    expect(games.length).toBeGreaterThanOrEqual(100);
  });

  test('has at least 190 total games (base + interactive)', () => {
    expect(games.length).toBeGreaterThanOrEqual(190);
  });

  test('all game IDs are unique', () => {
    const ids = games.map((g) => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all games have required fields', () => {
    games.forEach((game) => {
      expect(game.id).toBeTruthy();
      expect(game.title).toBeTruthy();
      expect(game.category).toBeTruthy();
      expect(game.template).toBeTruthy();
      expect(game.content).toBeTruthy();
    });
  });

  test('all games use registered templates', () => {
    games.forEach((game) => {
      expect(hasTemplate(game.template)).toBe(true);
    });
  });

  test('all games have valid age range', () => {
    games.forEach((game) => {
      if (game.ageRange) {
        expect(game.ageRange).toHaveLength(2);
        expect(game.ageRange[0]).toBeLessThanOrEqual(game.ageRange[1]);
      }
    });
  });

  test('all games have valid difficulty (1-3)', () => {
    games.forEach((game) => {
      if (game.difficulty !== undefined) {
        expect(game.difficulty).toBeGreaterThanOrEqual(1);
        expect(game.difficulty).toBeLessThanOrEqual(3);
      }
    });
  });

  test('all games have content with items', () => {
    const failures = [];
    games.forEach((game) => {
      const c = game.content;
      const hasItems =
        (c.questions && c.questions.length > 0) ||
        (c.pairs && c.pairs.length > 0) ||
        (c.rounds && c.rounds.length > 0) ||
        (c.words && c.words.length > 0) ||
        (c.sequences && c.sequences.length > 0) ||
        (c.traces && c.traces.length > 0) ||
        (c.zones && c.zones.length > 0) ||
        (c.differences && c.differences.length > 0) ||
        (c.puzzles && c.puzzles.length > 0) ||
        (c.statements && c.statements.length > 0) ||
        (c.items && c.items.length > 0) ||
        (c.sentences && c.sentences.length > 0) ||
        (c.cards && c.cards.length > 0) ||
        (c.waves && c.waves.length > 0) ||
        c.story ||
        c.scenario ||
        c.maze ||
        c.timeLimit;
      if (!hasItems) failures.push(game.id);
    });
    expect(failures).toEqual([]);
  });

  test('interactive games have rewards config', () => {
    const interactiveGames = games.filter(
      (g) => g.isInteractive || g.isEnhanced
    );
    interactiveGames.forEach((game) => {
      if (game.rewards) {
        expect(game.rewards.starsPerCorrect).toBeGreaterThan(0);
      }
    });
  });

  test('covers all main categories', () => {
    const categories = new Set(games.map((g) => g.category));
    expect(categories.has('english')).toBe(true);
    expect(categories.has('math')).toBe(true);
    // lifeSkills is used in base configs, life-skills in some interactive
    expect(categories.has('lifeSkills') || categories.has('life-skills')).toBe(
      true
    );
    expect(categories.has('creativity')).toBe(true);
  });

  test('covers multiple template types', () => {
    const templates = new Set(games.map((g) => g.template));
    expect(templates.size).toBeGreaterThanOrEqual(10);
  });
});
