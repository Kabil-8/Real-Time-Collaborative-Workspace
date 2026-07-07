/**
 * routes/cache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only cache management API.
 * All routes require a valid JWT (protect middleware).
 *
 * DELETE /api/cache/board/:boardId  — bust board cache
 * DELETE /api/cache/card/:cardId    — bust card cache
 * DELETE /api/cache/all             — flush all app cache
 * GET    /api/cache/stats           — Redis health & TTL config
 */

const express = require("express");
const router  = express.Router();

const { protect } = require("../middleware/auth");
const {
  bustBoardCache,
  bustCardCache,
  bustAllCache,
  getCacheStats,
} = require("../controllers/cacheController");

// All cache routes require authentication
router.use(protect);

// Board-level cache bust
router.delete("/board/:boardId", bustBoardCache);

// Card-level cache bust
router.delete("/card/:cardId", bustCardCache);

// Full application cache flush (destructive — use with care)
router.delete("/all", bustAllCache);

// Cache stats / health
router.get("/stats", getCacheStats);

module.exports = router;
