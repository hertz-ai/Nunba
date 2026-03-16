/**
 * Kids Learning Zone - Universal Game Engine
 *
 * Platform-agnostic game state machine and logic controller.
 * This is the core "brain" that drives all game templates.
 *
 * Features:
 * - Question index management with shuffling
 * - Score tracking with configurable rewards
 * - Answer checking with correctness validation per template type
 * - Streak tracking (current + best)
 * - Hint system with attempt tracking
 * - Adaptive difficulty adjustment
 * - Timer management for timed games
 * - Results aggregation with per-concept breakdown
 * - Pure logic -- no platform UI code
 *
 * Usage:
 *   const { state, actions } = useGameEngine(gameConfig);
 *   actions.start();
 *   actions.submitAnswer(selectedOptionIndex);
 */

import {useReducer, useCallback, useRef, useMemo, useEffect} from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

export const GamePhase = {
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  CHECKING: 'checking',
  FEEDBACK: 'feedback',
  HINT: 'hint',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error',
};

const DEFAULT_CONFIG = {
  questionsPerSession: 10,
  timeLimit: 0,
  hintsAllowed: 3,
  pointsPerCorrect: 10,
  pointsPerStreak: 5,
  streakMilestone: 3,
  bonusThreshold: 8,
  bonusStars: 3,
  starsPerCorrect: 1,
  showFeedbackMs: 1500,
  shuffleQuestions: true,
  adaptiveDifficulty: false,
  maxAttempts: 2,
};

// ─── Action Types ─────────────────────────────────────────────────────────────

