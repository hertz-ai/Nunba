/**
 * SoundManager.test.js - Tests for GameSounds, HapticPatterns, and SoundEvents.
 *
 * Tests the real module exports. Web Audio API and dependent managers
 * are mocked at the global and module level to avoid actual audio output.
 */

// ---------------------------------------------------------------------------
// Web Audio API Mocks (must be set up before SoundManager import)
// ---------------------------------------------------------------------------

const mockOscillator = {
  type: '',
  frequency: {
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  disconnect: jest.fn(),
};

const mockGain = {
  gain: {
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockFilter = {
  type: '',
  frequency: {value: 0, setValueAtTime: jest.fn()},
  Q: {value: 0},
  connect: jest.fn(),
  disconnect: jest.fn(),
};

global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({...mockOscillator})),
  createGain: jest.fn(() => ({...mockGain})),
  createBiquadFilter: jest.fn(() => ({...mockFilter})),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    loop: false,
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
}));

global.OfflineAudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({...mockOscillator})),
  createGain: jest.fn(() => ({...mockGain})),
  createBiquadFilter: jest.fn(() => ({...mockFilter})),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  destination: {},
  startRendering: jest.fn().mockResolvedValue(new Float32Array(1024)),
}));

// Mock AudioChannelManager
jest.mock(
  '../../../../../components/Social/KidsLearning/shared/AudioChannelManager',
  () => ({
    __esModule: true,
    default: {
      getAudioContext: jest.fn(() => new global.AudioContext()),
      playSFX: jest.fn(),
      startBGM: jest.fn(),
      stopBGM: jest.fn(),
      pauseBGM: jest.fn(),
      resumeBGM: jest.fn(),
      playTTS: jest.fn(),
      stopAll: jest.fn(),
      setMuted: jest.fn(),
      isMuted: jest.fn(() => false),
      setMasterVolume: jest.fn(),
    },
  })
);

// Mock TTSManager
jest.mock(
  '../../../../../components/Social/KidsLearning/shared/TTSManager',
  () => ({
    __esModule: true,
    default: {
      speak: jest.fn().mockResolvedValue(true),
      preCache: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
    },
  })
);

// Mock MediaCacheManager
jest.mock(
  '../../../../../components/Social/KidsLearning/shared/MediaCacheManager',
  () => ({
    __esModule: true,
    default: {
      init: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(() => null),
      getAsync: jest.fn().mockResolvedValue(null),
      download: jest.fn().mockResolvedValue(null),
    },
  })
);

