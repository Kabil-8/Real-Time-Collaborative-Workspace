/**
 * controllers/cacheController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only cache management endpoints.
 * Useful for manual cache busting during debugging or hotfix deployments.
 */

const { successResponse, errorResponse } = require("../utils/response");
const {
  invalidateBoardCache,
  invalidateCardCache,
  cacheInvalidatePattern,
  getCacheStats,
  CacheKeys,
  cacheInvalidate,
} = require("../utils/cache");
const { isReady } = require("../config/redis");

/**
 * DELETE /api/cache/board/:boardId
 * Bust all cache keys for a board (board doc, members, lists).
 * Requires board admin role.
 */
exports.bustBoardCache = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    await invalidateBoardCache(boardId);
    return successResponse(res, { boardId, keys: ["board", "board_members", "lists"] }, "Board cache cleared.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cache/card/:cardId
 * Bust the cache for a specific card.
 * boardId is required as query param to also clear the board-level cache.
 */
exports.bustCardCache = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { boardId } = req.query;

    if (boardId) {
      await invalidateCardCache(cardId, boardId);
    } else {
      await cacheInvalidate(CacheKeys.card(cardId));
    }

    return successResponse(res, { cardId }, "Card cache cleared.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cache/all
 * Flush ALL application cache keys (pattern: board:*, card:*, lists:*, board_members:*).
 * Superadmin only – use with care.
 */
exports.bustAllCache = async (req, res, next) => {
  try {
    await Promise.all([
      cacheInvalidatePattern("board:*"),
      cacheInvalidatePattern("card:*"),
      cacheInvalidatePattern("lists:*"),
      cacheInvalidatePattern("board_members:*"),
    ]);
    return successResponse(res, {}, "All application cache cleared.");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cache/stats
 * Returns Redis connection info and TTL configuration.
 */
exports.getCacheStats = async (req, res, next) => {
  try {
    const stats = await getCacheStats();
    return successResponse(res, { cache: stats });
  } catch (err) {
    next(err);
  }
};