const Actions = {
  INIT: 'INIT',
  START: 'START',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  NEXT_QUESTION: 'NEXT_QUESTION',
  USE_HINT: 'USE_HINT',
  TICK_TIMER: 'TICK_TIMER',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  COMPLETE: 'COMPLETE',
  RESET: 'RESET',
  SET_ERROR: 'SET_ERROR',
  SKIP_QUESTION: 'SKIP_QUESTION',
  ADJUST_DIFFICULTY: 'ADJUST_DIFFICULTY',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function extractQuestions(gameConfig) {
  const content = gameConfig?.content;
  if (!content) return [];

  if (content.questions) return content.questions;
  if (content.statements) return content.statements;
  if (content.words) return content.words;
  if (content.pairs) return content.pairs;
  if (content.rounds) return content.rounds;
  if (content.sequences) return content.sequences;
  if (content.items) return content.items;
  if (content.story) return [content.story];
  if (content.scenario) return [content.scenario];
  if (content.differences) return content.differences;

  return [];
}

export function checkAnswer(question, answer, template) {
  if (!question) return false;

  switch (template) {
    case 'multiple-choice':
    case 'timed-rush':
    case 'quiz':
      return answer === question.correctIndex;

    case 'true-false':
      return answer === question.answer;

    case 'fill-blank':
    case 'fillBlank':
      if (typeof answer === 'number') {
        return (
          question.options &&
          question.options[answer]?.toLowerCase() ===
            question.blank?.toLowerCase()
        );
      }
      return (
        String(answer).toLowerCase().trim() ===
        String(question.blank).toLowerCase().trim()
      );

    case 'word-build':
      return (
        String(answer).toLowerCase().trim() ===
        String(question.word).toLowerCase().trim()
      );

    case 'match-pairs':
    case 'matching':
      if (answer?.left && answer?.right) {
        return answer.left === question.left && answer.right === question.right;
      }
      return false;

    case 'counting':
      return Number(answer) === Number(question.count);

    case 'sequence-order':
      if (Array.isArray(answer) && Array.isArray(question.items)) {
        return JSON.stringify(answer) === JSON.stringify(question.items);
      }
      return false;

    case 'drag-to-zone':
    case 'sorting':
      return answer === question.zone;

    case 'memory-flip':
      return !!answer;

    case 'story-builder':
    case 'simulation':
      return answer?.isGood !== undefined ? answer.isGood : true;

    case 'spot-difference':
      return !!answer;

    default:
      return answer === question.correctIndex || answer === question.answer;
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function gameReducer(state, action) {
  switch (action.type) {
    case Actions.INIT: {
      const {gameConfig, config} = action.payload;
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        ...gameConfig?.rewards,
      };

      // Extract time limit from content if present (e.g. timed-rush games)
      if (gameConfig?.content?.timeLimit && !mergedConfig.timeLimit) {
        mergedConfig.timeLimit = gameConfig.content.timeLimit;
      }

      const rawQuestions = extractQuestions(gameConfig);
      const questions = mergedConfig.shuffleQuestions
        ? shuffleArray(rawQuestions)
        : rawQuestions;
      const totalToPlay = Math.min(
        mergedConfig.questionsPerSession,
        questions.length
      );

      return {
        ...state,
        phase: GamePhase.READY,
        gameConfig,
        config: mergedConfig,
        questions: questions.slice(0, totalToPlay),
        totalQuestions: totalToPlay,
        currentIndex: 0,
        score: 0,
        stars: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        hintsUsed: 0,
        hintsRemaining: mergedConfig.hintsAllowed,
        currentAttempts: 0,
        results: [],
        timeRemaining: mergedConfig.timeLimit || 0,
        timeElapsed: 0,
        startedAt: null,
        completedAt: null,
        lastAnswerCorrect: null,
        lastFeedback: null,
        currentDifficulty: gameConfig?.difficulty || 1,
        error: null,
      };
    }

    case Actions.START: {
      return {
        ...state,
        phase: GamePhase.PLAYING,
        startedAt: Date.now(),
      };
    }

    case Actions.SUBMIT_ANSWER: {
      const {answer, timeTakenMs} = action.payload;
      const question = state.questions[state.currentIndex];
      const template = state.gameConfig?.template || 'multiple-choice';
      const isCorrect = checkAnswer(question, answer, template);
      const concept = question?.concept || `q-${state.currentIndex}`;

      let scoreGain = 0;
      let starsGain = 0;
      if (isCorrect) {
        scoreGain = state.config.pointsPerCorrect;
        starsGain = state.config.starsPerCorrect || 1;

        const newStreak = state.streak + 1;
        if (newStreak > 0 && newStreak % state.config.streakMilestone === 0) {
          scoreGain += state.config.pointsPerStreak;
        }
      }

      const newStreak = isCorrect ? state.streak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);
      const isLastQuestion = state.currentIndex >= state.totalQuestions - 1;
      const newAttempts = state.currentAttempts + 1;
      const maxedAttempts = newAttempts >= state.config.maxAttempts;
      const shouldAdvance = isCorrect || maxedAttempts;

      const resultEntry = {
        questionIndex: state.currentIndex,
        concept,
        correct: isCorrect,
        answer,
        timeTakenMs: timeTakenMs || 0,
        attempts: newAttempts,
        hintUsed: state.currentAttempts > 0,
      };

      return {
        ...state,
        phase: shouldAdvance ? GamePhase.FEEDBACK : GamePhase.PLAYING,
        score: state.score + scoreGain,
        stars: state.stars + starsGain,
        streak: newStreak,
        bestStreak: newBestStreak,
        correctCount: state.correctCount + (isCorrect ? 1 : 0),
        incorrectCount:
          state.incorrectCount + (!isCorrect && shouldAdvance ? 1 : 0),
        currentAttempts: shouldAdvance ? 0 : newAttempts,
        results: [...state.results, resultEntry],
        lastAnswerCorrect: isCorrect,
        lastFeedback: {
          correct: isCorrect,
          explanation: question?.explanation || question?.hint || null,
          concept,
          scoreGain,
        },
        ...(isLastQuestion && shouldAdvance
          ? {phase: GamePhase.COMPLETE, completedAt: Date.now()}
          : {}),
      };
    }

    case Actions.NEXT_QUESTION: {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.totalQuestions) {
        return {...state, phase: GamePhase.COMPLETE, completedAt: Date.now()};
      }
      return {
        ...state,
        phase: GamePhase.PLAYING,
        currentIndex: nextIndex,
        currentAttempts: 0,
        lastAnswerCorrect: null,
        lastFeedback: null,
      };
    }

    case Actions.USE_HINT: {
      if (state.hintsRemaining <= 0) return state;
      return {
        ...state,
        phase: GamePhase.HINT,
        hintsUsed: state.hintsUsed + 1,
        hintsRemaining: state.hintsRemaining - 1,
      };
    }

    case Actions.TICK_TIMER: {
      if (state.config.timeLimit <= 0) return state;
      const newTimeRemaining = Math.max(0, state.timeRemaining - 1);
      const newTimeElapsed = state.timeElapsed + 1;

      if (newTimeRemaining <= 0) {
        return {
          ...state,
          timeRemaining: 0,
          timeElapsed: newTimeElapsed,
          phase: GamePhase.COMPLETE,
          completedAt: Date.now(),
        };
      }

      return {
        ...state,
        timeRemaining: newTimeRemaining,
        timeElapsed: newTimeElapsed,
      };
    }

    case Actions.PAUSE: {
      return {...state, phase: GamePhase.PAUSED};
    }

    case Actions.RESUME: {
      return {...state, phase: GamePhase.PLAYING};
    }

    case Actions.COMPLETE: {
      return {...state, phase: GamePhase.COMPLETE, completedAt: Date.now()};
    }

    case Actions.SKIP_QUESTION: {
      const skipResult = {
        questionIndex: state.currentIndex,
        concept:
          state.questions[state.currentIndex]?.concept ||
          `q-${state.currentIndex}`,
        correct: false,
        answer: null,
        timeTakenMs: 0,
        attempts: 0,
        skipped: true,
      };

      const nextIdx = state.currentIndex + 1;
      const isLast = nextIdx >= state.totalQuestions;

      return {
        ...state,
        phase: isLast ? GamePhase.COMPLETE : GamePhase.PLAYING,
        currentIndex: isLast ? state.currentIndex : nextIdx,
        skippedCount: state.skippedCount + 1,
        streak: 0,
        currentAttempts: 0,
        results: [...state.results, skipResult],
        lastAnswerCorrect: null,
        lastFeedback: null,
        ...(isLast ? {completedAt: Date.now()} : {}),
      };
    }

    case Actions.ADJUST_DIFFICULTY: {
      const {direction} = action.payload;
      const newDiff =
        direction === 'up'
          ? Math.min(5, state.currentDifficulty + 1)
          : Math.max(1, state.currentDifficulty - 1);
      return {...state, currentDifficulty: newDiff};
    }

    case Actions.RESET: {
      return {
        phase: GamePhase.LOADING,
        gameConfig: null,
        config: DEFAULT_CONFIG,
        questions: [],
        totalQuestions: 0,
        currentIndex: 0,
        score: 0,
        stars: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        hintsUsed: 0,
        hintsRemaining: 0,
        currentAttempts: 0,
        results: [],
        timeRemaining: 0,
        timeElapsed: 0,
        startedAt: null,
        completedAt: null,
        lastAnswerCorrect: null,
        lastFeedback: null,
        currentDifficulty: 1,
        error: null,
      };
    }

    case Actions.SET_ERROR: {
      return {...state, phase: GamePhase.ERROR, error: action.payload};
    }

    default:
      return state;
  }
}

