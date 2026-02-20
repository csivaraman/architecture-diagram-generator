import { createHash } from 'crypto';

/**
 * Cache storage in memory
 * @type {Map<string, {data: any, expiresAt: number}>}
 */
const cache = new Map();

/**
 * Default TTL: 4 hours (14400 seconds)
 */
const DEFAULT_TTL = 14400;

/**
 * Maximum number of records in cache
 */
const MAX_CACHE_SIZE = 25;

/**
 * Normalizes system description text for consistent hashing
 * @param {string} text 
 * @returns {string}
 */
const normalizeText = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
};

/**
 * Generates a SHA-256 hash for the given text
 * @param {string} text 
 * @returns {string}
 */
export const generateCacheKey = (text) => {
    const normalized = normalizeText(text);
    return createHash('sha256')
        .update(normalized)
        .digest('hex');
};

/**
 * Retrieves a diagram from the cache if it exists and hasn't expired
 * @param {string} description 
 * @returns {any|null}
 */
export const getCachedDiagram = (description) => {
    const key = `diagram:${generateCacheKey(description)}`;
    const entry = cache.get(key);

    if (!entry) {
        console.log(`[Cache Miss] No entry for: ${key}`);
        return null;
    }

    if (Date.now() > entry.expiresAt) {
        console.log(`[Cache Expired] Entry for: ${key}`);
        cache.delete(key);
        return null;
    }

    console.log(`[Cache Hit] Returning diagram for: ${key}`);
    return entry.data;
};

/**
 * Stores a diagram in the cache
 * @param {string} description 
 * @param {any} data 
 * @param {number} ttlSeconds 
 */
export const setCachedDiagram = (description, data, ttlSeconds = DEFAULT_TTL) => {
    const key = `diagram:${generateCacheKey(description)}`;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    // Check for existing key to avoid duplication in order
    if (cache.has(key)) {
        cache.delete(key);
    }

    // Enforce MAX_CACHE_SIZE (FIFO)
    if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        console.log(`[Cache Eviction] Limit reached (${MAX_CACHE_SIZE}). Removing oldest entry: ${firstKey}`);
        cache.delete(firstKey);
    }

    cache.set(key, { data, expiresAt });
    console.log(`[Cache Set] Stored diagram for: ${key} (Size: ${cache.size}/${MAX_CACHE_SIZE})`);
};

/**
 * Deletes a specific cache entry by key
 * @param {string} key 
 * @returns {boolean}
 */
export const deleteCacheEntry = (key) => {
    return cache.delete(key);
};

/**
 * Clears all cached diagrams
 */
export const clearCache = () => {
    cache.clear();
    console.log('[Cache Clear] All entries removed');
};

/**
 * Returns cache statistics
 * @returns {object}
 */
export const getCacheStats = () => {
    return {
        entryCount: cache.size,
        maxCapacity: MAX_CACHE_SIZE,
        expiryTime: '4 hours (14400s)',
        keys: Array.from(cache.keys())
    };
};
