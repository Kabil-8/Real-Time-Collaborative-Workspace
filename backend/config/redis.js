/**
 * config/redis.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton ioredis client.
 *
 * • Connects once at server startup.
 * • Gracefully degrades: if Redis is unreachable every cache helper returns
 *   null / silently skips — the server stays up and falls back to MongoDB.
 * • The client is exported as a plain object wrapper so other modules never
 *   touch ioredis internals directly.
 */

const Redis = require("ioredis");

let client = null;
let _isReady = false;

/**
 * Initialise the Redis connection.
 * Called once from server.js after dotenv has been loaded.
 */
function connectRedis() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  client = new Redis(url, {
    // Retry strategy: exponential back-off capped at 10 s, give up after 5 tries
    retryStrategy(times) {
      if (times > 5) {
        console.warn("⚠️  Redis: max retries exceeded — running without cache.");
        return null; // stop retrying
      }
      return Math.min(times * 200, 10_000);
    },
    // Don't crash the process if the initial connect fails
    lazyConnect: false,
    enableOfflineQueue: false,
  });

  client.on("connect", () => {
    _isReady = true;
    console.log("✅  Redis connected:", url);
  });

  client.on("ready", () => {
    _isReady = true;
  });

  client.on("error", (err) => {
    if (_isReady) {
      // Only log novel errors — suppress noisy reconnection spam
      console.warn("⚠️  Redis error:", err.message);
    }
    _isReady = false;
  });

  client.on("close", () => {
    _isReady = false;
  });

  return client;
}

/** Raw ioredis client (use helpers in cache.js instead) */
function getClient() {
  return client;
}

/** Whether the client is currently connected and usable */
function isReady() {
  return _isReady && client !== null;
}

/** Graceful shutdown — called from process signal handlers */
async function disconnectRedis() {
  if (client) {
    await client.quit().catch(() => {});
    _isReady = false;
    console.log("🔌  Redis disconnected.");
  }
}

module.exports = { connectRedis, getClient, isReady, disconnectRedis };