// ─── Initial Reducer State ────────────────────────────────────────────────────

const initialGameState = {
  phase: GamePhase.LOADING,
  gameConfig: null,
  config: DEFAULT_CONFIG,
  questions: [],
  totalQuestions: 0,
  currentIndex: 0,
  score: 0,
  stars: 0,
  streak: 0,
  bestStreak: 0,
  correctCount: 0,
  incorrectCount: 0,
  skippedCount: 0,
  hintsUsed: 0,
  hintsRemaining: 0,
  currentAttempts: 0,
  results: [],
  timeRemaining: 0,
  timeElapsed: 0,
  startedAt: null,
  completedAt: null,
  lastAnswerCorrect: null,
  lastFeedback: null,
  currentDifficulty: 1,
  error: null,
};

// ─── Hook: useGameEngine ──────────────────────────────────────────────────────

/**
 * Universal game engine hook.
 *
 * @param {Object} gameConfig - The game configuration (from gameConfigs or server)
 * @param {Object} [overrides] - Optional config overrides
 * @returns {{ state: Object, actions: Object, dispatch: Function }}
 *
 * @example
 * const { state, actions } = useGameEngine(myGameConfig);
 * actions.start();
 * actions.submitAnswer(selectedIndex);
 */
export function useGameEngine(gameConfig, overrides = {}) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const timerRef = useRef(null);
  const questionStartRef = useRef(null);

  // Initialize when gameConfig changes
  useEffect(() => {
    if (gameConfig) {
      dispatch({
        type: Actions.INIT,
        payload: {gameConfig, config: overrides},
      });
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer management
  useEffect(() => {
    if (state.phase === GamePhase.PLAYING && state.config.timeLimit > 0) {
      timerRef.current = setInterval(() => {
        dispatch({type: Actions.TICK_TIMER});
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.config.timeLimit]);

  // Track question start time
  useEffect(() => {
    if (state.phase === GamePhase.PLAYING) {
      questionStartRef.current = Date.now();
    }
  }, [state.phase, state.currentIndex]);

  // ── Actions ──

  const init = useCallback((config, configOverrides = {}) => {
    dispatch({
      type: Actions.INIT,
      payload: {gameConfig: config, config: configOverrides},
    });
  }, []);

  const start = useCallback(() => {
    dispatch({type: Actions.START});
  }, []);

  const submitAnswer = useCallback((answer) => {
    const timeTakenMs = questionStartRef.current
      ? Date.now() - questionStartRef.current
      : 0;
    dispatch({type: Actions.SUBMIT_ANSWER, payload: {answer, timeTakenMs}});
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({type: Actions.NEXT_QUESTION});
  }, []);

  const useHint = useCallback(() => {
    dispatch({type: Actions.USE_HINT});
  }, []);

  const dismissHint = useCallback(() => {
    dispatch({type: Actions.RESUME});
  }, []);

  const pause = useCallback(() => {
    dispatch({type: Actions.PAUSE});
  }, []);

  const resume = useCallback(() => {
    dispatch({type: Actions.RESUME});
  }, []);

  const complete = useCallback(() => {
    dispatch({type: Actions.COMPLETE});
  }, []);

  const skipQuestion = useCallback(() => {
    dispatch({type: Actions.SKIP_QUESTION});
  }, []);

  const adjustDifficulty = useCallback((direction) => {
    dispatch({type: Actions.ADJUST_DIFFICULTY, payload: {direction}});
  }, []);

  const reset = useCallback(() => {
    dispatch({type: Actions.RESET});
  }, []);

  const setError = useCallback((error) => {
    dispatch({type: Actions.SET_ERROR, payload: error});
  }, []);

  // ── Computed Values ──

  const currentQuestion = useMemo(() => {
    return state.questions[state.currentIndex] || null;
  }, [state.questions, state.currentIndex]);

  const progress = useMemo(() => {
    if (state.totalQuestions === 0) return 0;
    return (state.currentIndex / state.totalQuestions) * 100;
  }, [state.currentIndex, state.totalQuestions]);

  const accuracy = useMemo(() => {
    const answered = state.correctCount + state.incorrectCount;
    if (answered === 0) return 0;
    return Math.round((state.correctCount / answered) * 100);
  }, [state.correctCount, state.incorrectCount]);

  const isComplete = state.phase === GamePhase.COMPLETE;
  const isPlaying = state.phase === GamePhase.PLAYING;
  const isPaused = state.phase === GamePhase.PAUSED;
  const isReady = state.phase === GamePhase.READY;

  const timeSpentMs = useMemo(() => {
    if (!state.startedAt) return 0;
    const end = state.completedAt || Date.now();
    return end - state.startedAt;
  }, [state.startedAt, state.completedAt]);

  const earnedBonus = useMemo(() => {
    return state.correctCount >= (state.config.bonusThreshold || 8);
  }, [state.correctCount, state.config.bonusThreshold]);

  const totalStars = useMemo(() => {
    let s = state.stars;
    if (earnedBonus) s += state.config.bonusStars || 3;
    return s;
  }, [state.stars, earnedBonus, state.config.bonusStars]);

  const gameResult = useMemo(() => {
    if (!isComplete) return null;
    return {
      gameId: state.gameConfig?.id || 'unknown',
      category: state.gameConfig?.category || 'unknown',
      template: state.gameConfig?.template || 'unknown',
      title: state.gameConfig?.title || 'Unknown Game',
      score: state.score,
      stars: totalStars,
      totalQuestions: state.totalQuestions,
      correct: state.correctCount,
      correctAnswers: state.correctCount,
      incorrectAnswers: state.incorrectCount,
      skippedAnswers: state.skippedCount,
      total: state.totalQuestions,
      accuracy,
      streak: state.bestStreak,
      hintsUsed: state.hintsUsed,
      timeSpentMs,
      timeSec: Math.round(timeSpentMs / 1000),
      earnedBonus,
      results: state.results,
      difficulty: state.currentDifficulty,
    };
  }, [
    isComplete,
    state.gameConfig,
    state.score,
    totalStars,
    state.totalQuestions,
    state.correctCount,
    state.incorrectCount,
    state.skippedCount,
    accuracy,
    state.bestStreak,
    state.hintsUsed,
    timeSpentMs,
    earnedBonus,
    state.results,
    state.currentDifficulty,
  ]);

  // ── Return ──

  const actions = useMemo(
    () => ({
      init,
      start,
      submitAnswer,
      nextQuestion,
      useHint,
      dismissHint,
      pause,
      resume,
      complete,
      skipQuestion,
      adjustDifficulty,
      reset,
      setError,
    }),
    [
      init,
      start,
      submitAnswer,
      nextQuestion,
      useHint,
      dismissHint,
      pause,
      resume,
      complete,
      skipQuestion,
      adjustDifficulty,
      reset,
      setError,
    ]
  );

  return {
    state: {
      ...state,
      currentQuestion,
      progress,
      accuracy,
      isComplete,
      isPlaying,
      isPaused,
      isReady,
      timeSpentMs,
      earnedBonus,
      totalStars,
      gameResult,
    },
    actions,
    dispatch,
  };
}

export {DEFAULT_CONFIG};
export default useGameEngine;
