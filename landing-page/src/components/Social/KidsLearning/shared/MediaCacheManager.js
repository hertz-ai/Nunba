/**
 * MediaCacheManager - IndexedDB + localStorage cache for Kids Learning Zone (Web).
 *
 * Replaces rn-fetch-blob disk cache and AsyncStorage with:
 *   - IndexedDB for large binary blobs (audio, video, images)
 *   - localStorage for small inline TTS clips (< ~100KB base64)
 *
 * Cache tiers:
 *   Inline (localStorage)  - small TTS base64 strings
 *   Blob   (IndexedDB)     - audio files, music, video, images
 *
 * Features:
 *   - Deterministic cache keys via djb2 hash
 *   - LRU eviction at 200 MB
 *   - Per-type TTL (TTS 14d, Music 30d, Video 7d, SFX 30d, Image 14d)
 *   - In-memory index kept in sync with an IndexedDB "meta" store
 *
 * Usage:
 *   import MediaCacheManager from './shared/MediaCacheManager';
 *   await MediaCacheManager.init();
 *   const blobUrl = await MediaCacheManager.download('tts', params, url);
 *   const cached  = MediaCacheManager.get('tts', params); // blob URL or null
 */

import {logger} from '../../../../utils/logger';

// ── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'kidsMediaCache';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs'; // objectStore for binary data
const META_STORE = 'meta'; // objectStore for cache index
const META_KEY = '__cacheIndex__';
const INLINE_PREFIX = 'kidsMedia_inline_';
const MAX_CACHE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

// TTL per media type (milliseconds)
const TTL = {
  tts: 14 * 24 * 60 * 60 * 1000, // 14 days
  music: 30 * 24 * 60 * 60 * 1000, // 30 days
  video: 7 * 24 * 60 * 60 * 1000, //  7 days
  sfx: 30 * 24 * 60 * 60 * 1000, // 30 days
  image: 14 * 24 * 60 * 60 * 1000, // 14 days
};

// ── Deterministic Hash ───────────────────────────────────────────────────────

/**
 * djb2 hash for deterministic cache keys.
 * @param {string} mediaType
 * @param {Object} params
 * @returns {string} hex hash
 */
