const Redis = require("ioredis");

let client = null;
let isConnected = false;

/**
 * getRedisClient — returns a singleton ioredis client.
 * If Redis is not available, returns null (cache-miss graceful fallback).
 */
const getRedisClient = () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    client = new Redis(redisUrl, {
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn("⚠️  Redis unavailable — running without cache.");
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on("connect", () => {
      isConnected = true;
      console.log("🔴 Redis connected.");
    });

    client.on("error", (err) => {
      if (isConnected) {
        console.warn("⚠️  Redis error:", err.message);
      }
      isConnected = false;
    });

    client.on("close", () => {
      isConnected = false;
    });

    client.connect().catch(() => {
      // Silently ignore — retryStrategy handles it
    });
  } catch (err) {
    console.warn("⚠️  Redis init failed:", err.message);
    client = null;
  }

  return client;
};

// ─── Cache Helpers ─────────────────────────────────────────────────────────────

/**
 * getCache — fetch a value from Redis.
 * Returns parsed JSON or null on miss / error.
 */
const getCache = async (key) => {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return null;
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * setCache — store a JSON-serialisable value.
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlSeconds  default 60
 */
const setCache = async (key, value, ttlSeconds = 60) => {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;
    await c.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Silently skip — cache is optional
  }
};

/**
 * delCache — delete a single cache key.
 */
const delCache = async (key) => {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;
    await c.del(key);
  } catch {
    // Ignore
  }
};

/**
 * delPattern — delete all keys matching a glob pattern.
 * Uses SCAN to avoid blocking Redis on large keysets.
 */
const delPattern = async (pattern) => {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;

    let cursor = "0";
    do {
      const [nextCursor, keys] = await c.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await c.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Ignore
  }
};

module.exports = { getRedisClient, getCache, setCache, delCache, delPattern };
