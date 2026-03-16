/**
 * Kids Learning Zone - React Context Store
 *
 * Lightweight React Context-based store that manages all Kids Learning Zone state.
 * Uses React Context + useReducer (no external state library).
 * Persists to localStorage for offline resilience.
 *
 * State: ageGroup, gameHistory, customGames, totalGamesPlayed, totalCorrect,
 *   streak, bestStreak, currentCategory, isOnline, initialized
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hevolve_kids_learning_store';
const MAX_HISTORY = 200;
const MAX_CUSTOM_GAMES = 50;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  ageGroup: '6-8',
  gameHistory: [],
  customGames: [],
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  streak: 0,
  bestStreak: 0,
  currentCategory: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  initialized: false,
  lastPlayedAt: null,
  dailyGamesPlayed: 0,
  dailyDate: null,
  favoriteGames: [],
  conceptScores: {},
  categoryStats: {},
  threeR: {recall: 0, retention: 0, recognition: 0},
};

// ─── Action Types ─────────────────────────────────────────────────────────────

const ActionTypes = {
  HYDRATE: 'HYDRATE',
  INITIALIZE: 'INITIALIZE',
  SET_AGE_GROUP: 'SET_AGE_GROUP',
  RECORD_ANSWER: 'RECORD_ANSWER',
  COMPLETE_GAME: 'COMPLETE_GAME',
  ADD_CUSTOM_GAME: 'ADD_CUSTOM_GAME',
  REMOVE_CUSTOM_GAME: 'REMOVE_CUSTOM_GAME',
  SET_CATEGORY: 'SET_CATEGORY',
  SET_ONLINE: 'SET_ONLINE',
  TOGGLE_FAVORITE: 'TOGGLE_FAVORITE',
  RESET_STREAK: 'RESET_STREAK',
  RESET_ALL: 'RESET_ALL',
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function kidsLearningReducer(state, action) {
  switch (action.type) {
    case ActionTypes.HYDRATE: {
      return {
        ...state,
        ...action.payload,
        initialized: true,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      };
    }

    case ActionTypes.INITIALIZE: {
      return {...state, initialized: true};
    }

    case ActionTypes.SET_AGE_GROUP: {
      return {...state, ageGroup: action.payload};
    }

    case ActionTypes.RECORD_ANSWER: {
      const {concept, correct} = action.payload;
      const newStreak = correct ? state.streak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);

      const prevConcept = state.conceptScores[concept] || {
        correct: 0,
        total: 0,
        lastSeen: null,
      };
      const updatedConceptScores = {
        ...state.conceptScores,
        [concept]: {
          correct: prevConcept.correct + (correct ? 1 : 0),
          total: prevConcept.total + 1,
          lastSeen: new Date().toISOString(),
        },
      };

      return {
        ...state,
        totalCorrect: state.totalCorrect + (correct ? 1 : 0),
        totalQuestions: state.totalQuestions + 1,
        streak: newStreak,
        bestStreak: newBestStreak,
        conceptScores: updatedConceptScores,
      };
    }

    case ActionTypes.COMPLETE_GAME: {
      const result = action.payload;
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = state.dailyDate !== today;
      const pct = result.total > 0 ? result.correct / result.total : 0;

      // Update game history
      const newHistory = [
        {
          gameId: result.gameId,
          title: result.title || result.gameId,
          category: result.category,
          score: result.score || result.correct,
          totalQuestions: result.total,
          correctAnswers: result.correct,
          timeSpentMs:
            result.timeSpentMs || result.timeSec ? result.timeSec * 1000 : 0,
          accuracy: Math.round(pct * 100),
          timestamp: new Date().toISOString(),
        },
        ...state.gameHistory,
      ].slice(0, MAX_HISTORY);

      // Update category stats
      const catKey = result.category;
      const prevCat = state.categoryStats[catKey] || {
        played: 0,
        correct: 0,
        total: 0,
      };
      const updatedCategoryStats = {
        ...state.categoryStats,
        [catKey]: {
          played: prevCat.played + 1,
          correct: prevCat.correct + result.correct,
          total: prevCat.total + result.total,
        },
      };

      // Streak based on performance
      let newStreak = state.streak;
      let newBestStreak = state.bestStreak;
      if (pct >= 0.7) {
        newStreak += 1;
        if (newStreak > newBestStreak) newBestStreak = newStreak;
      } else {
        newStreak = 0;
      }

      // 3R heuristic
      const newTotalCorrect = state.totalCorrect;
      const newTotalQuestions = state.totalQuestions;
      const newGamesPlayed = state.totalGamesPlayed + 1;
      const threeR = {
        recall: Math.min(
          100,
          Math.round((newTotalCorrect / Math.max(1, newTotalQuestions)) * 100)
        ),
        retention: Math.min(
          100,
          Math.round((Math.min(newGamesPlayed, 30) / 30) * 100)
        ),
        recognition: Math.min(
          100,
          Math.round((Object.keys(updatedCategoryStats).length / 5) * 100)
        ),
      };

      return {
        ...state,
        gameHistory: newHistory,
        totalGamesPlayed: newGamesPlayed,
        streak: newStreak,
        bestStreak: newBestStreak,
        lastPlayedAt: new Date().toISOString(),
        dailyGamesPlayed: isNewDay ? 1 : state.dailyGamesPlayed + 1,
        dailyDate: today,
        categoryStats: updatedCategoryStats,
        threeR,
      };
    }

    case ActionTypes.ADD_CUSTOM_GAME: {
      const game = action.payload;
      if (state.customGames.some((g) => g.id === game.id)) {
        return state;
      }
      const newCustomGames = [game, ...state.customGames].slice(
        0,
        MAX_CUSTOM_GAMES
      );
      return {...state, customGames: newCustomGames};
    }

    case ActionTypes.REMOVE_CUSTOM_GAME: {
      return {
        ...state,
        customGames: state.customGames.filter((g) => g.id !== action.payload),
      };
    }

    case ActionTypes.SET_CATEGORY: {
      return {...state, currentCategory: action.payload};
    }

    case ActionTypes.SET_ONLINE: {
      return {...state, isOnline: action.payload};
    }

    case ActionTypes.TOGGLE_FAVORITE: {
      const gameId = action.payload;
      const isFav = state.favoriteGames.includes(gameId);
      return {
        ...state,
        favoriteGames: isFav
          ? state.favoriteGames.filter((id) => id !== gameId)
          : [...state.favoriteGames, gameId],
      };
    }

    case ActionTypes.RESET_STREAK: {
      return {...state, streak: 0};
    }

    case ActionTypes.RESET_ALL: {
      return {
        ...initialState,
        initialized: true,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const KidsLearningContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function KidsLearningProvider({children}) {
  const [state, dispatch] = useReducer(kidsLearningReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        dispatch({type: ActionTypes.HYDRATE, payload: parsed});
      } else {
        dispatch({type: ActionTypes.INITIALIZE});
      }
    } catch (err) {
      console.warn('[KidsLearningStore] Failed to hydrate:', err);
      dispatch({type: ActionTypes.INITIALIZE});
    }
  }, []);

  // Persist to localStorage on state changes (debounced)
  useEffect(() => {
    if (!state.initialized) return;

    const timeout = setTimeout(() => {
      try {
        const toPersist = {...state};
        delete toPersist.isOnline;
        delete toPersist.initialized;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
      } catch (err) {
        console.warn('[KidsLearningStore] Failed to persist:', err);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [state]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () =>
      dispatch({type: ActionTypes.SET_ONLINE, payload: true});
    const handleOffline = () =>
      dispatch({type: ActionTypes.SET_ONLINE, payload: false});

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Actions ──

  const setAgeGroup = useCallback((ageGroup) => {
    dispatch({type: ActionTypes.SET_AGE_GROUP, payload: ageGroup});
  }, []);

  const recordAnswer = useCallback((concept, correct) => {
    dispatch({type: ActionTypes.RECORD_ANSWER, payload: {concept, correct}});
  }, []);

  const completeGame = useCallback((result) => {
    dispatch({type: ActionTypes.COMPLETE_GAME, payload: result});
  }, []);

  const addCustomGame = useCallback((game) => {
    dispatch({type: ActionTypes.ADD_CUSTOM_GAME, payload: game});
  }, []);

  const removeCustomGame = useCallback((gameId) => {
    dispatch({type: ActionTypes.REMOVE_CUSTOM_GAME, payload: gameId});
  }, []);

  const setCurrentCategory = useCallback((category) => {
    dispatch({type: ActionTypes.SET_CATEGORY, payload: category});
  }, []);

  const setIsOnline = useCallback((online) => {
    dispatch({type: ActionTypes.SET_ONLINE, payload: online});
  }, []);

  const toggleFavorite = useCallback((gameId) => {
    dispatch({type: ActionTypes.TOGGLE_FAVORITE, payload: gameId});
  }, []);

  const resetStreak = useCallback(() => {
    dispatch({type: ActionTypes.RESET_STREAK});
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({type: ActionTypes.RESET_ALL});
  }, []);

  const persist = useCallback(() => {
    try {
      const toPersist = {...state};
      delete toPersist.isOnline;
      delete toPersist.initialized;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (err) {
      console.warn('[KidsLearningStore] Manual persist failed:', err);
    }
  }, [state]);

  // ── Backward-compatible API (matches old plain-object store) ──

  const getProgress = useCallback(() => {
    return {
      gamesPlayed: state.totalGamesPlayed,
      totalCorrect: state.totalCorrect,
      totalQuestions: state.totalQuestions,
      streak: state.streak,
      bestStreak: state.bestStreak,
      recentGames: state.gameHistory.slice(0, 20),
      categoryStats: state.categoryStats,
      threeR: state.threeR,
    };
  }, [state]);

  const recordGame = useCallback(
    (result) => {
      completeGame(result);
    },
    [completeGame]
  );

  const resetProgress = useCallback(() => {
    resetAll();
  }, [resetAll]);

  // ── Computed / Derived State ──

  const accuracy = useMemo(() => {
    if (state.totalQuestions === 0) return 0;
    return Math.round((state.totalCorrect / state.totalQuestions) * 100);
  }, [state.totalCorrect, state.totalQuestions]);

  const getGameHistory = useCallback(
    (category, limit = 20) => {
      let filtered = state.gameHistory;
      if (category) {
        filtered = filtered.filter((g) => g.category === category);
      }
      return filtered.slice(0, limit);
    },
    [state.gameHistory]
  );

  const getCategoryStats = useCallback(
    (category) => {
      const stats = state.categoryStats[category];
      if (!stats) {
        return {played: 0, correct: 0, total: 0, accuracy: 0, avgScore: 0};
      }
      return {
        ...stats,
        accuracy:
          stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        avgScore:
          stats.played > 0
            ? Math.round((stats.correct / stats.played) * 10) / 10
            : 0,
      };
    },
    [state.categoryStats]
  );

  const getConceptScore = useCallback(
    (concept) => {
      return (
        state.conceptScores[concept] || {correct: 0, total: 0, lastSeen: null}
      );
    },
    [state.conceptScores]
  );

  const getWeakConcepts = useCallback(
    (category, threshold = 0.5) => {
      return Object.entries(state.conceptScores)
        .filter(([key, val]) => {
          if (category && !key.startsWith(category)) return false;
          if (val.total < 2) return false;
          return val.correct / val.total < threshold;
        })
        .map(([key, val]) => ({concept: key, ...val}))
        .sort((a, b) => a.correct / a.total - b.correct / b.total);
    },
    [state.conceptScores]
  );

  const isFavorite = useCallback(
    (gameId) => {
      return state.favoriteGames.includes(gameId);
    },
    [state.favoriteGames]
  );

  // ── Context Value ──

  const value = useMemo(
    () => ({
      // State
      ...state,
      accuracy,

      // Actions
      setAgeGroup,
      recordAnswer,
      completeGame,
      addCustomGame,
      removeCustomGame,
      setCurrentCategory,
      setIsOnline,
      toggleFavorite,
      resetStreak,
      resetAll,
      persist,

      // Backward-compatible API
      getProgress,
      recordGame,
      resetProgress,

      // Derived
      getGameHistory,
      getCategoryStats,
      getConceptScore,
      getWeakConcepts,
      isFavorite,
    }),
    [
      state,
      accuracy,
      setAgeGroup,
      recordAnswer,
      completeGame,
      addCustomGame,
      removeCustomGame,
      setCurrentCategory,
      setIsOnline,
      toggleFavorite,
      resetStreak,
      resetAll,
      persist,
      getProgress,
      recordGame,
      resetProgress,
      getGameHistory,
      getCategoryStats,
      getConceptScore,
      getWeakConcepts,
      isFavorite,
    ]
  );

  return (
    <KidsLearningContext.Provider value={value}>
      {children}
    </KidsLearningContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKidsLearning() {
  const context = useContext(KidsLearningContext);
  if (!context) {
    throw new Error(
      'useKidsLearning must be used within a KidsLearningProvider'
    );
  }
  return context;
}

// ─── Backward-compatible standalone functions ─────────────────────────────────
// These work without the Provider for simple usage (e.g., in non-React code)

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getProgress() {
  const s = loadFromStorage();
  if (!s) return initialState;
  return {
    gamesPlayed: s.totalGamesPlayed || 0,
    totalCorrect: s.totalCorrect || 0,
    totalQuestions: s.totalQuestions || 0,
    streak: s.streak || 0,
    bestStreak: s.bestStreak || 0,
    recentGames: (s.gameHistory || []).slice(0, 20),
    categoryStats: s.categoryStats || {},
    threeR: s.threeR || {recall: 0, retention: 0, recognition: 0},
  };
}

export function recordGame(result) {
  // This is the simple standalone version; prefer the context-based version
  const s = loadFromStorage() || {...initialState};
  const pct = result.total > 0 ? result.correct / result.total : 0;

  s.totalGamesPlayed = (s.totalGamesPlayed || 0) + 1;
  s.totalCorrect = (s.totalCorrect || 0) + result.correct;
  s.totalQuestions = (s.totalQuestions || 0) + result.total;

  if (pct >= 0.7) {
    s.streak = (s.streak || 0) + 1;
    if (s.streak > (s.bestStreak || 0)) s.bestStreak = s.streak;
  } else {
    s.streak = 0;
  }

  if (!s.categoryStats) s.categoryStats = {};
  if (!s.categoryStats[result.category]) {
    s.categoryStats[result.category] = {played: 0, correct: 0, total: 0};
  }
  const cat = s.categoryStats[result.category];
  cat.played += 1;
  cat.correct += result.correct;
  cat.total += result.total;

  s.threeR = {
    recall: Math.min(
      100,
      Math.round((s.totalCorrect / Math.max(1, s.totalQuestions)) * 100)
    ),
    retention: Math.min(
      100,
      Math.round((Math.min(s.totalGamesPlayed, 30) / 30) * 100)
    ),
    recognition: Math.min(
      100,
      Math.round((Object.keys(s.categoryStats).length / 5) * 100)
    ),
  };

  if (!s.gameHistory) s.gameHistory = [];
  s.gameHistory.unshift({
    ...result,
    timestamp: new Date().toISOString(),
    accuracy: Math.round(pct * 100),
  });
  if (s.gameHistory.length > MAX_HISTORY) s.gameHistory.length = MAX_HISTORY;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* silent */
  }

  return s;
}

export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}

const kidsLearningStore = {getProgress, recordGame, resetProgress};
export default kidsLearningStore;
