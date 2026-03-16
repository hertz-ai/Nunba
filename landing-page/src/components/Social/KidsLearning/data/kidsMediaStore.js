/**
 * Kids Media Store - React Context Store
 *
 * Manages all media-related state for the Kids Learning Zone:
 * network status, audio controls, active media generation jobs,
 * offline request queue, and cache statistics.
 *
 * Uses React Context + useReducer (no external state library).
 * Persists to localStorage for offline resilience.
 *
 * State: isOnline, isMuted, masterVolume, activeJobs, pendingQueue, cacheStats
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

const STORAGE_KEY = 'hevolve_kids_media';
const MAX_PENDING_QUEUE = 100;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isMuted: false,
  masterVolume: 1.0,
  activeJobs: {},
  pendingQueue: [],
  cacheStats: {totalSize: 0, ttsCount: 0, musicCount: 0, videoCount: 0},
  initialized: false,
};

// ─── Action Types ─────────────────────────────────────────────────────────────

const ActionTypes = {
  HYDRATE: 'HYDRATE',
  INITIALIZE: 'INITIALIZE',
  SET_IS_ONLINE: 'SET_IS_ONLINE',
  SET_MUTED: 'SET_MUTED',
  SET_MASTER_VOLUME: 'SET_MASTER_VOLUME',
  ADD_JOB: 'ADD_JOB',
  REMOVE_JOB: 'REMOVE_JOB',
  UPDATE_JOB_PROGRESS: 'UPDATE_JOB_PROGRESS',
  QUEUE_OFFLINE_REQUEST: 'QUEUE_OFFLINE_REQUEST',
  PROCESS_PENDING_QUEUE_RESULT: 'PROCESS_PENDING_QUEUE_RESULT',
  UPDATE_CACHE_STATS: 'UPDATE_CACHE_STATS',
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function kidsMediaReducer(state, action) {
  switch (action.type) {
    case ActionTypes.HYDRATE: {
      return {
        ...state,
        ...action.payload,
        initialized: true,
        // Always derive isOnline from actual browser state, not from storage
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        // activeJobs are ephemeral; do not restore from storage
        activeJobs: {},
      };
    }

    case ActionTypes.INITIALIZE: {
      return {...state, initialized: true};
    }

    case ActionTypes.SET_IS_ONLINE: {
      return {...state, isOnline: action.payload};
    }

    case ActionTypes.SET_MUTED: {
      return {...state, isMuted: action.payload};
    }

    case ActionTypes.SET_MASTER_VOLUME: {
      const clamped = Math.max(0, Math.min(1, action.payload));
      return {...state, masterVolume: clamped};
    }

    case ActionTypes.ADD_JOB: {
      const {jobId, jobType} = action.payload;
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [jobId]: {
            type: jobType,
            status: 'pending',
            progress: 0,
            createdAt: Date.now(),
          },
        },
      };
    }

    case ActionTypes.REMOVE_JOB: {
      const {[action.payload]: _removed, ...remainingJobs} = state.activeJobs;
      return {...state, activeJobs: remainingJobs};
    }

    case ActionTypes.UPDATE_JOB_PROGRESS: {
      const {jobId, updates} = action.payload;
      const existingJob = state.activeJobs[jobId];
      if (!existingJob) return state;
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [jobId]: {...existingJob, ...updates},
        },
      };
    }

    case ActionTypes.QUEUE_OFFLINE_REQUEST: {
      const newQueue = [
        ...state.pendingQueue,
        {...action.payload, queuedAt: Date.now()},
      ].slice(-MAX_PENDING_QUEUE);
      return {...state, pendingQueue: newQueue};
    }

    case ActionTypes.PROCESS_PENDING_QUEUE_RESULT: {
      // payload is the array of requests that failed and should be kept
      return {...state, pendingQueue: action.payload};
    }

    case ActionTypes.UPDATE_CACHE_STATS: {
      return {...state, cacheStats: action.payload};
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const KidsMediaContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function KidsMediaProvider({children}) {
  const [state, dispatch] = useReducer(kidsMediaReducer, initialState);

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
      console.warn('[KidsMediaStore] Failed to hydrate:', err);
      dispatch({type: ActionTypes.INITIALIZE});
    }
  }, []);

  // Persist to localStorage on state changes (debounced)
  useEffect(() => {
    if (!state.initialized) return;

    const timeout = setTimeout(() => {
      try {
        const toPersist = {
          isMuted: state.isMuted,
          masterVolume: state.masterVolume,
          cacheStats: state.cacheStats,
          pendingQueue: state.pendingQueue,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
      } catch (err) {
        console.warn('[KidsMediaStore] Failed to persist:', err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [state]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () =>
      dispatch({type: ActionTypes.SET_IS_ONLINE, payload: true});
    const handleOffline = () =>
      dispatch({type: ActionTypes.SET_IS_ONLINE, payload: false});

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Actions ──

  const setIsOnline = useCallback((online) => {
    dispatch({type: ActionTypes.SET_IS_ONLINE, payload: online});
  }, []);

  const setMuted = useCallback((muted) => {
    dispatch({type: ActionTypes.SET_MUTED, payload: muted});
  }, []);

  const setMasterVolume = useCallback((volume) => {
    dispatch({type: ActionTypes.SET_MASTER_VOLUME, payload: volume});
  }, []);

  const addJob = useCallback((jobId, jobType) => {
    dispatch({type: ActionTypes.ADD_JOB, payload: {jobId, jobType}});
  }, []);

  const removeJob = useCallback((jobId) => {
    dispatch({type: ActionTypes.REMOVE_JOB, payload: jobId});
  }, []);

  const updateJobProgress = useCallback((jobId, updates) => {
    dispatch({
      type: ActionTypes.UPDATE_JOB_PROGRESS,
      payload: {jobId, updates},
    });
  }, []);

  const queueOfflineRequest = useCallback((request) => {
    dispatch({type: ActionTypes.QUEUE_OFFLINE_REQUEST, payload: request});
  }, []);

  /**
   * Process the pending offline queue by calling the provided handler
   * for each queued request. Failed requests are kept in the queue for retry.
   * @param {Function} handler - async function that processes a single request
   */
  const processPendingQueue = useCallback(
    async (handler) => {
      if (!state.isOnline || state.pendingQueue.length === 0) return;

      const queue = [...state.pendingQueue];
      const remaining = [];

      for (const request of queue) {
        try {
          await handler(request);
        } catch (_err) {
          // Keep failed requests in queue for retry
          remaining.push(request);
        }
      }

      dispatch({
        type: ActionTypes.PROCESS_PENDING_QUEUE_RESULT,
        payload: remaining,
      });
    },
    [state.isOnline, state.pendingQueue]
  );

  const updateCacheStats = useCallback((stats) => {
    dispatch({type: ActionTypes.UPDATE_CACHE_STATS, payload: stats});
  }, []);

  // ── Derived / Computed ──

  const activeJobCount = useMemo(
    () => Object.keys(state.activeJobs).length,
    [state.activeJobs]
  );

  const pendingQueueSize = useMemo(
    () => state.pendingQueue.length,
    [state.pendingQueue]
  );

  const getJobsByType = useCallback(
    (type) => {
      return Object.entries(state.activeJobs)
        .filter(([_id, job]) => job.type === type)
        .map(([id, job]) => ({id, ...job}));
    },
    [state.activeJobs]
  );

  const getJob = useCallback(
    (jobId) => {
      return state.activeJobs[jobId] || null;
    },
    [state.activeJobs]
  );

  // ── Context Value ──

  const value = useMemo(
    () => ({
      // State
      ...state,
      activeJobCount,
      pendingQueueSize,

      // Actions
      setIsOnline,
      setMuted,
      setMasterVolume,
      addJob,
      removeJob,
      updateJobProgress,
      queueOfflineRequest,
      processPendingQueue,
      updateCacheStats,

      // Derived
      getJobsByType,
      getJob,
    }),
    [
      state,
      activeJobCount,
      pendingQueueSize,
      setIsOnline,
      setMuted,
      setMasterVolume,
      addJob,
      removeJob,
      updateJobProgress,
      queueOfflineRequest,
      processPendingQueue,
      updateCacheStats,
      getJobsByType,
      getJob,
    ]
  );

  return (
    <KidsMediaContext.Provider value={value}>
      {children}
    </KidsMediaContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKidsMedia() {
  const context = useContext(KidsMediaContext);
  if (!context) {
    throw new Error('useKidsMedia must be used within a KidsMediaProvider');
  }
  return context;
}

// ─── Standalone Functions (for non-React code) ────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Read the current media state from localStorage without needing a Provider.
 * Returns the persisted subset of state (isMuted, masterVolume, cacheStats, pendingQueue).
 */
export function getMediaState() {
  const s = loadFromStorage();
  if (!s) {
    return {
      isMuted: false,
      masterVolume: 1.0,
      cacheStats: {totalSize: 0, ttsCount: 0, musicCount: 0, videoCount: 0},
      pendingQueue: [],
    };
  }
  return {
    isMuted: s.isMuted ?? false,
    masterVolume: s.masterVolume ?? 1.0,
    cacheStats: s.cacheStats ?? {
      totalSize: 0,
      ttsCount: 0,
      musicCount: 0,
      videoCount: 0,
    },
    pendingQueue: s.pendingQueue ?? [],
  };
}

/**
 * Standalone mute toggle that writes directly to localStorage.
 * Useful for non-React code (e.g., service workers, utility scripts).
 * @param {boolean} muted
 */
export function setMuted(muted) {
  try {
    const current = loadFromStorage() || {
      isMuted: false,
      masterVolume: 1.0,
      cacheStats: {totalSize: 0, ttsCount: 0, musicCount: 0, videoCount: 0},
      pendingQueue: [],
    };
    current.isMuted = muted;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* silent */
  }
}

const kidsMediaStore = {getMediaState, setMuted};
export default kidsMediaStore;
