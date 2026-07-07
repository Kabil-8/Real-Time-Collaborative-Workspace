/**
 * utils/cache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * High-level caching helpers built on top of the ioredis singleton.
 *
 * All functions silently no-op when Redis is unavailable, so callers never
 * need to wrap calls in try/catch for availability.
 *
 * Cache Key Conventions
 * ─────────────────────
 *   board:{boardId}           → full board hydration (board + lists + cards)
 *   board_members:{boardId}   → board doc used for membership checks
 *   lists:{boardId}           → lists with populated cards for a board
 *   card:{cardId}             → single card with full populates
 *
 * TTLs (seconds, env-overridable)
 * ────────────────────────────────
 *   REDIS_TTL_BOARD    default  300  (5 min)
 *   REDIS_TTL_CARD     default  180  (3 min)
 *   REDIS_TTL_MEMBERS  default  600  (10 min)
 *   REDIS_TTL_LISTS    default  300  (5 min)
 */

const { getClient, isReady } = require("../config/redis");

// ─── TTL constants ────────────────────────────────────────────────────────────

const TTL = {
  BOARD:   parseInt(process.env.REDIS_TTL_BOARD,   10) || 300,
  CARD:    parseInt(process.env.REDIS_TTL_CARD,    10) || 180,
  MEMBERS: parseInt(process.env.REDIS_TTL_MEMBERS, 10) || 600,
  LISTS:   parseInt(process.env.REDIS_TTL_LISTS,   10) || 300,
};

// ─── Key builders ─────────────────────────────────────────────────────────────

const CacheKeys = {
  board:        (boardId)  => `board:${boardId}`,
  boardMembers: (boardId)  => `board_members:${boardId}`,
  lists:        (boardId)  => `lists:${boardId}`,
  card:         (cardId)   => `card:${cardId}`,
};

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Retrieve a cached value.
 * @param {string} key
 * @returns {any|null} Parsed object, or null on miss / Redis unavailable
 */
async function cacheGet(key) {
  if (!isReady()) return null;
  try {
    const raw = await getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache] GET error for "${key}":`, err.message);
    return null;
  }
}

/**
 * Store a value in cache with a TTL.
 * @param {string} key
 * @param {any} value  – must be JSON-serialisable
 * @param {number} ttl – seconds
 */
async function cacheSet(key, value, ttl) {
  if (!isReady()) return;
  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    console.warn(`[Cache] SET error for "${key}":`, err.message);
  }
}

/**
 * Delete one or more specific keys.
 * @param {...string} keys
 */
async function cacheInvalidate(...keys) {
  if (!isReady() || keys.length === 0) return;
  try {
    await getClient().del(...keys);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Cache] Invalidated: ${keys.join(", ")}`);
    }
  } catch (err) {
    console.warn(`[Cache] DEL error:`, err.message);
  }
}

/**
 * Delete all keys matching a glob pattern (SCAN-based, safe for production).
 * Example: cacheInvalidatePattern("card:*") removes all card caches.
 * @param {string} pattern  – Redis glob pattern
 */
async function cacheInvalidatePattern(pattern) {
  if (!isReady()) return;
  const client = getClient();
  try {
    let cursor = "0";
    const keys = [];
    do {
      const [nextCursor, found] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");

    if (keys.length > 0) {
      await client.del(...keys);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Cache] Pattern invalidated (${pattern}): ${keys.length} keys removed`);
      }
    }
  } catch (err) {
    console.warn(`[Cache] Pattern DEL error for "${pattern}":`, err.message);
  }
}

/**
 * Flush all keys for a board (board, members, lists, and all board's cards).
 * Convenience wrapper for board-wide invalidation.
 * @param {string} boardId
 */
async function invalidateBoardCache(boardId) {
  await Promise.all([
    cacheInvalidate(
      CacheKeys.board(boardId),
      CacheKeys.boardMembers(boardId),
      CacheKeys.lists(boardId)
    ),
  ]);
}

/**
 * Flush all cached keys for a specific card plus the owning board.
 * @param {string} cardId
 * @param {string} boardId
 */
async function invalidateCardCache(cardId, boardId) {
  await Promise.all([
    cacheInvalidate(CacheKeys.card(cardId)),
    invalidateBoardCache(boardId),
  ]);
}

// ─── Cache stats (health endpoint) ───────────────────────────────────────────

/**
 * Returns basic cache statistics for the /api/health endpoint.
 */
async function getCacheStats() {
  if (!isReady()) return { status: "disconnected" };
  try {
    const info = await getClient().info("server");
    const versionMatch = info.match(/redis_version:(.+)/);
    const uptimeMatch  = info.match(/uptime_in_seconds:(.+)/);
    return {
      status:        "connected",
      version:       versionMatch ? versionMatch[1].trim() : "unknown",
      uptimeSeconds: uptimeMatch  ? parseInt(uptimeMatch[1].trim(), 10) : null,
      ttls: TTL,
    };
  } catch {
    return { status: "error" };
  }
}

module.exports = {
  CacheKeys,
  TTL,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheInvalidatePattern,
  invalidateBoardCache,
  invalidateCardCache,
  getCacheStats,
};