const generateCacheKey = (mediaType, params) => {
  const input = `${mediaType}:${JSON.stringify(params)}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
};

// ── IndexedDB helpers ────────────────────────────────────────────────────────

let _db = null;

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;

      // Handle unexpected close (e.g. browser clearing storage)
      _db.onclose = () => {
        _db = null;
      };

      resolve(_db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

const idbGet = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
};

const idbPut = (storeName, key, value) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
};

const idbDelete = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
};

const idbClear = (storeName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
};

// ── In-memory cache index ────────────────────────────────────────────────────

let cacheIndex = {};
let initialized = false;

// Blob URL registry: cacheKey -> blobUrl (for revoking)
const blobUrlMap = new Map();

/**
 * Create a Blob URL for a cached Blob and register it.
 */
const createBlobUrl = (key, blob) => {
  // Revoke existing if any
  if (blobUrlMap.has(key)) {
    try {
      URL.revokeObjectURL(blobUrlMap.get(key));
    } catch (err) {
      logger.error(err);
    }
  }
  const url = URL.createObjectURL(blob);
  blobUrlMap.set(key, url);
  return url;
};

// ── MediaCacheManager ────────────────────────────────────────────────────────

const MediaCacheManager = {
  /**
   * Initialize the cache: open IndexedDB, load index, prune expired entries.
   */
  init: async () => {
    if (initialized) return;
    try {
      await openDB();
      const savedIndex = await idbGet(META_STORE, META_KEY);
      if (savedIndex && typeof savedIndex === 'object') {
        cacheIndex = savedIndex;
        await MediaCacheManager._pruneExpired();
      }
      initialized = true;
    } catch (err) {
      logger.error(err);
      initialized = true; // proceed without cache rather than blocking
    }
  },

  /**
   * Check if media is cached and not expired.
   * @param {string} mediaType
   * @param {Object} params
   * @returns {boolean}
   */
  has: (mediaType, params) => {
    const key = generateCacheKey(mediaType, params);
    const entry = cacheIndex[key];
    if (!entry) return false;
    const ttl = TTL[mediaType] || TTL.image;
    return Date.now() - entry.createdAt <= ttl;
  },

  /**
   * Get a playable Blob URL for cached media.
   * Returns null if not cached or expired.
   * @param {string} mediaType
   * @param {Object} params
   * @returns {string|null} Blob URL
   */
  get: (mediaType, params) => {
    const key = generateCacheKey(mediaType, params);
    const entry = cacheIndex[key];
    if (!entry) return null;

    const ttl = TTL[mediaType] || TTL.image;
    if (Date.now() - entry.createdAt > ttl) {
      MediaCacheManager.evict(mediaType, params).catch(() => {});
      return null;
    }

    // Update LRU timestamp
    entry.lastAccessed = Date.now();

    // Return existing blob URL if still valid
    if (blobUrlMap.has(key)) {
      return blobUrlMap.get(key);
    }

    // Need to load blob from IDB asynchronously; return null for sync path.
    // Callers who need the blob should use getAsync instead.
    return null;
  },

  /**
   * Async version of get() that loads the blob from IndexedDB if needed.
   * @param {string} mediaType
   * @param {Object} params
   * @returns {Promise<string|null>} Blob URL or null
   */
  getAsync: async (mediaType, params) => {
    const key = generateCacheKey(mediaType, params);
    const entry = cacheIndex[key];
    if (!entry) return null;

    const ttl = TTL[mediaType] || TTL.image;
    if (Date.now() - entry.createdAt > ttl) {
      await MediaCacheManager.evict(mediaType, params).catch(() => {});
      return null;
    }

    entry.lastAccessed = Date.now();

    // Check if we already have a blob URL
    if (blobUrlMap.has(key)) {
      return blobUrlMap.get(key);
    }

    // Load from IndexedDB
    try {
      const blob = await idbGet(BLOB_STORE, key);
      if (!blob) {
        // Index says it exists but blob is missing - clean up
        delete cacheIndex[key];
        await MediaCacheManager._persistIndex();
        return null;
      }
      return createBlobUrl(key, blob);
    } catch (err) {
      logger.error(err);
      return null;
    }
  },

  /**
   * Download a file from a URL and store it in IndexedDB.
   * @param {string} mediaType
   * @param {Object} params
   * @param {string} url
   * @param {Object} [opts]
   * @param {Function} [opts.onProgress] - progress callback (0-1), only works if server sends Content-Length
   * @returns {Promise<string>} Blob URL for the cached file
   */
  download: async (mediaType, params, url, {onProgress} = {}) => {
    if (!initialized) await MediaCacheManager.init();

    const key = generateCacheKey(mediaType, params);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      let blob;

      // Try to report progress if Content-Length is available
      const contentLength = response.headers.get('Content-Length');
      if (onProgress && contentLength && response.body) {
        const total = parseInt(contentLength, 10);
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          onProgress(received / total);
        }

        const uint8 = new Uint8Array(received);
        let pos = 0;
        for (const chunk of chunks) {
          uint8.set(chunk, pos);
          pos += chunk.length;
        }
        blob = new Blob([uint8]);
      } else {
        blob = await response.blob();
      }

      // Store blob in IndexedDB
      await idbPut(BLOB_STORE, key, blob);

      // Update index
      cacheIndex[key] = {
        mediaType,
        params,
        size: blob.size,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      await MediaCacheManager._persistIndex();
      await MediaCacheManager._maybeEvict();

      return createBlobUrl(key, blob);
    } catch (error) {
      // Clean up partial data
      try {
        await idbDelete(BLOB_STORE, key);
      } catch (err) {
        logger.error(err);
      }
      throw error;
    }
  },

  /**
   * Store a Blob directly into the cache.
   * @param {string} mediaType
   * @param {Object} params
   * @param {Blob} blob
   * @returns {Promise<string>} Blob URL
   */
  storeBlob: async (mediaType, params, blob) => {
    if (!initialized) await MediaCacheManager.init();

    const key = generateCacheKey(mediaType, params);

    try {
      await idbPut(BLOB_STORE, key, blob);

      cacheIndex[key] = {
        mediaType,
        params,
        size: blob.size,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      await MediaCacheManager._persistIndex();
      await MediaCacheManager._maybeEvict();

      return createBlobUrl(key, blob);
    } catch (error) {
      try {
        await idbDelete(BLOB_STORE, key);
      } catch (err) {
        logger.error(err);
      }
      throw error;
    }
  },

  /**
   * Store base64-encoded data as a Blob in IndexedDB.
   * (Compat shim matching the RN API that used RNFetchBlob.fs.writeFile with base64.)
   * @param {string} mediaType
   * @param {Object} params
   * @param {string} base64Data
   * @param {string} [ext] - file extension (used for MIME type heuristic)
   * @returns {Promise<string>} Blob URL
   */
  storeBase64: async (mediaType, params, base64Data, ext) => {
    if (!initialized) await MediaCacheManager.init();

    // Decode base64 to binary
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Determine MIME type from extension
    const mimeMap = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mime =
      mimeMap[ext] ||
      mimeMap[`.${mediaType === 'tts' ? 'mp3' : 'bin'}`] ||
      'application/octet-stream';
    const blob = new Blob([bytes], {type: mime});

    return MediaCacheManager.storeBlob(mediaType, params, blob);
  },

  /**
   * Store small inline data (JSON/text/base64) in localStorage.
   * For short TTS clips that are cheaper to keep in localStorage for instant access.
   * @param {string} mediaType
   * @param {Object} params
   * @param {*} data - any JSON-serializable data
   */
  storeInline: async (mediaType, params, data) => {
    const key = generateCacheKey(mediaType, params);
    const storageKey = `${INLINE_PREFIX}${key}`;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data,
          mediaType,
          createdAt: Date.now(),
        })
      );
    } catch (err) {
      logger.error(err);
      // localStorage quota exceeded or unavailable
    }
  },

  /**
   * Get inline data from localStorage.
   * @param {string} mediaType
   * @param {Object} params
   * @returns {Promise<*|null>}
   */
  getInline: async (mediaType, params) => {
    const key = generateCacheKey(mediaType, params);
    const storageKey = `${INLINE_PREFIX}${key}`;
    try {
      const str = localStorage.getItem(storageKey);
      if (!str) return null;
      const entry = JSON.parse(str);
      const ttl = TTL[mediaType] || TTL.image;
      if (Date.now() - entry.createdAt > ttl) {
        try {
          localStorage.removeItem(storageKey);
        } catch (err) {
          logger.error(err);
        }
        return null;
      }
      return entry.data;
    } catch (err) {
      logger.error(err);
      return null;
    }
  },

  /**
   * Evict a specific cached entry from IndexedDB and revoke its Blob URL.
   * @param {string} mediaType
   * @param {Object} params
   */
  evict: async (mediaType, params) => {
    const key = generateCacheKey(mediaType, params);
    const entry = cacheIndex[key];
    if (!entry) return;

    try {
      await idbDelete(BLOB_STORE, key);
    } catch (err) {
      logger.error(err);
    }

    if (blobUrlMap.has(key)) {
      try {
        URL.revokeObjectURL(blobUrlMap.get(key));
      } catch (err) {
        logger.error(err);
      }
      blobUrlMap.delete(key);
    }

    delete cacheIndex[key];
    await MediaCacheManager._persistIndex();
  },

  /**
   * Get total cache size in bytes (from index metadata).
   * @returns {number}
   */
  getCacheSize: () => {
    let total = 0;
    for (const key in cacheIndex) {
      total += cacheIndex[key].size || 0;
    }
    return total;
  },

  /**
   * Get cache statistics grouped by media type.
   * @returns {Object}
   */
  getCacheStats: () => {
    const stats = {
      totalSize: 0,
      ttsCount: 0,
      musicCount: 0,
      videoCount: 0,
      sfxCount: 0,
      imageCount: 0,
    };
    for (const key in cacheIndex) {
      const entry = cacheIndex[key];
      stats.totalSize += entry.size || 0;
      const type = entry.mediaType;
      if (type === 'tts') stats.ttsCount++;
      else if (type === 'music') stats.musicCount++;
      else if (type === 'video') stats.videoCount++;
      else if (type === 'sfx') stats.sfxCount++;
      else if (type === 'image') stats.imageCount++;
    }
    return stats;
  },

  /**
   * Clear all cached media from IndexedDB and reset the index.
   */
  clearAll: async () => {
    try {
      await idbClear(BLOB_STORE);

      // Revoke all blob URLs
      for (const [, url] of blobUrlMap) {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          logger.error(err);
        }
      }
      blobUrlMap.clear();

      cacheIndex = {};
      await idbPut(META_STORE, META_KEY, cacheIndex);

      // Clear inline localStorage entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(INLINE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (err) {
          logger.error(err);
        }
      });
    } catch (err) {
      logger.error(err);
    }
  },

  /**
   * Clear all cached media of a specific type.
   * @param {string} mediaType
   */
  clearByType: async (mediaType) => {
    const keysToRemove = [];
    for (const key in cacheIndex) {
      if (cacheIndex[key].mediaType === mediaType) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      try {
        await idbDelete(BLOB_STORE, key);
      } catch (err) {
        logger.error(err);
      }
      if (blobUrlMap.has(key)) {
        try {
          URL.revokeObjectURL(blobUrlMap.get(key));
        } catch (err) {
          logger.error(err);
        }
        blobUrlMap.delete(key);
      }
      delete cacheIndex[key];
    }

    await MediaCacheManager._persistIndex();
  },

  // ── Internal Methods ─────────────────────────────────────────────────────

  /** Persist the in-memory index to IndexedDB. */
  _persistIndex: async () => {
    try {
      await idbPut(META_STORE, META_KEY, cacheIndex);
    } catch (err) {
      logger.error(err);
    }
  },

  /** Prune entries whose TTL has expired. */
  _pruneExpired: async () => {
    const now = Date.now();
    let changed = false;

    for (const key in cacheIndex) {
      const entry = cacheIndex[key];
      const ttl = TTL[entry.mediaType] || TTL.image;
      if (now - entry.createdAt > ttl) {
        try {
          await idbDelete(BLOB_STORE, key);
        } catch (err) {
          logger.error(err);
        }
        if (blobUrlMap.has(key)) {
          try {
            URL.revokeObjectURL(blobUrlMap.get(key));
          } catch (err) {
            logger.error(err);
          }
          blobUrlMap.delete(key);
        }
        delete cacheIndex[key];
        changed = true;
      }
    }

    if (changed) {
      await MediaCacheManager._persistIndex();
    }
  },

  /** LRU eviction when total cache size exceeds the limit. */
  _maybeEvict: async () => {
    let totalSize = MediaCacheManager.getCacheSize();
    if (totalSize <= MAX_CACHE_SIZE_BYTES) return;

    // Sort by lastAccessed ascending (oldest first)
    const entries = Object.entries(cacheIndex)
      .map(([key, entry]) => ({key, ...entry}))
      .sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

    for (const entry of entries) {
      if (totalSize <= MAX_CACHE_SIZE_BYTES) break;
      try {
        await idbDelete(BLOB_STORE, entry.key);
      } catch (err) {
        logger.error(err);
      }
      if (blobUrlMap.has(entry.key)) {
        try {
          URL.revokeObjectURL(blobUrlMap.get(entry.key));
        } catch (err) {
          logger.error(err);
        }
        blobUrlMap.delete(entry.key);
      }
      totalSize -= entry.size || 0;
      delete cacheIndex[entry.key];
    }

    await MediaCacheManager._persistIndex();
  },

  // Exposed for external use (TTSManager uses this for cache key generation)
  generateCacheKey,
};

export default MediaCacheManager;