// Mock matchMedia (used by SoundManager for reduced motion detection)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Now import the real SoundManager
const {
  GameSounds,
  HapticPatterns,
  SoundEvents,
} = require('../../../../../components/Social/KidsLearning/shared/SoundManager');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SoundManager', () => {
  describe('GameSounds exports', () => {
    const expectedMethods = [
      'tap',
      'correct',
      'wrong',
      'streak',
      'complete',
      'perfect',
      'starEarned',
      'cardFlip',
      'matchFound',
      'dragStart',
      'dragDrop',
      'drag',
      'drop',
      'flip',
      'match',
      'timerTick',
      'timerEnd',
      'countdownTick',
      'countdownEnd',
      'levelUp',
      'intro',
      // Canvas game sounds
      'pop',
      'whoosh',
      'splash',
      'explosion',
      'gatePass',
      'enemyDefeat',
      'castleHit',
      'blockStack',
      'blockFall',
      'paintFill',
      'powerUp',
      'coinCollect',
      // Background music
      'startBackgroundMusic',
      'stopBackgroundMusic',
      'pauseBackgroundMusic',
      'resumeBackgroundMusic',
      // TTS
      'speakText',
      'preCacheTTS',
      'stopTTS',
      // Generated music
      'playGeneratedMusic',
      // Lifecycle
      'cleanup',
      'setMuted',
      'isMuted',
      'setMasterVolume',
      'warmUp',
    ];

    it('exports all expected methods', () => {
      expectedMethods.forEach((method) => {
        expect(GameSounds[method]).toBeDefined();
        expect(typeof GameSounds[method]).toBe('function');
      });
    });

    it('GameSounds is also the default export', () => {
      const defaultExport =
        require('../../../../../components/Social/KidsLearning/shared/SoundManager').default;
      expect(defaultExport).toBe(GameSounds);
    });
  });

  describe('GameSounds methods are callable without throwing', () => {
    const simpleMethods = [
      'tap',
      'correct',
      'wrong',
      'perfect',
      'starEarned',
      'cardFlip',
      'matchFound',
      'dragStart',
      'dragDrop',
      'drag',
      'drop',
      'flip',
      'match',
      'timerTick',
      'timerEnd',
      'countdownTick',
      'countdownEnd',
      'levelUp',
      'intro',
      // Canvas game sounds
      'pop',
      'whoosh',
      'splash',
      'explosion',
      'gatePass',
      'enemyDefeat',
      'castleHit',
      'blockStack',
      'blockFall',
      'paintFill',
      'powerUp',
      'coinCollect',
      // Lifecycle
      'cleanup',
      'stopTTS',
    ];

    simpleMethods.forEach((method) => {
      it(`${method}() is callable without throwing`, () => {
        expect(() => GameSounds[method]()).not.toThrow();
      });
    });

    it('streak(3) is callable without throwing', () => {
      expect(() => GameSounds.streak(3)).not.toThrow();
    });

    it('streak(5) is callable without throwing', () => {
      expect(() => GameSounds.streak(5)).not.toThrow();
    });

    it('streak(10) is callable without throwing', () => {
      expect(() => GameSounds.streak(10)).not.toThrow();
    });

    it('complete(false) is callable without throwing', () => {
      expect(() => GameSounds.complete(false)).not.toThrow();
    });

    it('complete(true) is callable without throwing', () => {
      expect(() => GameSounds.complete(true)).not.toThrow();
    });

    it('setMuted(true) is callable without throwing', () => {
      expect(() => GameSounds.setMuted(true)).not.toThrow();
    });

    it('isMuted() is callable without throwing', () => {
      expect(() => GameSounds.isMuted()).not.toThrow();
    });

    it('warmUp() returns a promise', () => {
      const result = GameSounds.warmUp();
      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
    });

    it('speakText() returns a promise', async () => {
      const result = GameSounds.speakText('Hello');
      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
      // TTSManager.speak mock resolves to true
      await result;
    });

    it('startBackgroundMusic() is callable', () => {
      expect(() => GameSounds.startBackgroundMusic('some-url')).not.toThrow();
    });

    it('stopBackgroundMusic() is callable', () => {
      expect(() => GameSounds.stopBackgroundMusic()).not.toThrow();
    });

    it('setMasterVolume() is callable', () => {
      expect(() => GameSounds.setMasterVolume(0.5)).not.toThrow();
    });
  });

  describe('HapticPatterns', () => {
    it('has all expected patterns', () => {
      const expectedPatterns = [
        'tap',
        'correct',
        'wrong',
        'streak3',
        'streak5',
        'streak10',
        'complete',
        'perfect',
      ];

      expectedPatterns.forEach((pattern) => {
        expect(HapticPatterns[pattern]).toBeDefined();
      });
    });

    it('tap is a number', () => {
      expect(typeof HapticPatterns.tap).toBe('number');
    });

    it('correct is an array pattern', () => {
      expect(Array.isArray(HapticPatterns.correct)).toBe(true);
    });

    it('wrong is a number', () => {
      expect(typeof HapticPatterns.wrong).toBe('number');
    });

    it('complete is an array pattern', () => {
      expect(Array.isArray(HapticPatterns.complete)).toBe(true);
    });

    it('perfect is an array pattern', () => {
      expect(Array.isArray(HapticPatterns.perfect)).toBe(true);
    });
  });

  describe('SoundEvents', () => {
    it('has all expected base event names (17)', () => {
      const baseEvents = [
        'TAP',
        'CORRECT',
        'WRONG',
        'STREAK_3',
        'STREAK_5',
        'STREAK_10',
        'COMPLETE',
        'PERFECT',
        'STAR_EARNED',
        'COUNTDOWN_TICK',
        'COUNTDOWN_END',
        'DRAG_START',
        'DRAG_DROP',
        'CARD_FLIP',
        'MATCH_FOUND',
        'LEVEL_UP',
        'INTRO',
      ];

      baseEvents.forEach((event) => {
        expect(SoundEvents[event]).toBeDefined();
        expect(typeof SoundEvents[event]).toBe('string');
      });
    });

    it('has all expected canvas event names (12)', () => {
      const canvasEvents = [
        'POP',
        'WHOOSH',
        'SPLASH',
        'EXPLOSION',
        'GATE_PASS',
        'ENEMY_DEFEAT',
        'CASTLE_HIT',
        'BLOCK_STACK',
        'BLOCK_FALL',
        'PAINT_FILL',
        'POWER_UP',
        'COIN_COLLECT',
      ];

      canvasEvents.forEach((event) => {
        expect(SoundEvents[event]).toBeDefined();
        expect(typeof SoundEvents[event]).toBe('string');
      });
    });

    it('has 29 total events (17 base + 12 canvas)', () => {
      const totalKeys = Object.keys(SoundEvents).length;
      expect(totalKeys).toBe(29);
    });

    it('all event values are unique strings', () => {
      const values = Object.values(SoundEvents);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
